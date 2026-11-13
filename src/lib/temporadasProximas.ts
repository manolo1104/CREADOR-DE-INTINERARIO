import { estadoAguaDe, hoyEnMexico } from "./temporada";

/**
 * Las temporadas que vienen: las fechas en que más gente viaja a la Huasteca
 * (puentes, vacaciones de diciembre, Semana Santa, verano, Xantolo).
 *
 * Lo pidió Manolo el 12 nov 2026: «una pequeña sección donde se desglosen las
 * temporadas que vienen». Las muestra el inicio (`ProximasTemporadas`).
 *
 * 🔴 Cómo se mantiene
 *  · Las que ya pasaron se esconden SOLAS (el inicio es `force-dynamic`, así
 *    que se calcula en cada visita con la fecha de México, no del servidor).
 *  · Cuando quedan pocas, se agregan las del año siguiente aquí abajo. Si se
 *    acaban todas, la sección desaparece sin romper nada.
 *  · Fechas escolares: calendario SEP 2026-2027 publicado como PROYECTO en
 *    julio de 2026 (aún no en el DOF): invierno del 21 dic al 5 ene, Semana
 *    Santa del 22 mar al 2 abr, fin de ciclo el 9 jul 2027. Si la SEP las
 *    mueve, es cambiar la línea de esa temporada.
 *  · Puentes de la Ley Federal del Trabajo: tercer lunes de noviembre (16 nov
 *    2026), primer lunes de febrero (1 feb 2027), tercer lunes de marzo (15 mar
 *    2027). El 1 de mayo de 2027 cae en sábado: no hay puente y no se pone.
 *  · Pascua 2027 = 28 de marzo → Jueves y Viernes Santo, 25 y 26 de marzo.
 *  · El texto del agua NO se escribe aquí: sale de `estadoAguaDe` (temporada.ts),
 *    la misma regla de la franja del río, para que nunca se contradigan.
 */

export type Afluencia = "muy-alta" | "alta";

/** El diseño de su tarjeta en el inicio (colores e ilustración de esa fecha). */
export type TemaTemporada = "revolucion" | "navidad" | "constitucion" | "juarez" | "semana-santa" | "verano" | "xantolo";

export interface TemporadaFechada {
  id: string;
  nombre: { es: string; en: string };
  /** Primer día, AAAA-MM-DD. */
  desde: string;
  /** Último día, AAAA-MM-DD (incluido). */
  hasta: string;
  /** Si las fechas exactas no son firmes, lo que se dice en su lugar. */
  fechasTexto?: { es: string; en: string };
  afluencia: Afluencia;
  tema: TemaTemporada;
  nota: { es: string; en: string };
}

