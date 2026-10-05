"use client";

import { useComparador } from "./ComparadorShell";
import { BotonCompartir } from "@/components/booking/BotonCompartir";
import { personasDe, urlComparar } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";
import { SITE } from "@/lib/i18n/config";
import { waLink } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * El cierre: UN WhatsApp para toda la comparación y "Compartir".
 *
 * El mensaje ya dice qué compara y para cuántos: quien contesta del otro lado
 * no tiene que preguntar nada antes de recomendar. Y compartir existe porque
 * casi ningún viaje lo decide una sola persona: la liga abre esta misma tabla,
 * con la misma gente, en el teléfono de la pareja o del grupo.
 */
export function CierreComparador() {
  const { nombres, grupo, locale, tipo, slugs } = useComparador();
  const ui = comparadorUI(locale);
  const mensaje = ui.cierre.mensajeWa(nombres, ui.grupo.resumen(grupo));

  return (
    <section className="mt-14 border border-dorado/25 bg-dorado/[0.05] p-6 md:p-8 md:flex md:items-center md:justify-between md:gap-8">
      <div>
        <h2 className="font-cormorant font-light text-crema text-2xl md:text-3xl">{ui.cierre.titulo}</h2>
        <p className="font-dm text-sm text-crema/70 leading-relaxed mt-2 max-w-xl">{ui.cierre.texto}</p>
        <p className="font-dm text-xs text-crema/40 mt-3">{ui.cierre.moneda}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0 shrink-0">
        <a
          href={waLink(mensaje)}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-manual="1"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "comparador", tours: slugs.join(","), personas: personasDe(grupo) })}
          className="inline-flex items-center justify-center min-h-[44px] bg-[#25D366] hover:bg-[#1fbf5b] text-negro px-6 font-dm text-[11px] tracking-[2px] uppercase font-medium transition-colors"
        >
          {ui.cierre.whatsapp}
        </a>
        <BotonCompartir
          titulo={ui.cierre.compartirTitulo[tipo]}
          texto={ui.cierre.compartirTexto(nombres)}
          obtenerUrl={() => `${SITE}${urlComparar(tipo, slugs, { grupo, locale })}`}
          origen="comparador"
          className="min-h-[44px] px-6 border border-white/20 hover:border-white/40 text-crema/85"
        />
      </div>
    </section>
  );
}
