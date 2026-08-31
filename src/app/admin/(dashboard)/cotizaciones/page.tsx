import { prisma } from "@/lib/prisma";
import { leerPreciosExtras } from "@/lib/admin/preciosExtras";
import CotizacionesClient from "./CotizacionesClient";

export const dynamic = "force-dynamic";

export default async function CotizacionesPage() {
  const [quotes, presetsExtras] = await Promise.all([
    prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } }),
    leerPreciosExtras(),
  ]);
  return <CotizacionesClient initialQuotes={quotes} presetsExtras={presetsExtras} />;
}
