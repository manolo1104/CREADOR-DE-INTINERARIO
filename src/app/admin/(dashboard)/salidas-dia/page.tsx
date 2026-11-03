import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { salidasEntre } from "@/lib/admin/salidasDia";
import { avanceChecklist } from "@/lib/admin/checklistSalida";
import { ETIQUETA_ESTADO_SALIDA } from "@/lib/admin/salidas";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { TONO_ESTADO_SALIDA, fechaLarga } from "./comun";

export const dynamic = "force-dynamic";
export const metadata = { title: "Salidas del día — Admin" };

/**
 * Las salidas de un día (tour + fecha), con pasajeros, avance del checklist
 * y guía. Cada una abre su detalle. Lo primero que ve el guía al entrar.
 */
export default async function SalidasDiaPage({ searchParams }: { searchParams: { fecha?: string } }) {
  const hoy = hoyMX();
  const pedida = searchParams.fecha ?? "";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(pedida) && addDaysYMD(pedida, 0) === pedida ? pedida : hoy;
  const salidas = await salidasEntre(fecha, fecha);
  const nav = (f: string, aria: string, Icono: typeof ChevronLeft) => (
    <Link href={`/admin/salidas-dia?fecha=${f}`} aria-label={aria}
      className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white text-[var(--panel-tinta)]">
      <Icono className="h-4 w-4" aria-hidden="true" />
    </Link>
  );

  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina
        titulo="Salidas del día"
        subtitulo={`${fechaLarga(fecha)}${fecha === hoy ? " · hoy" : ""} · ${salidas.length} salida${salidas.length === 1 ? "" : "s"}`}
        nueva
        acciones={
          <div className="flex items-center gap-2">
            {nav(addDaysYMD(fecha, -1), "Día anterior", ChevronLeft)}
            {fecha !== hoy && (
              <Link href="/admin/salidas-dia" className="panel-foco text-[13px] font-dm font-medium text-[var(--panel-acento)] underline-offset-2 hover:underline">Hoy</Link>
            )}
            {nav(addDaysYMD(fecha, 1), "Día siguiente", ChevronRight)}
          </div>
        }
      />

      {salidas.length === 0 ? (
        <EstadoVacio titulo="Sin salidas este día" texto="No hay reservas con tour en esta fecha. Las salidas salen solas de las reservas: en cuanto se capture una, aparece aquí."
          accion={{ href: "/admin/calendario", etiqueta: "Ver el calendario" }} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {salidas.map(s => {
            const av = avanceChecklist(s.checklist);
            return (
              <li key={s.clave}>
                <Link href={`/admin/salidas-dia/${encodeURIComponent(s.clave)}`}
                  className="panel-card panel-pulsable panel-foco block p-4 hover:shadow-[var(--panel-sombra)]"
                  style={{ borderLeft: `4px solid ${colorDeTour(s.slug)}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-dm font-bold" style={{ color: colorDeTour(s.slug) }}>{s.codigo}</p>
                      <p className="truncate font-cormorant text-xl text-[var(--panel-tinta)]">{s.tourNombre}</p>
                    </div>
                    <ChipEstado tono={TONO_ESTADO_SALIDA[s.estadoPax]}>{ETIQUETA_ESTADO_SALIDA[s.estadoPax]}</ChipEstado>
                  </div>
                  <p className="panel-cifra mt-2 text-[13px] font-dm text-[var(--panel-tinta)]">
                    <strong>{s.personas}</strong>{s.cupo !== null ? ` / ${s.cupo}` : ""} personas · {s.reservas} reserva{s.reservas === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{s.clientes.join(", ")}</p>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-dm text-[var(--panel-tinta-media)]">
                    <span>Checklist {av.hechos} de {av.total}</span>
                    <span>{s.registro.guia ? `Guía: ${s.registro.guia}` : <span className="text-[var(--panel-atencion)]">Sin guía asignado</span>}</span>
                    {s.pasajeros.some(p => p.pago === "saldo") && <span className="text-[var(--panel-atencion)]">Saldo por cobrar en sitio</span>}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
