/**
 * Qué se puede decir de cada mes en la Huasteca, con verdad.
 *
 * ⚠️ Nada de aquí es inventado. Todo sale de lo que el sitio ya afirma y que
 * está verificado:
 *
 *  · Temporada seca ≈ noviembre a junio, con el agua más turquesa entre marzo
 *    y mayo; en lluvias (julio–octubre) sube el caudal y el agua puede bajar
 *    marrón. Fuente: `llmsTxt.ts`, que es el texto público del sitio.
 *  · Rafting: el río puede no estar en condiciones en lluvias (jul–sep) y se
 *    reprograma. Fuente: `tourFaqs.ts`.
 *  · Cada destino trae su `temporada_ideal` en `destinos.ts`.
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

const SECA: Temporada = {
  nombre:  "Temporada seca, agua turquesa",
  gancho:  "Estamos en temporada seca, que es cuando el agua baja clara y turquesa. Tamul lleva ese color de noviembre a mayo.",
  matiz:   "El caudal es menor que en lluvias, así que las cascadas se ven menos bravas — a cambio, el agua se ve como en las fotos.",
  destaca: ["expedicion-tamul", "ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos"],
};

const LLUVIAS: Temporada = {
  nombre:  "Temporada de lluvias, cascadas a todo caudal",
  gancho:  "Es la temporada de más caudal: las cascadas bajan con toda su fuerza y la selva está en su punto más verde. El bosque de niebla de La Trinidad se ve como su nombre.",
  matiz:   "El agua puede bajar marrón en vez de turquesa, y si el río Tampaón crece reprogramamos el rafting sin costo. Te lo decimos antes de que reserves, no después.",
  destaca: ["ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos", "travesia-del-cafe"],
};

const ARRANQUE_SECA: Temporada = {
  nombre:  "Empieza la temporada seca",
  gancho:  "Se acaban las lluvias y el agua empieza a aclararse. De octubre a diciembre es cuando mejor se combinan el color del agua y la poca gente.",
  matiz:   "En diciembre las fechas de fin de año se llenan primero: si vienes en esas semanas, conviene apartar con tiempo.",
  destaca: ["expedicion-tamul", "cascadas-del-meco", "buceo-media-luna"],
};

for (const m of [1, 2])            VENTANAS[m] = SECA;
for (const m of [3, 4, 5])         VENTANAS[m] = SECA_CLARA;
for (const m of [6])               VENTANAS[m] = SECA;
for (const m of [7, 8, 9, 10])     VENTANAS[m] = LLUVIAS;
for (const m of [11, 12])          VENTANAS[m] = ARRANQUE_SECA;

/**
 * La ventana que el dueño llama «la mejor temporada para venir»: del 5 de
 * octubre al 31 de diciembre. La fecha de arranque la fijó él el 28 sep 2026.
 *
 * 🔴 NO es lo mismo que «el agua más turquesa», que sigue siendo marzo-mayo
 * (ver `SECA_CLARA`). El sitio afirma las dos cosas y no se contradicen
 * mientras se digan bien: en primavera el agua se ve mejor PERO hay más gente;
 * de octubre a diciembre el agua ya bajó clara y todavía no llegan las
 * multitudes. Por eso el titular del inicio es «la mejor temporada para VENIR»
 * y nunca «el agua más turquesa»: si se mezclan, el inicio contradice a
 * /destinos, al boletín y a llms.txt.
 *
 * Es mes-día, así que se repite sola cada año y nadie tiene que acordarse.
 */
export const MEJOR_TEMPORADA = { inicioMes: 10, inicioDia: 5, finMes: 12, finDia: 31 } as const;

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

/** La ventana que toca. `mes` es 1–12; por omisión, el mes actual en México. */
export function temporadaDe(mes?: number, dia?: number): Temporada {
  const hoy = hoyEnMexico();
  const m = mes ?? hoy.m;
  // Sin día explícito: si preguntan por el mes actual se usa el día de hoy; si
  // preguntan por otro mes en abstracto, se toma la mitad del mes.
  const d = dia ?? (mes === undefined ? hoy.d : 15);
  // 🔴 Octubre se parte en dos. Hasta el día 4 sigue siendo lluvias; del 5 en
  // adelante arranca la seca (ver MEJOR_TEMPORADA). Sin esto, en octubre el
  // boletín mandaba «temporada de lluvias» el mismo día que el inicio del sitio
  // anunciaba la mejor temporada del año.
  if (m === MEJOR_TEMPORADA.inicioMes && d >= MEJOR_TEMPORADA.inicioDia) return ARRANQUE_SECA;
  return VENTANAS[m] ?? SECA;
}

/** El nombre del mes en español, para titulares. */
export function nombreMes(mes?: number): string {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const m = mes ?? Number(hoy.slice(5, 7));
  const n = new Date(Date.UTC(2026, m - 1, 15)).toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" });
  return n.charAt(0).toUpperCase() + n.slice(1);
}
