import { buildTallerIcs } from "@/lib/curso";

export const dynamic = "force-static";

// GET /curso/taller.ics — las TRES noches del taller gratuito, con la liga de
// la sala dentro y una alarma 30 min antes de cada una. Lo usan el botón
// "Apartar las tres noches" de /curso/gracias?taller=1 y el adjunto de W1.
export function GET() {
  return new Response(buildTallerIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taller-turismo-con-ia.ics"',
    },
  });
}
