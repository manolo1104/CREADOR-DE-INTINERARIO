"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Flower2, Flame, Skull, Music, Moon } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * El aviso de Xantolo: aparece una sola vez, a los 20 segundos.
 *
 * Es una interrupción, así que se porta como tal:
 *
 *  · Se cierra con Esc, con el fondo, con la X y con el botón de «ahora no».
 *  · Una vez cerrado NO vuelve. Queda anotado en el navegador de quien lo cerró.
 *  · Caduca solo el 3 de noviembre. Nadie tiene que acordarse de quitarlo, y no
 *    hay riesgo de que en enero el sitio siga anunciando una fiesta que ya pasó.
 *  · No sale si el aviso de cookies sigue en pantalla: dos capas encima del
 *    contenido a la vez es lo que hace que la gente cierre la pestaña.
 *  · No sale en el propio artículo de Xantolo —invitar a leer lo que ya estás
 *    leyendo— ni en el embudo del curso ni en el panel.
 *
 * Las fechas salen de lo que el sitio ya afirma en `destinoData.ts` y en
 * `destinos.ts`: del 31 de octubre al 2 de noviembre. No se inventó ninguna.
 */

const CLAVE = "hp_xantolo_2026";
const SEGUNDOS = 20;
/** El día que deja de tener sentido. Se compara contra la fecha en México. */
const CADUCA = "2026-11-03";
const SLUG_GUIA = "/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia";
const FOTO = "/imagenes/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia/hero.jpg";

/**
 * El patrón del fondo verde. Cada icono es una de las cosas que el propio
 * texto del aviso nombra, no adorno suelto: el cempasúchil de los arcos, las
 * veladoras del altar, las máscaras de las cuadrillas de danzantes, la música
 * con la que salen, y la luna de los pueblos que no duermen en tres noches.
 *
 * Son los componentes de lucide que ya usa el sitio, no trazos redibujados.
 */
const ICONOS_XANTOLO = [Flower2, Flame, Skull, Music, Moon];

/**
 * Ocupa sólo el verde —de donde acaba la foto hacia abajo—, nunca la foto.
 *
 * El tamaño, el giro y el desplazamiento de cada icono salen del índice: en
 * rejilla perfecta esto se lee como papel milimetrado en vez de textura. Al
 * venir del índice y no de `Math.random()`, el servidor y el navegador pintan
 * lo mismo y no hay desajuste de hidratación.
 */
