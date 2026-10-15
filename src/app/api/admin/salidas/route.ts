import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { crearSalida, datosDelPanel, type FormSalida } from "@/lib/viajeCdmx/admin";
import { respuestaDeError } from "@/lib/viajeCdmx/respuesta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// La sesión la exige el middleware (todo /api/admin salvo login/logout).

export async function GET() {
  try {
    return NextResponse.json(await datosDelPanel());
  } catch (e) {
    return respuestaDeError(e, "panel_salidas");
  }
}

/** Nueva salida. Precio y cupo son decisiones de dinero: solo dueño y socio. */
export async function POST(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "operacion") return NextResponse.json({ error: "Solo Manolo o Martín crean salidas." }, { status: 403 });
  let b: FormSalida;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const s = await crearSalida(b);
    await registrarEnBitacora({
      accion: "creó", entidad: "salida", referencia: s.fechaSalida,
      resumen: `Salida del viaje CDMX ${s.fechaSalida}: cupo ${s.capacidad}, ${pesos(s.precio)}${s.precioPreventa ? ` (preventa ${pesos(s.precioPreventa)})` : ""}, ${s.estado}`,
    });
    return NextResponse.json({ ok: true, id: s.id });
  } catch (e) {
    return respuestaDeError(e, "crear_salida");
  }
}
