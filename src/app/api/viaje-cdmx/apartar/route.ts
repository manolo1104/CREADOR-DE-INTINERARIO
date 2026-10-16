import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { huellaIp } from "@/lib/apartadosAlmacen";
import { trackServerEvent } from "@/lib/serverTrack";
import { apartarLugares, barrerApartados, crearCobroDelApartado, soltarAnteriores } from "@/lib/viajeCdmx/apartar";
import { ErrorViaje } from "@/lib/viajeCdmx/cupo";
import { EMAIL_RE, respuestaDeError, telefonoValido } from "@/lib/viajeCdmx/respuesta";
import { COMPARTIR_VALIDO, CUARTO_VALIDO } from "@/lib/viajeCdmx/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Aparta lugares y devuelve el cobro del anticipo. El precio lo pone el
 * servidor (`precio.ts`); del navegador solo se acepta qué fecha, cuántos y
 * quién. `precioVisto` sirve para avisar si cambió, no para cobrar.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-apartar", limit: 10, windowMs: 60_000 });
  if (limitado) return limitado;

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  const nombre = String(b.nombre ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const telefono = String(b.telefono ?? "").trim();
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe tu nombre.", codigo: "nombre" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Revisa tu correo: ahí te llega tu confirmación.", codigo: "email" }, { status: 400 });
  if (!telefonoValido(telefono)) return NextResponse.json({ error: "Escribe tu WhatsApp a 10 dígitos.", codigo: "telefono" }, { status: 400 });
  if (b.aceptaTerminos !== true) return NextResponse.json({ error: "Acepta las condiciones del anticipo para continuar.", codigo: "terminos" }, { status: 400 });

  const salidaId = String(b.salidaId ?? "");
  const huella = huellaIp(clientIp(req));

  try {
    // Un código de líder que no existe no se guarda: no hay a quién contárselo.
    let liderCodigo: string | null = null;
    if (b.liderCodigo) {
      const l = await prisma.liderGrupo.findUnique({ where: { codigo: String(b.liderCodigo).trim().toUpperCase().slice(0, 20) } });
      liderCodigo = l && l.estado !== "descartado" ? l.codigo : null;
    }

    await soltarAnteriores(huella, salidaId);
    const creado = await apartarLugares({
      salidaId,
      personas: Number(b.personas),
      nombre, email, telefono,
      liderCodigo,
      precioVisto: b.precioVisto == null ? null : Number(b.precioVisto),
      huella,
      cuarto: CUARTO_VALIDO(b.cuarto) ? b.cuarto : "compartido",
      compartirCon: COMPARTIR_VALIDO(b.compartirCon) ? b.compartirCon : null,
      locale: b.locale === "en" ? "en" : "es",
    });
    const pi = await crearCobroDelApartado(creado, {
      sid: typeof b.sid === "string" ? b.sid : null,
      gaClientId: typeof b.gaClientId === "string" ? b.gaClientId : null,
    });

    trackServerEvent("VIAJE_CDMX_APARTADO", {
      sid: typeof b.sid === "string" ? b.sid : null,
      tourSlug: "viaje-cdmx-xilitla",
      amount: creado.montos.anticipo,
      data: { salida: creado.salida.fechaSalida, personas: creado.montos.personas, oxxo: creado.oxxo, cuarto: creado.apartado.cuarto, locale: creado.apartado.locale },
    });
    // De paso, lo que se quedó vencido de otros (sin hacer esperar a este cliente).
    barrerApartados().catch(() => {});

    return NextResponse.json({
      holdId: creado.apartado.id,
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret,
      expiraEl: creado.apartado.expiraEl.toISOString(),
      metodos: pi.payment_method_types,
      ...creado.montos,
    });
  } catch (e) {
    if (e instanceof ErrorViaje && e.codigo === "sin-lugar") {
      trackServerEvent("VIAJE_CDMX_SIN_LUGAR", { tourSlug: "viaje-cdmx-xilitla", data: { salidaId, personas: Number(b.personas) } });
    }
    return respuestaDeError(e, "apartar");
  }
}
