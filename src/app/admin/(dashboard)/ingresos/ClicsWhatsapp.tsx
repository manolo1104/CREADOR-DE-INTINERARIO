"use client";

import { MessageCircle } from "lucide-react";
import type { ClicsWhatsapp } from "@/lib/admin/clicsWhatsapp";

const fDia = (ymd: string) => `${Number(ymd.slice(8, 10))}`;

/**
 * Cuánta gente abre WhatsApp desde el sitio, y desde dónde.
 *
 * El dato que faltaba: el sitio informa, pero la venta se cierra por chat. Sin
 * esto, la única cifra era la reserva cerrada, que llega días después y no
 * dice qué página la provocó.
 */
export default function ClicsWhatsapp({ datos }: { datos: ClicsWhatsapp }) {
  const maximo = Math.max(1, ...datos.porDia.map(d => d.clics));
  const conversion = datos.ultimos30 > 0
    ? Math.round((datos.reservasEnElPeriodo / datos.ultimos30) * 100)
    : 0;

  return (
    <div className="panel-card panel-card-alta p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-cormorant text-[#16362a] text-lg font-light flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#2b845c]" strokeWidth={1.75} />
            Clics a WhatsApp
          </h3>
          <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-0.5">
            Últimos 30 días. Cada clic es alguien que abrió la conversación desde el sitio.
          </p>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="panel-eyebrow">7 días</p>
            <p className="panel-cifra font-cormorant text-[26px] leading-none font-light text-[#16362a]">{datos.ultimos7}</p>
          </div>
          <div>
            <p className="panel-eyebrow">30 días</p>
            <p className="panel-cifra font-cormorant text-[26px] leading-none font-light text-[#2b845c]">{datos.ultimos30}</p>
          </div>
        </div>
      </div>

      {datos.ultimos30 === 0 ? (
        <p className="text-[rgba(22,54,42,0.51)] font-dm text-xs py-3">
          Todavía no hay clics registrados. Empiezan a contarse desde que esto se publicó.
        </p>
      ) : (
        <>
          {/* Últimos 14 días */}
          <div className="flex items-end gap-[3px] h-16 mb-1" role="img"
               aria-label={`Clics por día en los últimos 14 días. Máximo ${maximo}.`}>
            {datos.porDia.map(d => (
              <div key={d.dia} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full rounded-t-[3px] bg-[#2b845c]/75 group-hover:bg-[#2b845c] transition-colors"
                     style={{ height: `${Math.max(3, (d.clics / maximo) * 100)}%` }}
                     title={`${d.dia}: ${d.clics} ${d.clics === 1 ? "clic" : "clics"}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-dm text-[rgba(22,54,42,0.42)] mb-5">
            <span>hace 14 días</span><span>hoy</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className="panel-eyebrow mb-2">Desde qué página</p>
              <ul className="space-y-1">
                {datos.porPagina.map(p => (
                  <li key={p.pagina} className="flex items-baseline gap-2 text-xs font-dm">
                    <span className="text-[rgba(22,54,42,0.66)] truncate flex-1" title={p.pagina}>
                      {p.pagina === "/" ? "Inicio" : p.pagina}
                    </span>
                    <span className="panel-cifra text-[#16362a] font-medium">{p.clics}</span>
                  </li>
                ))}
              </ul>
            </div>

            {datos.porTour.length > 0 && (
              <div>
                <p className="panel-eyebrow mb-2">Qué tour preguntan</p>
                <ul className="space-y-1">
                  {datos.porTour.map(t => (
                    <li key={t.slug} className="flex items-baseline gap-2 text-xs font-dm">
                      <span className="text-[rgba(22,54,42,0.66)] truncate flex-1" title={t.nombre}>{t.nombre}</span>
                      <span className="panel-cifra text-[#16362a] font-medium">{t.clics}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)] mt-4 pt-3 border-t border-[rgba(27,67,50,0.10)]">
            En el mismo periodo entraron <strong className="text-[#16362a] font-medium">{datos.reservasEnElPeriodo} reservas</strong>.
            {conversion > 0 && <> De cada 100 conversaciones abiertas, <strong className="text-[#16362a] font-medium">{conversion}</strong> acabaron en reserva.</>}
          </p>
        </>
      )}
    </div>
  );
}
