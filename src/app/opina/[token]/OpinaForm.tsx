"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";

const T = {
  es: {
    eyebrow: "Después de tu viaje",
    titulo: (n: string) => `${n ? `${n}, ¿` : "¿"}cómo te fue?`,
    bajada: (t: string) => `En tu tour «${t}».`,
    yaContesto: "Ya nos habías contestado. Si quieres, cambia tu respuesta y vuelve a enviar.",
    estrellas: "¿Qué calificación le das?",
    nps: "Del 0 al 10, ¿qué tan probable es que nos recomiendes con un amigo o familiar?",
    npsPoco: "Nada probable", npsMucho: "Muy probable",
    comentario: "¿Algo que quieras contarnos? (opcional)",
    comentarioPh: "Lo que más te gustó, o lo que deberíamos mejorar",
    enviar: "Enviar", enviando: "Enviando…",
    falta: "Toca una estrella para calificar.",
    error: "No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.",
    gracias: "¡Gracias!",
    graciasBien: "Nos alegra muchísimo. Si tienes un minuto más, tu reseña en Google es lo que lee la siguiente persona que está decidiendo si venir.",
    graciasMal: "Gracias por decírnoslo. Lo vamos a revisar y alguien del equipo te va a escribir. Y si quieres contarlo en Google, también puedes hacerlo.",
    google: "Escribir una reseña en Google",
  },
  en: {
    eyebrow: "After your trip",
    titulo: (n: string) => `${n ? `${n}, how` : "How"} did it go?`,
    bajada: (t: string) => `On your “${t}” tour.`,
    yaContesto: "You already answered. Feel free to change it and send again.",
    estrellas: "How would you rate it?",
    nps: "From 0 to 10, how likely are you to recommend us to a friend or family member?",
    npsPoco: "Not likely", npsMucho: "Very likely",
    comentario: "Anything you'd like to tell us? (optional)",
    comentarioPh: "What you loved most, or what we should improve",
    enviar: "Send", enviando: "Sending…",
    falta: "Tap a star to rate.",
    error: "We couldn't send it. Try again or message us on WhatsApp.",
    gracias: "Thank you!",
    graciasBien: "We're so glad. If you have one more minute, a Google review — in English — is what the next English-speaking traveler will actually read.",
    graciasMal: "Thank you for telling us. We'll look into it and someone from the team will reach out. And if you'd like to share it on Google, you can do that too.",
    google: "Write a Google review",
  },
} as const;

export function OpinaForm({ token, locale, nombre, tour, googleUrl, inicial, yaContesto }: {
  token: string;
  locale: Locale;
  /** Ya es el nombre de pila (`nombreDePila`, lo calcula la página). */
  nombre: string;
  tour: string;
  googleUrl: string;
  inicial: { calificacion: number; recomendaria: number | null; comentario: string };
  yaContesto: boolean;
}) {
  const t = T[locale];
  const [estrellas, setEstrellas] = useState(inicial.calificacion);
  const [nps, setNps] = useState<number | null>(inicial.recomendaria);
  const [comentario, setComentario] = useState(inicial.comentario);
  const [sitio, setSitio] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError] = useState("");

  async function enviar() {
    setError("");
    if (estrellas < 1) { setError(t.falta); return; }
    setEstado("enviando");
    try {
      const r = await fetch("/api/opina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, calificacion: estrellas, recomendaria: nps, comentario, sitio }),
      });
      if (!r.ok) { setError(t.error); setEstado("idle"); return; }
      setEstado("listo");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t.error);
      setEstado("idle");
    }
  }

  // 🔴 El botón de Google sale a TODOS, sin importar la calificación (Google
  // prohíbe pedirle la reseña solo a los contentos). Cambia el texto, no el botón.
  if (estado === "listo") {
    return (
      <div className="w-full max-w-lg mx-auto">
        <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado mb-5">Tours Huasteca Potosina</p>
        <h1 className="font-cormorant font-light text-verde-profundo text-[42px] leading-tight mb-4">{t.gracias}</h1>
        <p className="font-dm text-base text-negro/70 leading-relaxed mb-8">{estrellas >= 4 ? t.graciasBien : t.graciasMal}</p>
        <a href={googleUrl} target="_blank" rel="noopener"
          className="inline-flex items-center justify-center w-full min-h-[52px] bg-dorado hover:bg-lima text-negro px-8 py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium rounded-md transition-colors">
          {t.google}
        </a>
      </div>
    );
  }

  return (
    <form className="w-full max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
      <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado mb-4">{t.eyebrow}</p>
      <h1 className="font-cormorant font-light text-verde-profundo text-[38px] sm:text-[44px] leading-[1.1] mb-3">{t.titulo(nombre)}</h1>
      <p className="font-dm text-base text-negro/60 leading-relaxed">{t.bajada(tour)}</p>
      {yaContesto && <p className="font-dm text-[14px] text-verde-selva mt-2">✓ {t.yaContesto}</p>}

      <div className="mt-10 space-y-9">
        <div>
          <span className="block font-dm text-[15px] font-medium text-verde-profundo mb-3">{t.estrellas}</span>
          <div role="radiogroup" aria-label={t.estrellas} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={estrellas === n} aria-label={`${n}`}
                onClick={() => setEstrellas(n)}
                className={`w-14 h-14 text-[40px] leading-none transition-transform active:scale-90 ${n <= estrellas ? "text-dorado" : "text-negro/15"}`}>
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block font-dm text-[15px] font-medium text-verde-profundo mb-3">{t.nps}</span>
          <div role="radiogroup" aria-label={t.nps} className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} type="button" role="radio" aria-checked={nps === n} onClick={() => setNps(n)}
                className={`h-11 rounded-md border font-dm text-[15px] transition-colors ${
                  nps === n ? "bg-verde-profundo border-verde-profundo text-crema" : "bg-white border-verde-profundo/20 text-verde-profundo"
                }`}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between font-dm text-[12px] text-negro/45 mt-1.5">
            <span>{t.npsPoco}</span><span>{t.npsMucho}</span>
          </div>
        </div>

        <div>
          <label htmlFor="op-com" className="block font-dm text-[15px] font-medium text-verde-profundo mb-3">{t.comentario}</label>
          <textarea id="op-com" value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} maxLength={1500}
            placeholder={t.comentarioPh}
            className="w-full bg-white border border-verde-profundo/20 rounded-md px-4 py-3 font-dm text-base text-negro placeholder:text-negro/35 focus:outline-none focus:border-verde-selva focus:ring-2 focus:ring-verde-selva/20" />
        </div>

        <input type="text" name="sitio" value={sitio} onChange={(e) => setSitio(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        {error && <p role="alert" className="font-dm text-[14px] text-terracota">{error}</p>}

        <button type="submit" disabled={estado === "enviando"}
          className="w-full min-h-[52px] bg-dorado hover:bg-lima text-negro px-8 py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium rounded-md transition-colors disabled:opacity-50">
          {estado === "enviando" ? t.enviando : t.enviar}
        </button>
      </div>
    </form>
  );
}
