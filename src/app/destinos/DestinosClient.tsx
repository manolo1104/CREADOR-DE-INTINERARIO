"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Car, Ticket, Waves, Map as MapIcon, List, SlidersHorizontal, ChevronDown, Star, X } from "lucide-react";
import type { Categoria, Nivel, Nado, ConNinos } from "@/lib/destinosAtributos";

/**
 * El explorador de /destinos (20 nov 2026, auditoría de Destinos): filtros por
 * TIPO de lugar y PRÁCTICOS (nadar, niños, nivel, gratis, con tour), por
 * municipio, orden por imprescindibles / cercanía a Ciudad Valles / «mejores
 * este mes», y vista de lista o mapa.
 *
 * Recibe una lista LIGERA armada en el servidor (`ItemDestino`), no
 * `DESTINOS_DB` entero: antes el índice mandaba al navegador las 41 fichas
 * completas (364 KB de HTML y 374 KB de scripts en la auditoría).
 *
 * Los filtros viven en la URL (?tipo=, ?municipio=) con `replaceState`: se
 * pueden compartir y las migas de pan de cada ficha enlazan a su municipio.
 * La canónica sigue siendo /destinos (ver page.tsx), así que Google no indexa
 * cada combinación.
 */
export interface ItemDestino {
  slug: string;
  href: string;
  nombre: string;
  zona: string;
  tipo: string;
  imagen?: string;
  costo: string;
  gratis: boolean;
  minValles: number | null;
  tiempoValles: string | null;
  nivel: Nivel;
  nivelTexto: string;
  nado: Nado;
  ninos: ConNinos;
  categorias: Categoria[];
  imprescindible?: number;
  meses: number[];
  lat: number;
  lng: number;
  tour?: { nombre: string; href: string };
}

const MapaDestinos = dynamic(() => import("./MapaDestinos"), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-2xl border border-white/10 bg-verde-profundo/30 animate-pulse" />,
});

type Orden = "imprescindibles" | "cerca" | "mes" | "az";

/** La caja de cada menú: misma altura, borde y radio para los cuatro. */
const CAJA = "min-h-[44px] rounded-xl border border-white/15 bg-negro/60 pl-3 font-dm text-sm text-crema hover:border-white/30 focus-visible:border-lima focus-visible:outline-none";

