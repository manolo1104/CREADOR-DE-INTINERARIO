import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import FinanzasClient from "./FinanzasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finanzas — Admin" };

export default async function FinanzasPage() {
  const sesion = await sesionActual();
  const rol = sesion?.rol ?? "operacion";
  return (
    <FinanzasClient
      permisos={{
        gastoGeneral: puedeHacer(rol, "capturarGastoGeneral"),
        anular:       puedeHacer(rol, "anularMovimiento"),
        cerrarCorte:  puedeHacer(rol, "cerrarCorte"),
        socios:       puedeHacer(rol, "configurarSocios"),
      }}
    />
  );
}
