import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { hoyMX } from "@/lib/dates";
import { ES_FECHA, sinTabla, salidasDeLaSemana } from "@/lib/admin/corteSalidas";
import {
  lunesDe, domingoDe, etiquetaSemana, limpiarCaptura, capturaDe, calcularCorte,
  limpiarCobros, PRIMERA_SEMANA_CORTE, ERROR_SEMANA_ANTERIOR,
  type SalidaCorte, type Captura, type EstadoCorte, type CatalogoCostos,
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
    const hasta  = domingoDe(semana);
    const { salidas, catalogo } = await salidasDeLaSemana(semana, hasta);

    let guardado = null;
    try {
      const g = await prisma.corteSemanal.findUnique({ where: { semana } });
      if (g) guardado = {
        captura: limpiarCaptura(g.captura), cobros: limpiarCobros(g.cobros),
        resumen: g.resumen, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt,
        estado: (g.estado === "borrador" ? "borrador" : "cerrado") as EstadoCorte,
      };
    } catch (e: any) {
      if (!sinTabla(e)) throw e;
    }

    return NextResponse.json({ semana, hasta, salidas, catalogo, guardado });
  } catch (e: any) {
    console.error("admin/cortes GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST { semana, captura, cerrar } → guarda esa semana (una fila por semana:
 * guardar otra vez la reemplaza). Las cifras se recalculan aquí con las
 * reservas de hoy; no se confía en los totales que manda el navegador.
 *
 * `cerrar: false` es «Guardar costos» (20 oct 2026, Manolo): guarda lo
 * capturado sin hacer el corte, para no perderlo al recargar. Sin la bandera
 * se cierra, que es lo que hacía siempre «Guardar corte».
 */
export async function POST(req: NextRequest) {
  let b: any;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!ES_FECHA.test(String(b?.semana ?? ""))) {
    return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  }

  try {
    const semana  = lunesDe(String(b.semana));
    // Tampoco se guardan (ver `PRIMERA_SEMANA_CORTE`).
    if (semana < PRIMERA_SEMANA_CORTE) {
      return NextResponse.json({ error: ERROR_SEMANA_ANTERIOR }, { status: 503 });
    }
    const hasta   = domingoDe(semana);
    const { salidas } = await salidasDeLaSemana(semana, hasta);
    const pedida  = limpiarCaptura(b.captura);
    // Lo cobrado de la semana, escrito a mano en «La semana» con quién y de qué.
    const cobros  = limpiarCobros(b.cobros);
    const cerrar  = b.cerrar !== false;

    const sesion = await sesionActual();
    const guardadoPor = sesion?.nombre ?? "Desconocido";

    let previo, g, estado: EstadoCorte, captura: Captura, resumen: ReturnType<typeof calcularCorte>;
    try {
      previo = await prisma.corteSemanal.findUnique({ where: { semana }, select: { id: true, estado: true } });
      // Un corte hecho no se «deshace» guardando costos: los números se
      // recalculan igual, así que guardar costos encima es rehacerlo.
      estado = cerrar || previo?.estado === "cerrado" ? "cerrado" : "borrador";
      captura = estado === "cerrado"
        // Al cerrar se congela una entrada por cada tarjeta viva —también las
        // que no se tocaron—, para que lo propuesto por el Cotizador quede fijo.
        ? Object.fromEntries(salidas.map(s => [s.clave, capturaDe(s, pedida)]))
        // En borrador solo lo que se tocó: lo demás sigue tomando lo del
        // Cotizador y la comisión de los cobros que vayan entrando.
        : Object.fromEntries(salidas.filter(s => pedida[s.clave]).map(s => [s.clave, pedida[s.clave]]));
      resumen = calcularCorte(salidas, captura, cobros);
      const datos = {
        hasta, captura: captura as any, resumen: resumen as any,
        ventas: resumen.ventas, costos: resumen.costos, utilidad: resumen.utilidad, guardadoPor, estado,
        cobros: cobros as any,
      };
      g = await prisma.corteSemanal.upsert({ where: { semana }, create: { semana, ...datos }, update: datos });
    } catch (e: any) {
      if (sinTabla(e)) {
        return NextResponse.json(
          { error: "La tabla de cortes todavía no existe en esta base: se crea al desplegar en Railway." },
          { status: 503 },
        );
      }
      throw e;
    }

    await registrarEnBitacora({
      accion: previo ? "modificó" : "creó",
      entidad: "corte",
      referencia: semana,
      resumen: estado === "cerrado"
        ? `Corte semanal ${etiquetaSemana(semana)} · utilidad ${pesos(resumen.utilidad)} (${resumen.tarjetas} tours)`
        : `Costos del corte ${etiquetaSemana(semana)} (borrador) · costos ${pesos(resumen.costos)} (${resumen.tarjetas} tours)`,
    });

    return NextResponse.json({
      ok: true,
      guardado: { captura, cobros, resumen, estado, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt },
    });
  } catch (e: any) {
    console.error("admin/cortes POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
