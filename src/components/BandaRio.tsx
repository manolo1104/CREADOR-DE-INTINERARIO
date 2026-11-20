"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { rioPorTemporada, type RioEstado } from "@/lib/rioEstado";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * La franja delgada de "estado del río", pegada arriba del navbar (vive DENTRO
 * de su contenedor fijo, así se esconde junto con él al bajar). Contesta la
 * duda que en temporada baja frena la reserva —"¿el agua está turquesa o
 * marrón?"— y la remata con lo que SÍ se promete: si el río no deja operar,
 * reembolso o reagendar sin costo (política de cancelación, a donde enlaza).
 * 19 nov 2026, Manolo: fuera la «garantía de caudal» («¿No está turquesa?
 * Reagendas gratis»): el color del agua no lo controlamos, no se garantiza.
 *
 * El estado sale de /api/rio-estado (lo fija Manolo desde el panel; en "auto"
 * manda la temporada). Es un fetch de cliente para que la franja viva igual
 * en las páginas estáticas.
 *
 * 🔴 19 nov 2026 (Manolo: «que el navbar no tape parte de las fotos o los
 * videos»): la franja ya NO espera a ese fetch. Antes no se pintaba hasta que
 * respondía y el menú crecía 29–43 px de golpe, así que ningún hero podía
 * arrancar justo debajo del menú. Ahora sale desde el servidor con el estado de
 * la temporada y con un alto FIJO (`--alto-banda-rio` en globals.css: 44 px,
 * dos renglones, en el celular; 30 px, uno, desde 640 px). Lo que contesta el
 * servidor solo cambia el texto DENTRO de esa caja (si no contesta, se queda el
 * de la temporada), y el formulario de «Avísame» abre como panel flotante bajo
 * el menú en vez de agregarle renglones.
 */

/**
 * El estado con el que arranca la franja. En el servidor, el de la temporada;
 * al hidratar, el que el servidor dejó escrito en el HTML (`data-estado`): una
 * página en caché pudo pintarse antes de un cambio de temporada (29→30 oct,
 * 30 jun→1 jul) y, si el navegador recalculara, su primer render no coincidiría
 * con el HTML y React volvería a pintar la página entera.
 */
function estadoInicial(): RioEstado {
  if (typeof document !== "undefined") {
    const pintado = document.querySelector("[data-banda-rio]")?.getAttribute("data-estado");
    if (pintado === "turquesa" || pintado === "caudal") return pintado;
  }
  return rioPorTemporada();
}

