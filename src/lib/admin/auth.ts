import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { usuariosAdmin, type UsuarioAdmin } from "./usuarios";

// Sin fallback: si falta ADMIN_JWT_SECRET la app no puede firmar/verificar sesiones.
function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw) {
    throw new Error("ADMIN_JWT_SECRET no está configurada");
  }
  return new TextEncoder().encode(raw);
}

export async function createToken(usuario: UsuarioAdmin): Promise<string> {
  return new SignJWT({
    role:   "admin",
    user:   usuario.user,
    rol:    usuario.rol,
    nombre: usuario.nombre,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
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
