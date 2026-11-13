import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { usuariosAdmin, type SeccionAdmin, type UsuarioAdmin } from "./usuarios";
import { ROLES_CON_HUELLA, claveConfigurada, huellaDeClave, huellaDeSesionVigente } from "./huellaClave";

// Sin fallback: si falta ADMIN_JWT_SECRET la app no puede firmar/verificar sesiones.
function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw) {
    throw new Error("ADMIN_JWT_SECRET no está configurada");
  }
  return new TextEncoder().encode(raw);
}

/**
 * La sesión lleva las pestañas que ve esa persona (`secciones`): el middleware
 * no puede leer la base, así que las lee de aquí. `expira` (segundos epoch) sirve
 * para volver a firmar la MISMA sesión con pestañas nuevas sin alargarla.
 */
export async function createToken(usuario: UsuarioAdmin, secciones: SeccionAdmin[], expira?: number): Promise<string> {
  // La sesión del guía lleva la huella de su contraseña (lote 8, 10 nov 2026):
  // al cambiarla en Railway, las sesiones abiertas dejan de valer.
  const clave = ROLES_CON_HUELLA.includes(usuario.rol) ? claveConfigurada(usuario) : "";
  return new SignJWT({
    role:   "admin",
    user:   usuario.user,
    rol:    usuario.rol,
    nombre: usuario.nombre,
    secciones,
    ...(clave ? { huella: await huellaDeClave(getSecret(), clave) } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira ?? "7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  // La sesión del guía con la contraseña de antes ya no vale (lote 8).
  if (!(await huellaDeSesionVigente(payload, getSecret()))) throw new Error("Sesión de una contraseña anterior");
  return payload;
}

// Devuelve el usuario que entró, o null si usuario/contraseña no cuadran.
export async function checkCredentials(
  username: string,
  password: string,
): Promise<UsuarioAdmin | null> {
  const tecleado = (username || "").trim().toLowerCase();
  const usuario = usuariosAdmin().find(u => u.user === tecleado);
  if (!usuario) return null;

  // Preferir hash bcrypt; si no, contraseña en texto plano por env.
  // Sin ninguna de las dos configurada → ese usuario no puede entrar (fail closed).
  const hash = process.env[usuario.envPasswordHash];
  if (hash) return (await bcrypt.compare(password, hash)) ? usuario : null;

  const plain = process.env[usuario.envPassword];
  if (!plain) return null;
  return password === plain ? usuario : null;
}
