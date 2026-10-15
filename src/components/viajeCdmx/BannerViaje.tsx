import Image from "next/image";
import { Bus, BedDouble, Coffee, Landmark, Waves, ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { salidasPublicas, type SalidaVista } from "@/lib/viajeCdmx/salidas";
import { diaMX, pesos, rangoLargo } from "@/lib/viajeCdmx/precio";
import { ANTICIPO_PCT, DIAS, NOCHES, PUNTO_SALIDA, SALIDA_TEXTO, VIAJE_RUTA } from "@/lib/viajeCdmx/config";

/**
 * El viaje CDMX–Xilitla, justo debajo del hero del inicio y de /paquetes
 * (Manolo, 15 oct 2026). Solo en español: el viaje solo se vende así.
 *
 * Los números (próxima fecha, lugares, precio) salen de la base en cada visita,
 * igual que en la página del viaje: nada escrito a mano. La barra de lugares es
 * la ocupación real. Si la base tarda o falla, el bloque sale igual pero SIN
 * números —mejor sin cifra que con una vieja— y la portada no espera más de
 * 1.5 s por él. Sin fecha a la venta, invita a la lista de espera.
 */
const INCLUYE_CORTO = [
  { Icon: Bus, t: "Transporte redondo" },
  { Icon: BedDouble, t: `${NOCHES} noches en Paraíso Encantado` },
  { Icon: Coffee, t: "3 desayunos en El Papán" },
  { Icon: Landmark, t: "Ruta Surrealista" },
  { Icon: Waves, t: "Expedición Tamul" },
];

const CIFRAS: [string, string][] = [
  [String(DIAS), "días"],
  [String(NOCHES), "noches"],
  ["3", "desayunos"],
  ["2", "recorridos"],
];

async function proximaSalida(): Promise<SalidaVista | null | "sin-datos"> {
  try {
    const salidas = await Promise.race([
      salidasPublicas(),
      new Promise<never>((_, no) => setTimeout(() => no(new Error("lento")), 1500)),
    ]);
    return salidas.find((s) => s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos") ?? null;
  } catch {
    return "sin-datos";
  }
}

export async function BannerViaje({ origen }: { origen: "inicio" | "paquetes" }) {
  const p = await proximaSalida();
  const proxima = p === "sin-datos" ? null : p;
  const sinFecha = p === null;
  const ocupadoPct = proxima ? Math.round(((proxima.capacidad - proxima.disponibles) / Math.max(1, proxima.capacidad)) * 100) : 0;

  return (
    <section aria-label="Viaje CDMX–Xilitla: salida grupal todo incluido" className="relative overflow-hidden bg-negro border-y border-white/10">
      {/* La foto: arriba en el celular, de fondo en escritorio con la cascada a la izquierda y el texto a la derecha. */}
      <div className="relative h-[230px] sm:h-[300px] md:absolute md:inset-0 md:h-auto">
        <Image
          src="/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg"
          alt="La cascada de Tamul con un arcoíris sobre el río turquesa"
          fill
          className="object-cover object-[28%_50%] md:object-[18%_50%]"
          sizes="100vw"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,23,16,0)_45%,#0e1710_100%)] md:bg-[linear-gradient(270deg,#0e1710_0%,rgba(14,23,16,0.94)_40%,rgba(14,23,16,0.35)_70%,rgba(14,23,16,0)_100%)]" />
        <p className="absolute bottom-3 left-4 md:bottom-6 md:left-6 font-dm text-[10px] uppercase tracking-[2.5px] text-crema/70">Cascada de Tamul · 105 m</p>
      </div>

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-10 md:py-14">
        <div className="md:ml-auto md:max-w-[560px]">
          <p className="font-dm text-[10px] uppercase tracking-[3.5px] text-verde-vivo inline-flex items-center gap-2">
            <Bus className="w-3.5 h-3.5" aria-hidden="true" /> Salida grupal desde CDMX · cada mes
          </p>
          <h2 className="mt-3 font-cormorant font-light text-crema leading-[1.02]" style={{ fontSize: "clamp(32px,4.6vw,52px)" }}>
            Viaje CDMX–Xilitla, <em className="text-dorado">todo incluido</em>
          </h2>
          <p className="mt-3 font-dm text-[15px] text-crema/75 leading-relaxed">
            Sales {SALIDA_TEXTO} del {PUNTO_SALIDA.nombre} y despiertas en Xilitla. Sin manejar y sin armar nada.
          </p>

          <dl className="mt-6 grid grid-cols-4 border-y border-white/10 divide-x divide-white/10">
            {CIFRAS.map(([n, l]) => (
              <div key={l} className="py-3 text-center">
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block font-cormorant text-dorado text-3xl leading-none">{n}</span>
                  <span className="block mt-1 font-dm text-[10px] uppercase tracking-[1.5px] text-crema/55">{l}</span>
                </dd>
              </div>
            ))}
          </dl>

          <ul className="mt-5 flex flex-wrap gap-2">
            {INCLUYE_CORTO.map(({ Icon, t }) => (
              <li key={t} className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 px-2.5 py-1.5 font-dm text-[11px] text-crema/85">
                <Icon className="w-3.5 h-3.5 text-dorado shrink-0" aria-hidden="true" />{t}
              </li>
            ))}
          </ul>

          <div className="mt-6 border border-dorado/35 bg-negro/70 backdrop-blur-sm p-4 sm:p-5">
            {proxima ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-dm text-[10px] uppercase tracking-[2px] text-crema/55">Próxima salida</p>
                  <p className="font-dm text-xs text-crema/70">
                    Quedan <strong className="text-crema">{proxima.disponibles}</strong> de {proxima.capacidad} lugares
                  </p>
                </div>
                <p className="mt-1 font-cormorant text-crema text-2xl">{rangoLargo(proxima.fechaSalida, proxima.fechaRegreso)}</p>
                <div className="mt-2 h-1.5 bg-white/10" role="img" aria-label={`${proxima.capacidad - proxima.disponibles} de ${proxima.capacidad} lugares ocupados`}>
                  <div className="h-full bg-dorado" style={{ width: `${ocupadoPct}%` }} />
                </div>
                <p className="mt-3 font-dm text-crema">
                  <span className="font-cormorant text-dorado text-[34px] leading-none">{pesos(proxima.precioVigente)}</span>
                  <span className="text-xs text-crema/60"> por persona · apartas con el {ANTICIPO_PCT} %</span>
                </p>
                {proxima.enPreventa && proxima.finPreventa && (
                  <p className="mt-1 text-[11px] font-dm text-dorado/90">Precio de preventa hasta el {diaMX(proxima.finPreventa)}</p>
                )}
              </>
            ) : (
              <p className="font-dm text-sm text-crema/75">
                {sinFecha ? "Las próximas fechas abren muy pronto. Anótate y te avisamos con el precio de preventa." : "Mira las fechas, los lugares y el precio de cada salida."}
              </p>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <TrackedLink
                href={`${VIAJE_RUTA}#fechas`}
                event="VIAJE_BANNER_CLICK"
                data={{ origen, boton: "fechas", salida: proxima?.fechaSalida ?? null }}
                className="group inline-flex flex-1 items-center justify-center gap-2 min-h-[48px] px-6 bg-dorado text-negro hover:bg-crema text-[11px] tracking-[2px] uppercase font-dm transition-colors"
              >
                {proxima ? "Ver fechas y apartar" : sinFecha ? "Avísame" : "Ver el viaje"}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </TrackedLink>
              <TrackedLink
                href={`${VIAJE_RUTA}#incluye`}
                event="VIAJE_BANNER_CLICK"
                data={{ origen, boton: "incluye" }}
                className="inline-flex items-center justify-center min-h-[48px] px-6 border border-white/25 text-crema hover:bg-white/10 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
              >
                Qué incluye
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
