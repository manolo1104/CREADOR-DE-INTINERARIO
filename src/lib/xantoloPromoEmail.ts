/**
 * El correo de la promo de la Noche de Xantolo (31 oct y 1 nov).
 *
 * Lo recibe quien pide la guía en el popup de Xantolo, mientras haya noche a la
 * venta con lugares (pedido de Manolo, 2 oct 2026: «ese correo se lo tienes que
 * mandar a cada persona que se registre en el popup»). A los que se registraron
 * antes de ese día se les mandó una vez, a mano.
 *
 * 🔴 10 oct 2026: antes este correo vendía el PAQUETE CON HOTEL del 1 de
 * noviembre. El hotel se llenó, el paquete se retiró del sitio (`retirado` en
 * `paquetes.ts`) y el correo pasó a vender lo que sí se puede comprar: la noche
 * con guía, y el día completo con la Ruta Surrealista como extra. Nada de
 * hospedaje: eso se resuelve por WhatsApp.
 *
 * Diseño: el del bloque del paquete en el artículo (`CtaXantolo.tsx`), no la
 * piel crema de `shellCorreo`: morado, cempasúchil y los iconos de temporada
 * de fondo. Los correos no pintan SVG, así que el patrón y los iconos son PNG
 * en `public/imagenes/correo/xantolo-2026/`; el patrón sale del mismo
 * `PatronXantolo` con su semilla. Las reglas de correo de siempre: tablas,
 * estilos en línea, `bgcolor` también en el atributo, modo oscuro declarado
 * (como la piel del curso), fuentes con respaldo y ningún texto dentro de una
 * imagen.
 */
import { BASE, WA } from "./emailLayout";
import { linkBaja } from "./baja";
import { NOCHE_XANTOLO } from "./nocheXantolo";

/**
 * La paleta del bloque del artículo. Los tonos «crema al N %» van ya mezclados
 * con el fondo que tienen detrás: `rgba()` en `color` se cae en Outlook y la
 * letra quedaría negra sobre morado.
 */
const X = {
  noche:      "#140a18", // fondo del correo (el morado oscuro de la landing)
  morado:     "#2a1231", // el bloque
  borde:      "#5c332d", // cempasúchil al 25 % sobre el morado: el borde del bloque
  cempa:      "#f29422",
  textoBoton: "#1a0c1f",
  crema:      "#f4edd8",
  cremaM80:   "#ccc1b7", // crema al 80 % sobre morado
  cremaM85:   "#d6ccbf", // crema al 85 % sobre morado
  cremaN80:   "#c7c0b2", // crema al 80 % sobre noche
  cremaN70:   "#b1a99e", // crema al 70 % sobre noche
  cremaN55:   "#8f8782", // crema al 55 % sobre noche (5.2:1)
  linea:      "#2e1a33", // filete entre los pasos del domingo
  whatsapp:   "#25D366",
} as const;

// Las mismas pilas de `emailLayout`: Outlook de escritorio no baja fuentes web.
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS  = "'DM Sans','Helvetica Neue',Arial,sans-serif";
/** Cifras «lining»: con las antiguas de Cormorant el «1» se lee «ı». */
const LINING = "font-variant-numeric:lining-nums;font-feature-settings:'lnum' 1;";

const mxn = (n: number) => `$${n.toLocaleString("es-MX")}`;

