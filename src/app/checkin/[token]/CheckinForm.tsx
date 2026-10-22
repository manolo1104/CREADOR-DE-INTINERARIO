"use client";

import { useState } from "react";
import {
  CIUDADES_SUGERIDAS, COMO_NOS_CONOCIO, MOTIVOS, TIPOS_GRUPO, fechaNacimientoValida, textoCumple, type Opcion,
} from "@/lib/encuestas/opciones";
import type { Locale } from "@/lib/i18n/config";

export interface RespuestasPrevias {
  ciudadOrigen: string;
  fechaNacimiento: string;
  tipoGrupo: string;
  comoNosConocio: string;
  comoNosConocioOtro: string;
  primeraVez: boolean | null;
  motivo: string;
  aceptaPromos: boolean;
}

const MESES = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const T = {
  es: {
    eyebrow: "Check-in · 1 minuto",
    titulo: (n: string) => `Hola${n ? ` ${n}` : ""}, cuéntanos de ti`,
    bajada: (tour: string, cuando: string) => `Para preparar tu tour «${tour}» (${cuando}).`,
    bajadaPasado: (tour: string) => `Sobre tu tour «${tour}».`,
    yaHecho: "Ya hiciste tu check-in. Si quieres, corrige lo que necesites y vuelve a enviar.",
    ciudad: "¿De qué ciudad nos visitas?",
    ciudadPh: "Ej. Monterrey",
    cumple: "¿Cuándo es tu cumpleaños?",
    cumpleAyuda: "Opcional. Ese día te mandamos un regalo: 10 % en tu próximo tour.",
    cumpleAyudaSinRegalo: "Opcional.",
    dia: "Día", mes: "Mes", anio: "Año",
    grupo: "¿Con quién viajas?",
    como: "¿Cómo nos conociste?",
    quien: "¿Quién te recomendó? (opcional)",
    cual: "¿Cuál?",
    primera: "¿Es tu primera vez en la Huasteca Potosina?",
    si: "Sí, primera vez", no: "No, ya había venido",
    motivo: "¿Cuál es el motivo de tu viaje?",
    avisoTitulo: "Aviso de privacidad simplificado",
    aviso:
      "Tours Huasteca Potosina, con domicilio en Xilitla, S.L.P., usará estos datos para preparar tu tour y para estadísticas internas que nos ayudan a mejorar. Si marcas la segunda casilla, también para felicitarte en tu cumpleaños y mandarte promociones; puedes negarte o darte de baja cuando quieras. Para ejercer tus derechos ARCO escribe a privacidad@huasteca-potosina.com.",
    avisoLink: "Lee el aviso de privacidad completo",
    acepto: "Leí el aviso de privacidad y acepto que usen mis datos para preparar mi tour.",
    promos: "Quiero mi regalo de cumpleaños y recibir promociones por correo (opcional).",
    promosFalta: "Para mandarte el regalo de cumpleaños necesitamos que marques esta casilla.",
    enviar: "Enviar mi check-in",
    enviando: "Enviando…",
    faltan: "Te falta contestar:",
    cumpleIncompleta: "Completa tu fecha de cumpleaños (día, mes y año) o déjala vacía.",
    cumpleMala: "Revisa tu fecha de cumpleaños: esa fecha no existe.",
    faltaAviso: "Para enviar, marca la casilla del aviso de privacidad.",
    error: "No se pudo enviar. Revisa tu conexión e intenta de nuevo, o escríbenos por WhatsApp.",
    listo: (n: string) => `¡Listo${n ? `, ${n}` : ""}!`,
    nosVemos: (cuando: string) => `Gracias. Nos vemos ${cuando}.`,
    gracias: "Gracias por contarnos.",
    regalo: (f: string) => `El ${f} te llega tu regalo de cumpleaños por correo.`,
    dudas: "¿Dudas sobre la recogida o qué llevar?",
    wa: "Escríbenos por WhatsApp",
  },
  en: {
    eyebrow: "Check-in · 1 minute",
    titulo: (n: string) => `Hi${n ? ` ${n}` : ""}, tell us about you`,
    bajada: (tour: string, cuando: string) => `To get your “${tour}” tour ready (${cuando}).`,
    bajadaPasado: (tour: string) => `About your “${tour}” tour.`,
    yaHecho: "You already did your check-in. Feel free to fix anything and send it again.",
    ciudad: "Which city are you coming from?",
    ciudadPh: "E.g. Houston",
    cumple: "When is your birthday?",
    cumpleAyuda: "Optional. On that day we'll send you a gift: 10% off your next tour.",
    cumpleAyudaSinRegalo: "Optional.",
    dia: "Day", mes: "Month", anio: "Year",
    grupo: "Who are you traveling with?",
    como: "How did you find us?",
    quien: "Who recommended us? (optional)",
    cual: "Which one?",
    primera: "Is this your first time in the Huasteca Potosina?",
    si: "Yes, first time", no: "No, I've been before",
    motivo: "What's the reason for your trip?",
    avisoTitulo: "Short privacy notice",
    aviso:
      "Tours Huasteca Potosina, based in Xilitla, S.L.P., Mexico, will use this information to prepare your tour and for internal statistics that help us improve. If you tick the second box, also to wish you a happy birthday and send you offers; you can say no or unsubscribe at any time. To exercise your data rights, write to privacidad@huasteca-potosina.com.",
    avisoLink: "Read the full privacy notice (Spanish)",
    acepto: "I've read the privacy notice and agree to my data being used to prepare my tour.",
    promos: "I want my birthday gift and to receive offers by email (optional).",
    promosFalta: "To send you the birthday gift we need you to tick this box.",
    enviar: "Send my check-in",
    enviando: "Sending…",
    faltan: "Still missing:",
    cumpleIncompleta: "Complete your birthday (day, month and year) or leave it empty.",
    cumpleMala: "Check your birthday: that date doesn't exist.",
    faltaAviso: "To send, tick the privacy notice box.",
    error: "We couldn't send it. Check your connection and try again, or message us on WhatsApp.",
    listo: (n: string) => `All set${n ? `, ${n}` : ""}!`,
    nosVemos: (cuando: string) => `Thank you. See you ${cuando}.`,
    gracias: "Thanks for telling us.",
    regalo: (f: string) => `Your birthday gift will reach your inbox on ${f}.`,
    dudas: "Questions about pickup or what to bring?",
    wa: "Message us on WhatsApp",
  },
} as const;

