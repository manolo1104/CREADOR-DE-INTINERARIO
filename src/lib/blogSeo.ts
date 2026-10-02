/**
 * Correcciones de SEO y de HECHOS sobre los artículos del blog, aplicadas al
 * renderizar. Corre en PRODUCCIÓN.
 *
 * 🔴 Por qué existe (28 sep 2026)
 *
 * El HTML de los artículos vive en la base (`BlogPost`), no en el repo, y la
 * base de producción no se toca a mano. `blogImageEdits.ts` resolvía algo
 * parecido, pero SOLO en desarrollo: era una vista previa de cambios que
 * luego se copiaban a la base. Esto es lo contrario: la corrección vive aquí,
 * se aplica siempre y se revisa en el `git diff` como cualquier otro código.
 *
 * Lo que arregla salió de leer los ocho artículos de septiembre contra el
 * catálogo del propio sitio. El agente que los escribió inventaba precios y
 * los publicaba junto a la ficha que decía otra cosa: el de Tamul anunciaba
 * "$10 de entrada y $120 la panga" y, tres párrafos más abajo, la ficha del
 * lugar decía $220 + $300; el de Minas Viejas daba unas coordenadas GPS que
 * caen en las Cascadas de Micos; el de octubre promocionaba el Sótano de las
 * Golondrinas, que no operamos; el de Xantolo recomendaba a otra operadora
 * con su precio.
 *
 * REGLAS
 *   · Los precios, horarios y distancias NUEVOS salen del catálogo
 *     (`TOURS_DB`, `DESTINOS_DB`, `PAQUETES_DB`), nunca escritos a mano: si
 *     el catálogo cambia, el artículo cambia con él.
 *   · `contentReplace` es un reemplazo LITERAL. El `from` se copió del HTML
 *     que sirve el sitio (que es el de la base: las transformaciones de la
 *     plantilla solo tocan URLs, `<h1>` y las promesas del planificador). Si
 *     la base cambia y un `from` deja de aparecer, no se rompe nada: en
 *     desarrollo sale un aviso en consola para enterarse.
 *   · La clave de `BLOG_SEO` es el slug SIN sufijo de año (`normalizaSlugBlog`).
 */
import {
  TOURS_DB,
  conPrecio,
  esPorPersona,
  etiquetaUnidad,
  fraseRecogida,
  partesRecogida,
  recogidaDeTour,
  tourDurRange,
  type Tour,
} from "@/lib/tours";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import { PAQUETES_DB, precioVisible, type Paquete } from "@/lib/paquetes";
import { toursCercaDe } from "@/lib/tourMapping";
import { normalizaSlugBlog } from "@/lib/blogDestinoMap";
import { temporadaDe } from "@/lib/temporada";
import { CIUDADES_ORIGEN } from "@/lib/ciudadesOrigen";
import { calcTourTotal } from "@/lib/tourBooking";

export interface BlogSeoOverride {
  metaTitle?: string;
  /** Meta completa, ≤155 caracteres y terminada en frase. */
  metaDescription?: string;
  coverImageAlt?: string;
  /**
   * Resumen completo que sustituye al `excerpt` de la fila. Sale en las
   * tarjetas de "artículos relacionados" y, si el artículo no tiene meta, en
   * la meta. 🔴 El ItemList de /blog lee `excerpt` de la base sin pasar por
   * aquí: mientras `blog/page.tsx` no aplique `aplicaBlogSeo`, allí sigue el viejo.
   */
  excerpt?: string;
  /** Reemplazos literales dentro del HTML guardado. */
  contentReplace?: { from: string; to: string }[];
  /**
   * Preguntas frecuentes VISIBLES. Se pintan como `<details>` para que
   * `extractFAQs` de la plantilla las recoja en el FAQPage igual que las que
   * escribió el agente.
   */
  faqs?: { q: string; a: string }[];
  /** Slugs de /tours. El primero sustituye a `inferTour`; todos van al recuadro "Recorridos relacionados". */
  tours?: string[];
  /** Slugs de /blog (sin año), en el orden en que se quieren. */
  relacionados?: string[];
  /** El JSON-LD guardado en la fila no se publica (traía campos inválidos). */
  omitirSchemaGuardado?: true;
  /** "AAAA-MM-DD": día en que se corrigió el contenido. Sube `dateModified` y el `lastmod`. */
  actualizado?: string;
}

// ── Datos del catálogo ────────────────────────────────────────────────────────
//
// Un slug mal escrito aquí revienta al cargar el módulo, a propósito: mejor un
// error en `next build` que un artículo publicando "undefined MXN". Eso vale
// para lo que se busca por slug, id o posición (`tour`, `destino`, el add-on
// del salto, `respuestaFicha`): sin el dato no hay frase posible.
//
// Las guardas de REDACCIÓN (una palabra en `incluye`, el nombre de una
// temporada, la pregunta de una ficha) van por `aviso()`.

/**
 * 🔴 Revienta en desarrollo, pero en producción solo deja un `console.error`.
 * `sitemap.ts` importa este módulo: un `throw` aquí tumbaría el `next build`
 * de TODO el sitio porque alguien reescribió una frase en tours.ts, y Railway
 * se queda con la versión anterior sin avisar. En producción la corrección se
 * sigue publicando (con el precio del catálogo), que siempre es menos malo
 * que volver al texto inventado que sustituye.
 */
function aviso(msg: string): void {
  if (process.env.NODE_ENV !== "production") throw new Error(`blogSeo: ${msg}`);
  console.error(`[blogSeo] ${msg}`);
}

function tour(slug: string): Tour {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`blogSeo: el recorrido "${slug}" no existe en TOURS_DB`);
  return t;
}

function destino(slug: string): Destino {
  const d = DESTINOS_DB.find((x) => x.slug === slug);
  if (!d) throw new Error(`blogSeo: el destino "${slug}" no existe en DESTINOS_DB`);
  return d;
}

/** "$1,550 MXN": el mismo formato que las descripciones del catálogo. */
const dinero = (n: number) => conPrecio("{precio}", n);

/** "$1,550 MXN por persona" · "$2,990 MXN por grupo". */
const precioDe = (t: Tour) => `${dinero(t.precio)} ${etiquetaUnidad(t)}`;

/** "la Gruta de Xilo" · "El Edén en el Jardín" (ese ya trae el artículo). */
const conArticulo = (t: Tour) => (t.articulo ? `${t.articulo} ${t.nombreCorto}` : t.nombreCorto);

