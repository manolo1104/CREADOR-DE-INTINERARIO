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
import { TOURS_LISTA, partesRecogida, cargoVallesDe, opcionDeEleccion, incluyePropioDeTour, claveIncluye, INCLUYE_SIEMPRE, sinLugarDelDesayuno, type Tour } from "@/lib/tours";
import { resumenSalidas } from "@/lib/recogidaTexto";
import type { PackageItem, LineItem } from "@/components/admin/ReservaModal";
import { calcTourLine, calcPackageLine, addOnsDeTour, cantidadAddOn } from "@/lib/admin/lineasPrecio";
import { VIGENCIAS, calcularVencimiento, fechaLimite, vigenciaDe } from "@/lib/vencimientoCotizacion";
import { desgloseCotizacion } from "@/lib/admin/totalesCotizacion";
import { grupoDe, grupoLargo } from "@/lib/admin/reserva";
import { escapeHtml } from "@/lib/escapeHtml";
import { extrasDe, totalExtras, calcExtraLine, extrasCobrados, extrasIncluidos } from "@/lib/admin/extras";

const esc = escapeHtml;
const calcLine = calcTourLine;
const fDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
function getMeta(pkgs: any[]): { anticipo?: number; vigencia?: string; numPersonas?: number | null; priceOverride?: number | null; discountType?: "percent" | "fixed"; discountValue?: number | null } {
  return pkgs.find((p: any) => p._meta) || {};
}
function cleanPackages(pkgs: any[]): PackageItem[] {
  return pkgs.filter((p: any) => !p._meta);
}

/** Lo corto de un renglón de «incluye»: antes de « — » o «:», y sin pasarse de 70 letras. */
function corto(x: string): string {
  const base = x.split(" — ")[0].split(":")[0].split(" (")[0].trim();
  return base.length > 70 ? `${base.slice(0, 67).trim()}…` : base;
}

/**
 * «Sí incluye» de verdad (16 nov 2026). Antes iba fijo —desayuno, entradas a
 * los parques— también en un RZR, que no lleva ni uno ni otro. Lo propio de
 * cada recorrido cotizado (sin el traslado, que ya va en su renglón), con el
 * nombre del recorrido cuando no lo llevan todos, más lo que va siempre.
 */
export function incluyeDeCotizacion(tours: Tour[]): string[] {
  const unicos = tours.filter((t, i) => tours.findIndex((x) => x.slug === t.slug) === i);
  if (!unicos.length) return ["Guía certificado NOM-09 SECTUR", ...INCLUYE_SIEMPRE];
  const porClave = new Map<string, { texto: string; de: Set<string> }>();
  for (const t of unicos) {
    for (const x of incluyePropioDeTour(t).map(sinLugarDelDesayuno)) {
      if (/^traslado/i.test(x)) continue;
      const k = claveIncluye(corto(x));
      const e = porClave.get(k) ?? { texto: corto(x), de: new Set<string>() };
      e.de.add(t.nombreCorto);
      porClave.set(k, e);
    }
  }
  const lista = Array.from(porClave.values()).map((e) =>
    e.de.size === unicos.length || unicos.length === 1 ? e.texto : `${e.texto} (${Array.from(e.de).join(", ")})`,
  );
  return [...lista.slice(0, 12), ...INCLUYE_SIEMPRE];
}

