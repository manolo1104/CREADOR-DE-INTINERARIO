import { Car } from "lucide-react";
import { etiquetaTramo, type RutaTraslado } from "@/lib/traslados";
import type { Locale } from "@/lib/i18n/config";

/**
 * La tarifa de traslado de una ciudad, en una tabla que cabe en un teléfono.
 *
 * Los importes son por VEHÍCULO y de ida y vuelta; decirlo en cada renglón sería
 * ruido, así que va una vez arriba y una vez abajo, que son los dos sitios donde
 * la gente lee.
 *
 * En inglés la etiqueta "MXN" pesa el doble: un lector americano que ve "$5,000"
 * sin moneda asume dólares y descarta el viaje por un precio 18 veces mayor del
 * real. Por eso la moneda no es opcional en ningún renglón.
 */
export function TrasladoTabla({
  ruta,
  claro = false,
  locale = "es",
}: {
  ruta: RutaTraslado;
  claro?: boolean;
  locale?: Locale;
}) {
  const tinta   = claro ? "text-negro" : "text-crema";
  const suave   = claro ? "text-negro/55" : "text-crema/55";
  const tenue   = claro ? "text-negro/40" : "text-crema/40";
  const linea   = claro ? "border-negro/10" : "border-crema/15";
  const acento  = claro ? "text-verde-selva" : "text-dorado";
  const en = locale === "en";

  return (
    <div>
      <p className={`flex items-center gap-2 font-dm text-[13px] ${suave} mb-3`}>
        <Car className={`w-4 h-4 ${acento} flex-shrink-0`} aria-hidden="true" />
        {en ? (
          <span>
            Private transfer {ruta.ciudadLargaEn} to Xilitla, <strong className={tinta}>round trip</strong>.
            The price is per vehicle, not per person.
          </span>
        ) : (
          <span>
            Traslado privado {ruta.ciudadLarga} a Xilitla, <strong className={tinta}>ida y vuelta</strong>.
            El precio es por vehículo, no por persona.
          </span>
        )}
      </p>
      <ul className={`border-y ${linea} divide-y ${linea.replace("border-", "divide-")}`}>
        {ruta.tarifas.map((t) => (
          <li key={t.desde} className="flex items-baseline justify-between gap-4 py-2.5">
            <span className={`font-dm text-[13px] ${suave}`}>{etiquetaTramo(t, locale)}</span>
            <span className={`font-cormorant text-lg ${acento} whitespace-nowrap`}>
              ${t.precio.toLocaleString(en ? "en-US" : "es-MX")}
              <span className={`font-dm text-[11px] ${tenue} ml-1`}>MXN</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={`font-dm text-[11px] ${tenue} mt-2.5 leading-snug`}>
        {en
          ? "We pick you up where you're staying and take you back when your trip ends. It's held with the rest of your booking and confirmed over WhatsApp."
          : "Te recogemos en tu domicilio y te regresamos al terminar el viaje. Se aparta con el resto de tu reserva y se confirma por WhatsApp."}
      </p>
    </div>
  );
}
