import { sesionActual } from "@/lib/admin/sesion";
import { puedeHacer } from "@/lib/admin/usuarios";
import { calcKPIs } from "@/lib/admin/kpis";
import { contarClicsWhatsapp } from "@/lib/admin/clicsWhatsapp";
import DineroClient from "./DineroClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dinero — Admin" };

export default async function DineroPage() {
  const [sesion, kpis, clics] = await Promise.all([
    sesionActual(),
    calcKPIs(),
    contarClicsWhatsapp(),
  ]);
  const rol = sesion?.rol ?? "operacion";
  return (
    <DineroClient
      permisos={{
        gastoGeneral:    puedeHacer(rol, "capturarGastoGeneral"),
        anular:          puedeHacer(rol, "anularMovimiento"),
        cerrarCorte:     puedeHacer(rol, "cerrarCorte"),
        socios:          puedeHacer(rol, "configurarSocios"),
        entregaEfectivo: puedeHacer(rol, "marcarEntregaEfectivo"),
      }}
      marketing={{ kpis, clics }}
    />
  );
}
