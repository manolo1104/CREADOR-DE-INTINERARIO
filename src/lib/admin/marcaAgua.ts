// La marca de agua de las fotos de los tours.
//
// Todo pasa en el navegador de quien las procesa: la foto se abre, se le
// dibuja el logo encima y se vuelve a guardar como JPG, sin tocar el
// servidor. Por eso no hay nada que borrar después ni espacio que pagar, y
// por eso funciona con la señal a medias que hay de regreso de un tour.

import { AVE, CAJA, HUASTECA, POTOSINA_TOURS, WEB } from "./logoMarca";

export type Posicion = "centro" | "derecha" | "izquierda";
export type Tamano = "chico" | "mediano" | "grande";

export interface OpcionesMarca {
  posicion: Posicion;
  tamano: Tamano;
  /** Poner huasteca-potosina.com bajo el logo. */
  conWeb: boolean;
}

/** Cuánto se gira una foto, en el sentido de las manecillas del reloj. */
export type Giro = 0 | 90 | 180 | 270;

export const OPCIONES_INICIALES: OpcionesMarca = {
  posicion: "centro",
  tamano: "mediano",
  conWeb: true,
};

/**
 * Calidad del JPG que sale.
 *
 * La foto conserva su tamaño original; lo único que cambia es que se vuelve a
 * guardar en JPG. A 0.95 esa segunda vuelta no se distingue del original ni
 * ampliada. Más arriba el archivo casi duplica su peso sin ganar nada que el
 * ojo vea.
 */
const CALIDAD_JPG = 0.95;
const LADO_MINIATURA = 360;

/**
 * Cuántos píxeles caben en un lienzo.
 *
 * Las fotos salen del MISMO tamaño que entraron. La única excepción es el
 * iPhone/iPad: Safari ahí no dibuja lienzos de más de 16,7 millones de
 * píxeles, y una foto más grande saldría en blanco. Una de 24 MP baja a
 * 16,7 MP (el 83 % de su ancho), que sigue siendo más que una foto de iPhone.
 * En computadora no se toca.
 */
const AREA_IPHONE = 16_777_216;
const AREA_COMPUTADORA = 120_000_000;   // muy por encima de cualquier cámara de tour

function esIPhoneOIPad(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|od|ad)/.test(navigator.userAgent)
    || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/**
 * Qué tan ancho va el logo, como fracción del lado CORTO de la foto.
 *
 * Se mide contra el lado corto para que se vea igual en una foto horizontal y
 * en una vertical: medido contra el ancho, en la vertical quedaría diminuto.
 * En una horizontal, "mediano" ocupa cerca de la cuarta parte del ancho,
 * como en las fotos de Xcaret.
 */
const FRACCION: Record<Tamano, number> = { chico: 0.26, mediano: 0.34, grande: 0.44 };
const MARGEN = 0.045;

/** Dónde va el logo, en píxeles de la foto. */
export function cajaDeMarca(ancho: number, alto: number, op: OpcionesMarca) {
  const logo   = op.conWeb ? CAJA.web : CAJA.solo;
  const corto  = Math.min(ancho, alto);
  const w      = Math.round(corto * FRACCION[op.tamano]);
  const h      = Math.round(w * (logo.alto / logo.ancho));
  const margen = Math.round(corto * MARGEN);
  const x =
    op.posicion === "centro"  ? Math.round((ancho - w) / 2) :
    op.posicion === "derecha" ? ancho - margen - w :
                                margen;
  return { x, y: alto - margen - h, ancho: w, alto: h };
}

// ── El logo ─────────────────────────────────────────────────────────────────

let trazos: { letras: Path2D[]; web: Path2D; ave: Path2D[] } | null = null;

function trazosDelLogo() {
  trazos ??= {
    letras: [new Path2D(HUASTECA), new Path2D(POTOSINA_TOURS)],
    web:    new Path2D(WEB),
    ave:    AVE.trazos.map(d => new Path2D(d)),
  };
  return trazos;
}

/**
 * El logo pintado en blanco al tamaño exacto en que va a quedar.
 *
 * Se dibuja desde los trazos cada vez, así que en una foto de 6000 px sale
 * tan nítido como en una de 1000: nunca se estira una imagen. Va en un lienzo
 * aparte y no directo sobre la foto porque la sombra se le pone al final, al
 * logo entero; puesta pieza por pieza, la sombra de cada letra ensuciaría a
 * la de al lado.
 */
