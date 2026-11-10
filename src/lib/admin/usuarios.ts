// Quién puede entrar al panel y qué puede ver cada quien.
//
// Las contraseñas NO viven en este archivo: el repositorio es público.
// Cada persona tiene su propia variable de entorno en Railway; si la variable
// no está puesta, ese usuario simplemente no puede entrar (fail closed).

// `guia` (3 nov 2026): quien sale a guiar ve solo sus salidas del día y el
// calendario; nada de dinero ni de clientes.
export type RolAdmin = "dueno" | "socio" | "operacion" | "guia";

export const ETIQUETA_ROL: Record<RolAdmin, string> = {
  dueno: "Dirección", socio: "Socio operador", operacion: "Operación", guia: "Guía",
};

export type SeccionAdmin =
  | "inicio" | "reservas" | "calendario" | "cotizaciones"
  | "cotizador" | "clientes" | "ingresos" | "curso" | "bitacora"
  | "cortes" | "cobros" | "fotos" | "resenas" | "salidas" | "analisis"
  // Rediseño del panel (3 nov 2026). Llegan por fases; mientras, cada una es
  // una página «Nuevo» que explica qué va a tener y lleva a lo que hoy existe.
  | "bandeja" | "leads" | "seguimientos" | "salidas-dia" | "rutas"
  | "proveedores" | "rentabilidad" | "score" | "agente"
  // Indicadores por categoría (plan As Is / To Be, 4 nov 2026): una pestaña de
  // KPIs por frente del documento, más «Metas» para la revisión mensual.
  | "metas" | "demanda" | "embudo" | "ocupacion" | "portafolio" | "precios" | "experiencia";

export interface UsuarioAdmin {
  user: string;              // lo que se teclea en el login (minúsculas)
  nombre: string;            // cómo se muestra en el panel
  rol: RolAdmin;
  envPassword: string;       // variable con la contraseña en texto
  envPasswordHash: string;   // variable con el hash bcrypt (tiene prioridad)
}

// ── Permisos por rol ────────────────────────────────────────────────────────
// operación: todo lo necesario para cerrar reservas, sin ver los números del negocio.
const OPERACION: SeccionAdmin[] = [
  "inicio", "reservas", "calendario", "cotizaciones", "clientes",
  // Cobrar es parte de cerrar la venta: quien atiende el WhatsApp tiene que
  // poder mandar la liga de pago sin pedírsela a nadie.
  "cobros",
  // Quien regresa del tour con la cámara es quien sube las fotos.
  "fotos",
  // Pedir la reseña por WhatsApp es trabajo de quien atiende a los clientes.
  "resenas",
  // El viaje mensual CDMX–Xilitla: pasajeros, ventas por WhatsApp, mover de
  // fecha y lista de espera son operación. Crear salidas, precios, cupo y
  // cortesías los frena la propia API para Operación (15 oct 2026).
  "salidas",
  // El Cotizador NO: enseña lo que nos cuesta cada tour y el margen que deja.
  // Estaba dentro y contradecía la propia definición del rol —"sin ver los
  // números del negocio"—. Fuera por decisión de Manolo, 23 sep 2026.
  // Rediseño (3 nov 2026): lo comercial, las salidas del día y su propio score.
  "bandeja", "leads", "seguimientos", "salidas-dia", "score",
  // Indicadores (4 nov 2026): de los nuevos, solo Experiencia (reseñas, NPS y
  // clientes que vuelven): no trae dinero ni márgenes.
  "experiencia",
];
// guía: solo sus salidas del día (con flechas para ver los días que siguen).
// El Calendario se le quitó en la revisión del 4 nov 2026: manda al navegador
// todas las reservas con totales, cobros y correos, y el guía no ve dinero.
const GUIA: SeccionAdmin[] = ["salidas-dia"];
// socio: todo lo de tours, ventas y el corte semanal. Sin el Curso de IA (otro
// negocio).
// ⚠️ El Cotizador entra AQUÍ y no en OPERACION. OPERACION es la base de los
// otros dos roles: lo que se le quita, se le quita también al socio y al
// dueño. Al sacarlo de ahí se quedó sin él TODO el mundo, Manolo incluido.
// Rediseño (3 nov 2026): rutas y protocolos, proveedores y la rentabilidad.
const SOCIO: SeccionAdmin[] = [...OPERACION, "ingresos", "cortes", "cotizador", "rutas", "proveedores", "rentabilidad",
  // Indicadores (4 nov 2026): Martín revisa las metas con Manolo el primer lunes de cada mes.
  "metas", "demanda", "embudo", "ocupacion", "portafolio", "precios"];
