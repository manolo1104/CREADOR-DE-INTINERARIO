import Image from "next/image";

/**
 * `pos` es el encuadre de la foto dentro de su franja (`object-position`).
 * Sirve cuando lo que interesa de una foto no está en el centro: la franja es
 * angosta y `object-cover` recorta por los lados, así que sin esto el sujeto
 * se queda fuera. Sin `pos`, la foto se centra como siempre.
 */
type Panel = { src: string; alt?: string; pos?: string };

/**
 * El "hero" de una tarjeta de tour: una foto POR PARADA del recorrido, cortadas
 * en diagonal, en el orden en que se visitan.
 *
 * Los cortes se calculan, no se escriben a mano. Antes eran polígonos
 * aproximados a ojo: los huecos entre franjas salían de distinto grosor y el
 * collage se veía roto. Ahora las tres franjas miden lo mismo, la diagonal
 * tiene la misma inclinación en las dos juntas y el hueco es idéntico.
 *
 * Cada panel es una caja del ANCHO de su franja (no del ancho de la tarjeta) y
 * encima lleva su recorte, así `object-cover` encuadra la foto sobre la franja
 * que de verdad se ve, en vez de enseñar un tercio de una foto centrada.
 */

/** Inclinación de la diagonal: cuánto se corre el corte del borde de arriba al de abajo, en % del ancho. */
const SESGO = 16;
/** Hueco entre franjas, en % del ancho. Lo que asoma por ahí es el fondo de la tarjeta. */
const HUECO = 1.8;

type Corte = { left: string; width: string; clip: string };

function cortes(n: number): Corte[] {
  const medioHueco = HUECO / 2;
  // Corte j (j = 0..n): dónde parte la franja j de la j-1, arriba y abajo.
  const arriba = (j: number) => (j === 0 ? 0 : j === n ? 100 : (j * 100) / n + SESGO / 2);
  const abajo  = (j: number) => (j === 0 ? 0 : j === n ? 100 : (j * 100) / n - SESGO / 2);

  return Array.from({ length: n }, (_, i) => {
    const izqArr = i === 0 ? 0 : arriba(i) + medioHueco;
    const izqAba = i === 0 ? 0 : abajo(i) + medioHueco;
    const derArr = i === n - 1 ? 100 : arriba(i + 1) - medioHueco;
    const derAba = i === n - 1 ? 100 : abajo(i + 1) - medioHueco;

    // La caja que envuelve la franja, para que la foto se encuadre sobre ella.
    const x0 = Math.min(izqArr, izqAba);
    const x1 = Math.max(derArr, derAba);
    const w  = x1 - x0;
    const rel = (x: number) => `${(((x - x0) / w) * 100).toFixed(2)}%`;

    return {
      left:  `${x0.toFixed(2)}%`,
      width: `${w.toFixed(2)}%`,
      clip: `polygon(${rel(izqArr)} 0, ${rel(derArr)} 0, ${rel(derAba)} 100%, ${rel(izqAba)} 100%)`,
    };
  });
}

/** Hasta 4 franjas: hay recorridos de cuatro paradas y la tarjeta debe enseñarlas todas. */
const CORTES: Record<number, Corte[]> = { 1: cortes(1), 2: cortes(2), 3: cortes(3), 4: cortes(4) };

export function TourCollage({
  panels,
  nombre,
  className = "",
  priority = false,
  movil,
  anchoCompleto = false,
}: {
  panels: Panel[];
  nombre: string;
  className?: string;
  priority?: boolean;
  /**
   * El collage ocupa el ANCHO DE LA PANTALLA, no media tarjeta.
   *
   * Sin esto pedía cada franja al tamaño que tiene dentro de una tarjeta —la
   * mitad del ancho—, así que en el hero bajaba una foto de 170 px y la
   * estiraba a 420: se veía lavada. Con esto pide el ancho real de la franja.
   */
  anchoCompleto?: boolean;
  /**
   * Cuántas franjas dejar en pantalla angosta. Cuatro fotos en 390 px dan
   * tiras de 97 px donde no se reconoce ningún sitio: el collage se vuelve
   * una mancha. Con esto, el móvil enseña menos fotos y más grandes.
   *
   * Se dibujan las DOS versiones y el CSS enseña la que toca; cada una pide al
   * navegador el tamaño que de verdad va a ocupar, así la que está oculta baja
   * una miniatura y no una foto de ancho completo.
   */
  movil?: number;
}) {
  if (movil && panels.length > movil) {
    return (
      <>
        <div className="absolute inset-0 sm:hidden">
          <Capa panels={panels.slice(0, movil)} nombre={nombre} className={className} priority={priority} sizes="(min-width: 640px) 1px, 50vw" />
        </div>
        {/* La descripción ya la da la capa de arriba: repetirla haría que el
            lector de pantalla nombrara el paquete dos veces. */}
        <div className="absolute inset-0 hidden sm:block" aria-hidden="true">
          <Capa panels={panels} nombre={nombre} className={className} priority={priority} anchoCompleto={anchoCompleto} />
        </div>
      </>
    );
  }
  return <Capa panels={panels} nombre={nombre} className={className} priority={priority} anchoCompleto={anchoCompleto} />;
}

function Capa({
  panels,
  nombre,
  className = "",
  priority = false,
  sizes: sizesFijo,
  anchoCompleto = false,
}: {
  panels: Panel[];
  nombre: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  anchoCompleto?: boolean;
}) {
  const n = Math.min(4, Math.max(1, panels.length));
  const usadas = panels.slice(0, n);
  const corte = CORTES[n];
  // Con una sola foto no hay diagonal que dibujar: se pinta completa.
  const sizes = sizesFijo
    // La caja de cada franja es más ancha que la franja: la diagonal la
    // ensancha en `SESGO`. Pidiendo sólo 100/n el navegador bajaba 327 px para
    // una caja de 513 y la foto salía blanda en los bordes del corte.
    ?? (anchoCompleto
      ? `${Math.round(100 / n + SESGO)}vw`
      : n === 1
        ? "(max-width: 1024px) 100vw, 50vw"
        : `(max-width: 1024px) ${Math.round(100 / n)}vw, ${Math.round(50 / n)}vw`);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-negro ${className}`}>
      {usadas.map((p, i) => (
        <div
          key={p.src}
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: corte[i].left, width: corte[i].width, clipPath: n > 1 ? corte[i].clip : undefined }}
        >
          <Image
            src={p.src}
            // Solo la primera describe el tour; repetir el nombre tres veces le
            // da ruido al lector de pantalla.
            alt={i === 0 ? (p.alt ?? nombre) : ""}
            aria-hidden={i > 0 || undefined}
            fill
            priority={priority && i === 0}
            /**
             * En el hero, las franjas que no son la primera se cargan igual de
             * inmediato. Con la carga diferida que trae `next/image` por
             * defecto, Chrome a veces NO las pide nunca aunque estén a la
             * vista —medido: la petición no aparece en la red y la franja se
             * queda negra— y el hero quedaba a medias. El `priority` sigue en
             * la primera sola, que es la que vale como LCP; las demás sólo
             * dejan de ser diferidas.
             */
            loading={priority && i > 0 ? "eager" : undefined}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            style={p.pos ? { objectPosition: p.pos } : undefined}
            sizes={sizes}
          />
        </div>
      ))}
    </div>
  );
}
