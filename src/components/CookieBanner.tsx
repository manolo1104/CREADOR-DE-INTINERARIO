"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDict } from "@/lib/i18n/messages";
import {
  TODAS, EVENTO_ABRIR_COOKIES, decisionTomada, leerPreferencias, guardarPreferencias,
  aplicarPreferencias, type PreferenciasCookies,
} from "@/lib/cookiesPrefs";

/**
 * Las dos pieles del aviso. El funnel del curso (/curso) va de negro y azul:
 * un aviso verde encima se ve como si viniera de otro sitio, así que ahí se
 * viste del embudo. Es lo único que /curso comparte con el resto.
 */
const PIEL = {
  sitio: {
    tarjeta:    "border-white/10 bg-verde-profundo/90 shadow-[0_24px_70px_rgba(4,10,5,0.55),inset_0_1px_0_rgba(244,237,216,0.08)]",
    titulo:     "font-cormorant text-[1.7rem] font-light leading-tight text-crema",
    texto:      "text-crema/70",
    sutil:      "text-crema/65",
    nombre:     "text-crema",
    enlace:     "text-lima decoration-lima/40 hover:decoration-lima",
    primario:   "bg-lima text-negro hover:bg-crema",
    secundario: "border border-crema/25 text-crema/85 hover:border-crema/55 hover:text-crema",
    anillo:     "focus-visible:ring-lima focus-visible:ring-offset-verde-profundo",
    anilloGrupo: "group-focus-visible:ring-lima group-focus-visible:ring-offset-verde-profundo",
    encendido:  "bg-lima",
    apagado:    "bg-white/15",
    insignia:   "border-lima/35 text-lima",
    divisor:    "divide-white/10",
    icono:      "text-crema/65 hover:bg-white/5 hover:text-crema",
  },
  curso: {
    tarjeta:    "border-linea-2 bg-tinta-2/90 shadow-[0_24px_70px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(242,246,252,0.06)]",
    titulo:     "font-sora text-xl font-semibold leading-tight text-hielo",
    texto:      "text-hielo-2",
    sutil:      "text-hielo-2",
    nombre:     "text-hielo",
    enlace:     "text-azul-vivo decoration-azul-vivo/40 hover:decoration-azul-vivo",
    primario:   "bg-azul text-tinta hover:bg-azul-vivo",
    secundario: "border border-linea-2 text-hielo/85 hover:border-azul hover:text-hielo",
    anillo:     "focus-visible:ring-azul focus-visible:ring-offset-tinta-2",
    anilloGrupo: "group-focus-visible:ring-azul group-focus-visible:ring-offset-tinta-2",
    encendido:  "bg-azul",
    apagado:    "bg-linea-2",
    insignia:   "border-azul/35 text-azul-vivo",
    divisor:    "divide-linea",
    icono:      "text-hielo-2 hover:bg-white/5 hover:text-hielo",
  },
};

type Piel = (typeof PIEL)["sitio"];

/**
 * El interruptor de «Publicidad» solo sale cuando hay algo que apagar: hoy no
 * se pauta y no hay Pixel de Meta ni etiqueta de Google Ads. Aparece solo en el
 * despliegue que traiga alguno de los dos ids, y ese día se actualiza también
 * el Aviso de Privacidad (ver `PreferenciasCookies.publicidad`).
 */
const HAY_PUBLICIDAD = !!(process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);

const BOTON =
  "h-11 rounded-full px-5 font-dm text-[11px] uppercase tracking-[1.5px] whitespace-nowrap " +
  "transition-[background-color,border-color,color,transform] duration-200 ease-smooth-out active:scale-[0.97] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * Aviso de cookies.
 *
 * Primero una tarjeta corta con dos salidas: Aceptar, o Administrar para
 * apagar los servicios uno por uno. Lo que se apague deja de cargarse
 * (`Analytics.tsx` lo consulta antes de cargar cada uno). Desde el pie del
 * sitio se puede volver a abrir el panel en cualquier momento.
 */
