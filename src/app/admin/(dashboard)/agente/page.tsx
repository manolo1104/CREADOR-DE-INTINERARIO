import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { configAgente, gastoDelMes } from "@/lib/admin/agente/claude";
import { MODELO_EXTRAER, MODELO_RESPONDER, mesMX, usd } from "@/lib/admin/agente/costos";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { TarjetaKpi } from "@/components/admin/ui/TarjetaKpi";
import AgenteClient from "./AgenteClient";

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
  const n = (e: string) => propuestas.find(p => p.estado === e)?._count._all ?? 0;
  const decididas = n("aprobada") + n("editada") + n("rechazada");
  const pctSinCambios = decididas ? Math.round((n("aprobada") / decididas) * 100) : null;
  const pctTope = cfg.topeUsd ? Math.min(100, Math.round((gastado / cfg.topeUsd) * 100)) : 100;
  const tarea = (t: string) => porTarea.find(x => x.tarea === t);
  const sinLlave = !process.env.ANTHROPIC_API_KEY;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Agente" nueva subtitulo="Lee los chats, llena los datos del lead y propone respuestas que una persona aprueba" />
      {sinLlave && <p className="rounded-[var(--panel-radio-sm)] bg-[var(--panel-problema-fondo)] px-4 py-2 text-[13px] font-dm text-[var(--panel-problema)]">Falta la llave de Claude (ANTHROPIC_API_KEY) en este servidor: el agente no puede trabajar.</p>}

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
