import Link from "next/link";
import { DESTINOS_DB } from "@/lib/destinos";
import { localePath, type Locale } from "@/lib/i18n/config";
import { TIEMPOS_DE_VIAJE } from "@/lib/tiemposDeViaje";

/**
 * El mapa de la región, dibujado a mano.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * La Huasteca es geográficamente confusa para quien no la conoce: Xilitla,
 * Ciudad Valles, Tamasopo, Aquismón y Tamul se mencionan en todo el sitio y
 * nada decía qué queda cerca de qué, que es la pregunta número uno de quien
 * planea el viaje. Es además contenido que ninguna plataforma de reventa puede
 * producir con este detalle.
 *
 * 🔴 Por qué un SVG y no un mapa de verdad (decisión de Manolo, 7 oct)
 *
 * El repo YA tiene un mapa interactivo: `planner/MapaItinerario.tsx`, con
 * Leaflet y rutas por carretera de OSRM — montado solo en `/planear`, que está
 * apagado y en `noindex`. Usarlo aquí costaría casi nada de código, pero suma
 * ~50 KB de JavaScript y peticiones de mosaicos a una página cuyo rendimiento
 * acabamos de arreglar. Este SVG pesa lo que pesa su marcado, se ve de marca y
 * nadie lo puede copiar.
 *
 * 🔴 La geometría NO está inventada: las coordenadas se leen de `destinos.ts`
 * (las mismas `lat`/`lng` que usan las fichas y el mapa de OpenStreetMap de
 * cada destino) y se proyectan aquí. Si mañana se corrige una coordenada en el
 * catálogo, este mapa se mueve con ella. Es un **esquema, no un mapa a escala**:
 * no lleva carreteras ni relieve, y lo dice en su propio pie.
 */

/**
 * Los pueblos que se dibujan. No son destinos del catálogo (`destinos.ts`
 * guarda el lugar que se visita, no la cabecera municipal), así que sus
 * coordenadas van aquí. Fuente: INEGI, cabeceras municipales de San Luis
 * Potosí.
 *
 * 🔴 Solo dos. Aquismón está a 2 km del Sótano de las Huahuas y Tamasopo a 3 km
 * de Puente de Dios: dibujados los cuatro, cada par caía en el mismo punto y
 * sus nombres se montaban uno encima del otro. Se quedan los destinos, que es
 * lo que se vende, y los dos pueblos que sirven de referencia.
 */
const PUEBLOS = [
  { id: "xilitla", nombre: "Xilitla", lat: 21.3917, lng: -98.9958, base: true },
  { id: "valles",  nombre: "Ciudad Valles", lat: 21.9833, lng: -99.0167, base: false },
];

/**
 * Los destinos que se dibujan, por slug de `destinos.ts`.
 *
 * 🔴 Fuera de la lista a propósito:
 *  · **Las Pozas**: está a 400 m de Xilitla, o sea en el mismo punto que la
 *    base. Su nombre tapaba el de la base; se nombra en la etiqueta de Xilitla.
 *  · **Laguna de la Media Luna**: está en Rioverde, a −100.01 de longitud. Con
 *    ella dentro, el dibujo tenía que abarcar medio grado de más y los otros
 *    siete puntos se apretaban en una esquina.
 */
const EN_EL_MAPA = [
  "cascada-de-tamul",
  "puente-de-dios-tamasopo",
  "cascadas-de-micos",
  "sotano-de-las-huahuas",
  "cascada-el-meco",
  "cascadas-minas-viejas",
];

/**
 * Dónde va el nombre de cada punto. Esto es lo que lo vuelve un mapa «dibujado
 * a mano»: con las etiquetas colocadas por una regla automática, El Meco y
 * Minas Viejas —que están a 1 km— escribían sus nombres uno sobre el otro.
 *
 * `lado` es hacia dónde sale el texto; `dy` lo sube o lo baja en píxeles del
 * lienzo.
 */
const TAMBIEN = ["las-pozas-jardin-surrealista", "laguna-media-luna"];

const ETIQUETA: Record<string, { lado: "izq" | "der" | "centro"; dy: number }> = {
  // Xilitla es el punto más al oriente: su nombre, que además lleva coletilla,
  // se salía del lienzo por la derecha. Va centrado DEBAJO del punto.
  xilitla:                   { lado: "centro", dy: 34 },
  valles:                    { lado: "der", dy: 0 },
  // El Meco y Minas Viejas están a 1 km: uno arriba y otro abajo, o sus
  // nombres se escriben encima del otro.
  "cascada-el-meco":         { lado: "izq", dy: -16 },
  "cascadas-minas-viejas":   { lado: "der", dy: 16 },
  "cascadas-de-micos":       { lado: "izq", dy: 0 },
  "cascada-de-tamul":        { lado: "izq", dy: 0 },
  // El más al poniente: hacia la izquierda se salía del lienzo.
  "puente-de-dios-tamasopo": { lado: "der", dy: -22 },
  "sotano-de-las-huahuas":   { lado: "der", dy: 0 },
};

