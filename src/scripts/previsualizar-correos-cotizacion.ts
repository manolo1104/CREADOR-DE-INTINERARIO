/**
 * Manda los 3 correos de seguimiento de una cotización — los que arrancan
 * cuando Manolo la envía a mano desde el panel, o cuando la manda el bot.
 *
 *   npx tsx src/scripts/previsualizar-correos-cotizacion.ts <correo-destino>
 */

import { buildQuoteSequenceEmail, type QuotePaso } from "../lib/quoteSequenceEmail";
import { alcanzaLaSecuencia, ESPERA_HORAS } from "../lib/quoteFollowUp";
import { sendBrevoEmail } from "../lib/brevo";
import { TOURS_DB } from "../lib/tours";

const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-cotizacion.ts <correo>");
  process.exit(1);
}

const tour = (s: string) => {
  const t = TOURS_DB.find((x) => x.slug === s);
  if (!t) throw new Error(`No existe el tour ${s}`);
  return t;
};

const tamul = tour("expedicion-tamul");
const puente = tour("ruta-acuatica-puente-de-dios");
const PAX = 2;
const TOTAL = tamul.precio * PAX + puente.precio * PAX;
const FECHA_TOUR = "2026-11-14";

const LINEAS = [
  { tourName: tamul.nombre,  tourSlug: tamul.slug,  tourDate: FECHA_TOUR,  adults: PAX, subtotal: tamul.precio * PAX },
  { tourName: puente.nombre, tourSlug: puente.slug, tourDate: "2026-11-15", adults: PAX, subtotal: puente.precio * PAX },
];

const ETIQUETAS: Record<QuotePaso, string> = {
  2: "Tu cotización a la mano",
  3: "Aparta con el 30 %",
  4: "Última, con una persona del otro lado",
};

async function main() {
  const cabe = alcanzaLaSecuencia(new Date().toISOString(), FECHA_TOUR);
  console.log(`Cotización COT-VP0001 · tour ${FECHA_TOUR} · total $${TOTAL.toLocaleString("es-MX")}`);
  console.log(`Secuencia: ${cabe ? "ARRANCA" : "CANCELADA (el viaje está demasiado cerca)"}\n`);

  const pasos: QuotePaso[] = [2, 3, 4];
  for (const paso of pasos) {
    const { subject, html } = buildQuoteSequenceEmail({
      paso, locale: "es",
      customerName: "Manolo Covarrubias",
      quoteNumber:  "COT-VP0001",
      tourName:     tamul.nombre,
      tourDate:     FECHA_TOUR,
      totalAmount:  TOTAL,
      lineItems:    LINEAS,
    });

    const n = 20 + paso;  // 22, 23, 24 en el inventario ampliado
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${n}] ${subject}`,
      htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto 18px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
        <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
          Correo NUEVO · seguimiento de cotización
        </p>
        <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${ETIQUETAS[paso]}</strong> — sale ${ESPERA_HORAS[paso] < 24 ? `a la hora` : `a las ${ESPERA_HORAS[paso]} horas`} de mandarla</p>
        <p style="margin:0;font-size:12px;color:#666">Asunto real: <em>${subject}</em></p>
      </div>
      ${html}`,
    });
    console.log(`  ✓ +${String(ESPERA_HORAS[paso]).padStart(2)} h  ${ETIQUETAS[paso]}`);
    console.log(`      ${subject}`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
