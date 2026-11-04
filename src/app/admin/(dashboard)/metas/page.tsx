import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { leerPeriodo, serieDe, hrefPeriodo } from "@/lib/admin/indicadores/periodo";
import { ETIQUETA_FRENTE, KPI, KPIS, OBJETIVOS, PAGINA_FRENTE } from "@/lib/admin/indicadores/catalogo";
import { ETIQUETA_CALIDAD, estadoContraMeta, formatear } from "@/lib/admin/indicadores/estado";
import { medirDemanda } from "@/lib/admin/indicadores/demanda";
import { medirComercial } from "@/lib/admin/indicadores/comercial";
import { medirOperacion } from "@/lib/admin/indicadores/operacion";
import { medirProducto } from "@/lib/admin/indicadores/producto";
import { medirPrecio } from "@/lib/admin/indicadores/precio";
import { medirServicio } from "@/lib/admin/indicadores/servicio";
import { estadoFuentes, medirDatos } from "@/lib/admin/indicadores/datos";
import type { Frente, ValorKpi } from "@/lib/admin/indicadores/tipos";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { SelectorPeriodo } from "@/components/admin/ui/SelectorPeriodo";
import { Bloque, td, tdR, th, thR } from "@/components/admin/ui/Bloque";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { Tendencia } from "@/components/admin/ui/Tendencia";
import { CambiosClient, type CambioFila } from "./CambiosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metas y KPIs — Admin" };

const PAGINA = PAGINA_FRENTE.datos;
const TONO_FUENTE = { ok: "bien", atencion: "atencion", falla: "problema" } as const;
const TEXTO_FUENTE = { ok: "Bien", atencion: "Revisar", falla: "Sin conexión" } as const;
const FRENTES_TABLA: Frente[] = ["demanda", "comercial", "operacion", "producto", "precio", "servicio", "datos"];

/**
 * Metas y KPIs (4 nov 2026): la revisión mensual con Martín («primer lunes:
 * resultados contra metas»). Los 7 objetivos del plan As Is / To Be, todos los
 * KPIs con su base y su meta, el estado de cada fuente de datos y la bitácora
 * de cambios. Cada KPI lleva a su pestaña con el detalle.
 */
