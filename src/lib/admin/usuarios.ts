// Quién puede entrar al panel y qué puede ver cada quien.
//
// Las contraseñas NO viven en este archivo: el repositorio es público.
// Cada persona tiene su propia variable de entorno en Railway; si la variable
// no está puesta, ese usuario simplemente no puede entrar (fail closed).

export type RolAdmin = "dueno" | "socio" | "operacion";

export type SeccionAdmin =
  | "inicio" | "reservas" | "calendario" | "cotizaciones"
  | "cotizador" | "clientes" | "ingresos" | "curso" | "bitacora"
  | "finanzas" | "socios" | "cobros" | "fotos";

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
  // El Cotizador NO: enseña lo que nos cuesta cada tour y el margen que deja.
  // Estaba dentro y contradecía la propia definición del rol —"sin ver los
  // números del negocio"—. Fuera por decisión de Manolo, 23 sep 2026.
];
// socio: todo lo de tours, ventas y finanzas. Sin el Curso de IA (otro
// negocio) y sin la configuración de la sociedad: ver el reparto es una cosa,
// poder cambiarse el porcentaje es otra.
// ⚠️ El Cotizador entra AQUÍ y no en OPERACION. OPERACION es la base de los
// otros dos roles: lo que se le quita, se le quita también al socio y al
// dueño. Al sacarlo de ahí se quedó sin él TODO el mundo, Manolo incluido.
const SOCIO: SeccionAdmin[] = [...OPERACION, "ingresos", "finanzas", "cotizador"];
// dueño: todo. La bitácora (quién hizo qué) y la configuración de socios son
// SOLO suyas: si quien está siendo registrado pudiera leerla o repartirse la
// utilidad, dejarían de servir para lo que se hicieron.
const DUENO: SeccionAdmin[] = [...SOCIO, "curso", "bitacora", "socios"];

export const SECCIONES_POR_ROL: Record<RolAdmin, SeccionAdmin[]> = {
  dueno:     DUENO,
  socio:     SOCIO,
  operacion: OPERACION,
};

export function puedeVer(rol: RolAdmin, seccion: SeccionAdmin): boolean {
  return SECCIONES_POR_ROL[rol].includes(seccion);
}

// ── Qué se puede TOCAR, no solo ver ─────────────────────────────────────────
// Ver una cifra y poder cambiarla son permisos distintos. Operación captura lo
// que gastó en su salida —es quien lo sabe— pero no toca los gastos de la
// empresa, ni el reparto, ni cierra un corte.
export type AccionFinanciera =
  | "capturarCostoDeSalida"   // el lanchero de la reserva de hoy
  | "capturarGastoGeneral"    // hosting, publicidad, contabilidad
  | "anularMovimiento"        // deshacer un movimiento (queda el rastro)
  | "cerrarCorte"
  | "configurarSocios";

const PERMISOS_FINANCIEROS: Record<RolAdmin, AccionFinanciera[]> = {
  operacion: ["capturarCostoDeSalida"],
  socio:     ["capturarCostoDeSalida", "capturarGastoGeneral", "anularMovimiento", "cerrarCorte"],
  dueno:     ["capturarCostoDeSalida", "capturarGastoGeneral", "anularMovimiento", "cerrarCorte", "configurarSocios"],
};

export function puedeHacer(rol: RolAdmin, accion: AccionFinanciera): boolean {
  return PERMISOS_FINANCIEROS[rol].includes(accion);
}

// Un token viejo (emitido antes de que existieran los roles) no trae rol:
// se trata como dueño, porque hasta hoy la única credencial era la de Manolo.
export function rolDesdeToken(valor: unknown): RolAdmin {
  return valor === "socio" || valor === "operacion" || valor === "dueno"
    ? valor
    : "dueno";
}

// ── Rutas restringidas ──────────────────────────────────────────────────────
// Solo se listan las secciones que algún rol NO puede ver. Todo lo demás del
// panel es operación básica y lo ven los tres.
const RUTAS_RESTRINGIDAS: { prefijo: string; seccion: SeccionAdmin }[] = [
  { prefijo: "/admin/ingresos",   seccion: "ingresos" },
  { prefijo: "/api/admin/kpis",   seccion: "ingresos" },
  // El corte y los gastos enseñan utilidad y márgenes: mismo candado que Ingresos.
  // /api/admin/movimientos NO se restringe por sección a propósito: quien opera
  // captura el costo de SU salida (es quien lo sabe) aunque no vea Finanzas.
  // Qué puede registrar cada quien se decide dentro de la ruta, con puedeHacer().
  { prefijo: "/admin/cobros",                seccion: "cobros"   },
  { prefijo: "/api/admin/links-pago",        seccion: "cobros"   },
  { prefijo: "/admin/finanzas",              seccion: "finanzas" },
  { prefijo: "/api/admin/finanzas",          seccion: "finanzas" },
  { prefijo: "/api/admin/cortes",            seccion: "finanzas" },
  { prefijo: "/api/admin/socios",            seccion: "socios"   },
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
];

export function seccionRestringida(pathname: string): SeccionAdmin | null {
  const hit = RUTAS_RESTRINGIDAS.find(
    r => pathname === r.prefijo || pathname.startsWith(`${r.prefijo}/`)
  );
  return hit ? hit.seccion : null;
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
  ];
}