// dueño: todo. La bitácora (quién hizo qué) es SOLO suya: si quien está siendo
// registrado pudiera leerla, dejaría de servir para lo que se hizo.
// Análisis (21 oct 2026) cruza datos personales del check-in con el dinero:
// solo suyo de entrada; desde Inicio se la puede abrir a quien quiera.
const DUENO: SeccionAdmin[] = [...SOCIO, "curso", "bitacora", "analisis", "agente"];

export const SECCIONES_POR_ROL: Record<RolAdmin, SeccionAdmin[]> = {
  dueno:     DUENO,
  socio:     SOCIO,
  operacion: OPERACION,
  guia:      GUIA,
};

export function puedeVer(rol: RolAdmin, seccion: SeccionAdmin): boolean {
  return SECCIONES_POR_ROL[rol].includes(seccion);
}

// ── Qué pestañas ve CADA PERSONA (Manolo, 20 oct 2026) ──────────────────────
// Manolo decide desde Inicio qué pestañas ve cada quien; se guarda en la base
// (`permisos.ts`) y viaja dentro de la sesión, porque el middleware que bloquea
// las páginas no puede leer la base. Lo de arriba (por rol) es solo lo que
// cada quien ve mientras Manolo no haya decidido nada.

// 4 nov 2026 (Manolo: «secciona las pestañas por categoría… necesito medir la
// demanda, producto y precio»): los grupos siguen los frentes del plan As Is /
// To Be. «Calidad» pasó a llamarse «Servicio».
export type GrupoMenu = "Hoy" | "Demanda" | "Comercial" | "Operación" | "Producto y precio" | "Servicio" | "Dinero" | "Agente" | "Control";

export interface Pestana {
  seccion: SeccionAdmin;
  pagina: string;
  etiqueta: string;
  grupo: GrupoMenu;
  /** Sección del rediseño (3 nov 2026): lleva la marca «Nuevo» las primeras semanas. */
  nueva?: boolean;
}

/**
 * Todas las pestañas, en el orden del menú, agrupadas por ÁREA de trabajo
 * (rediseño del panel, 3 nov 2026): lo de hoy, lo comercial, la operación, el
 * dinero, la calidad, el agente y el control. El menú y «¿Quién ve qué?» se
 * pintan desde aquí: una sola lista.
 */