function logoAlTamano(ancho: number, alto: number, conWeb: boolean): HTMLCanvasElement {
  const caja = conWeb ? CAJA.web : CAJA.solo;
  const t = trazosDelLogo();
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede editar fotos");
  const k = ancho / caja.ancho;
  ctx.setTransform(k, 0, 0, k, -caja.x * k, -caja.y * k);
  ctx.fillStyle = "#fff";
  for (const p of t.letras) ctx.fill(p);
  if (conWeb) ctx.fill(t.web);
  ctx.translate(AVE.x, AVE.y);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = AVE.grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of t.ave) ctx.stroke(p);
  return lienzo;
}

/**
 * Pone el logo sobre lo que ya hay en el lienzo.
 *
 * Blanco sólido con una sombra suave: se lee igual sobre la selva que sobre
 * la espuma blanca de una cascada, sin tapar la foto con un recuadro.
 */
export function dibujarMarca(ctx: CanvasRenderingContext2D, ancho: number, alto: number, op: OpcionesMarca) {
  const c = cajaDeMarca(ancho, alto, op);
  const logo = logoAlTamano(c.ancho, c.alto, op.conWeb);
  ctx.save();
  ctx.shadowColor   = "rgba(0,0,0,0.45)";
  ctx.shadowBlur    = Math.max(2, c.alto * 0.14);
  ctx.shadowOffsetY = Math.max(1, c.alto * 0.02);
  ctx.drawImage(logo, c.x, c.y);   // sin escalar: píxel por píxel
  ctx.restore();
  logo.width = 0;
  logo.height = 0;
}

// ── Abrir y guardar ─────────────────────────────────────────────────────────

/**
 * Abre una foto del disco.
 *
 * Se usa una <img> y no createImageBitmap a propósito: la <img> respeta el
 * giro que la cámara anota en la foto (EXIF) en todos los navegadores. Sin
 * eso, las fotos tomadas con la cámara de lado salen acostadas.
 */
async function abrirFoto(archivo: Blob): Promise<{ img: HTMLImageElement; cerrar: () => void }> {
  const url = URL.createObjectURL(archivo);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  const cerrar = () => { img.removeAttribute("src"); URL.revokeObjectURL(url); };
  try {
    await img.decode();
  } catch {
    cerrar();
    throw new Error("No se pudo abrir");
  }
  if (!img.naturalWidth || !img.naturalHeight) { cerrar(); throw new Error("No se pudo abrir"); }
  return { img, cerrar };
}

function aBlob(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    lienzo.toBlob(b => (b ? resolve(b) : reject(new Error("No se pudo guardar"))), "image/jpeg", calidad),
  );
}

/** Reduce solo lo indispensable para caber en `area` píxeles; si cabe, igual. */
function medidasEnArea(w: number, h: number, area: number) {
  if (w * h <= area) return { ancho: w, alto: h };
  const k = Math.sqrt(area / (w * h));
  return { ancho: Math.floor(w * k), alto: Math.floor(h * k) };
}

/** Reduce al lado más largo indicado (para la vista previa y las miniaturas). */
function medidasALado(w: number, h: number, lado: number) {
  const k = Math.min(1, lado / Math.max(w, h));
  return { ancho: Math.round(w * k), alto: Math.round(h * k) };
}

/** Las medidas de la foto ya girada: a 90° o 270° se intercambian. */
function girada(m: { ancho: number; alto: number }, giro: Giro) {
  return giro === 90 || giro === 270 ? { ancho: m.alto, alto: m.ancho } : m;
}

/**
 * Dibuja la foto (de `ancho` × `alto`) girada sobre un lienzo que ya tiene las
 * medidas giradas.
 *
 * Los giros son de cuarto de vuelta con números enteros, así que cada píxel
 * cae exacto en su nuevo lugar: girar no le quita nitidez a la foto.
 */