export function htmlCotizacion(q: TourQuote, origen: string, hoy: Date = new Date()): string {
    const rawPkgs  = (q as any).packageItems ?? [];
    const meta     = getMeta(rawPkgs);
    const pkgs: PackageItem[] = cleanPackages(rawPkgs);
    // Sin el `_meta` de seguimiento: no es una línea de tour.
    const lineasTour = Array.isArray((q as any).lineItems) ? (q as any).lineItems.filter((l: any) => l && !l._meta) : [];
    const items: LineItem[] = lineasTour.length
      // Sin desglose (renglón viejo) los menores se leen como el tramo de antes; con
      // bebés o niños de 4 a 7 guardados, `children` ya no se reparte.
      ? lineasTour.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0), childrenSmall: l.childrenSmall ?? 0 }))
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }];

    const today    = hoy;
    // La vigencia es la fecha límite GUARDADA. Antes se contaba desde el día en
    // que se imprimía el PDF, así que cada descarga le alargaba el plazo.
    const vigDate  = new Date(`${fechaLimite(q) ?? calcularVencimiento(today, vigenciaDe(rawPkgs), q.tourDate)}T12:00:00`);
    const vigLabel = (VIGENCIAS[meta.vigencia ?? ""] ?? VIGENCIAS["7dias"]).label;
    const fmt      = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    const toursTotal  = items.reduce((s, l) => s + calcLine(l), 0);
    const pkgsTotal   = pkgs.reduce((s, p) => s + calcPackageLine(p), 0);
    // Los extras cobrados son parte del precio: sin contarlos aquí, la comida
    // aparte se pintaba en el PDF como si fuera un "descuento aplicado".
    const extrasQ         = extrasDe((q as any).extraItems);
    const extrasCobradosQ = extrasCobrados(extrasQ);
    const extrasIncluidosQ = extrasIncluidos(extrasQ);
    const extrasTotalQ    = totalExtras(extrasQ);
    // El desglose sale de un solo sitio, el mismo que usa el correo: si se
    // calculara aquí a mano, el papel y el correo de la misma cotización
    // podrían decir cosas distintas.
    const sumaLineas  = toursTotal + pkgsTotal + extrasTotalQ;
    const desglose    = desgloseCotizacion(sumaLineas, q.totalAmount, meta as any);
    const descuento   = desglose.descuento;
    const ajuste      = desglose.ajuste;
    const anticipoNum = desglose.anticipo;
    const saldo       = desglose.saldo;

    const tourDates    = items.map(l => l.tourDate).filter(Boolean).sort();
    const checkouts    = pkgs.map(p => p.checkout).filter(Boolean).sort();
    const fechaInicio  = tourDates[0] || q.tourDate;
    const fechaFin     = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || q.tourDate;
    const d1 = new Date(fechaInicio + "T12:00:00");
    const d2 = new Date(fechaFin + "T12:00:00");
    const duracion     = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
    // Tamaño REAL del grupo (no sumar por tour: es el mismo grupo en todos los tours).
    // Prioridad: el número capturado en la cotización → máximo por tour → total guardado.
    const perTourMax   = items.length ? Math.max(...items.map(l => l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0) + ((l as { infants?: number }).infants ?? 0))) : 0;
    const grupoQ       = grupoDe(q as any);
    const desgloseQ     = grupoLargo(grupoQ);
    const numPersonas  = Number(meta.numPersonas) > 0
      ? Number(meta.numPersonas)
      : (perTourMax > 0 ? perTourMax : q.adults + (q.children ?? 0));
    // 🔴 Todo lo que sale de la base y pudo escribir un cliente o el bot (nombre,
    // notas, hotel, conceptos a mano) entra al HTML escapado con `esc`: este
    // PDF se abre con `document.write` dentro de la sesión del panel.
    const hospNombre   = pkgs.length ? esc(pkgs[0].hotel) : "No incluye";
    const folioQ       = esc(q.quoteNumber);
    // 🔴 La recogida sale de los recorridos cotizados. Decía "Pasamos por ti a
    // tu hospedaje en Xilitla o Ciudad Valles" en todas las cotizaciones, y la
    // Gruta, el Edén y otros solo recogen en Xilitla (desde Valles, con costo
    // aparte); el RZR y el buceo no recogen. Con renglones libres o solo
    // hospedaje no hay recorrido del que leerla: frase neutra, sin hora.
    const toursCotizados = items
      .map(l => TOURS_LISTA.find(t => t.slug === l.tourSlug))
      .filter((t): t is Tour => !!t);
    const recogidaTexto = toursCotizados.length
      ? resumenSalidas(toursCotizados, "es").map(esc).join("<br/>")
      : "La hora y el punto de recogida te los confirmamos por WhatsApp.";
    // 🔴 "Sí incluye: Transporte desde y hacia tu hotel" iba fijo, y dos
    // recuadros más arriba la Recogida dice, para el RZR, que el transporte no
    // va incluido y, para el buceo, que llegas por tu cuenta. Solo se afirma
    // si TODOS los recorridos cotizados llevan traslado; si no, remite a la
    // Recogida. Los que solo recogen en Xilitla cobran aparte desde Valles.
    const trasladoTodos = toursCotizados.every(t => partesRecogida(t, false).incluyeTraslado);
    const conCostoValles = toursCotizados.filter(t => partesRecogida(t, false).valles).length;
    // Y los que recogen en las dos pero cobran el traslado desde Valles (la
    // Ruta Surrealista, +$400 por reserva): también «con costo adicional».
    const conCargoValles = toursCotizados.filter(t => cargoVallesDe(t) > 0).length;
    const notaValles    = conCostoValles + conCargoValles === 0 ? ""
      : conCostoValles + conCargoValles === toursCotizados.length ? " (desde Ciudad Valles, con costo adicional)"
      : " (desde Ciudad Valles, en algunos con costo adicional)";
    const trasladoLi    = trasladoTodos
      ? `Transporte desde y hacia tu hotel${notaValles}`
      : "Traslado según se indica en «Recogida»";
    // 🔴 El Edén no se reembolsa (`cancelacion` en tours.ts): el pie prometía
    // "cancelación gratuita hasta 48 h" también en su cotización.
    const cancelPropias = toursCotizados
      .filter((t, n) => !!t.cancelacion && toursCotizados.findIndex(x => x.slug === t.slug) === n);
    const todasPropias  = cancelPropias.length > 0 && toursCotizados.every(t => t.cancelacion);
    const cancelEstandar = "Cancelación gratuita hasta 48 h antes del primer tour; posteriores aplican cargo del 50%.";
    const cancelTexto   = todasPropias
      ? cancelPropias.map(t => esc(t.cancelacion!.es)).join(" ")
      : [cancelEstandar, ...cancelPropias.map(t => `${esc(t.nombreCorto)}: ${esc(t.cancelacion!.es)}`)].join(" ");

    const incluyeLis = incluyeDeCotizacion(toursCotizados).map(x => `<li>${esc(x)}</li>`).join("");

    const tourRows = items.map(l => {
      const esVeh = !!l.vehiculo; // línea por vehículo (RZR): sin conteo de personas
      const un    = Math.max(1, Number(l.unidades) || 1);
      const bebes = (l as { infants?: number }).infants ?? 0;
      const total = l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0) + bebes;
      const sub   = esVeh
        ? "Precio por vehículo · gasolina, equipo y guía incluidos"
        : [
            l.adults > 0 ? `${l.adults} adulto${l.adults !== 1 ? "s" : ""}` : "",
            (l.childrenMid ?? 0) > 0 ? `${l.childrenMid} niño${l.childrenMid !== 1 ? "s" : ""} (6-10)` : "",
            (l.childrenSmall ?? 0) > 0 ? `${l.childrenSmall} niño${l.childrenSmall !== 1 ? "s" : ""} (4-7, 50 %)` : "",
            bebes > 0 ? `${bebes} bebé${bebes !== 1 ? "s" : ""} (0-3, gratis)` : "",
          ].filter(Boolean).join(" · ");
      const fd = l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—";
      // La actividad opcional se cobra dentro de este renglón: si no se nombra,
      // el cliente ve un importe más alto que el precio del tour sin explicación.
      // El precio se lee del catálogo, el mismo que usó el cobro.
      const opcionales = addOnsDeTour(l.tourSlug)
        .map(a => ({ a, n: cantidadAddOn(l, a.id) }))
        .filter(x => x.n > 0)
        .map(({ a, n }) => `+ ${esc(a.nombre)} · ${n} ${n === 1 ? "persona" : "personas"} · $${(a.precio * n).toLocaleString("es-MX")}`)
        .join("<br/>");
      // Lo que eligió el cliente (Ruta Acuática): a dónde va el grupo y, si la
      // opción suma, por qué el renglón cuesta más que el precio de lista.
      const opcion   = opcionDeEleccion(TOURS_LISTA.find(t => t.slug === l.tourSlug) ?? {}, l.eleccion);
      const eleccion = opcion
        ? `Elección: ${esc(opcion.nombre)}${opcion.extraPorPersona ? ` (+$${opcion.extraPorPersona.toLocaleString("es-MX")} por persona, incluido)` : ""}`
        : (l.eleccion ? `Elección: ${esc(l.eleccion)}` : "");
      return `<div class="row"><div><div class="tour-name">${esc(l.tourName)}</div><div class="tour-sub">${sub}</div>${eleccion ? `<div class="tour-sub">${eleccion}</div>` : ""}${opcionales ? `<div class="tour-sub" style="color:var(--terracota)">${opcionales}</div>` : ""}</div><div class="num">${fd}</div><div class="num right">${esVeh ? `${un} veh.` : total}</div><div class="amt right">$${calcLine(l).toLocaleString("es-MX")}</div></div>`;
    }).join("");

    const hospRows = pkgs.map(p => {
      const fechas = [p.checkin ? fDate(p.checkin) : "", p.checkout ? fDate(p.checkout) : ""].filter(Boolean).join(" → ");
      const ocupacion = p.huespedes ? ` · ${p.huespedes} ${p.huespedes === 1 ? "persona" : "personas"} por habitación` : "";
      return `<div class="row"><div><div class="tour-name">Hospedaje · ${p.noches} noche${p.noches !== 1 ? "s" : ""}</div><div class="tour-sub">${esc(p.hotel)} — ${esc(p.habitacion)}${ocupacion}</div></div><div class="num">${fechas}</div><div class="num right">${p.habitaciones} hab.</div><div class="amt right">$${calcPackageLine(p).toLocaleString("es-MX")}</div></div>`;
    }).join("");

    const extraRows = extrasCobradosQ.map(ex => {
      const sub = ex.detalle ? esc(ex.detalle) : "Servicio adicional contratado";
      return `<div class="row"><div><div class="tour-name">${esc(ex.concepto)}</div><div class="tour-sub">${sub}</div></div><div class="num">—</div><div class="num right">${ex.cantidad}</div><div class="amt right">$${calcExtraLine(ex).toLocaleString("es-MX")}</div></div>`;
    }).join("");

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Cotización ${folioQ}</title>
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
      <div class="row"><span class="k">Emitida</span><span class="v">${fmt(today)}</span></div>
      <div class="row"><span class="k">Vigencia</span><span class="v">${fmt(vigDate)}</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3>Cliente</h3>
      <div class="field">
        <div><div class="k">Nombre</div><div class="v">${esc(q.customerName)}</div></div>
        <div><div class="k">Personas</div><div class="v">${numPersonas}</div><div class="v" style="font-size:7pt;color:rgba(14,23,16,.5)">${desgloseQ}</div></div>
        <div><div class="k">WhatsApp</div><div class="v">${esc(q.customerPhone) || "—"}</div></div>
        <div><div class="k">Email</div><div class="v" style="font-size:7.5pt">${esc(q.customerEmail) || "—"}</div></div>
        ${q.notes ? `<div style="grid-column:1/-1"><div class="k">Notas</div><div class="v" style="font-size:7.5pt">${esc(q.notes)}</div></div>` : ""}
      </div>
    </div>
    <div class="card dark">
      <h3>Detalles del viaje</h3>
      <div class="field">
        <div><div class="k">Fecha inicio</div><div class="v">${fDate(fechaInicio)}</div></div>
        <div><div class="k">Fecha fin</div><div class="v">${fDate(fechaFin)}</div></div>
        <div><div class="k">Duración</div><div class="v">${duracion} día${duracion !== 1 ? "s" : ""}</div></div>
        <div><div class="k">Hospedaje</div><div class="v" style="font-size:8pt">${hospNombre}</div></div>
        <div style="grid-column:1/-1"><div class="k">Recogida</div><div class="v"${toursCotizados.length > 1 ? ` style="font-size:7.5pt"` : ""}>${recogidaTexto}</div></div>
      </div>
    </div>
  </div>

  <div class="tour-table">
    <div class="head-row"><span>Concepto</span><span>Fecha</span><span class="right">Pers.</span><span class="right">Subtotal MXN</span></div>
    ${tourRows}${hospRows}${extraRows}
  </div>

  <div class="totals">
    <div class="note"><strong>Sobre los precios:</strong> Todos los importes están en <strong>pesos mexicanos (MXN)</strong>. Vigencia: <strong>${vigLabel}</strong>, hasta el <strong>${fmt(vigDate)}</strong>. Tarifas sujetas a disponibilidad al confirmar.</div>
    <div class="calc">
      <div class="line"><span>Subtotal tours</span><span class="num">$${toursTotal.toLocaleString("es-MX")}</span></div>
      ${pkgsTotal > 0 ? `<div class="line"><span>Subtotal hospedaje</span><span class="num">$${pkgsTotal.toLocaleString("es-MX")}</span></div>` : ""}
      ${extrasTotalQ > 0 ? `<div class="line"><span>Subtotal extras</span><span class="num">$${extrasTotalQ.toLocaleString("es-MX")}</span></div>` : ""}
      ${ajuste !== 0 ? `<div class="line"><span>Ajuste de precio</span><span class="num">${ajuste > 0 ? "+" : "−"}$${Math.abs(ajuste).toLocaleString("es-MX")}</span></div>` : ""}
      ${descuento > 0 ? `<div class="line sub-line"><span>Descuento aplicado</span><span class="num">−$${descuento.toLocaleString("es-MX")}</span></div>` : ""}
      <div class="line grand"><span class="k">Total</span><span class="v">$${q.totalAmount.toLocaleString("es-MX")}</span></div>
      <div class="line deposit"><span>Anticipo para reservar (${desglose.anticipoPct} %)</span><span class="num">$${anticipoNum.toLocaleString("es-MX")}</span></div>
      <div class="line"><span>Saldo al inicio del tour</span><span class="num">$${saldo.toLocaleString("es-MX")}</span></div>
    </div>
  </div>

  <div class="checks">
    <div><h4>Sí incluye</h4>
      <ul class="yes">
        <li>${trasladoLi}</li>${incluyeLis}
        ${extrasIncluidosQ.map(ex => `<li>${esc(ex.concepto)}${ex.detalle ? ` — ${esc(ex.detalle)}` : ""}</li>`).join("")}
      </ul>
    </div>
    <div><h4>No incluye</h4>
      <ul class="no">
        <li>Vuelos o transporte a Xilitla</li><li>Comidas y cenas</li>
        <li>Actividades opcionales</li><li>Propinas</li>
        <li>Bebidas alcohólicas</li><li>Gastos personales</li>
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