const etiquetaCls = "block font-dm text-[15px] font-medium text-verde-profundo mb-3";
const campoCls =
  "w-full bg-white border border-verde-profundo/20 rounded-md px-4 py-3 font-dm text-base text-negro placeholder:text-negro/35 focus:outline-none focus:border-verde-selva focus:ring-2 focus:ring-verde-selva/20";

function Chips({ opciones, valor, onChange, locale, label }: {
  opciones: readonly Opcion[];
  valor: string;
  onChange: (v: string) => void;
  locale: Locale;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activo = valor === o.valor;
        return (
          <button key={o.valor} type="button" role="radio" aria-checked={activo} onClick={() => onChange(o.valor)}
            className={`min-h-[44px] px-4 py-2.5 rounded-full border font-dm text-[15px] transition-colors ${
              activo
                ? "bg-verde-profundo border-verde-profundo text-crema"
                : "bg-white border-verde-profundo/20 text-verde-profundo hover:border-verde-selva"
            }`}>
            {o[locale]}
          </button>
        );
      })}
    </div>
  );
}

/** Días del mes (con el año, si ya lo eligió; si no, febrero admite el 29). */
const diasDelMes = (mes: string, anio: string) =>
  mes ? new Date(Date.UTC(Number(anio) || 2000, Number(mes), 0)).getUTCDate() : 31;

