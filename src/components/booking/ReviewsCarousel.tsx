"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Review {
  nombre:  string;
  ciudad:  string;
  fecha:   string;
  texto:   string;
  foto:    string;
}

const REVIEWS: Review[] = [
  {
    nombre: "Sandra Morales",
    ciudad: "Ciudad de México",
    fecha:  "Febrero 2025",
    foto:   "/imagenes/reviews/reviewer-1.jpg",
    texto:
      "Salimos a las 5:30 AM y valió cada minuto de sueño perdido. El guía conocía cada rincón y nos llevó al mirador perfecto para la foto. 10/10, sin duda el mejor tour que he hecho en México.",
  },
  {
    nombre: "Andrés y Valeria",
    ciudad: "Monterrey, NL",
    fecha:  "Enero 2025",
    foto:   "/imagenes/reviews/reviewer-14.jpg",
    texto:
      "La canoa por el Cañón del Tampaón es surrealista. Las paredes de roca, el silencio y de repente la cascada. Fue el mejor día del viaje. El desayuno que incluyeron estaba delicioso.",
  },
  {
    nombre: "Mariana Castro",
    ciudad: "Querétaro, QRO",
    fecha:  "Diciembre 2024",
    foto:   "/imagenes/reviews/reviewer-16.jpg",
    texto:
      "Las Pozas de Edward James son lo más extraño y hermoso que he visto en México. El guía nos contó toda la historia y el contexto lo hace todo más impresionante. Regresé al mes siguiente con mis papás.",
  },
];

const RATING_BARS = [
  { stars: 5, pct: 89 },
  { stars: 4, pct: 9 },
  { stars: 3, pct: 2 },
];

function StarRow() {
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-3.5 h-3.5 text-dorado fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewsCarousel() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => { setActive(idx); setVisible(true); }, 300);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActive((prev) => (prev + 1) % REVIEWS.length);
        setVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const r = REVIEWS[active];

  return (
    <div className="border border-negro/12 bg-verde-profundo/95 p-5 space-y-4">

      {/* Rating summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StarRow />
          <span className="font-cormorant text-dorado text-base leading-none">4.9</span>
          <span className="text-crema/45 font-dm text-[10px]">· 492 reseñas verificadas</span>
        </div>
        <div className="space-y-1">
          {RATING_BARS.map(({ stars, pct }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-[9px] text-crema/40 font-dm w-5 text-right">{stars}★</span>
              <div className="flex-1 h-1.5 bg-crema/10 rounded-full overflow-hidden">
                <div className="h-full bg-dorado/70 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[9px] text-crema/35 font-dm w-7">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10" />

      {/* Review card */}
      <div className="transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
        <div className="flex items-start gap-3 mb-3">
          {/* Foto real del viajero */}
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-crema/20">
            <Image
              src={r.foto}
              alt={r.nombre}
              width={36}
              height={36}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-crema font-dm text-sm font-medium leading-none">{r.nombre}</p>
            <p className="text-crema/35 font-dm text-[10px] mt-0.5">{r.ciudad} · {r.fecha}</p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <StarRow />
          </div>
        </div>
        <blockquote className="text-crema/75 font-dm text-xs leading-relaxed italic border-l-2 border-dorado/30 pl-3 line-clamp-3">
          "{r.texto}"
        </blockquote>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pt-1">
        {REVIEWS.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Reseña ${i + 1}`}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? "bg-dorado" : "bg-crema/20 hover:bg-crema/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
