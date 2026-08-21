import { TOURS_DB, INCLUYE_SIEMPRE, INCLUYE_SIEMPRE_EN, incluyeDeTour } from "./tours";
import { PAQUETES_DB } from "./paquetes";
import { getEmails, emailLocale } from "./i18n/emails";
import { localizeTour } from "./i18n/localize";
import { localizePaquete } from "./i18n/paquetes.en";
import type { Locale } from "./i18n/config";

/**
 * Lo que incluye ESE tour, tomado del catálogo.
 *
 * Los correos traían la lista escrita a mano: prometían "traslado redondo desde
 * tu hospedaje" y "desayuno con platillos típicos" a todo el mundo, así que
 * quien reservaba el rappel, el RZR o el buceo —que no llevan ninguna de las
 * dos— recibía por escrito algo que no iba a pasar. Y a diferencia de una
 * página, el correo se guarda y se reclama.
 */
function listaIncluidos(tourSlug: string, locale: Locale = "es"): string[] {
  const base = TOURS_DB.find((t) => t.slug === tourSlug);
  const tour = base ? localizeTour(base, locale) : undefined;
  return tour
    ? incluyeDeTour(tour, locale)
    : [...(locale === "en" ? INCLUYE_SIEMPRE_EN : INCLUYE_SIEMPRE)];
}

function incluidosDe(tourSlug: string, locale: Locale = "es"): string {
  return listaIncluidos(tourSlug, locale).map((x) => `✓ ${x}`).join("<br>");
}

/**
 * Lo que incluyen los recorridos de la reserva.
 *
 * Con uno solo, su lista completa. Con varios, la INTERSECCIÓN: prometer lo de
 * un tour para todos es exactamente el error que este archivo ya evitaba en la
 * cotización (el rappel no lleva desayuno; el buceo no lleva traslado).
 *
 * ⚠️ El bug que esto arregla: se leía `data.tourSlug`, y las reservas que
 * entran por el carrito lo guardan VACÍO, así que el correo caía al respaldo
 * genérico y el cliente recibía dos renglones ("seguro" y "fotos") en vez de
 * todo lo que pagó. Los recorridos de verdad viven en `lineItems`.
 */
function incluidosDeReserva(slugs: string[], locale: Locale = "es"): { html: string; varios: boolean } {
  const validos = slugs.filter((x) => x && TOURS_DB.some((t) => t.slug === x));
  if (validos.length === 0) return { html: incluidosDe("", locale), varios: false };
  if (validos.length === 1) return { html: incluidosDe(validos[0], locale), varios: false };

  const listas = validos.map((x) => listaIncluidos(x, locale));
  const comunes = listas[0].filter((x) => listas.every((l) => l.includes(x)));
  const items = comunes.length ? comunes : [...(locale === "en" ? INCLUYE_SIEMPRE_EN : INCLUYE_SIEMPRE)];
  return { html: items.map((x) => `✓ ${x}`).join("<br>"), varios: true };
}

// Plantilla HTML de confirmación de tour — adaptada del sistema de hotel Paraíso Encantado

