/**
 * Manda a una bandeja los 4 correos del carrito (los números 7 al 10 del
 * inventario), generados con el MISMO `buildCartEmailHtml` que corre en
 * producción.
 *
 * El carrito de ejemplo es el caso que importa: dos recorridos, hotel y
 * traslado desde CDMX — o sea el viaje completo, que es donde está el dinero.
 * Un carrito de un solo tour ejercita mucho menos de la plantilla.
 *
 *   npx tsx src/scripts/previsualizar-correos-carrito.ts <correo-destino>
 */

import { buildCartEmailHtml, type CartEmailTipo } from "../lib/cartEmail";
import { linkRecuperacion } from "../lib/recuperacion";
import { sendBrevoEmail } from "../lib/brevo";
import { TOURS_DB } from "../lib/tours";

const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-carrito.ts <correo>");
  process.exit(1);
}

const BASE = "https://www.huasteca-potosina.com";

const precioDe = (slug: string): number => {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`No existe el tour ${slug}`);
  return t.precio;
};
const nombreDe = (slug: string): string => {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`No existe el tour ${slug}`);
  return t.nombre;
};

// Pareja de CDMX, dos recorridos en noviembre (cuando Tamul lleva agua
// turquesa), dos noches en Paraíso Encantado y traslado redondo.
const PAX = 2;
const TAMUL  = "expedicion-tamul";
const PUENTE = "ruta-acuatica-puente-de-dios";

const subTamul  = precioDe(TAMUL)  * PAX;
const subPuente = precioDe(PUENTE) * PAX;
const HOSPEDAJE = 2400;   // 2 noches
const TRASLADO  = 3800;   // redondo CDMX, 2 pasajeros
const TOTAL = subTamul + subPuente + HOSPEDAJE + TRASLADO;

const CARRITO = {
  tourName: nombreDe(TAMUL),
  tourSlug: TAMUL,
  tourDate: "2026-11-14",
  adults:   PAX,
  children: 0,
  total:    TOTAL,
  restoreUrl: linkRecuperacion(BASE, "tour", TAMUL, "vistaprevia000000"),
  lineas: [
    { tourName: nombreDe(TAMUL),  tourSlug: TAMUL,  tourDate: "2026-11-14", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: subTamul },
    { tourName: nombreDe(PUENTE), tourSlug: PUENTE, tourDate: "2026-11-15", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: subPuente },
  ],
  hospedaje: { habitacion: "Jungla", noches: 2, huespedes: PAX, checkin: "2026-11-13", checkout: "2026-11-15", subtotal: HOSPEDAJE },
  traslado:  { ciudad: "Ciudad de México", personas: PAX, subtotal: TRASLADO },
  locale: "es",
};

const PIEZAS: { n: number; tipo: CartEmailTipo; etiqueta: string }[] = [
  { n:  7, tipo: "cotizacion",    etiqueta: "Tu cotización · al momento de guardar el carrito" },
  { n:  8, tipo: "recordatorio1", etiqueta: "Primer recordatorio · +1 hora" },
  { n:  9, tipo: "recordatorio2", etiqueta: "Segundo recordatorio · +24 horas" },
  { n: 10, tipo: "recordatorio3", etiqueta: "Tercero y último · +72 horas" },
];

/** Cinta de contexto, pegada ANTES del correo para no tocar ni un pixel. */
function conCinta(n: number, etiqueta: string, subject: string, html: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto 18px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
    <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
      Correo ${n} del inventario · vista previa
    </p>
    <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${etiqueta}</strong></p>
    <p style="margin:0 0 6px;font-size:12px;color:#666">Asunto real: <em>${subject}</em></p>
    <p style="margin:0;font-size:11px;color:#9a4a1e">
      El botón abre el carrito pero no restaura nada: el token es de mentiras.
    </p>
  </div>
  ${html}`;
}

async function main() {
  console.log(`Carrito de ejemplo: $${TOTAL.toLocaleString("es-MX")} MXN`);
  console.log(`  ${nombreDe(TAMUL)} — $${subTamul.toLocaleString("es-MX")}`);
  console.log(`  ${nombreDe(PUENTE)} — $${subPuente.toLocaleString("es-MX")}`);
  console.log(`  Hotel 2 noches — $${HOSPEDAJE.toLocaleString("es-MX")}`);
  console.log(`  Traslado CDMX — $${TRASLADO.toLocaleString("es-MX")}\n`);
  console.log(`Mandando ${PIEZAS.length} correos a ${destino}…\n`);

  for (const p of PIEZAS) {
    const { subject, html } = buildCartEmailHtml({ ...CARRITO, tipo: p.tipo });
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${p.n}/22] ${subject}`,
      htmlContent: conCinta(p.n, p.etiqueta, subject, html),
    });
    console.log(`  ✓ ${p.n}  ${p.etiqueta}`);
    console.log(`      ${subject}`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
