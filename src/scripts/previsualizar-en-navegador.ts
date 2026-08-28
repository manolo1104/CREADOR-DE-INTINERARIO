/**
 * Escribe los correos como archivos HTML para abrirlos en el navegador.
 *
 * Existe porque una bandeja de correo no dice si una imagen falló: Gmail pinta
 * el hueco igual que si estuviera bloqueada. En el navegador, con la consola y
 * la pestaña de red abiertas, un 404 se ve.
 *
 * Reescribe el dominio de producción por el que se le pase, para poder revisar
 * imágenes que todavía no están desplegadas — que es justo el caso de
 * `public/imagenes/correo/`.
 *
 *   npx tsx src/scripts/previsualizar-en-navegador.ts [http://localhost:3000]
 */

import fs from "fs";
import path from "path";
import { buildItinerarioEmailHtml } from "../lib/itinerarioEmail";
import { buildLeadSequenceEmail, type LeadEmailInput } from "../lib/leadSequenceEmail";
import { buildCartEmailHtml } from "../lib/cartEmail";
import { buildTourEmailHtml } from "../lib/tourEmail";
import { buildPaqueteConfirmEmailHtml } from "../lib/paqueteEmail";
import { buildGuiaEmailHtml } from "../lib/guiaEmail";
import { buildQuoteSequenceEmail, type QuotePaso } from "../lib/quoteSequenceEmail";
import { buildReviewEmailHtml } from "../lib/reviewEmail";
import { buildAvisoCarritoGrandeHtml, buildAvisoPagoIncompletoHtml } from "../lib/avisoCarritoGrande";
import { buildBoletinEmail } from "../lib/boletinEmail";
import { TOURS_DB } from "../lib/tours";
import { PAQUETES_DB } from "../lib/paquetes";

const HOST = process.argv[2] ?? "http://localhost:3000";
const PROD = "https://www.huasteca-potosina.com";
const SALIDA = path.join(process.cwd(), "public", "_previsualizacion");

const tour = (s: string) => {
  const t = TOURS_DB.find((x) => x.slug === s);
  if (!t) throw new Error(`No existe el tour ${s}`);
  return t;
};

const CTX: Omit<LeadEmailInput, "paso"> = {
  email: "cliente@ejemplo.com",
  grupo: "En pareja", dias: "3 días", origen: "Ciudad de México",
  intereses: ["Cascadas turquesas", "Fotografía perfecta"],
  tourPrincipal: "expedicion-tamul", tourSecundario: "ruta-acuatica-puente-de-dios",
};

