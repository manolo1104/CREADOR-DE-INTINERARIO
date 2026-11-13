// Reglas puras de «Convertir a reserva» (lote 1 de la auditoría, 5 nov 2026).
//
// Viven aparte de `convertir.ts` (que habla con la base) para probarlas sin
// Prisma en `__tests__/conversion.test.ts`. Las usan las dos puertas que crean
// una reserva desde una cotización —el botón del panel y la liga de pago
// pagada— y el POST de Reservas, para que el cupo, el idioma y lo que se le
// dice al equipo se decidan igual en las tres.

import type { PedidoDeCupo, SinCupo } from "@/lib/cupoTour";
import { codigoDeTour } from "@/lib/admin/coloresTour";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «2026-11-20» → «20 nov». Sin `toLocaleString`: sale igual en cualquier servidor. */
export function fechaCorta(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? m[2]}`;
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

// ── Cupo ────────────────────────────────────────────────────────────────────

type Linea = Record<string, unknown>;

/**
 * Lo que se le pregunta al cupo: cada recorrido con su fecha y su gente. Sin
 * líneas de tour (cotizaciones viejas), el tour y la fecha de la cabecera.
 * Es la regla que ya usaba el POST de Reservas; ahora también la conversión.
 */
export function pedidosDeCupo(
  lineas: unknown,
  respaldo: { tourSlug?: unknown; tourDate?: unknown; adults?: unknown; children?: unknown },
): PedidoDeCupo[] {
  const conTour = (Array.isArray(lineas) ? (lineas as Linea[]) : []).filter((l) => l && !l._meta && l.tourSlug && l.tourDate);
  const base: Linea[] = conTour.length
    ? conTour
    : [{ tourSlug: respaldo.tourSlug, tourDate: respaldo.tourDate, adults: respaldo.adults, childrenMid: respaldo.children }];
  return base
    .filter((l) => l.tourSlug && l.tourDate)
    .map((l) => ({
      slug:     String(l.tourSlug),
      fecha:    String(l.tourDate),
      personas: Number(l.adults || 0) + Number(l.childrenMid ?? l.children ?? 0) + Number(l.childrenSmall || 0),
    }));
}

type SinLugar = Pick<SinCupo, "slug" | "fecha" | "personas" | "estado">;

/**
 * La nota «⚠️ SOBRECUPO» que va al principio de las notas de la reserva. No
 * frena nada (a veces se suma una unidad), pero queda escrita y se avisa.
 * `donde`: «capturada en el panel», «al convertir la cotización COT-…».
 */
export function avisoSobrecupo(sinLugar: SinLugar[], donde: string): string | null {
  if (!sinLugar.length) return null;
  return `⚠️ SOBRECUPO (${donde}): ${sinLugar
    .map((s) => `${s.slug} el ${s.fecha} (${s.personas} pers., ${s.estado === "cerrada" ? "fecha cerrada" : "sin lugar"})`)
    .join("; ")}. Mover de fecha o sumar unidad.`;
}

/** Lo mismo en corto, para el título de una tarea: «TAM 20 nov sin lugar». */
export function etiquetasSinLugar(sinLugar: SinLugar[]): string[] {
  return sinLugar.map((s) => `${codigoDeTour(s.slug)} ${fechaCorta(s.fecha)} ${s.estado === "cerrada" ? "fecha cerrada" : "sin lugar"}`);
}

// ── Idioma ──────────────────────────────────────────────────────────────────

/**
 * En qué idioma sale el guía. Lo que se eligió en el panel manda; si nadie lo
 * eligió (la liga pagada), basta con que el contacto o la cotización digan
 * inglés. El «es» del contacto no cuenta como dato: es su valor por omisión.
 */
export function idiomaTourDeConversion(p: { elegido?: unknown; idiomaContacto?: unknown; locale?: unknown }): "es" | "en" {
  if (p.elegido === "es" || p.elegido === "en") return p.elegido;
  return p.idiomaContacto === "en" || p.locale === "en" ? "en" : "es";
}

// ── El dinero de la liga, ya en la reserva ──────────────────────────────────

/**
 * Qué se dice, y si el lead se mueve, después de abonarle a la reserva lo que
 * entró por las ligas de su cotización.
 *  · entró dinero de la liga sobre dinero ya registrado: ¿el mismo pago dos
 *    veces? (alguien lo capturó a mano antes de que Stripe avisara);
 *  · 🔴 el abono FALLÓ (revisión del lote 1, 5 nov 2026): el dinero está en
 *    Stripe pero no en la reserva. Antes solo quedaba en el log y el lead,
 *    movido con la reserva en $0, bajaba de Anticipo a En seguimiento. Ahora
 *    se dice (en el seguimiento de la liga y en el panel) y el lead no se mueve
 *    hasta que el cobro entre: la liga queda libre y «Convertir» la vuelve a
 *    abonar.
 */
export function trasAbonarLigas(p: {
  folio: string; cobradoAntes: number; abonado: number; error?: string | null;
}): { avisos: string[]; revisar: string[]; moverLead: boolean } {
  if (p.error) {
    // El error técnico va al log, no aquí: esto lo lee el equipo.
    return {
      avisos: [`El pago de la liga de esta cotización no se pudo registrar en la reserva ${p.folio}. En Cotizaciones dale «Convertir» otra vez para que entre; no lo captures a mano.`],
      revisar: ["el pago de la liga no entró a la reserva: dale «Convertir» otra vez"],
      moverLead: false,
    };
  }
  if (p.abonado > 0 && p.cobradoAntes > 0) {
    // El dinero de la liga entra igual (es real) y una persona decide si es doble.
    return {
      avisos: [`La reserva ${p.folio} ya tenía ${pesos(p.cobradoAntes)} registrados y se le sumaron ${pesos(p.abonado)} de la liga de pago: si son el mismo pago, anula el que se capturó a mano.`],
      revisar: [`ya tenía ${pesos(p.cobradoAntes)} antes de la liga: ¿pago repetido?`],
      moverLead: true,
    };
  }
  return { avisos: [], revisar: [], moverLead: true };
}

// ── Lo que se le dice al equipo ─────────────────────────────────────────────

const MAX_TITULO_TAREA = 200;

/**
 * El seguimiento que deja la liga pagada. Sin nada raro, el de siempre. Con
 * algo que no cuadró (vencida, sin lugar, otra reserva del mismo cliente…),
 * empieza con ⚠️ y lo dice en corto: el cliente ya pagó y una persona decide.
 */
export function tituloTareaLigaPagada(p: { cliente: string; folio: string; monto: number; revisar: string[] }): string {
  const base = `Pagó la liga: ${p.cliente} ya tiene la reserva ${p.folio} (${pesos(p.monto)}).`;
  if (!p.revisar.length) return `${base} Mándale la confirmación y revisa guía y recogida.`.slice(0, MAX_TITULO_TAREA);
  const cabeza = `⚠️ ${base} Antes de confirmarle revisa: `;
  const unidos = p.revisar.join("; ");
  const lista = /[.?!]$/.test(unidos) ? unidos : `${unidos}.`;
  const cabe = MAX_TITULO_TAREA - cabeza.length;
  if (cabe <= 1) return cabeza.slice(0, MAX_TITULO_TAREA);
  return cabeza + (lista.length <= cabe ? lista : `${lista.slice(0, cabe - 1)}…`);
}

/**
 * Qué hace el panel después de «Convertir a reserva», según lo que contestó
 * el servidor. La regla vive aquí para que no dependa de una pestaña vieja:
 *  · ya era reserva (la liga pagada la creó, u otra persona): se dice cuál y
 *    NO se vuelve a proponer el anticipo si ya tiene dinero;
 *  · nueva: si ya pagó y falta dinero, se abre «Registrar cobro».
 */
export function pasoTrasConvertir(p: {
  nueva: boolean; yaPago: boolean; folio: string; cobrado: number; total: number; cancelada: boolean; abonadoPorLiga: number;
}): { abrirCobro: boolean; mensaje: string } {
  if (!p.nueva) {
    if (p.cancelada) {
      return { abrirCobro: false, mensaje: `Esta cotización ya fue la reserva ${p.folio} y está cancelada: no se creó otra. Si el cliente vuelve, reactívala en Reservas.` };
    }
    const abrirCobro = p.yaPago && p.cobrado <= 0;
    const tiene = p.cobrado > 0 ? ` y ya tiene ${pesos(p.cobrado)} cobrados` : "";
    const sigue = abrirCobro
      ? " Registra el pago para terminar."
      : p.cobrado > 0 && p.yaPago ? " Ese pago ya está registrado: no lo vuelvas a capturar." : "";
    return { abrirCobro, mensaje: `Esta cotización ya es la reserva ${p.folio}${tiene}: no se creó otra.${sigue} Lo que capturaste aquí no se guardó; si falta algo, complétalo en Reservas.` };
  }
  const abrirCobro = p.yaPago && p.cobrado < p.total;
  if (p.abonadoPorLiga > 0) {
    return {
      abrirCobro,
      mensaje: abrirCobro
        ? `Reserva creada · ${p.folio}. Ya entraron ${pesos(p.abonadoPorLiga)} por la liga de pago; registra solo lo demás.`
        : `Reserva creada · ${p.folio} con ${pesos(p.abonadoPorLiga)} ya cobrados por la liga de pago.`,
    };
  }
  return {
    abrirCobro,
    mensaje: abrirCobro
      ? `Reserva creada · ${p.folio}. Registra el pago para terminar.`
      : `Reserva creada · ${p.folio} — queda pendiente de pago; el cobro se registra en Reservas 💵`,
  };
}
