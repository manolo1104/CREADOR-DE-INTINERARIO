/**
 * Manda los 3 correos del grupo C —los de "ya pagó"— generados con el MISMO
 * código que corre en producción.
 *
 * Hasta ahora dos de los tres solo se podían ver comprando: el del paquete
 * vivía dentro de `/api/paquetes/send-confirmation` y el de la guía dentro del
 * webhook de Stripe. Ya están en `paqueteEmail.ts` y `guiaEmail.ts`, así que se
 * renderizan sin cobrar nada.
 *
 *   npx tsx src/scripts/previsualizar-correos-pagados.ts <correo-destino>
 */

import { buildTourEmailHtml } from "../lib/tourEmail";
import { buildPaqueteConfirmEmailHtml } from "../lib/paqueteEmail";
import { buildGuiaEmailHtml } from "../lib/guiaEmail";
import { sendBrevoEmail } from "../lib/brevo";
import { TOURS_DB } from "../lib/tours";
import { PAQUETES_DB } from "../lib/paquetes";

const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-pagados.ts <correo>");
  process.exit(1);
}

const tour = (slug: string) => {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`No existe el tour ${slug}`);
  return t;
};

type Pieza = { n: number; etiqueta: string; subject: string; html: string };

function armar(): Pieza[] {
  const piezas: Pieza[] = [];

  // ── 11 · Tour confirmado ────────────────────────────────────────────────
  // El mismo viaje del carrito que ya revisaste: dos recorridos, hotel y
  // traslado, pagados con el anticipo del 30 %.
  const tamul  = tour("expedicion-tamul");
  const puente = tour("ruta-acuatica-puente-de-dios");
  const PAX = 2;
  const subTamul  = tamul.precio  * PAX;
  const subPuente = puente.precio * PAX;
  const HOSPEDAJE = 2400;
  const totalTour = subTamul + subPuente + HOSPEDAJE;
  const anticipo  = Math.round(totalTour * 0.3);

  piezas.push({
    n: 11,
    etiqueta: "Tour confirmado · al pagar",
    subject: "Tu tour está confirmado — HUAS-VP0011",
    html: buildTourEmailHtml({
      customerName:       "Manolo Covarrubias",
      confirmationNumber: "HUAS-VP0011",
      // El carrito guarda `tourName` como resumen y `tourSlug` VACÍO: la verdad
      // vive en `lineItems`. Se manda así a propósito, porque así llega en
      // producción y es justo donde el correo se rompía antes.
      tourName:  "2 recorridos",
      tourSlug:  "",
      tourDate:  "2026-11-14",
      adults:    PAX,
      children:  0,
      totalAmount:    totalTour,
      depositoPagado: anticipo,
      metodoPago:     "Tarjeta",
      pickupLugar:    "Hotel Paraíso Encantado, Xilitla",
      partySize:      PAX,
      lineItems: [
        { tourName: tamul.nombre,  tourSlug: tamul.slug,  tourDate: "2026-11-14", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: subTamul },
        { tourName: puente.nombre, tourSlug: puente.slug, tourDate: "2026-11-15", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: subPuente },
      ],
      packageItems: [{
        hotel: "Hotel Paraíso Encantado", habitacion: "Jungla",
        noches: 2, habitaciones: 1,
        checkin: "2026-11-13", checkout: "2026-11-15", subtotal: HOSPEDAJE,
      }],
      locale: "es",
    }),
  });

  // ── 12 · Paquete reservado ──────────────────────────────────────────────
  // Se usa el Completo porque es el único con "el día 3 lo eliges tú": así se
  // ve también ese renglón, que los otros dos paquetes no tienen.
  const paquete = PAQUETES_DB.find((p) => p.slug === "completo");
  if (!paquete) throw new Error("No existe el paquete 'completo'");
  const totalPaq = paquete.precio;
  const cobradoPaq = Math.round(totalPaq * 0.3);

  const lineasPaq = paquete.itinerario
    .filter((d) => d.tourSlug)
    .map((d, i) => ({
      tourSlug: d.tourSlug!,
      tourName: TOURS_DB.find((t) => t.slug === d.tourSlug)?.nombre ?? "",
      tourDate: `2026-11-${String(14 + i).padStart(2, "0")}`,
    }));

  piezas.push({
    n: 12,
    etiqueta: "Paquete reservado · al pagar un paquete",
    ...buildPaqueteConfirmEmailHtml({
      locale: "es",
      paquete,
      confirmationNumber: "HUAS-VP0012",
      customerName: "Manolo Covarrubias",
      fechaInicio: "2026-11-14",
      adultos: 2, nMid: 1, nSmall: 0,
      habitacion: "Jungla",
      checkin: "2026-11-14",
      nochesHotel: paquete.noches,
      nocheExtra: false,
      eleccionNombre: "Paraíso Escalonado — Minas Viejas y Micos",
      lineItems: lineasPaq,
      totalFull: totalPaq,
      cobrado: cobradoPaq,
      pendiente: totalPaq - cobradoPaq,
      pctNum: 30,
    }),
  });

  // ── 13 · Entrega de la Guía Definitiva ──────────────────────────────────
  piezas.push({
    n: 13,
    etiqueta: "Entrega de la Guía Definitiva · al pagar los $49",
    ...buildGuiaEmailHtml({ sessionId: "cs_test_vistaprevia" }),
  });

  return piezas;
}

function conCinta(p: Pieza): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto 18px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
    <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
      Correo ${p.n} del inventario · vista previa
    </p>
    <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${p.etiqueta}</strong></p>
    <p style="margin:0 0 6px;font-size:12px;color:#666">Asunto real: <em>${p.subject}</em></p>
    <p style="margin:0;font-size:11px;color:#9a4a1e">
      Folio y sesión de mentiras: los botones de descarga no van a funcionar.
    </p>
  </div>
  ${p.html}`;
}

async function main() {
  const piezas = armar();
  console.log(`Mandando ${piezas.length} correos a ${destino}…\n`);

  for (const p of piezas) {
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${p.n}/22] ${p.subject}`,
      htmlContent: conCinta(p),
    });
    console.log(`  ✓ ${p.n}  ${p.etiqueta}`);
    console.log(`      ${p.subject}`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
