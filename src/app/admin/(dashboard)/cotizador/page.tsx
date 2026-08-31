import { prisma } from "@/lib/prisma";
import { conceptosDe, type CostoTour } from "@/lib/admin/costos";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import { leerTarifasProveedor } from "@/lib/admin/tarifasProveedor";
import CotizadorClient from "./CotizadorClient";

export const dynamic = "force-dynamic";

export default async function CotizadorPage() {
  const [filas, presetsExtras, tarifasProveedor] = await Promise.all([
    prisma.tourCosto.findMany(),
    leerPreciosExtras(),
    leerTarifasProveedor(),
  ]);
  const costos: CostoTour[] = filas.map(f => ({
    tourSlug:  f.tourSlug,
    conceptos: conceptosDe(f.conceptos),
    notas:     f.notas ?? "",
  }));
  return (
    <CotizadorClient
      costosIniciales={costos}
      preciosIniciales={presetsExtras}
      tarifasIniciales={tarifasProveedor}
    />
  );
}
