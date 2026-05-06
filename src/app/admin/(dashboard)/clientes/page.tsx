import ClientesClient from "./ClientesClient";

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
    map[key].totalGastado += b.totalAmount;
    if (b.tourDate > map[key].ultimaFecha) map[key].ultimaFecha = b.tourDate;
    if (!map[key].tours.includes(b.tourName)) map[key].tours.push(b.tourName);
  }
  return Object.values(map).sort((a: any, b: any) => b.totalGastado - a.totalGastado);
}

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient clientes={clientes} />;
}
