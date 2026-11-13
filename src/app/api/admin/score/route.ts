import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { lunesDe } from "@/lib/admin/corteSemanal";
import { addDaysYMD } from "@/lib/dates";
import { sendBrevoEmail } from "@/lib/brevo";
import { correoDe } from "@/lib/admin/recordatorios";
import { ETIQUETA_BANDA, bandaScore, calcularScore, limpiarCaptura, META_SCORE } from "@/lib/admin/rubrica";
import { RESPONSABLE_OPERACION } from "@/lib/admin/automatizaciones";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/**
 * PATCH { semana, rubrica, revisadas?, recomendaciones?, mandar? } — la revisión
 * del jueves con la rúbrica de 14 reglas (Fase 3, 4 nov 2026). El score se
 * calcula aquí (no se confía en el del navegador) y queda en la misma fila que
 * lee el scorecard de Inicio. Con `mandar`, le llega al operador por correo.
 * Capturan el dueño y el socio; el operador la ve (es SU score), no la edita.
 */
export async function PATCH(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || (sesion.rol !== "dueno" && sesion.rol !== "socio")) {
    return NextResponse.json({ error: "La revisión la capturan Manolo o Martín." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const pedida = String(body.semana ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida) || addDaysYMD(pedida, 0) !== pedida) return NextResponse.json({ error: "Semana no válida." }, { status: 400 });
  const semana = lunesDe(pedida);
  const rubrica = limpiarCaptura(body.rubrica);
  const r = calcularScore(rubrica);
  const texto = (v: unknown, max: number) => (v === undefined ? undefined : String(v ?? "").trim().slice(0, max) || null);
  const data = {
    // Sin ninguna regla capturada no se borra el score que se anotó a mano en Inicio.
    rubrica: rubrica as object, ...(r.score !== null ? { score: r.score } : {}),
    ...(body.revisadas !== undefined ? { revisadas: texto(body.revisadas, 4000) } : {}),
    ...(body.recomendaciones !== undefined ? { recomendaciones: texto(body.recomendaciones, 2000) } : {}),
    guardadoPor: sesion.nombre,
  };
  let guardado = false;
  try {
    let fila = await prisma.revisionSemanal.upsert({ where: { semana }, create: { semana, ...data }, update: data });
    guardado = true;
    await registrarEnBitacora({ accion: "modificó", entidad: "panel", referencia: `Score ${semana}`, resumen: `Score WhatsApp de la semana del ${semana}: ${r.score ?? "sin dato"}${r.score !== null ? ` (${ETIQUETA_BANDA[bandaScore(r.score)!]})` : ""}` });

    let enviado = false;
    if (body.mandar === true) {
      if (r.score === null) return NextResponse.json({ error: "Captura al menos una regla antes de mandarlo." }, { status: 400 });
      const banda = ETIQUETA_BANDA[bandaScore(r.score)!];
      const filas = r.reglas.filter(x => x.pct !== null).map(x =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #E6E4DF;font-size:14px;color:#1C1C1A">${esc(x.texto)}</td><td style="padding:6px 0;border-bottom:1px solid #E6E4DF;font-size:14px;text-align:right;color:${(x.pct ?? 0) < 70 ? "#A33A26" : "#2E6B45"}">${x.cumplen}/${x.aplican} · ${x.pct} %</td></tr>`).join("");
      const recs = String(fila.recomendaciones ?? "").split("\n").map(s => s.trim()).filter(Boolean);
      const htmlContent = `<!doctype html><html lang="es"><body bgcolor="#F5F5F3" style="margin:0;background:#F5F5F3;font-family:Helvetica,Arial,sans-serif">
        <table role="presentation" width="100%" bgcolor="#F5F5F3" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
        <table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E4DF;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
        <div style="font-size:11px;letter-spacing:2px;color:#66655F">PANEL HUASTECA · TU SCORE DE WHATSAPP</div>
        <div style="font-size:40px;color:#1C1C1A;margin:8px 0 0">${r.score}<span style="font-size:18px;color:#66655F"> / 100</span></div>
        <div style="font-size:14px;color:#66655F">${esc(banda)} · meta ${META_SCORE} · semana del ${semana}</div>
        ${recs.length ? `<div style="font-size:12px;letter-spacing:1.5px;color:#66655F;margin:20px 0 6px">PARA ESTA SEMANA</div><ul style="margin:0;padding-left:18px;font-size:15px;color:#1C1C1A">${recs.map(x => `<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>` : ""}
        <div style="font-size:12px;letter-spacing:1.5px;color:#66655F;margin:20px 0 6px">POR REGLA</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
        </td></tr></table></td></tr></table></body></html>`;
      const textContent = `Tu score de WhatsApp: ${r.score}/100 (${banda}) · semana del ${semana}\n\n${recs.length ? `Para esta semana:\n${recs.map(x => `- ${x}`).join("\n")}\n\n` : ""}${r.reglas.filter(x => x.pct !== null).map(x => `${x.texto}: ${x.cumplen}/${x.aplican}`).join("\n")}`;
      await sendBrevoEmail({ to: correoDe(RESPONSABLE_OPERACION), subject: `Tu score de WhatsApp: ${r.score} (${banda})`, htmlContent, textContent, senderName: "Panel Huasteca" });
      fila = await prisma.revisionSemanal.update({ where: { semana }, data: { enviadoOperadorEn: new Date() } });
      enviado = true;
    }
    return NextResponse.json({ ok: true, score: r.score, enviado, enviadoOperadorEn: fila.enviadoOperadorEn?.toISOString() ?? null });
  } catch (e) {
    console.error("admin/score PATCH:", (e as Error)?.message);
    return NextResponse.json({ error: guardado ? "Se guardó, pero no se pudo mandar el correo." : "No se pudo guardar." }, { status: 500 });
  }
}