export function buildXantoloPromoEmail(
  email?: string,
  appUrl: string = BASE,
): { subject: string; html: string; text: string } {
  const tour     = NOCHE_XANTOLO.tourOpcional;
  /** Por persona: la noche sola y el día completo. */
  const precio   = NOCHE_XANTOLO.precioAdulto;
  const diaTotal = precio + tour.precioPorPersona;
  const anticipo = Math.round(precio * 0.3); // el 30 % que pide la landing
  const lugares  = NOCHE_XANTOLO.noches[0].cupo;
  const noche    = mxn(precio);
  const pagina   = `${appUrl}${NOCHE_XANTOLO.pagina}?utm_source=correo&utm_medium=email&utm_campaign=xantolo-2026`;
  const whatsapp = `https://wa.me/${WA}?text=${encodeURIComponent("Hola, me interesa la Noche de Xantolo en Xilitla.")}`;
  const piezas   = `${appUrl}/imagenes/correo/xantolo-2026`;
  const patron   = `${piezas}/patron-v1.png`;

  const subject   = "Xantolo en Xilitla: la noche con guía, el 31 de octubre o el 1 de noviembre";
  const preheader = `Degustación de temporada y las comparsas con un guía del pueblo, desde ${noche} por persona.`;

  /** Un bloque morado con los iconos de temporada de fondo, como el del artículo. */
  const bloque = (contenido: string, relleno = "36px 36px 34px 36px") => `
        <tr><td bgcolor="${X.morado}" background="${patron}" style="background-color:${X.morado};background-image:url('${patron}');background-repeat:repeat;background-size:600px 600px;background-position:center top;border:1px solid ${X.borde};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td class="pad" style="padding:${relleno};">${contenido}</td></tr>
          </table>
        </td></tr>`;

  const eyebrow = (texto: string) =>
    `<p style="margin:0;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:${X.cempa};">${texto}</p>`;

  // Los dos botones en `inline-block`: lado a lado si caben, uno bajo el otro
  // en el celular, sin depender de media queries que Gmail a veces ignora.
  const botones = (principal: string) => `
            <div style="font-size:0;line-height:0;margin:24px 0 0 0;">
              <div style="display:inline-block;vertical-align:top;margin:0 10px 10px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td bgcolor="${X.cempa}" style="background-color:${X.cempa};">
                    <a href="${pagina}" style="display:inline-block;padding:15px 24px;font-family:${SANS};font-size:12px;font-weight:500;line-height:1;letter-spacing:1.5px;text-transform:uppercase;color:${X.textoBoton};text-decoration:none;">${principal}&nbsp;&rarr;</a>
                  </td>
                </tr></table>
              </div>
              <div style="display:inline-block;vertical-align:top;margin:0 0 10px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td style="border:1px solid ${X.whatsapp};">
                    <a href="${whatsapp}" style="display:inline-block;padding:14px 22px;font-family:${SANS};font-size:12px;font-weight:500;line-height:1;letter-spacing:1.5px;text-transform:uppercase;color:${X.whatsapp};text-decoration:none;"><img src="${piezas}/icono-whatsapp-v1.png" width="14" height="14" alt="" style="display:inline-block;width:14px;height:14px;border:0;vertical-align:-2px;margin:0 8px 0 0;">Armar otro plan</a>
                  </td>
                </tr></table>
              </div>
            </div>`;

  const renglon = (icono: string, texto: string) => `
              <tr>
                <td valign="top" style="width:16px;padding:3px 12px 11px 0;"><img src="${piezas}/${icono}-v1.png" width="16" height="16" alt="" style="display:block;width:16px;height:16px;border:0;"></td>
                <td style="padding:0 0 11px 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.5;color:${X.cremaM80};">${texto}</td>
              </tr>`;

  const paso = (etiqueta: string, titulo: string, texto: string, primero = false) => `
              <tr><td style="padding:${primero ? "0" : "20px"} 0 20px 0;${primero ? "" : `border-top:1px solid ${X.linea};`}">
                ${eyebrow(etiqueta)}
                <p style="margin:8px 0 0 0;font-family:${SERIF};font-size:24px;font-weight:400;line-height:1.2;color:${X.crema};${LINING}">${titulo}</p>
                <p style="margin:8px 0 0 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.65;color:${X.cremaN80};">${texto}</p>
              </td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Xantolo en Xilitla</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; }
  table { border-collapse:collapse; }
  @media only screen and (max-width:620px) {
    .pad { padding-left:22px!important; padding-right:22px!important; }
    .titulo { font-size:31px!important; }
  }
</style>
</head>
<body bgcolor="${X.noche}" style="margin:0;padding:0;background-color:${X.noche};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${X.noche};">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${X.noche}" style="background-color:${X.noche};">
  <tr><td align="center" bgcolor="${X.noche}" style="padding:26px 10px 36px 10px;background-color:${X.noche};">
    <!--[if mso]><table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;">

        <tr><td style="padding:0 0 18px 0;text-align:center;font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${X.cremaN55};">Tours Huasteca Potosina</td></tr>
${bloque(`
            ${eyebrow("✦ Xantolo · 31 de octubre o 1 de noviembre")}
            <h1 class="titulo" style="margin:14px 0 0 0;font-family:${SERIF};font-size:36px;font-weight:300;line-height:1.12;color:${X.crema};${LINING}">Las comparsas son gratis.<br><span style="color:${X.cempa};">Te&nbsp;llevamos con&nbsp;un guía del&nbsp;pueblo.</span></h1>
            <p style="margin:18px 0 0 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.65;color:${X.cremaM80};">Pediste nuestra guía de Xantolo. Si quieres vivirlo sin andar buscando dónde es ni a qué hora, nosotros te llevamos:</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0 0;">
${renglon("icono-luna", `Las comparsas y los shows más representativos, en el centro de Xilitla, con un guía del pueblo`)}
${renglon("icono-sol", `Degustación de temporada: ${NOCHE_XANTOLO.degustacion}`)}
${renglon("icono-cama", `Transporte ida y vuelta, ${NOCHE_XANTOLO.horario}. Si todavía no tienes hospedaje, nos vemos en el centro`)}
            </table>
            <p style="margin:10px 0 0 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.6;color:${X.cremaM85};${LINING}"><strong style="font-weight:500;color:${X.crema};">${noche}</strong> por persona <span style="color:${X.cempa};">· ${lugares}&nbsp;lugares cada noche</span></p>
            <p style="margin:10px 0 0 0;font-family:${SANS};font-size:13px;font-weight:300;line-height:1.6;color:${X.cremaM80};${LINING}">¿Vienes a pasar el día? Agrega <a href="${pagina}" style="color:${X.cempa};text-decoration:underline;">${tour.nombreLargo}</a> ese mismo día: ${mxn(diaTotal)} por persona, con la noche incluida.</p>
${botones("Ver las noches")}`)}

        <tr><td style="padding:0;font-size:0;line-height:0;"><img src="${appUrl}/imagenes/paquetes/xantolo-2026/comparsa-noche.jpg" width="600" alt="Comparsa de Xantolo de noche, con máscaras y música" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>

        <tr><td class="pad" bgcolor="${X.noche}" style="padding:36px 36px 14px 36px;background-color:${X.noche};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="padding:0 0 24px 0;"><p style="margin:0;font-family:${SERIF};font-size:30px;font-weight:300;line-height:1.15;color:${X.crema};">Cómo es la noche</p></td></tr>
${paso(NOCHE_XANTOLO.horaRecogida, "Nos vemos", "Pasamos por ti donde te hospedes en Xilitla. Si todavía no tienes hospedaje, nos vemos en el centro: te confirmamos el punto exacto por WhatsApp.", true)}
${paso("Al caer la tarde", "Sabores de temporada", `Degustación de ${NOCHE_XANTOLO.degustacion}, lo que se come en estos días en la Huasteca.`)}
${paso("En la noche", "Xantolo con guía", `Un guía del pueblo te lleva a ver ${NOCHE_XANTOLO.queVes}, y te cuenta qué es cada cosa: no es un desfile para turistas, es la fiesta del pueblo.`)}
${paso(NOCHE_XANTOLO.regreso, "De regreso", "Te dejamos donde te recogimos.")}
${paso("Si quieres el día entero", tour.nombre, `${tour.incluye[0]}. Salimos ${tour.horaRecogida} y regresamos a tiempo para la noche: ${mxn(diaTotal)} por persona con todo.`)}
          </table>
        </td></tr>
${bloque(`
            <p class="titulo" style="margin:0;font-family:${SERIF};font-size:34px;font-weight:300;line-height:1.12;color:${X.crema};${LINING}">${lugares} lugares, <span style="color:${X.cempa};">dos noches.</span></p>
            <p style="margin:16px 0 0 0;font-family:${SANS};font-size:15px;font-weight:300;line-height:1.65;color:${X.cremaM80};${LINING}"><strong style="font-weight:500;color:${X.crema};">${noche} por persona</strong>, el sábado 31 de octubre o el domingo 1 de noviembre. Apartas con el 30 % (${mxn(anticipo)}) y el resto se cubre el día de la salida. Los niños pagan menos y los bebés no pagan.</p>
            <p style="margin:12px 0 0 0;font-family:${SANS};font-size:13px;font-weight:300;line-height:1.6;color:${X.cremaM80};">No incluye el traslado hasta Xilitla ni el hospedaje: si necesitas cualquiera de los dos, escríbenos y lo vemos. ${NOCHE_XANTOLO.cancelacion}</p>
${botones("Reservar mi lugar")}`, "32px 36px 30px 36px")}

        <tr><td bgcolor="${X.noche}" style="padding:30px 24px 0 24px;text-align:center;background-color:${X.noche};font-family:${SANS};font-size:13px;font-weight:300;line-height:1.7;color:${X.cremaN70};">¿Alguna duda? Responde a este correo o escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${X.cempa};text-decoration:none;">+52 489 109 0388</a>.</td></tr>
        <tr><td bgcolor="${X.noche}" style="padding:20px 24px 0 24px;text-align:center;background-color:${X.noche};font-family:${SANS};font-size:11px;font-weight:300;line-height:1.7;color:${X.cremaN55};">
          <span style="letter-spacing:2px;text-transform:uppercase;">Tours Huasteca Potosina · Xilitla</span><br>
          Recibes este correo porque pediste la guía de Xantolo en huasteca-potosina.com.<br>
          ${email ? `<a href="${linkBaja(email, BASE)}" style="color:${X.cremaN70};text-decoration:underline;">Darme de baja</a>` : ""}
        </td></tr>

    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;

  // Versión de texto: Gmail y los clientes sin HTML muestran ESTO, no una
  // traducción automática del HTML.
  const text = [
    "Las comparsas son gratis. Te llevamos con un guía del pueblo.",
    "",
    "Pediste nuestra guía de Xantolo. Si quieres vivirlo sin andar buscando dónde es ni a qué hora, nosotros te llevamos:",
    "",
    "- Las comparsas y los shows más representativos, en el centro de Xilitla, con un guía del pueblo",
    `- Degustación de temporada: ${NOCHE_XANTOLO.degustacion}`,
    `- Transporte ida y vuelta, ${NOCHE_XANTOLO.horario}. Si todavía no tienes hospedaje, nos vemos en el centro`,
    "",
    `${noche} por persona, el sábado 31 de octubre o el domingo 1 de noviembre. ${lugares} lugares cada noche. Apartas con el 30 % (${mxn(anticipo)}).`,
    "",
    `Reservar tu lugar: ${pagina}`,
    "",
    `¿Vienes a pasar el día? Agrega ${tour.nombreLargo} ese mismo día: ${mxn(diaTotal)} por persona, con la noche incluida.`,
    "WhatsApp: +52 489 109 0388",
    "",
    "Recibes este correo porque pediste la guía de Xantolo en huasteca-potosina.com.",
    ...(email ? [`Darme de baja: ${linkBaja(email, BASE)}`] : []),
  ].join("\n");

  return { subject, html, text };
}
