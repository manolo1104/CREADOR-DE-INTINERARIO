"use client";

import { Clock, MapPin, ShieldCheck, Camera } from "lucide-react";
import { formatMXN, formatTourDate } from "@/lib/tourBooking";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";

export interface RenglonResumen {
  nombre:    string;
  /** YYYY-MM-DD. Vacío cuando aún no se elige. */
  fecha?:    string;
  /**
   * Texto de fecha ya armado, para renglones que no son de un solo día — el
   * hospedaje va de una fecha a otra. Sin esto, el renglón del hotel salía con
   * "Falta la fecha" aunque el cliente ya hubiera elegido entrada y salida.
   */
  fechaTexto?: string;
  /** Servicios del renglón (ej. lo que ofrece el hotel). */
  extras?:   string[];
  /** "4 adultos, 1 niño" o "Ruta Nanacatli · 2 × RZR 500". */
  detalle?:  string;
  subtotal?: number;
  /** Lo que incluye ESTE recorrido, ya con `INCLUYE_SIEMPRE` sumado por quien llama. */
  incluye:   string[];
  /**
   * Lo que se suma al renglón y se cobra aparte: la actividad opcional de un
   * tour, o los extras de un paquete (gente adicional, noche extra, habitación
   * con vista). `cantidad` es opcional: "× 2" solo se pinta cuando dice algo —
   * un renglón de "Noche extra" no necesita un "× 1" colgando.
   */
  addOns?:   { nombre: string; cantidad?: number; subtotal: number }[];
  /** Elección del cliente cuando el tour la exige (ej. Ruta Acuática). */
  eleccion?: string;
}

/**
 * Resumen de lo que el cliente está apartando, para la pantalla de pago.
 *
 * Antes cada checkout armaba el suyo. El de tours listaba `tour.incluye` sin
 * sumar `INCLUYE_SIEMPRE` —así que decía que no había seguro de viaje ni
 * fotos— y traía además una lista de respaldo escrita a mano que prometía
 * desayuno a recorridos que no lo llevan, como el rappel o el RZR. El del
 * carrito no listaba nada.
 *
 * Este componente no inventa: pinta lo que le pasan. Quien lo usa es
 * responsable de mandar el `incluye` completo del catálogo.
 */
