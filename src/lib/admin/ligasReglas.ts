// Reglas puras de las ligas de pago y del dinero que avisa Stripe (lote 3 de
// la auditoría, 5 nov 2026).
//
// Sin Prisma ni Stripe a propósito: se prueban en `__tests__/ligas.test.ts` y
// las usan `linksPago.ts` (apagar y registrar ligas), la conciliación de ligas
// del cron, el webhook (reembolsos y contracargos), la regla «liga sin pagar
// 24 h», la página de Cobros y la liga del saldo del viaje CDMX.
//
// La idea que las une: una liga solo debe poder pagarse mientras exista algo
// vivo que cobrar. Si aun así entra dinero, nunca se pierde en silencio: se
// registra donde se pueda y una persona decide.

import { montoCobrado, type CashFields } from "./dinero";
import { referenciaDeConcepto } from "./candadosCobro";

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const MAX_TITULO = 200;
const recorta = (t: string | null | undefined, n: number) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
/** Arma el título con la versión larga si cabe; si no, con la corta. Nunca pasa de 200. */
const titulo = (largo: string, corto: string) => (largo.length <= MAX_TITULO ? largo : corto.slice(0, MAX_TITULO));

// ── ¿Esta liga todavía debe poder pagarse? ──────────────────────────────────

/** Lo que se sabe de aquello que cobra una liga. `undefined` = no se pudo leer (no se apaga). */
export interface HechosLiga {
  /** Liga de una cotización: su estado, o null si ya no existe. */
  cotizacion?: { status: string } | null;
  /**
   * La reserva que la liga paga: la suya (liga de saldo) o la que ya salió de
   * su cotización (liga de anticipo). null = no existe o la cotización no tiene.
   */
  reserva?: { folio: string; status: string; total: number; cobrado: number; salidaCancelada?: boolean } | null;
}

/**
 * Por qué una liga ACTIVA ya no debe poder pagarse, o null si sigue viva.
 *
 * 🔴 Antes ninguna liga se apagaba sola (5 nov 2026): se borraba la cotización,
 * se cancelaba la reserva o se liquidaba por transferencia y la liga seguía
 * cobrable en el chat del cliente; el pago caía en una reserva cancelada o en
 * ninguna parte, y la regla «liga sin pagar 24 h» pedía recordárselo.
 * Una liga suelta (sin reserva ni cotización) nunca se apaga sola.
 */
export function motivoParaApagarLiga(
  liga: { reservaId: string | null; cotizacionId: string | null },
  h: HechosLiga | undefined,
): string | null {
  if (!h) return null;
  const r = h.reserva;
  const deLaReserva = (r: NonNullable<HechosLiga["reserva"]>, su: string): string | null => {
    if (r.status === "cancelled") return `se canceló ${su} ${r.folio}`;
    if (r.salidaCancelada) return `se canceló la salida del viaje de ${r.folio}`;
    if (r.total > 0 && r.cobrado >= r.total) return `${su} ${r.folio} ya está pagada`;
    return null;
  };
  if (liga.reservaId) {
    if (r === undefined) return null;
    if (r === null) return "la reserva ya no existe";
    return deLaReserva(r, "la reserva");
  }
  if (liga.cotizacionId) {
    const c = h.cotizacion;
    if (c === undefined) return null;
    if (c === null) return "se borró la cotización";
    if (c.status === "expirada") return "la cotización venció";
    if (c.status === "archivada") return "la cotización se archivó";
    return r ? deLaReserva(r, "su reserva") : null;
  }
  return null;
}

// ── Una liga pagada que no tenía a dónde ir ─────────────────────────────────

export type LigaSinDestino =
  | { tipo: "cotizacion-borrada" }
  | { tipo: "reserva-no-existe" }
  | { tipo: "reserva-cancelada"; folio: string }
  | { tipo: "pagada-de-mas"; folio: string; sobra: number };

/**
 * Después de abonar a su reserva el pago de una liga: ¿hay algo que una
 * persona tenga que decidir? La reserva cancelada no revive (el dinero queda
 * registrado en ella) y lo que pasa del total no se esconde.
 */
