import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe } from "@/lib/admin/indicadores/periodo";
import { kpisDe, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { medirPrecio } from "@/lib/admin/indicadores/precio";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { RejillaIndicadores } from "@/components/admin/ui/TarjetaIndicador";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { CodigoTour } from "@/components/admin/CodigoTour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Precios — Admin" };

const PAGINA = PAGINA_FRENTE.precio;
const pesos = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString("es-MX")}`);

/**
 * Precio (4 nov 2026). Informativo: el documento no trae metas de precio. Se
 * mide para fijarlas con datos: ¿cobramos el precio de lista?, ¿cuánto
 * regalamos en descuentos?, ¿se pierden más las cotizaciones caras?
 */
export default async function PreciosPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "90d", hoy);
  const periodos = serieDe(periodo, hoy, 8);
  const m = await medirPrecio(periodo, periodos);
  const d = m.detalle;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Precios" nueva
        subtitulo="Si cobramos el precio de lista, cuánto se va en descuentos y si el precio frena la venta. Sin metas todavía: se fijan con 4 semanas de datos." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />

      <RejillaIndicadores defs={kpisDe("precio")} valores={m.valores} series={m.series} periodo={periodo.tipo} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Por tour" descripcion="Lo vendido por persona contra el precio de lista del catálogo para ese tamaño de grupo y fecha. 100 % = se cobró la lista.">
          <table className="panel-tabla w-full min-w-[460px] text-[13px] font-dm">
            <thead><tr><th className={th}>Tour</th><th className={thR}>Personas</th><th className={thR}>Vendido/persona</th><th className={thR}>Lista/persona</th><th className={thR}>Realización</th></tr></thead>
            <tbody>
              {d.porTour.map(t => (
                <tr key={t.slug}><td className={td}><CodigoTour slug={t.slug} className="mr-1.5" />{t.nombre}</td><td className={tdR}>{t.personas}</td><td className={tdR}>{pesos(t.precioPersona)}</td><td className={tdR}>{pesos(t.listaPersona)}</td><td className={`${tdR} font-semibold`}>{t.realizacion === null ? "—" : `${t.realizacion} %`}</td></tr>
              ))}
              {!d.porTour.length && <tr><td className={td} colSpan={5}>Sin tours por persona en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Por tamaño de grupo" descripcion="¿Se aplica el precio por tamaño de grupo? Si el vendido por persona no baja con grupos grandes, el escalón no se está cobrando.">
          <table className="panel-tabla w-full min-w-[420px] text-[13px] font-dm">
            <thead><tr><th className={th}>Grupo</th><th className={thR}>Renglones</th><th className={thR}>Vendido/persona</th><th className={thR}>Lista/persona</th></tr></thead>
            <tbody>{d.porTamano.map(t => <tr key={t.etiqueta}><td className={td}>{t.etiqueta}</td><td className={tdR}>{t.lineas}</td><td className={tdR}>{pesos(t.precioPersona)}</td><td className={tdR}>{pesos(t.listaPersona)}</td></tr>)}</tbody>
          </table>
        </Bloque>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="¿El precio frena la venta?" descripcion="Cotizaciones enviadas, divididas en tercios por precio por persona, y cuántas se aceptaron. Si las caras cierran mucho menos, el precio pesa.">
          <table className="panel-tabla w-full min-w-[420px] text-[13px] font-dm">
            <thead><tr><th className={th}>Rango</th><th className={thR}>Cotizaciones</th><th className={thR}>Aceptadas</th><th className={thR}>Cierre</th></tr></thead>
            <tbody>
              {d.porRango.map(r => <tr key={r.etiqueta}><td className={td}>{r.etiqueta}</td><td className={tdR}>{r.cotizaciones}</td><td className={tdR}>{r.aceptadas}</td><td className={`${tdR} font-semibold`}>{r.tasa === null ? "—" : `${r.tasa} %`}</td></tr>)}
              {!d.porRango.length && <tr><td className={td} colSpan={4}>Hacen falta al menos 6 cotizaciones enviadas en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>

        <Bloque titulo="Ticket por canal" descripcion="Cuánto vale en promedio una reserva según por dónde entró.">
          <table className="panel-tabla w-full text-[13px] font-dm">
            <thead><tr><th className={th}>Canal</th><th className={thR}>Reservas</th><th className={thR}>Ticket</th></tr></thead>
            <tbody>
              {d.porCanal.map(c => <tr key={c.canal}><td className={td}>{c.canal}</td><td className={tdR}>{c.reservas}</td><td className={tdR}>{pesos(c.ticket)}</td></tr>)}
              {!d.porCanal.length && <tr><td className={td} colSpan={3}>Sin reservas en el periodo.</td></tr>}
            </tbody>
          </table>
        </Bloque>
      </div>
    </div>
  );
}
