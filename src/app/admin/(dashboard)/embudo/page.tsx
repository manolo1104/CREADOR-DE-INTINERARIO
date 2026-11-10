import Link from "next/link";
import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { medirComercial } from "@/lib/admin/indicadores/comercial";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";

export const dynamic = "force-dynamic";
export const metadata = { title: "Embudo comercial — Admin" };

const PAGINA = PAGINA_FRENTE.comercial;
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Comercial (4 nov 2026): del lead a la reserva. Por COHORTE: los leads que
 * entraron en el periodo y qué pasó con ellos (así se midió la base: 23 de 76).
 * El scorecard de Inicio usa las mismas fórmulas.
 */
export default async function EmbudoPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "semana", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirComercial(periodo, periodos, hoy);
  const d = m.detalle;
  const maxEmbudo = Math.max(1, ...d.embudo.map(e => e.n));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Embudo comercial" nueva
        subtitulo="Del primer mensaje a la reserva: respuesta, cotización, seguimiento y cobro. Fuente: CRM, Bandeja y reservas." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />
      {d.preliminar && (
        <p className="mb-4 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
          ⏳ Este periodo terminó hace menos de 14 días: las conversiones todavía pueden subir (por eso dicen «Preliminar»).
        </p>
      )}

      <RejillaIndicadores defs={kpisDe("comercial")} valores={m.valores} series={m.series} periodo={periodo.tipo} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Embudo de los leads del periodo" descripcion={`Leads que entraron ${periodo.tipo === "semana" ? "esta semana" : "en el periodo"} y hasta dónde llegaron en los 14 días siguientes. «Reservaron» = reserva con dinero cobrado. No cuentan los que nacieron de una reserva ni los importados.${d.leadsRevision !== null ? ` La revisión del jueves contó ${d.leadsRevision} leads; el CRM tiene ${d.leadsCrm}.` : ""}`}>
          <div className="space-y-2.5 px-4 pb-4">
            {d.embudo.map(e => (
              <div key={e.etiqueta}>
                <div className="flex justify-between text-[12.5px] font-dm"><span>{e.etiqueta}</span>
                  <span className="panel-cifra font-semibold">{e.n}{e.conversion !== null && <span className="ml-2 font-normal text-[var(--panel-tinta-suave)]">{e.conversion} % del paso anterior</span>}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-[var(--panel-fondo-velo)]"><div className="h-2.5 rounded-full bg-[var(--panel-acento)]" style={{ width: `${Math.max(1.5, (e.n / maxEmbudo) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </Bloque>

        <Bloque titulo="Por responsable" descripcion="Leads del periodo por quien los lleva: base para el incentivo ligado a conversión.">
          <table className="panel-tabla w-full min-w-[420px] text-[13px] font-dm">
            <thead><tr><th className={th}>Responsable</th><th className={thR}>Leads</th><th className={thR}>Cotizados</th><th className={thR}>Reservaron</th><th className={thR}>Lead → reserva</th></tr></thead>
            <tbody>
              {d.porResponsable.map(r => <tr key={r.responsable}><td className={td}>{r.responsable}</td><td className={tdR}>{r.leads}</td><td className={tdR}>{r.cotizados}</td><td className={tdR}>{r.reservaron}</td><td className={`${tdR} font-semibold`}>{r.tasa === null ? "—" : `${r.tasa} %`}</td></tr>)}
              {!d.porResponsable.length && <tr><td className={td} colSpan={5}>Sin leads en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>
      </div>

      <Bloque titulo="De la web a la reserva" descripcion={`Leads del periodo que escribieron desde un botón del sitio: el código del mensaje dice en qué página tocaron WhatsApp y de dónde llegó su visita. ${d.web.conOrigen} de ${d.leadsCrm} leads con origen web.`}>
        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
          {[["Por canal de la visita", d.web.porCanal], ["Por sección donde tocaron WhatsApp", d.web.porSeccion]].map(([titulo, filas]) => (
            <table key={titulo as string} className="panel-tabla w-full text-[13px] font-dm">
              <thead><tr><th className={th}>{titulo as string}</th><th className={thR}>Leads</th><th className={thR}>Cotizados</th><th className={thR}>Reservaron</th></tr></thead>
              <tbody>
                {(filas as typeof d.web.porCanal).map(f => <tr key={f.clave}><td className={td}>{f.etiqueta}</td><td className={tdR}>{f.leads}</td><td className={tdR}>{f.cotizados}</td><td className={`${tdR} font-semibold`}>{f.reservaron}</td></tr>)}
                {!(filas as typeof d.web.porCanal).length && <tr><td className={td} colSpan={4}>Todavía sin leads con código en el periodo.</td></tr>}
              </tbody>
            </table>
          ))}
        </div>
      </Bloque>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Por qué se pierden" descripcion={`${d.perdidos} lead${d.perdidos === 1 ? "" : "s"} marcado${d.perdidos === 1 ? "" : "s"} como perdido${d.perdidos === 1 ? "" : "s"} en el periodo.`}>
          <table className="panel-tabla w-full text-[13px] font-dm">
            <thead><tr><th className={th}>Motivo</th><th className={thR}>Leads</th></tr></thead>
            <tbody>
              {d.motivos.filter(x => x.n > 0).map(x => <tr key={x.clave}><td className={td}>{x.etiqueta}</td><td className={tdR}>{x.n}</td></tr>)}
              {!d.motivos.some(x => x.n > 0) && <tr><td className={td} colSpan={2}>Ningún lead perdido en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Saldos vencidos hoy" descripcion="Reservas cuyo tour ya pasó y todavía deben. Meta: $0. Si ya se cobraron, regístralo en Cobros.">
          <table className="panel-tabla w-full min-w-[420px] text-[13px] font-dm">
            <thead><tr><th className={th}>Folio</th><th className={th}>Cliente</th><th className={th}>Último día</th><th className={thR}>Saldo</th></tr></thead>
            <tbody>
              {d.saldos.slice(0, 12).map(s => (
                <tr key={s.folio}>
                  <td className={td}><Link className="panel-foco underline decoration-[var(--panel-borde-fuerte)] underline-offset-2" href={`/admin/reservas?folio=${encodeURIComponent(s.folio)}&cobrar=1`}>{s.folio}</Link></td>
                  <td className={td}>{s.cliente}</td><td className={td}>{s.ultimoDia}</td><td className={`${tdR} font-semibold`}>{pesos(s.saldo)}</td>
                </tr>
              ))}
              {!d.saldos.length && <tr><td className={td} colSpan={4}>✅ Sin saldos vencidos.</td></tr>}
            </tbody>
          </table>
        </Bloque>
      </div>
    </div>
  );
}
