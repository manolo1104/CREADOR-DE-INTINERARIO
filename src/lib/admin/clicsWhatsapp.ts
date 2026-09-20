import { prisma } from "@/lib/prisma";
import { TOURS_DB } from "@/lib/tours";

/**
 * Los clics a WhatsApp, contados.
 *
 * Es la única medida que existe de la puerta por la que entra la mayor parte
 * del negocio: el sitio informa y la venta se cierra por chat. Sin esto, la
 * única cifra disponible eran las reservas cerradas, que llegan días después y
 * no dicen qué página las provocó.
 */

const NOMBRE_POR_SLUG: Record<string, string> = {};
for (const t of TOURS_DB) NOMBRE_POR_SLUG[t.slug] = t.nombre;

export interface ClicsWhatsapp {
  total: number;
  ultimos7: number;
  ultimos30: number;
  porPagina: { pagina: string; clics: number }[];
  porTour:   { slug: string; nombre: string; clics: number }[];
  porDia:    { dia: string; clics: number }[];
  /** De cada 100 personas que abrieron WhatsApp, cuántas acabaron reservando. */
  reservasEnElPeriodo: number;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function contarClicsWhatsapp(): Promise<ClicsWhatsapp> {
  const hace30 = new Date(Date.now() - 30 * 86400000);
  const hace7  = new Date(Date.now() -  7 * 86400000);

  const eventos = await prisma.trackEvent.findMany({
    where:   { event: "WHATSAPP_CLICK", createdAt: { gte: hace30 } },
    select:  { path: true, tourSlug: true, createdAt: true, data: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const porPagina: Record<string, number> = {};
  const porTour:   Record<string, number> = {};
  const porDia:    Record<string, number> = {};
  let ultimos7 = 0;

  for (const e of eventos) {
    // La página viene en `path`; si el evento la mandó dentro de `data`, se usa
    // esa: los botones instrumentados a mano no siempre llenan `path`.
    const pagina = e.path || ((e.data as any)?.pagina as string) || "(sin página)";
    porPagina[pagina] = (porPagina[pagina] ?? 0) + 1;

    const slug = e.tourSlug || ((e.data as any)?.tour as string) || "";
    if (slug && NOMBRE_POR_SLUG[slug]) porTour[slug] = (porTour[slug] ?? 0) + 1;

    const dia = ymd(e.createdAt);
    porDia[dia] = (porDia[dia] ?? 0) + 1;

    if (e.createdAt >= hace7) ultimos7++;
  }

  const reservas = await prisma.tourBooking.count({
    where: { createdAt: { gte: hace30 }, status: { not: "cancelled" } },
  });

  const dias: { dia: string; clics: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = ymd(new Date(Date.now() - i * 86400000));
    dias.push({ dia: d, clics: porDia[d] ?? 0 });
  }

  return {
    total:    eventos.length,
    ultimos7,
    ultimos30: eventos.length,
    porPagina: Object.entries(porPagina)
      .map(([pagina, clics]) => ({ pagina, clics }))
      .sort((a, b) => b.clics - a.clics)
      .slice(0, 12),
    porTour: Object.entries(porTour)
      .map(([slug, clics]) => ({ slug, nombre: NOMBRE_POR_SLUG[slug] ?? slug, clics }))
      .sort((a, b) => b.clics - a.clics)
      .slice(0, 10),
    porDia: dias,
    reservasEnElPeriodo: reservas,
  };
}