export const PESTANAS: Pestana[] = [
  { seccion: "inicio",       pagina: "/admin",              etiqueta: "Inicio",             grupo: "Hoy" },
  { seccion: "metas",        pagina: "/admin/metas",        etiqueta: "Metas y KPIs",       grupo: "Hoy", nueva: true },
  { seccion: "demanda",      pagina: "/admin/demanda",      etiqueta: "Web y canales",      grupo: "Demanda", nueva: true },
  { seccion: "analisis",     pagina: "/admin/analisis",     etiqueta: "Análisis",           grupo: "Demanda" },
  { seccion: "bandeja",      pagina: "/admin/bandeja",      etiqueta: "Bandeja",            grupo: "Comercial", nueva: true },
  { seccion: "leads",        pagina: "/admin/leads",        etiqueta: "Leads",              grupo: "Comercial", nueva: true },
  { seccion: "seguimientos", pagina: "/admin/seguimientos", etiqueta: "Seguimientos",       grupo: "Comercial", nueva: true },
  { seccion: "cotizaciones", pagina: "/admin/cotizaciones", etiqueta: "Cotizaciones",       grupo: "Comercial" },
  { seccion: "clientes",     pagina: "/admin/clientes",     etiqueta: "Clientes",           grupo: "Comercial" },
  { seccion: "score",        pagina: "/admin/score",        etiqueta: "Score WhatsApp",     grupo: "Comercial", nueva: true },
  { seccion: "embudo",       pagina: "/admin/embudo",       etiqueta: "Embudo comercial",   grupo: "Comercial", nueva: true },
  { seccion: "calendario",   pagina: "/admin/calendario",   etiqueta: "Calendario",         grupo: "Operación" },
  { seccion: "salidas-dia",  pagina: "/admin/salidas-dia",  etiqueta: "Salidas del día",    grupo: "Operación", nueva: true },
  { seccion: "reservas",     pagina: "/admin/reservas",     etiqueta: "Reservas",           grupo: "Operación" },
  { seccion: "salidas",      pagina: "/admin/salidas",      etiqueta: "Viaje CDMX",         grupo: "Operación" },
  { seccion: "rutas",        pagina: "/admin/rutas",        etiqueta: "Rutas y protocolos", grupo: "Operación", nueva: true },
  { seccion: "proveedores",  pagina: "/admin/proveedores",  etiqueta: "Proveedores",        grupo: "Operación", nueva: true },
  { seccion: "ocupacion",    pagina: "/admin/ocupacion",    etiqueta: "Ocupación",          grupo: "Operación", nueva: true },
  { seccion: "portafolio",   pagina: "/admin/portafolio",   etiqueta: "Portafolio",         grupo: "Producto y precio", nueva: true },
  { seccion: "precios",      pagina: "/admin/precios",      etiqueta: "Precios",            grupo: "Producto y precio", nueva: true },
  { seccion: "experiencia",  pagina: "/admin/experiencia",  etiqueta: "Experiencia",        grupo: "Servicio", nueva: true },
  { seccion: "resenas",      pagina: "/admin/resenas",      etiqueta: "Reseñas",            grupo: "Servicio" },
  { seccion: "fotos",        pagina: "/admin/fotos",        etiqueta: "Fotos",              grupo: "Servicio" },
  { seccion: "cobros",       pagina: "/admin/cobros",       etiqueta: "Cobros",             grupo: "Dinero" },
  { seccion: "cortes",       pagina: "/admin/cortes",       etiqueta: "Corte semanal",      grupo: "Dinero" },
  { seccion: "cotizador",    pagina: "/admin/cotizador",    etiqueta: "Cotizador",          grupo: "Dinero" },
  { seccion: "rentabilidad", pagina: "/admin/rentabilidad", etiqueta: "Rentabilidad",       grupo: "Dinero", nueva: true },
  { seccion: "ingresos",     pagina: "/admin/ingresos",     etiqueta: "Ventas",             grupo: "Dinero" },
  { seccion: "agente",       pagina: "/admin/agente",       etiqueta: "Agente",             grupo: "Agente", nueva: true },
  { seccion: "bitacora",     pagina: "/admin/bitacora",     etiqueta: "Bitácora",           grupo: "Control" },
  { seccion: "curso",        pagina: "/admin/curso",        etiqueta: "Curso IA",           grupo: "Control" },
];

/** Los grupos del menú en orden, sin repetir. */
export const GRUPOS_MENU: GrupoMenu[] = PESTANAS.map(p => p.grupo).filter((g, i, xs) => xs.indexOf(g) === i);

/** La pestaña que solo ve el dueño: desde ahí se decide lo de los demás. */
export const SECCION_SOLO_DUENO: SeccionAdmin = "inicio";

const esSeccion = (v: unknown): v is SeccionAdmin => PESTANAS.some(p => p.seccion === v);

/**
 * Lo que de verdad puede ver alguien, a partir de lo guardado (o de nada): el
 * dueño lo ve TODO siempre —no puede dejarse fuera—, e Inicio es solo suyo.
 * Sin nada guardado, lo de su rol.
 */
export function seccionesValidas(rol: RolAdmin, raw: unknown): SeccionAdmin[] {
  if (rol === "dueno") return PESTANAS.map(p => p.seccion);
  const base = Array.isArray(raw) ? raw.filter(esSeccion) : SECCIONES_POR_ROL[rol];
  return PESTANAS.map(p => p.seccion).filter(x => x !== SECCION_SOLO_DUENO && base.includes(x));
}