function PatronXantolo() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 top-40 overflow-hidden sm:top-48"
    >
      <div className="grid grid-cols-6 place-items-center gap-y-6 pt-4">
        {Array.from({ length: 30 }).map((_, i) => {
          const Icono = ICONOS_XANTOLO[i % ICONOS_XANTOLO.length];
          const giro = ((i * 41) % 29) - 14;      // −14° a +14°
          const lado = 16 + ((i * 11) % 3) * 5;   // 16 a 26 px
          const corre = ((i * 19) % 5) - 2;       // −2 a +2 px
          return (
            <Icono
              key={i}
              strokeWidth={1.25}
              /* Dorado, que es el acento del aviso y el color del cempasúchil.
                 Muy bajo a propósito: el titular y el párrafo van encima. */
              className="text-dorado"
              style={{
                width: lado,
                height: lado,
                opacity: 0.09 + ((i * 13) % 3) * 0.02,
                transform: `translateX(${corre}px) rotate(${giro}deg)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function yaCaduco(): boolean {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return hoy >= CADUCA;
}

export function PopupXantolo() {
  const pathname = usePathname() ?? "";
  const { locale } = useLocale();
  const en = locale === "en";
  const [montado, setMontado] = useState(false);
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const enfocadoAntes = useRef<HTMLElement | null>(null);

  const fuera =
    pathname.startsWith("/curso") ||
    pathname.startsWith("/admin") ||
    pathname.includes("xantolo");

  const cerrar = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE, "cerrado");
    } catch {
      /* Navegación privada o almacenamiento bloqueado: se cierra igual, sólo
         que podría volver a salir en la próxima visita. No es motivo de error. */
    }
    // Se desmonta después de la salida, que es más corta que la entrada.
    window.setTimeout(() => setMontado(false), 170);
    enfocadoAntes.current?.focus();
  }, []);

  useEffect(() => {
    if (fuera) return;

    /* Puerta trasera para revisarlo: `?xantolo=1` lo abre YA, sin los 20
       segundos y sin hacer caso de que ya se haya cerrado antes.
       Existe porque el comportamiento correcto de cara al visitante —una vez
       cerrado no vuelve— deja al dueño sin manera de volver a verlo, y
       vaciarle el almacenamiento del navegador para revisar un aviso no es
       una instrucción que se le pueda dar a nadie. */
    const forzado = new URLSearchParams(window.location.search).get("xantolo") === "1";

    if (!forzado && yaCaduco()) return;
    let visto = false;
    let cookiesPendientes = false;
    try {
      visto = localStorage.getItem(CLAVE) !== null;
      cookiesPendientes = localStorage.getItem("hp_cookie_consent") === null;
    } catch {
      /* Sin almacenamiento no se insiste: mejor no salir que salir siempre. */
      if (!forzado) return;
    }
    if (!forzado && (visto || cookiesPendientes)) return;

    const t = window.setTimeout(() => {
      enfocadoAntes.current = document.activeElement as HTMLElement | null;
      setMontado(true);
      // Un cuadro de margen para que el estado inicial llegue a pintarse: sin
      // esto el navegador ve el estado final desde el principio y no hay
      // transición, sólo aparición de golpe.
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, forzado ? 0 : SEGUNDOS * 1000);
    return () => window.clearTimeout(t);
  }, [fuera]);

  // Esc para cerrar y Tab que no se escapa del cuadro.
  useEffect(() => {
    if (!montado) return;
    const caja = panel.current;
    caja?.querySelector<HTMLElement>("[data-cerrar]")?.focus();

    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key !== "Tab" || !caja) return;
      const focos = caja.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [montado, cerrar]);

  if (!montado) return null;

  const fechas = en ? "October 31 to November 2, 2026" : "Del 31 de octubre al 2 de noviembre de 2026";

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* El fondo cierra, pero no es un botón para el lector de pantalla: la X
          y «ahora no» ya hacen ese trabajo y sí se anuncian. */}
      <div
        className="absolute inset-0 bg-negro/75 backdrop-blur-[2px]"
        onClick={cerrar}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="xantolo-titulo"
        aria-describedby="xantolo-texto"
        /* Nunca desde scale(0): nada aparece de la nada. Entra en 260 ms con la
           curva del resto del sitio y sale en 160, porque al cerrar el usuario
           ya decidió y esperar se siente lento. */
        className={`popup-xantolo relative z-10 w-full max-w-lg bg-verde-profundo border border-dorado/25 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)] ${
          visible ? "popup-xantolo--visible" : ""
        }`}
      >
        <button
          type="button"
          data-cerrar
          onClick={cerrar}
          aria-label={en ? "Close" : "Cerrar"}
          className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-negro/50 text-crema/70 hover:text-crema hover:bg-negro/80 transition-colors duration-200 active:scale-95"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="relative h-40 sm:h-48 w-full">
          <Image
            src={FOTO}
            alt={
              en
                ? "Xantolo altar in the Huasteca Potosina: an arch of marigolds, lit candles and portraits of the departed"
                : "Altar de Xantolo en la Huasteca Potosina: arco de flores de cempasúchil, veladoras encendidas y retratos de los difuntos"
            }
            fill
            className="object-cover"
            sizes="(min-width: 640px) 512px, 100vw"
          />
          {/* 🔴 Medido en el navegador, no supuesto: la línea de fechas cae
              24 px DENTRO de la foto, y en dorado sobre un altar de cempasúchil
              —naranja sobre naranja— era ilegible. Hacía falta que el tramo
              inferior de la imagen fuera OPACO, no traslúcido.
              Va en `style` y no en clases: con `from-40%` Tailwind no generó
              nada (las paradas de degradado con porcentaje necesitan que la
              clase exista en el CSS compilado) y el degradado se quedó como
              estaba. Un color del tema escrito a mano aquí es feo, pero es
              verde-profundo (#1a2e1a) y no se puede caer solo. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to top, #1a2e1a 0%, #1a2e1a 42%, rgba(26,46,26,0.55) 72%, rgba(26,46,26,0) 100%)",
            }}
          />
        </div>

        <PatronXantolo />

        {/* `relative` sin más: el contenido queda por encima del patrón porque
            va después en el DOM y ambos crean contexto propio. */}
        <div className="relative px-6 pb-6 -mt-6">
          <p className="text-[10px] tracking-[3px] uppercase text-dorado font-dm mb-2">{fechas}</p>
          <h2
            id="xantolo-titulo"
            className="font-cormorant font-light text-crema leading-tight mb-3"
            style={{ fontSize: "clamp(26px,5vw,34px)" }}
          >
            Xantolo 2026
          </h2>
          <p id="xantolo-texto" className="text-crema/65 font-dm text-sm leading-relaxed mb-6">
            {en
              ? "The Huasteca does not celebrate Day of the Dead, it celebrates Xantolo: arches of marigolds, masked dancers and towns that stay awake for three nights. We wrote the guide so you know where to go and what not to miss."
              : "La Huasteca no celebra Día de Muertos, celebra Xantolo: arcos de cempasúchil, cuadrillas de danzantes enmascarados y pueblos que no duermen en tres noches. Escribimos la guía para que sepas a dónde ir y qué no perderte."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* 🔴 Sin `localePath` a propósito: el blog sólo existe en español
                y `/en/blog/…` devuelve 404. Prefijar el idioma aquí le daba al
                visitante en inglés un enlace muerto. El día que el blog tenga
                versión en inglés, esto vuelve a llevar prefijo. */}
            <Link
              href={SLUG_GUIA}
              onClick={cerrar}
              className="flex-1 text-center bg-dorado text-negro px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-200 active:scale-[0.98]"
            >
              {en ? "Read the Xantolo guide" : "Leer la guía de Xantolo"}
            </Link>
            <button
              type="button"
              onClick={cerrar}
              className="sm:flex-shrink-0 text-center text-crema/45 hover:text-crema/80 px-6 py-3.5 text-[11px] tracking-[3px] uppercase font-dm transition-colors duration-200"
            >
              {en ? "Not now" : "Ahora no"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