/** "a, b y c". */
function lista(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

/** "12 a 13" · "3". */
function horas(t: Tour): string {
  const [a, b] = tourDurRange(t);
  return a === b ? `${a}` : `${a} a ${b}`;
}

/** La respuesta de una pregunta frecuente de la ficha del destino, tal cual. */
function respuestaFicha(d: Destino, i: number): string {
  const r = d.seo?.faqPrincipales?.[i]?.respuesta;
  if (!r) throw new Error(`blogSeo: la ficha "${d.slug}" no tiene la pregunta frecuente nº ${i}`);
  return r;
}

/** Primera frase de un texto, sin el punto final. */
const primeraFrase = (s: string) => s.split(". ")[0].replace(/\.$/, "");

const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Minutos desde Ciudad Valles, leídos de `como_llegar` ("105 min desde Valles
 * · …"). `null` si la ficha no lo dice así: entonces el reemplazo que lo usa
 * se omite en vez de inventar una cifra.
 */
function minutosDesdeValles(d: Destino): number | null {
  const m = /^~?\s*(\d+)\s*min desde Valles/.exec(d.como_llegar);
  return m ? Number(m[1]) : null;
}

/** 105 → "1 h 45 min" · 20 → "20 min". */
function duracionMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 22.576111 → "22°35′N". */
function gradosMinutos(dec: number, pos: string, neg: string): string {
  const abs = Math.abs(dec);
  let g = Math.floor(abs);
  let m = Math.round((abs - g) * 60);
  if (m === 60) { g += 1; m = 0; }
  return `${g}°${String(m).padStart(2, "0")}′${dec >= 0 ? pos : neg}`;
}

/** Un reemplazo que depende de un dato que puede faltar: sin dato, no hay reemplazo. */
function si(from: string, to: string | null): { from: string; to: string }[] {
  return to === null ? [] : [{ from, to }];
}

/** "08:00–17:00" → "de 08:00 a 17:00". */
const horarioDe = (d: Destino) => `de ${d.horario.replace("–", " a ")}`;

/** "Lunes a Domingo" → "todos los días" · "Solo domingos" → "solo domingos". */
const diasDe = (d: Destino) =>
  /^lunes a domingo$/i.test(d.dias_abierto) ? "todos los días" : d.dias_abierto.toLowerCase();

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
/** "2026-09-28" → "septiembre de 2026". */
function mesAnio(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

const TAMUL        = tour("expedicion-tamul");
const RAPPEL       = tour("rappel-tamul");
const GRUTA        = tour("gruta-de-xilo");
const ESCALONADO   = tour("paraiso-escalonado-minas-micos");
const ACUATICA     = tour("ruta-acuatica-puente-de-dios");
const RAFTING      = tour("rafting-rio-tampaon");

const D_TAMUL      = destino("cascada-de-tamul");
const D_POZAS      = destino("las-pozas-jardin-surrealista");
const D_PUENTE     = destino("puente-de-dios-tamasopo");
const D_TAMASOPO   = destino("cascadas-de-tamasopo");
const D_MINAS      = destino("cascadas-minas-viejas");
const D_MICOS      = destino("cascadas-de-micos");
const D_XILITLA    = destino("xilitla-pueblo-magico");
const D_TAMTOC     = destino("zona-arqueologica-tamtoc");
const D_TAMBAQUE   = destino("nacimiento-tambaque");
const D_GOLONDRINAS = destino("sotano-de-las-golondrinas");

// "La entrada cuesta $220 MXN más $300 MXN por persona por la panga (lancha)."
const TAMUL_PRECIO_FRASE = primeraFrase(respuestaFicha(D_TAMUL, 0));
// "Lancheros dejan de salir a las 2 PM."
const TAMUL_ULTIMA_PANGA = `${D_TAMUL.advertencias.split(".")[0]}.`;
const TAMUL_HORARIO = horarioDe(D_TAMUL);
const TAMUL_MIN_VALLES = minutosDesdeValles(D_TAMUL);

// El extra de Micos es un SALTO que se suma al Paraíso Escalonado, no un
// "rappel incluido en algunos paquetes" como decía el artículo.
const SALTO_MICOS = (() => {
  const a = ESCALONADO.addOns?.find((x) => x.id === "salto-7-cascadas");
  if (!a) throw new Error(`blogSeo: "${ESCALONADO.slug}" ya no tiene el add-on "salto-7-cascadas"`);
  return a;
})();

// "Domingos gratis (mexicanos) · extranjeros ~$95" no se puede pegar tal cual
// a media frase. Si la ficha cambia de forma, se usa su texto sin adaptar.
const TAMTOC_ENTRADA = (() => {
  const m = /gratis \(mexicanos\) · extranjeros (~?\$[\d,]+)/i.exec(D_TAMTOC.precio_entrada);
  return m ? `gratis para mexicanos y de ${m[1]} MXN para extranjeros` : D_TAMTOC.precio_entrada;
})();

// Ninguno ENTRA a Tambaque: `tourMapping` los tiene como "cerca".
const CERCA_TAMBAQUE = toursCercaDe("nacimiento-tambaque").map((r) => tour(r.slug));

/** "La <a>Expedición Tamul</a> y el <a>Rafting…</a>": el artículo fuera del enlace. */
const enlacesTours = (ts: Tour[]) =>
  lista(
    ts.map((t, i) => {
      const art = t.articulo ? `${i === 0 ? mayusculaInicial(t.articulo) : t.articulo} ` : "";
      return `${art}<a href="/tours/${t.slug}">${t.nombreCorto}</a>`;
    }),
  );

const POR_PERSONA  = TOURS_DB.filter(esPorPersona);
const PP_MIN       = Math.min(...POR_PERSONA.map((t) => t.precio));
const PP_MAX       = Math.max(...POR_PERSONA.map((t) => t.precio));
const MAS_BARATOS  = POR_PERSONA.filter((t) => t.precio === PP_MIN);
const MAS_CARO     = POR_PERSONA.find((t) => t.precio === PP_MAX)!;
const OTRA_TARIFA  = TOURS_DB.filter((t) => !esPorPersona(t));

const CON_TRASLADO = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado);
const SOLO_XILITLA = TOURS_DB.filter((t) => recogidaDeTour(t).tipo === "hospedaje-xilitla");

// Los paquetes se citan con lo que ENSEÑA el sitio: `precioVisible()` y su
// unidad. `p.precio` es siempre el total de la pareja (lo que cobra el motor);
// ponerlo junto a una etiqueta «por persona» anunciaría el doble.
const unidadPaq = (p: Paquete) => (p.precioPorPersona ? "por persona" : p.precioLabel);
/** "$8,699 MXN por pareja". */
const precioPaq = (p: Paquete) => `${dinero(precioVisible(p))} ${unidadPaq(p)}`;

const PAQ_PRECIOS  = PAQUETES_DB.map(precioVisible);
const PAQ_MIN      = PAQUETES_DB.find((p) => precioVisible(p) === Math.min(...PAQ_PRECIOS))!;
const PAQ_MAX      = PAQUETES_DB.find((p) => precioVisible(p) === Math.max(...PAQ_PRECIOS))!;
const PAQ_DIAS     = PAQUETES_DB.map((p) => p.dias);
// 🔴 "De $X a $Y por pareja" solo es verdad si TODOS se anuncian con la misma
// unidad. Si un día uno pasa a «por persona», el rango mezclaría dos cosas:
// en desarrollo revienta para que se reescriban las frases; en producción el
// rango sale "según el paquete", sin afirmar una unidad que no es de todos.
const PAQ_UNIDAD = (() => {
  const unidades = Array.from(new Set(PAQUETES_DB.map(unidadPaq)));
  if (unidades.length === 1) return unidades[0];
  aviso(`los paquetes se anuncian con unidades distintas (${unidades.join(", ")}): reescribe los rangos`);
  return "según el paquete";
})();
/** "de <strong>$8,699 MXN</strong> a <strong>$16,500 MXN</strong> por pareja". */
const PAQ_RANGO    = `de <strong>${dinero(precioVisible(PAQ_MIN))}</strong> a <strong>${dinero(precioVisible(PAQ_MAX))}</strong> ${PAQ_UNIDAD}`;
/** "de 3 a 5 días". */
const PAQ_DIAS_RANGO = `de ${Math.min(...PAQ_DIAS)} a ${Math.max(...PAQ_DIAS)} días`;
// El más corto del catálogo es el que responde a los "paquetes de 3 días y 2
// noches desde $8,890 por persona" que inventaban varios artículos.
const PAQ_CORTO    = PAQUETES_DB.reduce((a, b) => (b.dias < a.dias ? b : a));
const PAQ_CORTO_FRASE =
  `nuestro paquete de ${PAQ_CORTO.dias} días y ${PAQ_CORTO.noches} noches con hotel en Xilitla, ${PAQ_CORTO.nombre}, cuesta <strong>${precioPaq(PAQ_CORTO)}</strong>`;
// Lo que cubre cualquier paquete (la misma respuesta que ya daba «cuánto cuesta»).
const PAQ_INCLUYE =
  "incluyen el hotel en Xilitla, el desayuno los días de tour, los recorridos y el transporte del hotel a cada uno; el viaje hasta Xilitla va por tu cuenta";

// Tramos de menor del motor de cobro (`calcTourTotal`: 6–10 años y menores de
// 6). Se leen de la función, no se escriben: si cambia el cobro, cambia el texto.
const PCT_MENOR_6_10 = calcTourTotal(100, 0, 1, 0, 0).childPriceMid;
const PCT_MENOR_6    = calcTourTotal(100, 0, 0, 1, 0).childPriceSmall;
const NINOS_FRASE =
  `si el recorrido admite niños, los de 6 a 10 años pagan el ${PCT_MENOR_6_10} % del precio de adulto y los menores de 6, el ${PCT_MENOR_6} %`;

const MIN_MINAS    = minutosDesdeValles(D_MINAS);
const MIN_MICOS    = minutosDesdeValles(D_MICOS);
const MIN_XILITLA  = minutosDesdeValles(D_XILITLA);

/** "Traslado desde tu hospedaje en Xilitla o Ciudad Valles" para ESTE recorrido. */
const trasladoDe = (t: Tour) => `traslado desde ${partesRecogida(t, false).lugar}`;

/**
 * Avisa si un recorrido deja de pasar por un lugar, o de incluir algo, que
 * los textos de abajo afirman. En desarrollo revienta, para enterarse al
 * editar tours.ts; en producción solo lo registra (ver `aviso`).
 */
function exige(t: Tour, campo: "destinos" | "incluye", re: RegExp): void {
  if (!t[campo].some((x) => re.test(x))) {
    aviso(`"${t.slug}" ya no tiene ${re} en ${campo}: revisa las frases que lo afirman`);
  }
}

// ── Los recorridos que sustituyen a los tours inventados del blog ────────────
//
// 🔴 Nueve artículos vendían un "tour Jardín Surrealista + Sótano de las
// Huahuas desde Ciudad Valles" a $1,459 o $1,532 que NO existe: Las Pozas va en
// la Ruta Surrealista y el Sótano de las Huahuas, en la Expedición Tamul.
const SURREALISTA  = tour("ruta-surrealista-edward-james");
const CAFE         = tour("travesia-del-cafe");
exige(SURREALISTA, "destinos", /Las Pozas/);
exige(SURREALISTA, "destinos", /Huichihuay/);
exige(SURREALISTA, "incluye", /desayuno/i);
exige(SURREALISTA, "incluye", /entradas/i);
exige(SURREALISTA, "incluye", /guía certificado/i);
exige(TAMUL, "destinos", /Huahuas al atardecer/);
exige(TAMUL, "destinos", /Cueva del Agua/);
exige(TAMUL, "incluye", /desayuno/i);
exige(TAMUL, "incluye", /canoa/i);
exige(CAFE, "incluye", /RZR/);
exige(CAFE, "incluye", /recorrido guiado/i);
exige(CAFE, "incluye", /cata/i);
exige(RAFTING, "incluye", /comida/i);
exige(RAFTING, "incluye", /seguro/i);

/** "la <a>Ruta Surrealista</a>, que recorre Las Pozas de Edward James con …, cuesta <strong>$1,400 MXN por persona</strong>". */
const SURREALISTA_FRASE =
  `la <a href="/tours/${SURREALISTA.slug}">${SURREALISTA.nombreCorto}</a>, que recorre Las Pozas de Edward James con ${trasladoDe(SURREALISTA)}, desayuno, entradas y guía certificado, cuesta <strong>${precioDe(SURREALISTA)}</strong>`;
/** "Nacimiento de Huichihuayán, Cueva de las Quilas y Castillo de la Salud". */
const SURREALISTA_OTRAS = lista(SURREALISTA.destinos.filter((d) => !/Las Pozas/.test(d)));
/** Lo que sustituye al combo inventado: cada lugar con el tour que de verdad va. */
const POZAS_Y_HUAHUAS =
  `Las Pozas de Edward James van en la <a href="/tours/${SURREALISTA.slug}">${SURREALISTA.nombreCorto}</a> (<strong>${precioDe(SURREALISTA)}</strong>), ` +
  `y el Sótano de las Huahuas, al atardecer, en la <a href="/tours/${TAMUL.slug}">${TAMUL.nombreCorto}</a> (<strong>${precioDe(TAMUL)}</strong>)`;
/** "Nuestros recorridos de un día que se cobran por persona van de $900 MXN a $1,950 MXN". */
const RANGO_TOURS =
  `nuestros recorridos de un día que se cobran por persona van de <strong>${dinero(PP_MIN)}</strong> a <strong>${dinero(PP_MAX)}</strong>`;

// ── Entradas de terceros, leídas de la ficha que el artículo pinta ───────────

const D_COMALES    = destino("cascada-los-comales");
const D_HUICHI     = destino("nacimiento-huichihuayan");

/**
 * La respuesta de la ficha cuya pregunta encaja, sin depender del orden. Si
 * la pregunta se reescribe, en producción devuelve "" (ver `aviso`): quien la
 * use tiene que omitir su frase con un texto vacío, como `POZAS_REDUCIDA`.
 */
function respuestaSobre(d: Destino, pregunta: RegExp): string {
  const r = d.seo?.faqPrincipales?.find((f) => pregunta.test(f.pregunta))?.respuesta;
  if (!r) aviso(`la ficha "${d.slug}" ya no tiene la pregunta ${pregunta}`);
  return r ?? "";
}

// "Adultos: $180 MXN. Niños 6–12 años y adultos mayores con INAPAM: $120 MXN.
// Menores de 6 años: gratis. …" (la ficha de Xilitla). Si cambia de forma, la
// frase de la tarifa reducida se omite en vez de inventarla.
const POZAS_TARIFAS = respuestaSobre(D_XILITLA, /cuánto cuesta la entrada a las pozas/i);
const POZAS_REDUCIDA = /INAPAM: (\$[\d,]+ MXN)/.exec(POZAS_TARIFAS)?.[1] ?? null;
const POZAS_REDUCIDA_FRASE = POZAS_REDUCIDA
  ? ` Los niños de 6 a 12 años y los adultos mayores con credencial INAPAM pagan <strong>${POZAS_REDUCIDA}</strong>` +
    `${/menores de 6 años: gratis/i.test(POZAS_TARIFAS) ? ", y los menores de 6 años entran gratis" : ""}.`
  : "";

// "Cuota local (~$20 MXN, confirmar en sitio)" no cabe a media frase.
const COMALES_CUOTA = /~?\$[\d,]+ MXN/.exec(D_COMALES.precio_entrada)?.[0] ?? null;
const COMALES_ENTRADA = COMALES_CUOTA
  ? `una cuota local de <strong>${COMALES_CUOTA}</strong>`
  : minuscula(D_COMALES.precio_entrada);
// "Precio y horarios no publicados oficialmente: confirma por teléfono."
const COMALES_AVISO = /[^.]*no publicad[^.]*\./i.exec(D_COMALES.advertencias)?.[0].trim() ?? "";

// ── Temporada y distancias, de las fuentes del sitio ─────────────────────────

const ABREV_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "Ene–Abr" → "enero a abril". Si la ficha lo escribe de otra forma, va tal cual. */
function mesesDe(rango: string): string {
  const m = /^([A-Za-z]{3})\s*[–-]\s*([A-Za-z]{3})$/.exec(rango.trim());
  const a = m ? ABREV_MES.indexOf(m[1].toLowerCase()) : -1;
  const b = m ? ABREV_MES.indexOf(m[2].toLowerCase()) : -1;
  return a >= 0 && b >= 0 ? `${MESES[a]} a ${MESES[b]}` : rango;
}
/**
 * Los meses que `temporada.ts` pone en la misma ventana que `ancla`, como
 * "julio a octubre". Se pide el día 1 porque octubre se parte el día 5. Si la
 * ventana deja de ser continua, se nombran sus meses uno a uno en vez de
 * fingir un rango.
 */
function ventanaComo(ancla: number, debeDecir: RegExp): string {
  const t = temporadaDe(ancla, 1);
  if (!debeDecir.test(t.nombre)) aviso(`en temporada.ts el mes ${ancla} ya no es ${debeDecir}`);
  const ms = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => temporadaDe(m, 1) === t);
  const continua = ms.every((m, i) => i === 0 || m === ms[i - 1] + 1);
  return continua
    ? `${MESES[ms[0] - 1]} a ${MESES[ms[ms.length - 1] - 1]}`
    : lista(ms.map((m) => MESES[m - 1]));
}
const TAMUL_TEMPORADA = mesesDe(D_TAMUL.temporada_ideal);      // "enero a abril"
const MESES_TURQUESA  = ventanaComo(4, /turquesa/i);           // "marzo a mayo"
const MESES_LLUVIAS   = ventanaComo(8, /lluvias/i);            // "julio a octubre"

// "~6 horas hasta Ciudad Valles." (landing /desde/monterrey, en auto).
const MTY_AUTO = (() => {
  const d = CIUDADES_ORIGEN.find((c) => c.slug === "monterrey")?.llegadas.find((l) => /\bauto\b/i.test(l.modo))?.detalle;
  const m = d ? /^~?\s*(\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*horas?) hasta Ciudad Valles/.exec(d) : null;
  return m ? m[1] : null;
})();

const HOY = "2026-09-28";

/** El "Última actualización: <mes>" del cuerpo, igual a la fecha de `actualizado`. */
const alDia = (antes: string) => ({
  from: `<em>Última actualización: ${antes}.</em>`,
  to: `<em>Última actualización: ${mesAnio(HOY)}.</em>`,
});

// ── Correcciones por artículo ─────────────────────────────────────────────────

const BLOG_SEO: Record<string, BlogSeoOverride> = {
  // ── Cascada de Tamul ───────────────────────────────────────────────────────
  // El artículo que más tráfico trae de Google. Tenía los precios de otra
  // época (entrada $10, panga $120, abre de 7 a 4) y vendía un "tour desde
  // Ciudad Valles de 8 horas por $1,099" como si fuera el nuestro: la
  // Expedición Tamul dura 12–13 h y cuesta otra cosa. La ficha del lugar, que
  // se pinta a mitad del mismo artículo, lo contradecía a la vista.
  "cascada-de-tamul-la-guia-definitiva-para-visitarla": {
    // La anterior se cortaba en "Actualizada con datos".
    metaDescription:
      "Cascada de Tamul, la más alta de San Luis Potosí: cuánto cuestan la entrada y la panga, a qué hora llegar, cómo ir en canoa y qué tour la incluye.",
    // Era "cascada de tamul Cascada de Tamul cayendo… 2026": palabra clave repetida.
    coverImageAlt:
      "La cascada de Tamul al fondo del cañón, vista desde el río turquesa entre paredes de roca, en Aquismón, San Luis Potosí",
    contentReplace: [
      {
        from: "El acceso tiene un costo de <strong>~$10 pesos por persona</strong> en 2026.",
        to: `${TAMUL_PRECIO_FRASE}, y se paga solo en efectivo.`,
      },
      {
        from:
          "Los viajeros que coordinamos desde Ciudad Valles suelen preferir el tour organizado de <strong>8 horas</strong> que incluye transporte, guía certificado, equipo de seguridad, seguro y almuerzo por <strong>$1,099 MXN por persona</strong>.",
        to:
          `Los viajeros que coordinamos suelen preferir la ${TAMUL.nombreCorto}, de <strong>${horas(TAMUL)} horas</strong>, con ${trasladoDe(TAMUL)}, desayuno, entradas, guía certificado, equipo de seguridad y seguro, por <strong>${precioDe(TAMUL)}</strong>.`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours cascada de tamul Huasteca Potosina">Reserva el tour a cascada de tamul</a>',
        to: `<a href="/tours/${TAMUL.slug}">Reserva la ${TAMUL.nombreCorto}</a>`,
      },
      {
        from:
          "El sitio abre <strong>todos los días de 7:00 am a 4:00 pm</strong>, y se recomienda salir temprano para evitar colas.",
        to: `El sitio abre <strong>todos los días ${TAMUL_HORARIO}</strong>. ${respuestaFicha(D_TAMUL, 1)}`,
      },
      {
        // El "$500–$900 en total" caía por debajo de lo que ya cuestan la
        // entrada y la panga juntas: se quita en vez de inventar otro rango.
        from:
          "Los precios en 2026: entrada al sitio <strong>~$10 MXN por persona</strong>; panga compartida (hasta <strong>12 personas</strong>) <strong>$120 MXN por persona</strong>; panga privada <strong>$800 MXN</strong> por embarcación; rappel <strong>~$800 MXN por persona</strong>. El costo total promedio de una visita independiente ronda los <strong>$500–$900 MXN por persona</strong> incluyendo traslados y alimentos.",
        to:
          `Los precios en 2026: ${minuscula(TAMUL_PRECIO_FRASE)}, solo en efectivo. El ${RAPPEL.nombreCorto}, con equipo y guías certificados, cuesta <strong>${precioDe(RAPPEL)}</strong>.`,
      },
      {
        from:
          "<tr><td>Entrada al sitio</td><td><strong>$10 MXN/persona</strong></td><td>Acceso al embarcadero</td></tr>",
        to: `<tr><td>Entrada + panga</td><td><strong>${D_TAMUL.precio_entrada}</strong></td><td>${TAMUL_ULTIMA_PANGA} Solo efectivo.</td></tr>`,
      },
      // Las dos pangas se quitan con su salto de línea para no dejar filas en
      // blanco. La privada de "$800 por embarcación" no está en la ficha.
      {
        from:
          "<tr><td>Panga compartida</td><td><strong>$120 MXN/persona</strong></td><td>Traslado río Tampaón (12 pax)</td></tr>\n    ",
        to: "",
      },
      {
        from:
          "<tr><td>Panga privada</td><td><strong>$800 MXN/embarcación</strong></td><td>Traslado exclusivo</td></tr>\n    ",
        to: "",
      },
      {
        // La cabecera dice "Actualizado el …" con la fecha de `actualizado`;
        // el cuerpo no puede decir otra.
        from: "<em>Última actualización: mayo de 2026.</em>",
        to: `<em>Última actualización: ${mesAnio(HOY)}.</em>`,
      },
      {
        from:
          "<tr><td>Tour desde Ciudad Valles</td><td><strong>$1,099 MXN/persona</strong></td><td>Transporte, guía, seguro, almuerzo</td></tr>",
        to: `<tr><td>${TAMUL.nombreCorto} (tour guiado)</td><td><strong>${precioDe(TAMUL)}</strong></td><td>Traslado, desayuno, entradas, guía y seguro</td></tr>`,
      },
      {
        from:
          "<tr><td>Rappel</td><td><strong>$800 MXN/persona</strong></td><td>Equipo y guía especializado</td></tr>",
        to: `<tr><td>${RAPPEL.nombreCorto}</td><td><strong>${precioDe(RAPPEL)}</strong></td><td>Equipo y guías certificados</td></tr>`,
      },
      {
        from:
          "<p>La entrada al sitio cuesta <strong>~$10 MXN por persona</strong>. La panga compartida cuesta <strong>$120 MXN/persona</strong> y la privada <strong>$800 MXN por embarcación</strong>. El tour organizado desde Ciudad Valles, que incluye transporte, guía, equipo y almuerzo, tiene un precio de <strong>$1,099 MXN por persona</strong>.</p>",
        to:
          `<p>${respuestaFicha(D_TAMUL, 0)} La ${TAMUL.nombreCorto}, con ${trasladoDe(TAMUL)}, desayuno, entradas y guía, cuesta <strong>${precioDe(TAMUL)}</strong>.</p>`,
      },
      {
        from: "La cascada tamul huasteca abre todos los días de <strong>7:00 am a 4:00 pm</strong>.",
        to: `La cascada abre todos los días <strong>${TAMUL_HORARIO}</strong>. ${TAMUL_ULTIMA_PANGA}`,
      },
      {
        from: 'alt="cascada tamul huasteca guía viaje Huasteca Potosina"',
        to: 'alt="La cascada de Tamul cayendo entre paredes de roca cubiertas de selva, vista desde el agua turquesa al pie del cañón"',
      },
      // 🔴 Temporada (IA-08): decía "evita marzo–mayo, la ideal va de julio a
      // marzo", al revés de la ficha que se pinta en el mismo artículo (ideal
      // ene–abr) y de `temporada.ts` (en secas el agua baja turquesa, en
      // lluvias puede bajar marrón). Va con las dos fuentes, sin cifra propia.
      {
        from:
          "En temporada seca —entre <strong>marzo y mayo</strong>— el caudal puede reducirse notablemente. La temporada ideal va de <strong>julio a marzo</strong>.",
        to:
          `La temporada ideal para visitarla va de <strong>${TAMUL_TEMPORADA}</strong>: en secas el agua baja clara y turquesa (de ${MESES_TURQUESA} es cuando más), aunque con menos caudal. ` +
          `En lluvias, de ${MESES_LLUVIAS}, la cascada va a todo caudal, pero el agua puede bajar marrón.`,
      },
      {
        from:
          "<li><strong>Evita visitar en marzo–mayo:</strong> La temporada seca reduce el caudal significativamente. La temporada ideal va de <strong>julio a marzo</strong>.</li>",
        to:
          `<li><strong>Elige bien la temporada:</strong> la ideal va de <strong>${TAMUL_TEMPORADA}</strong>. En lluvias (${MESES_LLUVIAS}) hay más caudal, pero el agua puede bajar marrón en vez de turquesa.</li>`,
      },
      {
        from:
          "La mejor temporada va de <strong>julio a marzo</strong>, cuando el caudal está en su punto máximo. Entre <strong>marzo y mayo</strong> (temporada seca), la cascada puede reducirse considerablemente.",
        to:
          `La temporada ideal va de <strong>${TAMUL_TEMPORADA}</strong>, en secas, cuando el agua baja clara y turquesa. ` +
          `En lluvias (${MESES_LLUVIAS}) la cascada lleva más caudal, pero el agua puede bajar marrón.`,
      },
    ],
    // Plan top 3 (29 sep): el artículo está en la posición ~9 de «cascada de
    // tamul» y solo respondía altura, precio, temporada y niños. Estas son las
    // otras dudas de quien la busca, contestadas con la ficha del lugar y la del
    // recorrido (si cambian, la respuesta cambia con ellas).
    faqs: [
      ...(TAMUL_MIN_VALLES === null
        ? []
        : [{
            q: "¿Dónde está la Cascada de Tamul y cómo se llega?",
            a:
              `Está en ${D_TAMUL.zona}, San Luis Potosí, al fondo del Cañón del Tampaón. Desde Ciudad Valles son unos ${duracionMin(TAMUL_MIN_VALLES)} por carretera hasta Tanchachín, ` +
              `y de ahí se sube en panga por el río hasta la caída. ${TAMUL_ULTIMA_PANGA}`,
          }]),
      {
        q: "¿Cuánto dura la visita a la Cascada de Tamul?",
        a:
          `Por tu cuenta, calcula unas ${D_TAMUL.duracion_hrs} horas entre el embarcadero, el paseo por el río y el regreso. ` +
          `La ${TAMUL.nombreCorto} dura de ${horas(TAMUL)} horas porque suma el cenote de la Cueva del Agua y el Sótano de las Huahuas al atardecer.`,
      },
      {
        q: "¿Dónde se nada en el paseo a Tamul?",
        a:
          `En la ${TAMUL.nombreCorto}, en el cenote de la Cueva del Agua: es parada del mismo paseo en canoa, al regreso de la cascada, y ahí se nada y se echan clavados.`,
      },
      {
        q: "¿Qué llevar a la Cascada de Tamul?",
        a:
          "Efectivo para la entrada y la panga (en el embarcadero no hay cajero), zapatos para agua y unos 2 litros de agua por persona. " +
          `En la ${TAMUL.nombreCorto} el equipo de seguridad, las entradas y el desayuno van incluidos.`,
      },
      {
        q: "¿Hay tour a la Cascada de Tamul desde Xilitla?",
        a:
          `Sí. La ${TAMUL.nombreCorto} incluye ${trasladoDe(TAMUL)}, desayuno, entradas, guía certificado y el paseo en canoa, y cuesta ${precioDe(TAMUL)}. ` +
          "La comida del día no va incluida.",
      },
    ],
    tours: [TAMUL.slug, RAPPEL.slug],
    relacionados: [
      "rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv",
      "nacimiento-de-tambaque-guia-completa",
      "la-huasteca-potosina-en-octubre-clima-rios-y-que-esperar",
    ],
    actualizado: "2026-09-29",
  },

  // ── ¿Cuánto cuesta la Huasteca Potosina? ────────────────────────────────────
  // El artículo de intención comercial por excelencia no tenía NI UNA pregunta
  // frecuente, y los precios que daba de Tamul y de Las Pozas no eran los de
  // sus propias fichas. Las preguntas se arman con el catálogo: si sube un
  // precio, la respuesta sube con él.
  "cuanto-cuesta-huasteca-potosina": {
    // La anterior se cortaba en "actualizada por Manolo Co".
    metaDescription:
      `Cuánto cuesta la Huasteca Potosina en 2026: tours guiados desde ${dinero(PP_MIN)} por persona, entradas, hospedaje, transporte y comida.`,
    contentReplace: [
      // El enlace al planificador lo reescribe la plantilla (está apagado);
      // aquí se ajusta la frase que lo rodea.
      {
        from: "Y si quieres un plan de ruta adaptado a tu presupuesto exacto, ",
        to: "Y si quieres ir con guía y sin preocuparte por la logística, ",
      },
      {
        from:
          "<strong>Crea tu itinerario personalizado en 2 minutos con nuestra IA</strong> — sin registro, gratis, con rutas reales y precios 2026.",
        to:
          "<strong>Nosotros armamos el recorrido</strong>: hotel en Xilitla, tours y traslados en un solo paquete, con fechas y precio en firme.",
      },
      {
        // En el Golondrinas vuelan vencejos; los loros son del Sótano de las
        // Huahuas. Va en el alt y en el pie de la misma foto.
        from: "miles de aves —loros y vencejos— emergiendo del Sótano de las Golondrinas",
        to: "miles de vencejos emergiendo del Sótano de las Golondrinas",
      },
      {
        from:
          "requieren contratar un lanchero local en La Mora — ese servicio cuesta entre <strong>$150 y $250 MXN por persona</strong> en lancha compartida, y vale absolutamente cada peso.",
        to:
          `requieren contratar un lanchero local: ${minuscula(TAMUL_PRECIO_FRASE)}, y vale absolutamente cada peso.`,
      },
      {
        from:
          "<li><strong>Las Pozas de Xilitla:</strong> entrada general $120 MXN (residentes) a $200 MXN (turistas). Válida todo el día.</li>",
        to: `<li><strong>Las Pozas de Xilitla:</strong> ${respuestaFicha(D_POZAS, 0)}</li>`,
      },
      {
        from:
          "<li><strong>Tour de río en Tamul:</strong> $150–$250 MXN por persona en lancha compartida, ida y vuelta.</li>",
        to: `<li><strong>Cascada de Tamul:</strong> ${TAMUL_PRECIO_FRASE}. Solo efectivo.</li>`,
      },
      {
        // Recomendaba por nombre a otras operadoras, con "paquetes de agencia"
        // de $450–$850 que no son de nadie: van nuestros recorridos.
        from:
          "<li><strong>Paquetes completos de agencia local (3–4 atractivos/día):</strong> entre $450 y $850 MXN por persona. En mis visitas a la Huasteca, he comprobado que los operadores locales de Ciudad Valles como Huasteca Tours o Aventura Huasteca ofrecen la mejor relación precio-experiencia para quienes quieren la Huasteca barata sin sacrificar seguridad.</li>",
        to:
          `<li><strong>Tours guiados:</strong> los que se cobran por persona van de ${dinero(PP_MIN)} a ${dinero(PP_MAX)}. Qué incluye cada uno, en <a href="/precios">precios de tours y paquetes</a>.</li>`,
      },
      {
        // Ficha: $100 y las actividades se pagan aparte. El extra de $350 es
        // el salto del Paraíso Escalonado, no un rappel.
        from:
          '<li><strong>Cascadas de Micos:</strong> entrada $80–$100 MXN por persona. <a href="/destinos/cascadas-de-micos">Uno de los circuitos más espectaculares de la región</a>, con rappel en cascada incluido en algunos paquetes desde $350 MXN.</li>',
        to:
          `<li><strong>Cascadas de Micos:</strong> <a href="/destinos/cascadas-de-micos">Uno de los circuitos más espectaculares de la región</a>. ${respuestaFicha(D_MICOS, 0)} ` +
          `Con nosotros, el ${SALTO_MICOS.nombre} se suma al <a href="/tours/${ESCALONADO.slug}">${ESCALONADO.nombreCorto}</a> por ${dinero(SALTO_MICOS.precio)} por persona.</li>`,
      },
      {
        // "Desde $250 con guía comunitario": la ficha dice $100. Y no lo
        // operamos, igual que en el artículo de octubre.
        from:
          '<li><strong>Sótano de las Golondrinas:</strong> acceso con guía comunitario desde $250 MXN. El espectáculo del vuelo de los vencejos al amanecer es absolutamente gratuito en términos emocionales. <a href="/destinos/sotano-de-las-golondrinas">Conoce más sobre este destino único</a>.</li>',
        to:
          `<li><strong>Sótano de las Golondrinas:</strong> la entrada cuesta ${D_GOLONDRINAS.precio_entrada}. El espectáculo del vuelo de los vencejos al amanecer es absolutamente gratuito en términos emocionales. ` +
          `No va en nuestros recorridos (la ${TAMUL.nombreCorto} cierra en el Sótano de las Huahuas), pero puedes <a href="/destinos/sotano-de-las-golondrinas">conocer más sobre este destino único</a>.</li>`,
      },
      {
        from: "actualizadas a marzo de 2026,",
        to: `actualizadas a ${mesAnio(HOY)},`,
      },
    ],
    faqs: [
      {
        q: "¿Cuánto cuesta un tour guiado en la Huasteca Potosina?",
        a:
          `Los recorridos que se cobran por persona van de ${dinero(PP_MIN)} a ${dinero(PP_MAX)}: ` +
          `los más económicos son ${lista(MAS_BARATOS.map(conArticulo))}, y el de precio más alto, ${conArticulo(MAS_CARO)}. ` +
          (OTRA_TARIFA.length
            ? `${mayusculaInicial(lista(OTRA_TARIFA.map((t) => `${conArticulo(t)} se cobra ${etiquetaUnidad(t)}`)))}. `
            : "") +
          `${CON_TRASLADO.length} de los ${TOURS_DB.length} recorridos incluyen traslado desde tu hospedaje (${SOLO_XILITLA.length} de ellos, solo dentro de Xilitla).`,
      },
      {
        q: `¿Cuánto cuesta la ${GRUTA.nombreCorto}?`,
        a:
          `${mayusculaInicial(precioDe(GRUTA))}. Es un recorrido nocturno de unas ${horas(GRUTA)} horas por una cueva de Xilitla, con casco, lámpara frontal y guía. ${fraseRecogida(GRUTA, false)}`,
      },
      {
        q: `¿Cuánto cuesta la ${TAMUL.nombreCorto}?`,
        a:
          `${mayusculaInicial(precioDe(TAMUL))}. Dura de ${horas(TAMUL)} horas e incluye ${trasladoDe(TAMUL)}, desayuno, entradas, guía certificado y el paseo en canoa hasta la cascada; la comida del día no va incluida.`,
      },
      {
        q: "¿Cuánto cuesta entrar a la Cascada de Tamul por tu cuenta?",
        a: `${respuestaFicha(D_TAMUL, 0)} ${respuestaFicha(D_TAMUL, 1)}`,
      },
      {
        q: "¿Cuánto cuesta un paquete con hotel en Xilitla?",
        a:
          `Van de ${dinero(precioVisible(PAQ_MIN))} a ${dinero(precioVisible(PAQ_MAX))} ${PAQ_UNIDAD}, ${PAQ_DIAS_RANGO}. ` +
          `${mayusculaInicial(PAQ_INCLUYE)}.`,
      },
    ],
    // La Gruta primero: es el recorrido más económico del catálogo junto con
    // la Travesía del Café, y el artículo lo lee quien está midiendo el gasto.
    tours: [GRUTA.slug, TAMUL.slug],
    relacionados: [
      "precios-presupuesto-para-viajar-a-xilitla-cuanto-cuesta-un-fin",
      "itinerario-huasteca-potosina-3-dias-3-dias-en-la-huasteca-po",
      "mejor-epoca-para-visitar-la-huasteca-potosina",
    ],
    actualizado: HOY,
  },

  // ── Nacimiento de Tambaque ─────────────────────────────────────────────────
  // 🔴 Decía que "nuestros tours de día completo incluyen Tambaque": NINGÚN
  // recorrido del catálogo entra ahí (tourMapping lo tiene solo como "cerca"
  // de Tamul y del rafting), y vendía el "tour organizado con agencia" de
  // $1,452 como la opción práctica. También mandaba por la 85 NORTE —la ficha
  // dice sur— y ponía Minas Viejas "a menos de 45 minutos", cuando está del
  // otro lado de Ciudad Valles.
  //
  // 🔴 Desde que el artículo está en el MAPA de `blogDestinoMap`, la ficha del
  // lugar se pinta a media página: horario, temperatura, camino y corriente
  // tienen que decir lo mismo que ella (agua MUY fría, 100 % pavimentado,
  // corriente casi nula).
  "nacimiento-de-tambaque-guia-completa": {
    coverImageAlt:
      "Agua turquesa del Nacimiento de Tambaque corriendo entre rocas y árboles, en Aquismón, San Luis Potosí",
    contentReplace: [
      { from: "85 norte", to: "85 sur" },
      {
        from: "Los grupos que llevamos cada temporada coinciden en que la caminata",
        to: "Quienes lo visitan coinciden en que la caminata",
      },
      {
        // El enlace decía "tour a Tambaque" y llevaba al catálogo entero.
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours nacimiento tambaque Huasteca Potosina">Reserva el tour a nacimiento tambaque</a> si quieres llegar sin contratiempos.',
        to:
          `${enlacesTours(CERCA_TAMBAQUE)} ${CERCA_TAMBAQUE.length === 1 ? "opera" : "operan"} cerca de Tambaque, si quieres sumar otro día de recorrido.`,
      },
      {
        from: "paquetes todo incluido para visitar nacimiento tambaque</a>",
        to: "paquetes todo incluido con hotel en Xilitla</a>",
      },
      {
        from: "la diferencia entre visitar solo y con tour organizado,",
        to: "qué recorridos operan en la zona,",
      },
      {
        from: "formando una alberca natural de agua turquesa y temperatura fresca todo el año.",
        to: "formando una alberca natural de agua turquesa y muy fría todo el año.",
      },
      {
        from:
          "el horario de atención en taquilla es de <strong>8:00 a 17:00 horas</strong> en días de operación normal.",
        to: `el paraje abre ${diasDe(D_TAMBAQUE)} <strong>${horarioDe(D_TAMBAQUE)}</strong>.`,
      },
      {
        from:
          " Para quienes prefieren no conducir, existe la opción de un tour organizado desde Ciudad Valles con agencia que cuesta <strong>$1,452 MXN por persona</strong> con impuestos incluidos, lo que añade transporte, guía y coordinación completa. Quienes visitan por primera vez frecuentemente subestiman los tiempos de traslado y agradecen tener un guía que conozca las condiciones del camino ese día.",
        to: "",
      },
      {
        from: "En 2026 no existe un horario oficial publicado de forma permanente para nacimiento tambaque.",
        to: `El paraje abre ${diasDe(D_TAMBAQUE)} ${horarioDe(D_TAMBAQUE)}, pero conviene confirmar que esté abierto antes de salir.`,
      },
      {
        from:
          "El camino en el tramo final es de terracería en buen estado durante temporada seca, pero puede requerir vehículo con mayor despeje en temporada de lluvias (junio–septiembre). Según operadores locales, <strong>9 de cada 10 visitantes</strong> que siguen esta ruta llegan sin ningún inconveniente en 2026.",
        to: "El camino está pavimentado hasta el paraje.",
      },
      {
        from: "<h3>Opciones de transporte: auto propio, colectivo o tour organizado</h3>",
        to: "<h3>Opciones de transporte: auto propio o colectivo</h3>",
      },
      {
        from:
          " La opción más práctica para quienes viajan desde fuera de la región es el tour organizado, que incluye recogida en hotel, transporte de ida y vuelta, guía local y coordinación de acceso.",
        to: "",
      },
      {
        from: "<td>Mayor flexibilidad de horario; requiere vehículo con despeje en lluvias</td>",
        to: "<td>Mayor flexibilidad de horario; camino pavimentado hasta el paraje</td>",
      },
      {
        from:
          "\n    <tr>\n      <td>Tour organizado desde Ciudad Valles</td>\n      <td><strong>$1,452 MXN p/p</strong> (impuestos incluidos)</td>\n      <td>Incluye transporte, guía, acceso coordinado y combinación con otros atractivos</td>\n    </tr>",
        to: "",
      },
      {
        from: "¿Quieres vivir nacimiento tambaque con guía experto?",
        to: "¿Quieres sumar un día de recorrido con guía experto?",
      },
      {
        from:
          "El agua brota a temperatura constante de entre <strong>22 y 24 °C</strong>, lo que la hace fresca pero no fría.",
        to: "El agua nace de un acuífero subterráneo y es muy fría: entra poco a poco para evitar el choque térmico.",
      },
      {
        from: " En temporada de lluvias, suma entre 10 y 15 minutos por el tramo de terracería final.",
        to: " El camino está pavimentado todo el trayecto.",
      },
      {
        from: "Se recomienda supervisión constante cerca del nacimiento principal, donde el flujo puede ser fuerte.",
        to: "La corriente es casi nula, pero el agua es muy fría y el piso resbaladizo: no pierdas de vista a los niños.",
      },
      {
        from: " Para quienes viajan en tour organizado desde nuestra plataforma, este paso se gestiona automáticamente antes de confirmar la salida.",
        to: "",
      },
      {
        from: "Los grupos que organizamos desde esta plataforma completan el trayecto en menos de una hora,",
        to: "El trayecto toma menos de una hora,",
      },
      {
        from: "tours de nacimiento tambaque</a> si prefieres no manejar.",
        to: "tours guiados por la zona</a> si prefieres no manejar el resto del viaje.",
      },
      ...si(
        ", ubicadas a menos de 45 minutos por carretera, o hacia",
        MIN_MINAS === null
          ? null
          : `, que quedan del otro lado de Ciudad Valles, a ${duracionMin(MIN_MINAS)} de la ciudad, o hacia`,
      ),
      {
        from: "incluyen tambaque junto con uno o dos atractivos adicionales según la temporada.",
        to:
          `no entran a Tambaque, pero ${CERCA_TAMBAQUE.length === 1 ? "uno opera" : "estos operan"} en la misma zona: ` +
          `${lista(CERCA_TAMBAQUE.map(conArticulo))}.`,
      },
    ],
    tours: CERCA_TAMBAQUE.map((t) => t.slug),
    relacionados: [
      "cascada-de-tamul-la-guia-definitiva-para-visitarla",
      "nacimiento-de-huichihuayan-la-joya-escondida-de-la-huasteca",
      "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta",
    ],
    actualizado: HOY,
  },

  // ── La Huasteca en octubre ─────────────────────────────────────────────────
  // 🔴 Promocionaba el Sótano de las Golondrinas (día 3 del itinerario, tabla y
  // dos preguntas frecuentes): NO lo operamos. El que va dentro de la
  // Expedición Tamul es el de las Huahuas. Además: "18 a 22 días de lluvia en
  // una quincena", el Xantolo en el "semidesierto", el Puente de Dios sobre el
  // río Tampaón, tours "desde $1,300" y paquetes "desde $9,000" que no son
  // los del catálogo, y entradas que no coinciden con las fichas.
  "la-huasteca-potosina-en-octubre-clima-rios-y-que-esperar": {
    // La anterior anunciaba "precios desde $1,300 MXN", que no es ninguno.
    metaDescription:
      "La Huasteca Potosina en octubre: fin de lluvias, cascadas con más caudal, qué ropa llevar y qué tours hacer. Guía 2026 con precios reales.",
    contentReplace: [
      {
        from: "la fiesta de muertos más auténtica del semidesierto potosino.",
        to: "la fiesta de muertos de la Huasteca.",
      },
      {
        from:
          "octubre registra entre <strong>18 y 22 días con lluvia</strong> durante la primera quincena, con una segunda quincena notablemente más despejada,",
        to: "la lluvia de octubre se concentra en la primera quincena y la segunda es notablemente más despejada,",
      },
      {
        from: "cuando el Río Tampaón sube demasiado por lluvias intensas.",
        to: "cuando el río sube demasiado por lluvias intensas.",
      },
      {
        from:
          "los tours organizados desde Ciudad Valles lo ofrecen dentro de paquetes desde <strong>$1,300 MXN por persona</strong>, todo incluido con transporte, desayuno, guía certificado NOM-09 y entradas.",
        to:
          `nuestra ${TAMUL.nombreCorto} lo incluye por <strong>${precioDe(TAMUL)}</strong>, con ${trasladoDe(TAMUL)}, desayuno, guía certificado NOM-09 y entradas.`,
      },
      {
        from: "La entrada cuesta <strong>$150 MXN por persona</strong> en 2026.",
        to: `La entrada cuesta <strong>${D_TAMASOPO.precio_entrada} por persona</strong> en 2026.`,
      },
      {
        from:
          "Los tours guiados de un día salen desde <strong>$1,300 MXN por persona</strong>, con todo incluido: transporte, desayuno, entradas y guía certificado. Las entradas individuales varían: el Sótano de las Golondrinas cuesta <strong>$30 MXN</strong>, el Puente de Dios <strong>$70 MXN</strong> por adulto (gratis para menores de <strong>3 años</strong>), y las Cascadas de Tamasopo <strong>$150 MXN</strong>.",
        to:
          `Los recorridos que cobramos por persona van de <strong>${dinero(PP_MIN)}</strong> a <strong>${dinero(PP_MAX)}</strong>; la ${TAMUL.nombreCorto}, con traslado, desayuno, entradas y guía certificado, cuesta <strong>${dinero(TAMUL.precio)}</strong>. ` +
          `Las entradas individuales varían: el Puente de Dios cuesta <strong>${D_PUENTE.precio_entrada}</strong> y las Cascadas de Tamasopo <strong>${D_TAMASOPO.precio_entrada}</strong>.`,
      },
      {
        from: "los paquetes en pareja arrancan desde <strong>$9,000 MXN</strong>, incluyendo hotel y tours seleccionados.",
        to: `los paquetes en pareja arrancan en <strong>${dinero(PAQ_MIN.precio)}</strong>, con hotel en Xilitla y tours incluidos.`,
      },
      {
        // 🔴 El día 2 metía Tamasopo + Puente de Dios (lo que hace la Ruta
        // Acuática, 11–12 h) MÁS el rafting (7 h, en otra zona): no cabe en
        // un día. El rafting pasa a su propio día.
        from:
          "El segundo día se dedica a Tamasopo: Cascadas de Tamasopo (<strong>$150 MXN</strong> entrada), Puente de Dios (<strong>$70 MXN</strong> adulto) y rafting en el Tampaón (<strong>$1,950 MXN</strong> por persona con traslado y comida incluidos, horario <strong>09:00–18:00</strong>).",
        to:
          `El segundo día se dedica a Tamasopo: el Puente de Dios (<strong>${D_PUENTE.precio_entrada}</strong> de entrada) y las Cascadas de Tamasopo (<strong>${D_TAMASOPO.precio_entrada}</strong>), ` +
          `que es lo que hace nuestra <a href="/tours/${ACUATICA.slug}">${ACUATICA.nombreCorto}</a> si eliges Tamasopo como segunda parada: <strong>${precioDe(ACUATICA)}</strong>, con traslado y entradas. ` +
          `El ${RAFTING.nombreCorto} (<strong>${precioDe(RAFTING)}</strong>, con traslado y comida) dura ${horas(RAFTING)} horas y pide un día aparte.`,
      },
      {
        // Al quitar el Golondrinas el día quedó en Tamtoc, que por ahora
        // abre SOLO los domingos: si no se dice, el lector llega y está cerrado.
        from: "<h3>Día 3: Sótano de las Golondrinas y zona arqueológica</h3>",
        to: "<h3>Día 3: Zona Arqueológica de Tamtoc</h3>",
      },
      {
        from:
          "el Sótano de las Golondrinas (entrada <strong>$30 MXN</strong>), cuya apertura al exterior protege del barro, y la Zona Arqueológica de Tamtoc,",
        to:
          `la Zona Arqueológica de Tamtoc (por ahora abre ${diasDe(D_TAMTOC)}, <strong>${horarioDe(D_TAMTOC)}</strong>; acomoda el viaje para llegar ese día),`,
      },
      {
        from: "<tr><td>Cascada de Tamul (lancha)</td><td>Incluida en tour desde <strong>$1,300 MXN</strong></td>",
        to: `<tr><td>Cascada de Tamul (lancha)</td><td>Incluida en la ${TAMUL.nombreCorto}: <strong>${dinero(TAMUL.precio)}</strong></td>`,
      },
      {
        from: "<tr><td>Cascadas de Tamasopo</td><td><strong>$150 MXN</strong> entrada</td>",
        to: `<tr><td>Cascadas de Tamasopo</td><td><strong>${D_TAMASOPO.precio_entrada}</strong> entrada</td>`,
      },
      {
        from: "<tr><td>Puente de Dios</td><td><strong>$70 MXN</strong> adulto / gratis menores de 3 años</td>",
        to: `<tr><td>Puente de Dios</td><td><strong>${D_PUENTE.precio_entrada}</strong> entrada</td>`,
      },
      {
        from:
          "<tr><td>Sótano de las Golondrinas</td><td><strong>$30 MXN</strong> entrada</td><td>Apto todo octubre; llevar abrigo ligero</td></tr>\n",
        to: "",
      },
      {
        from: "Las Cascadas de Tamasopo y el Sótano de las Golondrinas tienen acceso estable.",
        to: "Las Cascadas de Tamasopo tienen acceso estable.",
      },
      {
        from:
          "Los tours de un día salen desde <strong>$1,300 MXN por persona</strong>, todo incluido: transporte, desayuno, entradas y guía certificado NOM-09. Los paquetes con hotel para dos personas arrancan desde <strong>$9,000 MXN</strong>.",
        to:
          `Los recorridos que cobramos por persona van de <strong>${dinero(PP_MIN)}</strong> a <strong>${dinero(PP_MAX)}</strong>; la ${TAMUL.nombreCorto} cuesta <strong>${dinero(TAMUL.precio)}</strong>, con traslado, desayuno, entradas y guía certificado NOM-09. ` +
          `Los paquetes con hotel para dos personas arrancan en <strong>${dinero(PAQ_MIN.precio)}</strong>.`,
      },
      {
        // La ficha de Tamasopo: "es un lugar tranquilo para ir en familia".
        from: "Para familias, los atractivos más seguros son las Cascadas de Tamasopo y el Sótano de las Golondrinas.",
        to: "Para familias, las Cascadas de Tamasopo son un lugar tranquilo para nadar.",
      },
    ],
    // Tamul primero porque es de lo que trata el artículo; luego los dos del
    // bosque de niebla, que se disfrutan cuando la lluvia empieza a ceder.
    tours: [TAMUL.slug, "amanecer-de-nubes", "olla-de-la-luz"],
    relacionados: [
      "mejor-epoca-para-visitar-la-huasteca-potosina",
      "xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia",
      "cascada-de-tamul-la-guia-definitiva-para-visitarla",
    ],
    actualizado: HOY,
  },

  // ── Cascadas de Minas Viejas ───────────────────────────────────────────────
  // 🔴 Las coordenadas GPS que daba (21°59′N, 99°13′O) caen en las Cascadas de
  // Micos, a hora y media de ahí. Además: un "tour de agencias Micos + Minas
  // Viejas desde $1,589" cuando el nuestro es justo ese; el río Tampaón
  // pasando por El Naranjo; y Micos "a menos de 45 min" de El Naranjo.
  "cascadas-de-minas-viejas-guia-completa": {
    // Era "…joya escondida de la Huasteca Potosina Huasteca Potosina 2026".
    coverImageAlt:
      "Vista aérea de las cascadas de Minas Viejas cayendo sobre su poza turquesa entre la selva, en El Naranjo, San Luis Potosí",
    contentReplace: [
      {
        from: "el sonido constante del río Tampaón hacen",
        to: "el sonido constante del agua hacen",
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours minas viejas Huasteca Potosina">Reserva el tour a minas viejas</a>',
        to: `<a href="/tours/${ESCALONADO.slug}">Reserva el ${ESCALONADO.nombreCorto} (Minas Viejas y Micos)</a>`,
      },
      {
        // Micos está a 20 min de Ciudad Valles y Minas Viejas a 1 h 45: la base
        // para combinarlas es Valles, no El Naranjo.
        from: "El Naranjo también sirve como base para visitar las ",
        to: "desde Ciudad Valles también se visitan las ",
      },
      ...si(
        "ubicadas a menos de <strong>45 minutos</strong> en automóvil.",
        MIN_MICOS === null
          ? null
          : `a <strong>${duracionMin(MIN_MICOS)}</strong> de la ciudad. El ${ESCALONADO.nombreCorto} visita las dos en un solo día.`,
      ),
      {
        from:
          "los tours combinados desde agencias (Micos + Minas Viejas) parten desde <strong>$1,589 MXN por persona</strong> e incluyen transporte, guía y, en algunos casos, el acceso al rappel.",
        to:
          `nuestro ${ESCALONADO.nombreCorto} combina Minas Viejas y Micos en un día por <strong>${precioDe(ESCALONADO)}</strong>, con ${trasladoDe(ESCALONADO)}, desayuno, entradas y guía certificado.`,
      },
      {
        from: "<strong>21°59′N, 99°13′O</strong>",
        to: `<strong>${gradosMinutos(D_MINAS.lat, "N", "S")}, ${gradosMinutos(D_MINAS.lng, "E", "O")}</strong>`,
      },
      {
        // "Desde Ciudad Valles, " se queda: sigue con la respuesta de la ficha.
        from:
          "la distancia a minas viejas es de aproximadamente <strong>90 km</strong> por la carretera federal 70 con dirección a El Naranjo SLP. El recorrido en automóvil toma entre <strong>1 hora y 15 minutos y 1 hora y 30 minutos</strong>, dependiendo del tráfico en el tramo de Ciudad Valles.",
        to: minuscula(respuestaFicha(D_MINAS, 2)),
      },
      {
        from: 'Consulta nuestros <a href="https://www.huasteca-potosina.com/tours">tours de minas viejas</a>',
        to: `Consulta nuestro <a href="/tours/${ESCALONADO.slug}">tour a Minas Viejas y Micos</a>`,
      },
      ...si(
        "~$250 MXN en gasolina / 1h 30 min",
        MIN_MINAS === null ? null : `~$250 MXN en gasolina / ${duracionMin(MIN_MINAS)}`,
      ),
      {
        from: "<td>Desde $1,589 MXN por persona</td>",
        to: `<td>${mayusculaInicial(precioDe(ESCALONADO))} (${ESCALONADO.nombreCorto})</td>`,
      },
      {
        from: "<td>Incluye transporte, guía y acceso; salida desde Ciudad Valles u otros puntos</td>",
        to: `<td>Incluye ${trasladoDe(ESCALONADO)}, desayuno, entradas y guía</td>`,
      },
    ],
    tours: [ESCALONADO.slug],
    relacionados: [
      "cascadas-de-micos-guia-completa-para-tu-visita",
      "siete-cascadas-de-tamasopo-guia-completa",
      "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca",
    ],
    actualizado: HOY,
  },

  // ── Xantolo ────────────────────────────────────────────────────────────────
  // 🔴 Recomendaba tres veces a otra operadora ("Huaxteca, desde MX$1,890")
  // y ponía Xilitla a 1 hora de Ciudad Valles: la ficha dice 90 minutos.
  "xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia": {
    contentReplace: [
      {
        from: "; operadores como Huaxteca ofrecen paquetes desde <strong>MX$1,890 por persona</strong> con impuestos incluidos",
        to: "",
      },
      { from: "; Huaxteca desde <strong>MX$1,890</strong>", to: "" },
      {
        from: " Operadores como Huaxteca ofrecen paquetes desde <strong>MX$1,890</strong> con transporte y guía incluidos.",
        to: "",
      },
      ...si(
        "Xilitla, que también celebra el dia de muertos huasteca con rituales propios, está a <strong>1 hora</strong> de Ciudad Valles.",
        MIN_XILITLA === null
          ? null
          : `Xilitla, que también celebra el dia de muertos huasteca con rituales propios, está a <strong>${duracionMin(MIN_XILITLA)}</strong> de Ciudad Valles.`,
      ),
      ...si(
        "y Xilitla a <strong>1 hora</strong>.",
        MIN_XILITLA === null ? null : `y Xilitla a <strong>${duracionMin(MIN_XILITLA)}</strong>.`,
      ),
      // IA-10: "desde Monterrey, 4 horas". La landing /desde/monterrey dice ~6 en
      // auto hasta Ciudad Valles; el artículo tiene que decir lo mismo.
      ...si(
        "Desde Monterrey, el trayecto es de <strong>4 horas</strong> aproximadamente.",
        MTY_AUTO === null ? null : `Desde Monterrey, el trayecto en auto es de unas <strong>${MTY_AUTO}</strong>.`,
      ),
      ...si(
        "desde Monterrey, <strong>4 horas</strong>.",
        MTY_AUTO === null ? null : `desde Monterrey, unas <strong>${MTY_AUTO}</strong> en auto.`,
      ),
      // 🔴 Anclas (y su `title`) que prometían un "tour de Xantolo" que no
      // existe: ningún recorrido del catálogo está armado alrededor de la
      // fiesta, así que se ofrecen para los días de antes o después.
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours xantolo huasteca potosina Huasteca Potosina">reserva el tour a xantolo huasteca potosina</a>',
        to: '<a href="/tours">Reserva tus tours guiados</a>',
      },
      {
        from:
          'Revisa la oferta en <a href="https://www.huasteca-potosina.com/tours">tours de xantolo huasteca potosina</a> disponibles para noviembre.',
        // 1 oct 2026: decía «nuestros tours no incluyen el Xantolo» (cierto,
        // pero era la única frase comercial y despedía al lector). Lo cierto y
        // útil es que la fiesta no se compra y lo demás sí lo resolvemos.
        to:
          'Las comparsas no necesitan tour: son gratis y en la plaza de cada pueblo. Lo que sí resolvemos es lo demás: hospedaje en Xilitla, traslado desde tu ciudad y <a href="/tours">recorridos guiados</a> para llenar los días.',
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="ver tours Huasteca Potosina">ver tours disponibles en la Huasteca Potosina</a> con guías que trabajan directamente con comunidades tének.',
        to: '<a href="/tours">Ver los recorridos guiados</a> para los días de fiesta o los de antes y después.',
      },
      {
        from: "Los grupos que llevamos cada temporada al dia de muertos huasteca regresan",
        to: "Quienes viven el dia de muertos huasteca regresan",
      },
      {
        from: "Un tour organizado con guía nativo resuelve la logística y garantiza acceso a eventos que no están en ningún mapa.",
        to: "Ir con alguien de la zona resuelve la logística y abre la puerta a eventos que no están en ningún mapa.",
      },
      {
        from: "¿Quieres vivir xantolo huasteca potosina con guía experto?",
        to: "¿Quieres sumar recorridos guiados a tu viaje de Xantolo?",
      },
      // 🔴 Tours y paquetes "de Xantolo" de otras agencias con precios
      // inventados (MX$1,000–2,100, MX$3,200), en la prosa, la tabla y una
      // pregunta frecuente que acaba en el FAQPage. Y "Tamtoc o Tamasopo, de
      // MX$100 a MX$250" cuando sus fichas dicen otra cosa.
      {
        from:
          " —como la zona de Tamtoc o las pozas de Tamasopo— oscilan entre <strong>MX$100 y MX$250 por sitio</strong>.",
        to:
          ` tienen su propia entrada: en la Zona Arqueológica de Tamtoc, que por ahora abre ${diasDe(D_TAMTOC)}, es ${TAMTOC_ENTRADA}, y en las Cascadas de Tamasopo, de <strong>${D_TAMASOPO.precio_entrada}</strong>.`,
      },
      {
        from:
          "Si prefieres un tour organizado desde Ciudad Valles que incluya transporte, guía bilingüe y acceso a comunidades, los precios en 2026 van de <strong>MX$1,000 a MX$2,100 por persona</strong>. Los paquetes de dos días con hospedaje en municipio incluido alcanzan los <strong>MX$3,200 por persona</strong> en temporada alta de Xantolo, y se agotan con frecuencia antes del 15 de octubre.",
        to:
          `Las comparsas y los altares públicos son gratis: la fiesta no se compra. Lo que sí te ayudamos a armar es el resto del viaje: los recorridos que se cobran por persona van de <strong>${dinero(PP_MIN)}</strong> a <strong>${dinero(PP_MAX)}</strong>, ` +
          `y los paquetes con hotel en Xilitla, ${PAQ_RANGO}.`,
      },
      {
        from:
          "<tr><td>Tour organizado desde Ciudad Valles</td><td><strong>MX$1,000–2,100 p/p</strong></td><td>Incluye transporte, guía y acceso a comunidades</td></tr>",
        to: "",
      },
      {
        from:
          "Los tours organizados desde Ciudad Valles cuestan entre <strong>MX$1,000 y MX$2,100 por persona</strong>.",
        to:
          `Ver la fiesta no cuesta; si quieres sumar recorridos guiados, los que se cobran por persona van de <strong>${dinero(PP_MIN)}</strong> a <strong>${dinero(PP_MAX)}</strong>.`,
      },
      {
        from: 'alt="xantolo huasteca potosina dia de muertos guía viaje Huasteca Potosina"',
        to: 'alt="Mujer ofreciendo humo de copal con un sahumerio de barro frente a un grupo con velas encendidas durante una velación de muertos"',
      },
    ],
    tours: ["ruta-surrealista-edward-james", GRUTA.slug],
    relacionados: [
      "cultura-huasteca-potosina-cultura-huasteca-tradiciones-music",
      "la-huasteca-potosina-en-octubre-clima-rios-y-que-esperar",
      "historia-de-xilitla-mitos-y-leyendas-de-xilitla-el-misticismo-de-la-hu",
    ],
    actualizado: HOY,
  },

  // ── Siete Cascadas de Tamasopo ─────────────────────────────────────────────
  // 🔴 El "parque municipal" del que habla es el de las Cascadas de Tamasopo, y
  // lo daba a $200 (con INAPAM a $150) abierto de 8 am a 6 pm: su ficha dice
  // $60 y de 08:00 a 17:00, y el artículo de octubre ya dice $60, así que el
  // blog se contradecía a sí mismo. De la Hacienda los Gómez (las Siete
  // Cascadas) daba "$100 de entrada independiente"; su ficha, que se pinta a
  // media página, dice que se visita con guía y equipo y que la tarifa se
  // consulta. Los totales ($300, $750) se armaban con esas cifras y se quitan.
  // Además: anclas genéricas ("reserva el tour a siete cascadas tamasopo") →
  // el recorrido que de verdad pasa por ahí.
  "siete-cascadas-de-tamasopo-guia-completa": {
    coverImageAlt:
      "Una de las Cascadas de Tamasopo cayendo sobre su poza turquesa, entre árboles y raíces, en la Huasteca Potosina",
    contentReplace: [
      {
        from:
          "En 2026, la entrada al parque principal cuesta <strong>$200 MXN</strong> por persona, mientras que la Hacienda Gómez —donde se concentran las siete caídas privadas— cobra <strong>$100 MXN</strong> adicionales;",
        to:
          `En 2026, la entrada al parque principal cuesta <strong>${D_TAMASOPO.precio_entrada}</strong> por persona, mientras que la Hacienda Gómez —donde se concentran las siete caídas— se paga aparte y ahí los saltos van con guía y equipo;`,
      },
      {
        from:
          "El acceso cuesta <strong>$200 MXN</strong> por persona en 2026 y el estacionamiento <strong>$100 MXN</strong> por vehículo; adultos mayores con credencial INAPAM pagan <strong>$150 MXN</strong>. El horario de operación es de <strong>8:00 am a 6:00 pm</strong>, con último acceso a las <strong>4:00 pm</strong>.",
        to:
          `El acceso cuesta <strong>${D_TAMASOPO.precio_entrada}</strong> por persona en 2026 y el estacionamiento se paga aparte. El parque abre ${diasDe(D_TAMASOPO)} <strong>${horarioDe(D_TAMASOPO)}</strong>.`,
      },
      {
        from:
          "La entrada independiente cuesta <strong>$100 MXN</strong> por persona más <strong>$50 MXN</strong> de estacionamiento;",
        to: "Los saltos de poza en poza se hacen siempre con chaleco, casco y guía, y la tarifa se consulta en la entrada;",
      },
      {
        from:
          "entrada al parque municipal <strong>$200 MXN</strong> por persona (<strong>$150 MXN</strong> con INAPAM), estacionamiento parque <strong>$100 MXN</strong>, entrada Hacienda los Gomez <strong>$100 MXN</strong> por persona y estacionamiento adicional <strong>$50 MXN</strong>.",
        to:
          `entrada al parque municipal <strong>${D_TAMASOPO.precio_entrada}</strong> por persona, más el estacionamiento; en la Hacienda los Gomez la visita va con guía y equipo, y la tarifa se consulta allí.`,
      },
      {
        from: "el precio parte desde <strong>$1,600 MXN</strong> por persona",
        to: `el precio es de <strong>${precioDe(ACUATICA)}</strong>`,
      },
      {
        from: "<td>Desde <strong>$1,600 MXN</strong> / <strong>día completo</strong></td>",
        to: `<td><strong>${mayusculaInicial(precioDe(ACUATICA))}</strong> / <strong>día completo</strong></td>`,
      },
      {
        from:
          "la entrada cuesta <strong>$200 MXN</strong> en 2026. La Hacienda los Gomez es un predio privado adyacente donde se ubican las siete caídas escalonadas más fotogénicas, con entrada separada de <strong>$100 MXN</strong>.",
        to:
          `la entrada cuesta <strong>${D_TAMASOPO.precio_entrada}</strong> en 2026. La Hacienda los Gomez es un predio privado adyacente donde se ubican las siete caídas escalonadas más fotogénicas; se entra aparte, los saltos van con chaleco, casco y guía, y la tarifa se consulta allí.`,
      },
      {
        from:
          "<p>Si visitas ambos accesos, el costo por persona en 2026 es: <strong>$200 MXN</strong> parque municipal + <strong>$100 MXN</strong> Hacienda los Gomez = <strong>$300 MXN</strong> en entradas. El estacionamiento suma <strong>$100 MXN</strong> en el parque y <strong>$50 MXN</strong> en la hacienda si entras con vehículo propio a ambos. Total estimado por vehículo con dos adultos: <strong>$750 MXN</strong>.</p>",
        to:
          `<p>El parque municipal cobra <strong>${D_TAMASOPO.precio_entrada}</strong> por persona, y el estacionamiento se paga aparte en cada acceso. En la Hacienda los Gomez los saltos van con guía y equipo, y la tarifa se consulta allí. ` +
          `Si prefieres no sumar cuentas, la ${ACUATICA.nombreCorto} cuesta <strong>${precioDe(ACUATICA)}</strong> con el Puente de Dios, traslado, entradas y guía incluidos.</p>`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours siete cascadas tamasopo Huasteca Potosina">reserva el tour a siete cascadas tamasopo</a>',
        to: `<a href="/tours/${ACUATICA.slug}">reserva la ${ACUATICA.nombreCorto} al Puente de Dios y las Siete Cascadas</a>`,
      },
      {
        from: '<a href="https://www.huasteca-potosina.com/tours">ver tours de siete cascadas tamasopo</a>',
        to: `<a href="/tours/${ACUATICA.slug}">ver la ${ACUATICA.nombreCorto}</a>`,
      },
    ],
    tours: [ACUATICA.slug],
    relacionados: [
      "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca",
      "cascadas-de-minas-viejas-guia-completa",
      "cascadas-de-micos-guia-completa-para-tu-visita",
    ],
    actualizado: HOY,
  },

  // ── Mejor época para visitar la Huasteca Potosina ──────────────────────────
  // 🔴 Su `schemaMarkup` guardado es un FAQPage con `headline`, `datePublished`
  // y `articleSection` (campos que un FAQPage no admite) y una fecha distinta a
  // la de publicación. Las preguntas sí estaban en la página, pero como lista
  // de definiciones (`<dl>`), que `extractFAQs` no lee: se pasan a `<details>`
  // —el mismo formato que el resto del blog— y el FAQPage lo arma la plantilla
  // con lo que se ve.
  "mejor-epoca-para-visitar-la-huasteca-potosina": {
    omitirSchemaGuardado: true,
    contentReplace: [
      { from: "<dl>", to: '<div class="faq">' },
      { from: "</dl>", to: "</div>" },
      { from: "<dt>", to: "<details><summary>" },
      { from: "</dt>", to: "</summary>" },
      { from: "<dd>", to: "<p>" },
      { from: "</dd>", to: "</p></details>" },
    ],
    // La Olla de la Luz primero: su ficha dice que la época seca (nov–may) es
    // la buena para los caminos del bosque, que es justo lo que recomienda el
    // artículo.
    tours: ["olla-de-la-luz", "amanecer-de-nubes", TAMUL.slug],
    relacionados: [
      "la-huasteca-potosina-en-octubre-clima-rios-y-que-esperar",
      "mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par",
      "cuanto-cuesta-huasteca-potosina",
    ],
  },

  // ══ Precios de NUESTROS productos en el resto del blog (28 sep 2026) ═══════
  //
  // 🔴 Lo mismo que en los ocho de arriba, en los artículos que no habían
  // entrado: el agente inventaba tours y paquetes con precio ("Jardín
  // Surrealista + Sótano de las Huahuas desde $1,459", "paquetes de 3 días
  // desde $8,890 por persona", "tour combinado Tamtoc + Taninul $3,245") y
  // citaba a otras operadoras (Yumping, Viator). Varios estaban DENTRO del
  // FAQPage, que es lo que leen los buscadores de IA como dato del negocio.
  // Cada precio nuestro sale ahora del catálogo; las entradas de terceros se
  // alinean con la ficha del lugar SOLO donde el artículo la pinta a media
  // página (`blogDestinoMap`), porque ahí se contradecía a la vista.

  // ── Opiniones (Paraíso) ────────────────────────────────────────────────────
  // Rappel a "$2,003" (cuesta otra cosa), el combo inventado y un "paddleboard
  // en Huichihuayán, $1,800" que no está en el catálogo. Y una encuesta de
  // satisfacción del "94 %" que nadie hizo, dentro del FAQPage. Los
  // testimonios se quedan (decisión de Manolo): se quita solo la cifra.
  "opiniones-resena-lo-que-dicen-nuestros-huespedes-de-paraiso": {
    contentReplace: [
      {
        from: "El precio en 2026 es de <strong>$2,003 MXN por persona</strong>, impuestos incluidos.",
        to: `El ${RAPPEL.nombreCorto} cuesta <strong>${precioDe(RAPPEL)}</strong>.`,
      },
      {
        from:
          "El Tour Xilitla + Sótano de las Huahuas cuesta <strong>$1,459 MXN</strong> por persona y el de paddleboard en Huichihuayán, <strong>$1,800 MXN</strong>.",
        to: `${POZAS_Y_HUAHUAS}.`,
      },
      {
        from: "como el de Tamul con rappel (<strong>$2,003 MXN</strong>),",
        to: `como el ${RAPPEL.nombreCorto} (<strong>${dinero(RAPPEL.precio)}</strong>),`,
      },
      {
        from:
          "El tour más solicitado según testimonios recientes es el de Tamul con rappel, con un costo de <strong>$2,003 MXN por persona</strong>. El Tour Xilitla + Sótano de las Huahuas cuesta <strong>$1,459 MXN</strong> y el de paddleboard en Huichihuayán, <strong>$1,800 MXN</strong>. Todos incluyen impuestos en 2026.",
        to: `El ${RAPPEL.nombreCorto} cuesta <strong>${precioDe(RAPPEL)}</strong>. ${POZAS_Y_HUAHUAS}.`,
      },
      {
        from:
          " En 2026, el <strong>94%</strong> de los viajeros encuestados calificó la <strong>calidad en el servicio</strong> como excelente o muy buena.",
        to: "",
      },
    ],
    tours: [RAPPEL.slug, SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Itinerario de 3 días por la Huasteca ───────────────────────────────────
  // "Paquetes de 3 días / 2 noches desde $8,890 por persona" (el nuestro de 3
  // días es por PAREJA y cuesta otra cosa) y un "paquete Tamtoc + aguas
  // termales desde $3,245" que no existe. La Cueva del Agua sí va en un tour
  // nuestro: es la parada de regreso de la Expedición Tamul.
  "itinerario-huasteca-potosina-3-dias-3-dias-en-la-huasteca-po": {
    contentReplace: [
      {
        from:
          "; este sitio se incluye en los paquetes organizados de <strong>$8,890 MXN</strong> por persona (3 días / 2 noches).",
        to:
          `; es la parada de regreso de la <a href="/tours/${TAMUL.slug}">${TAMUL.nombreCorto}</a>, que por <strong>${precioDe(TAMUL)}</strong> incluye también la cascada y el Sótano de las Huahuas.`,
      },
      {
        from:
          "Los tours de 3 días / 2 noches parten desde <strong>$8,890 MXN</strong> por persona. Existe además un paquete adicional con la zona arqueológica Tamtok y aguas termales desde <strong>$3,245 MXN</strong> pp.",
        to: `${mayusculaInicial(PAQ_CORTO_FRASE)}.`,
      },
      {
        from:
          "Los paquetes desde <strong>$8,890 MXN</strong> incluyen transporte, guía y algunos accesos, lo que simplifica la logística.",
        to:
          `Nuestros paquetes con hotel, ${PAQ_RANGO}, ${PAQ_INCLUYE}, lo que simplifica la logística.`,
      },
    ],
    tours: [TAMUL.slug],
    actualizado: HOY,
  },

  // ── Mejor temporada para ir a Xilitla ──────────────────────────────────────
  // Los mismos "$8,890 por persona" y un "$3,245 fuera de temporada" que no es
  // ningún paquete; el segundo, dentro de la respuesta del FAQPage.
  "mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par": {
    contentReplace: [
      {
        from:
          "Los paquetes de 3 días y 2 noches parten desde <strong>$8,890 MXN</strong> por persona en temporada alta y desde <strong>$3,245 MXN</strong> fuera de temporada.",
        to: `${mayusculaInicial(PAQ_CORTO_FRASE)}.`,
      },
      {
        from:
          "Los paquetes completos de 3 días y 2 noches en la Huasteca Potosina arrancan desde <strong>$8,890 MXN</strong> por persona en temporada alta.",
        to: `${mayusculaInicial(PAQ_CORTO_FRASE)}.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Equipaje para la selva ─────────────────────────────────────────────────
  "equipaje-que-llevar-en-tu-maleta-para-la-selva-potosina-checklist": {
    contentReplace: [
      {
        // "Paquetes de agencia local de $450–$850" no son de nadie.
        from:
          "Los paquetes de agencia local que incluyen <strong>3 o 4 atractivos por día</strong> tienen un costo de entre <strong>$450 y $850 MXN por persona</strong> en <strong>2026</strong>, mientras que los paquetes de <strong>3 días y 2 noches</strong> parten desde <strong>$8,890 MXN</strong> por persona.",
        to: `${mayusculaInicial(RANGO_TOURS)}, y ${PAQ_CORTO_FRASE}.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Huasteca con niños ─────────────────────────────────────────────────────
  // "Paquete 1, 2 y 3" de $1,530, $3,245 y $6,490 y un "tour familiar de 3
  // días" a $4,190 por adulto con tramos de menor (7–16, 3–7) que no son los
  // del motor de cobro (6–10 y menores de 6). Todo en el FAQPage también.
  "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta": {
    contentReplace: [
      {
        from:
          "Los paquetes de tour vigentes en 2026 para <strong>huasteca potosina con niños</strong> están diseñados para distintos presupuestos. El <strong>Paquete 1</strong> parte desde <strong>$1,530 MXN por persona</strong>; el <strong>Paquete 2</strong> desde <strong>$3,245 MXN</strong>; y el <strong>Paquete 3</strong> desde <strong>$6,490 MXN</strong>. Para el tour de 3 días en mayo 2026, el precio de adulto es <strong>$4,190 MXN</strong>, el de menores entre 7 y 16 años es <strong>$3,200 MXN</strong>, y los niños de 3 a 7 años tienen tarifa especial desde <strong>$990 MXN</strong>.",
        to:
          `Para recorrer la <strong>huasteca potosina con niños</strong> con nosotros hay dos formas. ${mayusculaInicial(RANGO_TOURS)} por adulto; ${NINOS_FRASE}. ` +
          `Los paquetes con hotel en Xilitla, ${PAQ_DIAS_RANGO}, van ${PAQ_RANGO}; para familias armamos la cotización a su medida.`,
      },
      { from: "¿Cuánto cuesta el tour familiar de 3 días en 2026?", to: "¿Cuánto cuesta viajar en familia con tours guiados en 2026?" },
      {
        from:
          "El tour de 3 días cuesta $4,190 MXN por adulto, $3,200 MXN por menor de 7 a 16 años y desde $990 MXN para niños de 3 a 7 años. Los paquetes generales parten desde $1,530 MXN por persona según el recorrido elegido.",
        to:
          `Los recorridos de un día que se cobran por persona van de ${dinero(PP_MIN)} a ${dinero(PP_MAX)} por adulto; ${NINOS_FRASE}. ` +
          `Los paquetes con hotel en Xilitla van de ${dinero(precioVisible(PAQ_MIN))} a ${dinero(precioVisible(PAQ_MAX))} ${PAQ_UNIDAD}, y para familias armamos la cotización a su medida.`,
      },
    ],
    actualizado: HOY,
  },

  // ── Xilitla con niños ──────────────────────────────────────────────────────
  // "Los grupos familiares que llevamos prefieren los paquetes de 5 días desde
  // Ciudad Valles, con 4 noches en hoteles de 3 estrellas y 5 excursiones con
  // comida": no es ninguno de los nuestros (el hotel es en Xilitla y el precio
  // es por pareja). También en el FAQPage.
  "xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando": {
    contentReplace: [
      {
        from:
          "Los grupos familiares que llevamos cada temporada prefieren los paquetes de <strong>5 días desde Ciudad Valles</strong>, que incluyen <strong>4 noches de alojamiento en hoteles de categoría 3 estrellas o superior</strong>, desayunos, <strong>5 excursiones con comida</strong>, guías especializados y entradas a todos los sitios. Estos tours están diseñados para niños a partir de <strong>6 años</strong>.",
        to:
          `Si prefieres que te armemos el viaje, nuestros paquetes con hotel en Xilitla, ${PAQ_DIAS_RANGO}, van ${PAQ_RANGO} e ${PAQ_INCLUYE}. ` +
          `Para familias armamos la cotización a su medida. En los tours de un día, ${NINOS_FRASE}.`,
      },
      {
        from:
          "El paquete de <strong>5 días desde Ciudad Valles</strong> cubre alojamiento en <strong>hoteles familiares</strong> con desayuno incluido, entradas a Las Pozas (<strong>$120 niños / $180 adultos</strong> en taquilla), guía obligatorio en español (<strong>$30 pesos adicionales por persona</strong>) y traslados entre destinos.",
        to:
          "En Las Pozas, la entrada en taquilla es de <strong>$120 niños / $180 adultos</strong>, más el guía obligatorio en español (<strong>$30 pesos adicionales por persona</strong>). " +
          `Nuestros paquetes ${PAQ_INCLUYE}.`,
      },
      {
        from:
          "Los paquetes de <strong>5 días desde Ciudad Valles</strong> incluyen alojamiento en hoteles familiares, desayunos, excursiones y entradas en un solo precio.",
        to: `Nuestros paquetes con hotel en Xilitla, ${PAQ_DIAS_RANGO}, van ${PAQ_RANGO}; para familias armamos la cotización a su medida.`,
      },
    ],
    actualizado: HOY,
  },

  // ── Tamtoc ─────────────────────────────────────────────────────────────────
  // La ficha, que se pinta a media página, dice "domingos gratis (mexicanos) ·
  // extranjeros ~$95"; el artículo, "$75 general". Y vendía un "tour combinado
  // Tamtoc + Taninul desde $3,245 con alojamiento" que no existe.
  "zona-arqueologica-tamtoc-zona-arqueologica-de-tamtoc-histori": {
    contentReplace: [
      {
        from: "La entrada general cuesta <strong>$75 MXN</strong> y los domingos es completamente gratuita para todos los mexicanos.",
        to: `La entrada es ${TAMTOC_ENTRADA}, y por ahora el sitio abre ${diasDe(D_TAMTOC)}.`,
      },
      {
        from: "La entrada general a la <strong>zona arqueologica tamtoc</strong> cuesta <strong>$75 MXN</strong>.",
        to: `La entrada a la <strong>zona arqueologica tamtoc</strong> es ${TAMTOC_ENTRADA}.`,
      },
      {
        from:
          "Para quienes prefieren un paquete completo, el tour combinado Tamtoc + Taninul parte desde <strong>$3,245 MXN por persona</strong> e incluye alojamiento, comida y snack. ",
        to: "",
      },
      {
        from: "La entrada general cuesta <strong>$75 MXN</strong>. Es gratuita",
        to: `La entrada es ${TAMTOC_ENTRADA}. Es gratuita`,
      },
      {
        from: " El tour combinado Tamtoc + Taninul cuesta desde <strong>$3,245 MXN por persona</strong> con alojamiento y comida incluidos.",
        to: "",
      },
    ],
    actualizado: HOY,
  },

  // ── Boletos de Las Pozas ───────────────────────────────────────────────────
  // Daba $125 (y $60 reducida) junto a la ficha del jardín, que dice $180; la
  // meta repetía "desde $125". Y una "excursión desde Ciudad Valles desde
  // $1,532" que es el combo inventado.
  "boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james": {
    metaDescription:
      `Todo sobre boletos las pozas en 2026: entrada de ${D_POZAS.precio_entrada} por adulto, horarios, tips de entrada y cómo llegar al Jardín de Edward James.`,
    contentReplace: [
      {
        from:
          "La tarifa de entrada al Jardín Surrealista de Edward James es de <strong>$125 MXN</strong> por persona en <strong>2026</strong>. Existe también una tarifa reducida de <strong>$120 MXN</strong>. Los adultos mayores de <strong>65 años</strong> con credencial INAPAM y los niños de <strong>6 a 12 años</strong> pagan <strong>$60 MXN</strong>.",
        to: `La entrada al Jardín Surrealista de Edward James cuesta <strong>${D_POZAS.precio_entrada}</strong> por adulto en <strong>2026</strong>.${POZAS_REDUCIDA_FRASE}`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours boletos las pozas Huasteca Potosina">reserva el tour a boletos las pozas</a> con todo incluido para evitar cargos imprevistos en taquilla.',
        to: `<a href="/tours/${SURREALISTA.slug}">Reserva la ${SURREALISTA.nombreCorto}</a>, con la entrada incluida, para evitar cargos imprevistos en taquilla.`,
      },
      {
        from:
          "Quienes viajan desde Ciudad Valles pueden contratar una excursión al Jardín Surrealista de Edward James desde <strong>$1,532 MXN por persona</strong>, impuestos incluidos. Esta modalidad combina transporte, guía y acceso en un solo pago,",
        to: `Si prefieres ir con guía, ${SURREALISTA_FRASE}. Combina transporte, guía y acceso en un solo pago,`,
      },
      {
        from:
          "La entrada general cuesta <strong>$125 MXN</strong> por persona. Adultos mayores con INAPAM y niños de 6 a 12 años pagan <strong>$60 MXN</strong>.",
        to: `La entrada cuesta <strong>${D_POZAS.precio_entrada}</strong> por adulto.${POZAS_REDUCIDA_FRASE}`,
      },
      {
        from: "También puedes contratar una excursión organizada desde <strong>$1,532 MXN por persona</strong> con transporte y acceso incluidos.",
        to: `También puedes ir con nosotros: ${SURREALISTA_FRASE}.`,
      },
      alDia("mayo de 2026"),
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Las Pozas ──────────────────────────────────────────────────────────────
  // Los $170 en línea / $180 en taquilla NO son un error: es lo que marca la
  // ficha para taquilla. Lo inventado era la "excursión desde Ciudad Valles con
  // el jardín, el pueblo y el Sótano de las Huahuas desde $1,459".
  "las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece": {
    contentReplace: [
      {
        from:
          "Si prefieres llegar en grupo organizado, hay excursiones desde Ciudad Valles que incluyen el jardín de Edward James, el pueblo de Xilitla y el Sótano de las Huahuas desde <strong>$1,459 MXN por persona</strong>, impuestos incluidos.",
        to: `Si prefieres ir con guía, ${SURREALISTA_FRASE}.`,
      },
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Puente de Dios ─────────────────────────────────────────────────────────
  // "Menos de $50" y "$40–$50" contra la ficha del mismo artículo.
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca": {
    contentReplace: [
      {
        from: "El acceso tiene un costo de entrada menor a <strong>$50 MXN</strong> por persona en 2026",
        to: `La entrada cuesta <strong>${D_PUENTE.precio_entrada}</strong> por persona en 2026`,
      },
      {
        from: "entrada al parque <strong>~$40–$50 MXN</strong>",
        to: `entrada al parque <strong>${D_PUENTE.precio_entrada}</strong>`,
      },
      {
        from: "La entrada cuesta entre <strong>$40 y $50 MXN</strong> por persona.",
        to: `La entrada cuesta <strong>${D_PUENTE.precio_entrada}</strong> por persona.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Cascada Los Comales ────────────────────────────────────────────────────
  // "$75 pesos (~$5 USD), todos los días de 8 a 6": la ficha que se pinta
  // en el artículo dice cuota local de ~$20, que cierra en martes y que precio
  // y horario no están publicados.
  "cascada-los-comales-mas-alla-del-castillo-3-cascadas-secretas-cerca-de": {
    contentReplace: [
      {
        from: "accesible todos los días con entrada de <strong>$75 pesos</strong> por persona",
        to: `con ${COMALES_ENTRADA} por persona`,
      },
      {
        from:
          "La entrada tiene un costo de <strong>$75 pesos (~$5 USD)</strong> por persona y el horario de visita va de <strong>8:00 am a 6:00 pm</strong> todos los días del año, incluyendo fines de semana y festivos en 2026.",
        to: `La entrada es ${COMALES_ENTRADA} por persona y se visita de día; ${minuscula(D_COMALES.dias_abierto)}. ${COMALES_AVISO}`.trim(),
      },
      {
        from:
          "cuesta <strong>$75 pesos</strong> por persona (tarifa vigente en 2026), pagados directamente en la taquilla sin reserva previa.",
        to: `es ${COMALES_ENTRADA} por persona, que se paga en el acceso sin reserva previa.`,
      },
      {
        from: "el gasto total por persona ronda los <strong>$200–$250 pesos</strong> entre ambos accesos.",
        to: `suma la entrada del jardín, de <strong>${D_POZAS.precio_entrada}</strong> por adulto.`,
      },
      {
        from: "La entrada cuesta <strong>$75 pesos (~$5 USD)</strong> por persona, pagada directamente en taquilla.",
        to: `La entrada es ${COMALES_ENTRADA} por persona, pagada en el acceso.`,
      },
      {
        from: "No se requiere reserva previa y el acceso está abierto todos los días de <strong>8:00 am a 6:00 pm</strong>.",
        to: `No se requiere reserva previa; se visita de día y ${minuscula(D_COMALES.dias_abierto)}.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Sótano de las Golondrinas ──────────────────────────────────────────────
  // "Guía comunitario desde $250" contra la ficha ($100), y "tours de $100 a
  // $1,500" que no son de nadie. No lo operamos (ver `temporada.ts`).
  "sotano-de-las-golondrinas-la-cueva-mas-profunda-de-mexico": {
    contentReplace: [
      {
        from:
          "El acceso con guía comunitario parte desde <strong>$250 MXN</strong> por persona, y los tours completos van de <strong>$100 a $1,500 MXN</strong> según lo que incluyan.",
        to: `La entrada cuesta <strong>${D_GOLONDRINAS.precio_entrada}</strong> por persona.`,
      },
      {
        from:
          "El acceso con guía comunitario cuesta desde <strong>$250 MXN</strong> por persona. Los tours con transporte, entrada, guía y alimentos oscilan entre <strong>$100 y $1,500 MXN</strong> por persona según el nivel de servicio.",
        to:
          `La entrada cuesta <strong>${D_GOLONDRINAS.precio_entrada}</strong> por persona. No va en nuestros recorridos: la <a href="/tours/${TAMUL.slug}">${TAMUL.nombreCorto}</a> cierra en el Sótano de las Huahuas.`,
      },
      {
        from:
          "El acceso con guía comunitario parte desde <strong>$250 MXN</strong> por persona. Los tours con transporte, guía y alimentos van de <strong>$100 a $1,500 MXN</strong>.",
        to: `La entrada cuesta <strong>${D_GOLONDRINAS.precio_entrada}</strong> por persona.`,
      },
    ],
    actualizado: HOY,
  },

  // ── Golondrinas vs Huahuas ─────────────────────────────────────────────────
  "sotano-de-las-golondrinas-vs-sotano-de-las-huahuas-cual-visitar": {
    contentReplace: [
      {
        from:
          'el acceso con guía comunitario cuesta desde <strong>$250 MXN por persona</strong>, y los tours con transporte, guía y alimentos oscilan entre <strong>$100 y $1,500 MXN</strong> según el nivel de servicio. <a href="https://www.huasteca-potosina.com/tours" title="tours sótano de las golondrinas Huasteca Potosina">reserva el tour a sótano de las golondrinas</a> con anticipación, especialmente en temporada alta.',
        to:
          `la entrada al sótano de las golondrinas cuesta <strong>${D_GOLONDRINAS.precio_entrada}</strong> por persona. No va en nuestros recorridos: la <a href="/tours/${TAMUL.slug}">${TAMUL.nombreCorto}</a> cierra en el Sótano de las Huahuas.`,
      },
      {
        from:
          "<tr><td>Tour organizado con transporte incluido</td><td>$100–$1,500 MXN todo incluido</td><td>Incluye guía, traslado y en algunos casos alimentos; reserva anticipada</td></tr>",
        to: "",
      },
      {
        from:
          "El acceso con guía comunitario cuesta desde <strong>$250 MXN por persona</strong>. Los tours con transporte, guía y alimentos van de <strong>$100 a $1,500 MXN</strong> según el servicio.",
        to: `La entrada al Sótano de las Golondrinas cuesta <strong>${D_GOLONDRINAS.precio_entrada}</strong> por persona.`,
      },
      {
        // Mandaba a "tours de sótano de las golondrinas" que no tenemos.
        from:
          'es más práctico contratar <a href="https://www.huasteca-potosina.com/tours">tours de sótano de las golondrinas</a> que incluyan logística completa desde tu punto de origen.',
        to: "conviene llegar la noche anterior: el ejido permite acampar con autorización previa.",
      },
      alDia("agosto de 2026"),
    ],
    tours: [TAMUL.slug],
    actualizado: HOY,
  },

  // ── Xilitla en pareja ──────────────────────────────────────────────────────
  // Paquetes "de $9,000 a $15,500" con "cena romántica de cortesía" y tours de
  // un día "de $1,300 a $1,850": ninguno es del catálogo. Y "tours con cena
  // incluida", que no hay. Y una ocupación "de más del 85 %" que no sale de
  // ningún dato: escasez inventada.
  "xilitla-en-pareja-escapada-romantica-planes-para-parejas-en-la-huastec": {
    contentReplace: [
      {
        from:
          "Los paquetes para dos personas en la Huasteca Potosina oscilan entre <strong>$9,000 y $15,500 MXN por pareja</strong> para estadías de 3 a 5 días con hotel y tours incluidos",
        to: `Nuestros paquetes para dos, con hotel en Xilitla y tours incluidos, van ${PAQ_RANGO} para estadías ${PAQ_DIAS_RANGO}`,
      },
      {
        from:
          "Los paquetes de hotel para parejas en Xilitla arrancan desde <strong>$9,000 MXN por pareja</strong> para 3 noches con desayunos incluidos y subida al jardín, y pueden llegar hasta <strong>$15,500 MXN</strong> en la versión de 5 días con tours guiados, traslados y una cena romántica de cortesía.",
        to:
          `Nuestros paquetes con hotel en Xilitla van de <strong>${dinero(precioVisible(PAQ_MIN))}</strong> (${PAQ_MIN.nombre}, ${PAQ_MIN.dias} días) a <strong>${dinero(precioVisible(PAQ_MAX))}</strong> (${PAQ_MAX.nombre}, ${PAQ_MAX.dias} días) ${PAQ_UNIDAD}, e ${PAQ_INCLUYE}.`,
      },
      {
        from:
          " Según operadores locales, la ocupación en hoteles boutique de Xilitla supera el <strong>85% los fines de semana de octubre y noviembre de 2026</strong>, cuando el clima es más estable y la vegetación alcanza su máximo esplendor.",
        to: "",
      },
      {
        from:
          "Los precios por persona oscilan entre <strong>$1,300 y $1,850 MXN</strong> en tours de un día con transporte, desayuno, entradas y guía certificado incluidos.",
        to: `${mayusculaInicial(RANGO_TOURS)}, según lo que incluya cada uno.`,
      },
      {
        from:
          "<tr><td>Paquete todo incluido (1 día)</td><td>$1,300–$1,850 MXN/persona</td><td>Transporte, desayuno, entradas y guía certificado; ideal para quienes viajan desde SLP o Valles</td></tr>",
        to:
          `<tr><td>Tour guiado de un día</td><td>${dinero(PP_MIN)}–${dinero(PP_MAX)}/persona</td><td>Según el recorrido; ${CON_TRASLADO.length} de los ${TOURS_DB.length} incluyen traslado desde tu hospedaje</td></tr>`,
      },
      {
        from:
          "Los paquetes completos de 3 a 5 días oscilan entre <strong>$9,000 y $15,500 MXN</strong> con tours, traslados y hotel incluidos.",
        to: `Nuestros paquetes ${PAQ_DIAS_RANGO}, con hotel en Xilitla, tours y el transporte a cada uno, van ${PAQ_RANGO}.`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="ver tours Huasteca Potosina">Ver tours disponibles en la Huasteca Potosina</a> con cena incluida.',
        to: '<a href="https://www.huasteca-potosina.com/tours" title="ver tours Huasteca Potosina">Ver tours disponibles en la Huasteca Potosina</a>.',
      },
      alDia("julio de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Café de altura: de la planta a la taza ─────────────────────────────────
  // "Tours de un día todo incluido de $1,300 a $1,850": el que sube a los
  // cafetales es la Travesía del Café, y cuesta otra cosa.
  "altura-la-tradicion-del-cafe-en-xilitla-de-la-planta-a-tu-taza": {
    contentReplace: [
      {
        from: "los tours de un día con todo incluido rondan entre <strong>$1,300 y $1,850 MXN por persona</strong>,",
        to: `nuestra <a href="/tours/${CAFE.slug}">${CAFE.nombreCorto}</a>, que sube a los cafetales, cuesta <strong>${precioDe(CAFE)}</strong>,`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours café de altura Huasteca Potosina">Reserva el tour a café de altura</a> con transporte incluido si no viajas en vehículo propio.',
        to: `<a href="/tours/${CAFE.slug}">Reserva la ${CAFE.nombreCorto}</a>, con ${trasladoDe(CAFE)}, si no viajas en vehículo propio.`,
      },
      {
        from: "Los tours de un día con guía certificado cuestan entre <strong>$1,300 y $1,850 MXN por persona</strong> todo incluido.",
        to: `La ${CAFE.nombreCorto} cuesta <strong>${precioDe(CAFE)}</strong>, con ${trasladoDe(CAFE)}, recorrido guiado por el cafetal y cata de café.`,
      },
      alDia("agosto de 2026"),
    ],
    tours: [CAFE.slug],
    actualizado: HOY,
  },

  // ── Café de altura en Xilitla ──────────────────────────────────────────────
  // El combo de $1,459 (también en el FAQPage) y cuatro enlaces a artículos
  // que nunca existieron (IDX-6: 404 los cuatro).
  "cafe-de-altura-xilitla": {
    contentReplace: [
      {
        from:
          "La forma más práctica de llegar a los cafetales sin complicaciones logísticas es a través de las operadoras turísticas que salen desde Ciudad Valles. Los <strong>tours de café de altura</strong> disponibles en 2026 combinan la visita a las plantaciones con otros puntos de interés de Xilitla, incluyendo el famoso ",
        to:
          `La forma más práctica de llegar a los cafetales sin complicaciones logísticas es con un recorrido guiado: nuestra <a href="/tours/${CAFE.slug}">${CAFE.nombreCorto}</a> sube en RZR a una finca cafetalera de la sierra, con ${trasladoDe(CAFE)}. ` +
          `Dura unas ${horas(CAFE)} horas, así que deja el resto del día para otros puntos de Xilitla, como el famoso `,
      },
      {
        from:
          "El <strong>precio referencial desde $1,459 MXN por persona con impuestos incluidos</strong> cubre transporte, guía especializado y acceso a los atractivos del recorrido.",
        to: `La ${CAFE.nombreCorto} cuesta <strong>${precioDe(CAFE)}</strong> e incluye el recorrido guiado por el cafetal y una cata de café recién tostado.`,
      },
      {
        from:
          "Sin embargo, los tours organizados desde Ciudad Valles facilitan el acceso a zonas de cultivo más remotas y ofrecen contexto histórico y agronómico que enriquece la visita. El precio referencial es desde $1,459 MXN por persona.",
        to:
          `Sin embargo, un recorrido guiado facilita el acceso a las fincas y te da el contexto de todo el proceso: la ${CAFE.nombreCorto} cuesta ${precioDe(CAFE)}. ${fraseRecogida(CAFE, false)}`,
      },
      // IDX-6: cuatro enlaces a artículos que nunca existieron.
      // 🔴 En la base estos `href` llevan el dominio viejo de Railway (la
      // plantilla lo cambia DESPUÉS de esto), así que el reemplazo se ancla en
      // la ruta, sin dominio: el que quede delante lo corrige la plantilla.
      // "Productos locales" no tiene artículo: el enlace pasa a la Travesía del
      // Café, que es donde se prueba el café antes de comprarlo.
      {
        from: " Consulta cómo combinar la compra directa con tu visita en <a href=",
        to: " Si quieres probarlo antes de comprarlo, sube a los cafetales con <a href=",
      },
      {
        from: '/blog/productos-locales-huasteca-potosina">nuestra guía de productos locales de la Huasteca Potosina</a>',
        to: `/tours/${CAFE.slug}">la ${CAFE.nombreCorto}, que cierra con una cata de café recién tostado</a>`,
      },
      // Las "Pozas de Tamasopo" son las Cascadas de Tamasopo: su ficha, no el
      // artículo de las Siete Cascadas (Hacienda los Gómez, otro sitio).
      // Este lleva además sufijo de año en la base (la plantilla se lo quita).
      { from: '/blog/pozas-tamasopo-guia-2026"', to: `/destinos/${D_TAMASOPO.slug}"` },
      { from: '/blog/cascada-tamul-como-llegar"', to: '/blog/cascada-de-tamul-la-guia-definitiva-para-visitarla"' },
      { from: '/blog/xilitla-jardin-edward-james"', to: '/blog/las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece"' },
      { from: "Encuentra rutas combinadas en nuestro blog:", to: "Encuentra más guías de la región:" },
    ],
    tours: [CAFE.slug],
    actualizado: HOY,
  },

  // ── Itinerario de 3 días en Xilitla ────────────────────────────────────────
  // El combo de $1,459 (dos veces, una en el FAQPage), precios de Viator en
  // dólares y "paquetes de 5 días desde $5,570 con 20 % de descuento".
  "itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla": {
    contentReplace: [
      {
        from:
          "El tour conjunto al Jardín Surrealista y al Sótano tiene un costo de <strong>$1,459 MXN por persona</strong> con impuestos incluidos.",
        to: `No van en un mismo tour nuestro: ${POZAS_Y_HUAHUAS}.`,
      },
      {
        from:
          "El tour de un día desde Ciudad Valles cuesta desde <strong>USD $72 por persona</strong> en plataformas como Viator. Si prefieres un paquete de <strong>3 días de aventura</strong>, el precio sube a <strong>USD $484 por persona</strong>. Para estancias más largas, hay paquetes de ecoturismo de <strong>5 días desde $5,570 MXN</strong>, con un descuento del <strong>20%</strong> disponible en ciertos periodos.",
        to:
          `${mayusculaInicial(RANGO_TOURS)}. Si prefieres que te armemos el viaje, los paquetes con hotel en Xilitla, ${PAQ_DIAS_RANGO}, van ${PAQ_RANGO}.`,
      },
      {
        from: " con un paquete desde <strong>$5,570 MXN</strong> en 2026.",
        to: `; toma en cuenta que por ahora Tamtoc abre ${diasDe(D_TAMTOC)}.`,
      },
      {
        from:
          "Un tour de un día al Jardín Surrealista de Edward James más el Sótano de las Huahuas cuesta <strong>$1,459 MXN por persona</strong> con impuestos incluidos. En Viator, el mismo recorrido de <strong>12 horas</strong> está disponible desde <strong>USD $72 por persona</strong>. El paquete de <strong>3 días de aventura</strong> cuesta <strong>USD $484</strong>.",
        to:
          `La ${SURREALISTA.nombreCorto}, que recorre Las Pozas de Edward James, cuesta <strong>${precioDe(SURREALISTA)}</strong> con ${trasladoDe(SURREALISTA)}. ` +
          `El Sótano de las Huahuas va en la ${TAMUL.nombreCorto}: <strong>${precioDe(TAMUL)}</strong>.`,
      },
    ],
    tours: [SURREALISTA.slug, TAMUL.slug],
    actualizado: HOY,
  },

  // ── Cómo llegar a Xilitla ──────────────────────────────────────────────────
  "como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp": {
    contentReplace: [
      {
        from:
          "Si contratas una excursión desde Ciudad Valles al Jardín Surrealista más el Sótano de las Huahuas, el precio es de <strong>$1,532 MXN por persona</strong> con impuestos incluidos en 2026.",
        to: `Si prefieres ir con guía, ${SURREALISTA_FRASE}.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Hoteles cerca de Las Pozas ─────────────────────────────────────────────
  // El combo de $1,459 (prosa y tabla) y un "60 % de los huéspedes repite
  // antes de 18 meses" que no sale de ningún registro.
  "hoteles-cerca-de-las-pozas-5-razones-para-hospedarte-cerca-del-jardin": {
    contentReplace: [
      {
        from:
          "Comparado con el costo de un tour organizado desde Ciudad Valles —que parte desde <strong>$1,459 MXN por persona</strong> solo en transporte y acceso—,",
        to: `Comparado con un tour de día desde Ciudad Valles —la ${SURREALISTA.nombreCorto} cuesta <strong>${precioDe(SURREALISTA)}</strong>—,`,
      },
      { from: "<td>Tour organizado desde Ciudad Valles</td>", to: `<td>${SURREALISTA.nombreCorto} (tour guiado)</td>` },
      { from: "<td>Desde $1,459 MXN por persona</td>", to: `<td>${mayusculaInicial(precioDe(SURREALISTA))}</td>` },
      {
        from: "<td>Incluye jardín + Xilitla + Sótano de las Huahuas</td>",
        to: `<td>Incluye Las Pozas, ${trasladoDe(SURREALISTA)}, desayuno, entradas y guía</td>`,
      },
      {
        from:
          " Según guías locales de la región, <strong>el 60% de los visitantes que se alojan en el hotel paraíso encantado repiten visita antes de 18 meses</strong>, lo que habla de una experiencia que va más allá del alojamiento básico.",
        to: "",
      },
      {
        // El mismo patrón en la introducción: un "70 %" que nadie midió.
        from:
          " Según operadores locales de la región, <strong>más del 70% de los visitantes que llegan desde Ciudad Valles en visita de día lamentan no haberse quedado a dormir en Xilitla</strong> al menos una noche.",
        to: "",
      },
      alDia("julio de 2026"),
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Precios para viajar a Xilitla ──────────────────────────────────────────
  // El combo de $1,459 en la prosa, en la tabla y en el resumen (que sale en
  // las tarjetas de relacionados).
  "precios-presupuesto-para-viajar-a-xilitla-cuanto-cuesta-un-fin": {
    excerpt:
      `Cuánto cuesta un fin de semana en Xilitla en 2026: la entrada a Las Pozas (${D_POZAS.precio_entrada} en taquilla), hospedaje, comida, transporte y tours guiados desde ${dinero(PP_MIN)} por persona.`,
    contentReplace: [
      {
        from:
          "los tours organizados desde Ciudad Valles que combinan el jardín surrealista, el pueblo de Xilitla y el Sótano de las Huahuas parten desde <strong>$1,459 MXN por persona</strong> con impuestos incluidos. Ese precio contempla transporte, guía, costos entradas y el acompañamiento durante todo el recorrido. La salida habitual desde Ciudad Valles es a las <strong>7:00 am</strong>, con regreso aproximado a las <strong>6:00 pm</strong>, lo que permite cubrir el jardín y al menos una atracción adicional en el mismo día.",
        to:
          `${SURREALISTA_FRASE}. ${fraseRecogida(SURREALISTA, false)} Dura de ${horas(SURREALISTA)} horas y, además del jardín, incluye ${SURREALISTA_OTRAS}.`,
      },
      {
        from:
          "<tr><td>Tour organizado desde Ciudad Valles</td><td>$1,459 MXN/persona todo incluido</td><td>Incluye transporte, guía, costos entradas y Sótano de las Huahuas</td></tr>",
        to:
          `<tr><td>${SURREALISTA.nombreCorto} (tour guiado)</td><td>${precioDe(SURREALISTA)}</td><td>Incluye ${trasladoDe(SURREALISTA)}, desayuno, entradas y guía</td></tr>`,
      },
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Guía definitiva de Xilitla ─────────────────────────────────────────────
  // El combo, esta vez a $1,532 "con impuestos", tres veces (una en el
  // FAQPage) y en la tabla.
  "hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber": {
    contentReplace: [
      {
        from:
          "Si prefieres un paquete organizado desde Ciudad Valles que incluya el jardín y el Sótano de las Huahuas, el costo es de <strong>$1,532 MXN por persona con impuestos</strong> en 2026. Este precio contempla transporte, guía bilingüe y acceso a ambas atracciones, lo que resulta competitivo para quienes viajan sin vehículo propio.",
        to: `Si prefieres ir con guía, ${SURREALISTA_FRASE}; el Sótano de las Huahuas va en otro recorrido, la ${TAMUL.nombreCorto} (<strong>${precioDe(TAMUL)}</strong>).`,
      },
      {
        from:
          "La opción más solicitada en 2026 es el paquete que combina el Jardín Surrealista de Las Pozas con el Sótano de las Huahuas en un mismo día, con un costo de <strong>$1,532 MXN por persona con impuestos</strong>.",
        to: `Nuestra ${SURREALISTA.nombreCorto} recorre el Jardín Surrealista de Las Pozas con ${trasladoDe(SURREALISTA)} por <strong>${precioDe(SURREALISTA)}</strong>.`,
      },
      { from: "<td>Autobús + tour local desde Ciudad Valles</td>", to: `<td>${SURREALISTA.nombreCorto} (tour guiado)</td>` },
      { from: "<td><strong>~$1,532 MXN/persona</strong></td>", to: `<td><strong>${precioDe(SURREALISTA)}</strong></td>` },
      {
        from: "<td>Incluye jardín + Sótano de las Huahuas + guía; sin necesidad de vehículo propio</td>",
        to: `<td>Incluye Las Pozas, ${trasladoDe(SURREALISTA)}, desayuno, entradas y guía; sin necesidad de vehículo propio</td>`,
      },
      {
        from:
          "El paquete combinado desde Ciudad Valles que incluye ambas atracciones tiene un costo de <strong>$1,532 MXN por persona con impuestos</strong> y es la opción más práctica para quienes no cuentan con vehículo propio.",
        to: `Nosotros no los combinamos en un mismo recorrido: ${POZAS_Y_HUAHUAS}.`,
      },
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Rafting en el Tampaón ──────────────────────────────────────────────────
  // "Desde $796" (meta y BlogPosting incluidos) y "hasta $1,450 con Yumping",
  // con la tarjeta de nuestro rafting a $1,950 en la misma página.
  "rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv": {
    metaDescription:
      `Rafting en el río Tampaón en 2026: ${precioDe(RAFTING)} con traslado y comida, horarios, cómo llegar desde Ciudad Valles y consejos.`,
    contentReplace: [
      {
        from:
          "Los precios varían según la operadora y lo que incluye el paquete. La opción más accesible parte desde <strong>$796 MXN por persona</strong> e incluye transporte Valles–río–Valles, equipo completo, guías certificados, comida y seguro. Los paquetes de jornada completa de operadoras como Yumping arrancan desde <strong>$1,450 MXN por persona</strong> con una duración de <strong>8 horas</strong>.",
        to:
          `Nuestro ${RAFTING.nombreCorto} cuesta <strong>${precioDe(RAFTING)}</strong> e incluye ${trasladoDe(RAFTING)}, comida, equipo completo, guía certificado en aguas rápidas y seguro; dura unas ${horas(RAFTING)} horas.`,
      },
      {
        from:
          "<tr><td>Operadora económica</td><td><strong>$796 MXN/persona</strong></td><td>Transporte, equipo, guías, comida, seguro</td></tr>",
        to: `<tr><td>${RAFTING.nombreCorto}</td><td><strong>${precioDe(RAFTING)}</strong></td><td>Traslado, comida, equipo, guía certificado y seguro</td></tr>`,
      },
      {
        from:
          "\n    <tr><td>Yumping (8 h)</td><td><strong>$1,450 MXN/persona</strong></td><td>Equipo, guías, actividades adicionales</td></tr>",
        to: "",
      },
      {
        from:
          "Los precios parten desde <strong>$796 MXN por persona</strong> en paquetes que incluyen transporte desde Ciudad Valles, equipo, guías, comida y seguro. Los paquetes de jornada completa llegan hasta <strong>$1,450 MXN</strong>.",
        to: `Con nosotros cuesta <strong>${precioDe(RAFTING)}</strong>, con ${trasladoDe(RAFTING)}, equipo, guía certificado, comida y seguro.`,
      },
      {
        from:
          '<a href="https://www.huasteca-potosina.com/tours" title="tours rafting rio tampaon Huasteca Potosina">Reserva el tour a rafting rio tampaon</a> con transporte incluido',
        to: `<a href="/tours/${RAFTING.slug}">Reserva el ${RAFTING.nombreCorto}</a> con traslado incluido`,
      },
      alDia("mayo de 2026"),
    ],
    tours: [RAFTING.slug],
    actualizado: HOY,
  },

  // ── Nacimiento de Huichihuayán ─────────────────────────────────────────────
  // "Paquetes desde $1,800" (también en el FAQPage): el tour que pasa por ahí
  // es la Ruta Surrealista. Y "$20 a $30" contra la ficha del artículo.
  "nacimiento-de-huichihuayan-la-joya-escondida-de-la-huasteca": {
    metaDescription:
      `Nacimiento de Huichihuayan en 2026: cómo llegar, entrada de ${D_HUICHI.precio_entrada}, horarios y consejos para disfrutar este ojo de agua azul.`,
    contentReplace: [
      {
        from:
          'Si prefieres no conducir, Huichihuayan forma parte de paquetes desde <strong>$1,800 MXN por persona</strong> con impuestos incluidos. <a href="https://www.huasteca-potosina.com/tours" title="tours nacimiento de huichihuayan Huasteca Potosina">Reserva el tour a nacimiento de huichihuayan</a> y olvídate de la logística.',
        to:
          `Si prefieres no conducir, Huichihuayán es una de las paradas de nuestra <a href="/tours/${SURREALISTA.slug}">${SURREALISTA.nombreCorto}</a>, que cuesta <strong>${precioDe(SURREALISTA)}</strong> con ${trasladoDe(SURREALISTA)}.`,
      },
      {
        from: "La entrada tiene un costo de <strong>$20 a $30 MXN por persona</strong> en 2026",
        to: `La entrada cuesta <strong>${D_HUICHI.precio_entrada} por persona</strong> en 2026`,
      },
      {
        from: "La entrada cuesta entre <strong>$20 y $30 MXN</strong> y se paga en efectivo",
        to: `La entrada cuesta <strong>${D_HUICHI.precio_entrada}</strong> y se paga en efectivo`,
      },
      {
        from: "La entrada cuesta entre <strong>$20 y $30 MXN por persona</strong> en 2026",
        to: `La entrada cuesta <strong>${D_HUICHI.precio_entrada} por persona</strong> en 2026`,
      },
      {
        from: "Los tours desde Ciudad Valles que incluyen el sitio parten desde <strong>$1,800 MXN por persona</strong> con impuestos incluidos.",
        to: `Nuestra ${SURREALISTA.nombreCorto}, que pasa por el nacimiento, cuesta <strong>${precioDe(SURREALISTA)}</strong> con ${trasladoDe(SURREALISTA)}.`,
      },
      alDia("abril de 2026"),
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Historia de Xilitla ────────────────────────────────────────────────────
  // "Tours desde $700 sin alimentos hasta $1,300 con comida" (prosa, tabla y
  // FAQPage): ninguno es nuestro.
  "historia-de-xilitla-mitos-y-leyendas-de-xilitla-el-misticismo-de-la-hu": {
    contentReplace: [
      {
        from:
          "Los tours arrancan en <strong>$700 MXN por persona</strong> sin alimentos y llegan hasta <strong>$1,300 MXN</strong> con comida y transporte incluidos.",
        to: `Nuestra <a href="/tours/${SURREALISTA.slug}">${SURREALISTA.nombreCorto}</a>, que recorre Las Pozas con ${trasladoDe(SURREALISTA)}, cuesta <strong>${precioDe(SURREALISTA)}</strong>.`,
      },
      {
        from: "<tr><td>Tour básico desde Ciudad Valles</td><td><strong>$700 MXN</strong></td><td>Transporte</td></tr>",
        to: `<tr><td>${SURREALISTA.nombreCorto} (tour guiado)</td><td><strong>${precioDe(SURREALISTA)}</strong></td><td>Traslado, desayuno, entradas y guía</td></tr>`,
      },
      { from: "<tr><td>Tour completo desde Ciudad Valles</td><td><strong>$1,300 MXN</strong></td><td>Transporte + comida</td></tr>", to: "" },
      {
        from: "Hay autobuses directos y tours organizados que salen desde Ciudad Valles desde <strong>$700 MXN por persona</strong>.",
        to: `Hay autobuses directos, y nuestra ${SURREALISTA.nombreCorto} cuesta <strong>${precioDe(SURREALISTA)}</strong> con ${trasladoDe(SURREALISTA)}.`,
      },
      alDia("mayo de 2026"),
    ],
    tours: [SURREALISTA.slug],
    actualizado: HOY,
  },

  // ── Museo Leonora Carrington ───────────────────────────────────────────────
  // Un "tour con transporte incluido desde $850 con entrada al museo" que no
  // existe. El museo está en el centro: se visita por tu cuenta.
  "museo-leonora-carrington-leonora-carrington-en-xilitla-guia-para-visit": {
    contentReplace: [
      { from: "<td>Tour con transporte incluido</td>", to: `<td>${SURREALISTA.nombreCorto} (tour guiado)</td>` },
      { from: "<td>Desde $850 MXN por persona</td>", to: `<td>${mayusculaInicial(precioDe(SURREALISTA))}</td>` },
      {
        from: "<td>Incluye guía local, transporte y entrada al museo Leonora Carrington</td>",
        to: `<td>Incluye Las Pozas, ${trasladoDe(SURREALISTA)} y guía; el museo, a pasos de la plaza, lo visitas por tu cuenta</td>`,
      },
      alDia("julio de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Fotos en Xilitla (Paraíso) ─────────────────────────────────────────────
  // Recomendaba el combo inventado… vendido por Viator, en dólares.
  "fotos-xilitla-top-5-lugares-instagrammeables-dentro-de-paraiso-encanta": {
    contentReplace: [
      {
        from:
          "Si prefieres un tour organizado desde Ciudad Valles, Viator ofrece el combo Xilitla + Jardín Surrealista + Sótano de las Huahuas <strong>desde $72 USD</strong> (~12 horas) en 2026.",
        to: `Si prefieres ir con guía, ${SURREALISTA_FRASE}.`,
      },
      alDia("mayo de 2026"),
    ],
    actualizado: HOY,
  },

  // ── Reservar hotel directo (Paraíso) ───────────────────────────────────────
  // 🔴 Cifras de "nuestros registros" que no existen: 63 % que pagó de más por
  // OTA, 91 % frente a 54 % de llegadas "sin fricciones" y 8,500 huéspedes con
  // un ahorro medio de $340. Se quitan. Lo de fondo —que este dominio venda
  // cuartos del hotel a "$1,580 la noche"— lo decide Manolo: no se toca aquí.
  "reservar-hotel-xilitla-por-que-reservar-directo-en-nuestro-sitio-web-e": {
    contentReplace: [
      {
        from:
          " Según datos de nuestros registros de temporada, en 2026 más del <strong>63% de los huéspedes que reservaron por OTA pagaron entre $180 y $400 MXN adicionales</strong> por noche frente a quienes reservaron directo, sin recibir ningún beneficio extra a cambio.",
        to: "",
      },
      {
        from:
          ' Según nuestros registros de atención al cliente en 2026, el <strong>91% de quienes reservaron directo</strong> calificaron su experiencia de llegada como "sin fricciones", frente al <strong>54% de quienes llegaron con reserva de OTA</strong> y enfrentaron problemas de comunicación, cambios de habitación o servicios no disponibles.',
        to: "",
      },
      {
        from:
          " Según operadores locales, más de <strong>8,500 huéspedes en 2026</strong> han elegido la reserva directa tras comparar precios, y el ahorro promedio reportado es de <strong>$340 MXN por noche</strong> frente a la tarifa OTA equivalente. Eso equivale, en una estancia de tres noches, al costo completo de los boletos de entrada a Las Pozas para dos personas más el servicio de guía.",
        to: "",
      },
    ],
  },
};

function mayusculaInicial(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Los `tours` y `relacionados` también se validan al cargar: un slug que no
// existe dejaría el recuadro vacío sin que nadie se enterara.
for (const [blog, o] of Object.entries(BLOG_SEO)) {
  for (const s of o.tours ?? []) tour(s);
  // Algunas metas llevan precios del catálogo: un dígito más no debe tumbar el build.
  if (o.metaDescription && o.metaDescription.length > 155) {
    aviso(`la meta de "${blog}" mide ${o.metaDescription.length} (máx. 155)`);
  }
}

/** Las correcciones de un artículo, por su slug de la base (con o sin año). */
export function seoDeBlog(slug: string): BlogSeoOverride | undefined {
  return BLOG_SEO[normalizaSlugBlog(slug)];
}

/** "AAAA-MM-DD" → Date a mediodía en México, para que no cambie de día al formatear. */
export function fechaActualizado(o: BlogSeoOverride | undefined): Date | null {
  if (!o?.actualizado) return null;
  const d = new Date(`${o.actualizado}T12:00:00-06:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Preguntas frecuentes ──────────────────────────────────────────────────────

const escapaHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Para comparar preguntas: sin etiquetas, sin acentos ni signos. */
const clavePregunta = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Mete las preguntas como `<details>`. Si el artículo ya tiene las suyas, van
 * después de la última y sin repetir ninguna; si no tiene, van al final bajo
 * su propio `<h2>`.
 */
function insertaFaqs(html: string, faqs: { q: string; a: string }[]): string {
  const existentes = new Set(
    Array.from(html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/gi)).map((m) => clavePregunta(m[1])),
  );
  const nuevas = faqs.filter((f) => !existentes.has(clavePregunta(f.q)));
  if (!nuevas.length) return html;

  const bloque = nuevas
    .map((f) => `<details><summary>${escapaHtml(f.q)}</summary><p>${escapaHtml(f.a)}</p></details>`)
    .join("\n");

  const ultimo = html.toLowerCase().lastIndexOf("</details>");
  if (ultimo === -1) {
    return `${html}\n<h2 id="preguntas-frecuentes">Preguntas frecuentes</h2>\n<div class="faq">\n${bloque}\n</div>`;
  }
  const corte = ultimo + "</details>".length;
  return `${html.slice(0, corte)}\n${bloque}${html.slice(corte)}`;
}

// ── Aplicación ────────────────────────────────────────────────────────────────

/**
 * Aplica las correcciones a un post (sobre una copia). Sirve igual para la
 * fila completa que para las parciales de "artículos relacionados": solo toca
 * los campos que el override define.
 */
export function aplicaBlogSeo<
  T extends {
    slug: string;
    content?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    coverImageAlt?: string | null;
    schemaMarkup?: string | null;
    excerpt?: string | null;
  },
>(post: T): T {
  const o = seoDeBlog(post.slug);
  if (!o) return post;

  const next: T = { ...post };
  if (o.metaTitle !== undefined) next.metaTitle = o.metaTitle;
  if (o.metaDescription !== undefined) next.metaDescription = o.metaDescription;
  if (o.coverImageAlt !== undefined) next.coverImageAlt = o.coverImageAlt;
  if (o.excerpt !== undefined) next.excerpt = o.excerpt;
  if (o.omitirSchemaGuardado) next.schemaMarkup = null;

  if (typeof next.content === "string") {
    let c = next.content;
    for (const { from, to } of o.contentReplace ?? []) {
      if (!c.includes(from)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[blogSeo] "${normalizaSlugBlog(post.slug)}": no aparece → ${from.slice(0, 90)}`);
        }
        continue;
      }
      c = c.split(from).join(to);
    }
    if (o.faqs?.length) c = insertaFaqs(c, o.faqs);
    next.content = c;
  }
  return next;
}