/**
 * A dónde mandar a alguien: su primera pestaña, en el orden del menú. Las de
 * INDICADORES no sirven de portada (4 nov 2026): van arriba en el menú, pero
 * Martín y Erick entran a trabajar (Bandeja, Calendario), no a leer tableros;
 * solo si es lo único que ven. Así nadie cambia de portada por el menú nuevo.
 */
export function primeraPagina(secciones: SeccionAdmin[]): string | null {
  const NO_ES_PORTADA: SeccionAdmin[] = ["metas", "demanda", "analisis", "embudo", "ocupacion", "portafolio", "precios", "experiencia"];
  return PESTANAS.find(p => secciones.includes(p.seccion) && !NO_ES_PORTADA.includes(p.seccion))?.pagina
    ?? PESTANAS.find(p => secciones.includes(p.seccion))?.pagina ?? null;
}

// ── Qué se puede TOCAR, no solo ver ─────────────────────────────────────────
// Ver una cifra y poder cambiarla son permisos distintos.
export type AccionFinanciera =
  | "registrarCobro"          // el dinero que entra por una reserva
  | "marcarEntregaEfectivo"   // dar por recibido el efectivo que trae alguien
  | "anularMovimiento";       // deshacer un cobro (queda el rastro)

// 🔴 Quien VENDE tiene que poder registrar el cobro: es quien recibe el dinero
// y el único que sabe si llegó en efectivo o por transferencia. Lo que NO puede
// es dar por entregado ese efectivo — eso lo confirma quien lo recibe.
const PERMISOS_FINANCIEROS: Record<RolAdmin, AccionFinanciera[]> = {
  guia:      [],
  operacion: ["registrarCobro"],
  socio:     ["registrarCobro", "marcarEntregaEfectivo", "anularMovimiento"],
  dueno:     ["registrarCobro", "marcarEntregaEfectivo", "anularMovimiento"],
};

export function puedeHacer(rol: RolAdmin, accion: AccionFinanciera): boolean {
  return PERMISOS_FINANCIEROS[rol].includes(accion);
}

// ── Listas blancas por rol (lote 8, 10 nov 2026) ────────────────────────────
// Antes cada API decía a quién NO dejar («rol === "guia"», «rol ===
// "operacion"»): el viaje CDMX frenaba a Operación pero dejaba pasar al guía.
// Ahora se dice a quién SÍ: un rol nuevo no entra a nada por omisión.

/** Quien trabaja en la oficina (Manolo, Martín, Erick): todo menos el guía. */
export const ROLES_DE_OFICINA: readonly RolAdmin[] = ["dueno", "socio", "operacion"];
export function esDeOficina(rol: RolAdmin): boolean {
  return ROLES_DE_OFICINA.includes(rol);
}

/** Crear y editar salidas del viaje CDMX, y dar cortesías: Manolo y Martín. */
export function administraSalidasCdmx(rol: RolAdmin): boolean {
  return rol === "dueno" || rol === "socio";
}

/**
 * ¿Ve lo que NOS cuesta (costos y margen de extras, de la salida)? Quien tiene
 * el Cotizador, que es justo la pestaña que enseña costos; el guía nunca.
 * Erick (Operación) no lo tiene de entrada: ve y cobra el precio al cliente,
 * no lo que deja (lote 8, 10 nov 2026).
 */
export function veCostos(rol: RolAdmin, secciones: readonly SeccionAdmin[]): boolean {
  return rol !== "guia" && secciones.includes("cotizador");
}

// Un token viejo (emitido antes de que existieran los roles) no trae rol:
// se trata como dueño, porque hasta hoy la única credencial era la de Manolo.
export function rolDesdeToken(valor: unknown): RolAdmin {
  return valor === "socio" || valor === "operacion" || valor === "dueno" || valor === "guia"
    ? valor
    : "dueno";
}