export function avisoTrasAbonarLiga(p: { folio: string; status: string; total: number; cobradoDespues: number }): LigaSinDestino | null {
  if (p.status === "cancelled") return { tipo: "reserva-cancelada", folio: p.folio };
  const sobra = Math.round(p.cobradoDespues - p.total);
  if (p.total > 0 && sobra > 0) return { tipo: "pagada-de-mas", folio: p.folio, sobra };
  return null;
}

/** El seguimiento para Manolo cuando una liga pagada no tenía a dónde ir. */
export function tituloLigaSinDestino(a: LigaSinDestino, p: { titulo?: string | null; cliente?: string | null; monto: number }): string {
  const quien = recorta(p.cliente, 40) || "El cliente";
  const cuanto = pesos(p.monto);
  const cual = p.titulo ? ` («${recorta(p.titulo, 40)}»)` : "";
  switch (a.tipo) {
    case "cotizacion-borrada":
      return titulo(
        `Liga pagada sin reserva: ${quien} pagó ${cuanto}${cual} de una cotización que ya se borró. Crea la reserva y registra el pago, o devuélvelo en Stripe.`,
        `Liga pagada sin reserva: ${quien} pagó ${cuanto} de una cotización que ya se borró. Crea la reserva y registra el pago, o devuélvelo en Stripe.`,
      );
    case "reserva-no-existe":
      return titulo(
        `Liga pagada sin reserva: ${quien} pagó ${cuanto}${cual} de una reserva que ya no existe. Créala y registra el pago, o devuélvelo en Stripe.`,
        `Liga pagada sin reserva: ${quien} pagó ${cuanto} de una reserva que ya no existe. Créala y registra el pago, o devuélvelo en Stripe.`,
      );
    case "reserva-cancelada":
      return titulo(
        `${quien} pagó ${cuanto} con la liga de la reserva CANCELADA ${a.folio}: el pago quedó en ella. Decide: devolverlo en Stripe (y anular el cobro) o reactivar la reserva.`,
        `Pagó ${cuanto} con la liga de la reserva CANCELADA ${a.folio}: el pago quedó en ella. Devuélvelo en Stripe (y anula el cobro) o reactiva la reserva.`,
      );
    case "pagada-de-mas":
      return titulo(
        `${quien} pagó ${cuanto} con la liga de ${a.folio}, que ya estaba pagada: sobran ${pesos(a.sobra)}. Devuélvelos en Stripe y anula ese cobro, o anota a qué corresponden.`,
        `Pagó ${cuanto} con la liga de ${a.folio}, que ya estaba pagada: sobran ${pesos(a.sobra)}. Devuélvelos en Stripe y anula ese cobro, o anota a qué corresponden.`,
      );
  }
}

/** Una liga que Stripe no encuentra en la cuenta actual (la de antes del 29 oct). */
export function tituloLigaDeOtraCuenta(p: { titulo?: string | null; cliente?: string | null; monto: number }): string {
  const quien = recorta(p.cliente, 40);
  return titulo(
    `La liga «${recorta(p.titulo, 50)}» (${quien ? `${quien}, ` : ""}${pesos(p.monto)}) no está en la cuenta actual de Stripe: si es de la cuenta anterior, revisa allá si se pagó y apágala.`,
    `Una liga de ${pesos(p.monto)} no está en la cuenta actual de Stripe: si es de la cuenta anterior, revisa allá si se pagó y apágala.`,
  );
}

// ── La conciliación de ligas (cron de conciliar pagos) ──────────────────────

export interface SesionPagadaLiga {
  id: string;
  /** En centavos, como lo da Stripe. */
  montoCentavos: number;
  correo: string | null;
  paymentIntentId: string | null;
}

export type AccionConciliacion =
  | { accion: "registrar"; sesion: SesionPagadaLiga }
  | { accion: "apagar"; motivo: string }
  | { accion: "otra-cuenta" }
  | { accion: "nada" };

