// Quién puede entrar al panel y qué puede ver cada quien.
//
// Las contraseñas NO viven en este archivo: el repositorio es público.
// Cada persona tiene su propia variable de entorno en Railway; si la variable
// no está puesta, ese usuario simplemente no puede entrar (fail closed).

export type RolAdmin = "dueno" | "socio" | "operacion";

export type SeccionAdmin =
  | "inicio" | "reservas" | "calendario" | "cotizaciones"
  | "cotizador" | "clientes" | "ingresos" | "curso" | "bitacora";

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
// socio: todo lo de tours, incluidos ingresos. Sin el Curso de IA (otro negocio).
const SOCIO: SeccionAdmin[] = [...OPERACION, "ingresos"];
// dueño: todo. La bitácora (quién hizo qué) es SOLO suya: si quien está siendo
// registrado pudiera leerla, dejaría de servir para lo que se hizo.
const DUENO: SeccionAdmin[] = [...SOCIO, "curso", "bitacora"];

export const SECCIONES_POR_ROL: Record<RolAdmin, SeccionAdmin[]> = {
  dueno:     DUENO,
  socio:     SOCIO,
  operacion: OPERACION,
};

export function puedeVer(rol: RolAdmin, seccion: SeccionAdmin): boolean {
  return SECCIONES_POR_ROL[rol].includes(seccion);
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
  { prefijo: "/api/admin/gastos",            seccion: "ingresos" },
  { prefijo: "/api/admin/corte",             seccion: "ingresos" },
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
