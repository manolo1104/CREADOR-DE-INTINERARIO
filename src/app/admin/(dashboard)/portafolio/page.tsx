import Link from "next/link";
import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { ETIQUETA_CLASE, medirProducto, type Clase } from "@/lib/admin/indicadores/producto";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { ChipEstado, type TonoEstado } from "@/components/admin/ui/ChipEstado";
import { CodigoTour } from "@/components/admin/CodigoTour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portafolio — Admin" };

const PAGINA = PAGINA_FRENTE.producto;
const TONO_CLASE: Record<Clase, TonoEstado> = { estrella: "bien", complemento: "neutro", "a-revisar": "problema", "falta-medir": "atencion" };
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Producto (4 nov 2026): qué tours venden, cuánto deja cada uno y cuáles
 * dependen de otros. Hoy Tamul carga el negocio; la meta es medir el margen de
 * todos y empujar 2 o 3 complementos con margen medido.
 */
export default async function PortafolioPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "90d", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirProducto(periodo, periodos);
  const d = m.detalle;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Portafolio" nueva
        subtitulo="Qué tours se venden, cuánto deja cada uno y cuál conviene empujar. Reservas por fecha de captura; salidas y margen por fecha de tour." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />

      <RejillaIndicadores defs={kpisDe("producto")} valores={m.valores} series={m.series} periodo={periodo.tipo} />

      <Bloque titulo="Cada tour" descripcion={<>
        <b>Estrella</b>: margen de 30 % o más y demanda alta ({d.umbralAlta} reservas o más en el periodo). <b>A revisar</b>: margen menor a 20 % o menos de 3 reservas.{" "}
        <b>Complemento</b>: el resto. <b>Falta medir</b>: sin salidas con costos en el periodo — captura sus costos en el <Link className="underline" href="/admin/cotizador">Cotizador</Link> o en el corte.</>}>
        <table className="panel-tabla w-full min-w-[900px] text-[13px] font-dm">
          <thead><tr>
            <th className={th}>Tour</th><th className={thR}>Reservas</th><th className={thR}>Con otro tour</th><th className={thR}>Cobrado</th><th className={thR}>% cobrado</th>
            <th className={thR}>Salidas</th><th className={thR}>Pax/salida</th><th className={thR}>Margen</th><th className={th}>Costos</th><th className={th}>Clasificación</th>
          </tr></thead>
          <tbody>
            {d.tours.map(t => (
              <tr key={t.slug}>
                <td className={td}><CodigoTour slug={t.slug} className="mr-1.5" /><span title={t.nombre}>{t.nombre}</span></td>
                <td className={tdR}>{t.reservas}</td><td className={tdR}>{t.acompanado === null ? "—" : `${t.acompanado} %`}</td>
                <td className={tdR}>{pesos(t.cobrado)}</td><td className={tdR}>{t.pctCobrado === null ? "—" : `${t.pctCobrado} %`}</td>
                <td className={tdR}>{t.salidas}</td><td className={tdR}>{t.paxPorSalida ?? "—"}</td>
                <td className={`${tdR} font-semibold`}>{t.margenPct === null ? "—" : `${t.margenPct} %`}</td>
                <td className={`${td} text-[12px]`}>{t.costosCotizador ? "Cotizador ✓" : "Cotizador ✗"}{t.costosCorte ? " · corte ✓" : ""}</td>
                <td className={td}><ChipEstado tono={TONO_CLASE[t.clase]}>{ETIQUETA_CLASE[t.clase]}</ChipEstado></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>
    </div>
  );
}
