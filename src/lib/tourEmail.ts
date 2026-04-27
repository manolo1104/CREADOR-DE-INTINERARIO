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
}): string {
  const base = "https://www.huasteca-potosina.com";
  const tourUrl = `${base}/tours/${data.tourSlug}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Por confirmar";
    const d = new Date(dateStr + "T12:00:00");
    const f = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return f.charAt(0).toUpperCase() + f.slice(1);
  };

  const totalParticipants = data.adults + data.children;
  const participantsText  = `${data.adults} adulto${data.adults !== 1 ? "s" : ""}${data.children > 0 ? ` · ${data.children} menor${data.children !== 1 ? "es" : ""}` : ""}`;
  const hasPromo = data.promoCode && (data.promoDiscount ?? 0) > 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tour confirmado — ${data.confirmationNumber}</title>
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
        Huasteca Potosina &middot; San Luis Potosí &middot; México
      </p>
    </td></tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:0;">
      <table class="container full-width" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0">

        <!-- HERO -->
        <tr><td class="mobile-plg" style="padding:36px 40px 40px 40px;background-color:#1a2e1a;">
          <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(255,255,255,0.65);">
            Confirmación de Tour
          </p>
          <h1 class="hero-title" style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:44px;font-style:italic;font-weight:300;color:#f4edd8;line-height:1.1;">
            ¡Tu aventura está<br>confirmada!
          </h1>
          <p style="margin:14px 0 0 0;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:rgba(244,237,216,0.75);line-height:1.7;">
            Prepárate para vivir la Huasteca Potosina como nunca antes. Aquí tienes todos los detalles de tu recorrido.
          </p>
        </td></tr>

        <!-- CARD PRINCIPAL -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:48px 48px;">

          <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#1a2e1a;line-height:1.2;">
            ¡Hola, <span style="font-style:italic;color:#c4882a;">${data.customerName}!</span>
          </p>
          <p style="margin:20px 0 30px 0;font-family:'DM Sans',Arial;font-size:14px;font-weight:300;color:#3a3a2e;line-height:1.85;">
            Tu lugar está apartado. Nuestro equipo de guías certificados ya conoce tu reserva y estará listo para darte la bienvenida. Solo preocúpate por llegar — nosotros nos encargamos de todo lo demás.
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
                      Número de Confirmación
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

          <!-- DETALLES DEL TOUR -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
            <tr>
              <td colspan="2" style="border:1px solid #d4ccbc;background-color:#faf7ee;padding:20px 22px;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  Tour Reservado
                </p>
                <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#1a2e1a;font-weight:400;">
                  ${data.tourName}
                </p>
              </td>
            </tr>
            <tr>
              <td class="split-left" style="width:50%;border:1px solid #d4ccbc;border-top:none;background-color:#faf7ee;padding:20px 22px;vertical-align:top;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  Fecha del Recorrido
                </p>
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;">
                  ${formatDate(data.tourDate)}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8a7a5a;">Salida: 5:30 AM desde tu hotel</p>
              </td>
              <td class="split-left" style="width:50%;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#faf7ee;padding:20px 22px;vertical-align:top;">
                <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#8a7a5a;">
                  Participantes
                </p>
                <p style="margin:0 0 4px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;color:#1a2e1a;">
                  ${totalParticipants} persona${totalParticipants !== 1 ? "s" : ""}
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8a7a5a;">${participantsText}</p>
              </td>
            </tr>
          </table>

          <!-- TOTAL -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1a2e1a;margin:28px 0;">
            <tr><td class="mobile-p" style="padding:22px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4882a;">
                      Total Pagado
                    </p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#f4edd8;">
                      $${Number(data.totalAmount).toLocaleString("es-MX")}<span style="font-size:13px;color:#c4882a;"> MXN</span>
                    </p>
                  </td>
                </tr>
                ${hasPromo ? `
                <tr><td colspan="2" style="padding-top:12px;border-top:1px solid rgba(196,136,42,0.3);">
                  <p style="margin:0;font-family:'DM Sans',Arial;font-size:11px;color:#8fbe3a;">
                    ✓ Código ${data.promoCode} aplicado — ${data.promoDiscount}% de descuento
                  </p>
                </td></tr>` : ""}
              </table>
            </td></tr>
          </table>

          <!-- QUÉ INCLUYE -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid #c4882a;padding-left:20px;margin:28px 0;">
            <tr><td>
              <p style="margin:0 0 12px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
                Todo incluido en tu tour
              </p>
              <p style="margin:0;font-family:'DM Sans',Arial;font-size:13px;color:#3a3a2e;line-height:1.9;">
                ✓ Transporte desde tu hotel &nbsp;&nbsp; ✓ Desayuno con platillos típicos<br>
                ✓ Entradas a todos los parques &nbsp;&nbsp; ✓ Guía certificado NOM-09 SECTUR<br>
                ✓ Equipo de seguridad &nbsp;&nbsp; ✓ Fotografías y video del recorrido
              </p>
            </td></tr>
          </table>

        </td></tr>

        <!-- PRÓXIMOS PASOS -->
        <tr><td class="mobile-p" style="background-color:#e6dfc8;padding:36px 48px;">
          <p style="margin:0 0 8px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a;">
            Próximos pasos
          </p>
          <h2 style="margin:0 0 20px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-style:italic;font-weight:300;color:#1a2e1a;">
            Antes de tu recorrido
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  🌅 Punto de Salida
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  Frente a tu hotel a las 5:30 AM. Confirma tu dirección exacta por WhatsApp.
                </p>
              </td>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-left:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  👟 Qué Llevar
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  Ropa cómoda, calzado cerrado, traje de baño, protector solar biodegradable.
                </p>
              </td>
            </tr>
            <tr>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-top:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  📱 Confirma por WhatsApp
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  <a href="https://wa.me/524891251458" style="color:#3a6b1a;border-bottom:1px solid #3a6b1a;">+52 489 125 1458</a><br>
                  Envía tu número: <strong>${data.confirmationNumber}</strong>
                </p>
              </td>
              <td style="width:50%;padding:14px 16px;vertical-align:top;border:1px solid #d4ccbc;border-top:none;border-left:none;background-color:#f4edd8;">
                <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#1a2e1a;">
                  🆔 Al Subir al Transporte
                </p>
                <p style="margin:0;font-family:'DM Sans',Arial;font-size:12px;color:#4a4a3a;line-height:1.5;">
                  Presenta este número al guía:<br><strong>${data.confirmationNumber}</strong>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td class="mobile-plg" style="background-color:#f4edd8;padding:40px 48px;text-align:center;border-top:1px solid #d4ccbc;">
          <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
            Mientras esperas
          </p>
          <h2 style="margin:0 0 22px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-style:italic;font-weight:300;color:#1a2e1a;">
            Descubre más tours de la Huasteca
          </h2>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr><td style="background-color:#3a6b1a;padding:14px 36px;">
              <a href="${base}/tours" style="font-family:'DM Sans',Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#f4edd8;text-decoration:none;display:block;">
                Ver Todos los Tours
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- CONTACTO -->
        <tr><td class="mobile-p" style="background-color:#f4edd8;padding:28px 48px;border-top:1px solid #d4ccbc;">
          <p style="margin:0 0 14px 0;font-family:'DM Sans',Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;">
            ¿Tienes preguntas?
          </p>
          <p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:13px;color:#1a2e1a;">
            📱 <a href="https://wa.me/524891251458" style="color:#3a6b1a;border-bottom:1px solid #3a6b1a;">WhatsApp: +52 489 125 1458</a>
          </p>
          <p style="margin:0 0 6px 0;font-family:'DM Sans',Arial;font-size:13px;color:#1a2e1a;">
            📧 <a href="mailto:hola@huasteca-potosina.com" style="color:#1a2e1a;border-bottom:1px solid #d4ccbc;">hola@huasteca-potosina.com</a>
          </p>
          <p style="margin:12px 0 0 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a;">
            ID de Pago: ${data.paymentIntentId || "N/A"}
          </p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td class="mobile-plg" style="background-color:#e6dfc8;padding:36px 48px;text-align:center;">
          <p style="margin:0 0 8px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a;">
            Tours Huasteca Potosina
          </p>
          <p style="margin:0 0 14px 0;font-family:'DM Sans',Arial;font-size:11px;color:#9a8a6a;line-height:1.6;">
            Xilitla &middot; San Luis Potosí &middot; México<br>
            Guías certificados NOM-09 SECTUR · +8 años de experiencia
          </p>
          <p style="margin:14px 0 0 0;font-family:'DM Sans',Arial;font-size:10px;color:#b8a890;">
            © ${new Date().getFullYear()} Tours Huasteca Potosina · Todos los derechos reservados
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}