// ── Rutas restringidas ──────────────────────────────────────────────────────
// Cada pestaña con su página: desde que Manolo decide por persona (20 oct
// 2026), cualquiera se puede quitar. De las APIs solo se listan las que son de
// UNA pestaña; las de reservas o clientes las usan varias pestañas a la vez
// (Cotizaciones convierte en reserva, el Viaje CDMX registra cobros) y
// cerrarlas rompería pestañas que sí se ven.
const RUTAS_RESTRINGIDAS: { prefijo: string; seccion: SeccionAdmin; exacto?: boolean }[] = [
  { prefijo: "/admin",                       seccion: "inicio", exacto: true },
  { prefijo: "/api/admin/permisos",          seccion: "inicio" },
  // La revisión del jueves se captura desde el scorecard de Inicio.
  { prefijo: "/api/admin/revision-semanal",  seccion: "inicio" },
  // Lote 8 (10 nov 2026): APIs que contestaban a cualquiera con sesión. El
  // cupo de los eventos y el estado del río se mueven solo desde Inicio; la
  // migración de imágenes del blog es de una vez y nadie más la usa.
  { prefijo: "/api/admin/cupo-paquete",      seccion: "inicio" },
  { prefijo: "/api/admin/rio-estado",        seccion: "inicio" },
  { prefijo: "/api/admin/migrate-images",    seccion: "inicio" },
  { prefijo: "/admin/reservas",              seccion: "reservas"     },
  { prefijo: "/admin/calendario",            seccion: "calendario"   },
  // Cerrar un día lo hace solo el Calendario (lote 8).
  { prefijo: "/api/admin/fechas-cerradas",   seccion: "calendario"   },
  { prefijo: "/admin/salidas",               seccion: "salidas"      },
  // El viaje CDMX (pasajeros, ventas, lista de espera) solo lo usa su pestaña
  // (lote 8). No choca con «/api/admin/salidas-dia»: se compara exacto o con «/».
  { prefijo: "/api/admin/salidas",           seccion: "salidas"      },
  { prefijo: "/admin/cotizaciones",          seccion: "cotizaciones" },
  // Solo la llama la pestaña Cotizaciones (convertir, PDF, correo, WhatsApp);
  // la Bandeja propone por su propia API (lote 8).
  { prefijo: "/api/admin/cotizaciones",      seccion: "cotizaciones" },
  { prefijo: "/admin/fotos",                 seccion: "fotos"        },
  { prefijo: "/admin/resenas",               seccion: "resenas"      },
  // La lectura de Google se anota desde Reseñas; nadie más la usa.
  { prefijo: "/api/admin/resenas",           seccion: "resenas"      },
  { prefijo: "/admin/clientes",              seccion: "clientes"     },
  // Trae el perfil del check-in (cumpleaños, ciudad); ninguna otra pestaña la llama.
  { prefijo: "/api/admin/clientes",          seccion: "clientes"     },
  { prefijo: "/admin/ingresos",   seccion: "ingresos" },
  { prefijo: "/api/admin/kpis",   seccion: "ingresos" },
  // Segmentos y canales: cruza el check-in (datos personales) con el dinero.
  { prefijo: "/admin/analisis",     seccion: "analisis" },
  { prefijo: "/api/admin/analisis", seccion: "analisis" },
  { prefijo: "/admin/cobros",                seccion: "cobros"   },
  { prefijo: "/api/admin/links-pago",        seccion: "cobros"   },
  // El corte semanal enseña costos, utilidad y el reparto entre socios.
  { prefijo: "/admin/cortes",                seccion: "cortes"   },
  { prefijo: "/api/admin/cortes",            seccion: "cortes"   },
  { prefijo: "/admin/curso",      seccion: "curso"    },
  { prefijo: "/api/admin/curso",  seccion: "curso"    },
  { prefijo: "/admin/bitacora",     seccion: "bitacora" },
  { prefijo: "/api/admin/bitacora", seccion: "bitacora" },
  // 🔴 El Cotizador enseña costos y márgenes. Sin estas líneas, quitarlo del
  // rol sólo lo borraba del MENÚ: quien escribiera la dirección a mano entraba
  // igual, y sus tres APIs seguían contestando a cualquiera con sesión.
  { prefijo: "/admin/cotizador",              seccion: "cotizador" },
  { prefijo: "/api/admin/costos",             seccion: "cotizador" },
  { prefijo: "/api/admin/precios-extras",     seccion: "cotizador" },
  { prefijo: "/api/admin/tarifas-proveedor",  seccion: "cotizador" },
  // Rediseño (3 nov 2026). «/admin/salidas-dia» no choca con «/admin/salidas»:
  // el prefijo se compara exacto o seguido de «/».
  { prefijo: "/admin/bandeja",       seccion: "bandeja"      },
  { prefijo: "/api/admin/bandeja",   seccion: "bandeja"      },
  { prefijo: "/admin/leads",         seccion: "leads"        },
  { prefijo: "/api/admin/leads",     seccion: "leads"        },
  { prefijo: "/admin/seguimientos",  seccion: "seguimientos" },
  { prefijo: "/admin/salidas-dia",   seccion: "salidas-dia"  },
  { prefijo: "/api/admin/salidas-dia", seccion: "salidas-dia" },
  { prefijo: "/admin/rutas",         seccion: "rutas"        },
  { prefijo: "/api/admin/rutas",     seccion: "rutas"        },
  { prefijo: "/admin/proveedores",   seccion: "proveedores"  },
  { prefijo: "/api/admin/proveedores", seccion: "proveedores" },
  { prefijo: "/admin/rentabilidad",  seccion: "rentabilidad" },
  { prefijo: "/admin/score",         seccion: "score"        },
  { prefijo: "/api/admin/score",     seccion: "score"        },
  { prefijo: "/admin/agente",        seccion: "agente"       },
  { prefijo: "/api/admin/agente",    seccion: "agente"       },
  // Indicadores por categoría (4 nov 2026). La bitácora de cambios se anota desde Metas.
  { prefijo: "/admin/metas",         seccion: "metas"        },
  { prefijo: "/api/admin/cambios",   seccion: "metas"        },
  { prefijo: "/admin/demanda",       seccion: "demanda"      },
  { prefijo: "/admin/embudo",        seccion: "embudo"       },
  { prefijo: "/admin/ocupacion",     seccion: "ocupacion"    },
  { prefijo: "/admin/portafolio",    seccion: "portafolio"   },
  { prefijo: "/admin/precios",       seccion: "precios"      },
  { prefijo: "/admin/experiencia",   seccion: "experiencia"  },
];

