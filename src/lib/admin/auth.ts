import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// Sin fallback: si falta ADMIN_JWT_SECRET la app no puede firmar/verificar sesiones.
function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw) {
    throw new Error("ADMIN_JWT_SECRET no está configurada");
  }
  return new TextEncoder().encode(raw);
}

export async function createToken(): Promise<string> {
  const adminUser = process.env.ADMIN_USERNAME || "manolo";
  return new SignJWT({ role: "admin", user: adminUser })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = (process.env.ADMIN_USERNAME || "manolo").toLowerCase();
  const validUser = (username || "").toLowerCase() === expectedUser;
  if (!validUser) return false;

  // Preferir hash bcrypt; si no, contraseña en texto plano por env.
  // Sin ninguna de las dos configurada → login deshabilitado (fail closed).
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  return password === plain;
}
