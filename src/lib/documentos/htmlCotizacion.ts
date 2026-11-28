/**
 * El PDF de la COTIZACIÓN (COT-…), como HTML listo para imprimir. Es el mismo
 * que descarga el panel (Cotizaciones → Descargar PDF): salió de
 * `CotizacionesClient.tsx` el 16 nov 2026 para que el servidor lo arme igual y
 * el bot de WhatsApp lo mande (`/api/bot/documento/[folio]`). El panel lo sigue
 * abriendo en una ventana para imprimir; el bot lo pasa a PDF con Chromium.
 *
 * `origen`: de dónde salen los logos (la URL del sitio).
 */
import type { TourQuote } from "@prisma/client";
import { escapeHtml } from "@/lib/escapeHtml";
import { datosCotizacion, incluyeDeCotizacion } from "@/lib/documentos/datosCotizacion";

// Vive en `datosCotizacion.ts`; se reexporta para quien ya lo importaba de aquí.
export { incluyeDeCotizacion };

const esc = escapeHtml;

export function htmlCotizacion(q: TourQuote, origen: string, hoy: Date = new Date()): string {
    // Los datos salen de `datosCotizacion` (27 nov 2026), el mismo lugar del que
    // lee el PDF del panel. 🔴 Lo que vino de la base (nombre, notas, hotel,
    // conceptos a mano) entra al HTML escapado con `esc`.
    const d = datosCotizacion(q, hoy);
    const folioQ      = esc(d.folio);
    const numPersonas = d.personas;
    const desgloseQ   = d.desglosePersonas;
    const recogidaTexto = d.recogida.map(esc).join("<br/>");
    const varios      = d.recogida.length > 1;
    const cancelTexto = esc(d.cancelacion);
    const incluyeLis  = d.siIncluye.map(x => `<li>${esc(x)}</li>`).join("");
    const noIncluyeLis = d.noIncluye.map(x => `<li>${esc(x)}</li>`).join("");
    const filas = d.renglones.map(r => `<div class="row"><div><div class="tour-name">${esc(r.nombre)}</div>${r.subs.map(x => `<div class="tour-sub">${esc(x)}</div>`).join("")}${r.opcionales.length ? `<div class="tour-sub" style="color:var(--terracota)">${r.opcionales.map(esc).join("<br/>")}</div>` : ""}</div><div class="num">${r.fecha}</div><div class="num right">${esc(r.cantidad)}</div><div class="amt right">$${r.importe.toLocaleString("es-MX")}</div></div>`).join("");

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=820"/><title>Cotización ${folioQ}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@200;300;400;500;700&display=swap" rel="stylesheet">
<style>
:root{--negro:#0e1710;--verde-selva:#3a6b1a;--lima:#8fbe3a;--crema:#f4edd8;--dorado:#c4882a;--terracota:#9a4a1e;--display:'Cormorant Garamond',Georgia,serif;--dm:'DM Sans',system-ui,sans-serif;}
@page{size:A4 portrait;margin:0;}*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#2a2a2a;font-family:var(--dm);color:var(--negro);}
/* 🔴 Antes: height fijo + overflow:hidden. Con 5 recorridos y 2 habitaciones el
   contenido medía 378 mm en una hoja de 296: "Sí incluye" arrancaba en el
   milímetro 315 y los términos en el 348, así que los dos se cortaban enteros y
   la cotización salía SIN decir qué incluye ni cuáles son las condiciones.
   Ahora la hoja crece y, si hace falta, sigue en una segunda página. */
.page{width:210mm;min-height:296mm;background:var(--crema);overflow:visible;position:relative;margin:24px auto;box-shadow:0 30px 80px rgba(0,0,0,.5);padding:10mm 14mm 10mm;display:flex;flex-direction:column;}
/* Cuando hay muchos renglones la hoja deja de ser una caja flex: así el
   contenido puede partirse entre páginas en vez de apretarse en una. */
.page.fluida{display:block;}
.page.fluida .foot{margin-top:6mm;}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  html,body{background:var(--crema);}
  /* box-decoration-break:clone repite fondo y márgenes internos en la segunda
     página: sin esto el texto de la página 2 arranca pegado al borde del papel. */
  .page{margin:0;box-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
  /* Nada se parte a la mitad: ni un recorrido, ni la lista de lo que incluye,
     ni las condiciones. */
  .row,.checks,.checks div,.foot,.card,.totals,.head{break-inside:avoid;page-break-inside:avoid;}
}

/* ── Modo compacto: hasta ~9 renglones la cotización sigue cabiendo en UNA hoja
   sin perder nada, solo con la letra y los aires más ajustados. ───────────── */
.compacta{padding:8mm 12mm;}
.compacta .title-block h1{font-size:22pt;}
.compacta .title-block{margin-top:2mm;}
.compacta .two-col{margin-top:3mm;gap:4mm;}
.compacta .card{padding:3mm 4mm;}
.compacta .card h3{font-size:11pt;margin-bottom:2mm;}
.compacta .card .field{gap:1.5mm 4mm;}
.compacta .card .field .v{font-size:8pt;}
.compacta .tour-table{margin-top:3mm;}
.compacta .head-row{padding:1.5mm 0;}
.compacta .row{padding:1.6mm 0;}
.compacta .tour-name{font-size:9.5pt;}
.compacta .tour-sub{font-size:6.8pt;}
.compacta .amt{font-size:10.5pt;}
.compacta .totals{margin-top:3mm;}
.compacta .line{font-size:8pt;padding:.5mm 0;}
.compacta .line.grand{padding:2mm 3mm;margin-top:1.5mm;}
.compacta .line.grand .v{font-size:15pt;}
.compacta .checks{margin-top:3mm;gap:4mm;}
.compacta .checks h4{font-size:10pt;margin:0 0 1.5mm;}
.compacta .checks li{font-size:6.8pt;line-height:1.25;}
.compacta .foot{padding-top:3mm;}
.compacta .terms{font-size:6.8pt;line-height:1.35;}
.compacta .note{font-size:6.8pt;}
.compacta .cta{padding:2mm 5mm;}

/* Segundo nivel: solo se enciende si con el primero todavía no cabe. */
.compacta2{padding:7mm 11mm;}
.compacta2 .head{padding-bottom:2.5mm;}
.compacta2 .title-block h1{font-size:18pt;}
.compacta2 .stamp{width:14mm;height:14mm;}
.compacta2 .contact{font-size:6.5pt;}
.compacta2 .two-col{margin-top:2.5mm;gap:3mm;}
.compacta2 .card{padding:2.5mm 3mm;}
.compacta2 .card h3{font-size:10pt;}
.compacta2 .card .field .v{font-size:7.5pt;}
.compacta2 .row{padding:1.2mm 0;}
.compacta2 .tour-name{font-size:9pt;}
.compacta2 .tour-sub{font-size:6.3pt;}
.compacta2 .amt{font-size:9.5pt;}
.compacta2 .line{font-size:7.5pt;}
.compacta2 .line.grand .v{font-size:13pt;}
.compacta2 .checks li{font-size:6.3pt;line-height:1.2;}
.compacta2 .checks h4{font-size:9pt;}
.compacta2 .terms{font-size:6.3pt;line-height:1.3;}
.compacta2 .note{font-size:6.3pt;}
.head{display:grid;grid-template-columns:1fr auto;align-items:flex-start;padding-bottom:4mm;border-bottom:1px solid rgba(14,23,16,.18);}
.brand{display:flex;align-items:baseline;gap:5mm;}.brand .logo{height:12mm;width:auto;display:block;}.stamp .ave{width:10mm;height:auto;display:block;}.compacta2 .stamp .ave{width:8mm;}.wordmark{font-family:var(--display);font-size:15pt;letter-spacing:4px;text-transform:uppercase;line-height:1;color:var(--negro);}
.contact{font-size:7.5pt;line-height:1.5;color:rgba(14,23,16,.65);margin-top:2mm;font-family:ui-monospace,monospace;}
.stamp{width:18mm;height:18mm;border-radius:50%;border:1px solid rgba(14,23,16,.4);display:flex;align-items:center;justify-content:center;position:relative;}
.h{font-family:var(--display);font-style:italic;font-size:16pt;color:var(--dorado);}
.title-block{margin-top:3mm;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:end;}
.title-block h1{font-family:var(--display);font-weight:300;font-size:28pt;margin:0;line-height:.95;}
.ital{font-style:italic;color:var(--dorado);}
.meta{text-align:right;font-size:8.5pt;line-height:1.5;}.meta .row{display:flex;justify-content:flex-end;gap:6mm;}
.meta .k{color:rgba(14,23,16,.55);letter-spacing:1.5px;text-transform:uppercase;font-size:8pt;}.meta .v{font-family:ui-monospace,monospace;color:var(--negro);}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:4mm;}
.card{border:1px solid rgba(14,23,16,.15);padding:4mm 5mm;}.card.dark{background:var(--negro);color:var(--crema);border-color:var(--negro);}
.card h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 2.5mm;line-height:1;}.card.dark h3{color:var(--crema);}
.card .field{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 5mm;}
.card .field .k{font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;color:rgba(14,23,16,.55);}.card.dark .field .k{color:rgba(244,237,216,.55);}
.card .field .v{font-size:9pt;line-height:1.3;margin-top:.5mm;}
.tour-table{margin-top:4mm;}
.head-row{display:grid;grid-template-columns:1fr 28mm 18mm 28mm;padding:2mm 0;border-bottom:2px solid var(--negro);font-size:7.5pt;letter-spacing:2px;text-transform:uppercase;font-weight:500;}
.row{display:grid;grid-template-columns:1fr 28mm 18mm 28mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.15);align-items:start;}
.tour-name{font-family:var(--display);font-size:11pt;line-height:1.15;font-weight:400;}
.tour-sub{font-size:7.5pt;color:rgba(14,23,16,.65);line-height:1.35;margin-top:.5mm;}
.num{font-family:ui-monospace,monospace;font-size:8.5pt;}.right{text-align:right;}
.amt{font-family:var(--display);font-style:italic;font-size:12pt;color:var(--terracota);}
.totals{margin-top:4mm;display:grid;grid-template-columns:1fr 65mm;align-items:start;gap:6mm;}
.note{font-size:7.5pt;line-height:1.5;color:rgba(14,23,16,.65);}.note strong{color:var(--negro);}
.calc{display:flex;flex-direction:column;gap:1mm;}
.line{display:flex;justify-content:space-between;font-size:8.5pt;padding:.8mm 0;}
.line.sub-line{border-bottom:1px solid rgba(14,23,16,.15);}
.line.grand{background:var(--negro);color:var(--crema);padding:3mm 4mm;margin-top:2mm;align-items:baseline;}
.line.grand .k{font-family:var(--dm);font-size:8pt;letter-spacing:2.5px;text-transform:uppercase;}
.line.grand .v{font-family:var(--display);font-style:italic;font-size:18pt;color:var(--dorado);line-height:1;}
.line.deposit{color:var(--terracota);font-weight:500;}
.checks{margin-top:4mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm;}
.checks h4{font-family:var(--display);font-size:11pt;font-weight:400;margin:0 0 2mm;}
.checks ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;}
.checks li{display:grid;grid-template-columns:auto 1fr;gap:1.5mm;font-size:7.5pt;line-height:1.3;}
.yes li::before{content:'✓';color:var(--verde-selva);font-weight:600;}
.no li::before{content:'×';color:var(--terracota);font-weight:600;}
.no li{color:rgba(14,23,16,.65);}
.foot{margin-top:auto;margin-bottom:7mm;padding-top:4mm;border-top:1px solid rgba(14,23,16,.18);display:grid;grid-template-columns:1fr auto;gap:6mm;align-items:center;}
.terms{font-size:7.5pt;line-height:1.45;color:rgba(14,23,16,.65);}.terms strong{color:var(--negro);}
.cta{background:var(--negro);color:var(--crema);padding:3mm 6mm;text-decoration:none;text-align:center;}
.cta .lbl{font-size:7pt;letter-spacing:2px;text-transform:uppercase;color:var(--lima);}
.cta .num{font-family:var(--display);font-style:italic;color:var(--dorado);font-size:13pt;margin-top:1mm;line-height:1;}
.pageno{position:absolute;bottom:10mm;right:18mm;font-size:8pt;letter-spacing:2px;color:rgba(14,23,16,.4);}
.runfoot{position:absolute;bottom:10mm;left:18mm;font-size:8pt;letter-spacing:2px;color:rgba(14,23,16,.4);text-transform:uppercase;}
</style></head><body>
<section class="page">
  <header class="head">
    <div>
      <div class="brand"><img class="logo" src="${origen}/logos/huasteca-potosina-tours-horizontal-color.svg" alt="Huasteca Potosina Tours"/></div>
      <div class="contact">Manolo Covarrubias · guía local&#10;hola@huasteca-potosina.com · WhatsApp +52 489 109 0388&#10;Xilitla, San Luis Potosí, México · Operador SECTUR</div>
    </div>
    <div class="stamp">
      <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(14,23,16,0.35)" stroke-width="0.8"/>
        <defs><path id="arcC" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none"/></defs>
        <text font-family="DM Sans" font-size="6" letter-spacing="2.2" fill="rgba(14,23,16,0.55)"><textPath href="#arcC" startOffset="0%">★ HUASTECA · POTOSINA · TOURS ·</textPath></text>
      </svg>
      <img class="ave" src="${origen}/logos/golondrina-color.svg" alt=""/>
    </div>
  </header>

  <div class="title-block">
    <div><h1>Cotización<br/><em class="ital">№ ${folioQ}</em></h1></div>
    <div class="meta">
      <div class="row"><span class="k">Emitida</span><span class="v">${d.emitida}</span></div>
      <div class="row"><span class="k">Vigencia</span><span class="v">${d.vigencia}</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3>Cliente</h3>
      <div class="field">
        <div><div class="k">Nombre</div><div class="v">${esc(d.cliente.nombre)}</div></div>
        <div><div class="k">Personas</div><div class="v">${numPersonas}</div><div class="v" style="font-size:7pt;color:rgba(14,23,16,.5)">${desgloseQ}</div></div>
        <div><div class="k">WhatsApp</div><div class="v">${esc(d.cliente.telefono) || "—"}</div></div>
        <div><div class="k">Email</div><div class="v" style="font-size:7.5pt">${esc(d.cliente.email) || "—"}</div></div>
        ${d.cliente.notas ? `<div style="grid-column:1/-1"><div class="k">Notas</div><div class="v" style="font-size:7.5pt">${esc(d.cliente.notas)}</div></div>` : ""}
      </div>
    </div>
    <div class="card dark">
      <h3>Detalles del viaje</h3>
      <div class="field">
        <div><div class="k">Fecha inicio</div><div class="v">${d.fechaInicio}</div></div>
        <div><div class="k">Fecha fin</div><div class="v">${d.fechaFin}</div></div>
        <div><div class="k">Duración</div><div class="v">${d.duracionDias} día${d.duracionDias !== 1 ? "s" : ""}</div></div>
        <div><div class="k">Hospedaje</div><div class="v" style="font-size:8pt">${esc(d.hospedaje)}</div></div>
        <div style="grid-column:1/-1"><div class="k">Recogida</div><div class="v"${varios ? ` style="font-size:7.5pt"` : ""}>${recogidaTexto}</div></div>
      </div>
    </div>
  </div>

  <div class="tour-table">
    <div class="head-row"><span>Concepto</span><span>Fecha</span><span class="right">Pers.</span><span class="right">Subtotal MXN</span></div>
    ${filas}
  </div>

  <div class="totals">
    <div class="note"><strong>Sobre los precios:</strong> Todos los importes están en <strong>pesos mexicanos (MXN)</strong>. Vigencia: <strong>${d.vigenciaLabel}</strong>, hasta el <strong>${d.vigencia}</strong>. Tarifas sujetas a disponibilidad al confirmar.</div>
    <div class="calc">
      <div class="line"><span>Subtotal tours</span><span class="num">$${d.toursTotal.toLocaleString("es-MX")}</span></div>
      ${d.pkgsTotal > 0 ? `<div class="line"><span>Subtotal hospedaje</span><span class="num">$${d.pkgsTotal.toLocaleString("es-MX")}</span></div>` : ""}
      ${d.extrasTotal > 0 ? `<div class="line"><span>Subtotal extras</span><span class="num">$${d.extrasTotal.toLocaleString("es-MX")}</span></div>` : ""}
      ${d.ajuste !== 0 ? `<div class="line"><span>Ajuste de precio</span><span class="num">${d.ajuste > 0 ? "+" : "−"}$${Math.abs(d.ajuste).toLocaleString("es-MX")}</span></div>` : ""}
      ${d.descuento > 0 ? `<div class="line sub-line"><span>Descuento aplicado</span><span class="num">−$${d.descuento.toLocaleString("es-MX")}</span></div>` : ""}
      <div class="line grand"><span class="k">Total</span><span class="v">$${d.total.toLocaleString("es-MX")}</span></div>
      <div class="line deposit"><span>Anticipo para reservar (${d.anticipoPct} %)</span><span class="num">$${d.anticipo.toLocaleString("es-MX")}</span></div>
      <div class="line"><span>Saldo al inicio del tour</span><span class="num">$${d.saldo.toLocaleString("es-MX")}</span></div>
    </div>
  </div>

  <div class="checks">
    <div><h4>Sí incluye</h4>
      <ul class="yes">
        ${incluyeLis}
      </ul>
    </div>
    <div><h4>No incluye</h4>
      <ul class="no">
        ${noIncluyeLis}
      </ul>
    </div>
  </div>

  <div class="foot">
    <div class="terms">Aparta con el anticipo por transferencia, OXXO o tarjeta (liga de pago, sin comisión); te confirmamos por WhatsApp. ${cancelTexto} El resto se paga antes de iniciar el primer tour, en efectivo, transferencia o liga de pago.</div>
    <a class="cta" href="https://wa.me/524891090388"><div class="lbl">Confirmar por WhatsApp</div><div class="num">+52 489 109 0388</div></a>
  </div>

  <span class="runfoot">Cotización № ${folioQ}</span>
</section>
<script>
/* La hoja se mide contra una A4 real y se aprieta sola hasta caber. Se hace
   aquí y no con un número de renglones fijo porque lo que ocupa no son los
   renglones: son los nombres largos, las notas del cliente y el hospedaje. */
(function () {
  var page = document.querySelector('.page');
  var sonda = document.createElement('div');
  sonda.style.cssText = 'position:absolute;visibility:hidden;height:296mm;top:0;';
  document.body.appendChild(sonda);
  var A4 = sonda.offsetHeight;
  sonda.remove();
  var alto = function () { return page.getBoundingClientRect().height; };
  if (alto() > A4 + 2) page.classList.add('compacta');
  if (alto() > A4 + 2) page.classList.add('compacta2');
  /* Si ni así cabe, se deja fluir a una segunda página en vez de recortar. */
  if (alto() > A4 + 2) page.classList.add('fluida');
})();
</script>
</body></html>`;
}
