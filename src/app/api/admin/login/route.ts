import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createToken } from "@/lib/admin/auth";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * 🔴 El login no tenía ningún límite y el repositorio es PÚBLICO: los nombres de
 * usuario se leen en el código. Cualquiera podía probar contraseñas sin parar.
 * Dos topes: por conexión (`rateLimit`) y por usuario, para que cambiar de IP
 * no sirva. Se cuentan solo los FALLOS y un acierto borra la cuenta.
 */
const VENTANA_MS = 15 * 60 * 1000;
const FALLOS_POR_USUARIO = 10;
const fallos = new Map<string, { n: number; hasta: number }>();

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "admin-login", limit: 10, windowMs: VENTANA_MS });
  if (limited) return limited;

  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });

    const clave = String(username).trim().toLowerCase().slice(0, 60);
    const ahora = Date.now();
    const previo = fallos.get(clave);
    if (previo && previo.hasta > ahora && previo.n >= FALLOS_POR_USUARIO) {
      return NextResponse.json(
        { error: "Demasiados intentos con este usuario. Espera 15 minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((previo.hasta - ahora) / 1000)) } },
      );
    }

    const usuario = await checkCredentials(username, password);
    if (!usuario) {
      fallos.set(clave, previo && previo.hasta > ahora
        ? { n: previo.n + 1, hasta: previo.hasta }
        : { n: 1, hasta: ahora + VENTANA_MS });
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

    fallos.delete(clave);
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
