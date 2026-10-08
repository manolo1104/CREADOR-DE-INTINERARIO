/**
 * Qué se puede decir de cada mes en la Huasteca, con verdad.
 *
 * 🔴 Es la ÚNICA fuente de la temporada (auditoría, 7 oct 2026). Ese día el
 * sitio decía a la vez «el río hoy: caudal alto por lluvias», «estamos en la
 * mejor temporada», «Nov–Mayo ideal… Jun–Oct lush verde» y «seca nov–jun»:
 * cada página llevaba su propia regla. Ahora la franja del río, la banda del
 * inicio, las FAQ, llms.txt, la guía práctica, el boletín y los correos dicen
 * esto mismo, y la fecha la sacan de `MEJOR_TEMPORADA`.
 *
 * La regla, con la fecha que fijó Manolo el 7 oct 2026:
 *
 *  · Se puede venir todo el año. Desde el arranque de la mejor temporada (hoy,
 *    el 30 de octubre) hasta mayo el agua baja clara; el turquesa más intenso
 *    es de marzo a mayo, y es cuando más gente hay.
 *  · De julio a octubre las cascadas van a todo caudal y el agua puede bajar
 *    con sedimento; si el río crece, reprogramamos el rafting sin costo. Es lo
 *    que promete la política de cancelación: con el río crecido no sale ningún
 *    grupo y el cliente elige reagendar o el reembolso.
 *  · Junio es de transición: llegan las primeras lluvias.
 *  · Cada destino trae su `temporada_ideal` en `destinos.ts`, que es la que
 *    vale cuando se habla de ESE lugar.
 *
 * ⚠️ NO se habla del Sótano de las Golondrinas como algo que vendamos:
 * Golondrinas y Huahuas son sitios distintos y nosotros no operamos el primero.
 */

export interface Temporada {
  /** Cómo se llama esta ventana, para el asunto y el titular. */
  nombre:   string;
  /** El gancho del mes: qué tiene ESTE mes que no tienen los otros. */
  gancho:   string;
  /** El matiz honesto. Lo que un folleto se callaría. */
  matiz:    string;
  /** Slugs de recorridos que lucen especialmente en esta ventana. */
  destaca:  string[];
}

/**
 * La ventana de cada mes (1 = enero).
 *
 * Se agrupa en cuatro ventanas reales, no doce mensajes distintos: fingir que
 * enero y febrero son experiencias diferentes es justo el relleno que hace que
 * la gente deje de abrir el boletín.
 */
const VENTANAS: Record<number, Temporada> = {} as Record<number, Temporada>;

const SECA_CLARA: Temporada = {
  nombre:  "Agua en su punto más turquesa",
  gancho:  "Estamos en el mejor momento del año para el color del agua: entre marzo y mayo es cuando más turquesa se ve, y las fotos salen como en las que viste antes de decidir venir.",
  matiz:   "Es también cuando más gente hay. Puente de Dios tiene cupo limitado por día y en fin de semana largo conviene llegar antes de las 10.",
  destaca: ["expedicion-tamul", "cascadas-del-meco", "ruta-acuatica-puente-de-dios"],
};

// Enero, febrero y junio. Junio va aquí y no en lluvias (decisión del 7 oct
// 2026): las primeras lluvias apenas llegan y la franja del río sigue en
// turquesa. Por eso el texto no promete nada que no valga para los tres meses,
// ni llama «temporada seca» a junio: el clima de /info-practica le pone
// lluvia alta.
const SECA: Temporada = {
  nombre:  "Temporada de agua clara",
  gancho:  "El agua baja clara y hay menos gente que de marzo a mayo, que es cuando el turquesa llega a su punto más intenso.",
  matiz:   "El caudal es menor que en lluvias, así que las cascadas se ven menos bravas; a cambio, el agua se ve como en las fotos. Junio es de transición: llegan las primeras lluvias.",
  destaca: ["expedicion-tamul", "ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos"],
};

const LLUVIAS: Temporada = {
  nombre:  "Temporada de lluvias, cascadas a todo caudal",
  gancho:  "Es la temporada de más caudal: las cascadas bajan con toda su fuerza y la selva está en su punto más verde. El bosque de niebla de La Trinidad se ve como su nombre.",
  matiz:   "El agua puede bajar con sedimento en vez de turquesa, y si el río Tampaón crece reprogramamos el rafting sin costo. Te lo decimos antes de que reserves, no después.",
  destaca: ["ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos", "travesia-del-cafe"],
};

