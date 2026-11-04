import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { lunesDe, etiquetaSemana } from "@/lib/admin/corteSemanal";
import { datosScorecard } from "@/lib/admin/scorecardDatos";
import { sesionActual } from "@/lib/admin/sesion";
import { limpiarCaptura } from "@/lib/admin/rubrica";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { TarjetaKpi } from "@/components/admin/ui/TarjetaKpi";
import ScoreClient from "./ScoreClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Score WhatsApp — Admin" };

/**
 * Score WhatsApp (Fase 3, 4 nov 2026): la revisión de los jueves con la
 * rúbrica de 14 reglas, primero con captura manual (lo pide el plan). Cuando
 * llegue la Bandeja de WhatsApp, el agente propondrá estos números.
 */
export default async function ScorePage({ searchParams }: { searchParams: { semana?: string } }) {
  const pedida = searchParams?.semana ?? "";
  const lunes = lunesDe(/^\d{4}-\d{2}-\d{2}$/.test(pedida) && addDaysYMD(pedida, 0) === pedida ? pedida : hoyMX());
  const [sesion, revision, historia, datos] = await Promise.all([
    sesionActual(),
    prisma.revisionSemanal.findUnique({ where: { semana: lunes } }),
    prisma.revisionSemanal.findMany({ where: { semana: { lte: lunes, gte: addDaysYMD(lunes, -7 * 7) } }, select: { semana: true, score: true }, orderBy: { semana: "asc" } }),
    datosScorecard(lunes).catch(() => null),
  ]);
  const puedeEditar = sesion?.rol === "dueno" || sesion?.rol === "socio";
  const resenas = datos?.scorecard.kpis.find(k => k.clave === "resenas") ?? null;
  // Las 8 semanas que terminan en esta, con hueco si no hubo revisión.
  const tendencia = Array.from({ length: 8 }, (_, i) => addDaysYMD(lunes, -7 * (7 - i))).map(s => ({ semana: s, score: historia.find(h => h.semana === s)?.score ?? null }));
  const nav = (s: string, aria: string, Icono: typeof ChevronLeft) => (
    <Link href={`/admin/score?semana=${s}`} aria-label={aria} className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white text-[var(--panel-tinta)]"><Icono className="h-4 w-4" aria-hidden="true" /></Link>
  );
  const esActual = lunes === lunesDe(hoyMX());

  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Score WhatsApp" nueva subtitulo={`La revisión de los jueves · 14 reglas, 100 puntos, meta 85${esActual ? " · semana en curso" : ""}`}
        acciones={<div className="flex items-center gap-2">{nav(addDaysYMD(lunes, -7), "Semana anterior", ChevronLeft)}<span className="min-w-[170px] text-center font-cormorant text-xl text-[var(--panel-tinta)]">{etiquetaSemana(lunes)}</span>{nav(addDaysYMD(lunes, 7), "Semana siguiente", ChevronRight)}</div>} />

      <ScoreClient key={lunes} semana={lunes} puedeEditar={puedeEditar} tendencia={tendencia}
        inicial={{
          rubrica: limpiarCaptura(revision?.rubrica),
          revisadas: revision?.revisadas ?? "",
          recomendaciones: revision?.recomendaciones ?? "",
          scoreSinRubrica: revision && !revision.rubrica ? revision.score : null,
          guardadoPor: revision?.guardadoPor ?? null,
          enviadoOperadorEn: revision?.enviadoOperadorEn?.toISOString() ?? null,
        }} />

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {resenas && <TarjetaKpi etiqueta={resenas.etiqueta} area={resenas.area} valor={resenas.valor} contexto={resenas.contexto} estado={resenas.estado} />}
        <div className="panel-card p-4 text-[13px] font-dm text-[var(--panel-tinta-media)]">
          <p className="font-medium text-[var(--panel-tinta)]">Reseñas</p>
          <p className="mt-1">Las nuevas de Google se anotan en la revisión del jueves (Inicio) o salen de la lectura semanal. A quién pedirle hoy y quién ya la dejó: en Reseñas.</p>
          <Link href="/admin/resenas" className="panel-foco mt-2 inline-block font-semibold text-[var(--panel-acento)] hover:underline">Abrir Reseñas →</Link>
        </div>
      </section>
    </div>
  );
}
