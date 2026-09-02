import { buildCalendarioIcs } from "@/lib/curso";

export const dynamic = "force-static";

// GET /curso/calendario.ics — las 8 sesiones y los 4 talleres, para agregar
// al calendario del teléfono de un toque. La misma función arma el adjunto
// del correo de bienvenida: una sola fuente de fechas.
export function GET() {
  return new Response(buildCalendarioIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="curso-turismo-con-ia.ics"',
    },
  });
}
