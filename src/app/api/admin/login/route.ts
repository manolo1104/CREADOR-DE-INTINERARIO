import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createToken } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });

    const ok = await checkCredentials(username, password);
    if (!ok)
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });

    const token = await createToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
