import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "huasteca-tours-admin-secret-2026"
);

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin", user: "manolo" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export async function checkCredentials(username: string, password: string): Promise<boolean> {
  const validUser = (username || "").toLowerCase() === "manolo";
  if (!validUser) return false;

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compare(password, hash);

  return password === (process.env.ADMIN_PASSWORD || "manolitO");
}