/**
 * Qué hacer con una liga en la conciliación (5 nov 2026). Primero el dinero:
 * si Stripe dice que se pagó y el aviso nunca llegó, se registra (aunque la
 * liga ya estuviera apagada aquí: el cliente pudo pagarla en el último
 * momento). Solo una liga activa y sin pagar se apaga si ya no tiene qué cobrar.
 */
export function accionDeConciliacion(
  liga: { estado: string; reservaId: string | null; cotizacionId: string | null },
  sesiones: SesionPagadaLiga[] | "no-existe",
  hechos: HechosLiga | undefined,
): AccionConciliacion {
  if (sesiones === "no-existe") return liga.estado === "activo" ? { accion: "otra-cuenta" } : { accion: "nada" };
  const pagada = sesiones.find((s) => s.montoCentavos > 0);
  if (pagada) return { accion: "registrar", sesion: pagada };
  if (liga.estado !== "activo") return { accion: "nada" };
  const motivo = motivoParaApagarLiga(liga, hechos);
  return motivo ? { accion: "apagar", motivo } : { accion: "nada" };
}

// ── Reembolsos y contracargos de Stripe ─────────────────────────────────────

export interface CobroDeStripe { id: string; monto: number; anulado: boolean }

/** El único cobro vivo de ese importe entre los de un pago, o null si no hay o hay varios. */
export function unicoCobroVivoDe(cobros: CobroDeStripe[], monto: number): CobroDeStripe | null {
  const iguales = cobros.filter((c) => !c.anulado && c.monto === monto);
  return iguales.length === 1 ? iguales[0] : null;
}

export type DecisionReembolso =
  | { accion: "anular"; cobroId: string }
  | { accion: "nada" }
  | { accion: "avisar"; por: "parcial" | "sin-cobro" | "no-cuadra" | "resto" };

/**
 * Stripe devolvió dinero de un pago. Solo se anula solo el cobro cuando no hay
 * duda: devolución COMPLETA y un único cobro vivo de ese mismo importe. Una
 * devolución parcial no se puede reflejar anulando (el cobro se anula entero),
 * así que se avisa con lo que hay que hacer.
 *
 * `huboParcialAntes`: de ese mismo cargo ya se había devuelto una parte. 🔴
 * Revisión del lote 3 (5 nov 2026): el aviso de entonces pide anular el cobro
 * y registrar a mano lo que se quedó; ese renglón nuevo no lleva la referencia
 * del pago y aquí no se ve. Si ya no queda nada vivo de ese pago, callarse lo
 * dejaba contado aunque Stripe ya devolvió todo.
 */
export function decidirReembolso(p: { cobros: CobroDeStripe[]; cargo: number; reembolsado: number; huboParcialAntes?: boolean }): DecisionReembolso {
  if (p.reembolsado < p.cargo) return { accion: "avisar", por: "parcial" };
  const vivos = p.cobros.filter((c) => !c.anulado);
  if (!vivos.length) {
    if (!p.cobros.length) return { accion: "avisar", por: "sin-cobro" };
    return p.huboParcialAntes ? { accion: "avisar", por: "resto" } : { accion: "nada" };
  }
  const unico = unicoCobroVivoDe(vivos, p.cargo);
  return unico ? { accion: "anular", cobroId: unico.id } : { accion: "avisar", por: "no-cuadra" };
}

