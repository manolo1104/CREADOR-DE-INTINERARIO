/**
 * El comparador (/comparar), la parte de SERVIDOR: toma la URL, valida la
 * selección contra el catálogo y arma la tabla ya traducida.
 *
 * Todo sale de las fuentes de siempre (TOURS_DB, PAQUETES_DB,
 * TOUR_REQUISITOS, IDEAL_PARA): aquí no se escribe ni un dato a mano. Lo que
 * no existe se dice ("Pregúntanos") o el renglón no sale; nunca se inventa.
 *
 * ⚠️ Solo servidor: importa `TourDeparture` (que usa `next/headers`) y el
 * catálogo entero. Si un componente de cliente lo importara, el build falla,
 * y es justo lo que se quiere: al navegador solo viaja lo que devuelve
 * `resolverComparacion`, ya reducido.
 */
import {
  TOURS_DB, TOUR_CATEGORIAS, TOURS_RANKING, rankTour, tourDurRange, etiquetaUnidad, esPorPersona,
  precioTachado, promoDe, salidaCorta, regresoDeTour, recogidaDeTour, partesRecogida, incluyeDeTour,
  claveIncluye, PRIVADO_EXTRA_POR_PERSONA, GRUPO_MAX, PROMO_TEMPORADA, type Tour,
} from "./tours";
import { minimoPersonas } from "./tourBooking";
import { TOUR_REQUISITOS, noIncluyeDe } from "./tourRequisitos";
import { IDEAL_PARA } from "./idealPara";
import { toursSimilares } from "./toursSimilares";
import { ciudadUnicaDeRecogida } from "@/components/TourDeparture";
import { PAQUETES_DB, precioVisible, precioVisibleTachado, type Paquete } from "./paquetes";
import { localizePaquete } from "./i18n/paquetes.en";
import { ahorroPaquete } from "./ahorroPaquete";
import { MAX_PERSONAS_PAQUETE } from "./paquetePricing";
import { localizeTour } from "./i18n/localize";
import { getBooking } from "./i18n/booking";
import { localePath, type Locale } from "./i18n/config";
import { comparadorUI, type ComparadorUI } from "./i18n/comparador";
import {
  MAX_COLUMNAS, MIN_COLUMNAS, dinero, parseGrupo, parseLista, sinRaya,
  type Grupo, type LimitesGrupo, type TarifaTour, type TipoComparacion,
} from "./comparador";

// ── La forma de la tabla (lo que viaja al componente) ────────────────────────

export type Celda =
  | { tipo: "texto"; texto: string; nota?: string; tachado?: string }
  | { tipo: "lista"; items: string[]; vacio?: string }
  /** Día por día de un paquete: cada día, con liga a su recorrido si lo tiene. */
  | { tipo: "dias"; items: { texto: string; href?: string; etiqueta?: string }[] }
  /** El total para el grupo: lo pinta una isla de cliente, que sabe cuántos van. */
  | { tipo: "total" }
  /** Los botones de la columna. */
  | { tipo: "cta" };

export interface Fila {
  id: string;
  etiqueta: string;
  /** Una por columna, en el mismo orden que `columnas`. */
  celdas: Celda[];
  /**
   * Cuando todas las columnas dicen lo mismo: se pinta UNA vez a lo ancho con
   * "En todos". Repetir tres veces "Cancelación gratuita hasta 48 h" no ayuda
   * a decidir; ver de un vistazo que en eso son iguales, sí.
   */
  fusion?: Celda;
}

export interface Seccion {
  id: string;
  titulo: string;
  filas: Fila[];
}

export interface Columna {
  slug: string;
  /** `tour.id` (para el registro de "inició reserva"); en paquetes, el slug. */
  id: string;
  nombre: string;
  href: string;
  imagen: string;
  alt: string;
  /** Lo que se lee en el encabezado fijo: "$1,450 por persona". */
  precioCorto: string;
  nuevo: boolean;
}

export interface OpcionColumna {
  slug: string;
  nombre: string;
  grupo: string;
}

/**
 * Una comparación armada de antemano. Lleva los slugs y no la URL: la URL la
 * arma el navegador con el grupo que el visitante tenga puesto en ese momento.
 */
export interface Atajo {
  etiqueta: string;
  slugs: string[];
}

