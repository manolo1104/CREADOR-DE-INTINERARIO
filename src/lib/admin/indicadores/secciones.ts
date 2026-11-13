// A qué sección del sitio pertenece una página de GA4 (4 nov 2026). Puro.
//
// El documento mide «contactos por cada 1,000 vistas, por sección» (Tours 35 ·
// Inicio 12 · Blog 2.7 del 7 oct al 3 nov). Calibrado el 4 nov contra GA4: esas
// tres cifras salen EXACTAS (35.0 · 11.9 · 2.7) solo si el inglés (/en/…) va
// como sección aparte y «Tours» son las páginas /tours… (sin /experiencias,
// /comparar ni /precios). No cambiar esta regla sin volver a medir la base.

export type Seccion = "inicio" | "tours" | "blog" | "destinos" | "paquetes" | "reservar" | "viaje" | "guias" | "ingles" | "otras";

export const SECCIONES: { clave: Seccion; etiqueta: string }[] = [
  { clave: "inicio", etiqueta: "Inicio" },
  { clave: "tours", etiqueta: "Tours" },
  { clave: "blog", etiqueta: "Blog" },
  { clave: "destinos", etiqueta: "Destinos" },
  { clave: "paquetes", etiqueta: "Paquetes" },
  { clave: "reservar", etiqueta: "Reservar y pago" },
  { clave: "viaje", etiqueta: "Viaje CDMX" },
  { clave: "guias", etiqueta: "Guías e información" },
  { clave: "ingles", etiqueta: "Inglés (/en)" },
  { clave: "otras", etiqueta: "Otras páginas" },
];

const GUIAS = ["/info-practica", "/que-hacer-en-la-huasteca-potosina", "/sobre-la-huasteca-potosina", "/xilitla-o-ciudad-valles",
  "/planear", "/guia", "/preguntas-frecuentes", "/sustentabilidad-y-conservacion", "/politica-de-cancelacion"];

/** Una ruta empieza con `base` si es ella misma o sigue con «/» o «-» (/tours-en-xilitla es de Tours). */
const empieza = (p: string, base: string) => p === base || p.startsWith(`${base}/`) || p.startsWith(`${base}-`);

export function seccionDePagina(pathCrudo: string): Seccion {
  let p = (pathCrudo || "/").toLowerCase().split("?")[0].split("#")[0];
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (p === "/en" || p.startsWith("/en/")) return "ingles";
  if (p === "/" || p === "") return "inicio";
  if (empieza(p, "/tours")) return "tours";
  if (empieza(p, "/blog")) return "blog";
  if (empieza(p, "/destinos")) return "destinos";
  if (empieza(p, "/paquetes")) return "paquetes";
  if (empieza(p, "/reservar") || empieza(p, "/confirmacion")) return "reservar";
  if (empieza(p, "/viaje-cdmx") || empieza(p, "/huasteca-potosina-from-mexico-city") || empieza(p, "/desde")) return "viaje";
  if (GUIAS.some(g => empieza(p, g))) return "guias";
  return "otras";
}
