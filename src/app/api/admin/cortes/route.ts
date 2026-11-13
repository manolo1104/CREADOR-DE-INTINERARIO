import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { hoyMX } from "@/lib/dates";
import { ES_FECHA, sinTabla } from "@/lib/admin/corteSalidas";
import { leerSemana, guardarSemana } from "@/lib/admin/corteGuardar";
import {
  lunesDe, etiquetaSemana, PRIMERA_SEMANA_CORTE, ERROR_SEMANA_ANTERIOR, type CambiosCorte,
} from "@/lib/admin/corteSemanal";

export const dynamic = "force-dynamic";


// GET ?semana=YYYY-MM-DD → las salidas de esa semana y lo guardado.
// GET ?lista=1          → los cortes guardados, del más reciente al más viejo.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    if (sp.get("lista")) {
      try {
        const cortes = await prisma.corteSemanal.findMany({
          // Las de antes del corte no se listan (ver `PRIMERA_SEMANA_CORTE`).
          where: { semana: { gte: PRIMERA_SEMANA_CORTE } },
          orderBy: { semana: "desc" }, take: 52,
          select: { semana: true, hasta: true, ventas: true, costos: true, utilidad: true, guardadoPor: true, updatedAt: true, estado: true, resumen: true },
        });
        return NextResponse.json({ cortes });
      } catch (e: any) {
        if (sinTabla(e)) return NextResponse.json({ cortes: [], sinTabla: true });
        throw e;
      }
    }

    const pedida = sp.get("semana") ?? "";
    const semana = lunesDe(ES_FECHA.test(pedida) ? pedida : hoyMX());
    // A propósito (Manolo, 20 oct 2026): las semanas de antes del corte
    // contestan como si fallara. Ver `PRIMERA_SEMANA_CORTE`.
    if (semana < PRIMERA_SEMANA_CORTE) {
      return NextResponse.json({ error: ERROR_SEMANA_ANTERIOR }, { status: 503 });
    }
    // Un corte hecho, con lo que había al hacerlo; las cuentas juntas sin
    // principal, reacomodadas; y lo registrado en Cobros (lote 7, 10 nov 2026).
    return NextResponse.json(await leerSemana(semana));
  } catch (e: any) {
    console.error("admin/cortes GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST { semana, cerrar, version, cambios } → guarda esa semana (ver
 * `guardarSemana`). Desde el lote 7 (10 nov 2026) se manda solo lo que cambió
 * y se junta con lo guardado: dos personas con la misma semana abierta ya no
 * se pisan, y si tocaron lo mismo, 409 sin guardar nada.
 */
export async function POST(req: NextRequest) {
  let b: any;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!ES_FECHA.test(String(b?.semana ?? ""))) {
    return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  }
  // Una pestaña abierta desde antes de este cambio manda la captura entera: que
  // recargue en lugar de escribir encima de lo de otros.
  if (!b?.cambios || typeof b.cambios !== "object") {
    return NextResponse.json({ error: "La pantalla del corte cambió. Recarga la página y vuelve a guardar." }, { status: 400 });
  }

  try {
    const semana = lunesDe(String(b.semana));
    // Tampoco se guardan (ver `PRIMERA_SEMANA_CORTE`).
    if (semana < PRIMERA_SEMANA_CORTE) {
      return NextResponse.json({ error: ERROR_SEMANA_ANTERIOR }, { status: 503 });
    }
    const cambios: CambiosCorte = {
      captura: b.cambios.captura && typeof b.cambios.captura === "object" ? b.cambios.captura : {},
      base: b.cambios.base && typeof b.cambios.base === "object" ? b.cambios.base : {},
      cobros: Array.isArray(b.cambios.cobros) ? b.cambios.cobros : null,
      baseCobros: Array.isArray(b.cambios.baseCobros) ? b.cambios.baseCobros : null,
    };
    const sesion = await sesionActual();

    let r;
    try {
      r = await guardarSemana({
        semana, cerrar: b.cerrar === true, version: typeof b.version === "string" ? b.version : null,
        cambios, guardadoPor: sesion?.nombre ?? "Desconocido", hoy: hoyMX(),
      });
    } catch (e: any) {
      if (sinTabla(e)) {
        return NextResponse.json(
          { error: "La tabla de cortes todavía no existe en esta base: se crea al desplegar en Railway." },
          { status: 503 },
        );
      }
      throw e;
    }
    if (!r.ok) {
      return NextResponse.json({ error: r.error, conflicto: r.conflicto ?? false, conflictos: r.conflictos ?? [] }, { status: r.status });
    }

    await registrarEnBitacora({
      accion: r.nuevo ? "creó" : "modificó",
      entidad: "corte",
      referencia: semana,
      resumen: (r.estado === "cerrado"
        ? `Corte semanal ${etiquetaSemana(semana)} · utilidad ${pesos(r.resumen.utilidad)} (${r.resumen.tarjetas} tours)`
        : `Costos del corte ${etiquetaSemana(semana)} (borrador) · costos ${pesos(r.resumen.costos)} (${r.resumen.tarjetas} tours)`)
        + (r.juntado ? " · juntado con lo que otro guardó" : ""),
    });

    return NextResponse.json({ ok: true, juntado: r.juntado, otroGuardo: r.otroGuardo, guardado: r.guardado });
  } catch (e: any) {
    console.error("admin/cortes POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