/**
 * Cuánto se tarda en carretera hasta Xilitla.
 *
 * 🔴 Esta lista era local y tenía los números buenos mientras el resto de la
 * página publicaba otros tres distintos. Ahora sale de `tiemposDeViaje.ts`, que
 * es la única fuente: así no puede volver a pasar que el mapa diga 3.5 h desde
 * Tampico y el párrafo de dos secciones más abajo diga 2.5 h.
 *
 * Monterrey no se pinta aquí a propósito: son cuatro ciudades y la lista se
 * sigue leyendo de un golpe con tres. Se queda la que falta en la FAQ y en
 * `/info-practica`, que sí tienen espacio para la tabla completa.
 */
const DESDE = TIEMPOS_DE_VIAJE.filter((t) => t.slug !== "monterrey");

/** El lienzo del esquema. */
const ANCHO = 1000;
const ALTO  = 640;
const MARGEN_X = 150;
const MARGEN_Y = 60;

type Punto = { id: string; nombre: string; slug?: string; lat: number; lng: number; base: boolean };

/**
 * Coloca los puntos en el lienzo.
 *
 * 🔴 Los ejes se escalan por SEPARADO, a propósito. Con la misma escala en los
 * dos —que es lo correcto en un mapa— la región real mide 0.4° de ancho por
 * 1.2° de alto, y los ocho puntos caían en una tira vertical de 195 px en medio
 * de un lienzo de 1000: geográficamente exacto e ilegible. El dibujo se estira
 * para que quepan los nombres, y conserva lo que de verdad se viene a
 * preguntar: qué queda al norte de qué y qué queda al poniente de qué. El pie
 * del mapa lo dice con todas sus letras.
 */
function proyectar(puntos: Punto[]) {
  const xs = puntos.map((p) => p.lng);
  const ys = puntos.map((p) => p.lat);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const anchoUtil = ANCHO - 2 * MARGEN_X;
  const altoUtil  = ALTO - 2 * MARGEN_Y;
  return puntos.map((p) => ({
    ...p,
    x: MARGEN_X + ((p.lng - x0) / (x1 - x0 || 1)) * anchoUtil,
    // El norte va arriba: la latitud se invierte.
    y: MARGEN_Y + ((y1 - p.lat) / (y1 - y0 || 1)) * altoUtil,
  }));
}

