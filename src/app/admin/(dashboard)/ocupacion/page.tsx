import Link from "next/link";
import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { medirOperacion } from "@/lib/admin/indicadores/operacion";
import { etiquetaSemana } from "@/lib/admin/corteSemanal";
import { etiquetaGravedad, etiquetaTipo } from "@/lib/admin/incidencias";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { CodigoTour } from "@/components/admin/CodigoTour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ocupación — Admin" };

const PAGINA = PAGINA_FRENTE.operacion;
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const ESTADO_CORTE = {
  "a-tiempo": { tono: "bien", texto: "A tiempo" },
  tarde: { tono: "atencion", texto: "Tarde" },
  borrador: { tono: "atencion", texto: "Solo borrador" },
  falta: { tono: "problema", texto: "Falta" },
} as const;

/**
 * Operación (4 nov 2026): qué tan llenas salen las salidas, si se prepararon
 * (checklist), qué falló (incidencias) y si el corte se cerró a tiempo.
 */
export default async function OcupacionPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "semana", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirOperacion(periodo, periodos, hoy);
  const d = m.detalle;
  const maxPax = Math.max(4, ...d.semanas.map(s => s.paxPorSalida ?? 0));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Ocupación y cumplimiento" nueva
        subtitulo="Qué tan llenas salen las salidas, si se prepararon, qué falló y si el corte se cerró a tiempo." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />

      <RejillaIndicadores defs={kpisDe("operacion")} valores={m.valores} series={m.series} periodo={periodo.tipo} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Personas por salida, periodo a periodo" descripcion="Meta 3.5 al 31 ene y 4 en Semana Santa. La línea marca 3.5.">
          <div className="px-4 pb-4">
            <div className="relative flex h-32 items-end gap-2">
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--panel-bien)]" style={{ bottom: `${(3.5 / maxPax) * 100}%` }} aria-hidden />
              {d.semanas.map((s, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="panel-cifra text-[11px] font-dm text-[var(--panel-tinta-media)]">{s.paxPorSalida ?? "—"}</span>
                  <div className={`w-full rounded-t-[3px] ${i === d.semanas.length - 1 ? "bg-[var(--panel-acento)]" : "bg-[rgba(31,59,45,0.25)]"}`} style={{ height: `${((s.paxPorSalida ?? 0) / maxPax) * 96}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">{d.semanas.map((s, i) => <span key={i} className="flex-1 text-center text-[10.5px] font-dm text-[var(--panel-tinta-suave)]">{s.corta}<br />{s.salidas} sal.{s.bajoMinimo ? ` · ${s.bajoMinimo}⚠︎` : ""}</span>)}</div>
          </div>
        </Bloque>

        <Bloque titulo="Próximas salidas bajo mínimo" descripcion="Salidas regulares de los próximos 14 días con 2 personas o menos: conviene llenarlas o juntarlas (Agente → Juntar salidas).">
          <table className="panel-tabla w-full min-w-[420px] text-[13px] font-dm">
            <thead><tr><th className={th}>Fecha</th><th className={th}>Tour</th><th className={thR}>Personas</th></tr></thead>
            <tbody>
              {d.proximasBajoMinimo.map(s => (
                <tr key={s.clave}>
                  <td className={td}><Link className="panel-foco underline decoration-[var(--panel-borde-fuerte)] underline-offset-2" href={`/admin/salidas-dia/${encodeURIComponent(s.clave)}`}>{s.fecha}</Link></td>
                  <td className={td}><CodigoTour slug={s.clave.split("|")[1] ?? ""} className="mr-1.5" />{s.tourNombre}</td>
                  <td className={tdR}>{s.personas}</td>
                </tr>
              ))}
              {!d.proximasBajoMinimo.length && <tr><td className={td} colSpan={3}>✅ Ninguna en los próximos 14 días.</td></tr>}
            </tbody>
          </table>
        </Bloque>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Cortes semanales" descripcion="A tiempo = el corte se hizo a más tardar el lunes siguiente (lo dice la Bitácora). Desde la semana del 19 oct.">
          <table className="panel-tabla w-full min-w-[440px] text-[13px] font-dm">
            <thead><tr><th className={th}>Semana</th><th className={th}>Estado</th><th className={thR}>Ventas</th><th className={thR}>Utilidad</th><th className={thR}>Margen</th></tr></thead>
            <tbody>
              {d.cortes.map(c => (
                <tr key={c.semana}>
                  <td className={td}><Link className="panel-foco underline decoration-[var(--panel-borde-fuerte)] underline-offset-2" href={`/admin/cortes?semana=${c.semana}`}>{etiquetaSemana(c.semana)}</Link></td>
                  <td className={td}><ChipEstado tono={ESTADO_CORTE[c.estado].tono}>{ESTADO_CORTE[c.estado].texto}</ChipEstado></td>
                  <td className={tdR}>{c.ventas === null ? "—" : pesos(c.ventas)}</td><td className={tdR}>{c.utilidad === null ? "—" : pesos(c.utilidad)}</td>
                  <td className={tdR}>{c.ventas && c.utilidad !== null ? `${Math.round((c.utilidad / c.ventas) * 100)} %` : "—"}</td>
                </tr>
              ))}
              {!d.cortes.length && <tr><td className={td} colSpan={5}>Sin semanas terminadas en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Incidencias del periodo" descripcion="Se anotan en la pantalla de cada salida (Salidas del día → la salida → Incidencias). El guía también puede.">
          <table className="panel-tabla w-full min-w-[480px] text-[13px] font-dm">
            <thead><tr><th className={th}>Salida</th><th className={th}>Tipo</th><th className={th}>Qué pasó</th><th className={th}>Acción</th></tr></thead>
            <tbody>
              {d.incidencias.map(i => (
                <tr key={i.id}>
                  <td className={`${td} whitespace-nowrap`}><Link className="panel-foco underline decoration-[var(--panel-borde-fuerte)] underline-offset-2" href={`/admin/salidas-dia/${encodeURIComponent(i.clave)}`}>{i.fecha}</Link> <CodigoTour slug={i.clave.split("|")[1] ?? ""} /></td>
                  <td className={td}>{etiquetaTipo(i.tipo)}<br /><ChipEstado tono={i.gravedad === "grave" ? "problema" : i.gravedad === "media" ? "atencion" : "neutro"}>{etiquetaGravedad(i.gravedad)}</ChipEstado></td>
                  <td className={td}>{i.causa}</td><td className={td}>{i.accion || "—"}</td>
                </tr>
              ))}
              {!d.incidencias.length && <tr><td className={td} colSpan={4}>Ninguna incidencia anotada.</td></tr>}
            </tbody>
          </table>
        </Bloque>
      </div>
    </div>
  );
}
