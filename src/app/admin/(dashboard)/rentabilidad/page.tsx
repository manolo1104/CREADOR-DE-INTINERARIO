import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hoyMX } from "@/lib/dates";
import { datosRentabilidad } from "@/lib/admin/rentabilidad";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { TarjetaKpi } from "@/components/admin/ui/TarjetaKpi";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rentabilidad — Admin" };

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Rentabilidad del mes (rediseño, 3 nov 2026): margen por tour, salidas por
 * tamaño y canal. Reemplazará a Ventas y Análisis cuando tenga todo lo de ellas.
 */
export default async function RentabilidadPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mes ?? "") ? (searchParams.mes as string) : hoyMX().slice(0, 7);
  const d = await datosRentabilidad(mes);
  const nav = (m: string, aria: string, Icono: typeof ChevronLeft) => (
    <Link href={`/admin/rentabilidad?mes=${m}`} aria-label={aria} className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white text-[var(--panel-tinta)]"><Icono className="h-4 w-4" aria-hidden="true" /></Link>
  );
  const maxTam = Math.max(1, ...d.porTamano.map(t => t.salidas));

  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Rentabilidad" subtitulo={`${d.etiqueta} · operación por fecha de tour, canal por fecha de captura`} nueva
        acciones={<div className="flex items-center gap-2">{nav(d.mesAnterior, "Mes anterior", ChevronLeft)}<span className="min-w-[150px] text-center font-cormorant text-xl capitalize text-[var(--panel-tinta)]">{d.etiqueta}</span>{nav(d.mesSiguiente, "Mes siguiente", ChevronRight)}</div>} />

      {d.salidas === 0 ? (
        <EstadoVacio titulo="Sin salidas este mes" texto="No hay reservas con tour en este mes. Las cifras salen solas de las reservas y de los costos del Cotizador." accion={{ href: "/admin/calendario", etiqueta: "Ver el calendario" }} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TarjetaKpi etiqueta="Margen de contribución" area="Dinero" valor={d.margenPct === null ? "—" : `${d.margenPct} %`}
              contexto={d.margenPct === null ? "Ninguna salida con costos capturados" : `${fmx(d.margen)} sobre ${fmx(d.ingresoConCostos)} con costos · meta 35 %`}
              estado={d.margenPct === null ? { tono: "neutro", texto: "Faltan costos" } : d.margenPct >= 35 ? { tono: "bien", texto: "En meta" } : d.margenPct >= 30 ? { tono: "atencion", texto: "Cerca de meta" } : { tono: "problema", texto: "Debajo de meta" }} />
            <TarjetaKpi etiqueta="Personas por salida" area="Operación" valor={String(d.paxPorSalida)} contexto={`${d.personas} personas en ${d.salidas} salidas · meta 3.5`}
              estado={d.paxPorSalida >= 3.5 ? { tono: "bien", texto: "En meta" } : d.paxPorSalida >= 3 ? { tono: "atencion", texto: "Cerca de meta" } : { tono: "problema", texto: "Debajo de meta" }} />
            <TarjetaKpi etiqueta="Salidas bajo mínimo" area="Operación" valor={String(d.bajoMinimo)} contexto={`de ${d.regulares} salidas regulares con 2 personas o menos · meta 3 o menos al mes`}
              estado={d.bajoMinimo <= 3 ? { tono: "bien", texto: "En meta" } : { tono: "atencion", texto: "Arriba de meta" }} />
            <TarjetaKpi etiqueta="Tours con costos" area="Dinero" valor={`${d.toursConCostos} de ${d.toursTotal}`} contexto="Sin costos el margen es un techo, no un resultado"
              estado={d.toursConCostos === d.toursTotal ? { tono: "bien", texto: "Completo" } : { tono: "atencion", texto: "Capturar en el Cotizador" }} />
          </div>

          <section className="panel-card mt-5 overflow-hidden">
            <h2 className="px-4 pt-4 font-cormorant text-[22px] text-[var(--panel-tinta)]">Por tour</h2>
            <div className="overflow-x-auto">
              <table className="panel-tabla w-full min-w-[720px] text-[13px] font-dm">
                <thead><tr><th className="px-4 py-2 text-left">Tour</th><th className="px-2 py-2 text-right">Salidas</th><th className="px-2 py-2 text-right">Pax</th><th className="px-2 py-2 text-right">Pax/salida</th><th className="px-2 py-2 text-right">Ingreso</th><th className="px-2 py-2 text-right">Margen</th><th className="px-2 py-2 text-right">%</th><th className="px-4 py-2 text-left">Nota</th></tr></thead>
                <tbody>
                  {d.porTour.map(t => (
                    <tr key={t.slug}>
                      <td className="px-4 py-2"><span className="mr-2 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: colorDeTour(t.slug), background: colorDeTour(t.slug) + "1f" }}>{t.codigo}</span>{t.nombre}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{t.salidas}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{t.personas}</td>
                      <td className={`panel-cifra px-2 py-2 text-right ${!t.aMedida && t.paxPorSalida < 3 ? "text-[var(--panel-atencion)]" : ""}`}>{t.paxPorSalida}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{fmx(t.ingreso)}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{t.margen === null ? "—" : fmx(t.margen)}</td>
                      <td className={`panel-cifra px-2 py-2 text-right ${t.margenPct !== null && t.margenPct < 30 ? "text-[var(--panel-atencion)]" : ""}`}>{t.margenPct === null ? "—" : `${t.margenPct} %`}</td>
                      <td className="px-4 py-2 text-[12px] text-[var(--panel-tinta-media)]">{t.aMedida ? "A medida: sin meta de personas" : t.conCostos ? "" : <Link href="/admin/cotizador" className="panel-foco font-medium text-[var(--panel-acento)] hover:underline">Capturar costos</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="panel-card p-4">
              <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Salidas regulares por tamaño</h2>
              <p className="text-[12px] font-dm text-[var(--panel-tinta-media)]">Con 2 personas o menos el costo fijo pesa igual que con 8: el margen lo hace el tamaño del grupo.</p>
              <div className="mt-3 space-y-2">
                {d.porTamano.map(t => (
                  <div key={t.etiqueta} className="grid grid-cols-[80px_minmax(0,1fr)_32px] items-center gap-3 text-[13px] font-dm">
                    <span>{t.etiqueta}</span>
                    <div className="h-6 overflow-hidden rounded-md bg-[var(--panel-fondo-velo)]"><div className="h-6 rounded-md" style={{ width: `${(t.salidas / maxTam) * 100}%`, background: t.etiqueta === "1 persona" || t.etiqueta === "2" ? "var(--panel-atencion)" : "var(--panel-bien)" }} /></div>
                    <span className="panel-cifra text-right">{t.salidas}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel-card overflow-hidden">
              <h2 className="px-4 pt-4 font-cormorant text-[22px] text-[var(--panel-tinta)]">Por canal</h2>
              <p className="px-4 text-[12px] font-dm text-[var(--panel-tinta-media)]">Reservas capturadas en el mes. Comisión: OTA 25 % (estimada hasta tener los contratos), web lo de Stripe.</p>
              <table className="panel-tabla mt-2 w-full text-[13px] font-dm">
                <thead><tr><th className="px-4 py-2 text-left">Canal</th><th className="px-2 py-2 text-right">Reservas</th><th className="px-2 py-2 text-right">Cobrado</th><th className="px-2 py-2 text-right">Comisión</th><th className="px-4 py-2 text-right">Neto</th></tr></thead>
                <tbody>
                  {d.porCanal.map(c => (
                    <tr key={c.canal}>
                      <td className="px-4 py-2">{c.etiqueta}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{c.reservas}</td>
                      <td className="panel-cifra px-2 py-2 text-right">{fmx(c.cobrado)}</td>
                      <td className="panel-cifra px-2 py-2 text-right text-[var(--panel-tinta-media)]">{c.comisionPct ? `${fmx(c.comision)} (${Math.round(c.comisionPct * 1000) / 10} %)` : "—"}</td>
                      <td className="panel-cifra px-4 py-2 text-right">{fmx(c.neto)}</td>
                    </tr>
                  ))}
                  {d.porCanal.length === 0 && <tr><td colSpan={5} className="px-4 py-3 text-[var(--panel-tinta-media)]">Sin reservas capturadas este mes.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