export interface Comparacion {
  tipo: TipoComparacion;
  locale: Locale;
  columnas: Columna[];
  secciones: Seccion[];
  /** Recorridos: lo mínimo para cotizar cada columna en el navegador. Vacío en paquetes. */
  tarifas: TarifaTour[];
  opciones: OpcionColumna[];
  limites: LimitesGrupo;
  grupo: Grupo;
  atajos: Atajo[];
  origen: string | null;
}

type Busqueda = Record<string, string | string[] | undefined>;

export const LIMITES: Record<TipoComparacion, LimitesGrupo> = {
  // 1 adulto: desde el 8 oct 2026 cualquier recorrido por persona se puede
  // reservar bajo su mínimo, con la salida sujeta a que se junte el grupo.
  recorridos: { minAdultos: 1, maxPersonas: GRUPO_MAX },
  // El paquete se arma desde la pareja; arriba de 12 se cotiza a mano.
  paquetes:   { minAdultos: 2, maxPersonas: MAX_PERSONAS_PAQUETE },
};

// ── La selección ─────────────────────────────────────────────────────────────

const TOUR_POR_SLUG = new Map(TOURS_DB.map((t) => [t.slug, t]));
const PAQUETE_POR_SLUG = new Map(PAQUETES_DB.map((p) => [p.slug, p]));

/** Los recorridos de una categoría, del más vendido al menos. */
const deCategoria = (cat: Tour["categoria"]) =>
  TOURS_DB.filter((t) => t.categoria === cat).sort((a, b) => rankTour(a.slug) - rankTour(b.slug));

/** Los tres que abren la página sin selección: los mismos de "Empieza por los favoritos" en /tours. */
const POR_DEFECTO = TOURS_RANKING.filter((s) => TOUR_POR_SLUG.has(s)).slice(0, MAX_COLUMNAS.recorridos);

function seleccionRecorridos(sp: Busqueda): Tour[] {
  const pedidos = parseLista(sp.r)
    .map((s) => TOUR_POR_SLUG.get(s))
    .filter((t): t is Tour => !!t)
    .slice(0, MAX_COLUMNAS.recorridos);
  if (pedidos.length === 0) return POR_DEFECTO.map((s) => TOUR_POR_SLUG.get(s)!);
  // Uno solo (la tarjeta de /tours: "Comparar con parecidos"): se completa con
  // los dos que la ficha de ese tour enseña como parecidos.
  if (pedidos.length === 1) return [pedidos[0], ...toursSimilares(pedidos[0], MAX_COLUMNAS.recorridos - 1)];
  return pedidos;
}

function seleccionPaquetes(sp: Busqueda): Paquete[] {
  const pedidos = parseLista(sp.p)
    .map((s) => PAQUETE_POR_SLUG.get(s))
    .filter((p): p is Paquete => !!p)
    .slice(0, MAX_COLUMNAS.paquetes);
  if (pedidos.length >= MIN_COLUMNAS) return pedidos;
  // Ninguno o uno: los cuatro, con el pedido primero.
  const resto = PAQUETES_DB.filter((p) => !pedidos.includes(p));
  return [...pedidos, ...resto].slice(0, MAX_COLUMNAS.paquetes);
}

const origenDe = (v: Busqueda[string]) => {
  const o = Array.isArray(v) ? v[0] : v;
  return o && /^[a-z0-9-]{1,30}$/.test(o) ? o : null;
};

// ── Ayudantes de celdas ──────────────────────────────────────────────────────

const texto = (t: string, extra: Partial<Omit<Extract<Celda, { tipo: "texto" }>, "tipo">> = {}): Celda =>
  ({ tipo: "texto", texto: t, ...extra });

const lista = (items: string[], vacio?: string): Celda => ({ tipo: "lista", items, vacio });

/** Una fila que se funde en "En todos" cuando las columnas coinciden. */
function filaFusionable(id: string, etiqueta: string, celdas: Celda[]): Fila {
  const iguales = celdas.length >= 2 && celdas.every((c) => JSON.stringify(c) === JSON.stringify(celdas[0]));
  return iguales ? { id, etiqueta, celdas, fusion: celdas[0] } : { id, etiqueta, celdas };
}

/**
 * Parte varias listas en lo que tienen TODAS y lo propio de cada una. Compara
 * con la misma clave que `incluyeDeTour` usa para no repetir renglones (sin
 * mayúsculas, acentos ni puntuación), así que "Entradas a todas las
 * atracciones" de Tamul y la del Meco cuentan como la misma promesa.
 */
