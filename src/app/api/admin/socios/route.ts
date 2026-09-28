import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await prisma.socio.findMany({ orderBy: { nombre: "asc" } }));
  } catch (e: any) {
    console.error("admin/socios GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? "").trim().slice(0, 80);
    const porcentaje = Math.max(0, Math.min(100, Number(b?.porcentaje) || 0));
    if (!nombre) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

    // La suma de participaciones no puede pasar del 100%: si pasa, el reparto
    // reparte dinero que no existe.
    const otros = await prisma.socio.findMany({ where: { estado: "activo" } });
    const suma = otros.reduce((s, x) => s + x.porcentaje, 0) + porcentaje;
    if (suma > 100) {
      return NextResponse.json(
        { error: `Con ese porcentaje la sociedad sumaría ${Math.round(suma)}%. El tope es 100%.` },
        { status: 400 },
      );
    }

    const socio = await prisma.socio.create({
      data: {
        nombre, porcentaje,
        fechaInicio: /^\d{4}-\d{2}-\d{2}$/.test(String(b?.fechaInicio ?? "")) ? String(b.fechaInicio) : hoyMX(),
        usuario: b?.usuario ? String(b.usuario).toLowerCase().slice(0, 40) : null,
        nota:    b?.nota ? String(b.nota).slice(0, 300) : null,
      },
    });
    await registrarEnBitacora({
      accion: "creó", entidad: "socio",
      resumen: `Socio ${nombre} con ${porcentaje}% de participación desde ${socio.fechaInicio}`,
    });
    return NextResponse.json({ ok: true, socio });
  } catch (e: any) {
    console.error("admin/socios POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json();
    const id = String(b?.id ?? "");
    const antes = await prisma.socio.findUnique({ where: { id } });
    if (!antes) return NextResponse.json({ error: "Ese socio no existe" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (b?.nombre     !== undefined) data.nombre     = String(b.nombre).trim().slice(0, 80);
    if (b?.porcentaje !== undefined) data.porcentaje = Math.max(0, Math.min(100, Number(b.porcentaje) || 0));
    if (b?.estado     !== undefined) data.estado     = b.estado === "inactivo" ? "inactivo" : "activo";
    if (b?.nota       !== undefined) data.nota       = String(b.nota).slice(0, 300);

    if (data.porcentaje !== undefined || data.estado === "activo") {
      const otros = await prisma.socio.findMany({ where: { estado: "activo", id: { not: id } } });
      const suma = otros.reduce((s, x) => s + x.porcentaje, 0) + Number(data.porcentaje ?? antes.porcentaje);
      if (suma > 100) {
        return NextResponse.json({ error: `La sociedad sumaría ${Math.round(suma)}%. El tope es 100%.` }, { status: 400 });
      }
    }

    const socio = await prisma.socio.update({ where: { id }, data });
    const cambios = Object.entries(data)
      .filter(([k, v]) => (antes as any)[k] !== v)
      .map(([k, v]) => ({ campo: k, antes: (antes as any)[k], despues: v }));
    if (cambios.length) {
      await registrarEnBitacora({
        accion: "modificó", entidad: "socio",
        resumen: `Socio ${antes.nombre}: ${cambios.map(c => c.campo).join(", ")}`,
        detalle: cambios,
      });
    }
    return NextResponse.json({ ok: true, socio });
  } catch (e: any) {
    console.error("admin/socios PATCH:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
