import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { estaDeBaja } from "@/lib/estaDeBaja";
import { buildCumpleEmailHtml } from "@/lib/cumpleEmail";
import { localeDeReserva } from "@/lib/reviewRequest";
import { hoyMX } from "@/lib/dates";
import { actividad, logger } from "@/lib/logger";
import { correoUtil } from "@/lib/encuestas/encuesta";
import { cumpleEnVentana, generarCodigoCumple, venceDesde } from "@/lib/encuestas/cumple";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/cumpleanos
// Felicita con su código del 10 % a quien cumple años hoy (o en los dos días
// anteriores, por si GitHub se saltó una corrida). Uno por persona y año: lo
// impide `@@unique([email, anio])` de `CodigoCumple`. Solo a quien aceptó las
// promociones en su check-in, y nunca a quien pidió la baja.
// Protegido por Bearer <CRON_SECRET o BLOG_AGENT_SECRET>; `?dry=1` no manda ni
// crea nada.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const hoy = hoyMX();

  const filas = await prisma.encuestaReserva.findMany({
    // TODOS los check-ins contestados, no solo los que aceptaron: manda la
    // respuesta más reciente de cada persona. Si en su último check-in desmarcó
    // las promociones, un «sí» de un viaje anterior ya no cuenta.
    where: { checkinEn: { not: null } },
    select: {
      id: true, fechaNacimiento: true, checkinEn: true, aceptaPromos: true,
      booking: { select: { customerName: true, customerEmail: true, lineItems: true } },
    },
    orderBy: { checkinEn: "desc" },
  });

  // Una persona puede tener varios check-ins: el permiso es el de su check-in
  // MÁS RECIENTE; la fecha, la última que nos haya dado (si en el último la dejó
  // en blanco, sirve la de antes).
  const personas = new Map<string, { fila: (typeof filas)[number]; nacimiento: string | null }>();
  for (const f of filas) {
    const email = (f.booking.customerEmail || "").trim().toLowerCase();
    if (!correoUtil(email)) continue;
    const p = personas.get(email);
    if (!p) personas.set(email, { fila: f, nacimiento: f.fechaNacimiento });
    else if (!p.nacimiento && f.fechaNacimiento) p.nacimiento = f.fechaNacimiento;
  }
  const porCorreo = new Map<string, (typeof filas)[number] & { cumple: { anio: number; fecha: string } }>();
  for (const [email, p] of Array.from(personas.entries())) {
    if (!p.fila.aceptaPromos || !p.nacimiento) continue;
    const cumple = cumpleEnVentana(p.nacimiento, hoy);
    if (cumple) porCorreo.set(email, { ...p.fila, cumple });
  }

  const recibirian: { email: string; cumple: string }[] = [];
  let enviados = 0, fallidos = 0, yaEsteAnio = 0, deBaja = 0;

  for (const [email, f] of Array.from(porCorreo.entries())) {
    if (await estaDeBaja(email)) { deBaja++; continue; }
    const previo = await prisma.codigoCumple.findUnique({ where: { email_anio: { email, anio: f.cumple.anio } } });
    if (previo?.enviadoEn) { yaEsteAnio++; continue; }
    recibirian.push({ email, cumple: f.cumple.fecha });
    if (dry) continue;

    try {
      // El código se crea ANTES de mandar y se reusa si el envío falló: así un
      // reintento no le cambia el código a nadie.
      let codigo = previo;
      for (let intento = 0; !codigo && intento < 5; intento++) {
        try {
          codigo = await prisma.codigoCumple.create({
            data: {
              codigo: generarCodigoCumple(), email, nombre: f.booking.customerName,
              anio: f.cumple.anio, venceEl: venceDesde(hoy), encuestaId: f.id,
            },
          });
        } catch (e: unknown) {
          // P2002 en `codigo`: chocó con otro código; se intenta otro. En
          // (email, anio): otra corrida ya lo creó; se lee.
          if ((e as { code?: string })?.code !== "P2002") throw e;
          codigo = await prisma.codigoCumple.findUnique({ where: { email_anio: { email, anio: f.cumple.anio } } });
        }
      }
      if (!codigo) throw new Error("no se pudo generar un código");
      if (codigo.enviadoEn) { yaEsteAnio++; continue; }

      const { subject, html } = buildCumpleEmailHtml({
        customerName: f.booking.customerName, email, codigo: codigo.codigo,
        fechaCumple: f.cumple.fecha, hoy, venceEl: codigo.venceEl, locale: localeDeReserva(f.booking.lineItems),
      });
      await sendBrevoEmail({ to: [{ email, name: f.booking.customerName }], subject, htmlContent: html });
      await prisma.codigoCumple.update({ where: { id: codigo.id }, data: { enviadoEn: new Date() } });
      enviados++;
    } catch (e) {
      fallidos++;
      logger.error("cron_cumple_fallido", { email, reason: e instanceof Error ? e.message : "desconocido" });
    }
  }

  actividad(
    dry ? "🎂  CRON CUMPLEAÑOS (prueba)" : "🎂  CRON CUMPLEAÑOS",
    dry ? `${recibirian.length} recibirían` : `${enviados} felicitación(es)`,
    yaEsteAnio ? `${yaEsteAnio} ya felicitados este año` : undefined,
    deBaja ? `${deBaja} de baja` : undefined,
    fallidos ? `⚠️ ${fallidos} fallaron` : undefined,
  );
  return NextResponse.json({ ok: true, dry, hoy, enviados, fallidos, yaEsteAnio, deBaja, ...(dry ? { recibirian } : {}) });
}