function comunYPropio(listas: string[][]): { comun: string[]; propias: string[][] } {
  if (listas.length < 2) return { comun: [], propias: listas };
  const enTodas = (clave: string) => listas.every((l) => l.some((x) => claveIncluye(x) === clave));
  const comun = listas[0].filter((x) => enTodas(claveIncluye(x)));
  const claves = new Set(comun.map(claveIncluye));
  return { comun, propias: listas.map((l) => l.filter((x) => !claves.has(claveIncluye(x)))) };
}

/** "2.5" y no "2,5": es como se escriben las horas en todo el sitio. */
const horas = (n: number) => String(n);

function duracionDe(t: Tour, ui: ComparadorUI): string {
  const [a, b] = tourDurRange(t);
  if (a === b) return ui.valores.duracionIgual(horas(a));
  return t.rutas?.length ? ui.valores.duracionRuta(horas(a), horas(b)) : ui.valores.duracionRango(horas(a), horas(b));
}

/**
 * Cómo llega el cliente, en corto. Las mismas reglas que el "punto de salida"
 * de la ficha: el Rappel no declara `recogida` y por defecto prometería
 * Xilitla, que su fuente no respalda; `ciudadUnicaDeRecogida` lo corrige.
 */
function recogidaCelda(t: Tour, en: boolean, ui: ComparadorUI): Celda {
  const p = partesRecogida(t, en);
  let frase: string;
  let nota: string | undefined;
  if (p.tipo === "base-xilitla") {
    frase = ui.recogida.baseXilitla;
    nota = ui.recogida.sinTraslado;
  } else if (p.tipo === "en-sitio") {
    frase = ui.recogida.enSitio(p.lugar);
    nota = ui.recogida.porTuCuenta;
  } else if (p.tipo === "hospedaje-xilitla") {
    frase = ui.recogida.hospedajeXilitla;
    nota = p.valles ? sinRaya(p.valles) : undefined;
  } else {
    const ciudad = ciudadUnicaDeRecogida(t);
    frase = ciudad ? ui.recogida.hospedajeCiudad(ciudad) : ui.recogida.hospedaje;
  }
  if (p.vehiculo) frase = ui.recogida.conVehiculo(frase, p.vehiculo);
  return texto(frase, nota ? { nota } : {});
}

/**
 * La edad, solo con lo que dicen los datos:
 * - edad mínima publicada (el buceo, 10; rappel, rafting, Gruta, Amanecer y
 *   Olla, 8 desde el 2 oct 2026);
 * - el RZR se cobra por vehículo: no hay tarifa de niño que prometer, y sus
 *   requisitos dicen que el conductor es mayor de edad;
 * - el Edén cobra por grupo: el niño cuenta como persona;
 * - el resto vende boleto de niño (decisión de Manolo: "Niños con tarifa").
 */
function edadCelda(t: Tour, ui: ComparadorUI): Celda {
  const req = TOUR_REQUISITOS[t.id];
  if (req?.edadMinima) {
    return texto(t.soloAdultos ? ui.valores.edadSoloAdultos(req.edadMinima) : ui.valores.edadMinima(req.edadMinima));
  }
  if (t.precioUnidad === "vehiculo") return texto(ui.valores.edadVehiculo);
  if (t.tarifaGrupo?.length) return texto(ui.valores.edadGrupo);
  return texto(
    ui.valores.edadNinos,
    req?.edadRecomendada ? { nota: ui.valores.edadRecomendada(req.edadRecomendada) } : {},
  );
}

// ── Recorridos ───────────────────────────────────────────────────────────────