export function seccionRestringida(pathname: string): SeccionAdmin | null {
  const limpio = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const hit = RUTAS_RESTRINGIDAS.find(
    r => limpio === r.prefijo || (!r.exacto && limpio.startsWith(`${r.prefijo}/`))
  );
  return hit ? hit.seccion : null;
}

// ── Las APIs del GUÍA (lote 8, 10 nov 2026) ─────────────────────────────────
// 🔴 Antes, en cuanto Manolo le abría al guía UNA pestaña más (Fotos, por
// ejemplo), el middleware le quitaba la lista blanca entera: con su sesión
// podía leer todas las reservas con su dinero o cancelarlas llamando las APIs
// a mano. Ahora su lista blanca vale SIEMPRE y solo crece con las APIs que usa
// cada pestaña que se le dé. Un texto es un prefijo (exacto o seguido de «/»);
// una expresión, una ruta concreta (p. ej. solo los cobros de una reserva).
type ApiDePestana = string | RegExp;
const COBROS_DE_RESERVA = /^\/api\/admin\/reservas\/[^/]+\/(cobros|evidencia)$/;
const CHECKIN_DE_RESERVA = /^\/api\/admin\/reservas\/[^/]+\/checkin$/;

/** Las APIs que llama la página de cada pestaña (lo compartido va en cada una que lo usa). */
export const APIS_POR_SECCION: Record<SeccionAdmin, ApiDePestana[]> = {
  inicio:        ["/api/admin/permisos", "/api/admin/revision-semanal", "/api/admin/cupo-paquete", "/api/admin/rio-estado", "/api/admin/migrate-images"],
  reservas:      ["/api/admin/reservas", "/api/admin/evidencia", "/api/admin/codigos-cumple"],
  calendario:    ["/api/admin/fechas-cerradas", COBROS_DE_RESERVA, CHECKIN_DE_RESERVA, "/api/admin/evidencia"],
  cotizaciones:  ["/api/admin/cotizaciones", "/api/admin/codigos-cumple", COBROS_DE_RESERVA, "/api/admin/evidencia"],
  cotizador:     ["/api/admin/costos", "/api/admin/precios-extras", "/api/admin/tarifas-proveedor"],
  clientes:      ["/api/admin/clientes"],
  ingresos:      ["/api/admin/kpis"],
  curso:         ["/api/admin/curso"],
  bitacora:      ["/api/admin/bitacora"],
  cortes:        ["/api/admin/cortes"],
  cobros:        ["/api/admin/links-pago"],
  fotos:         [],
  resenas:       ["/api/admin/resenas", /^\/api\/admin\/reservas\/[^/]+\/resena-whatsapp$/],
  salidas:       ["/api/admin/salidas", COBROS_DE_RESERVA, "/api/admin/evidencia"],
  analisis:      ["/api/admin/analisis"],
  bandeja:       ["/api/admin/bandeja", "/api/admin/leads", "/api/admin/tareas"],
  leads:         ["/api/admin/leads", "/api/admin/tareas"],
  seguimientos:  ["/api/admin/tareas"],
  "salidas-dia": ["/api/admin/salidas-dia"],
  rutas:         ["/api/admin/rutas"],
  proveedores:   ["/api/admin/proveedores"],
  rentabilidad:  [],
  score:         ["/api/admin/score"],
  agente:        ["/api/admin/agente"],
  metas:         ["/api/admin/cambios"],
  demanda:       [], embudo: [], ocupacion: [], portafolio: [], precios: [], experiencia: [],
};

