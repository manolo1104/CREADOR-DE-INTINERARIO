"use client";

import { TRASLADOS, precioBase } from "@/lib/traslados";
import { formatMXN } from "@/lib/tourBooking";
import { trackTourEvent } from "@/lib/tourTracker";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/** Traslado privado desde la ciudad de origen, dentro del carrito. */
export function TrasladoCarrito({ c }: { c: CarritoCheckout }) {
  const {
    t, setCobro, conTraslado, setConTraslado, ciudadTraslado, setCiudadTraslado,
    paxTraslado, setPaxTraslado, rutaTraslado, precioDelTraslado,
  } = c;
  return (
    <>
      {/* ── TRASLADO DESDE TU CIUDAD ───────────────────────────────────
          El último tramo hasta Xilitla son casi dos horas de sierra con
          curvas y neblina, y era el motivo por el que había gente que no
          venía. Va apagado por defecto, como el hotel: quien llega en su
          coche no tiene por qué ver un cargo que no pidió. */}
      <section className="mt-8 border border-negro/10 bg-white p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={conTraslado}
            onChange={(e) => { setConTraslado(e.target.checked); setCobro(null); }}
            className="mt-1 w-4 h-4 accent-verde-selva"
          />
          <span>
            <span className="block font-cormorant text-verde-profundo text-xl">
              {t.trasladoTitulo}
            </span>
            <span className="block font-dm text-[12px] text-negro/50 mt-0.5">
              {t.trasladoSub}
            </span>
          </span>
        </label>

        {/* Las ciudades y sus precios, sin abrir nada. Mismo problema que
            el hospedaje: el dato que decide —"desde cuánto sale que me
            lleven"— vivía detrás de una casilla apagada, así que quien no
            la marcaba no llegaba a saber que el traslado existía. Aquí solo
            se asoma el precio; elegir sigue siendo un acto deliberado. */}
        {!conTraslado && (
          <p className="font-dm text-[12px] text-negro/55 mt-3">
            {TRASLADOS.map((r) => `${r.ciudad} ${t.desdeRedondo(formatMXN(precioBase(r)))}`).join(" · ")}
            {" · "}
            <span className="text-negro/40">{t.trasladoPorVehiculo}</span>
          </p>
        )}

        {conTraslado && (
          <div className="mt-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-2">
              {TRASLADOS.map((r) => {
                const activa = ciudadTraslado === r.slug;
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => { setCiudadTraslado(r.slug); setCobro(null); }}
                    className={`text-left border p-3 transition-colors ${
                      activa ? "border-verde-selva bg-verde-selva/5" : "border-negro/15 hover:border-verde-selva/50"
                    }`}
                  >
                    <span className="block font-dm text-[13px] text-negro/85">{r.ciudad}</span>
                    <span className="block font-dm text-[11px] text-negro/45 mt-0.5">
                      {t.desdeRedondo(formatMXN(precioBase(r)))}
                    </span>
                  </button>
                );
              })}
            </div>

            {rutaTraslado && (
              <>
                <div className="flex items-center justify-between gap-3 border-t border-negro/8 pt-3">
                  <span className="font-dm text-[12px] text-negro/60">{t.cuantosViajan}</span>
                  <span className="flex items-center gap-2">
                    <button type="button" aria-label={t.menosPasajeros}
                      onClick={() => { setPaxTraslado((n) => Math.max(1, n - 1)); setCobro(null); }}
                      className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                    <span className="font-dm text-[13px] text-negro/80 w-6 text-center tabular-nums">{paxTraslado}</span>
                    <button type="button" aria-label={t.masPasajeros}
                      onClick={() => { setPaxTraslado((n) => Math.min(20, n + 1)); setCobro(null); }}
                      className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                  </span>
                </div>

                {precioDelTraslado !== null ? (
                  <p className="flex justify-between font-dm text-[13px] text-negro/70 border-t border-negro/8 pt-3">
                    <span>{t.trasladoLinea(rutaTraslado.ciudad, paxTraslado)}</span>
                    <strong className="whitespace-nowrap">{formatMXN(precioDelTraslado)} MXN</strong>
                  </p>
                ) : (
                  <p className="font-dm text-[12px] text-terracota">
                    {t.trasladoGrupoGrande(paxTraslado)}
                    <a
                      href={`https://wa.me/524891090388?text=${encodeURIComponent(
                        t.waTrasladoGrande(paxTraslado, rutaTraslado.ciudad),
                      )}`}
                      target="_blank" rel="noopener noreferrer"
                      data-wa-manual="1"
                      onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_traslado_grupo_grande", ciudad: rutaTraslado.slug, personas: paxTraslado })}
                      className="underline underline-offset-2"
                    >
                      {t.escribenosPorWhatsapp}
                    </a>{t.trasladoSigueSin}
                  </p>
                )}
                <p className="font-dm text-[11px] text-negro/40">
                  {t.trasladoPorVehiculo}
                </p>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