export const TEMPORADAS: TemporadaFechada[] = [
  {
    id: "puente-revolucion-2026",
    nombre: { es: "Puente de la Revolución", en: "Revolution Day long weekend" },
    desde: "2026-11-14", hasta: "2026-11-16",
    afluencia: "alta",
    tema: "revolucion",
    nota: {
      es: "Fin de semana largo: los recorridos de sábado y domingo se llenan primero.",
      en: "Long weekend in Mexico: Saturday and Sunday tours fill up first.",
    },
  },
  {
    id: "vacaciones-diciembre-2026",
    nombre: { es: "Vacaciones de diciembre", en: "December holidays" },
    desde: "2026-12-19", hasta: "2027-01-06",
    afluencia: "muy-alta",
    tema: "navidad",
    nota: {
      es: "Vacaciones escolares del 21 de diciembre al 5 de enero. Navidad y Año Nuevo se llenan primero: aparta con tiempo.",
      en: "Mexican school break, Dec 21 to Jan 5. Christmas and New Year's fill up first: book early.",
    },
  },
  {
    id: "puente-constitucion-2027",
    nombre: { es: "Puente de la Constitución", en: "Constitution Day long weekend" },
    desde: "2027-01-30", hasta: "2027-02-01",
    afluencia: "alta",
    tema: "constitucion",
    nota: {
      es: "Fin de semana largo con el lunes 1 de febrero de descanso.",
      en: "Long weekend in Mexico, with Monday, February 1 off.",
    },
  },
  {
    id: "puente-benito-juarez-2027",
    nombre: { es: "Puente de Benito Juárez", en: "Benito Juárez long weekend" },
    desde: "2027-03-13", hasta: "2027-03-15",
    afluencia: "alta",
    tema: "juarez",
    nota: {
      es: "Fin de semana largo con el lunes 15 de marzo de descanso, una semana antes de Semana Santa.",
      en: "Long weekend in Mexico, with Monday, March 15 off, a week before Holy Week.",
    },
  },
  {
    id: "semana-santa-2027",
    nombre: { es: "Semana Santa y Pascua", en: "Holy Week and Easter" },
    desde: "2027-03-21", hasta: "2027-04-04",
    afluencia: "muy-alta",
    tema: "semana-santa",
    nota: {
      es: "Las semanas más llenas del año. Vacaciones escolares del 22 de marzo al 2 de abril; Jueves y Viernes Santo son el 25 y el 26.",
      en: "The busiest weeks of the year. Mexican school break Mar 22 to Apr 2; Holy Thursday and Good Friday are Mar 25 and 26.",
    },
  },
  {
    id: "verano-2027",
    nombre: { es: "Vacaciones de verano", en: "Summer holidays" },
    desde: "2027-07-10", hasta: "2027-08-29",
    fechasTexto: { es: "Julio y agosto", en: "July and August" },
    afluencia: "alta",
    tema: "verano",
    nota: {
      es: "Las escuelas salen el 9 de julio. Es temporada de lluvias: si el río crece, reprogramamos sin costo.",
      en: "Mexican schools are out from July 9. It's the rainy season: if the river rises, we reschedule at no cost.",
    },
  },
  {
    id: "xantolo-2027",
    nombre: { es: "Xantolo", en: "Xantolo (Day of the Dead)" },
    desde: "2027-10-31", hasta: "2027-11-02",
    afluencia: "alta",
    tema: "xantolo",
    nota: {
      es: "El Día de Muertos huasteco, con desfile y altares en Xilitla.",
      en: "The Huasteca's Day of the Dead, with a parade and altars in Xilitla.",
    },
  },
];

export interface TemporadaVista extends TemporadaFechada {
  /** Hoy cae dentro de sus fechas. */
  enCurso: boolean;
  /** Cómo viene el agua al arrancar la temporada (regla de temporada.ts). */
  agua: "caudal" | "turquesa" | "clara";
}

/** AAAA-MM-DD → número comparable (días desde 1970, en UTC). */
function dia(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/**
 * Las siguientes `n` temporadas que todavía no terminan, la que está en curso
 * primero. `ahora` se inyecta solo para probarlo sin viajar en el tiempo.
 */
export function proximasTemporadas(n = 5, ahora?: Date): TemporadaVista[] {
  const { y, m, d } = hoyEnMexico(ahora);
  const hoy = Date.UTC(y, m - 1, d) / 86_400_000;
  return TEMPORADAS
    .filter((t) => dia(t.hasta) >= hoy)
    .sort((a, b) => dia(a.desde) - dia(b.desde))
    .slice(0, n)
    .map((t) => {
      const [, mes, d0] = t.desde.split("-").map(Number);
      return { ...t, enCurso: dia(t.desde) <= hoy, agua: estadoAguaDe(mes, d0) };
    });
}

const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * «14 – 16 nov» · «19 dic – 6 ene» · «Nov 14 – 16» · «Dec 19 – Jan 6».
 * Sin año: la sección solo enseña lo que viene en los próximos meses.
 */
export function fechasDeTemporada(t: TemporadaFechada, locale: "es" | "en"): string {
  if (t.fechasTexto) return t.fechasTexto[locale];
  const [, m1, d1] = t.desde.split("-").map(Number);
  const [, m2, d2] = t.hasta.split("-").map(Number);
  if (locale === "en") {
    return m1 === m2
      ? `${MESES_EN[m1 - 1]} ${d1} – ${d2}`
      : `${MESES_EN[m1 - 1]} ${d1} – ${MESES_EN[m2 - 1]} ${d2}`;
  }
  return m1 === m2
    ? `${d1} – ${d2} ${MESES_ES[m1 - 1]}`
    : `${d1} ${MESES_ES[m1 - 1]} – ${d2} ${MESES_ES[m2 - 1]}`;
}
