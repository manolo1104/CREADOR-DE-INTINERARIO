// Las reglas del CRM (Fase 2 del rediseño, 3 nov 2026). Puro: lo usan las
// APIs, las pantallas, el sembrado y las pruebas. Las etapas y los motivos
// de pérdida son los del prompt; no se cambian sin anotarlo aquí.
//
// 19 nov 2026 (Manolo: «combina la de anticipo pagado con el de confirmado,
// porque una vez que pagan se confirma el tour»): «Anticipo pagado» ya no es
// etapa. Cualquier pago (Stripe, liga, transferencia o efectivo) deja el lead
// en Confirmado, y lo que falta por cobrar se ve en la tarjeta y en la ficha.
// La clave vieja «anticipo» se sigue LEYENDO como Confirmado (`normalizarEtapa`)
// pero ya no se escribe nunca.

export const ETAPAS = [
  { clave: "nuevo",       etiqueta: "Nuevo" },
  { clave: "calificado",  etiqueta: "Calificado" },
  { clave: "cotizado",    etiqueta: "Cotizado" },
  { clave: "seguimiento", etiqueta: "En seguimiento" },
  { clave: "confirmado",  etiqueta: "Confirmado" },
  { clave: "operado",     etiqueta: "Operado" },
  { clave: "perdido",     etiqueta: "Perdido" },
] as const;

export type Etapa = (typeof ETAPAS)[number]["clave"];

/**
 * Claves viejas que ya no son etapa y la etapa con que se leen (19 nov 2026).
 * Los leads que la base todavía tenga en «anticipo» y las filas viejas del
 * historial se ven, se cuentan y se mueven como Confirmado. El script
 * `unir-anticipo-confirmado.ts` pasa los que queden; nada vuelve a escribirla.
 */
export const ETAPAS_LEGADO: Readonly<Record<string, Etapa>> = { anticipo: "confirmado" };

/** La etapa con que se lee un valor guardado: una clave vieja, como la que la reemplazó; lo demás, igual. */
export function normalizarEtapa(e: Etapa): Etapa;
export function normalizarEtapa(e: string): string;
export function normalizarEtapa(e: string): string {
  return Object.prototype.hasOwnProperty.call(ETAPAS_LEGADO, e) ? ETAPAS_LEGADO[e] : e;
}

/** Las claves que esa etapa puede tener en la base: la suya y las viejas que se leen como ella (Confirmado y «anticipo»). */
export const clavesEnBD = (e: string): string[] => [e, ...Object.keys(ETAPAS_LEGADO).filter(k => ETAPAS_LEGADO[k] === e)];

/**
 * El `creadoPor` de los leads que sembró la importación inicial
 * (`scripts/sembrar-crm.ts`, 3 nov 2026). No son leads que entraron ese día:
 * se quedan fuera de las cohortes del Embudo y de Inicio (lote 9, 10 nov 2026).
 */
export const CREADO_POR_IMPORTACION = "Importación inicial";

/**
 * Filtro de Prisma para CONTAR leads por fecha de alta sin los importados.
 * El OR es a propósito: un `{ not: … }` a secas, en SQL, también deja fuera
 * los leads sin `creadoPor` (null), que son casi todos (19 nov 2026).
 */
export const SIN_IMPORTADOS = { OR: [{ creadoPor: null }, { creadoPor: { not: CREADO_POR_IMPORTACION } }] };

/** Estados de una cotización que ya salió al cliente (un borrador nunca se mandó). */
export const ESTADOS_COTIZACION_ENVIADA = ["enviada", "aceptada", "expirada"];

/**
 * Desde qué día TODA cotización que sale al cliente trae su fecha de envío
 * (`enviadaEn`) en producción (revisión del 20 nov 2026). El lote 9 la empezó a
 * guardar (escrito el 10 nov), pero llegó a producción con el push del 18 nov
 * (deploy de Railway a las 22:12): hasta ahí ninguna cotización de producción
 * la tiene, aunque haya salido. Desde este día, una sin `enviadaEn` NUNCA
 * salió, aunque esté «Vencida» (un borrador marcado vencido a mano, o el del
 * bot que se reemplazó) o «Aceptada» sin mandarse.
 */
export const ENVIO_SE_GUARDA_DESDE = "2026-11-19";
/** `ENVIO_SE_GUARDA_DESDE` a las 00:00 de México, para los filtros de Prisma. */
export const ENVIO_SE_GUARDA_DESDE_FECHA = new Date(`${ENVIO_SE_GUARDA_DESDE}T00:00:00-06:00`);