function tablaRecorridos(tours: Tour[], locale: Locale, ui: ComparadorUI) {
  const en = locale === "en";
  const b = getBooking(locale);
  const loc = tours.map((t) => localizeTour(t, locale));

  const columnas: Columna[] = tours.map((t, i) => ({
    slug: t.slug,
    id: t.id,
    nombre: sinRaya(loc[i].nombreCorto),
    href: localePath(`/tours/${t.slug}`, locale),
    imagen: t.imagenTarjeta ?? t.imagen_hero,
    alt: sinRaya(loc[i].nombreCorto),
    precioCorto: `${esPorPersona(t) ? "" : `${ui.valores.desde} `}${dinero(t.precio)} ${etiquetaUnidad(t, en)}`,
    nuevo: t.reviewCount === 0,
  }));

  const precio = tours.map((t) => {
    const tachado = precioTachado(t);
    const promo = promoDe(t);
    return texto(`${esPorPersona(t) ? "" : `${ui.valores.desde} `}${dinero(t.precio)} MXN ${etiquetaUnidad(t, en)}`, {
      ...(tachado ? { tachado: dinero(tachado) } : {}),
      ...(promo ? { nota: ui.valores.promo(promo.hastaTexto[locale]) } : {}),
    });
  });

  const salida = tours.map((t) => {
    const s = salidaCorta(t, en);
    if (recogidaDeTour(t).horaTexto && s) return texto(ui.valores.horarioFijo(sinRaya(s)));
    return texto(s ? sinRaya(s) : b.carrito.horaExacta);
  });

  const regreso = tours.map((t) => {
    if (recogidaDeTour(t).tipo === "en-sitio") {
      // Sin hora pública de inicio (el buceo), sumarle la duración a un 8:00 AM
      // por defecto sería inventar la hora de regreso: se dice cuánto dura.
      const [a, z] = tourDurRange(t);
      return texto(ui.valores.actividadHoras(a === z ? horas(a) : `${horas(a)}-${horas(z)}`));
    }
    return texto(sinRaya(regresoDeTour(t, en)));
  });

  const grupo = tours.map((t) => {
    if (t.precioUnidad === "vehiculo") return texto(ui.valores.grupoVehiculo);
    const min = minimoPersonas(t);
    return texto(min > 1 ? ui.valores.grupoRango(min, t.groupMax) : ui.valores.grupoHasta(t.groupMax));
  });

  const privado = tours.map((t) =>
    t.tarifaGrupo?.length
      ? texto(ui.valores.privadoGrupo)
      : t.privateAvailable
        ? texto(ui.valores.privadoSi(dinero(PRIVADO_EXTRA_POR_PERSONA)))
        : texto(ui.valores.privadoNo),
  );

  const incluye = comunYPropio(loc.map((t) => incluyeDeTour(t, locale).map(sinRaya)));
  const conOpcionales = loc.some((t) => t.addOns?.length);
  // `noIncluyeDe` y la edad en texto solo existen en español: en inglés la
  // ficha tampoco los enseña.
  const noIncluye = en ? null : tours.map((t) => lista(noIncluyeDe(t.id).map(sinRaya)));

  const secciones: Seccion[] = [
    {
      id: "esencial",
      titulo: ui.secciones.esencial,
      filas: [
        { id: "frase", etiqueta: ui.filas.enUnaFrase, celdas: loc.map((t) => texto(sinRaya(t.tagline))) },
        { id: "precio", etiqueta: ui.filas.precio, celdas: precio },
        { id: "total", etiqueta: ui.filas.total, celdas: tours.map(() => ({ tipo: "total" as const })) },
        filaFusionable("duracion", ui.filas.duracion, tours.map((t) => texto(duracionDe(t, ui)))),
        filaFusionable("dificultad", ui.filas.dificultad, tours.map((t) => texto(b.tarjeta.dificultad[t.dificultad] ?? t.dificultad))),
      ],
    },
    {
      id: "dia",
      titulo: ui.secciones.dia,
      filas: [
        filaFusionable("salida", ui.filas.salida, salida),
        filaFusionable("regreso", ui.filas.regreso, regreso),
        filaFusionable("recogida", ui.filas.recogida, tours.map((t) => recogidaCelda(t, en, ui))),
        { id: "visitas", etiqueta: ui.filas.visitas, celdas: loc.map((t) => lista(t.destinos.map(sinRaya))) },
        filaFusionable("grupo", ui.filas.grupo, grupo),
        filaFusionable("edad", ui.filas.edad, tours.map((t) => edadCelda(t, ui))),
        filaFusionable("privado", ui.filas.privado, privado),
      ],
    },
    {
      id: "incluye",
      titulo: ui.secciones.incluye,
      filas: [
        ...(incluye.comun.length
          ? [{ id: "comun", etiqueta: ui.filas.incluidoEnTodos, celdas: [], fusion: lista(incluye.comun) } as Fila]
          : []),
        filaFusionable("ademas", ui.filas.ademas, incluye.propias.map((l) => lista(l, ui.valores.nadaMas))),
        ...(conOpcionales
          ? [filaFusionable("opcionales", ui.filas.opcionales, loc.map((t) =>
              lista((t.addOns ?? []).map((a) => ui.valores.opcional(sinRaya(a.nombre), dinero(a.precio))), ui.valores.ninguno)))]
          : []),
        ...(noIncluye ? [filaFusionable("no-incluye", ui.filas.noIncluye, noIncluye)] : []),
      ],
    },
    {
      id: "antes",
      titulo: ui.secciones.antes,
      filas: [
        filaFusionable("cancelacion", ui.filas.cancelacion, tours.map((t) =>
          texto(sinRaya(t.cancelacion?.[locale] ?? b.carrito.cancelacionGratuita)))),
        filaFusionable("apartar", ui.filas.apartar, tours.map(() => texto(ui.valores.apartar))),
        filaFusionable("ideal", ui.filas.idealPara, tours.map((t) => texto(IDEAL_PARA[t.id]?.[locale] ?? ui.valores.preguntanos))),
        { id: "cta", etiqueta: "", celdas: tours.map(() => ({ tipo: "cta" as const })) },
      ],
    },
  ];

  const tarifas: TarifaTour[] = tours.map((t) => ({
    slug: t.slug,
    precio: t.precio,
    precioUnidad: t.precioUnidad,
    tarifaGrupo: t.tarifaGrupo,
    groupMin: t.groupMin,
    groupMax: t.groupMax,
    soloAdultos: t.soloAdultos,
    edadMinima: TOUR_REQUISITOS[t.id]?.edadMinima,
  }));

  return { columnas, secciones, tarifas };
}

