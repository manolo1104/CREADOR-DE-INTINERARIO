// Quién puede entrar al panel y qué puede ver cada quien.
//
// Las contraseñas NO viven en este archivo: el repositorio es público.
// Cada persona tiene su propia variable de entorno en Railway; si la variable
// no está puesta, ese usuario simplemente no puede entrar (fail closed).

export type RolAdmin = "dueno" | "socio" | "operacion";

export type SeccionAdmin =
  | "inicio" | "reservas" | "calendario" | "cotizaciones"
  | "cotizador" | "clientes" | "ingresos" | "curso" | "bitacora"
  | "cortes" | "cobros" | "fotos" | "resenas";

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
  // El Cotizador NO: enseña lo que nos cuesta cada tour y el margen que deja.
  // Estaba dentro y contradecía la propia definición del rol —"sin ver los
  // números del negocio"—. Fuera por decisión de Manolo, 23 sep 2026.
];
// socio: todo lo de tours, ventas y el corte semanal. Sin el Curso de IA (otro
// negocio).
// ⚠️ El Cotizador entra AQUÍ y no en OPERACION. OPERACION es la base de los
// otros dos roles: lo que se le quita, se le quita también al socio y al
// dueño. Al sacarlo de ahí se quedó sin él TODO el mundo, Manolo incluido.
const SOCIO: SeccionAdmin[] = [...OPERACION, "ingresos", "cortes", "cotizador"];
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
  operacion: ["registrarCobro"],
  socio:     ["registrarCobro", "marcarEntregaEfectivo", "anularMovimiento"],
  dueno:     ["registrarCobro", "marcarEntregaEfectivo", "anularMovimiento"],
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