export function MapaRegion({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const t = (es: string, ingles: string) => (en ? ingles : es);

  /** Los que están en el dibujo, más los dos que no caben pero sí se visitan. */
  const deLaLista = (slug: string) => {
    const d = DESTINOS_DB.find((x) => x.slug === slug);
    return d ? [{ slug: d.slug, nombre: d.nombre }] : [];
  };
  const enLaLista = [...EN_EL_MAPA, ...TAMBIEN].flatMap(deLaLista);

  const destinos: Punto[] = EN_EL_MAPA.flatMap((slug) => {
    const d = DESTINOS_DB.find((x) => x.slug === slug);
    // Si alguien renombra un slug, ese punto desaparece en vez de romper la página.
    return d ? [{ id: d.slug, nombre: d.nombre, slug: d.slug, lat: d.lat, lng: d.lng, base: false }] : [];
  });

  const puntos = proyectar([
    ...PUEBLOS.map((p) => ({ ...p, slug: undefined })),
    ...destinos,
  ]);
  const base = puntos.find((p) => p.base);
  const sufijoBase = t(" · nuestra base, a 5 min de Las Pozas", " · our base, 5 min from Las Pozas");

  return (
    <section
      aria-label={t("Mapa de la Huasteca Potosina", "Map of the Huasteca Potosina")}
      className="border-b border-negro/10 bg-verde-profundo px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="reveal-fade mb-4 font-dm text-[10px] uppercase tracking-[4px] text-verde-vivo">
            {t("Qué queda cerca de qué", "What's near what")}
          </p>
          <h2
            className="reveal-up font-cormorant font-light text-crema"
            style={{ fontSize: "clamp(32px,4.5vw,52px)" }}
          >
            {en ? <>The region, <em className="shimmer-gold">from our door</em></> : <>La región, <em className="shimmer-gold">desde nuestra puerta</em></>}
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-dm text-sm leading-relaxed text-crema/60">
            {t(
              "Salimos de Xilitla. Tamul y el Sótano de las Huahuas quedan al norte, Tamasopo y Puente de Dios al poniente, y Las Pozas a cinco minutos caminando del hotel.",
              "We leave from Xilitla. Tamul and Las Huahuas sinkhole are to the north, Tamasopo and Puente de Dios to the west, and Las Pozas is a five-minute walk from the hotel.",
            )}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          {/* ── El esquema ── */}
          <figure className="m-0">
            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              role="img"
              aria-labelledby="mapa-titulo mapa-desc"
              className="h-auto w-full"
            >
              <title id="mapa-titulo">
                {t(
                  "Esquema de la Huasteca Potosina con Xilitla como base",
                  "Schematic map of the Huasteca Potosina with Xilitla as our base",
                )}
              </title>
              <desc id="mapa-desc">
                {t(
                  "Dibujo esquemático, no a escala. Sitúa Xilitla, Ciudad Valles, Aquismón y Tamasopo, y los destinos que visitamos. Las distancias en texto van en la lista de al lado.",
                  "Schematic drawing, not to scale. It places Xilitla, Ciudad Valles, Aquismón and Tamasopo, plus the places we visit. Written distances are in the list beside it.",
                )}
              </desc>

              {/* Las líneas desde la base: no son carreteras, son «de aquí sales». */}
              {base &&
                puntos
                  .filter((p) => !p.base)
                  .map((p) => (
                    <line
                      key={`l-${p.id}`}
                      x1={base.x} y1={base.y} x2={p.x} y2={p.y}
                      stroke="currentColor"
                      className="text-crema/15"
                      strokeWidth={1.5}
                      strokeDasharray="5 7"
                    />
                  ))}

              {/* La rosa de los vientos, para que «al norte» signifique algo. */}
              <g className="text-crema/30" transform={`translate(${ANCHO - 54} 54)`}>
                <line x1="0" y1="16" x2="0" y2="-14" stroke="currentColor" strokeWidth="1.5" />
                <polygon points="0,-20 4.5,-10 -4.5,-10" fill="currentColor" />
                <text x="0" y="31" textAnchor="middle" fontSize="13" fill="currentColor" className="font-dm">N</text>
              </g>

              {puntos.map((p) => {
                const col = ETIQUETA[p.id] ?? { lado: "der" as const, dy: 0 };
                const dx = col.lado === "izq" ? -15 : col.lado === "der" ? 15 : 0;
                const dyTexto = col.dy + 6;
                const anclaTexto = col.lado === "izq" ? "end" : col.lado === "der" ? "start" : "middle";
                const contenido = (
                  <>
                    {p.base ? (
                      <>
                        <circle cx={p.x} cy={p.y} r={16} className="fill-dorado/20" />
                        <circle cx={p.x} cy={p.y} r={7.5} className="fill-dorado" />
                      </>
                    ) : p.slug ? (
                      <circle cx={p.x} cy={p.y} r={6} className="fill-verde-vivo" />
                    ) : (
                      <rect x={p.x - 5} y={p.y - 5} width={10} height={10} className="fill-crema/70" />
                    )}
                    <text
                      x={p.x + dx}
                      y={p.y + dyTexto}
                      textAnchor={anclaTexto}
                      fontSize={p.base ? 22 : 17}
                      className={`font-dm ${p.base ? "fill-dorado" : p.slug ? "fill-crema/85" : "fill-crema/60"}`}
                    >
                      {p.nombre}
                      {p.base && <tspan className="fill-crema/55" fontSize={14}>{sufijoBase}</tspan>}
                    </text>
                  </>
                );
                // Los destinos del catálogo son enlaces a su ficha (SSG). Los
                // pueblos no: no tienen página propia.
                return p.slug ? (
                  <Link key={p.id} href={lp(`/destinos/${p.slug}`)} className="group">
                    <g className="transition-opacity group-hover:opacity-70">{contenido}</g>
                  </Link>
                ) : (
                  <g key={p.id}>{contenido}</g>
                );
              })}
            </svg>
            <figcaption className="mt-3 text-center font-dm text-[11px] text-crema/35">
              {t(
                "Esquema, no un mapa a escala. Las posiciones salen de las coordenadas reales de cada destino y conservan qué queda al norte y al poniente de qué, pero el dibujo se estira a lo ancho para que quepan los nombres, y no dibuja carreteras.",
                "A schematic, not a scale map. Positions come from each place's real coordinates and keep what lies north and west of what, but the drawing is stretched sideways so the names fit, and it draws no roads.",
              )}
            </figcaption>
          </figure>

          {/* ── Las distancias en texto, para quien no ve el dibujo ── */}
          <div>
            <h3 className="mb-4 font-dm text-[10px] uppercase tracking-[3px] text-verde-vivo">
              {t("Cuánto se hace hasta Xilitla", "How long it takes to Xilitla")}
            </h3>
            <ul className="mb-8 space-y-2.5">
              {DESDE.map((d) => (
                <li key={d.slug} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2.5">
                  <span className="font-dm text-sm text-crema/75">{en ? d.ciudadEn : d.ciudad}</span>
                  <span className="font-cormorant text-xl text-dorado">{en ? d.autoXilitlaEn : d.autoXilitla}</span>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 font-dm text-[10px] uppercase tracking-[3px] text-verde-vivo">
              {t("A dónde vamos", "Where we go")}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {enLaLista.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={lp(`/destinos/${d.slug}`)}
                    className="inline-flex min-h-[38px] items-center border border-white/15 px-3.5 font-dm text-xs text-crema/70 transition-colors hover:border-verde-vivo/60 hover:text-crema"
                  >
                    {d.nombre}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-7">
              <Link
                href={lp("/destinos")}
                prefetch={false}
                className="font-dm text-xs uppercase tracking-[2px] text-dorado underline underline-offset-4 transition-colors hover:text-crema"
              >
                {t(`Ver los ${DESTINOS_DB.length} destinos →`, `See all ${DESTINOS_DB.length} destinations →`)}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
