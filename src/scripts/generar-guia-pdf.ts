/**
 * Genera la GUÍA GRATIS en PDF (`public/guia-huasteca-potosina.pdf`), la que se
 * descarga en /guia, va adjunta en las confirmaciones y se manda por WhatsApp.
 *
 * 20 nov 2026, Manolo: «quiero que sea de alto impacto y que el cliente diga
 * "mejor contrato un tour": una guía completa con precios, horarios,
 * distancias, destinos, recomendaciones, imágenes».
 *
 * Todo sale de los MISMOS datos que el sitio (`destinos.ts`, `destinosGuia.ts`,
 * `destinosAtributos.ts`, `tours.ts`, `resenas.ts`): si cambia un precio en la
 * ficha, se vuelve a correr este script y la guía lo sigue. La guía anterior
 * (mayo 2026) tenía precios viejos y errores (Tamul «la más alta de México»,
 * canoa $350, Minas Viejas en Huehuetlán, Tamasopo $80).
 *
 * El argumento para el tour es HONESTO: no se esconde la opción de ir por tu
 * cuenta (cada día dice cuánto cuesta y qué implica); se enseña lo que la
 * gente descubre allá (canoa por embarcación, terracería, sin señal, horarios
 * de corte, cierres por lluvia) y lo que el tour resuelve.
 *
 * Uso:  npx tsx src/scripts/generar-guia-pdf.ts
 * Necesita Google Chrome instalado (imprime el HTML a PDF en modo headless).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import { guiaDe } from "@/lib/destinosGuia";
import { atributosDe, minutosValles, nadoTexto, nivelTexto, NIVELES } from "@/lib/destinosAtributos";
import { duracionTexto } from "@/lib/tiemposADestinos";
import { TOURS_DB, etiquetaUnidad, type Tour } from "@/lib/tours";
import { toursQueIncluyen } from "@/lib/tourMapping";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { RESENAS_REALES } from "@/lib/resenasReales";

const RAIZ = process.cwd();
const PUBLICO = path.join(RAIZ, "public");
const TRABAJO = path.join(os.tmpdir(), "guia-huasteca-pdf");
const IMGS = path.join(TRABAJO, "img");
mkdirSync(IMGS, { recursive: true });

const SITIO = "https://www.huasteca-potosina.com";
const WA = "524891090388";
const waLink = (t: string) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const REVISADO = "20 de noviembre de 2026";

// ── Utilidades ──────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Sin rayas largas en la guía: se cambian por coma o guion. */
const limpio = (s: string) => esc(s.replace(/\s—\s/g, ", ").replace(/—/g, "-").replace(/–/g, "-"));
const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;

const porSlug = (slug: string): Destino => {
  const d = DESTINOS_DB.find((x) => x.slug === slug);
  if (!d) throw new Error(`guía: no existe el destino ${slug}`);
  return d;
};
const tour = (slug: string): Tour => {
  const t = TOURS_DB.find((x) => x.slug === slug);
  if (!t) throw new Error(`guía: no existe el tour ${slug}`);
  return t;
};
const nombreTour = (t: Tour) => limpio((t.nombreCorto || t.nombre).split("—")[0].trim());
/** El nombre del restaurante no va en la guía (Manolo, 18 nov: el bot ya no lo dice). */
const sinRestaurante = (x: string) => x.replace(/,? en El Taco Loco/gi, "");
const precioTour = (t: Tour) => `${pesos(t.precio)} ${etiquetaUnidad(t, false)}`;

