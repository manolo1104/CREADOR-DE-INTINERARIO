"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { TourBooking } from "@prisma/client";
import { X, BedDouble, Paperclip, FileText, ImageIcon, MapPin, Utensils } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { grupoDe, grupoLargo, lineasDe, metaDe, type LineaTour } from "@/lib/admin/reserva";
import { extrasDe, calcExtraLine, costoExtraLine, totalExtras, costoExtras } from "@/lib/admin/extras";
import type { Evidencia } from "@/components/admin/PagoProveedorCell";

const fmx   = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate = (d: string) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_LABEL: Record<string, string> = { paid: "Pagada", pending: "Pendiente", cancelled: "Cancelada" };
const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green-100 text-green-800", pending: "bg-yellow-100 text-yellow-800", cancelled: "bg-red-100 text-red-700",
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

export default function ReservaDetalle({
  reserva: b, evidencias, onClose,
}: {
  reserva: TourBooking; evidencias: Evidencia[]; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Congelar el fondo mientras la ficha está abierta.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const lineas   = lineasDe(b as any);
  const meta     = metaDe(b as any);
  const grupo    = grupoDe(b as any);
  const pkgs     = ((b as any).packageItems ?? []) as any[];
  const hospedaje = Array.isArray(pkgs) ? pkgs.filter(p => p && !p._meta) : [];
  const extras   = extrasDe((b as any).extraItems);

  const rawDeposito = (b as any).depositoPagado ?? 0;
  const deposito    = rawDeposito > 0 ? rawDeposito : (b.stripePaymentIntentId ? b.totalAmount : 0);
  const pendiente   = Math.max(0, b.totalAmount - deposito);
  const sumaLineas  = lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0)
                    + hospedaje.reduce((s, p) => s + (Number(p.subtotal) || 0), 0)
                    + totalExtras(extras);

  const pagoProv    = (b as any).pagoProveedor as boolean | null;
  const montoProv   = (b as any).pagoProveedorMonto ?? 0;
  const notaProv    = (b as any).pagoProveedorNota as string | null;

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
              <span className="font-mono text-xs font-medium text-[#1B4332]">{b.confirmationNumber}</span>
              <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm ${STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[b.status] || b.status}
              </span>
              <span className="text-[10px] font-dm text-[#1B4332]/40">
                {b.stripePaymentIntentId ? "Pagó en línea" : "Capturada a mano"}
              </span>
            </div>
            <p className="font-cormorant text-[#1B4332] text-2xl font-light mt-1">{b.customerName}</p>
          </div>
          <button onClick={onClose} className="text-[#1B4332]/40 hover:text-[#1B4332] shrink-0" title="Cerrar (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Contacto y grupo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Dato label="Correo">{b.customerEmail || <span className="text-[#1B4332]/30">Sin correo</span>}</Dato>
            <Dato label="Teléfono">
              {b.customerPhone
                ? <a href={`https://wa.me/${b.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                     className="text-[#25D366] hover:underline">{b.customerPhone}</a>
                : <span className="text-[#1B4332]/30">Sin teléfono</span>}
            </Dato>
            <Dato label="Personas">
              <span className="font-medium">{grupo.total}</span>
              <span className="block text-xs text-[#1B4332]/50">{grupoLargo(grupo)}</span>
            </Dato>
            <Dato label="Reservada el">
              {new Date(b.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
            </Dato>
          </div>

          {/* Itinerario */}
          <Seccion titulo={`Itinerario · ${lineas.length || 1} ${lineas.length === 1 ? "recorrido" : "recorridos"}`}>
            <div className="space-y-2">
              {(lineas.length ? lineas : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children, subtotal: b.totalAmount }]).map((l, i) => {
                const t = TOURS_DB.find(t => t.slug === l.tourSlug);
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
                      </p>
                      {/* Lo que hay que OPERAR además del recorrido. El add-on
                        se cobra y no aparecía por ningún lado: el Salto de las
                        7 Cascadas necesita guía de rescate y nadie se enteraba. */}
                      {(l.addOns ?? []).length > 0 && (
                        <p className="text-[#52B788] font-dm text-xs mt-1">
                          {(l.addOns ?? [])
                            .map(a => `+ ${a.nombre ?? a.id} × ${a.cantidad ?? 1}`)
                            .join(" · ")}
                        </p>
                      )}
                      {l.eleccion && (
                        <p className="text-[#1B4332]/70 font-dm text-xs mt-1">Eligió: {l.eleccion}</p>
                      )}
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
                      <p className="text-[#1B4332] font-dm text-sm font-medium">{p.habitacion}{p.hotel ? ` · ${p.hotel}` : ""}</p>
                      <p className="text-[#1B4332]/55 font-dm text-xs mt-0.5">
                        {p.noches} {p.noches === 1 ? "noche" : "noches"}
                        {(p.habitaciones ?? 1) > 1 && ` · ${p.habitaciones} habitaciones`}
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

          {/* Extras: lo que hay que OPERAR y cobrar además del recorrido */}
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
                  Los extras cobran {fmx(totalExtras(extras))} y te cuestan {fmx(costoExtras(extras))}. Lo que te cuestan solo lo ves tú: no sale en el PDF ni en el correo del cliente.
                </p>
              )}
            </Seccion>
          )}

          {/* Dinero */}
          <Seccion titulo="Cobro al cliente">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Dato label="Total"><span className="text-[#52B788] font-medium">{fmx(b.totalAmount)}</span></Dato>
              <Dato label="Anticipo cobrado">
                {deposito > 0 ? <span className="text-green-700 font-medium">{fmx(deposito)}</span>
                              : <span className="text-amber-600">Sin registrar</span>}
              </Dato>
              <Dato label="Falta por cobrar">
                {pendiente > 0 ? <span className="text-orange-600 font-medium">{fmx(pendiente)}</span>
                               : <span className="text-[#1B4332]/40">Liquidado</span>}
              </Dato>
              <Dato label="Método">{meta.metodoPago || "—"}{meta.folioPago ? <span className="block text-xs text-[#1B4332]/45 font-mono">{meta.folioPago}</span> : null}</Dato>
            </div>
            {sumaLineas > 0 && sumaLineas !== b.totalAmount && (
              <p className="text-[#1B4332]/45 font-dm text-xs mt-3">
                Las líneas suman {fmx(sumaLineas)} y el total es {fmx(b.totalAmount)}: hay un precio ajustado a mano
                {meta.cotizacionOrigen ? ` (viene de la cotización ${meta.cotizacionOrigen})` : ""}
                {meta.discountValue ? ` · descuento ${meta.discountType === "fixed" ? fmx(Number(meta.discountValue)) : `${meta.discountValue}%`}` : ""}.
              </p>
            )}
            {b.promoCode && (
              <p className="text-[#1B4332]/45 font-dm text-xs mt-1">
                Código promocional <span className="font-mono">{b.promoCode}</span>
                {b.promoDiscount > 0 && ` · −${fmx(b.promoDiscount)}`}
              </p>
            )}
          </Seccion>

          {/* Proveedor */}
          <Seccion titulo="Pago al proveedor">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Dato label="Estado">
                {pagoProv === true  && <span className="text-green-700 font-medium">Ya le pagué</span>}
                {pagoProv === false && <span className="text-red-600 font-medium">Sin pagar</span>}
                {pagoProv == null   && <span className="text-[#1B4332]/40">Sin marcar</span>}
              </Dato>
              <Dato label="Monto pagado">{montoProv > 0 ? fmx(montoProv) : <span className="text-[#1B4332]/40">—</span>}</Dato>
              <Dato label="Nota">{notaProv || <span className="text-[#1B4332]/30">—</span>}</Dato>
            </div>
            {evidencias.length > 0 && (
              <ul className="mt-3 space-y-1">
                {evidencias.map(ev => (
                  <li key={ev.id} className="flex items-center gap-2 text-xs font-dm">
                    {ev.tipoMime === "application/pdf"
                      ? <FileText className="w-3.5 h-3.5 text-red-600/70 shrink-0" />
                      : <ImageIcon className="w-3.5 h-3.5 text-[#52B788] shrink-0" />}
                    <a href={`/api/admin/evidencia/${ev.id}`} target="_blank" rel="noopener noreferrer"
                       className="text-[#1B4332]/75 hover:text-[#1B4332] hover:underline truncate">
                      {ev.nombreArchivo}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {evidencias.length === 0 && (
              <p className="flex items-center gap-1.5 text-[#1B4332]/30 font-dm text-xs mt-3">
                <Paperclip className="w-3 h-3" />Sin comprobante adjunto
              </p>
            )}
          </Seccion>

          {/* Logística y notas */}
          <Seccion titulo="Logística">
            <div className="space-y-3">
              <Dato label="Punto de encuentro">
                <span className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1B4332]/40 shrink-0 mt-0.5" />
                  {meta.pickupLugar || "Lobby de tu hotel en Xilitla"}
                </span>
              </Dato>
              <Dato label="Notas">
                {b.notes ? <span className="whitespace-pre-wrap">{b.notes}</span> : <span className="text-[#1B4332]/30">Sin notas</span>}
              </Dato>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}