export function correos(): { n: number; nombre: string; subject: string; html: string }[] {
  const out: { n: number; nombre: string; subject: string; html: string }[] = [];

  const itin = buildItinerarioEmailHtml("cliente@ejemplo.com");
  out.push({ n: 1, nombre: "Itinerario de 3 días", ...itin });

  const etiquetas = ["Tu plan por día", "Cómo se ve tu día", "Aparta con el 30 %", "¿Te ayudamos a decidir?", "Los que vienen 3 días", "La temporada (+35 d)", "¿Sigue en pie? (+60 d)"];
  ([1, 2, 3, 4, 5, 6, 7] as const).forEach((paso, i) => {
    const c = buildLeadSequenceEmail({ paso, ...CTX });
    // Los pasos 1–5 conservan su número del inventario (2–6). Los dos nuevos
    // van a 61 y 62: con `i + 2` pisaban los archivos de los correos 7 y 8,
    // que son los del carrito, y la revisión los daba por buenos sin verlos.
    if (c) out.push({ n: paso <= 5 ? i + 2 : 60 + paso - 5, nombre: etiquetas[i], ...c });
  });

  const tamul = tour("expedicion-tamul"), puente = tour("ruta-acuatica-puente-de-dios"), PAX = 2;
  const sT = tamul.precio * PAX, sP = puente.precio * PAX, HOSP = 2400, TRAS = 3800;
  const TOTAL = sT + sP + HOSP + TRAS;
  const carrito = {
    tourName: tamul.nombre, tourSlug: tamul.slug, tourDate: "2026-11-14",
    adults: PAX, children: 0, total: TOTAL, restoreUrl: `${PROD}/reservar/carrito`,
    lineas: [
      { tourName: tamul.nombre,  tourSlug: tamul.slug,  tourDate: "2026-11-14", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: sT },
      { tourName: puente.nombre, tourSlug: puente.slug, tourDate: "2026-11-15", adults: PAX, childrenMid: 0, childrenSmall: 0, subtotal: sP },
    ],
    hospedaje: { habitacion: "Jungla", noches: 2, huespedes: PAX, checkin: "2026-11-13", checkout: "2026-11-15", subtotal: HOSP },
    traslado:  { ciudad: "Ciudad de México", personas: PAX, subtotal: TRAS },
    email: "cliente@ejemplo.com",
    locale: "es",
  };
  (["cotizacion", "recordatorio1", "recordatorio2", "recordatorio3"] as const).forEach((tipo, i) => {
    out.push({ n: 7 + i, nombre: `Carrito · ${tipo}`, ...buildCartEmailHtml({ ...carrito, tipo }) });
  });

  const totalTour = sT + sP + HOSP;
  out.push({
    n: 11, nombre: "Tour confirmado", subject: "Tu tour está confirmado — HUAS-VP0011",
    html: buildTourEmailHtml({
      customerName: "Manolo Covarrubias", confirmationNumber: "HUAS-VP0011",
      tourName: "2 recorridos", tourSlug: "", tourDate: "2026-11-14",
      adults: PAX, children: 0, totalAmount: totalTour,
      depositoPagado: Math.round(totalTour * 0.3), metodoPago: "Tarjeta",
      pickupLugar: "Hotel Paraíso Encantado, Xilitla", partySize: PAX,
      lineItems: carrito.lineas,
      packageItems: [{ hotel: "Hotel Paraíso Encantado", habitacion: "Jungla", noches: 2, habitaciones: 1, checkin: "2026-11-13", checkout: "2026-11-15", subtotal: HOSP }],
      locale: "es",
    }),
  });

  const paquete = PAQUETES_DB.find((p) => p.slug === "completo");
  if (paquete) {
    const cobrado = Math.round(paquete.precio * 0.3);
    out.push({
      n: 12, nombre: "Paquete reservado",
      ...buildPaqueteConfirmEmailHtml({
        locale: "es", paquete, confirmationNumber: "HUAS-VP0012",
        customerName: "Manolo Covarrubias", fechaInicio: "2026-11-14",
        adultos: 2, nMid: 1, nSmall: 0, habitacion: "Jungla",
        checkin: "2026-11-14", nochesHotel: paquete.noches, nocheExtra: false,
        eleccionNombre: "Paraíso Escalonado — Minas Viejas y Micos",
        lineItems: paquete.itinerario.filter((d) => d.tourSlug).map((d, i) => ({
          tourSlug: d.tourSlug!, tourName: TOURS_DB.find((t) => t.slug === d.tourSlug)?.nombre ?? "",
          tourDate: `2026-11-${String(14 + i).padStart(2, "0")}`,
        })),
        totalFull: paquete.precio, cobrado, pendiente: paquete.precio - cobrado, pctNum: 30,
      }),
    });
  }

  out.push({ n: 13, nombre: "Guía Definitiva", ...buildGuiaEmailHtml({ sessionId: "cs_test_vistaprevia" }) });

  // ── El boletín mensual, en sus tres temporadas ───────────────────────────
  // 🔴 Artículos REALES, con su slug tal como vive en la base. Los tres de antes
  // ("que-hacer-en-xilitla", "tamul-mejor-epoca", "huasteca-con-ninos") estaban
  // inventados: la vista previa se veía perfecta y los tres enlaces daban 404 en
  // producción. Una vista previa que enseña enlaces que no existen es peor que
  // no tenerla, porque se revisa y se da por buena.
  //
  // El tercero conserva a propósito el sufijo `-2026`: la mitad de los artículos
  // de la base lo trae, y así la vista previa ejercita el mismo camino que
  // seguirá el boletín real. Comprobarlos: npx tsx src/scripts/verificar-enlaces-correos.ts
  const POSTS = [
    { slug: "hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber", title: "Guía definitiva para visitar Xilitla: todo lo que necesitas saber antes de ir", excerpt: "Las Pozas, clima, cómo llegar, precios y lo que conviene saber antes de salir.", coverImageUrl: null },
    { slug: "cascada-de-tamul-la-guia-definitiva-para-visitarla",                     title: "Cascada de Tamul: la guía definitiva para visitarla",                          excerpt: "Precios, horarios, cómo llegar y qué esperar en la cascada más alta de México.", coverImageUrl: null },
    { slug: "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta-2026",             title: "Huasteca Potosina con niños: la ruta familiar perfecta",                      excerpt: "Qué recorridos aguantan de verdad, a partir de qué edad y cuánto cuesta.", coverImageUrl: null },
  ];
  ([3, 8, 12] as const).forEach((mes, i) => {
    out.push({
      n: 30 + i, nombre: `Boletín mensual · mes ${mes}`,
      ...buildBoletinEmail({ email: "cliente@ejemplo.com", posts: POSTS, tourSlug: "expedicion-tamul", mes }),
    });
  });

  // ── Grupo E · después del viaje ──────────────────────────────────────────
  // Las dos versiones: la inglesa es la que sale hoy, la española está escrita
  // y apagada esperando que Manolo decida.
  out.push({ n: 20, nombre: "Reseña de Google (español · APAGADO)",
    ...buildReviewEmailHtml({ customerName: "Manolo", tourName: tamul.nombre, tourSlug: tamul.slug, locale: "es" }) });
  out.push({ n: 201, nombre: "Reseña de Google (inglés · activo)",
    ...buildReviewEmailHtml({ customerName: "Manolo", tourName: tamul.nombre, tourSlug: tamul.slug, locale: "en" }) });

  // ── Grupo F · los que te llegan a ti ─────────────────────────────────────
  out.push({ n: 21, nombre: "Carrito grande sin pagar",
    ...buildAvisoCarritoGrandeHtml({
      total: TOTAL, customerEmail: "cliente@ejemplo.com", customerPhone: "4891234567",
      tourName: `${tamul.nombre} y 1 recorrido más`, tourDate: "2026-11-14",
      restoreUrl: `${PROD}/reservar/carrito?recuperar=vistaprevia000000`,
    }) });
  out.push({ n: 22, nombre: "Pago sin confirmación completa",
    ...buildAvisoPagoIncompletoHtml({
      confirmationNumber: "HUAS-VP0022", tourName: tamul.nombre, tourDate: "2026-11-14",
      totalAmount: totalTour, paymentIntent: "pi_3VistaPrevia000", receiptEmail: "correo-mal-escrito@",
    }) });

  // ── Seguimiento de cotizaciones (nuevos) ─────────────────────────────────
  // Se numeran 23, 24 y 25: el inventario iba hasta el 22.
  const nombresSeq = { 2: "Cotización · a la mano (+1 h)", 3: "Cotización · aparta 30 % (+24 h)", 4: "Cotización · última (+72 h)" };
  ([2, 3, 4] as QuotePaso[]).forEach((paso, i) => {
    out.push({
      n: 23 + i, nombre: nombresSeq[paso],
      ...buildQuoteSequenceEmail({
        paso, locale: "es",
        customerName: "Manolo Covarrubias",
        email: "cliente@ejemplo.com",
        quoteNumber:  "COT-VP0001",
        tourName:     tamul.nombre,
        tourDate:     "2026-11-14",
        totalAmount:  sT + sP,
        lineItems:    carrito.lineas,
      }),
    });
  });

  return out;
}