export function buildTourEmailHtml(data: {
  customerName:      string;
  confirmationNumber: string;
  paymentIntentId?:  string;
  tourName:          string;
  tourDate:          string;
  tourSlug:          string;
  adults:            number;
  children:          number;
  totalAmount:       number;
  promoCode?:        string;
  promoDiscount?:    number;
  depositoPagado?:   number;
  metodoPago?:       string;
  pickupLugar?:      string;
  partySize?:        number;  // tamaño real del grupo; tiene prioridad para mostrar participantes
  lineItems?:        any[];   // [{tourName,tourDate,adults,childrenMid,childrenSmall,subtotal}, ...] (+ un objeto _meta)
  packageItems?:     any[];   // [{hotel,habitacion,noches,habitaciones,checkin,checkout,subtotal}, ...]
  /** Idioma en que el cliente reservó. Cae al español si no viene. */
  locale?:           string;
}): string {
  const locale = emailLocale(data.locale);
  const T = getEmails(locale).confirmacion;
  const base = "https://www.huasteca-potosina.com";
  // Mismo criterio que en la cotización: un paquete no vive en /tours.
  const pre = locale === "en" ? "/en" : "";
  /**
   * El nombre del recorrido en el idioma del correo. La reserva lo guarda en
   * ESPAÑOL, así que sin esto la confirmación en inglés titulaba el tour con su
   * nombre mexicano.
   */
  const nombreTour = (nombre: string, slug?: string) => {
    if (locale === "es") return nombre;
    const b = slug ? TOURS_DB.find((t) => t.slug === slug) : undefined;
    if (b) return localizeTour(b, locale).nombre;
    const paq = slug ? PAQUETES_DB.find((x) => x.slug === slug) : undefined;
    return paq ? localizePaquete(paq, locale).nombre : nombre;
  };
  // ⚠️ Las reservas que entran por el carrito guardan `tourName` como un
  // resumen ("1 recorridos") y `tourSlug` VACÍO. La verdad está en `lineItems`,
  // así que se lee de ahí primero y los campos de arriba quedan de respaldo.
  const lineasReserva = Array.isArray(data.lineItems)
    ? data.lineItems.filter((l: any) => l && !l._meta && (l.tourSlug || l.tourName))
    : [];
  const slugReal   = data.tourSlug || lineasReserva[0]?.tourSlug || "";
  const nombreReal = lineasReserva.length === 1
    ? (lineasReserva[0].tourName || data.tourName)
    : data.tourName;

  const tourTitulo = nombreTour(nombreReal, slugReal);
  const tourUrl = PAQUETES_DB.some((p) => p.slug === slugReal)
    ? `${base}${pre}/paquetes/${slugReal}`
    : `${base}${pre}/tours/${slugReal}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return T.porConfirmar;
    const d = new Date(dateStr + "T12:00:00");
    const f = d.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return f.charAt(0).toUpperCase() + f.slice(1);
  };

  const totalParticipants = data.adults + data.children;
  const participantsText  = `${T.adultos(data.adults)}${data.children > 0 ? ` · ${T.menores(data.children)}` : ""}`;
  const hasPromo = data.promoCode && (data.promoDiscount ?? 0) > 0;
  const deposito  = data.depositoPagado ?? 0;
  const pendiente = Math.max(0, data.totalAmount - deposito);
  const fmxEmail  = (n: number) => `$${Number(n).toLocaleString(locale === "en" ? "en-US" : "es-MX")} MXN`;
  const pickupText = data.pickupLugar || T.pickupDefault;

  // Tours de la reserva (excluye el objeto _meta). Si hay varios, se listan todos con su fecha.
  const tours = Array.isArray(data.lineItems) ? data.lineItems.filter((l: any) => l && !l._meta) : [];
  // Lo que incluyen los recorridos de ESTA reserva (intersección si son varios).
  const incluidosReserva = incluidosDeReserva(
    tours.length ? tours.map((l: any) => l.tourSlug).filter(Boolean) : [slugReal],
    locale,
  );
  const packages = Array.isArray(data.packageItems) ? data.packageItems.filter((p: any) => p && !p._meta) : [];
  const isMultiTour = tours.length > 1;
  const tourParts = (t: any) => (Number(t.adults) || 0) + (Number(t.childrenMid) || 0) + (Number(t.childrenSmall) || 0) + (Number(t.children) || 0);
  // Líneas por vehículo (ej. RZR): se muestra "N vehículo(s)" en vez de contar personas (adults=0).
  const lineDetail = (t: any) => {
    if (t.vehiculo) {
      const un = Math.max(1, Number(t.unidades) || 1);
      return `${formatDate(t.tourDate)} · ${T.vehiculos(un)}`;
    }
    // Desglose del grupo. Decir solo "4 personas" le escondía al equipo que
    // van menores: cambia el equipo de seguridad que hay que preparar, y hay
    // recorridos con edad mínima. El precio ya cobrado los distingue (70 % de 6
    // a 10, 50 % por debajo), así que el correo también debe.
    const mid   = Number(t.childrenMid) || 0;
    const small = Number(t.childrenSmall) || 0;
    const ad    = Number(t.adults) || 0;
    const otros = Number(t.children) || 0;
    const partes: string[] = [];
    if (ad)    partes.push(T.adultos(ad));
    if (mid)   partes.push(T.de6a10(mid));
    if (small) partes.push(T.menoresDe6(small));
    if (!mid && !small && otros) partes.push(T.menores(otros));
    const gente = partes.length
      ? partes.join(" · ")
      : (tourParts(t) === 1 ? T.unaPersona : T.personas(tourParts(t)));
    return `${formatDate(t.tourDate)} · ${gente}`;
  };

  /** El nombre de la actividad opcional en el idioma del correo. */
  const nombreAddOn = (a: any, slug?: string): string => {
    if (locale === "es") return a?.nombre || a?.id || "";
    const base = slug ? TOURS_DB.find((t) => t.slug === slug) : undefined;
    const loc  = base ? localizeTour(base, locale).addOns?.find((x) => x.id === a?.id) : undefined;
    return loc?.nombre || a?.nombre || a?.id || "";
  };

  /**
   * Lo que el cliente contrató ADEMÁS del recorrido: la actividad opcional y la
   * elección obligatoria.
   *
   * ⚠️ El add-on se cobra —va dentro del subtotal del renglón— pero este correo
   * no lo nombraba por ningún lado: el cliente veía un importe más alto que el
   * precio del tour sin explicación, y el equipo no se enteraba de que había
   * contratado una actividad que necesita guía de rescate. La elección
   * (Siete Cascadas o Tamasopo) tampoco se confirmaba nunca.
   */
  const lineExtras = (t: any): string => {
    const filas: string[] = [];
    for (const a of Array.isArray(t?.addOns) ? t.addOns : []) {
      const cant = Math.max(1, Number(a?.cantidad) || 1);
      const imp  = a?.subtotal != null ? ` · ${fmxEmail(Number(a.subtotal))}` : "";
      filas.push(`${T.addOnLinea(nombreAddOn(a, t.tourSlug), cant)}${imp}`);
    }
    if (t?.eleccion) filas.push(T.elegiste(String(t.eleccion)));
    if (!filas.length) return "";
    return `<p style="margin:6px 0 0 0;font-family:'DM Sans',Arial;font-size:12px;color:#3a6b1a;line-height:1.7;">${filas.join("<br>")}</p>`;
  };

  // Tamaño REAL del grupo (no sumar las personas de cada tour: es el mismo grupo).
  // Prioridad: el número que capturó el dueño (partySize) → si no, el máximo por tour → si no, el total.
  const perTourMax = tours.length ? Math.max(...tours.map(tourParts)) : 0;
  const grupo = (data.partySize && data.partySize > 0)
    ? data.partySize
    : (perTourMax > 0 ? perTourMax : totalParticipants);
  const grupoText = grupo === 1 ? T.unaPersona : T.personas(grupo);

  // Bloque "Detalles del tour": una fila por tour cuando hay varios; si no, el bloque clásico.
  const detallesHtml = isMultiTour ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr><td colspan="2" style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:16px 22px;">
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">${T.toursReservados(tours.length)}</p>
              <p style="margin:6px 0 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">${T.grupoDe(grupoText)}</p>
            </td></tr>
            ${tours.map((t: any, i: number) => `
            <tr>
              <td style="width:62%;border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:16px 22px;vertical-align:top;">
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;font-weight:400;">${nombreTour(t.tourName, t.tourSlug) || "Tour"}</p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#8a7a5a;">${lineDetail(t)}</p>
                ${lineExtras(t)}
              </td>
              <td style="width:38%;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:16px 22px;vertical-align:top;text-align:right;">
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">${t.subtotal != null ? fmxEmail(t.subtotal) : ""}</p>
              </td>
            </tr>`).join("")}
          </table>` : `
          <!-- DETALLES DEL TOUR -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr>
              <td colspan="2" style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:20px 22px;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  ${T.tourReservado}
                </p>
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#1a2e1a;font-weight:400;">
                  ${tourTitulo}
                </p>
              </td>
            </tr>
            <tr>
              <td class="split-left" style="width:50%;border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:20px 22px;vertical-align:top;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  ${T.fechaRecorrido}
                </p>
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;">
                  ${formatDate(data.tourDate)}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8a7a5a;">${T.pasamosPorTi}</p>
              </td>
              <td class="split-left" style="width:50%;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:20px 22px;vertical-align:top;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  ${T.participantes}
                </p>
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;">
                  ${grupoText}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8a7a5a;">${data.partySize && data.partySize > 0 ? T.reservaGrupo : participantsText}</p>
              </td>
            </tr>
            ${tours.length === 1 && lineExtras(tours[0]) ? `
            <tr>
              <td colspan="2" style="border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:14px 22px;">
                ${lineExtras(tours[0])}
              </td>
            </tr>` : ""}
          </table>`;

  // Bloque de hospedaje (si la reserva incluye paquete con noches de hotel).
  const lodgingHtml = packages.length ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr><td colspan="2" style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:16px 22px;">
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">${T.hospedajeIncluido}</p>
            </td></tr>
            ${packages.map((p: any) => {
              const noches = Number(p.noches) || 0;
              const habs   = Number(p.habitaciones) || 1;
              const fechas = (p.checkin || p.checkout) ? `${formatDate(p.checkin)} → ${formatDate(p.checkout)}` : "";
              return `
            <tr>
              <td style="width:62%;border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:16px 22px;vertical-align:top;">
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;font-weight:400;">${p.habitacion || (locale === "en" ? "Room" : "Habitación")}${p.hotel ? ` · ${p.hotel}` : ""}</p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#8a7a5a;">${T.noches(noches)}${habs > 1 ? T.habitaciones(habs) : ""}${fechas ? ` · ${fechas}` : ""}</p>
              </td>
              <td style="width:38%;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:16px 22px;vertical-align:top;text-align:right;">
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">${p.subtotal != null ? fmxEmail(p.subtotal) : ""}</p>
              </td>
            </tr>`;
            }).join("")}
          </table>` : "";

  return `<!DOCTYPE html>
<html lang="${locale === "en" ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${T.subject(data.confirmationNumber)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    * { margin:0; padding:0; }
    body { font-family:'DM Sans','Helvetica Neue',Arial,sans-serif; background-color:#edeae4; line-height:1.6; }
    table { border-collapse:collapse; }
    img { display:block; max-width:100%; height:auto; }
    a { color:#1a2e1a; text-decoration:none; }
    .wrapper { background-color:#edeae4; padding:20px 0; }
    .container { max-width:620px; margin:0 auto; background-color:#f4edd8; }
    @media only screen and (max-width:640px) {
      .wrapper { padding:0!important; }
      .container,.full-width { width:100%!important; max-width:100%!important; }
      .mobile-p { padding-left:24px!important; padding-right:24px!important; }
      .mobile-plg { padding:34px 24px!important; }
      .hero-title { font-size:32px!important; }
      .split-left { border-left:1px solid #d4ccbc!important; }
    }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- PRE-HEADER -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:14px 0;text-align:center;">
      <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6a7a5a;">
        ${T.preheader}
      </p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:0;">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0">

        <!-- HERO -->
        <tr><td class="mobile-plg" style="padding:36px 40px 40px 40px;background-color:#1a2e1a;">
          <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.65);">
            ${T.eyebrow}
          </p>
          <h1 class="hero-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:44px;font-style:italic;font-weight:300;color:#f4edd8;line-height:1.1;">
            ${T.h1a}<br>${T.h1b}
          </h1>
          <p style="margin:14px 0 0 0;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:rgba(244,237,216,0.75);line-height:1.7;">
            ${T.intro}
          </p>
        </td></tr>

        <!-- CARD PRINCIPAL -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:48px 48px;">

          <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#1a2e1a;line-height:1.2;">
            ${T.hola} <span style="font-style:italic;color:#c4882a;">${data.customerName}!</span>
          </p>
          <p style="margin:20px 0 30px 0;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:#3a3a2e;line-height:1.85;">
            ${T.lugarApartado}
          </p>

          <table role="presentation" width="48" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="height:1px;background-color:#c4882a;"></td></tr>
          </table>

          <!-- NÚMERO DE CONFIRMACIÓN -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr><td style="border:1px solid #c4882a;background-color:#fdf9f0;padding:26px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
                      ${T.numeroConfirmacion}
                    </p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:500;color:#1a2e1a;letter-spacing:1px;">
                      ${data.confirmationNumber}
                    </p>
                  </td>
                  <td style="vertical-align:middle;text-align:right;width:44px;">
                    <table role="presentation" width="44" height="44" cellspacing="0" cellpadding="0" border="0"
                      style="border:1.5px solid #c4882a;background-color:#3a6b1a;border-radius:50%;">
                      <tr><td align="center" style="vertical-align:middle;font-size:22px;color:#f4edd8;height:44px;">✓</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          ${detallesHtml}
          ${lodgingHtml}

          <!-- TOTAL -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a2e1a;margin:28px 0;">
            <tr><td class="mobile-p" style="padding:22px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4882a;">
                      ${T.totalDelTour}
                    </p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#f4edd8;">
                      ${fmxEmail(data.totalAmount)}
                    </p>
                  </td>
                </tr>
                ${hasPromo ? `
                <tr><td colspan="2" style="padding-top:10px;border-top:1px solid rgba(196,136,42,0.3);">
                  <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8fbe3a;">
                    ${T.codigoAplicado(String(data.promoCode), Number(data.promoDiscount))}
                  </p>
                </td></tr>` : ""}
                ${deposito > 0 ? `
                <tr><td colspan="2" style="padding-top:10px;border-top:1px solid rgba(196,136,42,0.3);">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td><p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:11px;color:rgba(244,237,216,0.65);">${T.anticipoPagado}</p></td>
                      <td style="text-align:right;"><p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:13px;color:#8fbe3a;">${fmxEmail(deposito)}</p></td>
                    </tr>
                    <tr>
                      <td><p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${pendiente > 0 ? "#f4a44a" : "#8fbe3a"};">${pendiente > 0 ? T.saldoPendiente : T.liquidado}</p></td>
                      <td style="text-align:right;"><p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:${pendiente > 0 ? "#f4a44a" : "#8fbe3a"};">${fmxEmail(pendiente)}</p></td>
                    </tr>
                  </table>
                </td></tr>
                ${data.metodoPago ? `
                <tr><td colspan="2" style="padding-top:10px;border-top:1px solid rgba(196,136,42,0.2);">
                  <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:rgba(244,237,216,0.5);">${T.metodoPago} <span style="color:rgba(244,237,216,0.8);">${data.metodoPago}</span></p>
                </td></tr>` : ""}` : ""}
              </table>
            </td></tr>
          </table>

          <!-- QUÉ INCLUYE -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid #c4882a;padding-left:20px;margin:28px 0;">
            <tr><td>
              <p style="margin:0 0 12px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
                ${incluidosReserva.varios ? T.todosIncluyen : T.todoIncluido}
              </p>
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:13px;color:#3a3a2e;line-height:1.9;">
                ${incluidosReserva.html}
              </p>
            </td></tr>
          </table>

        </td></tr>

        <!-- PRÓXIMOS PASOS -->
        <tr><td class="mobile-p" style="background-color:#e6dfc8;padding:36px 48px;">
          <p style="margin:0 0 8px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a;">
            ${T.proximosPasos}
          </p>
          <h2 style="margin:0 0 20px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-style:italic;font-weight:300;color:#1a2e1a;">
            ${T.antesDeTuRecorrido}
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  ${T.puntoSalida}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  ${pickupText}
                </p>
              </td>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-left:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  ${T.queLlevar}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  ${T.queLlevarTexto}
                </p>
              </td>
            </tr>
            <tr>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-top:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  ${T.confirmaWhatsapp}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  <a href="https://wa.me/524891251458" style="color:#3a6b1a;border-bottom:1px solid #3a6b1a;">+52 489 125 1458</a><br>
                  ${T.enviaTuNumero} <strong>${data.confirmationNumber}</strong>
                </p>
              </td>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  ${T.alSubir}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  ${T.presentaAlGuia}<br><strong>${data.confirmationNumber}</strong>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:40px 48px;text-align:center;border-top:1px solid #d4ccbc;">
          <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
            ${T.mientrasEsperas}
          </p>
          <h2 style="margin:0 0 22px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-style:italic;font-weight:300;color:#1a2e1a;">
            ${T.descubreMas}
          </h2>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr><td style="background-color:#3a6b1a;padding:14px 36px;">
              <a href="${base}${pre}/tours" style="font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#f4edd8;text-decoration:none;display:block;">
                ${T.verTodos}
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- CONTACTO -->
        <tr><td class="mobile-p" style="background-color:#f4edd8;padding:28px 48px;border-top:1px solid #d4ccbc;">
          <p style="margin:0 0 14px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
            ${T.preguntas}
          </p>
          <p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:13px;color:#1a2e1a;">
            📱 <a href="https://wa.me/524891251458" style="color:#3a6b1a;border-bottom:1px solid #3a6b1a;">WhatsApp: +52 489 125 1458</a>
          </p>
          <p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:13px;color:#1a2e1a;">
            📧 <a href="mailto:hola@huasteca-potosina.com" style="color:#1a2e1a;border-bottom:1px solid #d4ccbc;">hola@huasteca-potosina.com</a>
          </p>
          <p style="margin:12px 0 0 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a;">
            ${T.idPago(data.paymentIntentId || "N/A")}
          </p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td class="mobile-plg" style="background-color:#e6dfc8;padding:36px 48px;text-align:center;">
          <p style="margin:0 0 8px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a;">
            Tours Huasteca Potosina
          </p>
          <p style="margin:0 0 14px 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a;line-height:1.6;">
            ${T.ubicacion}<br>
            ${T.guiasCert}
          </p>
          <p style="margin:14px 0 0 0;font-family:'DM Sans',Arial;font-size:10px;color:#b8a890;">
            ${T.derechos(new Date().getFullYear())}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}

// ── Plantilla de COTIZACIÓN (diferente a confirmación de reserva) ────────────

export function buildTourQuoteEmailHtml(data: {
  customerName:  string;
  quoteNumber:   string;
  tourName:      string;
  tourDate:      string;
  tourSlug:      string;
  adults:        number;
  children:      number;  // total (childrenMid + childrenSmall)
  totalAmount:   number;
  notes?:        string;
  partySize?:    number;  // tamaño real del grupo (evita sumar las personas de cada tour)
  lineItems?:    { tourName: string; tourSlug?: string; tourDate: string; adults: number; children?: number; childrenMid?: number; childrenSmall?: number; subtotal: number; vehiculo?: string; unidades?: number }[];
  // Hospedaje cotizado. Antes no llegaba al correo aunque la cotización del
  // sistema sí lo incluye → el cliente no veía el hotel/noches ni su subtotal.
  packageItems?: { hotel?: string; habitacion?: string; noches?: number; habitaciones?: number; checkin?: string; checkout?: string; subtotal?: number; _meta?: unknown }[];
  /** Idioma del cliente. Cae al español si no viene. */
  locale?:       string;
}): string {
  const locale = emailLocale(data.locale);
  const T = getEmails(locale).cotizacion;
  const C = getEmails(locale).confirmacion;
  const base     = "https://www.huasteca-potosina.com";
  const pre      = locale === "en" ? "/en" : "";
  const waUrl    = "https://wa.me/524891251458";
  /**
   * A dónde lleva el botón "Reservar y pagar en línea".
   *
   * ⚠️ Antes era SIEMPRE `/tours/<slug>`. En una cotización de PAQUETE el slug
   * es "completo" o "gran-huasteca", que no son tours: el botón daba 404. Es
   * exactamente lo que le pasó a Marco Torres el 12 ago 2026 —"la página me
   * marca error"— y obligó a cerrar la venta a mano por WhatsApp.
   */
  const esPaquete = PAQUETES_DB.some((p) => p.slug === data.tourSlug);
  const tourUrl  = esPaquete
    ? `${base}${pre}/reservar-paquete/${data.tourSlug}`
    : `${base}${pre}/reservar/carrito?agregar=${data.tourSlug}`;

  const formatDate = (d: string) => {
    if (!d) return C.porConfirmar;
    const r = new Date(d + "T12:00:00").toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  const fmx = (n: number) => `$${Number(n).toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;
  // Lo que incluyen los recorridos de la cotización. Antes se leía solo
  // `data.tourSlug` (el primero) y SIN idioma: una cotización de tres tours
  // prometía lo del primero para todos, y la versión en inglés lo listaba en
  // español.
  const slugsCotiza = (data.lineItems ?? []).map((l) => l.tourSlug).filter(Boolean) as string[];
  const incluidosCotizacion = incluidosDeReserva(
    slugsCotiza.length ? slugsCotiza : [data.tourSlug],
    locale,
  );

  /** El nombre del recorrido en el idioma del correo (se guarda en español). */
  const nombreQ = (nombre: string, slug?: string) => {
    if (locale === "es") return nombre;
    const b = slug ? TOURS_DB.find((t) => t.slug === slug) : undefined;
    if (b) return localizeTour(b, locale).nombre;
    const pq = slug ? PAQUETES_DB.find((x) => x.slug === slug) : undefined;
    return pq ? localizePaquete(pq, locale).nombre : nombre;
  };

  const totalParticipants = data.adults + data.children;
  const participantsText  = `${C.adultos(data.adults)}${data.children > 0 ? ` · ${C.menores(data.children)}` : ""}`;

  // Tabla de items si hay paquete multi-tour
  const itemsRows = (data.lineItems && data.lineItems.length > 1)
    ? data.lineItems.map(it => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e4ddd3;">
      <tr>
        <td style="padding:14px 0;vertical-align:top;width:65%">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a2e1a;margin:0 0 3px 0">${it.tourName}</p>
          <p style="font-size:12px;color:#8a7a5a;font-family:Arial;margin:0">${it.vehiculo ? `${formatDate(it.tourDate)} · ${C.vehiculos(Math.max(1, Number(it.unidades) || 1))}` : `${formatDate(it.tourDate)} · ${C.adultos(it.adults)}${(it.childrenMid ?? 0) > 0 ? ` · ${T.ninos(it.childrenMid!)} (6-10)` : ""}${(it.childrenSmall ?? 0) > 0 ? ` · ${T.ninos(it.childrenSmall!)} (<6)` : ""}${(it.children ?? 0) > 0 && !it.childrenMid && !it.childrenSmall ? ` · ${T.ninos(it.children!)}` : ""}`}</p>
        </td>
        <td style="padding:14px 0 14px 16px;text-align:right;vertical-align:top;white-space:nowrap">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500;color:#1a2e1a;margin:0">${fmx(it.subtotal)}</p>
        </td>
      </tr>
    </table>`).join("")
    : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e4ddd3;">
      <tr>
        <td style="padding:14px 0;vertical-align:top">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;font-weight:400;color:#1a2e1a;margin:0 0 3px 0">${data.tourName}</p>
          <p style="font-size:12px;color:#8a7a5a;font-family:Arial;margin:0">${formatDate(data.tourDate)} · ${participantsText}</p>
        </td>
        <td style="padding:14px 0 14px 16px;text-align:right;vertical-align:top;white-space:nowrap">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500;color:#1a2e1a;margin:0">${fmx(data.totalAmount)}</p>
        </td>
      </tr>
    </table>`;

  // Bloque de hospedaje (si la cotización incluye paquete con noches de hotel).
  // El _meta viaja dentro de packageItems, se excluye.
  const packages = Array.isArray(data.packageItems) ? data.packageItems.filter((p) => p && !p._meta) : [];
  const lodgingHtml = packages.length ? `
          <!-- HOSPEDAJE COTIZADO -->
          <p style="margin:28px 0 16px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3.5px;text-transform:uppercase;color:#8a7a5a">${T.hospedajeIncluido}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #c4882a;background-color:#fdf9f0;">
            <tr><td colspan="2" style="border-bottom:1px solid #e4ddd3;padding:14px 22px;">
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">${T.nochesHotel}</p>
            </td></tr>
            ${packages.map((p) => {
              const noches = Number(p.noches) || 0;
              const habs   = Number(p.habitaciones) || 1;
              const fechas = (p.checkin || p.checkout) ? `${formatDate(p.checkin || "")} → ${formatDate(p.checkout || "")}` : "";
              return `
            <tr>
              <td style="width:62%;padding:16px 22px;vertical-align:top;">
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;font-weight:400;">${p.habitacion || T.hospedajeTitulo}${p.hotel ? ` · ${p.hotel}` : ""}</p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#8a7a5a;">${C.noches(noches)}${habs > 1 ? C.habitaciones(habs) : ""}${fechas ? ` · ${fechas}` : ""}</p>
              </td>
              <td style="width:38%;padding:16px 22px;vertical-align:top;text-align:right;white-space:nowrap;">
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">${p.subtotal != null ? fmx(p.subtotal) : ""}</p>
              </td>
            </tr>`;
            }).join("")}
          </table>` : "";

  return `<!DOCTYPE html>
<html lang="${locale === "en" ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${T.tituloTab(data.quoteNumber)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    * { margin:0; padding:0; }
    body { font-family:'DM Sans','Helvetica Neue',Arial,sans-serif; background-color:#edeae4; line-height:1.6; }
    table { border-collapse:collapse; }
    a { color:#1a2e1a; text-decoration:none; }
    .wrapper { background-color:#edeae4; padding:20px 0; }
    .container { max-width:620px; margin:0 auto; background-color:#f4edd8; }
    @media only screen and (max-width:640px) {
      .wrapper { padding:0!important; }
      .container,.full-width { width:100%!important; max-width:100%!important; }
      .mobile-p { padding-left:24px!important; padding-right:24px!important; }
      .mobile-plg { padding:34px 24px!important; }
    }
  </style>
</head>
<body>
<div class="wrapper">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:14px 0;text-align:center">
      <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6a7a5a">${C.preheader}</p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0">

        <!-- HERO -->
        <tr><td class="mobile-plg" style="padding:36px 40px 40px;background-color:#1a2e1a">
          <p style="margin:0 0 10px;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.55)">${T.eyebrow}</p>
          <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:42px;font-style:italic;font-weight:300;color:#f4edd8;line-height:1.1">${T.h1a}<br>${T.h1b}</h1>
          <p style="margin:14px 0 0;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:rgba(244,237,216,0.75);line-height:1.7">${T.preview(data.customerName)}</p>
        </td></tr>

        <!-- CARD PRINCIPAL -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:44px 48px">

          <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#1a2e1a;line-height:1.2">
            ${T.hola} <span style="font-style:italic;color:#c4882a">${data.customerName}</span>
          </p>
          <p style="margin:18px 0 28px;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:#3a3a2e;line-height:1.85">
            ${T.intro1} <strong>${T.validez}</strong>${T.intro2}
          </p>

          <table role="presentation" width="48" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="height:1px;background-color:#c4882a"></td></tr>
          </table>

          <!-- NÚMERO DE COTIZACIÓN -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0">
            <tr><td style="border:1px solid #c4882a;background-color:#fdf9f0;padding:22px 28px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a">${T.numeroCotizacion}</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#1a2e1a;letter-spacing:1px">${data.quoteNumber}</p>
                    <p style="margin:6px 0 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a">${T.validaHoy}</p>
                  </td>
                  <td style="vertical-align:middle;text-align:right;width:48px">
                    <table role="presentation" width="44" height="44" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid #c4882a;background-color:#f4edd8;border-radius:50%">
                      <tr><td align="center" style="font-family:'DM Sans',Arial;font-size:20px;color:#c4882a;height:44px">📋</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- TOURS COTIZADOS -->
          <p style="margin:28px 0 16px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3.5px;text-transform:uppercase;color:#8a7a5a">${T.toursCotizados}</p>
          ${data.partySize && data.partySize > 0 && data.lineItems && data.lineItems.length > 1 ? `
          <p style="margin:-8px 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">${T.grupoDe(Number(data.partySize))}</p>` : ""}
          ${itemsRows}
          ${lodgingHtml}

          <!-- TOTAL -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a2e1a;margin:24px 0">
            <tr><td class="mobile-p" style="padding:22px 28px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td><p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">${T.totalCotizado}</p></td>
                  <td style="text-align:right">
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#f4edd8">${fmx(data.totalAmount)}<span style="font-size:13px;color:#c4882a"> MXN</span></p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- QUÉ INCLUYE -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid #c4882a;padding-left:18px;margin:24px 0">
            <tr><td>
              <p style="margin:0 0 10px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a">${T.todoIncluido}</p>
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:13px;color:#3a3a2e;line-height:2">
                ${incluidosCotizacion.html}
              </p>
            </td></tr>
          </table>

          ${data.notes ? `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ede8dc;padding:16px 18px;margin:18px 0">
            <tr><td>
              <p style="margin:0 0 4px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">${T.notas}</p>
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:13px;color:#3a3a2e;line-height:1.7">${data.notes}</p>
            </td></tr>
          </table>` : ""}

        </td></tr>

        <!-- PRÓXIMOS PASOS -->
        <tr><td class="mobile-p" style="background-color:#e6dfc8;padding:36px 48px">
          <p style="margin:0 0 8px;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a">${T.comoConfirmar}</p>
          <h2 style="margin:0 0 20px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-style:italic;font-weight:300;color:#1a2e1a">${T.soloDinos}</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;background-color:#f4edd8">
                <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a">${T.whatsappDirecto}</p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5">${T.escribenosFolio} <strong>${data.quoteNumber}</strong></p>
              </td>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-left:none;background-color:#f4edd8">
                <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a">${T.reservarEnLinea}</p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5">${T.pagaConTarjeta}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTAs -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:36px 48px;text-align:center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto">
            <tr>
              <td style="background-color:#25D366;padding:14px 28px;margin-right:8px">
                <a href="${waUrl}?text=Hola%2C+confirmo+cotizaci%C3%B3n+${data.quoteNumber}" style="font-family:'DM Sans',Arial;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;display:block">${T.btnWhatsapp}</a>
              </td>
            </tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0">
            <tr>
              <td style="background-color:#3a6b1a;padding:14px 28px">
                <a href="${tourUrl}" style="font-family:'DM Sans',Arial;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f4edd8;text-decoration:none;display:block">${T.btnReservar}</a>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a">${T.vence}</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td class="mobile-plg" style="background-color:#e6dfc8;padding:32px 48px;text-align:center">
          <p style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a">Tours Huasteca Potosina</p>
          <p style="margin:0 0 14px;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a;line-height:1.6">
            ${C.ubicacion}<br>
            ${C.guiasCert}
          </p>
          <p style="margin:12px 0 0;font-family:'DM Sans',Arial;font-size:10px;color:#b8a890">${C.derechos(new Date().getFullYear())}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}

/**
 * Correo del PAQUETE A MEDIDA que arma el bot de WhatsApp.
 *
 * Se separa de `buildTourQuoteEmailHtml` por dos razones que cambian el
 * mensaje, no solo el diseño:
 *  1. Lleva el ANTICIPO. La plantilla de cotización solo mostraba "Total
 *     Cotizado", así que le pedía al cliente el 100 % de golpe mientras el
 *     sitio le pide el 30 %. Era la petición de dinero con más fricción.
 *  2. El hospedaje es OPCIONAL y se dice explícitamente: los tours pasan por
 *     el cliente a su hospedaje en Xilitla o en Ciudad Valles, sea nuestro o no.
 */
export function buildPaquetePersonalizadoEmailHtml(data: {
  customerName: string;
  folio:        string;
  lineItems:    { tourName: string; tourDate: string; adults: number; childrenMid?: number; childrenSmall?: number; subtotal: number; incluye?: string[] }[];
  total:        number;
  anticipo:     number;
  pctAnticipo:  number;
  hospedajeInteresado?: boolean;
  /** Hospedaje dentro del MISMO folio. `tarifaPendiente` = el equipo pasa la tarifa. */
  hospedaje?: {
    hotel?: string; habitacion?: string | null; noches?: number | null;
    habitaciones?: number; checkin?: string | null; checkout?: string | null;
    subtotal?: number | null; tarifaPendiente?: boolean;
    nochesGratis?: number; ahorro?: number;
  };
  notes?:       string;
}): string {
  const base  = "https://www.huasteca-potosina.com";
  const waUrl = "https://wa.me/524891251458";

  const fmx = (n: number) => `$${Number(n).toLocaleString("es-MX")}`;
  const formatDate = (d: string) => {
    if (!d) return "Por confirmar";
    const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  const personasTexto = (it: { adults: number; childrenMid?: number; childrenSmall?: number }) =>
    [`${it.adults} adulto${it.adults !== 1 ? "s" : ""}`,
     (it.childrenMid ?? 0) > 0 ? `${it.childrenMid} niño${it.childrenMid !== 1 ? "s" : ""} (6–10)` : "",
     (it.childrenSmall ?? 0) > 0 ? `${it.childrenSmall} menor${it.childrenSmall !== 1 ? "es" : ""} de 6` : ""]
      .filter(Boolean).join(" · ");

  const dias = data.lineItems.map((it, i) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e4ddd3">
      <tr>
        <td style="padding:16px 0;vertical-align:top;width:64%">
          <p style="margin:0 0 4px 0;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Día ${i + 1}</p>
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:400;color:#1a2e1a;margin:0 0 3px 0">${it.tourName}</p>
          <p style="font-size:12px;color:#8a7a5a;font-family:Arial;margin:0">${formatDate(it.tourDate)} · ${personasTexto(it)}</p>
        </td>
        <td style="padding:16px 0 16px 16px;text-align:right;vertical-align:top;white-space:nowrap">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500;color:#1a2e1a;margin:0">${fmx(it.subtotal)}</p>
        </td>
      </tr>
    </table>`).join("");

  // Lo que incluyen TODOS los recorridos: intersección de sus `incluye`
  // reales. Si un tour no lo trae, no se promete en el correo.
  const listasInc = data.lineItems.map((l) => l.incluye ?? []);
  const comunes = listasInc.length && listasInc[0].length
    ? listasInc[0].filter((x) => listasInc.every((l) => l.includes(x)))
    : [];
  const bloqueIncluye = comunes.length
    ? `<tr><td style="padding:22px 32px 0 32px">
         <p style="margin:0 0 8px 0;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">Todos los recorridos incluyen</p>
         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
           ${comunes.map((c) => `<tr><td style="padding:3px 0;font-family:Arial;font-size:13px;line-height:1.6;color:#4a4a3a">· ${c}</td></tr>`).join("")}
         </table>
       </td></tr>`
    : "";

  const h = data.hospedaje;
  const filaHospedaje = h
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #e4ddd3">
      <tr>
        <td style="padding:16px 0;vertical-align:top;width:64%">
          <p style="margin:0 0 4px 0;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Hospedaje</p>
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:400;color:#1a2e1a;margin:0 0 3px 0">${h.hotel ?? "Hotel Paraíso Encantado"}${h.habitacion ? ` · ${h.habitacion}` : ""}</p>
          <p style="font-size:12px;color:#8a7a5a;font-family:Arial;margin:0">${h.noches ? `${h.noches} noche${h.noches !== 1 ? "s" : ""}` : "Fechas por confirmar"}${h.checkin ? ` · llegada ${formatDate(h.checkin)}` : ""}${(h.habitaciones ?? 1) > 1 ? ` · ${h.habitaciones} habitaciones` : ""}</p>
          ${(h.nochesGratis ?? 0) > 0 ? `<p style="font-size:12px;color:#5a9e2a;font-family:Arial;margin:4px 0 0 0">🎁 ${h.nochesGratis} noche${h.nochesGratis !== 1 ? "s" : ""} de regalo — te ahorras ${fmx(Number(h.ahorro ?? 0))}</p>` : ""}
        </td>
        <td style="padding:16px 0 16px 16px;text-align:right;vertical-align:top;white-space:nowrap">
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:500;color:#1a2e1a;margin:0">${h.tarifaPendiente ? "Por confirmar" : fmx(Number(h.subtotal ?? 0))}</p>
        </td>
      </tr>
    </table>`
    : "";

  const bloqueHospedaje = h
    ? (h.tarifaPendiente
        ? `<p style="font-family:Arial;font-size:13px;line-height:1.7;color:#4a4a3a;margin:0 0 6px 0">
             Tu habitación queda apartada en este mismo folio. La <strong>tarifa del hospedaje te la confirmamos hoy mismo</strong>
             por WhatsApp y todavía no está sumada en el total de arriba.
           </p>`
        : `<p style="font-family:Arial;font-size:13px;line-height:1.7;color:#4a4a3a;margin:0 0 6px 0">
             Tu hospedaje va incluido en este folio y en el total de arriba.
           </p>`)
    : (data.hospedajeInteresado
        ? `<p style="font-family:Arial;font-size:13px;line-height:1.7;color:#4a4a3a;margin:0 0 6px 0">
             Nos pediste opciones de hospedaje: te las mandamos por WhatsApp con disponibilidad y tarifas del
             <strong>Hotel Paraíso Encantado</strong>, en Xilitla.
           </p>`
        : "");

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4edd8">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4edd8;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff">

        <tr><td style="background:#1a2e1a;padding:30px 32px">
          <p style="margin:0;font-family:Arial;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#8fbe3a">Tours Huasteca Potosina</p>
          <p style="margin:8px 0 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#f4edd8">Tu viaje, armado a tu medida</p>
          <p style="margin:6px 0 0 0;font-family:Arial;font-size:12px;color:#f4edd8;opacity:.6">Folio ${data.folio}</p>
        </td></tr>

        <tr><td style="padding:28px 32px 0 32px">
          <p style="font-family:Arial;font-size:14px;line-height:1.7;color:#4a4a3a;margin:0">
            Hola ${data.customerName}, esto es lo que armamos contigo. Nada de esto está apartado todavía
            — cuando nos digas que sí, apartamos con el ${data.pctAnticipo} %.
          </p>
        </td></tr>

        <tr><td style="padding:22px 32px 0 32px">
          <p style="margin:0 0 4px 0;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">Tu itinerario</p>
          ${dias}${filaHospedaje}
        </td></tr>

        ${bloqueIncluye}

        <tr><td style="padding:24px 32px 0 32px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1a2e1a;padding:20px 22px">
            <tr>
              <td><p style="margin:0;font-family:Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">Apartas hoy con</p></td>
              <td style="text-align:right">
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#f4edd8">${fmx(data.anticipo)}<span style="font-size:13px;color:#c4882a"> MXN</span></p>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:10px;border-top:1px solid rgba(244,237,216,.15)">
                <p style="margin:8px 0 0 0;font-family:Arial;font-size:12px;color:#f4edd8;opacity:.75">
                  Total del viaje ${fmx(data.total)} · el resto (${fmx(data.total - data.anticipo)}) se liquida el día del primer recorrido.
                </p>
              </td>
            </tr>
          </table>
          <p style="font-family:Arial;font-size:12px;color:#6a6a55;margin:10px 0 0 0">
            Cancelas gratis hasta 48 h antes, con reembolso completo del anticipo.
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px 0 32px">
          <p style="margin:0 0 8px 0;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">Dónde te recogemos</p>
          <p style="font-family:Arial;font-size:13px;line-height:1.7;color:#4a4a3a;margin:0 0 10px 0">
            Pasamos por ti a tu hospedaje, <strong>en Xilitla o en Ciudad Valles</strong>. No necesitas hospedarte
            con nosotros: donde te quedes, ahí te recogemos.
          </p>
          ${bloqueHospedaje}
        </td></tr>

        ${data.notes ? `<tr><td style="padding:18px 32px 0 32px">
          <p style="margin:0 0 6px 0;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c4882a">Notas</p>
          <p style="font-family:Arial;font-size:13px;line-height:1.7;color:#4a4a3a;margin:0">${data.notes}</p>
        </td></tr>` : ""}

        <tr><td style="padding:26px 32px 30px 32px" align="center">
          <a href="${waUrl}" style="display:inline-block;background:#5a9e2a;color:#ffffff;text-decoration:none;font-family:Arial;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 34px">Apartar por WhatsApp</a>
          <p style="font-family:Arial;font-size:11px;color:#8a7a5a;margin:14px 0 0 0">
            ¿Dudas? Responde este correo o escríbenos al +52 489 125 1458.
          </p>
        </td></tr>

        <tr><td style="background:#f4edd8;padding:18px 32px;text-align:center">
          <p style="font-family:Arial;font-size:11px;color:#8a7a5a;margin:0">
            <a href="${base}" style="color:#8a7a5a;text-decoration:none">huasteca-potosina.com</a> · Xilitla, San Luis Potosí
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
