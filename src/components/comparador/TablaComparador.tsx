import Image from "next/image";
import Link from "next/link";
import { Check, MapPin, Minus } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { ControlColumna, AgregarColumna } from "./ControlesColumna";
import { CeldaTotalTour, CtaReservarTour } from "./CeldasTour";
import { CeldaTotalPaquete } from "./CeldaTotalPaquete";
import { comparadorUI, type ComparadorUI } from "@/lib/i18n/comparador";
import type { Celda, Comparacion, Fila } from "@/lib/comparadorDatos";

/*
 * La tabla del comparador. Server Component: los renglones llegan ya armados
 * de `comparadorDatos.ts`; solo los totales, los botones de reservar y los
 * selectores son islas de cliente.
 *
 * Sin <table>: en el celular cada renglón pone su etiqueta a lo ancho y DEBAJO
 * las dos columnas, y en escritorio la etiqueta pasa a la izquierda. Una
 * <table> no hace las dos cosas sin pelearse con Safari. Para el lector de
 * pantalla cada celda lleva el nombre de su columna escondido ("Tamul: 12 h").
 *
 * Sin `overflow` en ningún contenedor de la tabla: rompería el encabezado fijo.
 */

// Literales enteros a propósito: Tailwind lee el código fuente y una clase
// armada con plantilla no llegaría a la hoja de estilos.
const COLUMNAS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};
/** Dos columnas en el celular; la tercera desde tablet y la cuarta en pantalla grande. */
const VISIBLE = ["", "", "hidden md:block", "hidden lg:block"];
/** La etiqueta a la izquierda desde tablet. */
const RENGLON = "md:grid md:grid-cols-[minmax(140px,190px)_1fr] md:gap-6";

