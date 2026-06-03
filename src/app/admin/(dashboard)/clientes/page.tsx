import ClientesClient from "./ClientesClient";
import { montoCobrado } from "@/lib/admin/kpis";

export const dynamic = "force-dynamic";

async function getClientes() {
  const { prisma } = await import("@/lib/prisma");
  const bookings = await prisma.tourBooking.findMany({
    where: { status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });
  const map: Record<string, any> = {};
  for (const b of bookings) {
    const key = b.customerEmail.toLowerCase();
    if (!map[key]) map[key] = {
      email: b.customerEmail, nombre: b.customerName,
      telefono: b.customerPhone || "",
      totalReservas: 0, totalGastado: 0, ultimaFecha: b.tourDate, tours: [],
    };
    map[key].totalReservas++;
    // "Total gastado" = dinero realmente cobrado (no contar pendientes sin pagar).
    map[key].totalGastado += montoCobrado(b);
    if (b.tourDate > map[key].ultimaFecha) map[key].ultimaFecha = b.tourDate;
    // Incluir todos los tours de la reserva (lineItems), no solo el principal.
    const lines = Array.isArray((b as any).lineItems)
      ? (b as any).lineItems.filter((l: any) => l && !l._meta && l.tourName)
      : [];
    const nombres = lines.length > 0 ? lines.map((l: any) => l.tourName as string) : [b.tourName];
    for (const n of nombres) {
      if (n && !map[key].tours.includes(n)) map[key].tours.push(n);
    }
  }
  return Object.values(map).sort((a: any, b: any) => b.totalGastado - a.totalGastado);
}

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient clientes={clientes} />;
}
