import { cookies } from "next/headers";
import { verifyToken } from "./auth";
import { rolDesdeToken, type RolAdmin } from "./usuarios";

export interface SesionAdmin {
  user: string;
  nombre: string;
  rol: RolAdmin;
}

// Lee la cookie del panel en un componente de servidor.
// El middleware ya bloqueó el paso a quien no tiene sesión: esto solo sirve
// para saber QUIÉN entró y pintar el panel según su rol.
export async function sesionActual(): Promise<SesionAdmin | null> {
  const token = cookies().get("admin_session")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return {
      user:   typeof payload.user === "string" ? payload.user : "",
      nombre: typeof payload.nombre === "string" ? payload.nombre : "Admin",
      rol:    rolDesdeToken(payload.rol),
    };
  } catch {
    return null;
  }
}
