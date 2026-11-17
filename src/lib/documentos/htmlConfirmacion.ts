/**
 * El PDF de CONFIRMACIÓN de una reserva (HP-M-…), como HTML listo para
 * imprimir. Es el mismo que descarga el panel (Reservas → Descargar PDF):
 * salió de `ReservasClient.tsx` el 16 nov 2026 para que el servidor lo arme
 * igual y el bot de WhatsApp lo mande al confirmar el pago.
 *
 * `origen`: de dónde salen los logos (la URL del sitio). Una reserva cancelada
 * no lleva comprobante: quien llama lo revisa antes.
 */
import type { TourBooking } from "@prisma/client";
import { cobradoDe } from "@/lib/admin/dinero";
import { TOURS_LISTA, recogidaDeTour, salidaCorta, partesRecogida } from "@/lib/tours";
import type { LineItem, PackageItem } from "@/components/admin/ReservaModal";
import { addOnsDeTour, cantidadAddOn } from "@/lib/admin/lineasPrecio";
import { grupoDe, grupoLargo } from "@/lib/admin/reserva";
import { extrasDe, calcExtraLine } from "@/lib/admin/extras";
import { escapeHtml as esc } from "@/lib/escapeHtml";

const fDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function htmlConfirmacion(b: TourBooking, origen: string): string {
    const rawLines   = (b as any).lineItems as any[] | null;
    const meta       = rawLines?.find((l: any) => l._meta) || {};
    const cleanLines = rawLines?.filter((l: any) => !l._meta);
    const lines: LineItem[] = cleanLines?.length
      // Sin desglose (renglón viejo) los menores se leen como el tramo de antes; con
      // bebés o niños de 4 a 7 guardados, `children` ya no se reparte.
      ? cleanLines.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0), childrenSmall: l.childrenSmall ?? 0 }))
      : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];

    const pkgs: PackageItem[] = (b as any).packageItems ?? [];
    const rawDeposito = (b as any).depositoPagado ?? 0;
    // Pago online por Stripe = liquidado al 100% aunque no tenga anticipo registrado.
    const deposito   = rawDeposito > 0 ? rawDeposito : cobradoDe(b as any);
    const pendiente  = Math.max(0, b.totalAmount - deposito);
    // 🔴 Todo lo que sale de la base y pudo escribir un cliente, el equipo o el
    // bot entra al HTML escapado con `esc`: este voucher se abre con
    // `document.write` dentro de la sesión del panel. Lo del catálogo (horas,
    // dificultad, cancelación) y el HTML propio se quedan como están.
    const metodoPago = esc(meta.metodoPago)  || "—";
    const folioPago  = esc(meta.folioPago)   || "—";
    const pickupLugar = esc(meta.pickupLugar) || "Lobby de tu hotel en Xilitla";
    const folioB     = esc(b.confirmationNumber);

    const tourDates  = lines.map(l => l.tourDate).filter(Boolean).sort();
    const checkouts  = pkgs.map(p => p.checkout).filter(Boolean).sort();
    const fechaInicio = tourDates[0] || b.tourDate;
    const fechaFin   = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || b.tourDate;
    // Tamaño REAL del grupo, desglosado en adultos y niños (ver lib/admin/reserva).
    const grupo       = grupoDe(b as any);
    const numPersonas = Number(meta.numPersonas) > 0 ? Number(meta.numPersonas) : grupo.total;
    const desglose    = grupoLargo(grupo);
    // Resumen de arriba: NO repetir los nombres (el itinerario de abajo ya los lista).
    // Con varios tours mostramos el conteo; con uno solo, su nombre.
    const tourResumen = lines.length > 1 ? `${lines.length} tours` : esc(lines[0]?.tourName || b.tourName);
    const confirmDate = new Date(b.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

    const DIFIC: Record<string, string> = { baja: "Fácil", media: "Moderada", alta: "Difícil" };

    // 🔴 El Edén no se reembolsa (`cancelacion` en tours.ts). El recuadro de
    // Cancelación decía "Gratis hasta 48 h antes" en todos los vouchers, y el
    // voucher es justo el papel que el cliente enseña al pedir su dinero.
    const toursVoucher   = lines.map(l => TOURS_LISTA.find(t => t.slug === l.tourSlug));
    const cancelPropias  = toursVoucher
      .filter((t, n) => !!t?.cancelacion && toursVoucher.findIndex(x => x?.slug === t?.slug) === n);
    const todasPropias   = cancelPropias.length > 0 && toursVoucher.every(t => t?.cancelacion);
    const cancelEstandar = `<strong>Gratis</strong> hasta 48 h antes del primer tour. Después aplica cargo del 50%. Fuerza mayor: reagendamos sin costo.`;
    const cancelTexto    = todasPropias
      ? cancelPropias.map(t => t!.cancelacion!.es).join(" ")
      : [cancelEstandar, ...cancelPropias.map(t => `<strong>${t!.nombreCorto}:</strong> ${t!.cancelacion!.es}`)].join(" ");

    const dayRows = lines.map((l, i) => {
      const t    = TOURS_LISTA.find(t => t.slug === l.tourSlug);
      const dur  = t ? `${t.duracion_hrs} h` : "—";
      const dif  = t ? (DIFIC[t.dificultad] || t.dificultad) : "—";
      const fd   = l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }) : "—";
      const num  = String(i + 1).padStart(2, "0");
      const opcionales = addOnsDeTour(l.tourSlug)
        .map(a => ({ a, n: cantidadAddOn(l, a.id) }))
        .filter(x => x.n > 0)
        .map(({ a, n }) => `<span><span class="k">Incluye</span> ${a.nombre} · ${n} ${n === 1 ? "persona" : "personas"}</span>`)
        .join("");
      // 🔴 La hora y el lugar salen del recorrido. Aquí decía "09:00" para
      // todos: el voucher de la Gruta de Xilo (7 PM) citaba al cliente de
      // mañana. El horario fijo del Edén cambia según el día y no cabe en la
      // casilla: "Por confirmar", como dice el pie ("tu guía coordinará por
      // WhatsApp la hora exacta"); "Según el día" junto a la fecha se leía como
      // que no sabíamos la hora. El buceo no tiene hora pública.
      const rec    = t ? recogidaDeTour(t) : null;
      const hora   = !t ? "Por acordar" : rec?.horaTexto ? "Por confirmar" : (salidaCorta(t) ?? "Por acordar");
      // Sin recogida (RZR en nuestra base, buceo en la laguna) el "dónde" es el
      // punto de encuentro del catálogo, no el hotel del cliente.
      const encuentro = !!t && (rec?.tipo === "base-xilitla" || rec?.tipo === "en-sitio");
      const lugarEnc  = encuentro && t ? partesRecogida(t, false).lugar : "";
      const donde     = encuentro ? lugarEnc.charAt(0).toUpperCase() + lugarEnc.slice(1) : pickupLugar;
      return `<div class="day">
        <div class="num">${num}</div>
        <div>
          <h4 class="name">${esc(l.tourName)}</h4>
          <div class="meta">
            <span><span class="k">Fecha</span> ${fd}</span>
            <span><span class="k">Dur.</span> ${dur}</span>
            <span><span class="k">Dif.</span> ${dif}</span>
            ${opcionales}
          </div>
        </div>
        <div class="pickup">
          <div class="k">${encuentro ? "Encuentro" : "Recogida"}</div>
          <div class="v">${hora}</div>
          <div class="where">${donde}</div>
        </div>
      </div>`;
    }).join("");

    // Hospedaje: se ve claramente si la reserva lo incluye (habitación/es, hotel,
    // noches y fechas) o si es solo de tours. Los packageItems vienen de la cotización.
    const noche = (n: number) => `${n} noche${n !== 1 ? "s" : ""}`;
    const BED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`;
    const lodgingRows = pkgs.length
      ? pkgs.map(p => {
          const ci = p.checkin  ? fDate(p.checkin)  : "";
          const co = p.checkout ? fDate(p.checkout) : "";
          const fechas = ci && co ? `${ci} → ${co}` : (ci || co || "");
          const nHab   = p.habitaciones ?? 1;
          const habTxt = `${nHab} ${nHab === 1 ? "habitación" : "habitaciones"}`;
          return `<div class="stay">
            <div class="stay-ico">${BED_SVG}</div>
            <div>
              <h4 class="name">${esc(p.habitacion)}</h4>
              <div class="meta">
                ${p.hotel ? `<span><span class="k">Hotel</span> ${esc(p.hotel)}</span>` : ""}
                <span><span class="k">Habitaciones</span> ${habTxt}</span>
                <span><span class="k">Noches</span> ${noche(p.noches)}</span>
                ${fechas ? `<span><span class="k">Estancia</span> ${fechas}</span>` : ""}
              </div>
            </div>
          </div>`;
        }).join("")
      : `<div class="stay-none">Sin hospedaje — esta reserva es solo de tours.</div>`;
    const lodgingBlock = `<div class="lodging"><h3>Hospedaje</h3>${lodgingRows}</div>`;

    // Extras contratados (comida, transporte, guía privado). El cliente ve el
    // concepto y su importe; lo que a nosotros nos costó NO sale del panel.
    const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;
    const extras   = extrasDe((b as any).extraItems);
    const extrasBlock = extras.length
      ? `<div class="lodging"><h3>Incluye además</h3>${extras.map(ex => {
          const cobro = calcExtraLine(ex);
          const cant  = ex.cantidad > 1 ? `<span><span class="k">Cantidad</span> ${ex.cantidad}</span>` : "";
          const monto = ex.incluido || cobro === 0
            ? `<span><span class="k">Costo</span> Incluido</span>`
            : `<span><span class="k">Importe</span> $${cobro.toLocaleString("es-MX")}</span>`;
          return `<div class="stay">
            <div class="stay-ico">${PLUS_SVG}</div>
            <div>
              <h4 class="name">${esc(ex.concepto)}</h4>
              <div class="meta">
                ${ex.detalle ? `<span>${esc(ex.detalle)}</span>` : ""}
                ${cant}
                ${monto}
              </div>
            </div>
          </div>`;
        }).join("")}</div>`
      : "";

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Confirmación ${folioB}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@200;300;400;500;700&display=swap" rel="stylesheet">
<style>
:root{--negro:#0e1710;--verde-profundo:#1a2e1a;--verde-selva:#3a6b1a;--verde-vivo:#5a9e2a;--lima:#8fbe3a;--crema:#f4edd8;--arena:#e6d4b0;--dorado:#c4882a;--terracota:#9a4a1e;--display:'Cormorant Garamond',Georgia,serif;--dm:'DM Sans',system-ui,sans-serif;}
@page{size:A4 portrait;margin:0;}*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#2a2a2a;font-family:var(--dm);color:var(--negro);}
/* 🔴 Antes: height fijo + overflow:hidden. Con varios recorridos y hospedaje el
   itinerario empujaba hacia abajo las condiciones (cancelación, saldo, el día
   del tour) y la firma, y el voucher salía sin ellas. Ahora la hoja crece, se
   aprieta sola hasta caber, y si aun así no cabe sigue en otra página. */
.page{width:210mm;min-height:296mm;background:var(--crema);position:relative;margin:24px auto;box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:visible;display:flex;flex-direction:column;}
.page.fluida{display:block;}
@media print{
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  html,body{background:var(--crema);}
  .page{margin:0;box-shadow:none;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
  .day,.stay,.keyinfo,.practical,.terms-strip,.terms-strip div,.foot,.summary{break-inside:avoid;page-break-inside:avoid;}
}

/* ── Compactado automático, dos niveles ────────────────────────────────── */
.compacta .hero{padding:7mm 12mm 5mm;}
.compacta .hero h1{font-size:25pt;}
.compacta .summary{padding:4mm 12mm;}
.compacta .body{padding:4mm 12mm;gap:5mm;}
.compacta .itin h3,.compacta .practical h3,.compacta .keyinfo h3{font-size:11.5pt;margin-bottom:2mm;}
.compacta .day{padding:1.7mm 0;}
.compacta .day .name,.compacta .stay .name{font-size:10pt;}
.compacta .day .meta,.compacta .stay .meta{font-size:6.8pt;}
.compacta .day .num{font-size:15pt;}
.compacta .stay{padding:1.7mm 0;}
.compacta .keyinfo{padding:3mm 4mm;}
.compacta .keyinfo .row{font-size:7.8pt;padding:.6mm 0;}
.compacta .practical{padding:3mm 4mm;}
.compacta .practical li{font-size:6.8pt;line-height:1.25;}
.compacta .terms-strip{padding:4mm 12mm 3mm;}
.compacta .terms-strip p{font-size:6.8pt;line-height:1.35;}
.compacta .terms-strip h3{font-size:10pt;}

.compacta2 .hero{padding:5.5mm 11mm 4mm;}
.compacta2 .hero h1{font-size:21pt;}
.compacta2 .summary{padding:3mm 11mm;}
.compacta2 .body{padding:3mm 11mm;gap:4mm;}
.compacta2 .day{padding:1.2mm 0;}
.compacta2 .day .name,.compacta2 .stay .name{font-size:9pt;}
.compacta2 .day .meta,.compacta2 .stay .meta{font-size:6.3pt;}
.compacta2 .day .num{font-size:13pt;}
.compacta2 .stay{padding:1.2mm 0;}
.compacta2 .keyinfo .row{font-size:7.2pt;}
.compacta2 .practical li{font-size:6.3pt;line-height:1.2;}
.compacta2 .terms-strip p{font-size:6.3pt;line-height:1.3;}
.hero{background:var(--negro);color:var(--crema);padding:9mm 14mm 7mm;position:relative;}
.hero::after{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(135deg,rgba(244,237,216,.04) 0 2px,transparent 2px 14px);pointer-events:none;}
.hero>*{position:relative;z-index:1;}
.hero .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5mm;}
.brand{display:flex;align-items:baseline;gap:4mm;}.brand .logo{height:11mm;width:auto;display:block;}.stamp .ave{width:9mm;height:auto;display:block;}.wordmark{font-family:var(--display);font-size:14pt;letter-spacing:5px;text-transform:uppercase;color:var(--crema);line-height:1;}
.stamp{width:16mm;height:16mm;border-radius:50%;border:1px solid rgba(244,237,216,.4);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;}
.h{font-family:var(--display);font-style:italic;font-size:15pt;color:var(--dorado);}
.hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:7mm;align-items:end;}
.hero h1{font-family:var(--display);font-weight:300;font-size:30pt;line-height:.95;color:var(--crema);margin:2mm 0 0;letter-spacing:-.01em;}
.hero h1 em{font-style:italic;color:var(--dorado);}
.conf-badge{display:inline-flex;align-items:center;gap:2mm;background:var(--verde-selva);color:white;padding:1.5mm 3mm;font-size:7.5pt;letter-spacing:2.5px;text-transform:uppercase;font-weight:600;}
.salute{font-family:var(--display);font-style:italic;font-size:10pt;color:rgba(244,237,216,.8);margin:0;line-height:1.4;}
.summary{background:var(--arena);padding:5mm 14mm;display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;}
.summary .item .k{font-size:7pt;letter-spacing:2.5px;text-transform:uppercase;color:var(--verde-selva);margin-bottom:1.5mm;}
.summary .item .v{font-family:var(--display);font-size:12pt;line-height:1.1;color:var(--negro);}
.summary .item .sub{font-size:7pt;color:rgba(14,23,16,.5);margin-top:1mm;line-height:1.2;}
.summary .item .v.italic{font-style:italic;color:var(--dorado);}
.summary .item .v.mono{font-family:ui-monospace,monospace;font-size:9pt;font-style:normal;}
.body{padding:6mm 14mm;flex:1;display:grid;grid-template-columns:1.5fr 1fr;gap:7mm;min-height:0;}
.itin h3,.practical h3,.keyinfo h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 3mm;line-height:1;}
.day{display:grid;grid-template-columns:10mm 1fr auto;gap:3mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.12);align-items:start;}
.day:last-child{border-bottom:none;}
.day .num{font-family:var(--display);font-style:italic;font-size:18pt;color:var(--dorado);line-height:.9;}
.day .name{font-family:var(--display);font-size:11pt;line-height:1.15;margin:0;}
.day .meta{font-size:7.5pt;color:rgba(14,23,16,.62);margin-top:.8mm;display:flex;gap:3mm;flex-wrap:wrap;}
.day .meta .k{color:rgba(14,23,16,.4);text-transform:uppercase;letter-spacing:1px;font-size:6.5pt;}
.pickup{background:var(--negro);color:var(--crema);padding:2mm 3.5mm;text-align:right;min-width:24mm;}
.pickup .k{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;color:var(--lima);line-height:1;}
.pickup .v{font-family:var(--display);font-style:italic;font-size:12pt;color:var(--dorado);margin-top:.5mm;line-height:1;}
.pickup .where{font-size:6.5pt;opacity:.7;margin-top:.5mm;line-height:1.2;}
.lodging{margin-top:4mm;}
.lodging h3{font-family:var(--display);font-weight:300;font-size:13pt;margin:0 0 2mm;line-height:1;}
.stay{display:grid;grid-template-columns:10mm 1fr;gap:3mm;padding:2.5mm 0;border-bottom:1px solid rgba(14,23,16,.12);align-items:start;}
.stay:last-child{border-bottom:none;}
.stay-ico{color:var(--dorado);display:flex;justify-content:center;padding-top:.8mm;}
.stay-ico svg{width:7mm;height:7mm;}
.stay .name{font-family:var(--display);font-size:11pt;line-height:1.15;margin:0;}
.stay .meta{font-size:7.5pt;color:rgba(14,23,16,.62);margin-top:.8mm;display:flex;gap:3mm;flex-wrap:wrap;}
.stay .meta .k{color:rgba(14,23,16,.4);text-transform:uppercase;letter-spacing:1px;font-size:6.5pt;}
.stay-none{font-style:italic;font-size:8.5pt;color:rgba(14,23,16,.55);padding:1.5mm 0;}
.right-col{display:flex;flex-direction:column;gap:5mm;}
.keyinfo{background:var(--arena);padding:4mm 5mm;}
.keyinfo .row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dashed rgba(14,23,16,.2);font-size:8.5pt;line-height:1.3;}
.keyinfo .row:last-child{border-bottom:none;}
.keyinfo .k{color:rgba(14,23,16,.55);letter-spacing:1.2px;text-transform:uppercase;font-size:7pt;}
.keyinfo .v{font-family:ui-monospace,monospace;font-size:8.5pt;}
.practical{border:1px solid rgba(14,23,16,.15);padding:4mm 5mm;background:#fffaf0;}
.practical ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;}
.practical li{display:grid;grid-template-columns:auto 1fr;gap:1.5mm;font-size:7.5pt;line-height:1.35;}
.practical li::before{content:'→';color:var(--verde-selva);}
.terms-strip{padding:5mm 14mm 4mm;background:var(--negro);color:var(--crema);}
.terms-strip .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;}
.terms-strip h3{font-family:var(--display);font-weight:300;font-size:11pt;margin:0 0 2mm;line-height:1;color:var(--crema);}
.terms-strip p{font-size:7.5pt;line-height:1.45;margin:0;color:rgba(244,237,216,.75);}
.terms-strip p strong{color:var(--dorado);font-weight:500;}
.foot{background:var(--verde-profundo);color:var(--crema);padding:5mm 14mm;display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:center;}
.foot .text{font-family:var(--display);font-style:italic;font-size:10pt;line-height:1.3;margin:0;max-width:115mm;}
.foot .text strong{color:var(--dorado);font-style:normal;font-weight:500;}
.wa{background:#25D366;color:white;padding:3mm 5mm;display:flex;align-items:center;gap:3mm;text-decoration:none;}
.wa .num{font-family:var(--display);font-style:italic;font-size:12pt;font-weight:500;line-height:1;white-space:nowrap;}
.wa .lbl{font-size:6.5pt;letter-spacing:1.5px;text-transform:uppercase;opacity:.9;}
.wa .dot{font-size:11pt;line-height:1;}
</style></head><body>
<section class="page">
  <div class="hero">
    <div class="top">
      <div class="brand"><img class="logo" src="${origen}/logos/huasteca-potosina-tours-horizontal-reverso.svg" alt="Huasteca Potosina Tours"/></div>
      <div class="stamp">
        <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(244,237,216,0.4)" stroke-width="0.8"/>
          <defs><path id="arcCv" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none"/></defs>
          <text font-family="DM Sans" font-size="6" letter-spacing="2.2" fill="rgba(244,237,216,0.75)"><textPath href="#arcCv" startOffset="0%">★ HUASTECA · POTOSINA · TOURS ·</textPath></text>
        </svg>
        <img class="ave" src="${origen}/logos/golondrina-reverso.svg" alt=""/>
      </div>
    </div>
    <div class="hero-grid">
      <div>
        <div class="conf-badge">✓ Reserva confirmada</div>
        <h1>Reserva <em>№ ${folioB}</em></h1>
      </div>
      <p class="salute">Hola <strong style="color:var(--crema)">${esc(b.customerName)}</strong>, gracias por confiar en nosotros. Tu reserva quedó confirmada el ${confirmDate}.</p>
    </div>
  </div>

  <div class="summary">
    <div class="item"><div class="k">${lines.length > 1 ? "Tours" : "Tour"}</div><div class="v italic">${tourResumen}</div></div>
    <div class="item"><div class="k">Fechas</div><div class="v mono">${fDate(fechaInicio)} al ${fDate(fechaFin)}</div></div>
    <div class="item"><div class="k">Personas</div><div class="v">${numPersonas}</div><div class="sub">${desglose}</div></div>
    <div class="item">
      <div class="k">Total · saldo</div>
      <div class="v italic">$${b.totalAmount.toLocaleString("es-MX")}</div>
      ${pendiente > 0 ? `<div class="v mono" style="color:var(--terracota);margin-top:1mm">saldo $${pendiente.toLocaleString("es-MX")}</div>` : `<div class="v mono" style="color:#3a6b1a;margin-top:1mm">pagado ✓</div>`}
    </div>
  </div>

  <div class="body">
    <div class="itin">
      <h3>Itinerario <em style="font-style:italic;color:var(--dorado)">día por día</em></h3>
      ${dayRows}
      ${lodgingBlock}
      ${extrasBlock}
    </div>
    <div class="right-col">
      <div class="keyinfo">
        <h3>Pago</h3>
        <div class="row"><span class="k">Anticipo pagado</span><span class="v">$${deposito > 0 ? deposito.toLocaleString("es-MX") : "—"}</span></div>
        <div class="row"><span class="k">Saldo pendiente</span><span class="v">$${pendiente > 0 ? pendiente.toLocaleString("es-MX") : "0"}</span></div>
        <div class="row"><span class="k">Método</span><span class="v">${metodoPago}</span></div>
        <div class="row"><span class="k">Folio</span><span class="v">${folioPago}</span></div>
      </div>
      <div class="practical">
        <h3>Qué empacar</h3>
        <ul>
          <li>Traje de baño (2)</li><li>Sandalias acuáticas</li>
          <li>Tenis ligeros</li><li>Bloqueador biodegradable</li>
          <li>Repelente</li><li>Toalla microfibra</li>
          <li>Bolsa seca</li><li>Identificación</li>
          <li>Efectivo</li><li>Gorra o sombrero</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="terms-strip">
    <div class="row">
      <div><h3>Cancelación</h3><p>${cancelTexto}</p></div>
      <div><h3>Saldo</h3><p>El <strong>saldo de $${pendiente.toLocaleString("es-MX")} MXN</strong> se paga antes de iniciar el primer tour, en efectivo o transferencia. Con tarjeta: liga de pago, sin comisión (el guía no lleva terminal).</p></div>
      <div><h3>El día del tour</h3><p>Tu guía coordinará por <strong>WhatsApp</strong> la hora exacta y el punto de recogida. Lleva esta confirmación impresa o en pantalla.</p></div>
    </div>
  </div>

  <div class="foot">
    <p class="text"><strong>Manolo Covarrubias</strong>, fundador & guía local · Xilitla, SLP — gracias por elegir vivir la Huasteca con nosotros.</p>
    <a class="wa" href="https://wa.me/524891090388"><span class="dot">●</span><span><span class="lbl">WhatsApp soporte</span><div class="num">+52 489 109 0388</div></span></a>
  </div>
</section>
<script>
/* El voucher se mide contra una A4 real y se aprieta solo hasta caber. */
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
  if (alto() > A4 + 2) page.classList.add('fluida');
})();
</script>
</body></html>`;
}