export function BandaRio({
  onPanelAbierto,
}: {
  /** Avisa al menú si el panel de «Avísame» está abierto: mientras lo esté, el menú no se esconde al bajar. */
  onPanelAbierto?: (abierto: boolean) => void;
}) {
  const pathname = usePathname();
  const [dato, setDato] = useState<{ estado: RioEstado; nota: string | null }>(() => ({
    estado: estadoInicial(),
    nota: null,
  }));
  // El imán de temporada baja: con caudal alto, la banda ofrece avisar cuando
  // el agua vuelva a estar turquesa. Captura la intención de HOY y se cobra en
  // noviembre; el correo cae en la hoja de leads con fuente propia.
  // «hecho»: ya se mandó y el «Listo» ya se leyó (el botón no vuelve a salir).
  const [aviso, setAviso] = useState<"cerrado" | "abierto" | "enviando" | "listo" | "hecho">("cerrado");
  const [correo, setCorreo] = useState("");

  async function pedirAviso(e: React.FormEvent) {
    e.preventDefault();
    if (aviso === "enviando") return;
    setAviso("enviando");
    try {
      const r = await fetch("/api/guardar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo.trim(), fuente: "Aviso agua turquesa" }),
      });
      if (!r.ok) throw new Error();
      trackTourEvent("LEAD_AGUA", { fuente: "Aviso agua turquesa" });
      setAviso("listo");
    } catch {
      setAviso("abierto");
    }
  }

  useEffect(() => {
    let vivo = true;
    fetch("/api/rio-estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && (d?.estado === "turquesa" || d?.estado === "caudal")) setDato({ estado: d.estado, nota: d.nota ?? null });
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // El panel flota encima de la página: al cambiar de página no se queda tapando
  // el hero de la siguiente.
  useEffect(() => {
    setAviso((a) => (a === "abierto" ? "cerrado" : a === "listo" ? "hecho" : a));
  }, [pathname]);

  // El «Listo» se lee y se va solo, para no dejar el panel encima de la foto.
  useEffect(() => {
    if (aviso !== "listo") return;
    const t = setTimeout(() => setAviso("hecho"), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  // En el pago y en el embudo del curso no se interrumpe; /admin ni la carga.
  const oculta = /^\/(admin|curso)|^\/reservar-(tour|paquete)\/|^\/reservar\/carrito|^\/confirmacion/.test(pathname);
  const turquesa = dato.estado === "turquesa";
  const panelAbierto = !oculta && !turquesa && (aviso === "abierto" || aviso === "enviando" || aviso === "listo");

  useEffect(() => {
    onPanelAbierto?.(panelAbierto);
  }, [panelAbierto, onPanelAbierto]);

  if (oculta) return null;

  const en = pathname === "/en" || pathname.startsWith("/en/");
  const estadoTexto = en
    ? (turquesa ? "River today: turquoise water" : "River today: high flow after rain")
    : (turquesa ? "El río hoy: agua turquesa" : "El río hoy: caudal alto por lluvias");
  const garantia = en
    ? "If the river stops the tour: refund or reschedule"
    : "Si el río no deja operar: reembolso o reagendas";

  return (
    <>
      {/* Alto FIJO (`--alto-banda-rio`, incluye la raya de abajo) desde el
          primer pintado. `data-banda-rio` también le dice al CSS que la franja
          está (globals.css); `data-estado` lo lee `estadoInicial` al hidratar. */}
      <div
        data-banda-rio=""
        data-estado={dato.estado}
        className={`${turquesa ? "bg-verde-profundo" : "bg-negro"} flex items-center overflow-hidden border-b border-white/10`}
        style={{ height: "var(--alto-banda-rio)" }}
      >
        {/* flex-wrap: en un teléfono la garantía baja a su propio renglón en vez
            de desbordar la franja por la derecha. El tope de alto deja a la
            vista dos renglones en el celular y uno desde 640 px (`sm:text-xs`
            trae su propio interlineado de 1rem): una nota larga del panel se
            corta en vez de agrandar el menú.
            🔴 19 nov 2026: con el tope, lo que cae en un renglón de más NO se
            ve, así que el orden decide qué se pierde. Lo único que se puede
            perder es la nota del panel; la garantía de reembolso y el «Avísame»
            (el imán de la temporada de lluvias) siempre quedan a la vista:
             · La nota (hasta 140 caracteres) solo toma el hueco que sobra en su
               renglón (`basis-[7em] grow max-w-max`) y se corta con «…» en vez
               de empujar la garantía fuera de la vista. Con caudal alto se va
               al final (`order-last`).
             · Con caudal alto el celular no tiene un tercer renglón: el
               «Avísame» sube junto al estado y la garantía baja al segundo
               (`max-sm:order-1`). Donde la frase completa no cabe en su renglón
               (menos de 390 px, y de 640 a 719 en un solo renglón) se ve solo
               «Avísame»; el resto de la frase sigue ahí para el lector de
               pantalla.
            🔴 20 nov 2026: el renglón de más se recorta con `clip-path` y no con
            `overflow-hidden`. Recorta lo mismo a los lados, pero deja 8 px
            libres arriba: ahí cabe el área de toque del «Avísame» (ver su
            botón), que si no se cortaba justo en el borde de la letra. Abajo
            deja 1 px: el subrayado de la garantía cae justo en el borde (a
            36.6 px) y `overflow-hidden` lo redondeaba hacia afuera; sin ese px
            salía más tenue. La letra de un tercer renglón empieza ~2 px más
            abajo, así que no asoma. Lo que pase del borde de la franja lo
            sigue cortando su caja. */}
        <p className="mx-auto flex max-h-[2.75em] w-full max-w-7xl flex-wrap items-center justify-center gap-x-1.5 [clip-path:inset(-8px_0_-1px_0)] px-4 text-center font-dm text-[11px] leading-snug text-crema/85 sm:max-h-4 sm:text-xs">
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${turquesa ? "bg-agua" : "bg-terracota"}`} />
          <span className="font-medium text-crema">{estadoTexto}</span>
          {dato.nota ? (
            <span className={`min-w-0 max-w-max grow basis-[7em] truncate text-crema/70 ${turquesa ? "" : "order-last"}`}>— {dato.nota}</span>
          ) : null}
          <span aria-hidden="true" className="hidden text-crema/50 sm:inline">·</span>
          {/* Sin precarga: esta franja sale arriba en casi todas las páginas y la
              precarga es un render completo en el servidor (el idioma se lee con
              headers()). La auditoría externa (oct 2026) vio 503 en
              /politica-de-cancelacion?_rsc=…, que salía de aquí. */}
          <Link href={en ? "/en/politica-de-cancelacion" : "/politica-de-cancelacion"} prefetch={false} className="underline underline-offset-2 decoration-crema/40 hover:text-crema transition-colors max-sm:order-1">
            {garantia}
          </Link>
          {!turquesa && aviso === "cerrado" ? (
            <>
              <span aria-hidden="true" className="hidden text-crema/50 sm:inline">·</span>
              {/* Área de toque más grande sin agrandar la franja (20 nov
                  2026): el texto mide 15 px de alto. Relleno de 8 px por cada
                  lado devuelto con margen negativo, así que ocupa lo mismo y la
                  letra no se mueve: arriba llega al borde de la franja y a los
                  lados toma 8 px más. En el celular, donde abajo está la
                  garantía (segundo renglón), la garantía se pinta después y su
                  enlace sigue ganando su propio toque. */}
              <button
                type="button"
                onClick={() => setAviso("abierto")}
                className="-mx-2 -my-2 px-2 py-2 underline underline-offset-2 decoration-dorado/60 text-dorado hover:text-crema transition-colors"
              >
                {en ? "Tell me" : "Avísame"}
                <span className="max-[389.98px]:sr-only sm:max-[719.98px]:sr-only">
                  {en ? " when it turns turquoise" : " cuando esté turquesa"}
                </span>
              </button>
            </>
          ) : null}
        </p>
      </div>
      {/* El formulario y el «Listo», como panel flotante justo debajo del menú
          (`top-full` del <nav> fijo, que es su contenedor; `mt-px` salta su raya
          de abajo). Antes eran renglones nuevos dentro de la franja y el menú
          crecía encima de la foto. */}
      {panelAbierto ? (
        <div className="absolute inset-x-0 top-full mt-px border-b border-white/10 bg-negro shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5">
            {aviso === "listo" ? (
              <p role="status" className="text-center font-dm text-[11px] text-lima">
                {en ? "Done. We'll email you when the river turns turquoise." : "Listo: te escribimos cuando el río se ponga turquesa."}
              </p>
            ) : (
              /* En el celular (20 nov 2026), campo y botón de 44 px para el
                 dedo (medían 34 y 26) y letra de 16 px escrita aquí: con
                 menos, el iPhone acerca la pantalla al tocar el campo y mueve
                 el menú fijo (en pantallas táctiles ya lo evitaba la regla de
                 globals.css que sube los campos a 16 px). Desde 640 px, el
                 tamaño de antes. */
              <form onSubmit={pedirAviso} className="flex min-w-0 items-center justify-center gap-2">
                <label htmlFor="correo-rio" className="sr-only">
                  {en ? "Your email" : "Tu correo"}
                </label>
                <input
                  id="correo-rio"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={en ? "you@email.com" : "tu@correo.com"}
                  className="rounded-full w-52 min-w-0 min-h-[44px] border border-crema/30 bg-transparent px-4 py-1 font-dm text-base text-crema placeholder:text-crema/40 focus:border-dorado focus:outline-none sm:min-h-0 sm:px-3 sm:text-[11px] sm:leading-normal"
                />
                <button
                  type="submit"
                  disabled={aviso === "enviando"}
                  className="shrink-0 min-h-[44px] rounded-full border border-dorado/60 px-4 py-1 font-dm text-base tracking-wide text-dorado transition-colors hover:bg-dorado/10 disabled:opacity-60 sm:min-h-0 sm:px-3 sm:text-[11px] sm:leading-normal"
                >
                  {aviso === "enviando" ? (en ? "Sending…" : "Enviando…") : (en ? "Notify me" : "Avisarme")}
                </button>
              </form>
            )}
            {/* Flota encima de la página: tiene que poder cerrarse. Área de
                44×44 (20 nov 2026); desde 640 px el margen negativo la mete en
                el relleno del panel para que el panel no crezca. */}
            <button
              type="button"
              onClick={() => setAviso(aviso === "listo" ? "hecho" : "cerrado")}
              disabled={aviso === "enviando"}
              aria-label={en ? "Close" : "Cerrar"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-crema/60 transition-colors hover:text-crema disabled:opacity-40 sm:-my-2.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
