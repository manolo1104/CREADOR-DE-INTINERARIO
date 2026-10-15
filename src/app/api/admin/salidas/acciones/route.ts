import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { agregarPasajero, cancelarPasajero, moverPasajero, type DatosPasajero } from "@/lib/viajeCdmx/pasajeros";
import { avisarListaDeEspera } from "@/lib/viajeCdmx/tareas";
import { respuestaDeError } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lo que el equipo hace con los pasajeros. Todo pasa por el candado del cupo
 * (`viajeCdmx/pasajeros.ts`): una venta por WhatsApp gasta lugar igual que una
 * del sitio, y nadie puede vender el asiento que alguien está pagando.
 */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const actor = { usuario: sesion.user, nombre: sesion.nombre, rol: sesion.rol };
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  try {
    switch (b.accion) {
      case "agregar": {
        const d = b.pasajero as DatosPasajero;
        // Una cortesía es dinero: solo dueño y socio.
        if (d?.cortesia && sesion.rol === "operacion") return NextResponse.json({ error: "Las cortesías las da Manolo o Martín." }, { status: 403 });
        const r = await agregarPasajero(String(b.salidaId ?? ""), d, actor);
        return NextResponse.json({ ok: true, folio: r.confirmationNumber, id: r.id });
      }
      case "mover": {
        const r = await moverPasajero(String(b.reservaId ?? ""), String(b.destinoId ?? ""), actor);
        return NextResponse.json({ ok: true, folio: r.confirmationNumber });
      }
      case "cancelar": {
        const r = await cancelarPasajero(String(b.reservaId ?? ""), actor);
        return NextResponse.json({ ok: true, folio: r.confirmationNumber });
      }
      case "avisar-espera": {
        const r = await avisarListaDeEspera({ soloSalida: String(b.salidaId ?? ""), todos: true });
        await registrarEnBitacora({ accion: "envió", entidad: "lista de espera", referencia: String(b.salidaId ?? ""), resumen: `Aviso de lugar a la lista de espera: ${r.avisados} correo(s)`, actor });
        return NextResponse.json({ ok: true, ...r });
      }
      case "espera-estado": {
        const estado = String(b.estado ?? "");
        if (!["esperando", "avisado", "aparto", "baja"].includes(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        await prisma.listaEspera.update({ where: { id: String(b.id ?? "") }, data: { estado } });
        return NextResponse.json({ ok: true });
      }
      case "lider-estado": {
        const estado = String(b.estado ?? "");
        if (!["nuevo", "contactado", "confirmado", "descartado"].includes(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
        const l = await prisma.liderGrupo.update({ where: { id: String(b.id ?? "") }, data: { estado } });
        await registrarEnBitacora({ accion: "modificó", entidad: "líder", referencia: l.codigo, resumen: `Líder ${l.nombre} (${l.codigo}): ${estado}`, actor });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
    }
  } catch (e) {
    return respuestaDeError(e, "acciones_salidas");
  }
}