/** Copia la foto reducida (1400 px, JPEG) para que el PDF pese poco. */
async function foto(rel: string, ancho = 1400): Promise<string> {
  const origen = path.join(PUBLICO, rel);
  if (!existsSync(origen)) throw new Error(`guía: falta la foto ${rel}`);
  const destino = path.join(IMGS, `${rel.replace(/[^a-z0-9]+/gi, "-")}-${ancho}.jpg`);
  if (!existsSync(destino)) {
    await sharp(origen).rotate().resize({ width: ancho, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toFile(destino);
  }
  return `file://${destino}`;
}

// ── Contenido ───────────────────────────────────────────────────────────────

/** Los 12 de la guía, en el orden de la ruta de 5 días. */
const DESTINOS_GUIA = [
  "cascada-de-tamul", "cueva-del-agua", "sotano-de-las-huahuas", "sotano-de-las-golondrinas",
  "las-pozas-jardin-surrealista", "nacimiento-huichihuayan",
  "cascada-el-meco", "cascadas-minas-viejas", "cascadas-de-micos",
  "puente-de-dios-tamasopo", "cascadas-de-tamasopo", "laguna-media-luna",
];

/** Lo que más sorprende a quien va por su cuenta (todo sale de las fichas). */
const SORPRESAS = [
  ["La canoa de Tamul se cobra por embarcación", "Unos $2,000 por canoa, hasta 10 personas. Si van 2, sale en $1,000 cada uno; solo baja a ~$200 si llenas la canoa."],
  ["Casi todo es en efectivo y sin cajero", "Embarcaderos, ejidos y cooperativas cobran en efectivo. En la sierra no hay cajeros: se retira en Ciudad Valles, Xilitla o Aquismón."],
  ["Terracería y sin señal", "A Tamul son ~18 km de terracería; en el cañón, en los sótanos y en El Meco no hay señal de celular."],
  ["Horarios que no perdonan", "En Tamul hay que salir antes de las 11:00; a los sótanos, antes de las 6:00; en Las Pozas, si llegas tarde a tu turno, lo pierdes."],
  ["El río manda", "De julio a octubre Protección Civil cierra parajes cuando el río crece (Tamul se cerró el 16 de julio de 2026)."],
];

interface Paso { hora: string; texto: string }
interface Dia {
  n: number; titulo: string; zona: string; fotos: string[]; destinos: string[];
  pasos: Paso[]; gasto: string; manejo: string; tour: string; claves: string[];
}

const DIAS: Dia[] = [
  {
    n: 1, titulo: "Tamul, la Cueva del Agua y las Huahuas", zona: "Aquismón",
    fotos: ["/imagenes/cascada-de-tamul/hero.jpg", "/imagenes/tours/tamul/cueva-del-agua-clavados.jpg"],
    destinos: ["cascada-de-tamul", "cueva-del-agua", "sotano-de-las-huahuas"],
    pasos: [
      { hora: "07:00", texto: "Sal de Ciudad Valles con efectivo: en el embarcadero no hay cajero." },
      { hora: "08:00", texto: "Embarcadero de La Morena o Tanchachín. Te dan chaleco con la canoa." },
      { hora: "08:15", texto: "Remo río arriba de 1 a 2 horas. A medio camino se caminan ~400 m por la orilla." },
      { hora: "10:00", texto: "Tamul desde La Piedra, frente a la caída. Al pie no se nada." },
      { hora: "11:30", texto: "De regreso, Cueva del Agua: nado y clavados con chaleco." },
      { hora: "13:00", texto: "Comida en Aquismón." },
      { hora: "15:30", texto: "Sendero a las Huahuas: 1.2 km y más de 800 escalones." },
      { hora: "17:00", texto: "Las aves regresan al sótano al atardecer." },
    ],
    gasto: "Canoa ~$2,000 (÷ tu grupo) + embarcadero $10–$50 + Huahuas ~$100 por persona",
    manejo: "~1 h a Tamul (18 km de terracería) y regreso de noche por la sierra",
    tour: "expedicion-tamul",
    claves: ["Sin 10 personas la canoa sale cara: en el tour ya va incluida.", "Manejar la sierra de noche es lo que menos se recomienda; en el tour maneja el guía."],
  },
  {
    n: 2, titulo: "Las Pozas, Huichihuayán y el Castillo", zona: "Xilitla",
    fotos: ["/imagenes/las-pozas-jardin-surrealista/hero.jpg", "/imagenes/nacimiento-huichihuayan/hero.jpg"],
    destinos: ["las-pozas-jardin-surrealista", "nacimiento-huichihuayan", "castillo-de-la-salud"],
    pasos: [
      { hora: "08:00", texto: "Sal de Ciudad Valles (1 h 30 min) o despierta en Xilitla." },
      { hora: "09:30", texto: "Las Pozas con tu turno reservado: recorrido guiado de ~1.5 h. Cierra los martes." },
      { hora: "12:30", texto: "Nacimiento de Huichihuayán: agua helada y cristalina; comida en las palapas." },
      { hora: "15:00", texto: "Castillo de la Salud en Axtla: jardín de plantas medicinales (limpias hasta las 16:00)." },
      { hora: "17:30", texto: "Regreso. No manejes a Xilitla después de las 18:00: curvas y neblina." },
    ],
    gasto: "Las Pozas $180 + guía $30 + Huichihuayán ~$50 + Castillo $20 por persona",
    manejo: "~3 h de carretera de montaña en el día",
    tour: "ruta-surrealista-edward-james",
    claves: ["El turno de Las Pozas se reserva hasta 60 días antes y se agota en puentes.", "Si llegas tarde a tu turno, lo pierdes."],
  },
  {
    n: 3, titulo: "El Meco y El Salto", zona: "El Naranjo",
    fotos: ["/imagenes/cascada-el-meco/hero.jpg", "/imagenes/cascada-el-salto/hero.jpg"],
    destinos: ["cascada-el-meco", "cascada-el-salto"],
    pasos: [
      { hora: "07:00", texto: "Sal de Ciudad Valles (~1 h 45 min a El Naranjo)." },
      { hora: "09:00", texto: "El Meco: mirador gratis desde la carretera y panga a remo hasta la caída." },
      { hora: "11:00", texto: "Pozas turquesa río abajo. Al pie de la cascada no se nada." },
      { hora: "13:00", texto: "Comida en El Meco o El Naranjo." },
      { hora: "14:30", texto: "El Salto: pozas todo el año; la caída solo corre en lluvias (jul–sep)." },
      { hora: "17:00", texto: "Regreso a Ciudad Valles." },
    ],
    gasto: "El Meco $60–$70 + panga ~$150 + El Salto ~$50–$60 por persona, más estacionamientos",
    manejo: "~3 h 30 min de carretera en el día; el último tramo a El Salto es terracería",
    tour: "cascadas-del-meco",
    claves: ["El GPS manda a la reja de la hidroeléctrica: no es ahí.", "Sin señal de celular en toda la zona."],
  },
  {
    n: 4, titulo: "Minas Viejas y Micos", zona: "El Naranjo y Ciudad Valles",
    fotos: ["/imagenes/cascadas-minas-viejas/hero.jpg", "/imagenes/cascadas-de-micos/hero.jpg"],
    destinos: ["cascadas-minas-viejas", "cascadas-de-micos"],
    pasos: [
      { hora: "07:30", texto: "Sal de Ciudad Valles por La Hincada (~1 h 45 min)." },
      { hora: "09:30", texto: "Minas Viejas: ~200 escalones, poza azul bajo dos caídas de 50 m." },
      { hora: "12:30", texto: "Comida en el restaurante campestre o las palapas." },
      { hora: "14:30", texto: "Micos, a 30 min de Valles: pozas o el circuito de 7 saltos con guía (~90 min)." },
      { hora: "18:00", texto: "De vuelta en Ciudad Valles." },
    ],
    gasto: "Minas Viejas $100 + Micos ~$100 por persona; saltos con guía desde $750",
    manejo: "~4 h de carretera en el día",
    tour: "paraiso-escalonado-minas-micos",
    claves: ["Los saltos de Micos solo se hacen con guía, chaleco y casco.", "Con el río crecido, Protección Civil cierra los dos parajes."],
  },
  {
    n: 5, titulo: "Puente de Dios y Cascadas de Tamasopo", zona: "Tamasopo",
    fotos: ["/imagenes/puente-de-dios-tamasopo/hero.jpg", "/imagenes/cascadas-de-tamasopo/hero.jpg"],
    destinos: ["cascadas-de-tamasopo", "puente-de-dios-tamasopo"],
    pasos: [
      { hora: "08:00", texto: "Sal de Ciudad Valles (~1 h por la federal 70)." },
      { hora: "09:15", texto: "Cascadas de Tamasopo: entra temprano; sin comida ni chaleco propio." },
      { hora: "10:45", texto: "Puente de Dios: ~300 escalones; la luz entra a la cueva de 11:00 a 13:00." },
      { hora: "14:00", texto: "Comida en Tamasopo." },
      { hora: "16:00", texto: "Regreso a Ciudad Valles." },
    ],
    gasto: "Tamasopo $200 + Puente de Dios $150 + chalecos y estacionamientos (~$450 por persona)",
    manejo: "~2 h de carretera; tramo final de terracería a Puente de Dios",
    tour: "ruta-acuatica-puente-de-dios",
    claves: ["A la cueva se entra cruzando la corriente con cuerdas: conviene saber nadar.", "Con el río crecido no se entra a la cueva."],
  },
];

// ── Mapa (proyección simple lat/lng → SVG) ──────────────────────────────────

const PUEBLOS = [
  { n: "Ciudad Valles", lat: 21.9867, lng: -99.0108, base: true },
  { n: "Xilitla", lat: 21.3853, lng: -98.9905, base: true },
  { n: "Aquismón", lat: 21.6226, lng: -99.0196 },
  { n: "Tamasopo", lat: 21.9247, lng: -99.3962 },
  { n: "El Naranjo", lat: 22.5249, lng: -99.3311 },
  { n: "Rioverde", lat: 21.9298, lng: -99.9946 },
];

function mapaSvg(): string {
  const W = 620, H = 900, pad = 40;
  const lats = [21.3, 22.65], lngs = [-100.1, -98.75];
  const x = (lng: number) => pad + ((lng - lngs[0]) / (lngs[1] - lngs[0])) * (W - 2 * pad);
  const y = (lat: number) => pad + ((lats[1] - lat) / (lats[1] - lats[0])) * (H - 2 * pad);
  const puntos = DESTINOS_GUIA.map((s, i) => {
    const d = porSlug(s);
    return `<g><circle cx="${x(d.lng).toFixed(1)}" cy="${y(d.lat).toFixed(1)}" r="11" fill="#c8913a" stroke="#0e1710" stroke-width="2"/><text x="${x(d.lng).toFixed(1)}" y="${(y(d.lat) + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#0e1710">${i + 1}</text></g>`;
  }).join("");
  const pueblos = PUEBLOS.map((p) => `<g><rect x="${(x(p.lng) - 5).toFixed(1)}" y="${(y(p.lat) - 5).toFixed(1)}" width="10" height="10" fill="${p.base ? "#8fbe3a" : "#f3ecdc"}" transform="rotate(45 ${x(p.lng).toFixed(1)} ${y(p.lat).toFixed(1)})"/><text x="${(x(p.lng) + 12).toFixed(1)}" y="${(y(p.lat) + 4).toFixed(1)}" font-size="${p.base ? 14 : 12}" fill="${p.base ? "#8fbe3a" : "#f3ecdc"}" font-family="DM Sans" ${p.base ? 'font-weight="600"' : ""}>${p.n}</text></g>`).join("");
  // Escala: 0.1° de longitud ≈ 10.3 km a esta latitud.
  const km50 = (50 / 10.3) * 0.1;
  const escala = `<g><line x1="${pad}" y1="${H - 22}" x2="${(pad + (km50 / (lngs[1] - lngs[0])) * (W - 2 * pad)).toFixed(1)}" y2="${H - 22}" stroke="#f3ecdc" stroke-width="2"/><text x="${pad}" y="${H - 30}" font-size="11" fill="#f3ecdc" font-family="DM Sans">50 km</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="mapa">${escala}${pueblos}${puntos}</svg>`;
}

// ── HTML ────────────────────────────────────────────────────────────────────

async function construir(): Promise<string> {
  const portada = await foto("/imagenes/cascada-de-tamul/hero.jpg", 1800);
  const logo = `file://${path.join(PUBLICO, "logos/huasteca-potosina-tours-horizontal-reverso.svg")}`;

  // Fichas de destino (2 por página)
  const fichas: string[] = [];
  for (let i = 0; i < DESTINOS_GUIA.length; i++) {
    const slug = DESTINOS_GUIA[i];
    const d = porSlug(slug);
    const g = guiaDe(slug);
    const atr = atributosDe(slug);
    const min = minutosValles(d);
    const img = await foto(d.imagen_hero || d.imagen_galeria[0], 1200);
    const costos = (g?.costos ?? [{ concepto: "Entrada", monto: d.precio_entrada }]).slice(0, 3);
    const tRef = toursQueIncluyen(slug)[0];
    const t = tRef ? tour(tRef.slug) : undefined;
    const clave = g?.seguridad?.[0] ?? d.advertencias;
    fichas.push(`
      <article class="ficha">
        <div class="ficha-foto" style="background-image:url('${await img}')"><span class="num">${i + 1}</span></div>
        <div class="ficha-cuerpo">
          <h3>${limpio(d.nombre)}</h3>
          <p class="meta">${limpio(d.zona)} · ${nivelTexto(atr.nivel)} · ${nadoTexto(atr.nado)}</p>
          <table class="costos">${costos.map((c) => `<tr><td>${limpio(c.concepto)}</td><td>${limpio(c.monto)}</td></tr>`).join("")}</table>
          <p class="dato"><b>Horario:</b> ${limpio(g?.horario ?? d.horario)}${min != null ? ` · <b>Desde Valles:</b> ~${duracionTexto(min)}` : ""}</p>
          ${g?.pasoAPaso?.length ? `<p class="como-tit">Cómo es la visita</p><ul class="como">${g.pasoAPaso.slice(0, 1).map((p) => `<li>${limpio(p)}</li>`).join("")}</ul>` : ""}
          <p class="clave">${limpio(clave)}</p>
          ${t ? `<p class="contour">Incluido en <b>${nombreTour(t)}</b> · ${precioTour(t)}</p>` : ""}
        </div>
      </article>`);
  }
  const paginasFichas: string[] = [];
  for (let i = 0; i < fichas.length; i += 2) {
    paginasFichas.push(`<section class="pagina crema">
      ${i === 0 ? `<p class="eyebrow verde">Los 12 lugares</p><h2 class="con-titulo-h2">Qué ver, cuánto cuesta <em>y cuándo llegar.</em></h2>` : ""}
      <div class="fichas ${i === 0 ? "con-titulo" : ""}">${fichas[i]}${fichas[i + 1] ?? ""}</div>
      <footer class="pie">Huasteca Potosina 2026 · Precios por persona revisados el ${REVISADO}</footer>
    </section>`);
  }

  // Días
  const paginasDias: string[] = [];
  for (const dia of DIAS) {
    const t = tour(dia.tour);
    const [f1, f2] = await Promise.all(dia.fotos.map((f) => foto(f, 1200)));
    paginasDias.push(`<section class="pagina crema dia">
      <div class="dia-fotos"><div style="background-image:url('${f1}')"></div><div style="background-image:url('${f2}')"></div></div>
      <div class="dia-cab">
        <span class="dia-n">Día ${dia.n}</span>
        <h2>${limpio(dia.titulo)}</h2>
        <p class="meta">${limpio(dia.zona)} · horario sugerido</p>
      </div>
      <div class="dia-grid">
        <ol class="linea">${dia.pasos.map((p) => `<li><span class="hora">${p.hora}</span><span>${limpio(p.texto)}</span></li>`).join("")}</ol>
        <aside class="comparar">
          <div class="caja propia">
            <p class="caja-tit">Por tu cuenta</p>
            <p><b>Entradas:</b> ${limpio(dia.gasto)}</p>
            <p><b>Manejo:</b> ${limpio(dia.manejo)}</p>
            <p class="nota">Más gasolina, comida y estacionamientos.</p>
          </div>
          <div class="caja tour">
            <p class="caja-tit">Con nosotros</p>
            <p class="precio">${precioTour(t)}</p>
            <p class="tour-nombre">${nombreTour(t)} · ${t.duracion_hrs} h</p>
            <ul>${t.incluye.slice(0, 4).map((x) => `<li>${limpio(sinRestaurante(x))}</li>`).join("")}</ul>
          </div>
          <ul class="claves">${dia.claves.map((c) => `<li>${limpio(c)}</li>`).join("")}</ul>
        </aside>
      </div>
      <footer class="pie">Ruta de 5 días · Día ${dia.n}</footer>
    </section>`);
  }

  // Tabla de distancias
  const filasDist = DESTINOS_GUIA.map((s, i) => {
    const d = porSlug(s);
    const min = minutosValles(d);
    return `<tr><td><span class="bolita">${i + 1}</span>${limpio(d.nombre)}</td><td>${limpio(d.zona)}</td><td>${min != null ? `~${duracionTexto(min)}` : "-"}</td></tr>`;
  }).join("");

  // Tours destacados
  const destacados = ["expedicion-tamul", "ruta-surrealista-edward-james", "ruta-acuatica-puente-de-dios", "paraiso-escalonado-minas-micos", "cascadas-del-meco", "rafting-rio-tampaon"].map(tour);
  const fotosTours = await Promise.all(destacados.map((t) => foto(t.imagenTarjeta || t.imagen_hero, 800)));

  const fMapa = await foto("/imagenes/cascadas-minas-viejas/hero.jpg", 1800);
  const fCal = await foto("/imagenes/sotano-de-las-golondrinas/hero.jpg", 1800);
  const fRuta = await foto("/imagenes/cascadas-de-micos/gallery-3.jpg", 1800);
  const fCierre = await foto("/imagenes/cascada-de-tamul/grupo-cascada.jpg", 1800);
  const fLlevar = await foto("/imagenes/cascada-de-tamul/grupo-piedra.jpg", 1600);
  const fTemp = await Promise.all(["/imagenes/cascada-de-tamul/vista-abajo.jpg", "/imagenes/laguna-media-luna/hero.jpg", "/imagenes/las-pozas-jardin-surrealista/hero.jpg"].map((f) => foto(f, 900)));
  const resenas = RESENAS_REALES.filter((r) => r.texto.length < 240 && r.estrellas === 5).slice(0, 3);

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const tono = (m: number) => (m >= 10 || m <= 1 ? "ideal" : m <= 4 ? "calor" : "lluvia");
  const calendario = meses.map((m, i) => `<div class="mes ${tono(i)}"><span>${m}</span></div>`).join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/>
<title>Guía Huasteca Potosina 2026</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --negro:#0e1710; --verde:#1c2b1f; --selva:#2f5d34; --lima:#8fbe3a; --crema:#f3ecdc; --papel:#f6f1e4; --dorado:#c8913a; --terracota:#9a4a1e; --tinta:#1b2420; }
body { font-family:'DM Sans',sans-serif; color:var(--tinta); font-size:10.5pt; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
h1,h2,h3 { font-family:'Cormorant Garamond',serif; font-weight:500; line-height:1.05; }
em { font-style:italic; color:var(--dorado); }
.pagina { width:210mm; height:297mm; position:relative; overflow:hidden; page-break-after:always; padding:18mm 16mm 16mm; }
.crema { background:var(--papel); }
.oscura { background:var(--negro); color:var(--crema); }
.eyebrow { font-size:8pt; letter-spacing:.22em; text-transform:uppercase; color:var(--dorado); margin-bottom:4mm; font-weight:600; }
.eyebrow.verde { color:var(--selva); }
h2 { font-size:30pt; margin-bottom:6mm; }
.pie { position:absolute; bottom:8mm; left:16mm; right:16mm; font-size:7.5pt; color:#8a8577; letter-spacing:.06em; }
.oscura .pie { color:#6f7a6b; }
a { color:inherit; }

/* Portada */
.portada { padding:0; background:var(--negro); color:var(--crema); }
.portada .fondo { position:absolute; inset:0; background-size:cover; background-position:center; }
.portada .velo { position:absolute; inset:0; background:linear-gradient(180deg, rgba(14,23,16,.35) 0%, rgba(14,23,16,.15) 35%, rgba(14,23,16,.92) 72%, #0e1710 100%); }
.portada .contenido { position:absolute; left:16mm; right:16mm; bottom:22mm; }
.portada .logo { position:absolute; top:14mm; left:16mm; height:12mm; }
.portada h1 { font-size:54pt; margin:4mm 0 6mm; }
.portada .sub { font-size:12.5pt; max-width:140mm; color:#e6dfcd; }
.portada .chips { display:flex; gap:3mm; margin-top:8mm; flex-wrap:wrap; }
.portada .chips span { border:1px solid rgba(243,236,220,.35); border-radius:999px; padding:1.5mm 4mm; font-size:8.5pt; }
.portada .revisado { margin-top:7mm; font-size:8pt; color:#a8b0a2; }

/* En una página */
.claves-grid { display:grid; grid-template-columns:1fr 1fr; gap:4mm; margin-bottom:9mm; }
.tile { background:#fff; border-radius:4mm; padding:4.5mm 5mm; border:1px solid #e6ddc8; }
.tile b { display:block; font-family:'Cormorant Garamond',serif; font-size:15pt; font-weight:500; margin-bottom:1mm; color:var(--selva); }
.tile p { font-size:9.5pt; color:#3c463f; }
.sorpresas { background:var(--negro); color:var(--crema); border-radius:5mm; padding:7mm 8mm; }
.sorpresas h3 { font-size:19pt; margin-bottom:4mm; }
.sorpresas li { list-style:none; display:grid; grid-template-columns:7mm 1fr; padding:2.4mm 0; border-top:1px solid rgba(243,236,220,.12); }
.sorpresas li:first-child { border-top:0; }
.sorpresas li span.n { color:var(--dorado); font-weight:700; }
.sorpresas li b { display:block; color:#fff; font-weight:600; font-size:10pt; }
.sorpresas li p { font-size:9pt; color:#c9c4b4; }

/* Mapa */
.mapa-wrap { display:grid; grid-template-columns:1fr 1fr; gap:7mm; align-items:start; }
.mapa { width:100%; background:var(--verde); border-radius:5mm; }
table.dist { width:100%; border-collapse:collapse; font-size:9pt; }
table.dist th { text-align:left; font-size:7.5pt; letter-spacing:.12em; text-transform:uppercase; color:#8f988b; padding-bottom:2mm; }
table.dist td { padding:1.8mm 0; border-top:1px solid rgba(243,236,220,.1); color:#e8e2d1; }
.bolita { display:inline-flex; width:5.2mm; height:5.2mm; border-radius:50%; background:var(--dorado); color:var(--negro); font-size:7pt; font-weight:700; align-items:center; justify-content:center; margin-right:2mm; }
.leyenda { font-size:8pt; color:#a9b1a4; margin-top:3mm; }

/* Calendario */
.calendario { display:grid; grid-template-columns:repeat(12,1fr); gap:1.5mm; margin:4mm 0 3mm; }
.mes { height:22mm; border-radius:2mm; display:flex; align-items:flex-end; justify-content:center; padding-bottom:1.5mm; font-size:7.5pt; font-weight:600; color:#fff; }
.mes.ideal { background:var(--selva); } .mes.calor { background:var(--dorado); } .mes.lluvia { background:#6c7a86; }
.temporadas { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin-top:5mm; }
.temporadas div { background:rgba(243,236,220,.06); border-radius:4mm; padding:4mm; }
.temporadas b { display:block; font-family:'Cormorant Garamond',serif; font-size:14pt; font-weight:500; color:#fff; margin-bottom:1mm; }
.temporadas p { font-size:8.8pt; color:#c9c4b4; }

/* Fichas */
.fichas { display:grid; grid-template-rows:1fr 1fr; gap:6mm; height:250mm; }
.fichas.con-titulo { height:212mm; }
.con-titulo-h2 { font-size:24pt !important; margin-bottom:4mm !important; }
.ficha { display:grid; grid-template-columns:70mm 1fr; gap:6mm; background:#fff; border-radius:5mm; overflow:hidden; border:1px solid #e6ddc8; }
.ficha-foto { background-size:cover; background-position:center; position:relative; }
.ficha-foto .num { position:absolute; top:4mm; left:4mm; width:9mm; height:9mm; border-radius:50%; background:var(--dorado); color:var(--negro); font-weight:700; display:flex; align-items:center; justify-content:center; font-size:10pt; }
.ficha-cuerpo { padding:6mm 6mm 5mm 0; display:flex; flex-direction:column; }
.ficha h3 { font-size:21pt; }
.ficha .meta { font-size:8.5pt; color:#6b7268; margin:1mm 0 3mm; }
table.costos { width:100%; border-collapse:collapse; font-size:8.8pt; margin-bottom:3mm; }
table.costos td { padding:1.4mm 0; border-bottom:1px dashed #e2d8c2; vertical-align:top; }
table.costos td:last-child { text-align:right; font-weight:600; color:var(--terracota); padding-left:3mm; }
.dato { font-size:8.8pt; margin-bottom:2.5mm; }
.clave { font-size:8.6pt; color:#4b544d; background:#f4efe2; border-left:2px solid var(--dorado); padding:2mm 3mm; border-radius:0 2mm 2mm 0; }
.contour { margin-top:auto; padding-top:3mm; font-size:8.6pt; color:var(--selva); }

/* Días */
.dia { padding-top:0; }
.dia-fotos { display:grid; grid-template-columns:1.4fr 1fr; gap:2mm; height:78mm; margin:0 -16mm 7mm; }
.dia-fotos div { background-size:cover; background-position:center; }
.dia-n { font-size:8pt; letter-spacing:.22em; text-transform:uppercase; color:var(--dorado); font-weight:700; }
.dia-cab h2 { margin:1mm 0 1mm; font-size:28pt; }
.dia-cab .meta { font-size:8.5pt; color:#6b7268; margin-bottom:6mm; }
.dia-grid { display:grid; grid-template-columns:1fr 74mm; gap:7mm; }
.linea { list-style:none; position:relative; }
.linea li { display:grid; grid-template-columns:15mm 1fr; gap:3mm; padding:2.6mm 0; border-top:1px solid #e6ddc8; font-size:9.6pt; }
.linea li:first-child { border-top:0; }
.hora { font-weight:700; color:var(--selva); font-variant-numeric:tabular-nums; }
.caja { border-radius:4mm; padding:4.5mm; margin-bottom:4mm; font-size:8.8pt; }
.caja p { margin-bottom:1.6mm; }
.caja-tit { font-size:7.5pt !important; letter-spacing:.18em; text-transform:uppercase; font-weight:700; margin-bottom:2.5mm !important; }
.propia { background:#fff; border:1px solid #e6ddc8; }
.propia .caja-tit { color:#6b7268; }
.propia .nota { color:#8a8577; font-size:8pt; }
.tour { background:var(--negro); color:var(--crema); }
.tour .caja-tit { color:var(--lima); }
.tour .precio { font-family:'Cormorant Garamond',serif; font-size:20pt; color:var(--dorado); line-height:1; }
.tour .tour-nombre { color:#fff; font-weight:600; }
.tour ul { list-style:none; margin-top:2mm; }
.tour li { padding-left:4mm; position:relative; margin-bottom:1mm; color:#d4cfbf; font-size:8.3pt; }
.tour li::before { content:"✓"; position:absolute; left:0; color:var(--lima); }
.claves { list-style:none; font-size:8.4pt; color:#4b544d; }
.claves li { padding-left:4mm; position:relative; margin-bottom:1.6mm; }
.claves li::before { content:"!"; position:absolute; left:0; color:var(--terracota); font-weight:700; }

/* Comparación */
table.vs { width:100%; border-collapse:separate; border-spacing:0; font-size:9.2pt; margin-bottom:8mm; }
table.vs th { text-align:left; font-size:7.5pt; letter-spacing:.15em; text-transform:uppercase; padding:0 3mm 2.5mm; color:#8f988b; }
table.vs td { padding:3mm; border-top:1px solid rgba(243,236,220,.1); vertical-align:top; color:#d4cfbf; }
table.vs td:first-child { color:#fff; font-weight:600; width:38mm; }
table.vs td.si { color:#e8f3d2; background:rgba(143,190,58,.08); }
.tours-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; }
.tcard { background:rgba(243,236,220,.06); border-radius:4mm; overflow:hidden; }
.tcard div { height:26mm; background-size:cover; background-position:center; }
.tcard p { padding:2.5mm 3mm 0; font-size:8.6pt; color:#fff; font-weight:600; line-height:1.25; }
.tcard span { display:block; padding:1mm 3mm 3mm; font-size:8.6pt; color:var(--dorado); }

/* Llevar / dormir */
.dos { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }
.lista { list-style:none; font-size:9.4pt; }
.lista li { padding:2mm 0 2mm 5mm; border-top:1px solid #e6ddc8; position:relative; }
.lista li::before { content:"→"; position:absolute; left:0; color:var(--selva); }
h3.sec { font-size:18pt; margin:2mm 0 3mm; }
.aviso { background:var(--negro); color:var(--crema); border-radius:4mm; padding:5mm 6mm; font-size:9.2pt; margin-top:6mm; }
.aviso b { color:var(--dorado); }

/* Relleno con fotos */
.foto-abajo { position:absolute; left:0; right:0; bottom:0; height:105mm; background-size:cover; background-position:center; }
.foto-abajo.baja { height:62mm; }
.oscura .foto-abajo::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg, #0e1710 0%, rgba(14,23,16,0) 45%); }
.crema .foto-abajo::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg, #f6f1e4 0%, rgba(246,241,228,0) 40%); }
.pie.claro { color:#f3ecdc; text-shadow:0 1px 3px rgba(0,0,0,.6); z-index:2; }
.temporadas i { display:block; height:34mm; margin:-4mm -4mm 3mm; border-radius:4mm 4mm 0 0; background-size:cover; background-position:center; }
.como-tit { font-size:7.5pt; letter-spacing:.16em; text-transform:uppercase; color:var(--selva); font-weight:700; margin:1mm 0 1.5mm; }
.como { list-style:none; font-size:8.5pt; color:#3c463f; margin-bottom:3mm; }
.como li { padding-left:4mm; position:relative; margin-bottom:1.3mm; }
.como li::before { content:"→"; position:absolute; left:0; color:var(--selva); }
table.efectivo td { font-size:8.6pt; }
table.efectivo td:last-child { color:var(--tinta); font-weight:500; text-align:left; width:58%; }
.nota-ef { font-size:8.3pt; color:#6b7268; margin-top:2mm; }

/* Contraportada */
.cierre h2 { font-size:40pt; margin:6mm 0 5mm; }
.cierre .intro { font-size:11.5pt; color:#d9d3c2; max-width:150mm; }
.boton { display:inline-flex; align-items:center; gap:4mm; margin-top:9mm; background:#25d366; color:#06210f; text-decoration:none; border-radius:4mm; padding:5mm 8mm; font-weight:700; font-size:13pt; }
.boton small { display:block; font-weight:500; font-size:8.5pt; }
.resenas { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin-top:12mm; }
.resena { background:rgba(243,236,220,.06); border-radius:4mm; padding:4.5mm; font-size:8.6pt; color:#d4cfbf; }
.resena .est { color:var(--dorado); letter-spacing:.1em; margin-bottom:1.5mm; }
.resena .quien { margin-top:2mm; color:#fff; font-weight:600; font-size:8pt; }
.garantias { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin-top:10mm; font-size:8.8pt; color:#c9c4b4; }
.garantias b { display:block; color:#fff; margin-bottom:1mm; }
</style></head><body>

<!-- 1 · PORTADA -->
<section class="pagina portada">
  <div class="fondo" style="background-image:url('${portada}')"></div>
  <div class="velo"></div>
  <img class="logo" src="${logo}" alt="Huasteca Potosina Tours"/>
  <div class="contenido">
    <p class="eyebrow">Guía gratuita · Edición 2026</p>
    <h1>La Huasteca Potosina,<br/><em>completa.</em></h1>
    <p class="sub">12 lugares con precios reales, horarios, distancias y una ruta de 5 días hora por hora. Hecha por guías locales de Ciudad Valles y Xilitla.</p>
    <div class="chips"><span>Precios 2026</span><span>Mapa y distancias</span><span>Ruta de 5 días</span><span>Mes a mes</span></div>
    <p class="revisado">Datos revisados el ${REVISADO} con fuentes oficiales, medios y reseñas recientes.</p>
  </div>
</section>

<!-- 2 · EN UNA PÁGINA -->
<section class="pagina crema">
  <p class="eyebrow verde">Antes de empezar</p>
  <h2>La Huasteca<br/><em>en una página.</em></h2>
  <div class="claves-grid">
    <div class="tile"><b>Dónde está</b><p>El oriente tropical de San Luis Potosí, a unas 6 o 7 horas de la Ciudad de México y de Monterrey.</p></div>
    <div class="tile"><b>Dónde dormir</b><p>Ciudad Valles queda en medio de las cascadas; Xilitla, junto a Las Pozas y el bosque de niebla.</p></div>
    <div class="tile"><b>Cuántos días</b><p>Dos completos para lo esencial (Tamul y Xilitla). Con cinco ves todo lo de esta guía.</p></div>
    <div class="tile"><b>Mejor época</b><p>De noviembre a febrero: agua turquesa y cascadas llenas. De julio a octubre llueve y cierran parajes.</p></div>
    <div class="tile"><b>Dinero</b><p>Entradas de gratis a $200 por persona, casi todo en efectivo. Retira antes de subir a la sierra.</p></div>
    <div class="tile"><b>Señal y caminos</b><p>Sin señal en cañones y sótanos. Varios accesos tienen tramos de terracería: no manejes de noche.</p></div>
  </div>
  <div class="sorpresas">
    <h3>Lo que descubre quien va por su cuenta</h3>
    <ol>${SORPRESAS.map(([t, p], i) => `<li><span class="n">${i + 1}</span><div><b>${limpio(t)}</b><p>${limpio(p)}</p></div></li>`).join("")}</ol>
  </div>
  <footer class="pie">Huasteca Potosina 2026 · huasteca-potosina.com</footer>
</section>

<!-- 3 · MAPA Y DISTANCIAS -->
<section class="pagina oscura">
  <p class="eyebrow">El mapa</p>
  <h2>Dónde queda cada lugar<br/><em>y cuánto se maneja.</em></h2>
  <div class="mapa-wrap">
    <div>${mapaSvg()}<p class="leyenda">Rombo verde: dónde dormir. Círculo: los 12 lugares de esta guía, numerados como en las fichas.</p></div>
    <table class="dist"><thead><tr><th>Lugar</th><th>Municipio</th><th>Desde Valles</th></tr></thead><tbody>${filasDist}</tbody></table>
  </div>
  <p class="leyenda" style="margin-top:6mm">Tiempos en auto sin tráfico. En la sierra suma de 15 a 30 %. De Ciudad Valles a Xilitla: ~1 h 30 min.</p>
  <div class="foto-abajo baja" style="background-image:url('${fMapa}')"></div>
  <footer class="pie claro">Huasteca Potosina 2026 · Mapa simplificado, no a escala exacta</footer>
</section>

<!-- 4 · MES A MES -->
<section class="pagina oscura">
  <p class="eyebrow">Cuándo ir</p>
  <h2>El agua,<br/><em>mes a mes.</em></h2>
  <div class="calendario">${calendario}</div>
  <p class="leyenda">Verde: la mejor época. Dorado: calor y estiaje. Gris: lluvias.</p>
  <div class="temporadas">
    <div><i style="background-image:url('${fTemp[0]}')"></i><b>Noviembre a febrero</b><p>Agua turquesa, cascadas con caudal y clima templado. Las madrugadas en la sierra son frías: lleva chamarra para los sótanos.</p></div>
    <div><i style="background-image:url('${fTemp[1]}')"></i><b>Marzo a mayo</b><p>Agua clara pero mucho calor (Tamtoc puede pasar de 45 °C). En abril y mayo Tamul puede quedarse casi sin agua por el estiaje.</p></div>
    <div><i style="background-image:url('${fTemp[2]}')"></i><b>Junio a octubre</b><p>Llueve: los ríos bajan cafés y Protección Civil cierra parajes cuando crecen. El Salto, en cambio, solo cae en lluvias.</p></div>
  </div>
  <div class="aviso" style="margin-top:10mm"><b>Fechas de mucha gente:</b> Semana Santa, verano, puentes y Xantolo (fin de octubre a 2 de noviembre). En esas fechas Las Pozas agota turnos y la Media Luna cierra el acceso cuando se llena: reserva con tiempo.</div>
  <div class="foto-abajo" style="background-image:url('${fCal}')"></div>
  <footer class="pie claro">Huasteca Potosina 2026 · Cuándo ir</footer>
</section>

<!-- 5-10 · FICHAS -->
${paginasFichas.join("\n")}

<!-- 11 · PORTADILLA DE LA RUTA -->
<section class="pagina oscura">
  <p class="eyebrow">La ruta</p>
  <h2>Cinco días,<br/><em>hora por hora.</em></h2>
  <p style="max-width:150mm;color:#d9d3c2;font-size:11pt">Una ruta que funciona durmiendo en Ciudad Valles (el día 2 también puedes dormir en Xilitla). En cada día va lo que cuesta por tu cuenta y el tour que lo hace por ti: tú decides.</p>
  <ol class="sorpresas" style="margin-top:10mm;background:rgba(243,236,220,.05)">
    ${DIAS.map((d) => `<li><span class="n">${d.n}</span><div><b>${limpio(d.titulo)}</b><p>${limpio(d.zona)} · con nosotros: ${nombreTour(tour(d.tour))}, ${precioTour(tour(d.tour))}</p></div></li>`).join("")}
  </ol>
  <div class="foto-abajo" style="background-image:url('${fRuta}')"></div>
  <footer class="pie claro">Huasteca Potosina 2026 · Ruta de 5 días</footer>
</section>

<!-- 12-16 · DÍAS -->
${paginasDias.join("\n")}

<!-- 17 · POR TU CUENTA VS CON NOSOTROS -->
<section class="pagina oscura">
  <p class="eyebrow">La decisión</p>
  <h2>¿Por tu cuenta<br/><em>o con nosotros?</em></h2>
  <table class="vs">
    <thead><tr><th></th><th>Por tu cuenta</th><th>Con Huasteca Potosina Tours</th></tr></thead>
    <tbody>
      <tr><td>Transporte</td><td>Tu auto o taxi con espera; terracería, curvas y sierra de noche.</td><td class="si">Pasamos por ti a tu hotel en Ciudad Valles o Xilitla.</td></tr>
      <tr><td>Canoa de Tamul</td><td>~$2,000 por canoa; sin 10 personas pagas más.</td><td class="si">Incluida, la canoa y el chaleco.</td></tr>
      <tr><td>Entradas</td><td>Cada una en efectivo, en la puerta.</td><td class="si">Incluidas en el precio.</td></tr>
      <tr><td>Horarios</td><td>Tú calculas cortes de canoa, turnos y la luz de cada lugar.</td><td class="si">Llegamos a la hora buena de cada lugar.</td></tr>
      <tr><td>Seguridad</td><td>Chaleco y casco si los rentas; sin guía en saltos y corrientes.</td><td class="si">Guía certificado NOM-09 y equipo de seguridad.</td></tr>
      <tr><td>Si el río crece</td><td>Pierdes el viaje y la gasolina.</td><td class="si">Si el río no deja operar: reembolso o cambio de fecha.</td></tr>
      <tr><td>Si cambian tus planes</td><td>Sin devolución de lo que ya pagaste.</td><td class="si">Cancelación gratis hasta 48 h antes, con reembolso completo.</td></tr>
    </tbody>
  </table>
  <div class="tours-grid">${destacados.map((t, i) => `<div class="tcard"><div style="background-image:url('${fotosTours[i]}')"></div><p>${nombreTour(t)}</p><span>${precioTour(t)}</span></div>`).join("")}</div>
  <footer class="pie">Precios de los tours vigentes al ${REVISADO} · Apartas con el 30 % y el resto se paga el día del tour</footer>
</section>

<!-- 18 · QUÉ LLEVAR Y DÓNDE DORMIR -->
<section class="pagina crema">
  <p class="eyebrow verde">Lo práctico</p>
  <h2>Qué llevar<br/><em>y dónde dormir.</em></h2>
  <div class="dos">
    <div>
      <h3 class="sec">En la mochila</h3>
      <ul class="lista">
        <li>Zapatos acuáticos que sujeten el pie (las rocas resbalan)</li>
        <li>Bloqueador y repelente biodegradables</li>
        <li>Bolsa seca para el celular</li>
        <li>Efectivo para entradas, chalecos y estacionamientos</li>
        <li>Traje de baño, toalla de secado rápido y ropa de cambio</li>
        <li>Chamarra para las madrugadas de los sótanos</li>
        <li>Lámpara frontal (sin apuntar al fondo de los sótanos)</li>
        <li>Agua (2 L por persona) y algo de comer</li>
      </ul>
    </div>
    <div>
      <h3 class="sec">Dónde dormir</h3>
      <ul class="lista">
        <li><b>Ciudad Valles:</b> a 30 min de Micos y a cerca de 1 h de Tamul y Tamasopo. La mejor base para las cascadas.</li>
        <li><b>Xilitla:</b> junto a Las Pozas, Huichihuayán y el bosque de niebla. Ideal para el día 2.</li>
        <li><b>Hotel Paraíso Encantado (Xilitla):</b> nuestro hotel, a unos minutos a pie de Las Pozas. paraisoencantado.com</li>
      </ul>
      <div class="aviso"><b>En el agua:</b> chaleco siempre, aunque sepas nadar. No nades al pie de las cascadas. Respeta los cierres de Protección Civil. Y no manejes de noche por la sierra.</div>
    </div>
  </div>
  <h3 class="sec" style="margin-top:8mm">Cuánto efectivo llevar (solo entradas, por persona)</h3>
  <table class="costos efectivo">${DIAS.map((d) => `<tr><td>Día ${d.n} · ${limpio(d.titulo)}</td><td>${limpio(d.gasto)}</td></tr>`).join("")}</table>
  <p class="nota-ef">Aparte: gasolina, comida, estacionamientos y chalecos. En los tours, las entradas ya van incluidas.</p>
  <div class="foto-abajo baja" style="background-image:url('${fLlevar}')"></div>
  <footer class="pie claro">Huasteca Potosina 2026 · Lo práctico</footer>
</section>

<!-- 19 · CIERRE -->
<section class="pagina oscura cierre">
  <p class="eyebrow">¿Te lo armamos?</p>
  <h2>Tú eliges las fechas.<br/><em>Nosotros, todo lo demás.</em></h2>
  <p class="intro">Escríbenos tus fechas y cuántos van. Te mandamos una propuesta con precio final, sin costos escondidos. Contesta la misma gente que te guía.</p>
  <a class="boton" href="${waLink("Hola, leí la guía de la Huasteca y quiero cotizar mis fechas.")}">WhatsApp 489 109 0388<small>Toca para escribirnos</small></a>
  <p style="margin-top:4mm;font-size:9pt;color:#a9b1a4">O reserva en línea en ${SITIO.replace("https://", "")}/tours</p>
  <div class="resenas">${resenas.map((r) => `<div class="resena"><p class="est">★★★★★</p><p>${limpio(r.texto.replace(/\s*…$/, ""))}</p><p class="quien">${limpio(r.autor)} · ${limpio(r.fecha)} · Google</p></div>`).join("")}</div>
  <div class="garantias">
    <div><b>${GOOGLE_RATING} de 5 en Google</b>${GOOGLE_RESENAS} reseñas de viajeros</div>
    <div><b>Cancelación gratis</b>Hasta 48 h antes, con reembolso completo</div>
    <div><b>Si el río no deja</b>Reembolso o cambio de fecha</div>
  </div>
  <div class="foto-abajo baja" style="background-image:url('${fCierre}')"></div>
  <footer class="pie claro">Huasteca Potosina Tours · Ciudad Valles y Xilitla, San Luis Potosí · ${SITIO.replace("https://", "")}</footer>
</section>
</body></html>`;
}

async function main() {
  const html = await construir();
  const archivoHtml = path.join(TRABAJO, "guia.html");
  writeFileSync(archivoHtml, html);
  const salida = path.join(PUBLICO, "guia-huasteca-potosina.pdf");
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", `--user-data-dir=${path.join(TRABAJO, "perfil-chrome")}`, "--no-pdf-header-footer", "--allow-file-access-from-files",
    "--virtual-time-budget=15000", `--print-to-pdf=${salida}`, `file://${archivoHtml}`,
  ], { stdio: "inherit", timeout: 120_000 });
  console.log(`PDF: ${salida} (${(statSync(salida).size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`HTML: ${archivoHtml}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
