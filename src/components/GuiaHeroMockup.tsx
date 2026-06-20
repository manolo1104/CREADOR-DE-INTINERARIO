import Image from "next/image";
import { MapPin, Wallet, ListChecks, CalendarDays } from "lucide-react";

// Mockup profesional para el hero de /guia: la guía vista en un teléfono
// (refuerza "la llevas en tu celular"), con chips flotantes de prueba social.
const SECCIONES = [
  { Icon: MapPin, t: "Cómo llegar y moverte" },
  { Icon: Wallet, t: "Presupuesto por viajero" },
  { Icon: CalendarDays, t: "3 itinerarios listos" },
  { Icon: ListChecks, t: "Checklist de empaque" },
];

export function GuiaHeroMockup() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]">
      {/* Halo */}
      <div className="absolute -inset-10 bg-verde-vivo/10 blur-3xl rounded-full" aria-hidden="true" />

      {/* Teléfono */}
      <div
        className="relative rounded-[2.4rem] border-[6px] border-[#0a0f0a] bg-[#0a0f0a] overflow-hidden"
        style={{ boxShadow: "0 35px 70px -20px rgba(0,0,0,0.8)", transform: "rotate(-3deg)" }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#0a0f0a] rounded-b-2xl z-20" aria-hidden="true" />

        {/* Pantalla */}
        <div className="relative bg-gradient-to-b from-verde-profundo to-negro">
          {/* Portada con foto real */}
          <div className="relative h-36">
            <Image src="/imagenes/sotano-de-las-golondrinas/hero.jpg" alt="" fill className="object-cover opacity-85" sizes="290px" />
            <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-[7px] tracking-[2.5px] uppercase text-verde-vivo mb-1 font-dm">Guía Definitiva · 2026</p>
              <p className="font-cormorant text-crema text-xl leading-none">Huasteca Potosina</p>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-4 space-y-2.5">
            <p className="text-[7px] tracking-[2px] uppercase text-crema/35 font-dm">Contenido</p>
            {SECCIONES.map(({ Icon, t }) => (
              <div key={t} className="flex items-center gap-2.5 border border-white/8 bg-white/[0.03] rounded px-2.5 py-2">
                <Icon className="w-3.5 h-3.5 text-verde-vivo flex-shrink-0" aria-hidden="true" />
                <span className="text-[9px] text-crema/70 font-dm leading-none">{t}</span>
              </div>
            ))}

            {/* Tarjeta de muestra "Día 1" */}
            <div className="mt-3 rounded border border-dorado/25 bg-dorado/5 p-3">
              <p className="text-[7px] tracking-[2px] uppercase text-dorado/80 font-dm mb-1">Itinerario · Día 1</p>
              <p className="text-[9px] text-crema/75 font-dm leading-snug">
                Llegada a Xilitla · Las Pozas al atardecer · cena en el mercado local.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chips flotantes (prueba social real) — anclados a las ESQUINAS, sobre el borde
          del teléfono, nunca sobre el contenido de la pantalla. */}
      <div className="absolute -top-4 -left-4 bg-negro/95 border border-white/12 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
        <p className="font-cormorant text-dorado text-lg leading-none">4.9★</p>
        <p className="text-[7px] tracking-[1px] uppercase text-crema/45 font-dm mt-0.5">Google · 492 reseñas</p>
      </div>
      <div className="absolute -bottom-4 -right-4 bg-negro/95 border border-white/12 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
        <p className="text-[9px] text-verde-vivo font-dm font-medium leading-none">⬇ Descarga</p>
        <p className="text-[7px] tracking-[1px] uppercase text-crema/45 font-dm mt-0.5">inmediata</p>
      </div>
    </div>
  );
}