// ── Paquetes ─────────────────────────────────────────────────────────────────

/** La unidad en que se ANUNCIA, del mismo campo que divide el precio (ver `unidadPaquete` en /precios). */
const unidadPaquete = (p: Paquete, ui: ComparadorUI) => (p.precioPorPersona ? ui.valores.porPersona : ui.valores.porPareja);

function tablaPaquetes(paquetes: Paquete[], locale: Locale, ui: ComparadorUI) {
  const b = getBooking(locale);
  const loc = paquetes.map((p) => localizePaquete(p, locale));

  const columnas: Columna[] = paquetes.map((p, i) => ({
    slug: p.slug,
    id: p.slug,
    nombre: sinRaya(loc[i].nombre),
    href: localePath(`/paquetes/${p.slug}`, locale),
    imagen: p.imagen,
    alt: sinRaya(loc[i].nombre),
    // `precioVisible`, nunca `p.precio`: ese es el total de la pareja que cobra
    // el motor y, junto a "por persona", anunciaría el doble.
    precioCorto: `${dinero(precioVisible(p))} ${unidadPaquete(p, ui)}`,
    nuevo: false,
  }));

  const precio = paquetes.map((p) => {
    const tachado = precioVisibleTachado(p);
    return texto(`${dinero(precioVisible(p))} MXN ${unidadPaquete(p, ui)}`, {
      ...(tachado ? { tachado: dinero(tachado), nota: ui.valores.promo(PROMO_TEMPORADA.hastaTexto[locale]) } : {}),
    });
  });

  const ahorros = paquetes.map((p) => ahorroPaquete(p));
  const hayAhorro = ahorros.some(Boolean);

  // Día por día, sin el de salida (es el regreso a casa, igual en todos).
  const dias = paquetes.map((p, i) => ({
    tipo: "dias" as const,
    items: loc[i].itinerario
      .filter((d) => d.tipo !== "salida")
      .map((d) => {
        const tour = d.tourSlug ? TOUR_POR_SLUG.get(d.tourSlug) : undefined;
        return {
          texto: ui.valores.dia(d.dia, sinRaya(d.titulo)),
          ...(tour ? { href: localePath(`/tours/${tour.slug}`, locale), etiqueta: b.tarjeta.dificultad[tour.dificultad] } : {}),
        };
      }),
  }));

  const incluye = comunYPropio(loc.map((p) => p.incluye.map(sinRaya)));

  const secciones: Seccion[] = [
    {
      id: "esencial",
      titulo: ui.secciones.esencial,
      filas: [
        { id: "frase", etiqueta: ui.filas.enUnaFrase, celdas: loc.map((p) => texto(sinRaya(p.subtitulo))) },
        filaFusionable("duracion", ui.filas.duracion, loc.map((p) => texto(sinRaya(p.duracion)))),
        { id: "precio", etiqueta: ui.filas.precio, celdas: precio },
        { id: "total", etiqueta: ui.filas.total, celdas: paquetes.map(() => ({ tipo: "total" as const })) },
        ...(hayAhorro
          ? [{
              id: "ahorro",
              etiqueta: ui.filas.ahorro,
              celdas: ahorros.map((a) => (a ? texto(ui.valores.ahorro(dinero(a.ahorro), a.pct)) : texto(ui.valores.sinAhorro))),
            } as Fila]
          : []),
        filaFusionable("ideal", ui.filas.idealPara, loc.map((p) => texto(p.perfiles.join(", ")))),
      ],
    },
    {
      id: "viaje",
      titulo: ui.secciones.viaje,
      filas: [{ id: "dias", etiqueta: ui.filas.diaPorDia, celdas: dias }],
    },
    {
      id: "incluye",
      titulo: ui.secciones.incluye,
      filas: [
        ...(incluye.comun.length
          ? [{ id: "comun", etiqueta: ui.filas.incluidoEnTodos, celdas: [], fusion: lista(incluye.comun) } as Fila]
          : []),
        filaFusionable("ademas", ui.filas.ademas, incluye.propias.map((l) => lista(l, ui.valores.nadaMas))),
        filaFusionable("no-incluye", ui.filas.noIncluye, loc.map((p) => lista(p.noIncluye.map(sinRaya)))),
      ],
    },
    {
      id: "antes",
      titulo: ui.secciones.antes,
      filas: [
        filaFusionable("apartar", ui.filas.apartar, paquetes.map(() => texto(ui.valores.apartar))),
        { id: "cta", etiqueta: "", celdas: paquetes.map(() => ({ tipo: "cta" as const })) },
      ],
    },
  ];

  return { columnas, secciones, tarifas: [] as TarifaTour[] };
}