export function CheckinForm({ token, locale, nombre, tour, cuando, yaPaso, puedeRegalo, previas }: {
  token: string;
  locale: Locale;
  /** Ya es el nombre de pila (`nombreDePila`, lo calcula la página). */
  nombre: string;
  tour: string;
  cuando: string;
  /** El tour ya pasó: no se dice «nos vemos…». */
  yaPaso: boolean;
  /**
   * Si el regalo de cumpleaños le puede llegar: tiene correo útil y no pidió la
   * baja. Si no, ni la casilla ni la promesa del regalo.
   */
  puedeRegalo: boolean;
  previas: RespuestasPrevias | null;
}) {
  const t = T[locale];
  const [y0, m0, d0] = (previas?.fechaNacimiento ?? "").split("-");
  const [ciudad, setCiudad]       = useState(previas?.ciudadOrigen ?? "");
  const [dia, setDia]             = useState(d0 ? String(Number(d0)) : "");
  const [mes, setMes]             = useState(m0 ? String(Number(m0)) : "");
  const [anio, setAnio]           = useState(y0 ?? "");
  const [grupo, setGrupo]         = useState(previas?.tipoGrupo ?? "");
  const [como, setComo]           = useState(previas?.comoNosConocio ?? "");
  const [comoOtro, setComoOtro]   = useState(previas?.comoNosConocioOtro ?? "");
  const [primera, setPrimera]     = useState<boolean | null>(previas?.primeraVez ?? null);
  const [motivo, setMotivo]       = useState(previas?.motivo ?? "");
  const [aviso, setAviso]         = useState(!!previas);
  const [promos, setPromos]       = useState(puedeRegalo && (previas?.aceptaPromos ?? false));
  const [sitio, setSitio]         = useState("");
  const [estado, setEstado]       = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError]         = useState("");

  const anioHoy = new Date().getFullYear();
  const anios = Array.from({ length: 96 }, (_, i) => String(anioHoy - 5 - i));
  const fechaCompleta = dia && mes && anio
    ? `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`
    : "";
  const fechaParcial = !fechaCompleta && (dia || mes || anio);
  const maxDia = diasDelMes(mes, anio);
  // Si cambia el mes o el año y el día ya no cabe (31 → abril), se borra el día.
  const cambiaMes  = (v: string) => { setMes(v);  if (Number(dia) > diasDelMes(v, anio)) setDia(""); };
  const cambiaAnio = (v: string) => { setAnio(v); if (Number(dia) > diasDelMes(mes, v)) setDia(""); };

  async function enviar() {
    setError("");
    const faltan: string[] = [];
    if (!ciudad.trim()) faltan.push(t.ciudad);
    if (!grupo) faltan.push(t.grupo);
    if (!como) faltan.push(t.como);
    if (primera === null) faltan.push(t.primera);
    if (!motivo) faltan.push(t.motivo);
    if (faltan.length) { setError(`${t.faltan} ${faltan.join(" · ")}`); return; }
    if (fechaParcial) { setError(t.cumpleIncompleta); return; }
    if (fechaCompleta && !fechaNacimientoValida(fechaCompleta, new Date().toISOString().slice(0, 10))) { setError(t.cumpleMala); return; }
    if (!aviso) { setError(t.faltaAviso); return; }

    setEstado("enviando");
    try {
      const r = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, ciudadOrigen: ciudad, fechaNacimiento: fechaCompleta || null, tipoGrupo: grupo,
          comoNosConocio: como, comoNosConocioOtro: comoOtro, primeraVez: primera, motivo,
          aceptaAviso: aviso, aceptaPromos: puedeRegalo && promos, sitio,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        // Los mensajes del servidor están en español: en inglés, el genérico.
        setError(locale === "es" && typeof j.error === "string" ? j.error : t.error);
        setEstado("idle");
        return;
      }
      setEstado("listo");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t.error);
      setEstado("idle");
    }
  }

  if (estado === "listo") {
    return (
      <div className="w-full max-w-lg mx-auto">
        <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado mb-5">Tours Huasteca Potosina</p>
        <h1 className="font-cormorant font-light text-verde-profundo text-[42px] leading-tight mb-4">{t.listo(nombre)}</h1>
        <p className="font-dm text-base text-negro/70 leading-relaxed mb-3">{yaPaso ? t.gracias : t.nosVemos(cuando)}</p>
        {fechaCompleta && promos && puedeRegalo && (
          <p className="font-dm text-base text-negro/70 leading-relaxed mb-3">🎁 {t.regalo(textoCumple(fechaCompleta, locale))}</p>
        )}
        <p className="font-dm text-[15px] text-negro/55 leading-relaxed mt-8">
          {t.dudas}{" "}
          <a href="https://wa.me/524891090388" className="text-verde-selva underline">{t.wa}</a>
        </p>
      </div>
    );
  }

  return (
    <form className="w-full max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate>
      <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado mb-4">{t.eyebrow}</p>
      <h1 className="font-cormorant font-light text-verde-profundo text-[38px] sm:text-[44px] leading-[1.1] mb-3">
        {t.titulo(nombre)}
      </h1>
      <p className="font-dm text-base text-negro/60 leading-relaxed mb-2">{yaPaso ? t.bajadaPasado(tour) : t.bajada(tour, cuando)}</p>
      {previas && <p className="font-dm text-[14px] text-verde-selva leading-relaxed mb-2">✓ {t.yaHecho}</p>}

      <div className="mt-10 space-y-9">
        <div>
          <label htmlFor="ck-ciudad" className={etiquetaCls}>1. {t.ciudad}</label>
          <input id="ck-ciudad" list="ck-ciudades" value={ciudad} onChange={(e) => setCiudad(e.target.value)}
            placeholder={t.ciudadPh} autoComplete="address-level2" maxLength={80} className={campoCls} />
          <datalist id="ck-ciudades">
            {CIUDADES_SUGERIDAS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <span className={etiquetaCls}>2. {t.grupo}</span>
          <Chips opciones={TIPOS_GRUPO} valor={grupo} onChange={setGrupo} locale={locale} label={t.grupo} />
        </div>

        <div>
          <span className={etiquetaCls}>3. {t.como}</span>
          <Chips opciones={COMO_NOS_CONOCIO} valor={como} onChange={setComo} locale={locale} label={t.como} />
          {(como === "recomendacion" || como === "otro") && (
            <input value={comoOtro} onChange={(e) => setComoOtro(e.target.value)} maxLength={120}
              aria-label={como === "otro" ? t.cual : t.quien}
              placeholder={como === "otro" ? t.cual : t.quien} className={`${campoCls} mt-3`} />
          )}
        </div>

        <div>
          <span className={etiquetaCls}>4. {t.primera}</span>
          <div role="radiogroup" aria-label={t.primera} className="flex flex-wrap gap-2">
            {[{ v: true, txt: t.si }, { v: false, txt: t.no }].map((o) => (
              <button key={String(o.v)} type="button" role="radio" aria-checked={primera === o.v} onClick={() => setPrimera(o.v)}
                className={`min-h-[44px] px-4 py-2.5 rounded-full border font-dm text-[15px] transition-colors ${
                  primera === o.v
                    ? "bg-verde-profundo border-verde-profundo text-crema"
                    : "bg-white border-verde-profundo/20 text-verde-profundo hover:border-verde-selva"
                }`}>
                {o.txt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={etiquetaCls}>5. {t.motivo}</span>
          <Chips opciones={MOTIVOS} valor={motivo} onChange={setMotivo} locale={locale} label={t.motivo} />
        </div>

        <div>
          <span className={etiquetaCls}>6. {t.cumple}</span>
          <p className="font-dm text-[14px] text-negro/55 -mt-1.5 mb-3">{puedeRegalo ? `🎁 ${t.cumpleAyuda}` : t.cumpleAyudaSinRegalo}</p>
          <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <select aria-label={t.dia} value={dia} onChange={(e) => setDia(e.target.value)} className={campoCls}>
              <option value="">{t.dia}</option>
              {Array.from({ length: maxDia }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
            </select>
            <select aria-label={t.mes} value={mes} onChange={(e) => cambiaMes(e.target.value)} className={campoCls}>
              <option value="">{t.mes}</option>
              {MESES[locale].map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select aria-label={t.anio} value={anio} onChange={(e) => cambiaAnio(e.target.value)} className={campoCls}>
              <option value="">{t.anio}</option>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Honeypot: invisible para personas; los bots lo llenan. */}
        <input type="text" name="sitio" value={sitio} onChange={(e) => setSitio(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

        <div className="border-t border-verde-profundo/15 pt-7">
          <p className="font-dm text-[11px] tracking-[2px] uppercase text-negro/45 mb-2">{t.avisoTitulo}</p>
          <p className="font-dm text-[13px] text-negro/60 leading-relaxed mb-2">{t.aviso}</p>
          <a href="/aviso-de-privacidad" target="_blank" rel="noopener"
            className="font-dm text-[13px] text-verde-selva underline">{t.avisoLink}</a>

          <label className="flex items-start gap-3 mt-5 cursor-pointer">
            <input type="checkbox" checked={aviso} onChange={(e) => setAviso(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1a2e1a]" />
            <span className="font-dm text-[15px] text-negro/80 leading-snug">{t.acepto}</span>
          </label>
          {puedeRegalo && (
            <label className="flex items-start gap-3 mt-4 cursor-pointer">
              <input type="checkbox" checked={promos} onChange={(e) => setPromos(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#1a2e1a]" />
              <span className="font-dm text-[15px] text-negro/80 leading-snug">{t.promos}</span>
            </label>
          )}
          {puedeRegalo && fechaCompleta && !promos && (
            <p className="font-dm text-[13px] text-dorado mt-2 ml-8">{t.promosFalta}</p>
          )}
        </div>

        {error && <p role="alert" className="font-dm text-[14px] text-terracota leading-relaxed">{error}</p>}

        <button type="submit" disabled={estado === "enviando"}
          className="w-full min-h-[52px] bg-dorado hover:bg-lima text-negro px-8 py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium rounded-md transition-colors disabled:opacity-50">
          {estado === "enviando" ? t.enviando : t.enviar}
        </button>
      </div>
    </form>
  );
}
