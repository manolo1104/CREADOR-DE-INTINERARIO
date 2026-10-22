import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { localeDeReserva, nombreDePila, GOOGLE_REVIEW_URL } from "@/lib/reviewRequest";
import { nombreTour } from "@/lib/reviewEmail";
import { LigaQueNoFunciona } from "@/components/encuestas/LigaQueNoFunciona";
import { OpinaForm } from "./OpinaForm";

export const dynamic = "force-dynamic";

// Liga personal: no se indexa (ver el comentario de `checkin/[token]/page.tsx`).
// El título va en el idioma en que reservó.
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const enc = await prisma.encuestaReserva.findUnique({
    where: { token: params.token }, select: { booking: { select: { lineItems: true } } },
  }).catch(() => null);
  const en = enc ? localeDeReserva(enc.booking.lineItems) === "en" : false;
  return {
    title: `${en ? "How did it go?" : "¿Cómo te fue?"} · Tours Huasteca Potosina`,
    robots: { index: false, follow: false },
  };
}

/**
 * La encuesta de satisfacción (21 oct 2026). Llega con la estrella que tocó en
 * el correo (`?c=4`) ya marcada, pero NO se guarda nada hasta «Enviar»: los
 * robots antivirus abren las cinco ligas del correo.
 */
export default async function OpinaPage({ params, searchParams }: {
  params: { token: string };
  searchParams: { c?: string };
}) {
  const enc = await prisma.encuestaReserva.findUnique({
    where: { token: params.token },
    include: { booking: { select: { customerName: true, tourName: true, tourSlug: true, lineItems: true } } },
  });

  if (!enc) return <LigaQueNoFunciona />;

  const b = enc.booking;
  const locale = localeDeReserva(b.lineItems);
  const c = Number(searchParams.c);
  // La estrella que acaba de tocar en el correo gana sobre la que guardó antes.
  const inicial = (Number.isInteger(c) && c >= 1 && c <= 5 ? c : 0) || (enc.calificacion ?? 0);

  return (
    <main lang={locale} className="min-h-screen bg-crema px-5 pt-12 pb-20">
      <OpinaForm
        token={params.token}
        locale={locale}
        nombre={nombreDePila(b.customerName)}
        tour={nombreTour(b.tourName, b.tourSlug, locale).split("—")[0].trim()}
        googleUrl={GOOGLE_REVIEW_URL}
        inicial={{ calificacion: inicial, recomendaria: enc.recomendaria, comentario: enc.comentario ?? "" }}
        yaContesto={!!enc.satisfaccionEn}
      />
    </main>
  );
}
