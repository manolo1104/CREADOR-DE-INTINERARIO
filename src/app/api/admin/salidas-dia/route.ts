import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { checklistDe, limpiarChecklist, paraGuardar } from "@/lib/admin/checklistSalida";
import { addDaysYMD } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ESTADOS = ["programada", "confirmada", "operada", "cancelada"] as const;
const TIPOS = ["fija", "privada"] as const;
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * PATCH { clave, guia?, vehiculo?, estado?, tipo?, notas?, checklist? }
 * Guarda lo operativo de una salida (`Salida`); se crea al primer toque.
 * La sección es «Salidas del día» (también la ve el guía). Lo marcado en el
 * checklist queda con quién y cuándo.
 */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const clave = texto(body.clave, 200);
  const fecha = clave.slice(0, 10);
  const partes = clave.split("|");
  if (partes.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || addDaysYMD(fecha, 0) !== fecha || !partes[1]) {
    return NextResponse.json({ error: "Esa salida no existe." }, { status: 400 });
  }
  const tourSlug = partes[1];
  const sesion = await sesionActual();
  const quien = sesion?.nombre ?? "Desconocido";

  // El guía marca el checklist y escribe notas; asignar guía, vehículo, estado
  // o tipo es de Operación (antes solo lo frenaba la pantalla).
  if (sesion?.rol === "guia" && ["guia", "vehiculo", "estado", "tipo"].some(k => body[k] !== undefined)) {
    return NextResponse.json({ error: "Eso lo asigna Operación." }, { status: 403 });
  }
  const data: Record<string, unknown> = {};
  if (body.guia !== undefined) data.guia = texto(body.guia, 80) || null;
  if (body.vehiculo !== undefined) data.vehiculo = texto(body.vehiculo, 80) || null;
  if (body.notas !== undefined) data.notas = texto(body.notas, 1000) || null;
  if (body.estado !== undefined) {
    if (!(ESTADOS as readonly string[]).includes(String(body.estado))) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    data.estado = body.estado;
  }
  if (body.tipo !== undefined) {
    if (!(TIPOS as readonly string[]).includes(String(body.tipo))) return NextResponse.json({ error: "Tipo no válido." }, { status: 400 });
    data.tipo = body.tipo;
  }
  // Un renglón a la vez (revisión del 4 nov 2026): { marcar: { clave, hecho } } o
  // { agregar: "texto" }. Se aplica sobre lo GUARDADO, no sobre lo que el
  // navegador tenía al abrir: dos personas marcando a la vez ya no se pisan.
  if (body.marcar !== undefined || body.agregar !== undefined) {
    const previo = await prisma.salida.findUnique({ where: { clave }, select: { checklist: true } }).catch(() => null);
    let lista = checklistDe(tourSlug, previo?.checklist);
    const m = body.marcar as { clave?: unknown; hecho?: unknown } | undefined;
    if (m) {
      if (!lista.some(i => i.clave === m.clave)) return NextResponse.json({ error: "Ese punto ya no está en la lista." }, { status: 400 });
      const ahora = new Date().toISOString();
      lista = lista.map(i => i.clave !== m.clave ? i : m.hecho ? { ...i, hecho: true, por: quien, en: ahora } : { ...i, hecho: false, por: undefined, en: undefined });
    }
    const nuevoTexto = texto(body.agregar, 120);
    if (body.agregar !== undefined) {
      if (!nuevoTexto) return NextResponse.json({ error: "Escribe el punto." }, { status: 400 });
      lista = [...lista, { clave: `x-${Date.now().toString(36)}`, texto: nuevoTexto, hecho: false, propio: true }];
    }
    data.checklist = paraGuardar(lista);
  } else if (body.checklist !== undefined) {
    const ahora = new Date().toISOString();
    const previo = await prisma.salida.findUnique({ where: { clave }, select: { checklist: true } }).catch(() => null);
    const antes = checklistDe(tourSlug, previo?.checklist);
    const nuevo = limpiarChecklist(body.checklist).map(i => {
      const a = antes.find(x => x.clave === i.clave);
      // Se acaba de marcar: queda quién y cuándo; si ya estaba, se respeta.
      return i.hecho && !a?.hecho ? { ...i, por: quien, en: ahora } : i.hecho ? { ...i, por: a?.por ?? i.por, en: a?.en ?? i.en } : { ...i, por: undefined, en: undefined };
    });
    data.checklist = paraGuardar(nuevo);
  }

  try {
    const s = await prisma.salida.upsert({
      where: { clave },
      create: { clave, tourSlug, fecha, ...(data as any) },
      update: data as any,
    });
    const cambios = Object.keys(data).filter(k => k !== "checklist");
    await registrarEnBitacora({
      accion: "modificó", entidad: "salida", referencia: clave,
      resumen: `Salida ${tourSlug} del ${fecha}: ${[...cambios, ...(data.checklist ? ["checklist"] : [])].join(", ") || "sin cambios"}`,
    });
    return NextResponse.json({
      ok: true,
      registro: { tipo: s.tipo, guia: s.guia ?? "", vehiculo: s.vehiculo ?? "", estado: s.estado, notas: s.notas ?? "" },
      checklist: checklistDe(tourSlug, s.checklist),
    });
  } catch (e: any) {
    console.error("admin/salidas-dia PATCH:", e?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
