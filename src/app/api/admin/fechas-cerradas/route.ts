import { NextRequest, NextResponse } from "next/server";
import { TOURS_DB } from "@/lib/tours";
import { cambiarFechaCerrada, cupoDeTour, cupoDeTourEnDia } from "@/lib/cupoTour";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { addDaysYMD, hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

// La sesión la exige el middleware (todo /api/admin salvo login/logout). Es la
// sección del Calendario, que ven los tres roles: cerrar un día porque el río
// creció o no hay guía es trabajo de quien opera, no solo del dueño.

/**
 * Cierra o abre una fecha de un recorrido: `{ slug, fecha: "AAAA-MM-DD", cerrada }`.
 * Cerrada, el sitio la pinta gris y no deja pagarla, y el bot no la cotiza
 * (ver `lib/cupoTour.ts`). Las reservas que ya había se quedan: cerrar frena
 * las ventas nuevas, no cancela a nadie. Devuelve el día como lo pinta el
 * calendario del panel.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: unknown; fecha?: unknown; cerrada?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const tour = TOURS_DB.find((t) => t.slug === slug);
  if (!tour || cupoDeTour(tour) === null) {
    return NextResponse.json({ error: "Ese recorrido no lleva cupo por fecha." }, { status: 400 });
  }
  // Un día que existe (2026-02-30 no) y de hoy en adelante: cerrar el pasado no frena nada.
  const fecha = String(body.fecha ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || addDaysYMD(fecha, 0) !== fecha || fecha < hoyMX()) {
    return NextResponse.json({ error: "Solo se cierran fechas de hoy en adelante." }, { status: 400 });
  }
  if (typeof body.cerrada !== "boolean") {
    return NextResponse.json({ error: "Falta decir si se cierra o se abre." }, { status: 400 });
  }
  const cerrar = body.cerrada;

  try {
    await cambiarFechaCerrada(slug, fecha, cerrar);
    await registrarEnBitacora({
      accion:     "modificó",
      entidad:    "cupo",
      referencia: slug,
      resumen:    cerrar
        ? `Cerró el ${fecha} para «${tour.nombreCorto}»: el sitio y el bot ya no lo venden`
        : `Abrió otra vez el ${fecha} para «${tour.nombreCorto}»`,
    });
    return NextResponse.json({ ok: true, dia: await cupoDeTourEnDia(slug, fecha) });
  } catch (e: unknown) {
    console.error("❌ admin/fechas-cerradas:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}
