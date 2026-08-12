import { Car } from "lucide-react";
import { etiquetaTramo, type RutaTraslado } from "@/lib/traslados";

/**
 * La tarifa de traslado de una ciudad, en una tabla que cabe en un teléfono.
 *
 * Los importes son por VEHÍCULO y de ida y vuelta; decirlo en cada renglón sería
 * ruido, así que va una vez arriba y una vez abajo, que son los dos sitios donde
 * la gente lee.
 */
export function TrasladoTabla({ ruta, claro = false }: { ruta: RutaTraslado; claro?: boolean }) {
  const tinta   = claro ? "text-negro" : "text-crema";
  const suave   = claro ? "text-negro/55" : "text-crema/55";
  const tenue   = claro ? "text-negro/40" : "text-crema/40";
  const linea   = claro ? "border-negro/10" : "border-crema/15";
  const acento  = claro ? "text-verde-selva" : "text-dorado";

  return (
    <div>
      <p className={`flex items-center gap-2 font-dm text-[13px] ${suave} mb-3`}>
        <Car className={`w-4 h-4 ${acento} flex-shrink-0`} aria-hidden="true" />
        <span>
          Traslado privado {ruta.ciudadLarga} a Xilitla, <strong className={tinta}>ida y vuelta</strong>.
          El precio es por vehículo, no por persona.
        </span>
      </p>
      <ul className={`border-y ${linea} divide-y ${linea.replace("border-", "divide-")}`}>
        {ruta.tarifas.map((t) => (
          <li key={t.desde} className="flex items-baseline justify-between gap-4 py-2.5">
            <span className={`font-dm text-[13px] ${suave}`}>{etiquetaTramo(t)}</span>
            <span className={`font-cormorant text-lg ${acento} whitespace-nowrap`}>
              ${t.precio.toLocaleString("es-MX")}
              <span className={`font-dm text-[11px] ${tenue} ml-1`}>MXN</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={`font-dm text-[11px] ${tenue} mt-2.5 leading-snug`}>
        Te recogemos en tu domicilio y te regresamos al terminar el viaje. Se aparta con el
        resto de tu reserva y se confirma por WhatsApp.
      </p>
    </div>
  );
}