/** El seguimiento para Manolo tras un reembolso; null = no hace falta. */
export function tituloReembolso(d: DecisionReembolso, p: { folio: string | null; cliente: string | null; cargo: number; reembolsado: number; huboParcialAntes?: boolean }): string | null {
  const de = p.folio ? `${p.folio}${p.cliente ? ` (${recorta(p.cliente, 40)})` : ""}` : (recorta(p.cliente, 40) || "un pago");
  const dev = pesos(p.reembolsado);
  switch (d.accion) {
    case "nada": return null;
    case "anular":
      // Ya había devuelto una parte: lo que se registró a mano entonces sigue vivo (revisión del lote 3, 5 nov 2026).
      if (p.huboParcialAntes) {
        return titulo(
          `Stripe terminó de devolver el pago de ${pesos(p.cargo)} de ${de}: su cobro se anuló solo. Si tras la primera devolución registraste a mano lo que se quedó, anúlalo también.`,
          `Stripe terminó de devolver ${pesos(p.cargo)} de ${de}: su cobro se anuló solo; anula también lo que registraste a mano tras la primera devolución.`,
        );
      }
      return titulo(`Stripe devolvió ${dev} de ${de}: su cobro se anuló solo. Si la reserva ya no va, cancélala con su motivo.`, `Stripe devolvió ${dev} de ${de}: su cobro se anuló solo.`);
    case "avisar":
      if (d.por === "resto") {
        return titulo(
          `Stripe terminó de devolver el pago de ${pesos(p.cargo)} de ${de} (antes había devuelto una parte): anula en sus cobros lo que registraste a mano de ese pago.`,
          `Stripe terminó de devolver ${pesos(p.cargo)} de ${de} (antes devolvió una parte): anula lo que registraste a mano de ese pago.`,
        );
      }
      if (d.por === "parcial") {
        const queda = pesos(p.cargo - p.reembolsado);
        return titulo(
          `Stripe devolvió ${dev} de un pago de ${pesos(p.cargo)} de ${de}: en sus cobros anula ese pago y registra los ${queda} que se quedaron.`,
          `Stripe devolvió ${dev} de ${pesos(p.cargo)} de ${de}: anula ese cobro y registra los ${queda} que se quedaron.`,
        );
      }
      if (d.por === "sin-cobro") {
        return titulo(`Stripe devolvió ${dev} de ${de}, pero ese pago no tiene cobro en el panel: revisa en Reservas si hay que cancelar algo.`, `Stripe devolvió ${dev} de ${de} y no encontré su cobro: revísalo en Reservas.`);
      }
      return titulo(`Stripe devolvió ${dev} de ${de}: revisa en sus cobros cuál anular (no lo hice solo porque ninguno cuadra exacto).`, `Stripe devolvió ${dev} de ${de}: revisa cuál cobro anular.`);
  }
}