function main() {
  fs.rmSync(SALIDA, { recursive: true, force: true });
  fs.mkdirSync(SALIDA, { recursive: true });

  const lista = correos();
  const enlaces: string[] = [];

  for (const c of lista) {
    // El correo apunta al dominio de producción; para revisar imágenes que aún
    // no se despliegan, se apunta al host que se pase por argumento.
    const html = c.html.split(PROD).join(HOST);
    const archivo = `correo-${String(c.n).padStart(2, "0")}.html`;
    const imgs = (html.match(/<img /g) ?? []).length;

    fs.writeFileSync(path.join(SALIDA, archivo), `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Correo ${c.n} · ${c.nombre}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#e8e4d8;padding:24px;font-family:system-ui,sans-serif}
.marco{max-width:640px;margin:0 auto;background:#fff;box-shadow:0 2px 18px rgba(0,0,0,.12)}
.cab{background:#0e1710;color:#f4edd8;padding:14px 20px;font-size:13px}
.cab b{color:#c4882a}</style>
<script>
// Cualquier imagen que no cargue se anota en la consola: es lo que este archivo
// existe para descubrir, y en una bandeja de correo no se distingue de una
// imagen simplemente bloqueada.
window.addEventListener("error", function (e) {
  if (e.target && e.target.tagName === "IMG") {
    console.error("[IMAGEN ROTA] " + e.target.getAttribute("src"));
  }
}, true);
window.addEventListener("load", function () {
  var t = document.images.length, rotas = 0;
  for (var i = 0; i < t; i++) if (!document.images[i].complete || document.images[i].naturalWidth === 0) rotas++;
  console.log("[REVISION] correo ${c.n} · " + t + " imagen(es) · " + rotas + " rota(s)");
});
</script>
</head><body>
<div class="marco">
  <div class="cab">Correo <b>${c.n}</b> · ${c.nombre}<br><span style="opacity:.6">${c.subject}</span></div>
  ${html}
</div></body></html>`);

    enlaces.push(`<li><a href="./${archivo}">Correo ${c.n} — ${c.nombre}</a> <span style="color:#888">· ${imgs} imagen(es)</span></li>`);
    console.log(`  ${String(c.n).padStart(2)} ${c.nombre.padEnd(28)} ${imgs} img  → ${archivo}`);
  }

  fs.writeFileSync(path.join(SALIDA, "index.html"), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Revisión de correos</title>
<style>body{font-family:system-ui,sans-serif;max-width:660px;margin:40px auto;padding:0 20px;line-height:1.7}
h1{font-weight:400}li{margin:4px 0}</style></head><body>
<h1>Revisión de correos</h1>
<p>Imágenes servidas desde <code>${HOST}</code>. Abre la consola: cada página anota cuántas imágenes cargaron y cuáles no.</p>
<ul>${enlaces.join("")}</ul></body></html>`);

  console.log(`\n${lista.length} correos en public/_previsualizacion/`);
  console.log(`Abre: ${HOST}/_previsualizacion/index.html`);
}

// Solo cuando se ejecuta este archivo directamente. Sin la guarda, importarlo
// desde `previsualizar-todos.ts` reescribía las vistas previas usando el correo
// de destino como si fuera el host.
if (process.argv[1]?.includes("previsualizar-en-navegador")) main();
