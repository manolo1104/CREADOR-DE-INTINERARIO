import { sesionActual } from "@/lib/admin/sesion";
import { datosDelPanel } from "@/lib/viajeCdmx/admin";
import SalidasClient from "./SalidasClient";
import { administraSalidasCdmx } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";
export const metadata = { title: "Viaje CDMX — Admin" };

export default async function SalidasPage() {
  const [datos, sesion] = await Promise.all([datosDelPanel(), sesionActual()]);
  return (
    <SalidasClient
      inicial={datos}
      puedeEditar={!!sesion && administraSalidasCdmx(sesion.rol)}
      quien={sesion?.nombre ?? ""}
    />
  );
}