/** Menú nativo (el teléfono abre su propia rueda) con flecha propia. */
function Menu({ etiqueta, value, onChange, opciones }: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { v: string; t: string }[];
}) {
  return (
    <label className="flex flex-col">
      <span className="mb-1.5 font-dm text-xs text-crema/55">{etiqueta}</span>
      <span className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${CAJA} w-full appearance-none pr-9 ${value !== "todos" && value !== "imprescindibles" ? "border-lima/50" : ""}`}>
          {opciones.map((o) => <option key={o.v} value={o.v} className="bg-negro">{o.t}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-crema/50" aria-hidden="true" />
      </span>
    </label>
  );
}

const NIVEL_COLOR: Record<Nivel, string> = {
  1: "bg-emerald-600",
  2: "bg-amber-600",
  3: "bg-orange-700",
  4: "bg-red-700",
};

export default function DestinosClient({
  items, categorias, en,
}: {
  items: ItemDestino[];
  categorias: { key: Categoria; label: string }[];
  en: boolean;
}) {
  const [tipo, setTipo] = useState<Categoria | "todos">("todos");
  const [municipio, setMunicipio] = useState("todos");
  const [nadar, setNadar] = useState(false);
  const [ninos, setNinos] = useState(false);
  const [facil, setFacil] = useState(false);
  const [gratis, setGratis] = useState(false);
  const [conTour, setConTour] = useState(false);
  const [orden, setOrden] = useState<Orden>("imprescindibles");
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [masAbierto, setMasAbierto] = useState(false);
  const masRef = useRef<HTMLDivElement>(null);
  // El desplegable se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!masAbierto) return;
    const fuera = (e: MouseEvent) => { if (masRef.current && !masRef.current.contains(e.target as Node)) setMasAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMasAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [masAbierto]);
  // El mes de la Huasteca, no el del servidor (Railway corre en UTC).
  const [mes, setMes] = useState<number | null>(null);

  // Lee ?tipo= y ?municipio= al montar (las migas de pan de cada ficha enlazan
  // a /destinos?municipio=…#lista).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("tipo");
    if (t && categorias.some((c) => c.key === t)) setTipo(t as Categoria);
    const m = q.get("municipio");
    if (m && items.some((i) => i.zona === m)) setMunicipio(m);
    setMes(Number(new Date().toLocaleString("en-US", { month: "numeric", timeZone: "America/Mexico_City" })) - 1);
  }, [categorias, items]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (tipo === "todos") q.delete("tipo"); else q.set("tipo", tipo);
    if (municipio === "todos") q.delete("municipio"); else q.set("municipio", municipio);
    const s = q.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`);
  }, [tipo, municipio]);

  const municipios = useMemo(
    () => Array.from(new Set(items.map((i) => i.zona))).sort((a, b) => a.localeCompare(b, "es")),
    [items],
  );

  const visibles = useMemo(() => {
    const f = items.filter((i) =>
      (tipo === "todos" || i.categorias.includes(tipo)) &&
      (municipio === "todos" || i.zona === municipio) &&
      (!nadar || i.nado !== "no") &&
      (!ninos || i.ninos === "si") &&
      (!facil || i.nivel <= 2) &&
      (!gratis || i.gratis) &&
      (!conTour || !!i.tour),
    );
    const porNombre = (a: ItemDestino, b: ItemDestino) => a.nombre.localeCompare(b.nombre, "es");
    const sinNull = (n: number | null) => (n == null ? 9999 : n);
    return [...f].sort((a, b) => {
      if (orden === "cerca") return sinNull(a.minValles) - sinNull(b.minValles) || porNombre(a, b);
      if (orden === "mes" && mes != null) {
        const da = a.meses.includes(mes) ? 0 : 1;
        const db = b.meses.includes(mes) ? 0 : 1;
        return da - db || (a.imprescindible ?? 99) - (b.imprescindible ?? 99) || porNombre(a, b);
      }
      if (orden === "az") return porNombre(a, b);
      return (a.imprescindible ?? 99) - (b.imprescindible ?? 99) || (a.tour ? 0 : 1) - (b.tour ? 0 : 1) || porNombre(a, b);
    });
  }, [items, tipo, municipio, nadar, ninos, facil, gratis, conTour, orden, mes]);

  const practicos = [
    { v: nadar, set: setNadar, t: en ? "Swimming allowed" : "Se puede nadar" },
    { v: ninos, set: setNinos, t: en ? "Good with kids" : "Apto para niños" },
    { v: facil, set: setFacil, t: en ? "Easy or moderate" : "Fácil o moderado" },
    { v: gratis, set: setGratis, t: en ? "Free entry" : "Entrada gratis" },
    { v: conTour, set: setConTour, t: en ? "On one of our tours" : "En uno de nuestros tours" },
  ];
  const nPracticos = practicos.filter((p) => p.v).length;
  const activos = [
    ...(tipo !== "todos" ? [{ t: categorias.find((c) => c.key === tipo)?.label ?? tipo, quitar: () => setTipo("todos") }] : []),
    ...(municipio !== "todos" ? [{ t: municipio, quitar: () => setMunicipio("todos") }] : []),
    ...practicos.filter((p) => p.v).map((p) => ({ t: p.t, quitar: () => p.set(false) })),
  ];
  const hayFiltros = tipo !== "todos" || municipio !== "todos" || nadar || ninos || facil || gratis || conTour;
  const limpiar = () => {
    setTipo("todos"); setMunicipio("todos"); setNadar(false); setNinos(false); setFacil(false); setGratis(false); setConTour(false);
  };

  return (
    <section id="lista" className="scroll-mt-24">
      {/* 20 nov 2026, Manolo: «haz los filtros muy sencillos y que sean
          desplegables». Una sola fila de menús: tipo, municipio, «más filtros»
          (las casillas prácticas, escondidas hasta que se abren) y orden.
          Pase de diseño: menús nativos con su propia flecha, el desplegable
          crece desde su botón y lo elegido queda a la vista como etiquetas
          que se quitan con un toque. */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-end gap-3">
          <Menu etiqueta={en ? "Type of place" : "Tipo de lugar"} value={tipo} onChange={(v) => setTipo(v as Categoria | "todos")}
            opciones={[{ v: "todos", t: en ? "All" : "Todos" }, ...categorias.map((c) => ({ v: c.key, t: c.label }))]} />
          <Menu etiqueta={en ? "Municipality" : "Municipio"} value={municipio} onChange={setMunicipio}
            opciones={[{ v: "todos", t: en ? "All" : "Todos" }, ...municipios.map((m) => ({ v: m, t: m }))]} />

          <div className="relative" ref={masRef}>
            <span className="mb-1.5 block font-dm text-xs text-crema/55" aria-hidden="true">{en ? "Filters" : "Filtros"}</span>
            <button type="button" onClick={() => setMasAbierto(!masAbierto)} aria-expanded={masAbierto} aria-haspopup="true"
              className={`tactil ${CAJA} inline-flex items-center gap-2 pr-3 ${masAbierto ? "border-lima/60" : ""}`}>
              <SlidersHorizontal className="h-3.5 w-3.5 text-crema/60" aria-hidden="true" />
              {en ? "More filters" : "Más filtros"}
              {nPracticos > 0 && <span className="rounded-full bg-lima px-1.5 font-dm text-[11px] font-bold leading-[18px] text-negro">{nPracticos}</span>}
              <ChevronDown className={`indicador-segmentado h-3.5 w-3.5 text-crema/60 ${masAbierto ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {masAbierto && (
              <div className="desplegable absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-white/15 bg-[#121c14] p-2 shadow-[0_18px_50px_rgb(0_0_0/0.5)]">
                {practicos.map((o) => (
                  <label key={o.t} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 font-dm text-sm text-crema/85 hover:bg-white/5">
                    <input type="checkbox" checked={o.v} onChange={(e) => o.set(e.target.checked)} className="h-4 w-4 accent-lima" />
                    {o.t}
                  </label>
                ))}
              </div>
            )}
          </div>

          <Menu etiqueta={en ? "Sort" : "Ordenar"} value={orden} onChange={(v) => setOrden(v as Orden)}
            opciones={[
              { v: "imprescindibles", t: en ? "Must-sees first" : "Imprescindibles primero" },
              { v: "cerca", t: en ? "Closest to Ciudad Valles" : "Más cerca de Ciudad Valles" },
              { v: "mes", t: en ? "Best this month" : "Mejores este mes" },
              { v: "az", t: "A-Z" },
            ]} />

          <div className="ml-auto flex items-center gap-3">
            <p className="font-dm text-xs text-crema/50" aria-live="polite">
              {visibles.length} {en ? (visibles.length === 1 ? "destination" : "destinations") : (visibles.length === 1 ? "destino" : "destinos")}
            </p>
            <div className="flex rounded-xl border border-white/15 p-1" role="group" aria-label={en ? "View" : "Vista"}>
              {(["lista", "mapa"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v}
                  className={`tactil min-h-[36px] rounded-lg px-3 inline-flex items-center gap-1.5 font-dm text-xs ${vista === v ? "bg-verde-selva text-crema" : "text-crema/60 hover:text-crema"}`}>
                  {v === "lista" ? <List className="h-3.5 w-3.5" aria-hidden="true" /> : <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {v === "lista" ? (en ? "List" : "Lista") : (en ? "Map" : "Mapa")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lo elegido, como etiquetas que se quitan con un toque. */}
        {hayFiltros && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activos.map((f) => (
              <button key={f.t} type="button" onClick={f.quitar}
                className="tactil inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-lima/40 bg-lima/10 pl-3 pr-2 font-dm text-xs text-lima hover:bg-lima/20">
                {f.t}<X className="h-3 w-3" aria-label={en ? "remove" : "quitar"} />
              </button>
            ))}
            <button type="button" onClick={limpiar} className="ml-1 min-h-[32px] font-dm text-xs text-crema/50 underline underline-offset-2 hover:text-crema">
              {en ? "Clear all" : "Quitar todo"}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        {vista === "mapa" ? (
          <MapaDestinos items={visibles} en={en} />
        ) : visibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 py-14 text-center">
            <p className="font-cormorant text-crema text-2xl">{en ? "Nothing matches all of that" : "Nada cumple todo eso a la vez"}</p>
            <p className="mt-2 font-dm text-sm text-crema/55">{en ? "Remove a filter to see more places." : "Quita algún filtro para ver más lugares."}</p>
            <button type="button" onClick={limpiar} className="tactil mt-5 min-h-[44px] rounded-xl border border-lima/50 px-5 font-dm text-sm text-lima hover:bg-lima/10">
              {en ? "Clear filters" : "Quitar filtros"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((d) => (
              <article key={d.slug} className="group flex flex-col">
                <Link href={d.href} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-verde-profundo/40">
                    {d.imagen && (
                      <Image src={d.imagen} alt={d.nombre} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="zoom-foto object-cover" />
                    )}
                  </div>
                  <h3 className="mt-3.5 flex items-start gap-1.5 font-cormorant text-[22px] leading-tight text-crema group-hover:text-lima">
                    {d.imprescindible && <Star className="mt-1.5 h-3.5 w-3.5 flex-shrink-0 fill-dorado text-dorado" aria-label={en ? "Must-see" : "Imprescindible"} />}
                    {d.nombre}
                  </h3>
                  <p className="mt-0.5 font-dm text-xs text-crema/50">{d.zona} · {d.tipo}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 font-dm text-xs text-crema/80">
                    <div className="col-span-2 flex items-center gap-2">
                      <dt className="sr-only">{en ? "On your own" : "Por tu cuenta"}</dt>
                      <Ticket className="h-3.5 w-3.5 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                      <dd className="text-dorado">{d.costo}</dd>
                    </div>
                    {d.tiempoValles && (
                      <div className="flex items-center gap-2">
                        <dt className="sr-only">{en ? "From Ciudad Valles" : "Desde Ciudad Valles"}</dt>
                        <Car className="h-3.5 w-3.5 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                        <dd>{d.tiempoValles} {en ? "from Valles" : "de Valles"}</dd>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">{en ? "Effort level" : "Nivel físico"}</dt>
                      <span aria-hidden="true" className="flex w-3.5 flex-shrink-0 gap-px">
                        {[1, 2, 3, 4].map((k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k <= d.nivel ? NIVEL_COLOR[d.nivel] : "bg-white/15"}`} />)}
                      </span>
                      <dd>{d.nivelTexto}</dd>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <dt className="sr-only">{en ? "Swimming" : "Nado"}</dt>
                      <Waves className="h-3.5 w-3.5 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                      <dd>{d.nado === "si" ? (en ? "Swimming allowed" : "Se puede nadar") : d.nado === "zonas" ? (en ? "Swim in marked areas" : "Se nada en zonas permitidas") : (en ? "No swimming" : "No se nada")}</dd>
                    </div>
                  </dl>
                </Link>
                {/* El enlace principal es la ficha; el tour, secundario (auditoría). */}
                {d.tour && (
                  <Link href={d.tour.href} className="mt-3 w-fit font-dm text-[11px] text-crema/50 hover:text-lima">
                    {en ? "Included in " : "Incluido en "}<span className="text-crema/75 underline underline-offset-2">{d.tour.nombre}</span>
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