function dibujarGirada(
  ctx: CanvasRenderingContext2D, fuente: CanvasImageSource,
  ancho: number, alto: number, giro: Giro,
) {
  const matriz: [number, number, number, number, number, number] =
    giro === 90  ? [0, 1, -1, 0, alto, 0] :
    giro === 180 ? [-1, 0, 0, -1, ancho, alto] :
    giro === 270 ? [0, -1, 1, 0, 0, ancho] :
                   [1, 0, 0, 1, 0, 0];
  ctx.setTransform(...matriz);
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

async function pintarYGuardar(
  img: HTMLImageElement, m: { ancho: number; alto: number }, giro: Giro,
  op: OpcionesMarca, lienzo: HTMLCanvasElement,
): Promise<Blob> {
  const g = girada(m, giro);
  lienzo.width = g.ancho;
  lienzo.height = g.alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede editar fotos");
  // Fondo blanco: un PNG con partes transparentes saldría en negro al pasar a JPG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, g.ancho, g.alto);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  dibujarGirada(ctx, img, m.ancho, m.alto, giro);
  // El logo va después de girar: siempre derecho y abajo de la foto como queda.
  dibujarMarca(ctx, g.ancho, g.alto, op);
  return aBlob(lienzo, CALIDAD_JPG);
}

// ── Procesar ────────────────────────────────────────────────────────────────

export interface FotoConMarca {
  foto: Blob;
  miniatura: Blob;
  ancho: number;
  alto: number;
  /** Salió más chica que la original (solo pasa en iPhone con fotos de más de 16,7 MP). */
  reducida: boolean;
}

/**
 * La foto ya con el logo, a su tamaño original, y su miniatura para la rejilla.
 *
 * Los dos lienzos se reciben de fuera y se reutilizan foto tras foto: crear
 * uno nuevo por foto hace que Safari en iPhone se quede sin memoria de lienzo
 * a las pocas decenas.
 */
export async function ponerMarca(
  archivo: Blob, op: OpcionesMarca, giro: Giro,
  lienzo: HTMLCanvasElement, lienzoMini: HTMLCanvasElement,
): Promise<FotoConMarca> {
  const { img, cerrar } = await abrirFoto(archivo);
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    let m = medidasEnArea(w, h, esIPhoneOIPad() ? AREA_IPHONE : AREA_COMPUTADORA);
    let foto: Blob;
    try {
      foto = await pintarYGuardar(img, m, giro, op, lienzo);
    } catch (e) {
      // Un navegador con un tope de lienzo más bajo que el que se esperaba:
      // antes de dar la foto por perdida, se intenta al tope del iPhone.
      if (m.ancho * m.alto <= AREA_IPHONE) throw e;
      m = medidasEnArea(w, h, AREA_IPHONE);
      foto = await pintarYGuardar(img, m, giro, op, lienzo);
    }

    const g = girada(m, giro);
    const mini = medidasALado(g.ancho, g.alto, LADO_MINIATURA);
    lienzoMini.width = mini.ancho;
    lienzoMini.height = mini.alto;
    const cm = lienzoMini.getContext("2d");
    if (!cm) throw new Error("Este navegador no puede editar fotos");
    cm.imageSmoothingEnabled = true;
    cm.imageSmoothingQuality = "high";
    cm.drawImage(lienzo, 0, 0, mini.ancho, mini.alto);
    const miniatura = await aBlob(lienzoMini, 0.8);

    return { foto, miniatura, ancho: g.ancho, alto: g.alto, reducida: m.ancho < w };
  } finally {
    cerrar();
  }
}

/**
 * La foto en chico, sin marca, para la vista previa.
 *
 * Se guarda aparte para que mover el logo de lugar redibuje al instante, sin
 * volver a abrir una foto de 6000 px cada vez que se toca un botón.
 */
export async function fotoParaVista(archivo: Blob, lado = 1400): Promise<HTMLCanvasElement> {
  const { img, cerrar } = await abrirFoto(archivo);
  try {
    const { ancho, alto } = medidasALado(img.naturalWidth, img.naturalHeight, lado);
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Este navegador no puede editar fotos");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, ancho, alto);
    return lienzo;
  } finally {
    cerrar();
  }
}

/**
 * Pinta la vista previa: la foto en chico, girada si hace falta, con el logo
 * encima. Girar aquí es instantáneo porque parte de la foto ya reducida.
 */
export function pintarVista(destino: HTMLCanvasElement, base: HTMLCanvasElement, op: OpcionesMarca, giro: Giro = 0) {
  const g = girada({ ancho: base.width, alto: base.height }, giro);
  destino.width = g.ancho;
  destino.height = g.alto;
  const ctx = destino.getContext("2d");
  if (!ctx) return;
  dibujarGirada(ctx, base, base.width, base.height, giro);
  dibujarMarca(ctx, g.ancho, g.alto, op);
}

// ── Archivos ────────────────────────────────────────────────────────────────

/** "Tamul con la familia Ortiz" → "tamul-con-la-familia-ortiz". */
export function aNombreDeArchivo(texto: string): string {
  return texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** Hoy, en la hora de México, como 2026-09-21. */
export function hoyEnMexico(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

/**
 * Qué se puede abrir.
 *
 * Las cámaras suelen guardar cada foto dos veces: en JPG y en RAW (.CR2,
 * .NEF, .ARW). El RAW no lo abre ningún navegador, así que se aparta desde
 * el principio en vez de fallar foto por foto.
 */
export function esFotoLegible(archivo: File): boolean {
  if (/^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(archivo.type)) return true;
  return /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(archivo.name);
}
