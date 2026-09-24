"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { TourQuote } from "@prisma/client";
import { X, BedDouble, Utensils, EyeOff, CalendarClock } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { grupoDe, grupoLargo, lineasDe, type LineaTour } from "@/lib/admin/reserva";
import { extrasDe, calcExtraLine, costoExtraLine, totalExtras, costoExtras } from "@/lib/admin/extras";
import { desgloseCotizacion } from "@/lib/admin/totalesCotizacion";

/**
 * La ficha completa de una cotización, sin abrir el editor.
 *
 * Es la hermana de `ReservaDetalle`: en reservas ya se podía ver de un vistazo
 * todo lo cotizado, y en cotizaciones había que entrar a editar —con el riesgo
 * de tocar algo sin querer— o bajar el PDF para leer lo que decía.
 *
 * Enseña ADEMÁS lo que el cliente nunca ve: las notas internas y lo que nos
 * cuestan los extras.
 */

const fmx   = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_LABEL: Record<string, string> = {
  borrador: "Borrador", enviada: "Enviada", aceptada: "Aceptada", expirada: "Expirada",
};
const STATUS_STYLE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  enviada:  "bg-yellow-100 text-yellow-800",
  aceptada: "bg-green-100 text-green-800",
  expirada: "bg-red-100 text-red-700",
};

const VIGENCIA_LABEL: Record<string, string> = {
  "48h": "48 horas", "7dias": "7 días", "15dias": "15 días", "30dias": "30 días",
};

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-0.5">{label}</p>
      <div className="text-[#1B4332]/85 font-dm text-sm break-words">{children || "—"}</div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#1B4332]/10 pt-4">
      <h3 className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-3">{titulo}</h3>
      {children}
    </section>
  );
}

