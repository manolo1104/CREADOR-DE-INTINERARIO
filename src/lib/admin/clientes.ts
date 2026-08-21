import { prisma } from "@/lib/prisma";
import { montoCobrado, saldoPendiente } from "@/lib/admin/kpis";
import type { TourBooking } from "@prisma/client";

export interface Cliente {
  clave: string;
  email: string;
  nombre: string;
  telefono: string;
  totalReservas: number;
  totalGastado: number;   // dinero que YA entró
  totalVendido: number;   // valor de sus reservas, cobrado o no
  saldo: number;          // lo que falta cobrarle
  ultimaFecha: string;
  tours: string[];
}

const soloDigitos = (s: string) => s.replace(/\D/g, "");
const normNombre  = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Clave con la que se agrupan las reservas de una misma persona.
 *
 * ⚠️ El bug que esto arregla: se agrupaba por `customerEmail.toLowerCase()` a
 * secas. Las reservas capturadas a mano suelen ir SIN correo, así que todas
 * caían en la misma clave `""` y el panel las mostraba como UN solo cliente,
 * con el nombre de la primera y la suma del dinero de todas. En la base actual
 * eso escondía 18 personas distintas detrás de una fila.
 *
 * Orden de preferencia: correo → teléfono → nombre → la reserva misma (para no
 * volver a fusionar gente distinta cuando no hay ningún dato con el que ligar).
 */
export function claveCliente(b: TourBooking): string {
  const email = (b.customerEmail || "").trim().toLowerCase();
  if (email) return `mail:${email}`;

  const tel = soloDigitos(b.customerPhone || "");
  if (tel.length >= 8) return `tel:${tel}`;

  const nombre = normNombre(b.customerName || "");
  if (nombre) return `nom:${nombre}`;

  return `res:${b.id}`;
}

/** Nombres de TODOS los tours de una reserva (no solo el principal). */
function toursDe(b: TourBooking): string[] {
  const raw = (b as any).lineItems;
  const lineas = Array.isArray(raw)
    ? raw.filter((l: any) => l && !l._meta && l.tourName)
    : [];
  return lineas.length > 0
    ? lineas.map((l: any) => l.tourName as string)
    : (b.tourName ? [b.tourName] : []);
}

export function agruparClientes(bookings: TourBooking[]): Cliente[] {
  const map: Record<string, Cliente> = {};

  for (const b of bookings) {
    const clave = claveCliente(b);
    map[clave] ??= {
      clave,
      email: b.customerEmail || "",
      nombre: b.customerName || "(sin nombre)",
      telefono: b.customerPhone || "",
      totalReservas: 0, totalGastado: 0, totalVendido: 0, saldo: 0,
      ultimaFecha: b.tourDate, tours: [],
    };
    const c = map[clave];
    c.totalReservas++;
    c.totalGastado  += montoCobrado(b);
    c.totalVendido  += b.totalAmount;
    c.saldo         += saldoPendiente(b);
    // Rellenar huecos: una reserva puede traer el teléfono y otra el correo.
    if (!c.email    && b.customerEmail) c.email    = b.customerEmail;
    if (!c.telefono && b.customerPhone) c.telefono = b.customerPhone;
    if (b.tourDate > c.ultimaFecha) c.ultimaFecha = b.tourDate;
    for (const n of toursDe(b)) if (!c.tours.includes(n)) c.tours.push(n);
  }

  return Object.values(map).sort((a, b) => b.totalVendido - a.totalVendido);
}

export async function getClientes(): Promise<Cliente[]> {
  const bookings = await prisma.tourBooking.findMany({
    where: { status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });
  return agruparClientes(bookings);
}