function Contenido({ celda, fila, indice, c, ui }: { celda: Celda; fila: Fila; indice: number; c: Comparacion; ui: ComparadorUI }) {
  switch (celda.tipo) {
    case "texto":
      return (
        <>
          <p className={fila.id === "precio" ? "font-cormorant text-xl text-crema leading-snug" : "font-dm text-sm text-crema/85 leading-relaxed"}>
            {celda.tachado && <s className="font-dm text-xs text-crema/40 mr-1.5 tabular-nums">{celda.tachado}</s>}
            {celda.texto}
          </p>
          {celda.nota && <p className="font-dm text-xs text-crema/50 leading-snug mt-1">{celda.nota}</p>}
        </>
      );
    case "lista": {
      if (!celda.items.length) return <p className="font-dm text-sm text-crema/45">{celda.vacio}</p>;
      const Icono = fila.id === "no-incluye" ? Minus : fila.id === "visitas" ? MapPin : Check;
      const tono = fila.id === "no-incluye" ? "text-crema/35" : fila.id === "visitas" ? "text-dorado" : "text-verde-vivo";
      return (
        <ul className="space-y-1.5">
          {celda.items.map((item) => (
            <li key={item} className="flex gap-2 font-dm text-sm text-crema/80 leading-snug">
              <Icono className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tono}`} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "dias":
      return (
        <ol className="space-y-2.5">
          {celda.items.map((d) => (
            <li key={d.texto} className="font-dm text-sm leading-snug">
              {d.href ? (
                <Link href={d.href} className="text-crema/85 hover:text-dorado underline decoration-white/20 underline-offset-2 transition-colors">
                  {d.texto}
                </Link>
              ) : (
                <span className="text-crema/85">{d.texto}</span>
              )}
              {d.etiqueta && <span className="block font-dm text-[11px] text-crema/45 mt-0.5">{d.etiqueta}</span>}
            </li>
          ))}
        </ol>
      );
    case "total":
      return c.tipo === "paquetes" ? <CeldaTotalPaquete slug={c.columnas[indice].slug} /> : <CeldaTotalTour indice={indice} />;
    case "cta":
      return c.tipo === "paquetes" ? (
        <TrackedLink
          href={c.columnas[indice].href}
          event="COMPARAR_FICHA"
          data={{ paquete: c.columnas[indice].slug }}
          className="inline-flex items-center justify-center w-full min-h-[44px] bg-dorado hover:bg-lima text-negro px-4 font-dm text-[11px] tracking-[2px] uppercase font-medium transition-colors"
        >
          {ui.cta.verPaquete}
        </TrackedLink>
      ) : (
        <CtaReservarTour indice={indice} href={c.columnas[indice].href} />
      );
  }
}

function Renglon({ fila, c, ui }: { fila: Fila; c: Comparacion; ui: ComparadorUI }) {
  const n = c.columnas.length;
  const idEtiqueta = `fila-${fila.id}`;
  return (
    <div role="group" aria-labelledby={fila.etiqueta ? idEtiqueta : undefined} className={`${RENGLON} py-4`}>
      {fila.etiqueta ? (
        <p id={idEtiqueta} className="font-dm text-[11px] tracking-[1.5px] uppercase text-crema/50 mb-2.5 md:mb-0 md:pt-1">
          {fila.etiqueta}
        </p>
      ) : (
        <div className="hidden md:block" aria-hidden="true" />
      )}
      {fila.fusion ? (
        <div>
          {/* "Incluido en todos" ya lo dice en su etiqueta: sin la marca repetida. */}
          {fila.id !== "comun" && (
            <span className="inline-block font-dm text-[10px] tracking-[1.5px] uppercase text-verde-vivo border border-verde-vivo/35 px-2 py-0.5 mb-2">
              {ui.valores.enTodos}
            </span>
          )}
          <Contenido celda={fila.fusion} fila={fila} indice={0} c={c} ui={ui} />
        </div>
      ) : (
        <div className={`grid gap-x-4 gap-y-3 md:gap-x-6 ${COLUMNAS[n]}`}>
          {fila.celdas.map((celda, i) => (
            <div key={c.columnas[i].slug} className={VISIBLE[i]}>
              <span className="sr-only">{c.columnas[i].nombre}: </span>
              <Contenido celda={celda} fila={fila} indice={i} c={c} ui={ui} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TablaComparador({ c }: { c: Comparacion }) {
  const ui = comparadorUI(c.locale);
  const n = c.columnas.length;
  const ocultasCelular = c.columnas.slice(2).map((col) => col.nombre);
  const ocultasTablet = c.columnas.slice(3).map((col) => col.nombre);

  return (
    <div className="mt-8">
      {/* Fotos y controles de cada columna */}
      <div className={RENGLON}>
        <div className="hidden md:block" aria-hidden="true" />
        <div>
          <div className={`grid gap-x-4 gap-y-3 md:gap-x-6 ${COLUMNAS[n]}`}>
            {c.columnas.map((col, i) => (
              <div key={col.slug} className={VISIBLE[i]}>
                <Link href={col.href} className="group block relative aspect-[4/3] overflow-hidden bg-white/5" tabIndex={-1} aria-hidden="true">
                  <Image
                    src={col.imagen}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 30vw, 300px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
                <ControlColumna indice={i} opciones={c.opciones} />
              </div>
            ))}
          </div>
          <AgregarColumna opciones={c.opciones} />
          {ocultasCelular.length > 0 && (
            <p className="md:hidden font-dm text-xs text-crema/50 leading-snug mt-3">{ui.columnas.ocultasEnCelular(ocultasCelular)}</p>
          )}
          {ocultasTablet.length > 0 && (
            <p className="hidden md:block lg:hidden font-dm text-xs text-crema/50 leading-snug mt-3">{ui.columnas.ocultasEnCelular(ocultasTablet)}</p>
          )}
        </div>
      </div>

      {/* Encabezado fijo: al bajar, siempre se sabe qué columna es cuál. Debajo
          del menú (`--navbar-offset`), que se esconde y vuelve al hacer scroll. */}
      <div
        className="sticky z-30 -mx-6 px-6 mt-6 bg-negro/95 backdrop-blur-md border-y border-white/10 sticky-subnav"
        style={{ top: "var(--navbar-offset, 64px)" }}
      >
        <div className={`${RENGLON} py-3`}>
          <p className="hidden md:flex items-center font-dm text-[11px] tracking-[1.5px] uppercase text-crema/40">{ui.columnas.comparando}</p>
          <div className={`grid gap-x-4 md:gap-x-6 ${COLUMNAS[n]}`}>
            {c.columnas.map((col, i) => (
              <div key={col.slug} className={VISIBLE[i]}>
                <Link href={col.href} className="block font-cormorant text-lg md:text-xl text-crema leading-tight line-clamp-2 hover:text-dorado transition-colors">
                  {col.nombre}
                </Link>
                <p className="font-dm text-[11px] text-crema/55 tabular-nums mt-0.5">
                  {col.precioCorto}
                  {col.nuevo && <span className="text-verde-vivo"> · {ui.valores.nuevo}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {c.secciones.map((s) => (
        <section key={s.id} aria-labelledby={`seccion-${s.id}`} className="pt-10">
          <h2 id={`seccion-${s.id}`} className="font-cormorant font-light text-crema text-2xl md:text-3xl border-t border-white/10 pt-6 mb-1">
            {s.titulo}
          </h2>
          {s.filas.map((f) => (
            <Renglon key={f.id} fila={f} c={c} ui={ui} />
          ))}
        </section>
      ))}
    </div>
  );
}
