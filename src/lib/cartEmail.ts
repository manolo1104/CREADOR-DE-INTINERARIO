// Correos de carrito abandonado: cotización inmediata + recordatorios de recuperación.
// El link "restoreUrl" regresa al cliente a /reservar-tour/[slug] con su selección precargada.

const mx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

function formatFecha(ymd: string): string {
  // ymd = "YYYY-MM-DD" → "15 de agosto de 2026" (anclado a mediodía para no desfasar día)
  try {
    const d = new Date(`${ymd}T12:00:00`);
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return ymd;
  }
}

export type CartEmailTipo = "cotizacion" | "recordatorio1" | "recordatorio2";

export interface CartEmailInput {
  tipo:       CartEmailTipo;
  tourName:   string;
  tourDate:   string;
  adults:     number;
  children:   number;
  total:      number;
  restoreUrl: string;
}

const COPY: Record<CartEmailTipo, { subject: (t: string) => string; titulo: string; intro: string; cta: string }> = {
  cotizacion: {
    subject: (t) => `Tu cotización para ${t} 🌿`,
    titulo:  "¡Aquí está tu cotización!",
    intro:   "Guardamos tu selección para que la reserves cuando quieras. Tu lugar no está apartado hasta que confirmes — resérvalo en un clic:",
    cta:     "Reservar mi lugar",
  },
  recordatorio1: {
    subject: (t) => `Tu tour ${t} te está esperando 🌿`,
    titulo:  "¿Seguimos con tu aventura?",
    intro:   "Notamos que empezaste tu reserva pero no la terminaste. Te guardamos tu cotización — puedes retomarla justo donde la dejaste:",
    cta:     "Terminar mi reserva",
  },
  recordatorio2: {
    subject: (t) => `Últimos detalles para tu ${t}`,
    titulo:  "Tu lugar sigue disponible",
    intro:   "Antes de que se llene la fecha, aquí tienes tu cotización lista. Recuerda: cancelación gratuita hasta 48 h antes, sin riesgo.",
    cta:     "Reservar ahora",
  },
};

export function buildCartEmailHtml(d: CartEmailInput): { subject: string; html: string } {
  const c = COPY[d.tipo];
  const personas = [
    `${d.adults} adulto${d.adults !== 1 ? "s" : ""}`,
    d.children ? `${d.children} niño${d.children !== 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(" · ");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a2e1a">
    <h1 style="font-size:22px;margin:0 0 8px;color:#1a2e1a">${c.titulo}</h1>
    <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">${c.intro}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f7f4ec;border:1px solid #e3ddc9">
      <tr><td style="padding:10px 14px;color:#666">Tour</td><td style="padding:10px 14px;text-align:right;font-weight:bold">${d.tourName}</td></tr>
      <tr><td style="padding:10px 14px;color:#666;border-top:1px solid #e3ddc9">Fecha</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #e3ddc9">${formatFecha(d.tourDate)}</td></tr>
      <tr><td style="padding:10px 14px;color:#666;border-top:1px solid #e3ddc9">Participantes</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #e3ddc9">${personas}</td></tr>
      <tr><td style="padding:10px 14px;color:#666;border-top:1px solid #e3ddc9">Total</td><td style="padding:10px 14px;text-align:right;border-top:1px solid #e3ddc9;font-weight:bold;color:#3a6b1a">${mx(d.total)}</td></tr>
    </table>

    <p style="text-align:center;margin:28px 0">
      <a href="${d.restoreUrl}" style="background:#c4882a;color:#0e1710;text-decoration:none;padding:14px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
        ${c.cta} →
      </a>
    </p>

    <p style="font-size:12px;line-height:1.6;color:#888;text-align:center">
      Grupos pequeños · Guías certificados · Cancelación gratuita hasta 48 h antes.<br>
      ¿Dudas? Escríbenos por WhatsApp al +52 489 125 1458.
    </p>
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:18px">
      Tours Huasteca Potosina · Si ya no te interesa, ignora este correo y no te volveremos a escribir por esta reserva.
    </p>
  </div>`;

  return { subject: c.subject(d.tourName), html };
}
