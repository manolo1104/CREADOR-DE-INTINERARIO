import { sesionActual } from "@/lib/admin/sesion";
import CorteSemanalClient from "./CorteSemanalClient";

export const dynamic = "force-dynamic";

// El candado (solo dueño y socio) lo pone el middleware: ver RUTAS_RESTRINGIDAS
// en src/lib/admin/usuarios.ts.
export default async function CortesPage() {
  // Quien entró es quien recibió el dinero al registrar un cobro desde el corte.
  const sesion = await sesionActual();
  return <CorteSemanalClient quien={sesion?.nombre ?? "Admin"} />;
}
