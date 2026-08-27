/**
 * Manda los correos del grupo E (después del viaje) y F (los que te llegan a
 * ti), más el de paquete rediseñado.
 *
 *   npx tsx src/scripts/previsualizar-correos-ef.ts <correo-destino>
 */

import { buildReviewEmailHtml } from "../lib/reviewEmail";
import { buildAvisoCarritoGrandeHtml, buildAvisoPagoIncompletoHtml } from "../lib/avisoCarritoGrande";
import { buildPaqueteConfirmEmailHtml } from "../lib/paqueteEmail";
import { sendBrevoEmail } from "../lib/brevo";
import { TOURS_DB } from "../lib/tours";
import { PAQUETES_DB } from "../lib/paquetes";

const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-ef.ts <correo>");
  process.exit(1);
}

const PROD = "https://www.huasteca-potosina.com";
const tour = (s: string) => {
  const t = TOURS_DB.find((x) => x.slug === s);
  if (!t) throw new Error(`No existe el tour ${s}`);
  return t;
};

const tamul  = tour("expedicion-tamul");
const puente = tour("ruta-acuatica-puente-de-dios");
const PAX = 2;
const TOTAL = tamul.precio * PAX + puente.precio * PAX + 2400 + 3800;

type Pieza = { etq: string; nota: string; subject: string; html: string };

function armar(): Pieza[] {
  const p: Pieza[] = [];

  // ── Grupo E ─────────────────────────────────────────────────────────────
  p.push({
    etq:  "20 · Reseña de Google (español)",
    nota: "RECIÉN ENCENDIDO — hasta hoy solo salía en inglés",
    ...buildReviewEmailHtml({ customerName: "Manolo", tourName: tamul.nombre, tourSlug: tamul.slug, locale: "es" }),
  });
  p.push({
    etq:  "20 · Reseña de Google (inglés)",
    nota: "El que ya estaba activo",
    ...buildReviewEmailHtml({ customerName: "Manolo", tourName: tamul.nombre, tourSlug: tamul.slug, locale: "en" }),
  });

  // ── Grupo F ─────────────────────────────────────────────────────────────
  p.push({
    etq:  "21 · Carrito grande sin pagar",
    nota: "Te llega a TI cuando alguien deja $10,000 o más sin pagar",
    ...buildAvisoCarritoGrandeHtml({
      total: TOTAL,
      customerEmail: "cliente@ejemplo.com",
      customerPhone: "4891234567",
      tourName: `${tamul.nombre} y 1 recorrido más`,
      tourDate: "2026-11-14",
      restoreUrl: `${PROD}/reservar/carrito?recuperar=vistaprevia000000`,
    }),
  });
  p.push({
    etq:  "22 · Pago sin confirmación completa",
    nota: "Te llega a TI cuando entra un pago y el cliente NO recibió su confirmación",
    ...buildAvisoPagoIncompletoHtml({
      confirmationNumber: "HUAS-VP0022",
      tourName: tamul.nombre,
      tourDate: "2026-11-14",
      totalAmount: tamul.precio * PAX,
      paymentIntent: "pi_3VistaPrevia000",
      receiptEmail: "correo-mal-escrito@",
    }),
  });

  // ── El paquete, rediseñado ──────────────────────────────────────────────
  const paquete = PAQUETES_DB.find((x) => x.slug === "completo");
  if (paquete) {
    const cobrado = Math.round(paquete.precio * 0.3);
    p.push({
      etq:  "12 · Paquete reservado (REDISEÑADO)",
      nota: "Con el diseño de la marca y «Fecha de inicio · primer tour»",
      ...buildPaqueteConfirmEmailHtml({
        locale: "es", paquete, confirmationNumber: "HUAS-VP0012",
        customerName: "Manolo Covarrubias", fechaInicio: "2026-11-14",
        adultos: 2, nMid: 1, nSmall: 0, habitacion: "Jungla",
        checkin: "2026-11-14", nochesHotel: paquete.noches, nocheExtra: false,
        eleccionNombre: "Paraíso Escalonado — Minas Viejas y Micos",
        lineItems: paquete.itinerario.filter((d) => d.tourSlug).map((d, i) => ({
          tourSlug: d.tourSlug!,
          tourName: TOURS_DB.find((t) => t.slug === d.tourSlug)?.nombre ?? "",
          tourDate: `2026-11-${String(14 + i).padStart(2, "0")}`,
        })),
        totalFull: paquete.precio, cobrado, pendiente: paquete.precio - cobrado, pctNum: 30,
      }),
    });
  }

  return p;
}

/**
 * La cinta va DENTRO del `<body>` cuando el correo trae documento completo (el
 * del paquete lo trae), y pegada antes cuando es un fragmento. Meter un `<div>`
 * antes de un `<!DOCTYPE>` lo rompe en varios clientes.
 */
function conCinta(p: Pieza): string {
  const cinta = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto 18px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
    <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Correo ${p.etq}</p>
    <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${p.nota}</strong></p>
    <p style="margin:0;font-size:12px;color:#666">Asunto real: <em>${p.subject}</em></p>
  </div>`;

  if (p.html.trimStart().startsWith("<!DOCTYPE")) {
    return p.html.replace("<body>", `<body>\n<div style="padding:20px 0">${cinta}</div>`);
  }
  return cinta + p.html;
}

async function main() {
  const piezas = armar();
  console.log(`Mandando ${piezas.length} correos a ${destino}…\n`);
  for (const p of piezas) {
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${p.etq.split(" ·")[0]}] ${p.subject}`,
      htmlContent: conCinta(p),
    });
    console.log(`  ✓ ${p.etq}`);
    console.log(`      ${p.subject}`);
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
