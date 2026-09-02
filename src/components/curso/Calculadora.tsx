"use client";

import { useMemo, useState } from "react";
import { trackCtaClick } from "@/lib/analytics";

/**
 * Calculadora de reservas perdidas.
 *
 * Es el imán de la campaña y se repite en tres correos. Todo se calcula aquí,
 * en el navegador de quien la usa: no pide correo y no manda nada a ningún
 * lado. Esa promesa es parte del gancho, así que no la rompas metiéndole un
 * formulario.
 */

const SEMANAS_MES = 4.3;
/** De las que contestas tarde, cuántas cerrarías contestando a tiempo. */
const BRECHA = 0.25;

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

function Barra({
  id,
  etiqueta,
  ayuda,
  min,
  max,
  paso,
  valor,
  muestra,
  onChange,
}: {
  id: string;
  etiqueta: string;
  ayuda: string;
  min: number;
  max: number;
  paso: number;
  valor: number;
  muestra: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mb-7 last:mb-0">
      <label htmlFor={id} className="block font-dm text-base leading-snug text-negro/85">
        {etiqueta}
      </label>
      <p className="mt-1.5 font-cormorant text-3xl font-semibold leading-none text-dorado tabular-nums">
        {muestra}
      </p>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2.5 h-7 w-full accent-dorado"
      />
      <p className="font-dm text-sm text-negro/50">{ayuda}</p>
    </div>
  );
}

export function Calculadora() {
  const [cots, setCots] = useState(12);
  const [rapido, setRapido] = useState(40);
  const [ticket, setTicket] = useState(2500);

  const r = useMemo(() => {
    const cotsMes = cots * SEMANAS_MES;
    const tarde = cotsMes * (1 - rapido / 100);
    const ventas = tarde * BRECHA;
    return { cotsMes, tarde, ventas, dinero: ventas * ticket };
  }, [cots, rapido, ticket]);

  return (
    <div className="grid gap-7 md:grid-cols-2 md:gap-9">
      <div className="border border-negro/15 bg-white/70 p-6 sm:p-7">
        <Barra
          id="cots"
          etiqueta="¿Cuántas cotizaciones te llegan por WhatsApp a la semana?"
          ayuda="Cuenta todas, aunque no cierren."
          min={1}
          max={80}
          paso={1}
          valor={cots}
          muestra={String(cots)}
          onChange={setCots}
        />
        <Barra
          id="rapido"
          etiqueta="De esas, ¿a cuántas alcanzas a contestar en menos de 10 minutos?"
          ayuda="Sé honesto. Cuenta noches, domingos y días de tour."
          min={0}
          max={100}
          paso={5}
          valor={rapido}
          muestra={`${rapido} %`}
          onChange={setRapido}
        />
        <Barra
          id="ticket"
          etiqueta="¿Cuánto deja en promedio una venta cerrada?"
          ayuda="El total de la reserva, no tu ganancia."
          min={500}
          max={20000}
          paso={250}
          valor={ticket}
          muestra={pesos(ticket)}
          onChange={setTicket}
        />
      </div>

      <div className="bg-verde-profundo p-6 text-crema sm:p-8">
        <p className="font-dm text-xs font-medium uppercase tracking-[2.5px] text-lima">
          Se te está yendo, cada mes
        </p>
        <p className="mt-3 whitespace-nowrap font-cormorant text-[3.4rem] font-semibold leading-none text-white tabular-nums sm:text-6xl">
          {pesos(r.dinero)}
        </p>
        <p className="mt-2.5 font-dm text-lg text-crema/70">
          Son {pesos(r.dinero * 12)} al año.
        </p>

        <dl className="mt-7 space-y-3 border-t border-lima/25 pt-6 font-dm text-[15px]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-crema/70">Cotizaciones al mes</dt>
            <dd className="font-medium text-white tabular-nums">{Math.round(r.cotsMes)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-crema/70">Las que contestas tarde</dt>
            <dd className="font-medium text-white tabular-nums">{Math.round(r.tarde)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-crema/70">Ventas que eso te cuesta</dt>
            <dd className="font-medium text-white tabular-nums">
              {r.ventas.toFixed(1).replace(".0", "")}
            </dd>
          </div>
        </dl>

        <a
          href="/curso/webinar#registro"
          onClick={() => trackCtaClick("curso_lead", "calculadora")}
          className="mt-7 block bg-dorado px-6 py-4 text-center font-dm text-base font-medium text-negro transition hover:bg-dorado/90 active:scale-[0.98]"
        >
          Reservar mi lugar gratis
        </a>

        <p className="mt-4 font-dm text-[13px] leading-relaxed text-crema/50">
          El supuesto: contestar en menos de 10 minutos te hace cerrar{" "}
          <strong className="text-crema/75">una de cada cuatro</strong> cotizaciones más
          que contestar tarde. Es conservador y lo puedes discutir. Lo que importa aquí es
          el orden de magnitud, no el decimal. En el taller construyo en vivo el agente que
          contesta esas cotizaciones por ti.
        </p>
      </div>
    </div>
  );
}
