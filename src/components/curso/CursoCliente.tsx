"use client";

/**
 * Piezas interactivas del funnel /curso.
 *
 * Público: dueños de agencias y hoteles, muchos mayores de 45, casi todos
 * llegando desde WhatsApp en un celular. Eso manda sobre el diseño:
 * tipografía grande, contraste alto, botones enormes, cero pasos de más.
 *
 * Movimiento (criterio /emil-design-eng): solo CSS y contadores discretos.
 * ease-out, < 300 ms, escala al presionar, y todo respeta
 * prefers-reduced-motion. Nada de framer-motion (regla del repo).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackCtaClick } from "@/lib/analytics";

// ── Datos compartidos entre el formulario de lead y el modal de pago ───────
const LS_KEY = "curso_datos";

function leerDatos(): { nombre?: string; email?: string; whatsapp?: string } {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function guardarDatos(d: { nombre?: string; email?: string; whatsapp?: string }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...leerDatos(), ...d }));
  } catch {
    /* modo privado */
  }
}

// ── Cuenta regresiva ───────────────────────────────────────────────────────

function partes(limite: number) {
  const restante = Math.max(0, limite - Date.now());
  return {
    d: Math.floor(restante / 86_400_000),
    h: Math.floor((restante % 86_400_000) / 3_600_000),
    m: Math.floor((restante % 3_600_000) / 60_000),
    s: Math.floor((restante % 60_000) / 1_000),
    fin: restante === 0,
  };
}

export function CuentaRegresiva({
  limiteIso,
  grande = false,
}: {
  limiteIso: string;
  grande?: boolean;
}) {
  const limite = new Date(limiteIso).getTime();
  const [t, setT] = useState<ReturnType<typeof partes> | null>(null);

  useEffect(() => {
    setT(partes(limite));
    const id = setInterval(() => setT(partes(limite)), 1_000);
    return () => clearInterval(id);
  }, [limite]);

  // Antes de hidratar: hueco del mismo tamaño para que nada brinque.
  // Monoespaciada y tabular: los dígitos no bailan al cambiar cada segundo,
  // y en una página de tecnología el número se lee como dato, no como texto.
  const caja = grande
    ? "min-w-[3.2ch] text-4xl sm:text-6xl font-mono font-bold tabular-nums"
    : "min-w-[2.6ch] text-base font-mono font-bold tabular-nums";

  const unidades = t
    ? [
        { v: t.d, u: "días" },
        { v: t.h, u: "hrs" },
        { v: t.m, u: "min" },
        { v: t.s, u: "seg" },
      ]
    : [
        { v: "-", u: "días" },
        { v: "-", u: "hrs" },
        { v: "-", u: "min" },
        { v: "-", u: "seg" },
      ];

  return (
    <span
      className={`inline-flex items-baseline ${grande ? "gap-4 sm:gap-6" : "gap-2"}`}
      role="timer"
      aria-label="Tiempo restante"
    >
      {unidades.map(({ v, u }) => (
        <span key={u} className="inline-flex flex-col items-center">
          <span className={`${caja} text-center leading-none`}>
            {typeof v === "number" ? String(v).padStart(2, "0") : v}
          </span>
          <span
            className={`font-dm uppercase tracking-[1.5px] ${
              grande ? "mt-2 text-xs opacity-70" : "mt-0.5 text-[9px] opacity-60"
            }`}
          >
            {u}
          </span>
        </span>
      ))}
    </span>
  );
}

// ── Modal de pago (nombre + correo → Stripe) ───────────────────────────────

