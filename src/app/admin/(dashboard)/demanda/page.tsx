import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { medirDemanda } from "@/lib/admin/indicadores/demanda";
import { formatear } from "@/lib/admin/indicadores/estado";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { AvisoFuente, Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { haceCuanto } from "@/lib/admin/bandeja";

export const dynamic = "force-dynamic";
export const metadata = { title: "Web y canales — Admin" };

const PAGINA = PAGINA_FRENTE.demanda;
const n = (x: number | null | undefined) => (x === null || x === undefined ? "—" : x.toLocaleString("es-MX"));

/**
 * Demanda y canales (4 nov 2026): de dónde llega la gente, cuántos dejan un
 * contacto y en qué páginas. GA4 conectado al panel (antes solo se veía en
 * GA4) + el cruce con lo que guarda el propio panel. Por omisión 28 días: es
 * el periodo de la línea base del documento.
 */
export default async function DemandaPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "28d", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirDemanda(periodo, periodos, hoy);
  const d = m.detalle;
  const totalSecciones = d.secciones.reduce((t, s) => t + s.vistas, 0);
  const maxEmbudo = Math.max(1, d.embudo?.venTour ?? 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Web y canales" nueva
        subtitulo="De dónde llega la gente, cuántos dejan un contacto y qué páginas lo provocan. Fuente: GA4 y el panel." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />
      {!d.ga4Ok && <AvisoFuente titulo="GA4 no contestó" texto={d.ga4Motivo ?? ""} />}

      <RejillaIndicadores defs={kpisDe("demanda")} valores={m.valores} series={m.series} periodo={periodo.tipo} />
      {d.leidoEn && <p className="mt-2 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">GA4 leído {haceCuanto(d.leidoEn)} · se vuelve a leer cada 3 horas (lo de semanas pasadas, cada mes).</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Canales" descripcion="Sesiones por canal y qué tanto contactan. «Contactos» = WhatsApp + formularios + compras.">
          <table className="panel-tabla w-full min-w-[460px] text-[13px] font-dm">
            <thead><tr><th className={th}>Canal</th><th className={thR}>Sesiones</th><th className={thR}>% del total</th><th className={thR}>Contactos</th><th className={thR}>Tasa</th></tr></thead>
            <tbody>
              {d.canales.map(c => (
                <tr key={c.canal}><td className={td}>{c.etiqueta}</td><td className={tdR}>{n(c.sesiones)}</td><td className={tdR}>{c.pct === null ? "—" : `${c.pct} %`}</td><td className={tdR}>{n(c.contactos)}</td><td className={tdR}>{c.tasa === null ? "—" : `${c.tasa} %`}</td></tr>
              ))}
              {!d.canales.length && <tr><td className={td} colSpan={5}>Sin datos de GA4.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Contactos por sección" descripcion="Contactos por WhatsApp por cada 1,000 vistas. Meta: Blog 6 · Tours 40. El documento pide al menos 1,000 vistas para juzgar una sección.">
          <table className="panel-tabla w-full min-w-[460px] text-[13px] font-dm">
            <thead><tr><th className={th}>Sección</th><th className={thR}>Vistas</th><th className={thR}>% vistas</th><th className={thR}>WhatsApp</th><th className={thR}>Formularios</th><th className={thR}>Por 1,000</th></tr></thead>
            <tbody>
              {d.secciones.filter(s => s.vistas > 0).map(s => (
                <tr key={s.seccion}>
                  <td className={td}>{s.etiqueta}</td><td className={tdR}>{n(s.vistas)}</td>
                  <td className={tdR}>{totalSecciones ? `${Math.round((s.vistas / totalSecciones) * 100)} %` : "—"}</td>
                  <td className={tdR}>{n(s.whatsapp)}</td><td className={tdR}>{n(s.formularios)}</td>
                  <td className={`${tdR} font-semibold`}>{formatear("porMil", s.porMil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloque>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Páginas que más contactos generan" descripcion="Ranking de contactos (WhatsApp + formularios) por página, con sus vistas.">
          <table className="panel-tabla w-full min-w-[460px] text-[13px] font-dm">
            <thead><tr><th className={th}>Página</th><th className={thR}>WhatsApp</th><th className={thR}>Formularios</th><th className={thR}>Vistas</th></tr></thead>
            <tbody>
              {d.paginas.map(p => (
                <tr key={p.path}><td className={`${td} max-w-[280px] truncate`} title={p.path}>{p.path}</td><td className={tdR}>{n(p.whatsapp)}</td><td className={tdR}>{n(p.formularios)}</td><td className={tdR}>{n(p.vistas)}</td></tr>
              ))}
              {!d.paginas.length && <tr><td className={td} colSpan={4}>Sin contactos en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Embudo del pago en línea" descripcion="Personas que ven un tour → inician el pago → compras. Es el objetivo 3 del documento: «que el pago en línea funcione».">
          {d.embudo ? (
            <div className="space-y-2.5 px-4 pb-4">
              {[["Ven un tour", d.embudo.venTour], ["Inician el pago", d.embudo.inicianPago], ["Compran", d.embudo.compras]].map(([etq, v], i, arr) => (
                <div key={etq as string}>
                  <div className="flex justify-between text-[12.5px] font-dm"><span>{etq}</span>
                    <span className="panel-cifra font-semibold">{n(v as number)}{i > 0 && (arr[i - 1][1] as number) > 0 ? <span className="ml-2 font-normal text-[var(--panel-tinta-suave)]">{Math.round(((v as number) / (arr[i - 1][1] as number)) * 100)} % del paso anterior</span> : null}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-[var(--panel-fondo-velo)]"><div className="h-2.5 rounded-full bg-[var(--panel-acento)]" style={{ width: `${Math.max(1.5, ((v as number) / maxEmbudo) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="px-4 pb-4 text-[13px] font-dm text-[var(--panel-tinta-media)]">Sin datos de GA4.</p>}
        </Bloque>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Cruce de fuentes" descripcion="Para saber si la medición es confiable (semana 2 del plan): las compras de GA4 deben coincidir con las reservas web, y el WhatsApp de GA4 con los clics del panel (diferencia de menos de 20 %).">
          <table className="panel-tabla w-full text-[13px] font-dm">
            <thead><tr><th className={th}>Qué</th><th className={thR}>GA4</th><th className={thR}>Panel</th><th className={th}>Estado</th></tr></thead>
            <tbody>
              <tr>
                <td className={td}>Compras / reservas web</td><td className={tdR}>{n(d.cruce.comprasGa4)}</td><td className={tdR}>{n(d.cruce.reservasWeb)}</td>
                <td className={td}>{d.cruce.comprasGa4 === null ? <ChipEstado tono="neutro">Sin GA4</ChipEstado> : d.cruce.comprasGa4 === d.cruce.reservasWeb ? <ChipEstado tono="bien">Cuadra</ChipEstado> : <ChipEstado tono="atencion">No cuadra</ChipEstado>}</td>
              </tr>
              <tr>
                <td className={td}>Contactos por WhatsApp</td><td className={tdR}>{n(d.cruce.whatsappGa4)}</td><td className={tdR}>{n(d.cruce.clicsPanel)}</td>
                <td className={td}>{d.cruce.diferenciaPct === null ? <ChipEstado tono="neutro">Sin GA4</ChipEstado> : Math.abs(d.cruce.diferenciaPct) < 20 ? <ChipEstado tono="bien">{`Difiere ${d.cruce.diferenciaPct} %`}</ChipEstado> : <ChipEstado tono="atencion">{`Difiere ${d.cruce.diferenciaPct} %`}</ChipEstado>}</td>
              </tr>
            </tbody>
          </table>
          <p className="px-4 pb-3 pt-1 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">El panel cuenta un poco más: GA4 no ve a quien bloquea el rastreo o rechaza las cookies.</p>
        </Bloque>

        <Bloque titulo="Qué buscan en el sitio" descripcion="Del buscador del inicio y de «ver disponibilidad»: para qué mes de viaje buscan, con cuánta anticipación y cuántos se quedaron sin lugar.">
          <div className="grid grid-cols-3 gap-3 px-4 pb-2">
            <div><p className="panel-eyebrow">Búsquedas</p><p className="panel-cifra text-[22px] font-dm font-semibold">{n(d.busquedas.total)}</p></div>
            <div><p className="panel-eyebrow">Anticipación</p><p className="panel-cifra text-[22px] font-dm font-semibold">{d.busquedas.anticipacionMediana === null ? "—" : `${d.busquedas.anticipacionMediana} d`}</p></div>
            <div><p className="panel-eyebrow">Sin lugar</p><p className="panel-cifra text-[22px] font-dm font-semibold">{n(d.busquedas.sinLugar)}</p></div>
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {d.busquedas.porMes.map(x => <span key={x.mes} className="rounded-full bg-[var(--panel-fondo-velo)] px-2.5 py-1 text-[12px] font-dm">{x.mes}: <span className="panel-cifra font-semibold">{x.n}</span></span>)}
            {!d.busquedas.porMes.length && <span className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Nadie buscó con fecha en el periodo.</span>}
            {d.busquedas.personasProm !== null && <span className="text-[12px] font-dm text-[var(--panel-tinta-media)]">· {d.busquedas.personasProm} personas en promedio</span>}
          </div>
        </Bloque>
      </div>

      {d.gsc && (
        <Bloque titulo="Búsquedas en Google (demanda del mercado)" descripcion="Cuánta gente vio el sitio en Google (impresiones) y cuántos entraron (clics). Sirve para leer la temporada con tasas: si las impresiones suben igual que las sesiones, subió el mercado, no la web. Search Console publica con 2–3 días de retraso.">
          {d.gsc.ok ? (
            <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="grid grid-cols-2 gap-3">
                {[["Impresiones", n(d.gsc.actual.impresiones), d.gsc.anterior?.impresiones], ["Clics", n(d.gsc.actual.clics), d.gsc.anterior?.clics]].map(([etq, val, ant]) => (
                  <div key={etq as string}><p className="panel-eyebrow">{etq}</p><p className="panel-cifra text-[22px] font-dm font-semibold">{val}</p>
                    {typeof ant === "number" && ant > 0 && <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">antes {n(ant)}</p>}</div>
                ))}
                <div><p className="panel-eyebrow">CTR</p><p className="panel-cifra text-[22px] font-dm font-semibold">{d.gsc.actual.ctr} %</p></div>
                <div><p className="panel-eyebrow">Posición media</p><p className="panel-cifra text-[22px] font-dm font-semibold">{d.gsc.actual.posicion}</p></div>
              </div>
              <table className="panel-tabla w-full text-[12.5px] font-dm">
                <thead><tr><th className={th}>Lo que buscan</th><th className={thR}>Impresiones</th><th className={thR}>Clics</th><th className={thR}>Posición</th></tr></thead>
                <tbody>{d.gsc.actual.consultas.map(q => <tr key={q.consulta}><td className={td}>{q.consulta}</td><td className={tdR}>{n(q.impresiones)}</td><td className={tdR}>{n(q.clics)}</td><td className={tdR}>{q.posicion}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="px-4 pb-4 text-[13px] font-dm text-[var(--panel-tinta-media)]">{d.gsc.motivo}</p>}
        </Bloque>
      )}
    </div>
  );
}
