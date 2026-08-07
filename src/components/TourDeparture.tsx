/* TourDeparture — Punto de salida y transporte (Server Component) */
import { headers } from "next/headers";
import { MapPin, Clock, Bus, CheckCircle2 } from "lucide-react";

const WA_LLEGADA_ES =
  "https://wa.me/524891251458?text=Hola%2C%20tengo%20dudas%20sobre%20c%C3%B3mo%20llegar%20al%20punto%20de%20salida%20del%20tour.";
const WA_LLEGADA_EN =
  "https://wa.me/524891251458?text=Hi%2C%20I%20have%20questions%20about%20how%20to%20reach%20the%20tour%20departure%20point.";

// Nota: aquí ya no se muestra el mapa del Hotel Paraíso Encantado. Los tours no
// salen de un punto fijo: pasamos por el cliente a SU hospedaje, en Xilitla o en
// Ciudad Valles. El hotel sigue apareciendo en /paquetes, donde sí es la sede.

/* Ícono de WhatsApp reutilizado en ambas variantes. */
function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  );
}

/* Tours que NO salen de Xilitla usan un bloque de logística propio (punto de encuentro en sitio). */
const MEDIA_LUNA = {
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=21.859722,-100.012500",
  mapEmbed: "https://www.google.com/maps?q=21.859722,-100.012500&z=13&hl=es&output=embed",
  mapTitle: "Laguna de la Media Luna — Punto de encuentro del tour de buceo",
  intro: {
    es: (
      <>Este tour se realiza en la{" "}
      <strong className="text-crema font-medium">Laguna de la Media Luna</strong>, en Rioverde (San Luis Potosí), de aguas frescas y cristalinas. El punto de encuentro es el acceso a la laguna.</>
    ),
    en: (
      <>This tour takes place at the{" "}
      <strong className="text-crema font-medium">Media Luna Lagoon</strong>, in Rioverde (San Luis Potosí), with fresh, crystal-clear water. We meet at the entrance to the park.</>
    ),
  },
  logistica: {
    es: [
      { Icon: Clock,        label: "Duración",           value: "≈ 4 horas de capacitación" },
      { Icon: Bus,          label: "Cómo llegar",        value: "Por tu cuenta · ~2 h desde Cd. Valles" },
      { Icon: CheckCircle2, label: "Entrada al parque",  value: "Se paga aparte — lleva efectivo" },
    ],
    en: [
      { Icon: Clock,        label: "Duration",       value: "≈ 4 hours of training" },
      { Icon: Bus,          label: "Getting there",  value: "On your own · ~2 h from Cd. Valles" },
      { Icon: CheckCircle2, label: "Park admission", value: "Paid separately — bring cash" },
    ],
  },
  nota: {
    es: "Lleva traje de baño, toalla y efectivo para la entrada al parque. ¿Vienes desde Cd. Valles o Xilitla? Consúltanos y te ayudamos a organizar el traslado.",
    en: "Bring a swimsuit, a towel and cash for the park entrance. Coming from Cd. Valles or Xilitla? Ask us and we'll help you arrange transport.",
  },
};