export function BotonComprar({
  precio,
  abierto,
  className,
  children,
}: {
  precio: number;
  abierto: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState({ nombre: "", email: "", whatsapp: "" });
  const dialogRef = useRef<HTMLDivElement>(null);

  const abrir = useCallback(() => {
    if (!abierto) {
      document.getElementById("cierre")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const previos = leerDatos();
    setDatos((d) => ({
      nombre: previos.nombre ?? d.nombre,
      email: previos.email ?? d.email,
      whatsapp: previos.whatsapp ?? d.whatsapp,
    }));
    setError(null);
    setOpen(true);
  }, [abierto]);

  // Esc cierra; al abrir, foco al primer campo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const input = dialogRef.current?.querySelector("input");
    input?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    guardarDatos(datos);
    trackCtaClick("curso_checkout", "stripe");
    try {
      const res = await fetch("/api/curso/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "No pudimos iniciar el pago. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("No pudimos iniciar el pago. Revisa tu conexión e intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={abrir} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-tinta/70 p-0 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Reservar mi lugar"
        >
          <div
            ref={dialogRef}
            className="w-full sm:max-w-md bg-tinta p-6 sm:p-8 shadow-2xl animate-slide-up"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-sora text-3xl text-hielo leading-tight">
                  Reservar mi lugar
                </h3>
                <p className="mt-1 font-dm text-base text-hielo/70">
                  ${precio.toLocaleString("es-MX")} MXN · o 3 pagos sin intereses
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="shrink-0 p-2 -m-2 text-hielo/50 hover:text-hielo transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={pagar} className="mt-6 space-y-4">
              <label className="block">
                <span className="font-dm text-sm font-medium text-hielo">Tu nombre</span>
                <input
                  required
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  autoComplete="name"
                  className="mt-1.5 w-full border border-linea bg-tinta-2 px-4 py-3.5 font-dm text-lg text-hielo focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                />
              </label>
              <label className="block">
                <span className="font-dm text-sm font-medium text-hielo">Tu correo</span>
                <input
                  required
                  type="email"
                  value={datos.email}
                  onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                  autoComplete="email"
                  inputMode="email"
                  className="mt-1.5 w-full border border-linea bg-tinta-2 px-4 py-3.5 font-dm text-lg text-hielo focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                />
              </label>
              <label className="block">
                <span className="font-dm text-sm font-medium text-hielo">
                  Tu WhatsApp <span className="font-normal text-hielo/50">(opcional)</span>
                </span>
                <input
                  value={datos.whatsapp}
                  onChange={(e) => setDatos({ ...datos, whatsapp: e.target.value })}
                  autoComplete="tel"
                  inputMode="tel"
                  className="mt-1.5 w-full border border-linea bg-tinta-2 px-4 py-3.5 font-dm text-lg text-hielo focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                />
              </label>

              {error && (
                <p className="border border-azul/40 bg-azul-humo px-4 py-3 font-dm text-base text-azul-vivo">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-azul px-6 py-4 font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo hover:text-tinta active:scale-[0.98] disabled:opacity-60"
              >
                {enviando ? "Abriendo el pago seguro…" : "Ir al pago seguro"}
              </button>
              <p className="text-center font-dm text-sm text-hielo/60">
                Pago protegido por Stripe. Garantía de las 2 primeras sesiones:
                si no es para ti, te devuelvo el 100%.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Barras fijas (escritorio arriba, móvil abajo) ──────────────────────────

export function BarraCurso({
  precio,
  esFundador,
  limiteIso,
  abierto,
}: {
  precio: number;
  esFundador: boolean;
  limiteIso: string;
  abierto: boolean;
}) {
  const [visible, setVisible] = useState(false);

  // La barra móvil aparece cuando el hero sale de pantalla (sin listener de
  // scroll: IntersectionObserver sobre el centinela del hero).
  useEffect(() => {
    const centinela = document.getElementById("fin-hero");
    if (!centinela) return setVisible(true);
    // Visible solo cuando el centinela ya quedó ARRIBA del viewport (se
    // scrolleó más allá del hero); al fondo de la página también aplica.
    const io = new IntersectionObserver(
      ([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0),
      { rootMargin: "0px" }
    );
    io.observe(centinela);
    return () => io.disconnect();
  }, []);

  const etiqueta = esFundador ? "El precio de fundador termina en" : "Inscripciones cierran en";
  const etiquetaCorta = esFundador ? "El precio sube en" : "Cierra en";

  return (
    <>
      {/* Escritorio: barra superior fija */}
      <div className="fixed inset-x-0 top-0 z-[80] hidden md:flex items-center justify-center gap-6 bg-tinta/95 px-6 py-2.5 text-hielo backdrop-blur-sm">
        {/* Cuánto llevas leído. Orientación en una página larga; la empuja
            el scroll, no un listener. */}
        <i aria-hidden="true" className="avance-curso" />
        <span className="font-dm text-sm tracking-wide opacity-90">{etiqueta}</span>
        <CuentaRegresiva limiteIso={limiteIso} />
        <BotonComprar
          precio={precio}
          abierto={abierto}
          className="bg-azul px-6 py-2.5 font-dm text-sm font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo hover:text-tinta active:scale-[0.97]"
        >
          Reservar mi lugar
        </BotonComprar>
      </div>

      {/* Móvil: barra inferior, aparece tras el hero */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[55] flex md:hidden items-center gap-3 bg-tinta/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] text-hielo backdrop-blur-sm transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-dm text-[11px] uppercase tracking-[1px] opacity-80">{etiquetaCorta}</p>
          <CuentaRegresiva limiteIso={limiteIso} />
        </div>
        <BotonComprar
          precio={precio}
          abierto={abierto}
          className="shrink-0 bg-azul px-5 py-3.5 font-dm text-sm font-semibold uppercase tracking-[1.5px] text-tinta active:scale-[0.97] transition-transform duration-150 ease-out"
        >
          Reservar
        </BotonComprar>
      </div>
    </>
  );
}

// ── Contador de cifras (franja de resultados) ──────────────────────────────

export function Cifra({
  hasta,
  prefijo = "",
  sufijo = "",
  className,
}: {
  hasta: number;
  prefijo?: string;
  sufijo?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pinta = (v: number) => {
      el.textContent = `${prefijo}${Math.round(v).toLocaleString("es-MX")}${sufijo}`;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pinta(hasta);
      return;
    }

    // El número lo empuja el SCROLL, no un reloj: si subes, baja. Que la
    // cifra crezca porque tú bajas hace que se sienta tuya y no leída.
    //
    // No hay listener de scroll: se lee la posición dentro de un
    // requestAnimationFrame, y ese bucle sólo corre mientras el elemento
    // está en pantalla. Fuera de vista se apaga solo.
    let vivo = false;
    let raf = 0;

    const cuadro = () => {
      const r = el.getBoundingClientRect();
      const alto = window.innerHeight || 1;
      // 0 cuando el elemento entra por abajo, 1 cuando llega a media pantalla
      const avance = Math.min(1, Math.max(0, (alto - r.top) / (alto * 0.55)));
      const suave = 1 - Math.pow(1 - avance, 3);
      pinta(hasta * suave);
      if (vivo) raf = requestAnimationFrame(cuadro);
    };

    const ojo = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !vivo) {
          vivo = true;
          raf = requestAnimationFrame(cuadro);
        } else if (!e.isIntersecting && vivo) {
          vivo = false;
          cancelAnimationFrame(raf);
          // Al salir por arriba se deja en el valor final, no a medias.
          if (e.boundingClientRect.top < 0) pinta(hasta);
        }
      },
      { threshold: 0 }
    );
    ojo.observe(el);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      ojo.disconnect();
    };
  }, [hasta, prefijo, sufijo]);

  return (
    <span ref={ref} className={className}>
      {prefijo}
      {hasta.toLocaleString("es-MX")}
      {sufijo}
    </span>
  );
}

// ── Formulario de lead / lista de espera / taller ──────────────────────────

const TIPOS = ["Agencia de viajes", "Guía", "Operador turístico", "Hotel", "Otro"];

export function FormLead({ webinar = false }: { webinar?: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const f = new FormData(e.currentTarget);
    const cuerpo = {
      nombre: String(f.get("nombre") ?? ""),
      email: String(f.get("email") ?? ""),
      whatsapp: String(f.get("whatsapp") ?? ""),
      tipo_negocio: String(f.get("tipo_negocio") ?? ""),
      ciudad: String(f.get("ciudad") ?? ""),
      consent: f.get("consent") === "on",
      sitio: String(f.get("sitio") ?? ""), // honeypot
      webinar,
    };
    guardarDatos({ nombre: cuerpo.nombre, email: cuerpo.email, whatsapp: cuerpo.whatsapp });
    try {
      const res = await fetch("/api/curso/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos registrarte. Intenta de nuevo.");
        setEnviando(false);
        return;
      }
      trackCtaClick("curso_lead", webinar ? "taller" : "programa");
      router.push(webinar ? "/curso/gracias?taller=1" : "/curso/gracias");
    } catch {
      setError("No pudimos registrarte. Revisa tu conexión e intenta de nuevo.");
      setEnviando(false);
    }
  }

  const input =
    "mt-1.5 w-full border border-linea bg-tinta-2 px-4 py-3.5 font-dm text-lg text-hielo focus:outline-none focus:border-azul focus:ring-2 focus:ring-azul/30";

  return (
    <form onSubmit={enviar} className="space-y-4 text-left">
      {/* Honeypot: invisible para personas, irresistible para bots */}
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-dm text-sm font-medium text-hielo">Tu nombre</span>
          <input required name="nombre" autoComplete="name" className={input} />
        </label>
        <label className="block">
          <span className="font-dm text-sm font-medium text-hielo">Tu correo</span>
          <input required type="email" name="email" autoComplete="email" inputMode="email" className={input} />
        </label>
        <label className="block">
          <span className="font-dm text-sm font-medium text-hielo">
            Tu WhatsApp <span className="font-normal text-hielo/50">(opcional)</span>
          </span>
          <input name="whatsapp" autoComplete="tel" inputMode="tel" className={input} />
        </label>
        <label className="block">
          <span className="font-dm text-sm font-medium text-hielo">Tu negocio</span>
          <select name="tipo_negocio" required defaultValue="" className={`${input} appearance-none`}>
            <option value="" disabled>
              Elige una opción
            </option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block sm:max-w-[calc(50%-0.5rem)]">
        <span className="font-dm text-sm font-medium text-hielo">
          Tu ciudad <span className="font-normal text-hielo/50">(opcional)</span>
        </span>
        <input name="ciudad" autoComplete="address-level2" className={input} />
      </label>

      <label className="flex items-start gap-3 pt-1">
        <input required type="checkbox" name="consent" className="mt-1 h-5 w-5 shrink-0 accent-azul" />
        <span className="font-dm text-base text-hielo/75">
          Acepto recibir información del curso.{" "}
          <a href="/aviso-de-privacidad" target="_blank" className="text-azul-vivo underline">
            Aviso de privacidad
          </a>
        </span>
      </label>

      {error && (
        <p className="border border-azul/40 bg-azul-humo px-4 py-3 font-dm text-base text-azul-vivo">{error}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full sm:w-auto bg-azul px-10 py-4 font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo active:scale-[0.98] disabled:opacity-60"
      >
        {enviando
          ? "Un momento…"
          : webinar
            ? "Apartar mi lugar"
            : "Mándame el programa completo"}
      </button>
    </form>
  );
}
