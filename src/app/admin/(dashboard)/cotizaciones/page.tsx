import { prisma } from "@/lib/prisma";
import CotizacionesClient from "./CotizacionesClient";

export const dynamic = "force-dynamic";

export default async function CotizacionesPage() {
  const quotes = await prisma.tourQuote.findMany({ orderBy: { createdAt: "desc" } });
  return <CotizacionesClient initialQuotes={quotes} />;
}