// Del 30 de octubre a diciembre: lo que el inicio anuncia como «la mejor
// temporada para venir». 🔴 Su gancho NO promete el agua más turquesa (eso es
// marzo-mayo): promete lo que de verdad cambia, que aflojan las lluvias, el
// agua se aclara y todavía no llega la gente.
const ARRANQUE_SECA: Temporada = {
  nombre:  "La mejor temporada para venir",
  gancho:  "Aflojan las lluvias, el agua empieza a aclararse y todavía faltan meses para las multitudes de primavera. Es la mejor temporada del año para venir: la mejor mezcla de agua clara y poca gente.",
  matiz:   "El turquesa más intenso llega de marzo a mayo; ahora el agua se está aclarando. Y en diciembre las fechas de fin de año se llenan primero: si vienes en esas semanas, conviene apartar con tiempo.",
  destaca: ["expedicion-tamul", "cascadas-del-meco", "buceo-media-luna"],
};

for (const m of [1, 2])            VENTANAS[m] = SECA;
for (const m of [3, 4, 5])         VENTANAS[m] = SECA_CLARA;
for (const m of [6])               VENTANAS[m] = SECA;
// Octubre es de lluvias SOLO hasta el 29: del 30 en adelante `temporadaDe`
// devuelve ARRANQUE_SECA (ver MEJOR_TEMPORADA).
for (const m of [7, 8, 9, 10])     VENTANAS[m] = LLUVIAS;
for (const m of [11, 12])          VENTANAS[m] = ARRANQUE_SECA;

/**
 * La ventana que el dueño llama «la mejor temporada para venir»: del 30 de
 * octubre al 31 de diciembre. La fecha de arranque la fijó Manolo el 7 oct
 * 2026 (antes era el 5 de octubre, desde el 28 sep). Con el 30 todo encaja:
 * la promo de temporada baja (`PROMO_VENCE` en tours.ts) cubre recorridos
 * hasta el 29, y la temporada de lluvias de este archivo también termina el
 * 29. Con el 5, el sitio anunciaba «estamos en la mejor temporada» mientras la
 * franja del río decía «caudal alto por lluvias».
 *
 * 🔴 NO es lo mismo que «el agua más turquesa», que sigue siendo marzo-mayo
 * (ver `SECA_CLARA`). El sitio afirma las dos cosas y no se contradicen
 * mientras se digan bien: en primavera el agua se ve mejor PERO hay más gente;
 * del 30 de octubre a diciembre el agua se aclara y todavía no llegan las
 * multitudes. Por eso el titular del inicio es «la mejor temporada para VENIR»
 * y nunca «el agua más turquesa»: si se mezclan, el inicio contradice a
 * /destinos, al boletín y a llms.txt.
 *
 * Es mes-día, así que se repite sola cada año y nadie tiene que acordarse.
 * Quien escribe la fecha (la banda del inicio, las FAQ, llms.txt, la guía
 * práctica, los correos) la saca de aquí con `fechaInicioTexto()`: moverla es
 * cambiar este número y nada más.
 */
export const MEJOR_TEMPORADA = { inicioMes: 10, inicioDia: 30, finMes: 12, finDia: 31 } as const;

/** Con cuánta anticipación se empieza a anunciar. Antes de eso no es noticia. */
const DIAS_DE_AVISO = 45;

