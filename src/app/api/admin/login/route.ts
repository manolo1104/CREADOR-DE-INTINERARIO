import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createToken } from "@/lib/admin/auth";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });

    const usuario = await checkCredentials(username, password);
    if (!usuario) {
      // Nunca se guarda la contraseña: solo el usuario que se tecleó.
      const tecleado = String(username).slice(0, 60);
      await registrarEnBitacora({
        accion:  "intento fallido",
        entidad: "panel",
        resumen: `Intento de entrar como "${tecleado}" con contraseña incorrecta`,
        // Todos los intentos fallidos se agrupan bajo el mismo "quién": en el
        // filtro por persona no deben parecer un usuario más del panel.
        actor:   { usuario: "intento-fallido", nombre: "Intento fallido", rol: "?" },
      });
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    await registrarEnBitacora({
      accion:  "entró",
      entidad: "panel",
      resumen: `${usuario.nombre} entró al panel`,
      actor:   { usuario: usuario.user, nombre: usuario.nombre, rol: usuario.rol },
    });

    const token = await createToken(usuario);
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