export function CookieBanner() {
  const pathname = usePathname();
  const enCurso  = pathname?.startsWith("/curso") ?? false;
  const piel     = enCurso ? PIEL.curso : PIEL.sitio;
  const { locale } = useLocale();
  const t = getDict(locale).cookies;

  const [visible, setVisible] = useState(false);
  const [vista,   setVista]   = useState<"aviso" | "panel">("aviso");
  const [prefs,   setPrefs]   = useState<PreferenciasCookies>(TODAS);

  const administrarRef = useRef<HTMLButtonElement>(null);
  const volverRef      = useRef<HTMLButtonElement>(null);
  /** El aviso aparece solo al cargar y no debe robar el foco; al cambiar de vista, sí. */
  const moverFoco = useRef(false);
  const tituloId  = useId();
  const textoId   = useId();

  useEffect(() => {
    if (!decisionTomada()) setVisible(true);
    const abrir = () => {
      setPrefs(leerPreferencias());
      setVista("panel");
      setVisible(true);
      moverFoco.current = true;
    };
    window.addEventListener(EVENTO_ABRIR_COOKIES, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_COOKIES, abrir);
  }, []);

  useEffect(() => {
    if (!visible || !moverFoco.current) return;
    (vista === "panel" ? volverRef : administrarRef).current?.focus();
  }, [vista, visible]);

  function decidir(elegidas: PreferenciasCookies) {
    const antes = leerPreferencias();
    guardarPreferencias(elegidas);
    setVisible(false);
    aplicarPreferencias(antes, elegidas);
  }

  function abrirPanel() {
    setPrefs(leerPreferencias());
    moverFoco.current = true;
    setVista("panel");
  }

  function cerrarPanel() {
    moverFoco.current = true;
    setVista("aviso");
  }

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={tituloId}
      aria-describedby={vista === "aviso" ? textoId : undefined}
      className={`fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border backdrop-blur-xl motion-safe:animate-slide-up sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[400px] ${piel.tarjeta}`}
    >
      {/* La llave hace que el contenido nuevo entre con un fundido al cambiar de vista. */}
      <div key={vista} className="p-5 sm:p-6 motion-safe:animate-visor-fondo">
        {vista === "aviso" ? (
          <>
            <h2 id={tituloId} className={piel.titulo}>{t.titulo}</h2>
            <p id={textoId} className={`mt-2 font-dm text-[13px] leading-relaxed ${piel.texto}`}>
              {t.texto}
              <Link href="/aviso-de-privacidad" className={`underline underline-offset-2 transition-colors ${piel.enlace}`}>
                {t.avisoPrivacidad}
              </Link>
              {t.textoCola}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button ref={administrarRef} type="button" onClick={abrirPanel} className={`${BOTON} ${piel.secundario} ${piel.anillo}`}>
                {t.administrar}
              </button>
              <button type="button" onClick={() => decidir(TODAS)} className={`${BOTON} ${piel.primario} ${piel.anillo}`}>
                {t.aceptar}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button
                ref={volverRef}
                type="button"
                onClick={cerrarPanel}
                aria-label={t.volver}
                className={`-ml-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${piel.icono} ${piel.anillo}`}
              >
                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <h2 id={tituloId} className={piel.titulo}>{t.panelTitulo}</h2>
            </div>

            <ul className={`mt-2 divide-y ${piel.divisor}`}>
              <Renglon piel={piel} nombre={t.necesariasNombre} texto={t.necesariasTexto}>
                <span className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-1 font-dm text-[10px] uppercase tracking-[1.2px] ${piel.insignia}`}>
                  {t.siempreActivas}
                </span>
              </Renglon>
              <Renglon piel={piel} nombre={t.analiticaNombre} texto={t.analiticaTexto}
                interruptor={{ activo: prefs.analitica, alCambiar: v => setPrefs(p => ({ ...p, analitica: v })) }} />
              <Renglon piel={piel} nombre={t.grabacionNombre} texto={t.grabacionTexto}
                interruptor={{ activo: prefs.grabacion, alCambiar: v => setPrefs(p => ({ ...p, grabacion: v })) }} />
              {HAY_PUBLICIDAD && (
                <Renglon piel={piel} nombre={t.publicidadNombre} texto={t.publicidadTexto}
                  interruptor={{ activo: prefs.publicidad, alCambiar: v => setPrefs(p => ({ ...p, publicidad: v })) }} />
              )}
            </ul>

            <button type="button" onClick={() => decidir(prefs)} className={`${BOTON} mt-4 w-full ${piel.primario} ${piel.anillo}`}>
              {t.guardar}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Un tipo de cookie: nombre y para qué sirve a la izquierda, su control a la derecha. */
function Renglon({ piel, nombre, texto, interruptor, children }: {
  piel: Piel;
  nombre: string;
  texto: string;
  interruptor?: { activo: boolean; alCambiar: (v: boolean) => void };
  children?: React.ReactNode;
}) {
  const nombreId = useId();
  const textoId  = useId();
  return (
    <li className="flex items-start gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p id={nombreId} className={`font-dm text-sm font-medium ${piel.nombre}`}>{nombre}</p>
        <p id={textoId} className={`mt-1 font-dm text-xs leading-relaxed ${piel.sutil}`}>{texto}</p>
      </div>
      {interruptor ? (
        <button
          type="button"
          role="switch"
          aria-checked={interruptor.activo}
          aria-labelledby={nombreId}
          aria-describedby={textoId}
          onClick={() => interruptor.alCambiar(!interruptor.activo)}
          className="group -my-1.5 -mr-1.5 grid h-11 w-14 shrink-0 place-items-center focus:outline-none"
        >
          <span
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ease-smooth-out group-focus-visible:ring-2 group-focus-visible:ring-offset-2 ${
              interruptor.activo ? piel.encendido : piel.apagado
            } ${piel.anilloGrupo}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-crema shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-smooth-out ${
                interruptor.activo ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      ) : children}
    </li>
  );
}
