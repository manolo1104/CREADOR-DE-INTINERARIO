import type { Metadata } from "next";
import { headers } from "next/headers";
import { asLocale, buildAlternates, localeUrl } from "@/lib/i18n/config";
import { comparadorUI } from "@/lib/i18n/comparador";
import { resolverComparacion } from "@/lib/comparadorDatos";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";
import { PageViewTracker } from "@/components/PageViewTracker";
import { ListaToursTracker } from "@/components/ListaToursTracker";
import { ComparadorShell } from "@/components/comparador/ComparadorShell";
import { NavComparador } from "@/components/comparador/NavComparador";
import { SelectorGrupo } from "@/components/comparador/SelectorGrupo";
import { TablaComparador } from "@/components/comparador/TablaComparador";
import { CierreComparador } from "@/components/comparador/CierreComparador";

/*
 * /comparar (y /en/comparar, que reexporta este módulo): recorridos o paquetes
 * lado a lado. Pedido de Manolo, 2 oct 2026: "que puedan comparar duración,
 * qué incluye, costo, destinos… y decidan cuál es mejor para ellos".
 *
 * La selección vive en la URL (`?r=tamul,meco` o `?p=…`, más el grupo) para que
 * la liga se pueda mandar por WhatsApp y abra igual. El canonical es siempre
 * /comparar: cada combinación es la misma página con otras columnas.
 */

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const ui = comparadorUI(locale);
  return {
    title: ui.meta.title,
    description: ui.meta.description,
    alternates: buildAlternates("/comparar", locale),
    // Sin `images`: la tarjeta sale del `opengraph-image.tsx` de este segmento.
    // Un `openGraph.images` aquí la anularía.
    openGraph: {
      title: ui.meta.title,
      description: ui.meta.description,
      url: localeUrl("/comparar", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: ui.meta.title, description: ui.meta.description },
  };
}

export default function CompararPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const locale = asLocale(headers().get("x-locale"));
  const ui = comparadorUI(locale);
  const c = resolverComparacion(searchParams, locale);
  const titulo = ui.hero[c.tipo];
  const breadcrumb = buildBreadcrumbJsonLd([{ name: ui.meta.breadcrumb, path: "/comparar" }], locale);

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {/* Una vista por pestaña: cambiar columnas NO cuenta como visita nueva. */}
      <PageViewTracker
        key={c.tipo}
        event="COMPARAR_VISTA"
        data={{ tipo: c.tipo, items: c.columnas.map((col) => col.slug).join(","), origen: c.origen ?? "directo" }}
      />
      {/* Las columnas como lista de GA4 (`view_item_list`), con la misma regla:
          una por pestaña. En paquetes no hay tarifas y va sin precio. */}
      <ListaToursTracker
        key={`lista-${c.tipo}`}
        listaId={`comparador_${c.tipo}`}
        listaNombre={c.tipo === "paquetes" ? "Comparador de paquetes" : "Comparador de recorridos"}
        tours={c.columnas.map((col, i) => ({ id: col.id, nombre: col.nombre, precio: c.tarifas[i]?.precio }))}
      />

      <ComparadorShell
        key={c.tipo}
        tipo={c.tipo}
        locale={locale}
        grupoInicial={c.grupo}
        limites={c.limites}
        slugs={c.columnas.map((col) => col.slug)}
        nombres={c.columnas.map((col) => col.nombre)}
        ids={c.columnas.map((col) => col.id)}
        tarifas={c.tarifas}
        origen={c.origen}
      >
        <div className="px-6 pt-32 md:pt-36 pb-24 max-w-6xl mx-auto">
          <header className="max-w-3xl">
            <h1 className="font-cormorant font-light text-crema leading-[1.1]" style={{ fontSize: "clamp(34px,5vw,56px)" }}>
              {titulo.antes}
              <em className="shimmer-gold italic pb-1">{titulo.em}</em>
            </h1>
            <p className="font-dm text-sm md:text-base text-crema/70 leading-relaxed mt-4 max-w-2xl">{ui.hero.sub}</p>
          </header>

          <div className="mt-8">
            <NavComparador atajos={c.atajos} />
          </div>

          <div className="mt-6">
            <SelectorGrupo />
          </div>

          <TablaComparador c={c} />

          <CierreComparador />
        </div>
      </ComparadorShell>
    </main>
  );
}
