import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 500 });

  try {
    const q = await prisma.tourQuote.findUniqueOrThrow({ where: { id: params.id } });
    const siteUrl = "https://www.huasteca-potosina.com";

    const formatMXN = (n: number) => `$${Number(n).toLocaleString("es-MX")} MXN`;
    const formatDate = (d: string) => {
      const dt = new Date(d + "T12:00:00");
      return dt.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    };

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cotización ${q.quoteNumber}</title>
<style>body{margin:0;font-family:'DM Sans',Arial,sans-serif;background:#edeae4}
table{border-collapse:collapse}a{color:#1a2e1a;text-decoration:none}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0">
<table width="600" cellpadding="0" cellspacing="0" style="background:#f4edd8">

  <!-- HERO -->
  <tr><td style="background:#1a2e1a;padding:36px 40px">
    <p style="margin:0 0 8px;font-family:Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6)">Cotización de Tour</p>
    <h1 style="margin:0;font-family:Georgia,serif;font-size:38px;font-style:italic;font-weight:300;color:#f4edd8;line-height:1.1">Tu cotización está lista</h1>
    <p style="margin:12px 0 0;font-family:Arial;font-size:13px;color:rgba(244,237,216,.75)">Hola ${q.customerName}, preparamos esta cotización especialmente para ti. Tiene vigencia de 7 días.</p>
  </td></tr>

  <!-- NÚMERO -->
  <tr><td style="padding:32px 40px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #c4882a;background:#fdf9f0">
      <tr><td style="padding:22px 28px">
        <p style="margin:0 0 6px;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a">Número de Cotización</p>
        <p style="margin:0;font-family:Georgia,serif;font-size:28px;color:#1a2e1a;letter-spacing:1px">${q.quoteNumber}</p>
        <p style="margin:6px 0 0;font-family:Arial;font-size:11px;color:#9a8a6a">Válida por 7 días a partir de hoy</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- DETALLES -->
  <tr><td style="padding:24px 40px 0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="border:1px solid #d4ccbc;background:#faf7ee;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 8px;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Tour</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#1a2e1a">${q.tourName}</p>
        </td>
        <td width="50%" style="border:1px solid #d4ccbc;border-left:none;background:#faf7ee;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 8px;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Fecha Solicitada</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#1a2e1a">${formatDate(q.tourDate)}</p>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #d4ccbc;border-top:none;background:#faf7ee;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 8px;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Participantes</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#1a2e1a">${q.adults} adulto${q.adults !== 1 ? "s" : ""}${q.children > 0 ? ` · ${q.children} niño${q.children !== 1 ? "s" : ""}` : ""}</p>
        </td>
        <td style="border:1px solid #d4ccbc;border-top:none;border-left:none;background:#1a2e1a;padding:18px 20px;vertical-align:top">
          <p style="margin:0 0 8px;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Total Cotizado</p>
          <p style="margin:0;font-family:Georgia,serif;font-size:26px;color:#f4edd8;font-weight:500">${formatMXN(q.totalAmount)}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  ${q.notes ? `<tr><td style="padding:20px 40px 0">
    <div style="border-left:2px solid #c4882a;padding-left:16px">
      <p style="margin:0 0 4px;font-family:Arial;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Notas</p>
      <p style="margin:0;font-family:Arial;font-size:13px;color:#3a3a2e;line-height:1.7">${q.notes}</p>
    </div>
  </td></tr>` : ""}

  <!-- INCLUYE -->
  <tr><td style="padding:24px 40px 0">
    <p style="margin:0 0 12px;font-family:Arial;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a">Todo incluido en el precio</p>
    <p style="margin:0;font-family:Arial;font-size:13px;color:#3a3a2e;line-height:2">
      ✓ Transporte desde tu hotel &nbsp;&nbsp; ✓ Desayuno con platillos típicos<br>
      ✓ Entradas a todos los parques &nbsp;&nbsp; ✓ Guía certificado NOM-09 SECTUR<br>
      ✓ Equipo de seguridad &nbsp;&nbsp; ✓ Fotografías del recorrido
    </p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:28px 40px;text-align:center">
    <a href="${siteUrl}/tours/${q.tourSlug}" style="display:inline-block;background:#3a6b1a;color:#f4edd8;padding:14px 36px;font-family:Arial;font-size:11px;letter-spacing:3px;text-transform:uppercase">
      Reservar Este Tour
    </a>
    <p style="margin:16px 0 0;font-family:Arial;font-size:11px;color:#9a8a6a">
      O escríbenos por WhatsApp: <a href="https://wa.me/524891251458" style="color:#3a6b1a">+52 489 125 1458</a>
    </p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#e6dfc8;padding:28px 40px;text-align:center">
    <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:15px;letter-spacing:3px;text-transform:uppercase;color:#7a6a4a">Tours Huasteca Potosina</p>
    <p style="margin:0;font-family:Arial;font-size:11px;color:#9a8a6a">Xilitla · San Luis Potosí · México · Guías NOM-09 SECTUR</p>
    <p style="margin:10px 0 0;font-family:Arial;font-size:10px;color:#b8a890">© ${new Date().getFullYear()} Tours Huasteca Potosina</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

    const from    = "onboarding@resend.dev";
    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";

    // Sin dominio verificado en Resend, solo se puede enviar al email propio.
    // El admin reenvía manualmente o activa dominio en resend.com/domains.
    const { error } = await resend.emails.send({
      from,
      to:      [adminTo],
      subject: `[COTIZACIÓN PARA ${q.customerEmail}] ${q.quoteNumber} — ${q.tourName}`,
      html,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await prisma.tourQuote.update({ where: { id: params.id }, data: { status: "enviada" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