/**
 * Filtro de Prisma: cotizaciones que SALIERON al cliente (19 nov 2026). Las que
 * tienen fecha de envío (correo, WhatsApp o PDF) aunque sigan en borrador (el
 * PDF) o ya estén archivadas, y las de ANTES de `ENVIO_SE_GUARDA_DESDE` sin esa
 * fecha que quedaron enviadas, aceptadas o vencidas. 🔴 Sin ese límite (hasta el
 * 20 nov), un borrador nuevo que nadie mandó y se marcó vencido contaba como
 * cotización enviada en los KPIs y el reporte de los jueves. Es la misma regla
 * que `cotizacionSalio`. Va solo: no lo juntes con otro `OR`.
 */
export const COTIZACION_QUE_SALIO = {
  OR: [
    { enviadaEn: { not: null } },
    { enviadaEn: null, status: { in: ESTADOS_COTIZACION_ENVIADA }, createdAt: { lt: ENVIO_SE_GUARDA_DESDE_FECHA } },
  ],
};

/** ¿La cotización salió al cliente? La regla de `COTIZACION_QUE_SALIO`, para lo que ya se leyó de la base. */
export function cotizacionSalio(q: { enviadaEn?: Date | string | null; status: string; createdAt: Date | string }): boolean {
  if (q.enviadaEn) return true;
  return ESTADOS_COTIZACION_ENVIADA.includes(q.status) && new Date(q.createdAt).getTime() < ENVIO_SE_GUARDA_DESDE_FECHA.getTime();
}

/**
 * Desde qué día el lead pasa a Cotizado al CREAR su cotización y no al mandarla
 * (Manolo, 19 nov 2026). Desde ahí un paso a «cotizado» del historial ya no
 * dice que la cotización salió: los KPIs (Leads cotizados, PDF a calificados,
 * Embudo e Inicio) y el reporte de los jueves cuentan solo las que de verdad
 * salieron (`enviadaEn`), y el «¿la vio?» arranca con el primer envío.
 * 🔴 Tiene que ser un día en que cada envío ya guardaba su fecha en producción
 * (`ENVIO_SE_GUARDA_DESDE`: el 19 nov; el lote 9 se escribió el 10 nov pero se
 * subió el 18 en la noche) y no después del día en que se sube este cambio. Se
 * dejó el día en que se escribió; no hace falta moverlo.
 */
export const COTIZADO_AL_CREAR_DESDE = "2026-11-19";

/**
 * Las etapas ABIERTAS (todavía se pueden ganar o perder), en el orden del
 * camino. Operado y Perdido son las cerradas: van en el tablero
 * (`COLUMNAS_TABLERO`) pero NUNCA aquí, porque `estaAbierta` sale de esta lista
 * (juntar leads vacíos, la cotización nueva de un cliente que vuelve, «¿Consulta nueva?»).
 */
export const ETAPAS_PIPELINE: Etapa[] = ["nuevo", "calificado", "cotizado", "seguimiento", "confirmado"];

/** Las columnas del tablero de Leads (19 nov 2026, «que aparezcan completas»): las abiertas y al final Operado y Perdido. */
export const COLUMNAS_TABLERO: Etapa[] = [...ETAPAS_PIPELINE, "operado", "perdido"];

/** Las abiertas como pueden estar guardadas (con la clave vieja «anticipo»): para los filtros `in` de Prisma. */
export const ETAPAS_ABIERTAS_BD: string[] = ETAPAS_PIPELINE.flatMap(clavesEnBD);

/**
 * Las que faltan por cerrar: todavía sin dinero. Son el contador del menú y el
 * «N por cerrar» del tablero. Confirmado ya pagó algo; si debe saldo, eso se
 * ve en su tarjeta («Anticipo $X · falta $Y»), no aquí (19 nov 2026).
 */
export const ETAPAS_POR_CERRAR: Etapa[] = ["nuevo", "calificado", "cotizado", "seguimiento"];

/** Días que se ven en las columnas Operado y Perdido, contados desde el día en que se cerró el lead (19 nov 2026); lo anterior va en «Ver todos». */
export const DIAS_TABLERO_CERRADOS = 14;

/** Días de leads cerrados que trae el tablero para «Ver todos» (4 meses), contados desde el día en que se cerraron. */
export const DIAS_LISTA_CERRADOS = 120;