export function ResumenReserva({
  items, total, pagaHoy, saldo, pct, ahorroMultiple = 0,
}: {
  items:   RenglonResumen[];
  total:   number;
  pagaHoy: number;
  saldo:   number;
  pct:     number;
  /** Pesos rebajados por llevar varios recorridos. Se enseña como renglón. */
  ahorroMultiple?: number;
}) {
  const { locale } = useLocale();
  const t = getBooking(locale).resumen;
  const uno = items.length === 1;
  // La recogida solo se promete si el recorrido de verdad la incluye: el
  // rappel, el RZR y el buceo no llevan traslado.
  const conTraslado = items.some((i) =>
    i.incluye.some((x) => /traslado|pasamos por|recogida|transport|pick[- ]?up|round[- ]?trip/i.test(x)),
  );

  return (
    <div className="border border-negro/10 bg-white p-5">
      <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-4">
        {t.titulo}
      </p>

      {/* ── Qué se aparta ── */}
      <div className="space-y-3 pb-4 border-b border-negro/8">
        {items.map((i, n) => (
          <div key={i.nombre + n}>
            <div className="flex justify-between gap-3">
              <p className="font-dm text-[13px] text-negro/85 leading-snug">
                {i.nombre.split("—")[0].trim()}
              </p>
              {typeof i.subtotal === "number" && (
                <span className="font-dm text-[13px] text-negro/70 whitespace-nowrap">
                  {formatMXN(i.subtotal)}
                </span>
              )}
            </div>
            <p className="font-dm text-[11px] text-negro/45 mt-0.5">
              {i.fechaTexto ? i.fechaTexto : i.fecha ? formatTourDate(i.fecha, locale) : t.faltaLaFecha}
              {i.detalle ? ` · ${i.detalle}` : ""}
            </p>
            {(i.extras ?? []).length > 0 && (
              <p className="font-dm text-[11px] text-negro/45 mt-1 leading-snug">
                {(i.extras ?? []).join(" · ")}
              </p>
            )}
            {i.eleccion && (
              <p className="font-dm text-[11px] text-verde-selva mt-0.5">{t.elegiste(i.eleccion)}</p>
            )}
            {(i.addOns ?? []).map((a) => (
              <p key={a.nombre} className="flex justify-between font-dm text-[11px] text-negro/55 mt-0.5">
                <span>+ {a.nombre}{typeof a.cantidad === "number" ? ` × ${a.cantidad}` : ""}</span>
                <span>{formatMXN(a.subtotal)}</span>
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* ── Qué va incluido ── */}
      <div className="py-4 border-b border-negro/8">
        <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-2.5">
          {t.loQueVaIncluido}
        </p>
        {uno ? (
          <ul className="space-y-1">
            {items[0].incluye.map((x) => (
              <li key={x} className="flex items-start gap-1.5 font-dm text-[12px] text-negro/55 leading-snug">
                <span className="text-verde-selva flex-shrink-0 mt-0.5">✓</span>
                {x}
              </li>
            ))}
          </ul>
        ) : (
          // Con varios recorridos, cada uno incluye cosas distintas: se listan
          // por separado en vez de mezclarlos y acabar prometiendo de más.
          <div className="space-y-2">
            {items.map((i, n) => (
              <details key={i.nombre + n} className="group">
                <summary className="cursor-pointer list-none font-dm text-[12px] text-verde-selva hover:text-verde-vivo transition-colors">
                  {i.nombre.split("—")[0].trim()}
                  <span className="ml-1 inline-block transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <ul className="mt-1.5 space-y-1 border-l-2 border-verde-selva/20 pl-2.5">
                  {i.incluye.map((x) => (
                    <li key={x} className="font-dm text-[12px] text-negro/55 leading-snug">✓ {x}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* ── Logística ── */}
      <div className="py-4 border-b border-negro/8 space-y-2">
        <p className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
          <Clock className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.salidaEntre}<strong className="text-negro/80">{t.salidaEntreFuerte}</strong>{t.confirmamosHora}</span>
        </p>
        {conTraslado && (
          <p className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
            <MapPin className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t.pasamosPorTi}<strong className="text-negro/80">{t.pasamosPorTiFuerte}</strong>.</span>
          </p>
        )}
        <p className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
          <ShieldCheck className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.cancelasGratis}</span>
        </p>
        <p className="flex items-start gap-2 font-dm text-[12px] text-negro/60">
          <Camera className="w-3.5 h-3.5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.fotosYVideo}</span>
        </p>
      </div>

      {/* ── Números ── */}
      <div className="pt-4 space-y-1.5">
        {/* El descuento por varios recorridos va como renglón propio, antes del
          total: si solo se ve el importe final, la persona no se entera de que
          agregar el segundo tour le sirvió de algo. */}
        {ahorroMultiple > 0 && (
          <>
            <p className="flex justify-between font-dm text-[13px] text-negro/45">
              <span>{t.sumaDeRecorridos}</span>
              <span>{formatMXN(total + ahorroMultiple)} MXN</span>
            </p>
            <p className="flex justify-between font-dm text-[13px] text-verde-selva">
              <span>{t.descuentoVariosRecorridos}</span>
              <strong>−{formatMXN(ahorroMultiple)} MXN</strong>
            </p>
          </>
        )}
        <p className="flex justify-between font-dm text-[13px] text-negro/60">
          <span>{t.totalDelViaje}</span>
          <strong className="text-negro/85">{formatMXN(total)} MXN</strong>
        </p>
        <p className="flex justify-between font-dm text-[13px]">
          <span className="text-negro/60">{t.pagasHoy(pct)}</span>
          <strong className="font-cormorant text-dorado text-xl leading-none">{formatMXN(pagaHoy)} MXN</strong>
        </p>
        {saldo > 0 && (
          <p className="flex justify-between font-dm text-[11px] text-negro/45">
            <span>{t.saldoDia}</span>
            <span>{formatMXN(saldo)} MXN</span>
          </p>
        )}
      </div>
    </div>
  );
}
