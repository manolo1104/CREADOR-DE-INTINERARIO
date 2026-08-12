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

export type CartEmailTipo = "cotizacion" | "recordatorio1" | "recordatorio2" | "recordatorio3";

export interface CartEmailLinea {
  tourName:      string;
  tourDate:      string;
  adults:        number;
  childrenMid?:  number;  // 6–10 años, 70 %
  childrenSmall?: number; // menores de 6, 50 %
  children?:     number;  // total, si no vienen los tramos
  subtotal?:     number;
  eleccion?:     string;
  unidades?:     number;  // tours por vehículo (RZR)
}

export interface CartEmailInput {
  tipo:       CartEmailTipo;
  tourName:   string;
  tourDate:   string;
  adults:     number;
  children:   number;
  total:      number;
  restoreUrl: string;
  /** El itinerario completo. Sin esto el correo resume todo en una línea. */
  lineas?:    CartEmailLinea[];
  hospedaje?: {
    habitacion: string; noches: number; huespedes: number;
    checkin?: string; checkout?: string; subtotal?: number;
  } | null;
  traslado?:  { ciudad: string; personas: number; subtotal?: number } | null;
  anticipo?:  number;
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
  // Última llamada: aquí se subraya el anticipo, que es la objeción más común
  // (no querer soltar el monto completo por adelantado).
  recordatorio3: {
    subject: (t) => `¿Apartamos tu lugar para ${t}?`,
    titulo:  "Aparta tu lugar con el 30 %",
    intro:   "No hace falta que pagues todo hoy: puedes apartar tu lugar con el 30 % y liquidar el resto el día del tour. Cancelación gratuita hasta 48 h antes. Si prefieres organizarlo por WhatsApp, escríbenos al +52 489 125 1458.",
    cta:     "Apartar con el 30 %",
  },
};

const ANTICIPO_PCT = 30;

/** "2 adultos · 1 de 6 a 10 años · 1 menor de 6" — el desglose que importa. */
function gente(l: CartEmailLinea): string {
  if (l.unidades) return `${l.unidades} vehículo${l.unidades !== 1 ? "s" : ""}`;
  const partes: string[] = [];
  if (l.adults) partes.push(`${l.adults} adulto${l.adults !== 1 ? "s" : ""}`);
  if (l.childrenMid)   partes.push(`${l.childrenMid} de 6 a 10 años`);
  if (l.childrenSmall) partes.push(`${l.childrenSmall} menor${l.childrenSmall !== 1 ? "es" : ""} de 6`);
  if (!l.childrenMid && !l.childrenSmall && l.children) {
    partes.push(`${l.children} menor${l.children !== 1 ? "es" : ""}`);
  }
  return partes.join(" · ") || "1 persona";
}

const fila = (izq: string, der: string, sub = "") => `
      <tr>
        <td style="padding:13px 16px;border-top:1px solid #e3ddc9;vertical-align:top">
          <div style="color:#1a2e1a;font-size:14px;line-height:1.35">${izq}</div>
          ${sub ? `<div style="color:#7d7566;font-size:12px;margin-top:3px;line-height:1.4">${sub}</div>` : ""}
        </td>
        <td style="padding:13px 16px;border-top:1px solid #e3ddc9;text-align:right;white-space:nowrap;color:#1a2e1a;font-size:14px;vertical-align:top">${der}</td>
      </tr>`;