export const esEtapa = (v: unknown): v is Etapa => ETAPAS.some(e => e.clave === v);
/** El nombre de la etapa. La clave vieja «anticipo» dice «Confirmado» (19 nov 2026). */
export const etiquetaEtapa = (e: string) => { const n = normalizarEtapa(e); return ETAPAS.find(x => x.clave === n)?.etiqueta ?? e; };
/** El orden de las etapas (perdido al final, fuera del camino). La vieja «anticipo» va donde Confirmado. */
export const ordenEtapa = (e: string) => ETAPAS.findIndex(x => x.clave === normalizarEtapa(e));

/**
 * Sube a `objetivo` solo si está antes en el camino; nunca baja ni revive una
 * perdida. Un lead guardado con la clave vieja «anticipo» cuenta como
 * Confirmado: una liga nueva (En seguimiento) ya no lo baja (19 nov 2026). Si
 * no sube, devuelve la etapa tal como estaba: así no se reescribe nada.
 */
export function subirA(actual: Etapa, objetivo: Etapa): Etapa {
  const a = normalizarEtapa(actual), o = normalizarEtapa(objetivo);
  if (a === "perdido" || a === "operado") return actual;
  return ordenEtapa(o) > ordenEtapa(a) ? o : actual;
}

/** Abierta = todavía se puede ganar o perder (la clave vieja «anticipo» también: es Confirmado). */
export const estaAbierta = (e: string) => (ETAPAS_PIPELINE as string[]).includes(normalizarEtapa(e));

export const MOTIVOS_PERDIDA = [
  { clave: "precio",            etiqueta: "Precio" },
  { clave: "no-contesto",       etiqueta: "No contestó tras cotizar" },
  { clave: "sin-disponibilidad", etiqueta: "Fecha sin disponibilidad" },
  { clave: "otro-operador",     etiqueta: "Se fue con otro operador" },
  { clave: "otro",              etiqueta: "Otro (explícalo)" },
] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number]["clave"];

/** Lo que se guarda en `motivoPerdida`; null si no sirve («otro» exige detalle). */
export function motivoPerdidaParaGuardar(clave: unknown, detalle: unknown): string | null {
  if (!MOTIVOS_PERDIDA.some(m => m.clave === clave)) return null;
  const d = String(detalle ?? "").trim().slice(0, 200);
  if (clave === "otro" && !d) return null;
  return d ? `${clave}: ${d}` : String(clave);
}
export function claveMotivo(guardado: string | null | undefined): MotivoPerdida | null {
  const c = String(guardado ?? "").split(":")[0].trim();
  return MOTIVOS_PERDIDA.some(m => m.clave === c) ? (c as MotivoPerdida) : null;
}
export function etiquetaMotivoPerdida(guardado: string | null | undefined): string {
  if (!guardado) return "";
  const [c, ...resto] = guardado.split(":");
  const m = MOTIVOS_PERDIDA.find(x => x.clave === c.trim());
  const base = m ? m.etiqueta.replace(" (explícalo)", "") : c;
  const det = resto.join(":").trim();
  return det ? `${base}: ${det}` : base;
}

export const PERFILES = [
  { clave: "pareja", etiqueta: "Pareja" }, { clave: "familia", etiqueta: "Familia" }, { clave: "amigos", etiqueta: "Amigos" },
  { clave: "empresa", etiqueta: "Empresa o escuela" }, { clave: "solo", etiqueta: "Viaja solo" },
] as const;

/**
 * Un teléfono a E.164 de México cuando se puede (+52 y 10 dígitos). Quita el
 * «1» viejo de celular (+521…). Con «+» y otro país, se respeta. Null si no
 * parece teléfono.
 */