// ── Opciones de los selectores y atajos ──────────────────────────────────────

function opcionesRecorridos(locale: Locale): OpcionColumna[] {
  return TOUR_CATEGORIAS.flatMap((c) =>
    deCategoria(c.id).map((t) => ({
      slug: t.slug,
      nombre: sinRaya(localizeTour(t, locale).nombreCorto),
      grupo: locale === "en" ? c.labelEn : c.label,
    })),
  );
}

function opcionesPaquetes(locale: Locale, ui: ComparadorUI): OpcionColumna[] {
  return PAQUETES_DB.map((p) => ({
    slug: p.slug,
    nombre: sinRaya(localizePaquete(p, locale).nombre),
    grupo: ui.columnas.paquetes,
  }));
}

function atajosRecorridos(ui: ComparadorUI): Atajo[] {
  const conjuntos: Atajo[] = [
    { etiqueta: ui.atajos.masReservados, slugs: POR_DEFECTO },
    { etiqueta: ui.atajos.aventura, slugs: deCategoria("aventura").slice(0, MAX_COLUMNAS.recorridos).map((t) => t.slug) },
    { etiqueta: ui.atajos.extremo, slugs: deCategoria("extremo").slice(0, MAX_COLUMNAS.recorridos).map((t) => t.slug) },
  ];
  return conjuntos.filter((c) => c.slugs.length >= MIN_COLUMNAS);
}

// ── La entrada ───────────────────────────────────────────────────────────────

/** Toda la comparación que pide esta URL, lista para pintar. */
export function resolverComparacion(sp: Busqueda, locale: Locale): Comparacion {
  const ui = comparadorUI(locale);
  const tipo: TipoComparacion = sp.p !== undefined ? "paquetes" : "recorridos";
  const limites = LIMITES[tipo];
  const grupo = parseGrupo(sp, limites);
  const origen = origenDe(sp.o);

  if (tipo === "paquetes") {
    const paquetes = seleccionPaquetes(sp);
    return {
      tipo, locale, limites, grupo, origen,
      ...tablaPaquetes(paquetes, locale, ui),
      opciones: opcionesPaquetes(locale, ui),
      atajos: [],
    };
  }

  const tours = seleccionRecorridos(sp);
  return {
    tipo, locale, limites, grupo, origen,
    ...tablaRecorridos(tours, locale, ui),
    opciones: opcionesRecorridos(locale),
    atajos: atajosRecorridos(ui),
  };
}
