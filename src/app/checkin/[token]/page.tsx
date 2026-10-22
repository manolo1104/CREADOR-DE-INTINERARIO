import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { localeDeReserva, nombreDePila } from "@/lib/reviewRequest";
import { nombreTour } from "@/lib/reviewEmail";
import { cuandoEsElTour } from "@/lib/checkinEmail";
import { estaDeBaja } from "@/lib/estaDeBaja";
import { hoyMX } from "@/lib/dates";
import { ESTADOS_EXCLUIDOS, correoUtil, fechaDelTour } from "@/lib/encuestas/encuesta";
import { LigaQueNoFunciona } from "@/components/encuestas/LigaQueNoFunciona";
import { CheckinForm, type RespuestasPrevias } from "./CheckinForm";

export const dynamic = "force-dynamic";

// Liga personal de un cliente: no se indexa ni se sigue. No va en el
// Disallow de robots.ts a propósito (ver el comentario de ese archivo): así
// Google puede leer el noindex si alguna vez la encuentra.
export const metadata: Metadata = {
  // «Check-in» se entiende igual en los dos idiomas.
  title: "Check-in · Tours Huasteca Potosina",
  robots: { index: false, follow: false },
};

/**
 * El check-in previo al tour (21 oct 2026). Abrir la página NO graba nada: los
 * robots antivirus abren las ligas de los correos. Solo cuenta «Enviar».
 */
export default async function CheckinPage({ params }: { params: { token: string } }) {
  const enc = await prisma.encuestaReserva.findUnique({
    where: { token: params.token },
    include: {
      booking: {
        select: {
          customerName: true, customerEmail: true, tourName: true, tourSlug: true, tourDate: true, lineItems: true, status: true,
          adults: true, children: true, totalAmount: true,
        },
      },
    },
  });

  const b = enc?.booking;
  if (!enc || !b) return <LigaQueNoFunciona />;
  const locale = localeDeReserva(b.lineItems);
  if (ESTADOS_EXCLUIDOS.includes(b.status)) return <LigaQueNoFunciona cancelada={locale} />;

  const tour = nombreTour(b.tourName, b.tourSlug, locale).split("—")[0].trim();
  const previas: RespuestasPrevias | null = enc.checkinEn
    ? {
        ciudadOrigen:       enc.ciudadOrigen ?? "",
        fechaNacimiento:    enc.fechaNacimiento ?? "",
        tipoGrupo:          enc.tipoGrupo ?? "",
        comoNosConocio:     enc.comoNosConocio ?? "",
        comoNosConocioOtro: enc.comoNosConocioOtro ?? "",
        primeraVez:         enc.primeraVez,
        motivo:             enc.motivo ?? "",
        aceptaPromos:       enc.aceptaPromos,
      }
    : null;

  const fecha = fechaDelTour(b);
  // El regalo llega por correo: sin uno útil, o con la baja pedida, no se ofrece.
  const puedeRegalo = correoUtil(b.customerEmail) && !(await estaDeBaja(b.customerEmail));

  return (
    <main lang={locale} className="min-h-screen bg-crema px-5 pt-12 pb-20">
      <CheckinForm
        token={params.token}
        locale={locale}
        nombre={nombreDePila(b.customerName)}
        tour={tour}
        cuando={cuandoEsElTour(fecha, locale)}
        yaPaso={fecha < hoyMX()}
        puedeRegalo={puedeRegalo}
        previas={previas}
      />
    </main>
  );
}