export function normalizarTelefono(v: unknown): string | null {
  const crudo = String(v ?? "").trim();
  if (!crudo) return null;
  const conMas = crudo.startsWith("+") || crudo.startsWith("00");
  let d = crudo.replace(/\D/g, "");
  if (crudo.startsWith("00")) d = d.slice(2);
  if (d.length === 10) return `+52${d}`;
  if (d.length === 12 && d.startsWith("52")) return `+${d}`;
  if (d.length === 13 && d.startsWith("521")) return `+52${d.slice(3)}`;
  if (conMas && d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

/** Para enlazar a WhatsApp: solo dígitos. */
export const waDe = (telefono: string | null | undefined) => (telefono ? telefono.replace(/\D/g, "") : "");

export interface DatosCalificacion { tours: string[]; fechaViaje: string | null; pax: number | null }

/** «Se capturan fecha, pax y tour → Calificado» (regla del prompt). */
export const estaCalificada = (o: DatosCalificacion) => o.tours.length > 0 && !!o.fechaViaje && (o.pax ?? 0) > 0;

/**
 * La etapa que toca por regla tras editar los datos. Solo SUBE de Nuevo a
 * Calificado: nunca baja una etapa ni salta las que dependen de un hecho
 * (cotización enviada, pago), que llegan en el PR 2.2.
 */
export function etapaPorReglas(actual: Etapa, o: DatosCalificacion): Etapa {
  return actual === "nuevo" && estaCalificada(o) ? "calificado" : actual;
}

/**
 * La etapa que pide una reserva enlazada, según lo cobrado. Sin cobro: En
 * seguimiento; con CUALQUIER cobro (el anticipo o todo, por Stripe, liga,
 * transferencia o efectivo): Confirmado. Manolo, 19 nov 2026: «una vez que
 * pagan se confirma el tour»; antes el pago parcial era «Anticipo pagado».
 * El total ya no cambia la etapa (lo que falta se ve como saldo); el segundo
 * parámetro se queda para no tocar a quien lo llama.
 */
export function etapaPorCobro(cobrado: number, _total?: number): Etapa {
  return cobrado > 0 ? "confirmado" : "seguimiento";
}

/**
 * A qué etapa sube el lead una liga de pago (19 nov 2026, decisión de Manolo):
 *  - pagada (cualquier monto) → Confirmado: «una vez que pagan se confirma el tour».
 *  - creada por una persona (Cobros, la ficha) → En seguimiento: alguien le
 *    mandó una liga y todavía no entra dinero.
 *  - creada sola (`automatica`: la del botón del correo de la cotización, sus
 *    recordatorios o las «una por persona» del bot) → Cotizado: es parte de
 *    mandar la cotización. Antes subía a En seguimiento y se saltaba Cotizado.
 */
export function etapaPorLiga(evento: "creada" | "pagada", automatica: boolean): Etapa {
  if (evento === "pagada") return "confirmado";
  return automatica ? "cotizado" : "seguimiento";
}

/** La etapa siguiente en el camino (null en Operado o Perdido). Después de Confirmado (o la vieja «anticipo») sigue Operado. */
export function etapaSiguiente(actual: string): Etapa | null {
  const a = normalizarEtapa(actual);
  const i = ETAPAS_PIPELINE.indexOf(a as Etapa);
  return i >= 0 && i < ETAPAS_PIPELINE.length - 1 ? ETAPAS_PIPELINE[i + 1] : a === "confirmado" ? "operado" : null;
}

/**
 * ¿Ya pasó el viaje? El último día de tour (ver `fechasDelViaje`) es anterior
 * a hoy en México. Con eso un lead Confirmado pasa solo a Operado al día
 * siguiente de su último tour: si fue el sábado, el domingo desde las 00:00
 * (lo revisa el reloj del servidor cada 5 minutos, 19 nov 2026).
 */
export function viajeYaPaso(fechas: (string | null | undefined)[], hoy: string): { paso: boolean; ultima: string | null } {
  const validas = fechas.filter((f): f is string => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
  const ultima = validas[validas.length - 1] ?? null;
  return { paso: !!ultima && ultima < hoy, ultima };
}

/**
 * Las que pasan solas a Operado cuando el viaje ya pasó: Confirmado (ya pagó
 * algo) y su clave vieja «anticipo», tal como van al filtro `in` de Prisma
 * (19 nov 2026). Las anteriores no: con una reserva sin pago registrado hay que
 * revisarla a mano (la tarjeta lo avisa en rojo).
 */
export const ETAPAS_QUE_SE_OPERAN: string[] = clavesEnBD("confirmado");

// ── El lead se mueve con los hechos (lote 2 de la auditoría, 5 nov 2026) ────

/** Entre estas etapas el lead sube o baja según el dinero de sus reservas (la vieja «anticipo» cuenta como Confirmado). */
export const ETAPAS_DE_DINERO: Etapa[] = ["seguimiento", "confirmado"];

/** Lo que importa de una reserva VIVA (no cancelada) del lead. */
export interface ReservaDelLead { cobrado: number; total: number; ultimoDia: string | null }

/**
 * La etapa que dicen las reservas vivas del lead, sin importar cuál reserva
 * disparó el cambio (5 nov 2026). Antes cada camino hacía su cuenta y un pago
 * web, una cancelación o un cobro anulado dejaban el lead donde estaba.
 *  - Sin reservas vivas, el dinero no dice nada: se queda (su etapa pudo venir de una liga).
 *  - En Seguimiento o Confirmado manda lo cobrado: sube o baja (con algo
 *    cobrado, Confirmado; sin nada, En seguimiento). La clave vieja «anticipo»
 *    cuenta como Confirmado (19 nov 2026).
 *  - Antes (Nuevo, Calificado, Cotizado) solo sube.
 *  - Perdido vuelve solo con un hecho nuevo (`revivir`: reserva nueva, cobro, liga pagada).
 *  - Operado vuelve con un hecho nuevo y un viaje que todavía no pasa.
 */
export function etapaPorHechos(h: { etapa: Etapa; reservas: ReservaDelLead[]; hoy: string; revivir: boolean }): Etapa {
  if (!h.reservas.length) return h.etapa;
  const etapa = normalizarEtapa(h.etapa);
  const cobrado = h.reservas.reduce((t, r) => t + r.cobrado, 0);
  const total = h.reservas.reduce((t, r) => t + r.total, 0);
  const porCobro = etapaPorCobro(cobrado, total);
  if (etapa === "perdido") return h.revivir ? porCobro : h.etapa;
  if (etapa === "operado") return h.revivir && h.reservas.some(r => !!r.ultimoDia && r.ultimoDia >= h.hoy) ? porCobro : h.etapa;
  if (ETAPAS_DE_DINERO.includes(etapa)) return porCobro;
  return subirA(h.etapa, porCobro);
}

/**
 * Lo que vale el lead: la suma de sus reservas vivas; sin reservas, el total de
 * su cotización vigente; sin ninguna, lo que ya tenía (p. ej. un estimado a mano).
 */
export function montoPorHechos(h: { reservas: ReservaDelLead[]; cotizacionVigente: number | null; actual: number | null }): number | null {
  if (h.reservas.length) {
    const total = h.reservas.reduce((t, r) => t + r.total, 0);
    return total > 0 ? total : h.actual;
  }
  return h.cotizacionVigente && h.cotizacionVigente > 0 ? h.cotizacionVigente : h.actual;
}

/**
 * El canal del lead tras enlazarle una reserva (5 nov 2026). El canal que una
 * persona eligió al capturarla manda, salvo dos casos que borraban lo que ya se
 * sabía: «web» en una reserva dice cómo PAGÓ (en línea), no por dónde llegó; y
 * «WhatsApp» no le quita el detalle a «WhatsApp desde un botón del sitio».
 */
export function canalTrasReserva(canalLead: string, origenReserva: string | null | undefined): string {
  const o = String(origenReserva ?? "").trim();
  if (!o || o === "por_confirmar" || o === canalLead) return canalLead;
  if (canalLead === "por_confirmar") return o;
  if (o === "web") return canalLead;
  if (canalLead === "whatsapp_sitio" && o === "whatsapp") return canalLead;
  return o;
}

/** Cuántos días después de cerrarse (Operado o Perdido) un mensaje ya no se toma como consulta nueva. */
export const DIAS_CIERRE_RECIENTE = 14;

/** ¿El lead se cerró hace menos de `dias`? */
export function cerradoHaceMenosDe(cerradoEn: Date | string | null | undefined, ahora: Date, dias: number = DIAS_CIERRE_RECIENTE): boolean {
  if (!cerradoEn) return false;
  const t = new Date(cerradoEn).getTime();
  return Number.isFinite(t) && ahora.getTime() - t < dias * 86_400_000;
}

/**
 * Las fechas que dicen si el viaje del lead ya pasó. Manolo, 19 nov 2026: «que
 * pase a operado después de que pase su último tour».
 *  - Con reservas vivas, SOLO los días de esas reservas: una cotización o un
 *    borrador que se quedó (otra opción, otra fecha) ya no detiene Operado
 *    (del 5 al 19 nov sí lo detenía).
 *  - Sin reservas, las de sus cotizaciones vivas con fecha (p. ej. pagó la liga
 *    y la reserva no se pudo crear); sin ninguna, la fecha del lead.
 * Solo cuentan las fechas válidas (revisión del 5 nov 2026: una sin fecha
 * dejaba al lead sin ninguna y ya nunca pasaba a Operado).
 */
export function fechasDelViaje(reservas: (string | null | undefined)[], cotizacionesVivas: (string | null | undefined)[], fechaLead: string | null): (string | null | undefined)[] {
  const conFecha = (fs: (string | null | undefined)[]) => fs.filter(f => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f));
  const deReservas = conFecha(reservas);
  if (deReservas.length) return deReservas;
  const deCotizaciones = conFecha(cotizacionesVivas);
  return deCotizaciones.length ? deCotizaciones : [fechaLead];
}

/** Lo que trae una captura de «Nuevo lead». */
export interface DatosCaptura {
  tours: string[]; fechaViaje: string | null; pax: number | null; perfil: string | null;
  quiereHospedaje: boolean | null; monto: number | null; canal: string | null;
}

/**
 * «Nuevo lead» de alguien que ya tiene uno abierto (5 nov 2026): antes se
 * tiraba lo capturado. Ahora se completa lo que le FALTA al lead (lo que ya
 * tenía no se pisa) y la regla Nuevo → Calificado se vuelve a aplicar.
 * Devuelve qué cambia y, en palabras, qué se agregó.
 */
export function completarLead(actual: DatosCaptura & { etapa: Etapa }, llega: DatosCaptura): { data: Partial<DatosCaptura> & { etapa?: Etapa }; agregado: string[] } {
  const data: Partial<DatosCaptura> & { etapa?: Etapa } = {};
  const agregado: string[] = [];
  if (!actual.tours.length && llega.tours.length) { data.tours = llega.tours; agregado.push("tours"); }
  if (!actual.fechaViaje && llega.fechaViaje) { data.fechaViaje = llega.fechaViaje; agregado.push("fecha del viaje"); }
  if (!actual.pax && llega.pax) { data.pax = llega.pax; agregado.push("personas"); }
  if (!actual.perfil && llega.perfil) { data.perfil = llega.perfil; agregado.push("perfil"); }
  // La casilla sin marcar no dice «no quiere»: solo un sí completa.
  if (actual.quiereHospedaje == null && llega.quiereHospedaje === true) { data.quiereHospedaje = true; agregado.push("hospedaje"); }
  if (!actual.monto && llega.monto) { data.monto = llega.monto; agregado.push("monto estimado"); }
  if (actual.canal === "por_confirmar" && llega.canal && llega.canal !== "por_confirmar") { data.canal = llega.canal; agregado.push("canal"); }
  const etapa = etapaPorReglas(actual.etapa, { tours: data.tours ?? actual.tours, fechaViaje: data.fechaViaje ?? actual.fechaViaje, pax: data.pax ?? actual.pax });
  if (etapa !== actual.etapa) data.etapa = etapa;
  return { data, agregado };
}

/** «a», «a y b», «a, b y c». */
export const enLista = (xs: string[]) => xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;

/** Lo que la pantalla dice cuando «Nuevo lead» cae en un lead que ya estaba abierto (5 nov 2026). */
export function avisoLeadExistente(nombre: string, etapa: string, agregado: string[]): string {
  const base = `${nombre} ya tenía un lead abierto (${etiquetaEtapa(etapa)}): no se creó otro`;
  return agregado.length ? `${base}; se le agregó ${enLista(agregado)}.` : `${base} y no había nada nuevo que agregarle.`;
}

/**
 * Qué puede poner una cotización en su lead (5 nov 2026): lo vivo manda.
 *  - Con reservas vivas, el monto, la fecha, los tours y las personas salen de ellas: la cotización no toca nada.
 *  - Con OTRA cotización viva, el monto es el de la vigente (la más reciente).
 *    Al EDITAR la vigente, sus datos pasan al lead (regla de Manolo del 3 nov);
 *    al editar una opción más vieja, solo se llena lo vacío (revisión del 5 nov
 *    2026: antes ni la vigente los pasaba si quedaba un borrador viejo, que no vence).
 *  - Si es la única, como antes: su total y, al editarla, sus datos.
 */
export function loQueMandaLaCotizacion(h: { reservasVivas: number; otrasCotizacionesVivas: number; sincronizar: boolean; esLaVigente?: boolean }): { monto: "ninguno" | "esta" | "vigente"; pisar: boolean; llenarVacios: boolean } {
  if (h.reservasVivas > 0) return { monto: "ninguno", pisar: false, llenarVacios: false };
  if (h.otrasCotizacionesVivas > 0) return { monto: "vigente", pisar: h.sincronizar && h.esLaVigente === true, llenarVacios: true };
  return { monto: "esta", pisar: h.sincronizar, llenarVacios: true };
}

/** «Vacío» para juntarlo con otro del mismo contacto: sin cotizaciones ni reservas, y todavía al principio. */
export function leadVacio(l: { etapa: string; cotizaciones: number; reservas: number }): boolean {
  return l.cotizaciones === 0 && l.reservas === 0 && (l.etapa === "nuevo" || l.etapa === "calificado");
}

export type ValidacionCambio = { ok: true } | { ok: false; error: string };

/** Mover de etapa a mano: cualquiera puede, pero Perdido exige motivo. «Anticipo pagado» ya no existe (19 nov 2026): se rechaza. */
export function validarCambioEtapa(hacia: unknown, motivo: string | null): ValidacionCambio {
  if (!esEtapa(hacia)) return { ok: false, error: "Esa etapa no existe." };
  if (hacia === "perdido" && !motivo) return { ok: false, error: "Para marcarlo perdido hay que decir el motivo." };
  return { ok: true };
}

export type EstadoFecha = "vencido" | "hoy" | "proximo" | "sin-fecha";

/** Un próximo paso o una tarea contra hoy (YYYY-MM-DD). */
export function estadoFecha(fecha: string | null | undefined, hoy: string): EstadoFecha {
  if (!fecha) return "sin-fecha";
  if (fecha < hoy) return "vencido";
  if (fecha === hoy) return "hoy";
  return "proximo";
}

/**
 * ¿El lead acaba de pagar? Pasó de una etapa todavía sin dinero
 * (`ETAPAS_POR_CERRAR`: Nuevo a En seguimiento) a Confirmado (revisión del 20
 * nov 2026). También desde Perdido: uno que se daba por perdido y pagó su liga
 * trae los mismos pendientes de venta. La clave vieja «anticipo» ya era
 * Confirmado, y Operado → Confirmado es otro viaje: de ahí no cuenta.
 */
export function pasaAConfirmado(anterior: string, nueva: string): boolean {
  const antes = normalizarEtapa(anterior);
  return ((ETAPAS_POR_CERRAR as string[]).includes(antes) || antes === "perdido") && normalizarEtapa(nueva) === "confirmado";
}

/** Lo que hace falta saber de un seguimiento del lead para cerrarlo cuando paga. */
export interface SeguimientoDelLead { estado: string; regla: string | null; vence: string }

/**
 * Los seguimientos que se cierran solos cuando el lead paga (revisión del 20
 * nov 2026). Un cliente pagó y quedó Confirmado, pero su «Escribirle: ¿qué
 * decidieron de la cotización?» del lun 16 seguía pendiente: salía en rojo
 * bajo «✓ Pagado» en su tarjeta, arriba de su ficha y primero en «Seguimientos
 * · lo más urgente». Al pasar a Confirmado (`pasaAConfirmado`) se cierran los
 * pendientes que:
 *  - no son de una regla (`regla` vacía: los que puso una persona). Los de las
 *    reglas (saldo, liga, salida, la confirmación de la liga…) tienen su propio
 *    cierre (`yaNoAplica`) y no se tocan;
 *  - y ya estaban VENCIDOS (de antes de hoy, en México). Lo de hoy en adelante
 *    puede ser un paso de la operación («mandarle la ubicación el viernes») y se queda.
 */
export function seguimientosQueCierraElPago<T extends SeguimientoDelLead>(anterior: string, nueva: string, tareas: T[], hoy: string): T[] {
  if (!pasaAConfirmado(anterior, nueva)) return [];
  return tareas.filter(t => t.estado === "pendiente" && !t.regla && /^\d{4}-\d{2}-\d{2}$/.test(t.vence) && estadoFecha(t.vence, hoy) === "vencido");
}

export interface TareaLigera { id: string; responsable: string; vence: string; estado: string; hora?: string | null }

/** Seguimientos: vencidas, de hoy y próximas, por responsable (las hechas fuera). */
export function agruparTareas<T extends TareaLigera>(tareas: T[], hoy: string) {
  const pendientes = tareas.filter(t => t.estado !== "hecha").sort(ordenTareas);
  const porResponsable = new Map<string, { vencidas: T[]; hoy: T[]; proximas: T[] }>();
  for (const t of pendientes) {
    const g = porResponsable.get(t.responsable) ?? { vencidas: [], hoy: [], proximas: [] };
    const e = estadoFecha(t.vence, hoy);
    (e === "vencido" ? g.vencidas : e === "hoy" ? g.hoy : g.proximas).push(t);
    porResponsable.set(t.responsable, g);
  }
  return Array.from(porResponsable.entries())
    .map(([responsable, g]) => ({ responsable, ...g }))
    .sort((a, b) => b.vencidas.length - a.vencidas.length || a.responsable.localeCompare(b.responsable));
}

export type Plazo = "vencidos" | "hoy" | "manana" | "semana" | "despues";
export const PLAZOS: { clave: Plazo; titulo: string }[] = [
  { clave: "vencidos", titulo: "Vencidos" }, { clave: "hoy", titulo: "Hoy" }, { clave: "manana", titulo: "Mañana" },
  { clave: "semana", titulo: "Esta semana" }, { clave: "despues", titulo: "Más adelante" },
];

/**
 * Los seguimientos pendientes por PRIORIDAD de plazo (Manolo, 4 nov 2026): lo
 * vencido arriba (lo más viejo primero), luego hoy (por hora), mañana, los
 * próximos 7 días y lo demás. Cada sección ordenada por día y hora.
 */
export function agruparPorPlazo<T extends TareaLigera>(tareas: T[], hoy: string): { clave: Plazo; titulo: string; tareas: T[] }[] {
  const manana = sumarDias(hoy, 1), semana = sumarDias(hoy, 7);
  const plazoDe = (v: string): Plazo => v < hoy ? "vencidos" : v === hoy ? "hoy" : v === manana ? "manana" : v <= semana ? "semana" : "despues";
  const pendientes = tareas.filter(t => t.estado !== "hecha").sort(ordenTareas);
  return PLAZOS.map(p => ({ ...p, tareas: pendientes.filter(t => plazoDe(t.vence) === p.clave) })).filter(g => g.tareas.length > 0);
}

function sumarDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Por fecha y, el mismo día, por hora (las de sin hora al final del día). */
export const ordenTareas = (a: TareaLigera, b: TareaLigera) =>
  `${a.vence} ${a.hora ?? "99"}`.localeCompare(`${b.vence} ${b.hora ?? "99"}`);

/** "09:30" válida (24 h) o null. */
export function horaValida(v: unknown): string | null {
  const m = String(v ?? "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** Fecha y hora de México de un instante: { hoy: "YYYY-MM-DD", hhmm: "HH:MM" }. */
export function ahoraMX(d: Date = new Date()): { hoy: string; hhmm: string } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const v = (t: string) => p.find(x => x.type === t)?.value ?? "00";
  return { hoy: `${v("year")}-${v("month")}-${v("day")}`, hhmm: `${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}` };
}

/** Horario en que se mandan recordatorios: de 8:00 a 21:00 (hora de México). */
export const HORARIO_AVISOS = { desde: "08:00", hasta: "21:00" } as const;

/**
 * ¿Ya toca avisarle al responsable? Pendiente y sin aviso, y: venció un día
 * anterior, o es de hoy sin hora, o es de hoy y ya llegó su hora (con 5 min
 * de margen). Nunca fuera del horario de avisos.
 */
export function tocaAvisar(t: { vence: string; hora?: string | null; estado: string; avisadaEn?: Date | string | null }, hoy: string, hhmm: string): boolean {
  if (t.estado !== "pendiente" || t.avisadaEn) return false;
  if (hhmm < HORARIO_AVISOS.desde || hhmm >= HORARIO_AVISOS.hasta) return false;
  if (t.vence < hoy) return true;
  if (t.vence > hoy) return false;
  if (!t.hora) return true;
  return t.hora <= sumarMinutos(hhmm, 5);
}

function sumarMinutos(hhmm: string, n: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, h * 60 + m + n);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Los motivos de pérdida de un conjunto, de más a menos. */
export function contarMotivos(guardados: (string | null)[]): { clave: MotivoPerdida; etiqueta: string; n: number }[] {
  const n = new Map<MotivoPerdida, number>();
  for (const g of guardados) { const c = claveMotivo(g); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
  return MOTIVOS_PERDIDA.map(m => ({ clave: m.clave, etiqueta: m.etiqueta.replace(" (explícalo)", ""), n: n.get(m.clave) ?? 0 }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}
