import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { trackServerEvent } from "@/lib/serverTrack";
import { correoLider, correoNuevoLider } from "@/lib/viajeCdmx/correos";
import { EMAIL_RE, respuestaDeError, telefonoValido } from "@/lib/viajeCdmx/respuesta";
import { VIAJE_RUTA } from "@/lib/viajeCdmx/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Un código que se dicta por WhatsApp sin confusiones: sin 0/O ni 1/I. */
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function codigoNuevo(nombre: string): string {
  const base = nombre.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "GRUPO";
  let cola = "";
  for (let i = 0; i < 3; i++) cola += LETRAS[Math.floor(Math.random() * LETRAS.length)];
  return `${base}${cola}`;
}

/** «Arma tu grupo y viaja gratis»: guarda al líder y le manda su liga. */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "viaje-cdmx-lider", limit: 5, windowMs: 60_000 });
  if (limitado) return limitado;
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }

  const nombre = String(b.nombre ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp ?? "").trim().slice(0, 40);
  const personasEstimadas = Math.max(2, Math.min(40, Math.floor(Number(b.personasEstimadas) || 6)));
  const notas = String(b.notas ?? "").trim().slice(0, 500) || null;
  if (nombre.length < 2) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  if (!telefonoValido(whatsapp)) return NextResponse.json({ error: "Escribe tu WhatsApp a 10 dígitos." }, { status: 400 });

  try {
    // Si ya se registró con ese correo, se le devuelve su mismo código.
    const previo = await prisma.liderGrupo.findFirst({ where: { email, estado: { not: "descartado" } } });
    if (previo) {
      return NextResponse.json({ ok: true, codigo: previo.codigo, liga: `${VIAJE_RUTA}?lider=${previo.codigo}` });
    }
    let lider = null;
    for (let intento = 0; intento < 5 && !lider; intento++) {
      try {
        lider = await prisma.liderGrupo.create({
          data: { codigo: codigoNuevo(nombre), nombre, email, whatsapp, personasEstimadas, notas,
            salidaId: typeof b.salidaId === "string" && b.salidaId ? b.salidaId : null },
        });
      } catch (e: unknown) {
        if ((e as { code?: string })?.code !== "P2002") throw e;
      }
    }
    if (!lider) throw new Error("No se pudo generar un código único");
    trackServerEvent("VIAJE_CDMX_LIDER", { tourSlug: "viaje-cdmx-xilitla", sid: typeof b.sid === "string" ? b.sid : null, data: { personasEstimadas } });
    Promise.all([correoLider(lider), correoNuevoLider(lider)]).catch((err: unknown) =>
      logger.error("viaje_cdmx_correo_lider_fallo", { reason: err instanceof Error ? err.message : String(err) }));
    return NextResponse.json({ ok: true, codigo: lider.codigo, liga: `${VIAJE_RUTA}?lider=${lider.codigo}` });
  } catch (err) {
    return respuestaDeError(err, "lider");
  }
}
