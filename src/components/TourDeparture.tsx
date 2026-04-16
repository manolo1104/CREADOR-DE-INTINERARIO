/* TourDeparture — Punto de salida y transporte (Server Component) */
import { MapPin, Clock, Bus, CheckCircle2 } from "lucide-react";

const WA_LLEGADA =
  "https://wa.me/524891251458?text=Hola%2C%20tengo%20dudas%20sobre%20c%C3%B3mo%20llegar%20al%20punto%20de%20salida%20del%20tour.";

const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/SWGyihBFTiykTFFM6";

export function TourDeparture() {
  return (
    <section>
      <h2 className="font-cormorant text-crema text-2xl mb-6 flex items-center gap-3">
        <MapPin className="w-6 h-6 text-verde-selva flex-shrink-0" aria-hidden="true" /> Punto de salida y transporte
      </h2>

      <div className="border border-white/10 bg-negro/40 p-5 space-y-5">
        {/* Texto intro */}
        <p className="text-crema/65 font-dm text-sm leading-relaxed">
          Nuestros tours salen desde el{" "}
          <strong className="text-crema font-medium">Hotel Paraíso Encantado Xilitla</strong>,
          nuestro hotel sede ubicado en el corazón de Xilitla, a pasos del Jardín Surrealista.
        </p>

        {/* Mapa embebido */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{ touchAction: "pan-y" }}
          aria-label="Mapa de Google Maps — Hotel Paraíso Encantado Xilitla"
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1007!2d-98.9941194!3d21.3950444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d6906a1c46f06f%3A0xdb106bd5eec4388f!2sHotel%20Para%C3%ADso%20Encantado%20Xilitla!5e1!3m2!1ses!2smx!4v1"
            width="100%"
            height="260"
            style={{ border: 0, borderRadius: "12px", display: "block" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Hotel Paraíso Encantado Xilitla — Punto de salida de los tours"
          />
        </div>

        {/* Link Google Maps */}
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors"
        >
          Ver en Google Maps →
        </a>

        {/* Info de logística */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { Icon: Clock,        label: "Horario de salida", value: "5:30 AM (puntual)" },
            { Icon: Bus,          label: "Transporte",        value: "Desde tu hospedaje en Xilitla" },
            { Icon: CheckCircle2, label: "Regreso aprox.",    value: "6:00–7:00 PM" },
          ] as { Icon: typeof Clock; label: string; value: string }[]).map((item) => (
            <div key={item.label} className="bg-verde-profundo/30 border border-white/8 p-3 rounded">
              <item.Icon className="w-5 h-5 text-verde-vivo/60 mb-1" aria-hidden="true" />
              <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-0.5">
                {item.label}
              </p>
              <p className="text-crema/80 font-dm text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-crema/40 font-dm">
          ¿No estás hospedado en Xilitla? Consúltanos — coordinamos tu recogida sin costo adicional.
        </p>

        {/* CTA WhatsApp */}
        <a
          href={WA_LLEGADA}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 px-4 py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            className="w-4 h-4 flex-shrink-0" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
          </svg>
          Pregúntanos cómo llegar →
        </a>
      </div>
    </section>
  );
}
