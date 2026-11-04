import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { configAgente, gastoDelMes } from "@/lib/admin/agente/claude";
import { MODELO_EXTRAER, MODELO_RESPONDER, mesMX, usd } from "@/lib/admin/agente/costos";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { TarjetaKpi } from "@/components/admin/ui/TarjetaKpi";
import AgenteClient from "./AgenteClient";
import ReporteClient from "./ReporteClient";
import PreguntarClient from "./PreguntarClient";
import Link from "next/link";
import { sugerenciasAgrupar } from "@/lib/admin/agruparDatos";
import { lunesDe } from "@/lib/admin/corteSemanal";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agente — Admin" };

const ETIQUETA: Record<string, string> = { aprobada: "Aprobada sin cambios", editada: "Editada", rechazada: "Rechazada", caducada: "Sin usar", pendiente: "Pendiente" };

/**
 * El agente (Fase 4, 4 nov 2026): cuánto lleva gastado contra el tope, si
 * está encendido, y cómo van sus propuestas (la meta del plan: 70 % aprobadas
 * sin cambios durante 2 semanas antes de darle más autonomía).
 */
export default async function AgentePage() {
  const mes = mesMX();
  const [sesion, cfg, gastado, porTarea, propuestas, ultimas] = await Promise.all([
    sesionActual(), configAgente(), gastoDelMes(mes),
    prisma.usoClaude.groupBy({ by: ["tarea"], where: { mes }, _sum: { costoUsd: true }, _count: { _all: true } }),
    prisma.propuestaAgente.groupBy({ by: ["estado"], where: { createdAt: { gte: new Date(`${mes}-01T00:00:00-06:00`) } }, _count: { _all: true } }),
    prisma.propuestaAgente.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  // El reporte de los jueves: el de la semana más reciente que tenga uno.
  const ultimoReporte = await prisma.hallazgoAgente.findFirst({ orderBy: { semana: "desc" }, select: { semana: true } });
  const hallazgos = ultimoReporte ? await prisma.hallazgoAgente.findMany({ where: { semana: ultimoReporte.semana }, orderBy: { createdAt: "asc" } }) : [];
  const n = (e: string) => propuestas.find(p => p.estado === e)?._count._all ?? 0;
  const decididas = n("aprobada") + n("editada") + n("rechazada");
  const pctSinCambios = decididas ? Math.round((n("aprobada") / decididas) * 100) : null;
  const pctTope = cfg.topeUsd ? Math.min(100, Math.round((gastado / cfg.topeUsd) * 100)) : 100;
  const tarea = (t: string) => porTarea.find(x => x.tarea === t);
  const sinLlave = !process.env.ANTHROPIC_API_KEY;
  // Regla del plan: 30 aprobaciones seguidas sin edición → el panel sugiere subir de nivel (solo el director decide).
  const racha = await prisma.propuestaAgente.findMany({ where: { tipo: "respuesta", estado: { in: ["aprobada", "editada", "rechazada"] } }, orderBy: { decididoEn: "desc" }, take: 30, select: { estado: true } });
  const listoParaMas = racha.length === 30 && racha.every(r => r.estado === "aprobada");
  // Juntar salidas (4 nov 2026): lo que la regla ve en los próximos 45 días y si ya es seguimiento.
  const agrupar = await sugerenciasAgrupar().catch(() => []);
  const yaTareas = agrupar.length ? new Set((await prisma.tarea.findMany({ where: { regla: "agrupar-salidas", claveRegla: { in: agrupar.map(g => `agrupar-salidas:${g.mover.clave}>${g.hacia.clave}`) } }, select: { claveRegla: true } })).map(t => t.claveRegla)) : new Set<string | null>();
  const diaC = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const enc = (c: string) => `/admin/salidas-dia/${encodeURIComponent(c)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Agente" nueva subtitulo="Lee los chats, llena los datos del lead y propone respuestas que una persona aprueba" />
      {sinLlave && <p className="rounded-[var(--panel-radio-sm)] bg-[var(--panel-problema-fondo)] px-4 py-2 text-[13px] font-dm text-[var(--panel-problema)]">Falta la llave de Claude (ANTHROPIC_API_KEY) en este servidor: el agente no puede trabajar.</p>}

      {listoParaMas && <p className="rounded-[var(--panel-radio-sm)] bg-[var(--panel-bien-fondo)] px-4 py-2 text-[13px] font-dm text-[var(--panel-bien)]">Las últimas 30 respuestas del agente se aprobaron sin cambios. Según el plan, ya se le podría dar más autonomía (por ejemplo, mandar solo las respuestas de información general). Es decisión tuya: por ahora todo sigue pasando por una persona.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaKpi etiqueta="Gasto del mes" area="Agente" valor={usd(gastado)} contexto={`de ${usd(cfg.topeUsd)} · ${pctTope} % del tope`}
          estado={pctTope >= 100 ? { tono: "problema", texto: "Tope alcanzado" } : pctTope >= 80 ? { tono: "atencion", texto: "Cerca del tope" } : { tono: "bien", texto: "Dentro del tope" }} />
        <TarjetaKpi etiqueta="Chats leídos" area="Agente" valor={String(tarea("extraer")?._count._all ?? 0)} contexto={`${usd(tarea("extraer")?._sum.costoUsd ?? 0)} · ${MODELO_EXTRAER}`} />
        <TarjetaKpi etiqueta="Respuestas propuestas" area="Agente" valor={String(tarea("responder")?._count._all ?? 0)} contexto={`${usd(tarea("responder")?._sum.costoUsd ?? 0)} · ${MODELO_RESPONDER}`} />
        <TarjetaKpi etiqueta="Aprobadas sin cambios" area="Agente" valor={pctSinCambios === null ? "—" : `${pctSinCambios} %`}
          contexto={decididas ? `${n("aprobada")} de ${decididas} decididas · meta 70 %` : "Aún no hay propuestas decididas este mes"}
          estado={pctSinCambios === null ? { tono: "neutro", texto: "Sin dato" } : pctSinCambios >= 70 ? { tono: "bien", texto: "En meta" } : { tono: "atencion", texto: "Debajo de meta" }} />
      </div>

      <div className="panel-card p-4">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-fondo-velo)]" aria-label={`${pctTope} % del tope usado`}>
          <div className="h-full rounded-full" style={{ width: `${pctTope}%`, background: pctTope >= 100 ? "var(--panel-problema)" : pctTope >= 80 ? "var(--panel-atencion)" : "var(--panel-bien)" }} />
        </div>
        <AgenteClient inicial={cfg} puedeCambiar={sesion?.rol === "dueno"} />
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
          <li><strong className="text-[var(--panel-tinta)]">Lo hace solo:</strong> lee cada chat con mensajes nuevos (un minuto después de la ráfaga) y llena SOLO los datos vacíos del lead: tours, fecha, personas, perfil y hospedaje. Lo que una persona escribió no se toca.</li>
          <li><strong className="text-[var(--panel-tinta)]">Propone:</strong> en la Bandeja, el botón ✨ redacta la respuesta; se usa, se edita o se rechaza con motivo. Nunca manda nada solo.</li>
          <li><strong className="text-[var(--panel-tinta)]">Avisa:</strong> si ve una queja, accidente, emergencia o tema de salud, deja un seguimiento urgente a Manolo.</li>
          <li>Al llegar al tope se detiene hasta el día 1 (o hasta que se suba el tope).</li>
        </ul>
      </div>

      <section id="agrupar" className="panel-card p-4">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Juntar salidas</h2>
        <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">El mismo tour a 3 días o menos, una salida bajo el mínimo (menos de 3) y juntas caben: proponerle al grupo más chico cambiarse de fecha. La regla lo revisa sola cada 5 minutos y le deja el seguimiento a Erick (no gasta Claude).</p>
        {agrupar.length === 0 ? <p className="mt-2 text-[13px] font-dm text-[var(--panel-tinta-media)]">Nada que juntar en los próximos 45 días.</p> : (
          <ul className="mt-3 space-y-2">
            {agrupar.map(g => (
              <li key={g.mover.clave} className="rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3 text-[13px] font-dm">
                <p className="font-semibold text-[var(--panel-tinta)]">{g.tour.split(" — ")[0]}: {g.juntas} personas en una sola salida{g.ahorro ? ` · ahorro ~$${g.ahorro.toLocaleString("es-MX")}` : ""}</p>
                <p className="text-[var(--panel-tinta-media)]">Mover a <strong className="text-[var(--panel-tinta)]">{g.mover.clientes.join(", ")}</strong> ({g.mover.personas} pax) del <Link href={enc(g.mover.clave)} className="panel-foco font-semibold text-[var(--panel-acento)] hover:underline">{diaC(g.mover.fecha)}</Link> al <Link href={enc(g.hacia.clave)} className="panel-foco font-semibold text-[var(--panel-acento)] hover:underline">{diaC(g.hacia.fecha)}</Link>, con {g.hacia.clientes.join(", ")} ({g.hacia.personas} pax).</p>
                {!g.ahorro && <p className="text-[12px] text-[var(--panel-tinta-suave)]">Captura los costos fijos del tour en el Cotizador para ver cuánto se ahorra.</p>}
                {g.avisos.map((a, i) => <p key={i} className="text-[12px] text-[var(--panel-atencion)]">{a}</p>)}
                <p className="mt-1 text-[12px] text-[var(--panel-tinta-suave)]">{yaTareas.has(`agrupar-salidas:${g.mover.clave}>${g.hacia.clave}`) ? "✓ Ya está en Seguimientos para Erick." : "Se le deja a Erick en Seguimientos en la siguiente vuelta del reloj."}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PreguntarClient />

      <ReporteClient semanaActual={lunesDe(hoyMX())} puedeCambiar={sesion?.rol === "dueno"} semana={ultimoReporte?.semana ?? null}
        hallazgos={hallazgos.map(h => ({ id: h.id, tipo: h.tipo, titulo: h.titulo, evidencia: h.evidencia, frecuencia: h.frecuencia, impacto: h.impacto, solucion: h.solucion, responsable: h.responsable, estado: h.estado }))} />

      <section className="panel-card overflow-hidden">
        <h2 className="px-4 pt-4 font-cormorant text-[22px] text-[var(--panel-tinta)]">Últimas propuestas</h2>
        {ultimas.length === 0 ? <p className="p-4 text-[13px] font-dm text-[var(--panel-tinta-media)]">Todavía no hay. Se piden con ✨ en la Bandeja.</p> : (
          <ul className="mt-2 divide-y divide-[var(--panel-borde)]">
            {ultimas.map(p => (
              <li key={p.id} className="px-4 py-3 text-[13px] font-dm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`font-semibold ${p.estado === "aprobada" ? "text-[var(--panel-bien)]" : p.estado === "rechazada" ? "text-[var(--panel-problema)]" : "text-[var(--panel-tinta-media)]"}`}>{ETIQUETA[p.estado] ?? p.estado}{p.decididoPor ? ` · ${p.decididoPor}` : ""}</span>
                  <span className="text-[11.5px] text-[var(--panel-tinta-suave)]">{p.createdAt.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[var(--panel-tinta)]">{p.borrador}</p>
                {p.motivo && <p className="mt-1 text-[12px] text-[var(--panel-problema)]">Motivo: {p.motivo}</p>}
                {p.estado === "editada" && p.textoFinal && <p className="mt-1 line-clamp-2 text-[12px] text-[var(--panel-tinta-media)]">Se mandó: {p.textoFinal}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