export function buildCartEmailHtml(d: CartEmailInput): { subject: string; html: string } {
  const c = COPY[d.tipo];
  const lineas = d.lineas?.length ? d.lineas : null;

  // ⚠️ El grupo NO se suma entre recorridos: son las MISMAS personas yendo
  // varios días. Sumando, un viaje de 2 días para 3 personas decía "6".
  const grupo = lineas
    ? Math.max(...lineas.map((l) => (l.adults || 0) + (l.childrenMid || 0) + (l.childrenSmall || 0) + (l.children || 0)), 0)
    : d.adults + d.children;

  const filasTours = lineas
    ? lineas.map((l) => fila(
        l.tourName.split("—")[0].trim(),
        l.subtotal != null ? mx(l.subtotal) : "",
        `${formatFecha(l.tourDate)} · ${gente(l)}${l.eleccion ? ` · Eligió: ${l.eleccion}` : ""}`,
      )).join("")
    : fila(d.tourName, mx(d.total), `${formatFecha(d.tourDate)} · ${d.adults} adulto${d.adults !== 1 ? "s" : ""}${d.children ? ` · ${d.children} menor${d.children !== 1 ? "es" : ""}` : ""}`);

  const filaHotel = d.hospedaje
    ? fila(
        `🏨 ${d.hospedaje.habitacion}`,
        d.hospedaje.subtotal != null ? mx(d.hospedaje.subtotal) : "",
        `${d.hospedaje.noches} noche${d.hospedaje.noches !== 1 ? "s" : ""} · ${d.hospedaje.huespedes} huésped${d.hospedaje.huespedes !== 1 ? "es" : ""}`
        + (d.hospedaje.checkin && d.hospedaje.checkout
            ? ` · ${formatFecha(d.hospedaje.checkin)} → ${formatFecha(d.hospedaje.checkout)}`
            : ""),
      )
    : "";

  const filaTraslado = d.traslado
    ? fila(
        `🚐 Traslado ${d.traslado.ciudad} → Xilitla`,
        d.traslado.subtotal != null ? mx(d.traslado.subtotal) : "",
        `Ida y vuelta · ${d.traslado.personas} pasajero${d.traslado.personas !== 1 ? "s" : ""}`,
      )
    : "";

  const anticipo = d.anticipo ?? Math.round((d.total * ANTICIPO_PCT) / 100);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a;background:#ffffff">
    <div style="background:#0e1710;padding:22px 24px">
      <div style="color:#c4882a;font-size:11px;letter-spacing:3px;text-transform:uppercase">Tours Huasteca Potosina</div>
      <h1 style="font-size:23px;margin:8px 0 0;color:#f5f0e3;font-weight:normal">${c.titulo}</h1>
    </div>

    <div style="padding:24px">
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 22px">${c.intro}</p>

      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;margin:0 0 8px">
        Tu viaje${lineas && lineas.length > 1 ? ` · ${lineas.length} recorridos` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;background:#faf7ee;border:1px solid #e3ddc9">
        <tr><td colspan="2" style="padding:12px 16px;background:#f2ecdc;font-size:13px;color:#5c5347">
          Grupo de <strong style="color:#1a2e1a">${grupo} persona${grupo !== 1 ? "s" : ""}</strong>
        </td></tr>
        ${filasTours}${filaTraslado}${filaHotel}
        <tr>
          <td style="padding:14px 16px;border-top:2px solid #d8cfb8;font-size:15px">Total</td>
          <td style="padding:14px 16px;border-top:2px solid #d8cfb8;text-align:right;font-size:17px;font-weight:bold;color:#3a6b1a;white-space:nowrap">${mx(d.total)}</td>
        </tr>
        <tr>
          <td style="padding:0 16px 14px;font-size:13px;color:#7d7566">Apartas hoy con el ${ANTICIPO_PCT} %</td>
          <td style="padding:0 16px 14px;text-align:right;font-size:14px;color:#c4882a;white-space:nowrap">${mx(anticipo)}</td>
        </tr>
      </table>

      <p style="text-align:center;margin:26px 0 8px">
        <a href="${d.restoreUrl}" style="background:#c4882a;color:#0e1710;text-decoration:none;padding:15px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
          ${c.cta} →
        </a>
      </p>
      <p style="text-align:center;font-size:12px;color:#8a8275;margin:0 0 22px">
        Se abre con todo lo que elegiste, listo para pagar.
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:12px;color:#6b6357;border-top:1px solid #e3ddc9">
        <tr>
          <td style="padding:12px 0 0;line-height:1.6">
            ✓ Cancelación gratuita hasta 48 h antes<br>
            ✓ Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles<br>
            ✓ Guías certificados NOM-09 SECTUR · grupos pequeños
          </td>
        </tr>
      </table>

      <p style="font-size:12px;line-height:1.6;color:#8a8275;text-align:center;margin:20px 0 0">
        ¿Prefieres organizarlo por chat? Escríbenos al
        <a href="https://wa.me/524891251458" style="color:#3a6b1a;text-decoration:none">+52 489 125 1458</a>.
      </p>
      <p style="font-size:11px;color:#aaa;text-align:center;margin-top:16px">
        Si ya no te interesa, ignora este correo y no te volveremos a escribir por esta reserva.
      </p>
    </div>
  </div>`;

  return { subject: c.subject(d.tourName), html };
}
