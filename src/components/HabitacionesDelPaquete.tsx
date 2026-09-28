"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";

/**
 * Las habitaciones que ofrece un paquete, en la ficha del paquete.
 *
 * Es cliente por una sola razón: abrir la galería. Cada cuarto tiene varias
 * fotos —las mismas que enseña el sitio del hotel— y hasta ahora la ficha
 * mostraba una sola, así que quien estaba a punto de apartar tres noches veía
 * un cuarto por una rendija. El resto de la sección sigue siendo servidor.
 *
 * Las etiquetas llegan ya resueltas desde la página: las funciones de
 * traducción no cruzan la frontera cliente/servidor.
 */
export interface HabitacionFicha {
  id: string;
  nombre: string;
  imagen: string;
  vista: string;
  descripcion: string;
  alt: string;
  /** Texto del distintivo de la esquina. */
  etiqueta: string;
  /** Distintivo dorado: es la habitación que se da, o la que cuesta más. */
  destacada: boolean;
}

export function HabitacionesDelPaquete({
  habitaciones,
  columnas,
  verFotos,
}: {
  habitaciones: HabitacionFicha[];
  /** Cuántas caben en pantalla ancha: dos cuando la habitación viene asignada. */
  columnas: 2 | 4;
  verFotos: string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <>
      <div className={`grid gap-4 ${columnas === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {habitaciones.map((h) => {
          const cat = HABITACIONES_HOTEL.find((x) => x.id === h.id);
          const fotos = cat?.galeria?.length ?? 1;
          return (
            <div key={h.id} className="border border-white/10 bg-negro/50 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => setAbierta(h.id)}
                className="group relative aspect-[4/3] overflow-hidden w-full"
                aria-label={`${h.nombre} — ${verFotos}`}
              >
                <Image
                  src={h.imagen}
                  alt={h.alt}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes={columnas === 2 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"}
                />
                <span className={`absolute top-2 right-2 text-[9px] font-dm tracking-[1px] uppercase px-2 py-1 ${
                  h.destacada ? "bg-dorado text-negro font-bold" : "bg-negro/80 text-crema/80"
                }`}>
                  {h.etiqueta}
                </span>
                {/* Cuántas fotos hay detrás. Sin el número, la foto no se lee
                    como el principio de una galería y nadie la abre. */}
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-negro/75 backdrop-blur-sm px-2.5 py-1 text-[9px] font-dm tracking-[1px] text-crema/90 transition-colors group-hover:bg-negro/90">
                  <Expand className="w-3 h-3" aria-hidden="true" /> {fotos}
                </span>
              </button>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-cormorant text-crema text-lg leading-tight">{h.nombre}</h3>
                <p className="text-[10px] tracking-[1px] uppercase text-verde-vivo/70 font-dm mb-2">{h.vista}</p>
                <p className="text-crema/55 font-dm text-xs leading-relaxed">{h.descripcion}</p>
              </div>
            </div>
          );
        })}
      </div>

      <GaleriaHabitacion
        habitacion={HABITACIONES_HOTEL.find((h) => h.id === abierta) ?? null}
        abierta={!!abierta}
        onCerrar={() => setAbierta(null)}
      />
    </>
  );
}
