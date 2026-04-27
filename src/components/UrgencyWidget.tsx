"use client";

import { useEffect, useState } from "react";

const NOMBRES = [
  "Carlos M.", "Andrea R.", "Luis F.", "Sofía G.", "Miguel Á.",
  "Valeria H.", "Roberto T.", "Daniela C.", "Jorge L.", "Patricia S.",
  "Eduardo N.", "Fernanda P.", "Alejandro V.", "Mariana B.", "Ricardo E.",
];

const TOURS = [
  "Ruta Surrealista", "Cascada Tamul", "Sótano de las Golondrinas",
  "Tour Cascadas", "Puente de Dios", "Cascadas de Micos",
  "Ruta Familiar", "Tour Cultural", "Aventura Extrema",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNotification() {
  const nombre = NOMBRES[rand(0, NOMBRES.length - 1)];
  const tour   = TOURS[rand(0, TOURS.length - 1)];
  const horas  = rand(1, 11);
  return `${nombre} reservó ${tour} hace ${horas}h`;
}

export function UrgencyWidget() {
  const [viewers, setViewers]     = useState(rand(18, 47));
  const [notif, setNotif]         = useState<string | null>(null);
  const [visible, setVisible]     = useState(false);

  // Rotar viewers cada 25–45 s
  useEffect(() => {
    const id = setInterval(() => {
      setViewers(rand(18, 47));
    }, rand(25000, 45000));
    return () => clearInterval(id);
  }, []);

  // Mostrar notificación cada 20–40 s
  useEffect(() => {
    const show = () => {
      setNotif(randomNotification());
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };
    const first = setTimeout(show, rand(8000, 15000));
    const id    = setInterval(show, rand(20000, 40000));
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  return (
    <>
      {/* Contador de personas viendo */}
      <div className="flex items-center gap-2 text-[11px] font-dm text-verde-profundo/70">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verde-selva opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-verde-vivo" />
        </span>
        <span><strong className="text-verde-selva">{viewers}</strong> personas viendo ahora</span>
      </div>

      {/* Toast de reserva reciente */}
      {notif && (
        <div
          className={`fixed bottom-6 left-4 z-50 flex items-center gap-3 bg-white border border-verde-selva/20 shadow-lg rounded-lg px-4 py-3 max-w-xs transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <span className="text-lg">✅</span>
          <div>
            <p className="text-[11px] font-dm text-negro font-medium leading-tight">{notif}</p>
            <p className="text-[10px] text-negro/40 font-dm mt-0.5">Huasteca Potosina</p>
          </div>
        </div>
      )}
    </>
  );
}