export default async function MetasPage({ searchParams }: { searchParams: { p?: string; f?: string } }) {
  const hoy = hoyMX();
  const periodo = leerPeriodo(searchParams, "mes", hoy);
  const periodos = serieDe(periodo, hoy, 6);
  const [dem, com, ope, pro, pre, ser, dat, fuentes, cambiosRaw] = await Promise.all([
    medirDemanda(periodo, periodos, hoy), medirComercial(periodo, periodos, hoy), medirOperacion(periodo, periodos, hoy),
    medirProducto(periodo, periodos), medirPrecio(periodo, periodos), medirServicio(periodo, periodos, hoy), medirDatos(periodo, periodos),
    estadoFuentes(hoy),
    prisma.cambioMedido.findMany({ orderBy: [{ fecha: "desc" }, { createdAt: "desc" }], take: 60 }).catch(() => []),
  ]);
  const valores = new Map<string, ValorKpi>([dem, com, ope, pro, pre, ser, dat].flatMap(m => m.valores).map(v => [v.clave, v]));
  const series = Object.assign({}, dem.series, com.series, ope.series, pro.series, pre.series, ser.series, dat.series);
  const cambios: CambioFila[] = cambiosRaw.map(c => ({ id: c.id, fecha: c.fecha, frente: c.frente, titulo: c.titulo, detalle: c.detalle, kpis: c.kpis, creadoPor: c.creadoPor }));
  const ligaKpi = (pagina: string) => hrefPeriodo(pagina, periodo.tipo, periodo.ancla);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <EncabezadoPagina titulo="Metas y KPIs" nueva
        subtitulo="Los 7 objetivos del plan As Is / To Be y todos sus indicadores contra la meta al 31 ene y a Semana Santa (21–28 mar)." />
      <SelectorPeriodo pagina={PAGINA} periodo={periodo} />

      <section aria-label="Objetivos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {OBJETIVOS.map(o => {
          const def = KPI[o.kpi];
          const v = valores.get(o.kpi) ?? { clave: o.kpi, valor: null, calidad: "sin-dato" as const };
          const est = estadoContraMeta(def, v, periodo.tipo);
          return (
            <Link key={o.n} href={ligaKpi(def.pagina)} className="panel-card panel-foco panel-pulsable flex flex-col gap-1.5 p-4 hover:shadow-[var(--panel-sombra)]">
              <p className="panel-eyebrow">Objetivo {o.n}</p>
              <p className="text-[13px] font-dm font-medium leading-snug text-[var(--panel-tinta)]">{o.titulo}</p>
              <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">{def.nombre}</p>
              <div className="flex items-end justify-between gap-2">
                <p className="panel-cifra text-[26px] font-dm font-semibold leading-none text-[var(--panel-tinta)]">{formatear(def.unidad, v.valor)}</p>
                {series[o.kpi] && <Tendencia serie={series[o.kpi]} unidad={def.unidad} />}
              </div>
              <p className="text-[11.5px] font-dm text-[var(--panel-tinta-media)]">Hoy: {def.base.texto} → 31 ene: {def.meta?.texto ?? "—"} → S. Santa: {def.metaSS?.texto ?? def.meta?.texto ?? "—"}</p>
              <div className="flex flex-wrap gap-1.5">
                {est && <ChipEstado tono={est.tono}>{est.texto}</ChipEstado>}
                {v.calidad === "aproximado" && <ChipEstado tono="atencion">Aproximado</ChipEstado>}
                {v.preliminar && <ChipEstado tono="neutro">Preliminar</ChipEstado>}
              </div>
            </Link>
          );
        })}
      </section>

      <Bloque titulo="Todos los indicadores" descripcion={`Calculados para ${periodo.etiqueta}. Cada uno con una sola fórmula y una sola fuente; toca el nombre para ver su detalle. Los conteos y montos solo se juzgan en el periodo de su meta.`}>
        <table className="panel-tabla w-full min-w-[920px] text-[13px] font-dm">
          <thead><tr><th className={th}>Indicador</th><th className={thR}>Ahora</th><th className={th}>Base del documento</th><th className={th}>Meta 31 ene</th><th className={th}>Estado</th><th className={th}>Dato</th><th className={th}>Fuente</th></tr></thead>
          {FRENTES_TABLA.map(f => (
            <tbody key={f}>
              <tr><td colSpan={7} className="px-3 pb-1 pt-4"><span className="panel-eyebrow">{ETIQUETA_FRENTE[f]}</span></td></tr>
              {KPIS.filter(d => d.frente === f).map(d => {
                const v = valores.get(d.clave) ?? { clave: d.clave, valor: null, calidad: "sin-dato" as const };
                const est = estadoContraMeta(d, v, periodo.tipo);
                return (
                  <tr key={d.clave}>
                    <td className={td}><Link className="panel-foco underline decoration-[var(--panel-borde-fuerte)] underline-offset-2" href={ligaKpi(d.pagina)}>{d.nombre}</Link></td>
                    <td className={`${tdR} font-semibold`}>{formatear(d.unidad, v.valor)}</td>
                    <td className={`${td} text-[12px] text-[var(--panel-tinta-media)]`}>{d.base.texto}</td>
                    <td className={`${td} text-[12px]`}>{d.meta?.texto ?? (d.direccion === "info" ? "Informativo" : "—")}</td>
                    <td className={td}>{est ? <ChipEstado tono={est.tono}>{est.texto}</ChipEstado> : <span className="text-[12px] text-[var(--panel-tinta-suave)]">—</span>}</td>
                    <td className={`${td} text-[12px]`} title={v.nota}>{v.calidad === "exacto" ? (v.preliminar ? "Preliminar" : "Exacto") : ETIQUETA_CALIDAD[v.calidad]}</td>
                    <td className={`${td} text-[12px] text-[var(--panel-tinta-media)]`}>{d.fuente}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </Bloque>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Fuentes de datos" descripcion="Lo que alimenta los indicadores y si está vivo. Si una falla, sus KPIs salen «Sin dato» con el motivo.">
          <ul className="divide-y divide-[var(--panel-borde)] px-4 pb-3">
            {fuentes.map(f => (
              <li key={f.nombre} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-dm font-medium text-[var(--panel-tinta)]">{f.nombre}</p>
                  <p className="text-[12px] font-dm text-[var(--panel-tinta-media)]">{f.detalle}</p>
                  <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Alimenta: {f.alimenta}</p>
                  {f.arreglo && <p className="mt-0.5 text-[12px] font-dm text-[var(--panel-atencion)]">→ {f.arreglo}</p>}
                </div>
                <ChipEstado tono={TONO_FUENTE[f.estado]} className="shrink-0">{TEXTO_FUENTE[f.estado]}</ChipEstado>
              </li>
            ))}
          </ul>
        </Bloque>

        <Bloque titulo="Bitácora de cambios" descripcion="Cada cambio del negocio con su fecha (regla del plan): sin fecha no se sabe qué movió el número. Compara las mismas semanas antes y después.">
          <CambiosClient cambios={cambios} hoy={hoy} kpis={KPIS.map(k => ({ clave: k.clave, nombre: k.nombre, frente: k.frente }))} />
        </Bloque>
      </div>
    </div>
  );
}