/** El día de hoy en la Huasteca, no en el servidor (Railway corre en UTC). */
function hoyEnMexico(ahora?: Date): { y: number; m: number; d: number } {
  const iso = (ahora ?? new Date()).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export type EstadoTemporada = "cuenta-regresiva" | "dentro" | "fuera";

/**
 * En qué punto de la mejor temporada estamos y cuántos días faltan.
 * `ahora` se inyecta sólo para probarlo sin viajar en el tiempo.
 */
export function ventanaMejorTemporada(ahora?: Date): { estado: EstadoTemporada; dias: number } {
  const { y, m, d } = hoyEnMexico(ahora);
  const DIA = 86_400_000;
  const hoy    = Date.UTC(y, m - 1, d);
  const inicio = Date.UTC(y, MEJOR_TEMPORADA.inicioMes - 1, MEJOR_TEMPORADA.inicioDia);
  const fin    = Date.UTC(y, MEJOR_TEMPORADA.finMes - 1, MEJOR_TEMPORADA.finDia);
  if (hoy >= inicio && hoy <= fin) return { estado: "dentro", dias: 0 };
  const faltan = Math.round((inicio - hoy) / DIA);
  if (faltan > 0 && faltan <= DIAS_DE_AVISO) return { estado: "cuenta-regresiva", dias: faltan };
  return { estado: "fuera", dias: 0 };
}

/**
 * México no tiene horario de verano desde octubre de 2022: la Huasteca vive
 * todo el año en UTC-6, así que su medianoche son las 06:00 UTC. Si algún día
 * vuelve el horario de verano, es este número.
 */
const HORAS_DETRAS_DE_UTC = 6;

/**
 * El instante exacto (ms) en que arranca la mejor temporada de este año: la
 * medianoche del 30 de octubre en hora de México, no en la del servidor
 * (Railway corre en UTC) ni en la del visitante. Es a lo que cuenta el
 * temporizador del inicio. De noviembre a diciembre devuelve igual el de este
 * año, ya pasado, y el temporizador muestra «Ya arrancó».
 */
export function inicioMejorTemporada(ahora?: Date): number {
  const { y } = hoyEnMexico(ahora);
  return Date.UTC(y, MEJOR_TEMPORADA.inicioMes - 1, MEJOR_TEMPORADA.inicioDia, HORAS_DETRAS_DE_UTC);
}

/** «30 de octubre» / «October 30», sacado de `MEJOR_TEMPORADA` y no escrito a mano. */
export function fechaInicioTexto(locale: "es" | "en"): string {
  // El año da igual (es mes-día): 2026 sólo sirve para armar una fecha válida.
  return new Date(Date.UTC(2026, MEJOR_TEMPORADA.inicioMes - 1, MEJOR_TEMPORADA.inicioDia))
    .toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** La ventana que toca. `mes` es 1–12; por omisión, el mes actual en México. */
export function temporadaDe(mes?: number, dia?: number): Temporada {
  const hoy = hoyEnMexico();
  const m = mes ?? hoy.m;
  // Sin día explícito: si preguntan por el mes actual se usa el día de hoy; si
  // preguntan por otro mes en abstracto, se toma la mitad del mes.
  const d = dia ?? (mes === undefined ? hoy.d : 15);
  // 🔴 Octubre se parte en dos. Hasta el día 29 sigue siendo lluvias; del 30
  // en adelante arranca la mejor temporada (ver MEJOR_TEMPORADA). Sin esto, en
  // octubre el boletín mandaba «temporada de lluvias» el mismo día que el
  // inicio del sitio anunciaba la mejor temporada del año.
  if (m === MEJOR_TEMPORADA.inicioMes && d >= MEJOR_TEMPORADA.inicioDia) return ARRANQUE_SECA;
  return VENTANAS[m] ?? SECA;
}

/**
 * Lo que anuncia la franja del río cuando el panel la deja en «auto»: caudal
 * alto mientras dure la temporada de lluvias de este archivo (julio al 29 de
 * octubre) y agua turquesa el resto del año, junio incluido.
 *
 * 🔴 `rioEstado.ts` tenía su propia regla (junio a octubre, caudal) y se peleaba
 * con esta: en junio la franja decía «caudal alto» y el boletín «temporada
 * seca»; y del 5 al 31 de octubre, «caudal alto por lluvias» encima de
 * «estamos en la mejor temporada». Ahora sale de la misma `temporadaDe`.
 */
export function rioSegunTemporada(ahora?: Date): "turquesa" | "caudal" {
  const { m, d } = hoyEnMexico(ahora);
  return temporadaDe(m, d) === LLUVIAS ? "caudal" : "turquesa";
}

/**
 * La misma regla dicha en corto para el panel: «jul–29 oct caudal, 30 oct–jun
 * turquesa». Sale de la constante para que el letrero no se quede con la fecha
 * vieja el día que se mueva el arranque.
 */
export function reglaRioTexto(): string {
  const corta = (dia: number) =>
    new Date(Date.UTC(2026, MEJOR_TEMPORADA.inicioMes - 1, dia))
      .toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })
      .replace(".", "");
  return `jul–${corta(MEJOR_TEMPORADA.inicioDia - 1)} caudal, ${corta(MEJOR_TEMPORADA.inicioDia)}–jun turquesa`;
}

/** El nombre del mes en español, para titulares. */
export function nombreMes(mes?: number): string {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const m = mes ?? Number(hoy.slice(5, 7));
  const n = new Date(Date.UTC(2026, m - 1, 15)).toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" });
  return n.charAt(0).toUpperCase() + n.slice(1);
}
