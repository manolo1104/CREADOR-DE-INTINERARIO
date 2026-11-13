import Link from "next/link";
import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { medirServicio } from "@/lib/admin/indicadores/servicio";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";

export const dynamic = "force-dynamic";
export const metadata = { title: "Experiencia — Admin" };

const PAGINA = PAGINA_FRENTE.servicio;

/**
 * Servicio (4 nov 2026): si el cliente queda contento, lo dice y regresa.
 * Reseñas de Google (lectura a mano), encuesta propia (NPS) y recompra.
 */
export default async function ExperienciaPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "mes", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirServicio(periodo, periodos, hoy);
  const d = m.detalle;
  const g = d.google;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Experiencia del cliente" nueva
        subtitulo="Si quedan contentos, si lo dicen en Google y si regresan. Fuente: lectura de Google, encuesta y reservas." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />
      {(g.diasDesdeLectura === null || g.diasDesdeLectura > 7) && (
        <div className="panel-card mb-5 border-l-4 border-l-[var(--panel-atencion)] px-4 py-3 text-[13px] font-dm">
          <b className="text-[var(--panel-atencion)]">Falta la lectura de Google de esta semana.</b>{" "}
          <span className="text-[var(--panel-tinta-media)]">Sin ella el KPI de reseñas no se puede medir. </span>
          <Link className="underline" href="/admin/resenas">Anotarla en Reseñas →</Link>
        </div>
      )}

      <RejillaIndicadores defs={kpisDe("servicio")} valores={m.valores} series={m.series} periodo={periodo.tipo} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Google" descripcion={g.actual ? `Hoy: ${g.actual.rating} ★ con ${g.actual.total} reseñas (lectura del ${g.actual.fecha}).` : "Aún no hay lecturas anotadas."}>
          <table className="panel-tabla w-full min-w-[360px] text-[13px] font-dm">
            <thead><tr><th className={th}>Lectura</th><th className={thR}>Calificación</th><th className={thR}>Reseñas</th><th className={th}>Anotó</th></tr></thead>
            <tbody>
              {g.historial.map(x => <tr key={x.fecha}><td className={td}>{x.fecha}</td><td className={tdR}>{x.rating}</td><td className={tdR}>{x.total}</td><td className={td}>{x.por}</td></tr>)}
              {!g.historial.length && <tr><td className={td} colSpan={4}><Link className="underline" href="/admin/resenas">Anota la primera lectura en Reseñas</Link>.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Recomendación (encuesta)" descripcion="«¿Nos recomendarías?» de 0 a 10: 9–10 promotores, 7–8 pasivos, 0–6 detractores. El NPS vale cuando contesta al menos el 30 %.">
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <ChipEstado tono="bien">{`Promotores: ${d.nps.promotores}`}</ChipEstado>
            <ChipEstado tono="neutro">{`Pasivos: ${d.nps.pasivos}`}</ChipEstado>
            <ChipEstado tono="problema">{`Detractores: ${d.nps.detractores}`}</ChipEstado>
            <span className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
              {d.nps.contestadas} encuesta{d.nps.contestadas === 1 ? "" : "s"} contestada{d.nps.contestadas === 1 ? "" : "s"}{d.nps.promedioEstrellas !== null ? ` · ${d.nps.promedioEstrellas} ★ en promedio` : ""}
            </span>
          </div>
          <p className="px-4 pb-4 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
            Llegaron por recomendación: <b className="panel-cifra">{d.recomendacion.porRecomendacion}</b> de {d.recomendacion.checkins} check-ins del periodo. Los comentarios uno por uno están en <Link className="underline" href="/admin/resenas">Reseñas</Link>.
          </p>
        </Bloque>
      </div>
    </div>
  );
}