/** Un contracargo: el cliente desconoció el pago en su banco y Stripe retiene el dinero. */
export function tituloContracargo(p: { folio: string | null; cliente: string | null; monto: number; venceEl: string | null }): string {
  const de = p.folio ? `${p.folio}${p.cliente ? ` (${recorta(p.cliente, 40)})` : ""}` : (recorta(p.cliente, 40) || "un pago");
  const plazo = p.venceEl ? ` antes del ${fechaCortaYMD(p.venceEl)}` : "";
  return titulo(
    `Contracargo: desconocieron en el banco el pago de ${pesos(p.monto)} de ${de}. Responde en Stripe con las pruebas${plazo} o se pierde el dinero.`,
    `Contracargo de ${pesos(p.monto)} de ${de}: responde en Stripe${plazo} o se pierde el dinero.`,
  );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCortaYMD(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? m[2]}` : ymd;
}

// ── De qué pago de Stripe es cada cobro (revisión del lote 3, 5 nov 2026) ───

interface CobroConReferencia { referencia?: string | null; concepto?: string | null; stripeRef?: string | null }

/** La sesión de pago de Stripe («cs_…») que trae la referencia de un cobro de liga, o null. */
function sesionDeCobro(c: CobroConReferencia): string | null {
  const ref = String(c.referencia ?? referenciaDeConcepto(c.concepto) ?? "").trim();
  return /^cs_(live|test)_/.test(ref) ? ref : null;
}

/**
 * Los cobros de UNA liga pagada antes del 5 nov 2026: no guardaron el
 * PaymentIntent (con el que llega un reembolso), pero sí su sesión de pago en
 * la referencia. El código de antes la recortaba a 60 caracteres: basta con
 * que la sesión EMPIECE con lo que quedó guardado. 🔴 Sin esto, la devolución
 * de una de esas ligas no encontraba su cobro y el dinero seguía contado.
 */
export function cobrosDeLaSesion<T extends CobroConReferencia>(cobros: T[], sesionId: string): T[] {
  return cobros.filter((c) => {
    if (c.stripeRef === sesionId) return true;
    const s = sesionDeCobro(c);
    return !!s && s.length >= 20 && sesionId.startsWith(s);
  });
}

/**
 * Del pago con tarjeta en el sitio: los cobros de Stripe de la reserva SIN los
 * de sus ligas de pago (esos llevan su sesión «cs_…» y son OTRO pago). 🔴 Antes
 * la devolución del pago del sitio podía anular el cobro de la liga del saldo
 * si era del mismo importe y el del sitio ya estaba anulado a mano.
 */
export function cobrosDelPagoWeb<T extends CobroConReferencia>(cobros: T[]): T[] {
  return cobros.filter((c) => !sesionDeCobro(c));
}

// (La baja de correos ya no vence cotizaciones —lote 4, 5 nov 2026—: solo
// pausa sus correos, así que tampoco apaga su liga. Ver `lineItemsTrasBaja`.)

// ── Cobros → «Lo que falta de una reserva» ──────────────────────────────────

/**
 * Las reservas a las que se les puede mandar la liga del saldo: las vivas que
 * deben algo, con la MISMA regla de «cobrado» que Reservas (`montoCobrado`,
 * con la fecha de creación). 🔴 Antes la página tomaba las 60 más recientes y
 * DESPUÉS filtraba: una de diciembre con anticipo de septiembre no aparecía y
 * su saldo se mandaba como «cobro suelto», sin abonarse a nadie (5 nov 2026).
 */
export function reservasParaPagoRestante<T extends CashFields & { status: string }>(reservas: T[]): (T & { cobrado: number; saldo: number })[] {
  return reservas
    .filter((r) => r.status !== "cancelled")
    .map((r) => {
      const cobrado = montoCobrado(r);
      return { ...r, cobrado, saldo: Math.max(0, r.totalAmount - cobrado) };
    })
    .filter((r) => r.saldo > 0);
}

// ── Viaje CDMX: la liga del saldo ───────────────────────────────────────────

export type DecisionLigaSaldo =
  | { accion: "nada" }
  | { accion: "sin-anticipo" }
  | { accion: "crear"; monto: number; apagarLaAnterior: boolean }
  | { accion: "recordar" };

/**
 * Qué hace el cron con la liga del saldo de un lugar del viaje.
 *  · 🔴 Pagó en línea y no tiene nada cobrado (el cobro del anticipo falló):
 *    NO se le manda una liga por el total —pagaría dos veces su anticipo—;
 *    se avisa a una persona (5 nov 2026).
 *  · Una liga guardada que ya no está activa (se apagó al cancelar, o es de
 *    un saldo distinto) no se le recuerda: se hace otra. Una pagada con el
 *    mismo saldo no se repite: ese pago ya dejó su propio seguimiento.
 */
export function decidirLigaSaldoViaje(p: {
  total: number;
  cobrado: number;
  pagoEnLinea: boolean;
  correoValido: boolean;
  faltanDias: number;
  diasAntes: number;
  hoy: string;
  liga: { monto: number; enviada: string; recordatorio?: string; estado: string | null } | null;
}): DecisionLigaSaldo {
  const saldo = p.total - p.cobrado;
  if (saldo < 10 || !p.correoValido) return { accion: "nada" };
  if (p.faltanDias > p.diasAntes) return { accion: "nada" };
  if (p.pagoEnLinea && p.cobrado <= 0) return { accion: "sin-anticipo" };
  const l = p.liga;
  if (!l || l.estado === null || l.estado === "cancelado") return { accion: "crear", monto: saldo, apagarLaAnterior: false };
  if (l.estado === "pagado") return l.monto === saldo ? { accion: "nada" } : { accion: "crear", monto: saldo, apagarLaAnterior: false };
  if (l.monto !== saldo) return { accion: "crear", monto: saldo, apagarLaAnterior: true };
  if (p.faltanDias <= 0 && !l.recordatorio && l.enviada !== p.hoy) return { accion: "recordar" };
  return { accion: "nada" };
}

/** El aviso a Manolo cuando un lugar del viaje pagado en línea no tiene su anticipo registrado. */
export function tituloViajeSinAnticipo(p: { folio: string; cliente: string }): string {
  return titulo(
    `El viaje CDMX de ${recorta(p.cliente, 40)} (${p.folio}) se pagó en línea pero no tiene su anticipo registrado: revísalo en Stripe y regístralo. No le mandé la liga del saldo.`,
    `El viaje CDMX ${p.folio} se pagó en línea y no tiene su anticipo registrado: revísalo en Stripe. No le mandé la liga del saldo.`,
  );
}

// ── La liga que va en el correo de la cotización (13 nov 2026) ──────────────

/**
 * Quién crea las ligas que salen solas en el correo de la cotización y en sus
 * recordatorios. Las que hace una persona en Cobros llevan su nombre: esas se
 * respetan (es el monto que esa persona acordó con el cliente).
 */
export const CREADOR_LIGA_COTIZACION = "Sistema (cotización)";

/**
 * Las ligas de «una por persona» que pide el bot (16 nov 2026, «Estructura de
 * oro»: si viajan varios y cada quien paga lo suyo). Mientras haya una viva,
 * la cotización se cobra en partes: el correo y sus recordatorios ya no ofrecen
 * la liga del anticipo completo, que se pagaría encima de las partes.
 */
export const CREADOR_LIGA_PARTES = "Sistema (por persona)";

/**
 * Las ligas que nacen SOLAS con la cotización (la del correo y sus
 * recordatorios, y las «una por persona» del bot), no de una persona en Cobros.
 * Dejan el lead en Cotizado (`etapaPorLiga`) y, mientras siga ahí, su recordatorio
 * de 24 h lo cubre el «¿la vio?» de la cotización (`reglaLiga`, 20 nov 2026).
 */
export const LIGAS_AUTOMATICAS: readonly string[] = [CREADOR_LIGA_COTIZACION, CREADOR_LIGA_PARTES];

/** ¿La creó el sistema con la cotización? (ver `LIGAS_AUTOMATICAS`). */
export function esLigaAutomatica(creadoPor: string | null | undefined): boolean {
  return !!creadoPor && LIGAS_AUTOMATICAS.includes(creadoPor);
}

/**
 * Reparte un monto en `partes` pesos enteros que suman exacto; lo que no se
 * divide parejo va en las primeras (1,000 / 3 → 334, 333, 333). Lanza si
 * alguna parte queda abajo del mínimo de Stripe.
 */
export function repartirEnPartes(monto: number, partes: number, minimo = 10): number[] {
  const total = Math.round(monto);
  const n = Math.floor(partes);
  if (!Number.isFinite(total) || total <= 0) throw new Error("No hay monto que repartir");
  if (!Number.isFinite(n) || n < 2 || n > 12) throw new Error("Se reparte entre 2 y 12 personas");
  const base = Math.floor(total / n);
  if (base < minimo) throw new Error(`Cada parte quedaría en menos de $${minimo} MXN`);
  const sobra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** «Parte 2 de 3 · Anticipo de Expedición Tamul» → { parte: 2, de: 3 }; otra cosa → null. */
export function parteDeTitulo(titulo: string | null | undefined): { parte: number; de: number } | null {
  const m = /^Parte (\d+) de (\d+)/.exec(String(titulo || ""));
  return m ? { parte: Number(m[1]), de: Number(m[2]) } : null;
}

export type DecisionLigaCotizacion =
  | { accion: "nada"; motivo: string }
  | { accion: "reusar"; ligaId: string }
  | { accion: "crear"; monto: number; apagar: string[] };

/**
 * Qué liga lleva el botón «Reservar» del correo de una cotización (pedido de
 * Manolo, 13 nov 2026: «que el botón mande a pagar en Stripe el monto acordado
 * en la cotización»). El monto es el anticipo acordado (`anticipoDe`).
 *
 *  · Solo una cotización abierta (borrador o enviada), sin reemplazo y sin
 *    reserva viva lleva liga: a quien ya es reserva no se le vuelve a cobrar.
 *  · Si una liga suya ya se pagó, no se hace otra: ese pago ya la convirtió.
 *  · Una liga viva hecha A MANO en Cobros manda: es lo que se habló con el cliente.
 *  · La automática con el mismo monto se reusa (el mismo enlace en el correo y
 *    en los recordatorios); si se editó la cotización y cambió el monto, se
 *    apaga la vieja y nace otra con el monto nuevo.
 */
export function decidirLigaDeCotizacion(p: {
  status: string;
  reemplazada: boolean;
  conReserva: boolean;
  monto: number;
  /** Las ligas de la cotización, la más reciente primero. */
  ligas: { id: string; monto: number; estado: string; creadoPor: string | null }[];
}): DecisionLigaCotizacion {
  if (p.status !== "borrador" && p.status !== "enviada") return { accion: "nada", motivo: `la cotización está ${p.status}` };
  if (p.reemplazada) return { accion: "nada", motivo: "la reemplazó otra cotización" };
  if (p.conReserva) return { accion: "nada", motivo: "ya es una reserva" };
  if (p.ligas.some((l) => l.estado === "pagado")) return { accion: "nada", motivo: "ya pagó una liga" };
  if (!(p.monto >= 10)) return { accion: "nada", motivo: "el anticipo es menor a $10" };
  const vivas = p.ligas.filter((l) => l.estado === "activo");
  if (vivas.some((l) => l.creadoPor === CREADOR_LIGA_PARTES)) return { accion: "nada", motivo: "se cobra en partes (una liga por persona)" };
  const aMano = vivas.find((l) => l.creadoPor !== CREADOR_LIGA_COTIZACION);
  if (aMano) return { accion: "reusar", ligaId: aMano.id };
  const igual = vivas.find((l) => l.monto === p.monto);
  if (igual) return { accion: "reusar", ligaId: igual.id };
  return { accion: "crear", monto: p.monto, apagar: vivas.map((l) => l.id) };
}

const MESES_LIGA = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * El concepto y la línea chica que el cliente ve en la página de pago de
 * Stripe: los mismos que arma Cobros a mano («Anticipo de Expedición Tamul»,
 * «Ana López · 4 personas · sale el 14 de noviembre · COT-…»).
 */
export function textosLigaDeCotizacion(q: {
  quoteNumber: string; customerName: string; tourName: string; tourDate: string; personas: number; total: number; monto: number;
}, anoActual = new Date().getFullYear()): { titulo: string; detalle: string } {
  const partes = String(q.tourName || "").split(" + ");
  const primero = partes[0].split("—")[0].split(":")[0].trim() || "tu tour";
  const corto = partes.length > 1 ? `${primero} y ${partes.length - 1} tour${partes.length > 2 ? "s" : ""} más` : primero.slice(0, 48);
  const tituloLiga = (q.monto >= q.total ? `Pago de ${corto}` : `Anticipo de ${corto}`).slice(0, 120);
  const det = [recorta(q.customerName, 60)];
  if (q.personas > 0) det.push(`${q.personas} ${q.personas === 1 ? "persona" : "personas"}`);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.tourDate || "");
  if (m) det.push(`sale el ${Number(m[3])} de ${MESES_LIGA[Number(m[2]) - 1]}${Number(m[1]) !== anoActual ? ` de ${m[1]}` : ""}`);
  det.push(q.quoteNumber);
  return { titulo: tituloLiga, detalle: det.filter(Boolean).join(" · ").slice(0, 200) };
}

/**
 * La liga con el correo del cliente ya escrito en la página de pago de Stripe
 * (`prefilled_email`): un campo menos en el teléfono, y el pago llega con el
 * mismo correo de la cotización.
 */
export function ligaConCorreo(url: string, correo: string | null | undefined): string {
  const c = String(correo ?? "").trim();
  if (!c || !c.includes("@") || c.endsWith("@desconocido")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(c)}`;
}