export function TourDeparture({ tourId }: { tourId?: string }) {
  const en = headers().get("x-locale") === "en";
  const WA_LLEGADA = en ? WA_LLEGADA_EN : WA_LLEGADA_ES;

  // ── Variante Media Luna (Rioverde): el tour de buceo no sale de Xilitla ──
  if (tourId === "tour-buceo-media-luna") {
    return (
      <section>
        <h2 className="font-cormorant text-crema text-2xl mb-6 flex items-center gap-3">
          <MapPin className="w-6 h-6 text-verde-selva flex-shrink-0" aria-hidden="true" /> {en ? "Meeting point" : "Punto de encuentro"}
        </h2>

        <div className="border border-white/10 bg-negro/40 p-5 space-y-5">
          <p className="text-crema/65 font-dm text-sm leading-relaxed">
            {en ? MEDIA_LUNA.intro.en : MEDIA_LUNA.intro.es}
          </p>

          <div
            className="relative rounded-xl overflow-hidden"
            style={{ touchAction: "pan-y" }}
            aria-label="Mapa de Google Maps — Laguna de la Media Luna"
          >
            <iframe
              src={MEDIA_LUNA.mapEmbed}
              width="100%"
              height="260"
              style={{ border: 0, borderRadius: "12px", display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={MEDIA_LUNA.mapTitle}
            />
          </div>

          <a
            href={MEDIA_LUNA.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors"
          >
            {en ? "View on Google Maps →" : "Ver en Google Maps →"}
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(en ? MEDIA_LUNA.logistica.en : MEDIA_LUNA.logistica.es).map((item) => (
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
            {en ? MEDIA_LUNA.nota.en : MEDIA_LUNA.nota.es}
          </p>

          <a
            href={WA_LLEGADA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 px-4 py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 rounded"
          >
            <WhatsAppIcon />
            {en ? "Ask us how to get there →" : "Pregúntanos cómo llegar →"}
          </a>
        </div>
      </section>
    );
  }

  // ── Variante RZR: se maneja en Xilitla, no hay recogida en Ciudad Valles ──
  if (tourId === "tour-rzr-xilitla") {
    return (
      <section>
        <h2 className="font-cormorant text-crema text-2xl mb-6 flex items-center gap-3">
          <MapPin className="w-6 h-6 text-verde-selva flex-shrink-0" aria-hidden="true" /> {en ? "Meeting point" : "Punto de encuentro"}
        </h2>

        <div className="border border-white/10 bg-negro/40 p-5 space-y-5">
          <p className="text-crema/65 font-dm text-sm leading-relaxed">
            {en ? (
              <>This tour runs entirely around{" "}
              <strong className="text-crema font-medium">Xilitla</strong>, so we meet at our base
              in town and set off from there. Transport to Xilitla is not included.</>
            ) : (
              <>Este recorrido se hace por los caminos de{" "}
              <strong className="text-crema font-medium">Xilitla</strong>, así que nos vemos en
              nuestra base del pueblo y salimos de ahí. El transporte hasta Xilitla no está incluido.</>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(en
              ? [
                  { Icon: Clock,        label: "Departure time", value: "Between 8:00 and 9:00 AM" },
                  { Icon: Bus,          label: "Meeting point",  value: "Our base in Xilitla" },
                  { Icon: CheckCircle2, label: "Duration",       value: "2 to 5 h depending on route" },
                ]
              : [
                  { Icon: Clock,        label: "Horario de salida", value: "Entre 8:00 y 9:00 AM" },
                  { Icon: Bus,          label: "Punto de encuentro", value: "Nuestra base en Xilitla" },
                  { Icon: CheckCircle2, label: "Duración",          value: "2 a 5 h según la ruta" },
                ]
            ).map((item) => (
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
            {en
              ? "Staying in Ciudad Valles? Ask us and we'll help you organise the trip up to Xilitla."
              : "¿Te hospedas en Ciudad Valles? Consúltanos y te ayudamos a organizar la subida a Xilitla."}
          </p>

          <a
            href={WA_LLEGADA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 px-4 py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 rounded"
          >
            <WhatsAppIcon />
            {en ? "Ask us how to get there →" : "Pregúntanos cómo llegar →"}
          </a>
        </div>
      </section>
    );
  }

  // ── Variante por defecto: pasamos por ti a tu hospedaje ──
  // No hay un punto de salida único: recogemos en Xilitla y en Ciudad Valles,
  // en el hospedaje del cliente (no hace falta que sea nuestro hotel).
  return (
    <section>
      <h2 className="font-cormorant text-crema text-2xl mb-6 flex items-center gap-3">
        <MapPin className="w-6 h-6 text-verde-selva flex-shrink-0" aria-hidden="true" /> {en ? "Pickup & transport" : "Recogida y transporte"}
      </h2>

      <div className="border border-white/10 bg-negro/40 p-5 space-y-5">
        {/* Texto intro */}
        <p className="text-crema/65 font-dm text-sm leading-relaxed">
          {en ? (
            <>We <strong className="text-crema font-medium">pick you up at your lodging</strong> —
            hotel, hostel, cabin or Airbnb— in{" "}
            <strong className="text-crema font-medium">Xilitla</strong> or{" "}
            <strong className="text-crema font-medium">Ciudad Valles</strong>, and bring you back at
            the end of the day. Round-trip transport is included; you don&apos;t need to stay with us.</>
          ) : (
            <><strong className="text-crema font-medium">Pasamos por ti a tu hospedaje</strong>
            —hotel, hostal, cabaña o Airbnb— en{" "}
            <strong className="text-crema font-medium">Xilitla</strong> o{" "}
            <strong className="text-crema font-medium">Ciudad Valles</strong>, y te regresamos al
            terminar el día. El traslado redondo va incluido y no necesitas hospedarte con nosotros.</>
          )}
        </p>

        {/* Las dos ciudades de recogida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(en
            ? [
                { ciudad: "Xilitla",       nota: "Sierra, Surrealist Garden and surroundings" },
                { ciudad: "Ciudad Valles", nota: "Waterfalls, Tamul and the Tampaón river" },
              ]
            : [
                { ciudad: "Xilitla",       nota: "Sierra, Jardín Surrealista y alrededores" },
                { ciudad: "Ciudad Valles", nota: "Cascadas, Tamul y el río Tampaón" },
              ]
          ).map((c) => (
            <div key={c.ciudad} className="bg-verde-profundo/30 border border-white/8 p-4 rounded">
              <p className="flex items-center gap-2 text-crema font-dm text-sm font-medium">
                <MapPin className="w-4 h-4 text-verde-vivo/70 flex-shrink-0" aria-hidden="true" />
                {c.ciudad}
              </p>
              <p className="text-crema/50 font-dm text-xs mt-1 pl-6">{c.nota}</p>
            </div>
          ))}
        </div>

        {/* Info de logística */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(en
            ? [
                { Icon: Clock,        label: "Pickup time",    value: "Between 8:00 and 9:00 AM" },
                { Icon: Bus,          label: "Transport",      value: "Round trip, included" },
                { Icon: CheckCircle2, label: "Approx. return", value: "6:00–7:00 PM" },
              ]
            : [
                { Icon: Clock,        label: "Hora de recogida", value: "Entre 8:00 y 9:00 AM" },
                { Icon: Bus,          label: "Traslado",          value: "Redondo, incluido" },
                { Icon: CheckCircle2, label: "Regreso aprox.",    value: "6:00–7:00 PM" },
              ]
          ).map((item) => (
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
          {en
            ? "Staying somewhere else? Tell us where and we'll see if we can reach you. We confirm the exact pickup time and address by WhatsApp after you book."
            : "¿Te hospedas en otro lado? Dinos dónde y vemos si podemos llegar por ti. La hora y la dirección exactas las confirmamos por WhatsApp al reservar."}
        </p>

        {/* CTA WhatsApp */}
        <a
          href={WA_LLEGADA}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 px-4 py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-all duration-200 rounded"
        >
          <WhatsAppIcon />
          {en ? "Ask about your pickup →" : "Pregunta por tu recogida →"}
        </a>
      </div>
    </section>
  );
}