export default function CotizacionDetalle({
  cotizacion: q, onClose,
}: {
  cotizacion: TourQuote; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const lineas = lineasDe(q as any);
  const grupo  = grupoDe(q as any);
  // En una cotización el `_meta` viaja en packageItems (en las reservas, en lineItems).
  const rawPkgs   = Array.isArray((q as any).packageItems) ? (q as any).packageItems as any[] : [];
  const meta      = rawPkgs.find(p => p && p._meta) || {};
  const hospedaje = rawPkgs.filter(p => p && !p._meta);
  const extras    = extrasDe((q as any).extraItems);

  const sumaLineas = lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0)
                   + hospedaje.reduce((s, p) => s + (Number(p.subtotal) || 0), 0)
                   + totalExtras(extras);
  const desglose   = desgloseCotizacion(sumaLineas, q.totalAmount, meta);
  const personas   = Number(meta.numPersonas) > 0 ? Number(meta.numPersonas) : grupo.total;

  const nombreTour = (l: LineaTour) =>
    TOURS_DB.find(t => t.slug === l.tourSlug)?.nombre || l.tourName || l.tourSlug || "—";

  const contenido = (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-3xl my-8 border border-[#1B4332]/10">

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#1B4332]/10 sticky top-0 bg-white z-10 rounded-t-sm">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-medium text-[#1B4332]">{q.quoteNumber}</span>
              <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm ${STATUS_STYLE[q.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[q.status] || q.status}
              </span>
            </div>
            <p className="font-cormorant text-[#1B4332] text-2xl font-light mt-1">{q.customerName}</p>
          </div>
          <button onClick={onClose} className="text-[#1B4332]/40 hover:text-[#1B4332] shrink-0" title="Cerrar (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Contacto y grupo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Dato label="Correo">{q.customerEmail || <span className="text-[#1B4332]/30">Sin correo</span>}</Dato>
            <Dato label="Teléfono">
              {q.customerPhone
                ? <a href={`https://wa.me/${q.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                     className="text-[#25D366] hover:underline">{q.customerPhone}</a>
                : <span className="text-[#1B4332]/30">Sin teléfono</span>}
            </Dato>
            <Dato label="Personas">
              <span className="font-medium">{personas}</span>
              <span className="block text-xs text-[#1B4332]/50">{grupoLargo(grupo)}</span>
            </Dato>
            <Dato label="Creada el">
              {new Date(q.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
            </Dato>
          </div>

          {/* Itinerario */}
          <Seccion titulo={`Itinerario · ${lineas.length || 1} ${lineas.length === 1 ? "recorrido" : "recorridos"}`}>
            <div className="space-y-2">
              {(lineas.length ? lineas : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children, subtotal: q.totalAmount }]).map((l, i) => {
                const t   = TOURS_DB.find(t => t.slug === l.tourSlug);
                const pax = (l.adults ?? 0) + (l.childrenMid ?? (l as any).children ?? 0) + (l.childrenSmall ?? 0);
                return (
                  <div key={i} className="flex items-start gap-3 bg-[#FAFAF8] border border-[#1B4332]/8 rounded-sm p-3">
                    <span className="font-mono text-[10px] text-[#1B4332]/35 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1B4332] font-dm text-sm font-medium">{nombreTour(l)}</p>
                      <p className="text-[#1B4332]/55 font-dm text-xs mt-0.5">
                        {fDate(l.tourDate || "")}
                        {pax > 0 && ` · ${pax} ${pax === 1 ? "persona" : "personas"}`}
                        {t && ` · ${t.duracion_hrs} h`}
                        {/* Un concepto que no está en el catálogo se dice con todas sus letras:
                            si no, parece un recorrido nuestro que alguien borró de la lista. */}
                        {!t && " · concepto a la medida"}
                      </p>
                      {(l.addOns ?? []).length > 0 && (
                        <p className="text-[#52B788] font-dm text-xs mt-1">
                          {(l.addOns ?? []).map(a => `+ ${a.nombre ?? a.id} × ${a.cantidad ?? 1}`).join(" · ")}
                        </p>
                      )}
                      {l.eleccion && <p className="text-[#1B4332]/70 font-dm text-xs mt-1">Eligió: {l.eleccion}</p>}
                    </div>
                    {l.subtotal != null && (
                      <span className="text-[#52B788] font-dm text-sm font-medium whitespace-nowrap">{fmx(l.subtotal)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Seccion>

          {/* Hospedaje */}
          {hospedaje.length > 0 && (
            <Seccion titulo="Hospedaje">
              <div className="space-y-2">
                {hospedaje.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[#FAFAF8] border border-[#1B4332]/8 rounded-sm p-3">
                    <BedDouble className="w-4 h-4 text-[#52B788] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1B4332] font-dm text-sm font-medium">
                        {p.habitacion}{p.hotel ? ` · ${p.hotel}` : ""}
                      </p>
                      <p className="text-[#1B4332]/55 font-dm text-xs mt-0.5">
                        {p.noches} {p.noches === 1 ? "noche" : "noches"}
                        {(p.habitaciones ?? 1) > 1 && ` · ${p.habitaciones} habitaciones`}
                        {p.huespedes ? ` · ${p.huespedes} ${p.huespedes === 1 ? "persona" : "personas"} por habitación` : ""}
                        {p.checkin && ` · ${fDate(p.checkin)} → ${fDate(p.checkout)}`}
                      </p>
                    </div>
                    {p.subtotal != null && (
                      <span className="text-[#52B788] font-dm text-sm font-medium whitespace-nowrap">{fmx(Number(p.subtotal))}</span>
                    )}
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Extras */}
          {extras.length > 0 && (
            <Seccion titulo="Extras e items incluidos">
              <div className="space-y-2">
                {extras.map((ex, i) => {
                  const cobro = calcExtraLine(ex);
                  const costo = costoExtraLine(ex);
                  return (
                    <div key={i} className="flex items-start gap-3 bg-[#FAFAF8] border border-[#1B4332]/8 rounded-sm p-3">
                      <Utensils className="w-4 h-4 text-[#C4882A] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1B4332] font-dm text-sm font-medium">
                          {ex.concepto}{ex.cantidad > 1 && <span className="text-[#1B4332]/45"> × {ex.cantidad}</span>}
                        </p>
                        {ex.detalle && <p className="text-[#1B4332]/55 font-dm text-xs mt-0.5">{ex.detalle}</p>}
                        {costo > 0 && (
                          <p className="text-[#1B4332]/40 font-dm text-xs mt-0.5">
                            Te cuesta {fmx(costo)} · te deja {fmx(cobro - costo)}
                          </p>
                        )}
                      </div>
                      <span className={`font-dm text-sm font-medium whitespace-nowrap ${ex.incluido || cobro === 0 ? "text-[#40916C]" : "text-[#C4882A]"}`}>
                        {ex.incluido || cobro === 0 ? "Incluido" : fmx(cobro)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {costoExtras(extras) > 0 && (
                <p className="text-[#1B4332]/40 font-dm text-xs mt-2">
                  Los extras cobran {fmx(totalExtras(extras))} y te cuestan {fmx(costoExtras(extras))}. Lo que te cuestan solo lo ves tú.
                </p>
              )}
            </Seccion>
          )}

          {/* Dinero */}
          <Seccion titulo="Lo que se le cotizó">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Dato label="Total"><span className="text-[#52B788] font-medium">{fmx(q.totalAmount)}</span></Dato>
              <Dato label="Anticipo para apartar">
                <span className="text-[#C9484A] font-medium">{fmx(desglose.anticipo)}</span>
                <span className="block text-xs text-[#1B4332]/45">{desglose.anticipoPct} % del total</span>
              </Dato>
              <Dato label="Saldo el día del tour">{fmx(desglose.saldo)}</Dato>
              <Dato label="Vigencia">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-[#1B4332]/40 shrink-0" />
                  {VIGENCIA_LABEL[meta.vigencia] || "7 días"}
                </span>
              </Dato>
            </div>
            <div className="mt-3 space-y-1">
              <p className="flex justify-between text-xs font-dm text-[#1B4332]/55 max-w-xs">
                <span>Suma de los renglones</span><span>{fmx(sumaLineas)}</span>
              </p>
              {desglose.ajuste !== 0 && (
                <p className="flex justify-between text-xs font-dm text-[#1B4332]/55 max-w-xs">
                  <span>Precio ajustado a mano</span>
                  <span>{desglose.ajuste > 0 ? "+" : "−"}{fmx(Math.abs(desglose.ajuste))}</span>
                </p>
              )}
              {desglose.descuento > 0 && (
                <p className="flex justify-between text-xs font-dm text-[#1B4332] max-w-xs">
                  <span>Descuento aplicado</span><span>−{fmx(desglose.descuento)}</span>
                </p>
              )}
            </div>
          </Seccion>

          {/* Notas */}
          <Seccion titulo="Notas">
            <div className="space-y-3">
              <Dato label="Notas para el cliente (salen en su correo y su PDF)">
                {q.notes ? <span className="whitespace-pre-wrap">{q.notes}</span> : <span className="text-[#1B4332]/30">Sin notas</span>}
              </Dato>
              <div className="border border-[#C4882A]/30 bg-[#C4882A]/6 rounded-sm p-3">
                <p className="flex items-center gap-1.5 text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1">
                  <EyeOff className="w-3 h-3" />Notas internas — no salen al cliente
                </p>
                <div className="text-[#1B4332]/85 font-dm text-sm break-words">
                  {meta.notasInternas
                    ? <span className="whitespace-pre-wrap">{meta.notasInternas}</span>
                    : <span className="text-[#1B4332]/30">Sin notas internas</span>}
                </div>
              </div>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}