/** Lo que el guía usa siempre: sus salidas, refrescar su sesión y la campana de seguimientos (que a él le llega vacía). */
export const API_GUIA_BASE: readonly string[] = ["/api/admin/salidas-dia", "/api/admin/sesion", "/api/admin/tareas"];

const coincide = (pathname: string, api: ApiDePestana) =>
  typeof api === "string" ? pathname === api || pathname.startsWith(`${api}/`) : api.test(pathname);

/**
 * ¿El guía puede llamar esta API? Su lista blanca más las APIs de las pestañas
 * que tiene. La pestaña en sí la sigue revisando `seccionRestringida`.
 */
export function apiPermitidaAlGuia(pathname: string, secciones: readonly SeccionAdmin[]): boolean {
  const limpio = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (API_GUIA_BASE.some(p => coincide(limpio, p))) return true;
  return secciones.some(s => (APIS_POR_SECCION[s] ?? []).some(api => coincide(limpio, api)));
}

/**
 * La decisión del middleware para una API del panel, ya con la sesión leída
 * (lote 8): null = pasa; si no, el código HTTP con que se frena.
 */
export function decisionApiPanel(pathname: string, sesion: { rol: RolAdmin; secciones: readonly SeccionAdmin[] } | null): null | 401 | 403 {
  if (!sesion) return 401;
  if (sesion.rol === "guia" && !apiPermitidaAlGuia(pathname, sesion.secciones)) return 403;
  const seccion = seccionRestringida(pathname);
  if (seccion && !sesion.secciones.includes(seccion)) return 403;
  return null;
}

// ── Las personas con acceso ─────────────────────────────────────────────────
// Es función (no constante) porque lee variables de entorno en tiempo de ejecución.
export function usuariosAdmin(): UsuarioAdmin[] {
  const dueno = (process.env.ADMIN_USERNAME || "manolo").toLowerCase();
  return [
    {
      user: dueno,
      nombre: "Manolo",
      rol: "dueno",
      envPassword: "ADMIN_PASSWORD",
      envPasswordHash: "ADMIN_PASSWORD_HASH",
    },
    {
      user: "martin",
      nombre: "Martín",
      rol: "socio",
      envPassword: "ADMIN_PASSWORD_MARTIN",
      envPasswordHash: "ADMIN_PASSWORD_HASH_MARTIN",
    },
    {
      user: "erick",
      nombre: "Erick",
      rol: "operacion",
      envPassword: "ADMIN_PASSWORD_ERICK",
      envPasswordHash: "ADMIN_PASSWORD_HASH_ERICK",
    },
    // Un acceso para quien guía (3 nov 2026). Sin `ADMIN_PASSWORD_GUIA` en
    // Railway no puede entrar: no hay contraseña por defecto.
    {
      user: "guia",
      nombre: "Guía",
      rol: "guia",
      envPassword: "ADMIN_PASSWORD_GUIA",
      envPasswordHash: "ADMIN_PASSWORD_HASH_GUIA",
    },
  ];
}
