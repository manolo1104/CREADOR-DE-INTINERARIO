// Quién puede entrar al panel y qué puede ver cada quien.
//
// Las contraseñas NO viven en este archivo: el repositorio es público.
// Cada persona tiene su propia variable de entorno en Railway; si la variable
// no está puesta, ese usuario simplemente no puede entrar (fail closed).

export type RolAdmin = "dueno" | "socio" | "operacion";

export type SeccionAdmin =
  | "inicio" | "reservas" | "calendario" | "cotizaciones"
  | "cotizador" | "clientes" | "ingresos" | "curso" | "bitacora"
  | "finanzas" | "socios";

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
  "inicio", "reservas", "calendario", "cotizaciones", "cotizador", "clientes",
];
// socio: todo lo de tours, ventas y finanzas. Sin el Curso de IA (otro
// negocio) y sin la configuración de la sociedad: ver el reparto es una cosa,
// poder cambiarse el porcentaje es otra.
const SOCIO: SeccionAdmin[] = [...OPERACION, "ingresos", "finanzas"];
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
  { prefijo: "/admin/finanzas",              seccion: "finanzas" },
  { prefijo: "/api/admin/finanzas",          seccion: "finanzas" },
  { prefijo: "/api/admin/cortes",            seccion: "finanzas" },
  { prefijo: "/api/admin/socios",            seccion: "socios"   },
  { prefijo: "/admin/curso",      seccion: "curso"    },
  { prefijo: "/api/admin/curso",  seccion: "curso"    },
  { prefijo: "/admin/bitacora",     seccion: "bitacora" },
  { prefijo: "/api/admin/bitacora", seccion: "bitacora" },
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
