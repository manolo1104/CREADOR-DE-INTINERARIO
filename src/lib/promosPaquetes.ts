/**
 * Los carteles de promoción que rotan en la sección de paquetes del inicio.
 *
 * ── Cómo agregar uno ────────────────────────────────────────────────────────
 * 1. Guarda el cartel en `public/imagenes/paquetes/promos/`, en **webp** y con
 *    1080 px de ancho. El original de 8 MB no se sube: se convierte antes
 *    (`sharp(src).resize({ width: 1080 }).webp({ quality: 82 })`), que deja el
 *    archivo en ~150 KB.
 * 2. Todos los carteles deben tener la MISMA proporción (hoy 1080×1560, o sea
 *    vertical 2:3). Si uno viene con otra forma, el carrusel da un salto al
 *    cambiar de imagen.
 * 3. Añade su renglón aquí abajo. El orden de la lista es el orden en que se
 *    muestran.
 *
 * ⚠️ El `slug` tiene que existir en `PAQUETES_DB`: es a dónde lleva el clic. Y
 * el precio y la duración del cartel tienen que coincidir con los del paquete,
 * porque el cliente ve el cartel y aterriza en la ficha; si no cuadran, lo
 * primero que hace es desconfiar.
 */
export interface PromoPaquete {
  /** Ruta dentro de `public/`. */
  imagen: string;
  /** Lo que se lee si la imagen no carga. Lleva los datos, no "cartel". */
  alt:    string;
  /** El paquete al que lleva el clic. Debe existir en `PAQUETES_DB`. */
  slug:   string;
}

export const PROMOS_PAQUETES: PromoPaquete[] = [
  {
    imagen: "/imagenes/paquetes/promos/inmersion-huasteca.webp",
    alt:
      "Inmersión Huasteca: Tamul, Sótano de las Huahuas y el Jardín de Edward James. " +
      "3 días y 2 noches desde $8,699 MXN por pareja, con habitación King, traslados, " +
      "desayunos, entradas y guía certificado.",
    slug: "inmersion-huasteca",
  },
  {
    imagen: "/imagenes/paquetes/promos/gran-huasteca.webp",
    alt:
      "Gran Huasteca: Tamul, Cascada del Meco y el Jardín de Edward James. " +
      "4 días y 3 noches desde $12,490 MXN por pareja, con habitación King, traslados, " +
      "desayunos, entradas y guía certificado.",
    slug: "gran-huasteca",
  },
  // ⏸️ El cartel del Paquete Aventura está FUERA a propósito (24 sep 2026): el
  // archivo que hay dice "3 DÍAS | 2 NOCHES" y el paquete ya es de 4 días y 3
  // noches. Dejarlo puesto haría que el inicio y la ficha se contradijeran, que
  // es lo primero que rompe la confianza. Vuelve en cuanto llegue el cartel
  // nuevo: se sustituye el .webp y se descomenta este bloque.
  // {
  //   imagen: "/imagenes/paquetes/promos/paquete-aventura.webp",
  //   alt: "Paquete Aventura: rafting en el Río Tampaón, paseo en RZR y el salto de cascadas en Micos. 4 días y 3 noches desde $13,590 MXN por pareja.",
  //   slug: "aventura",
  // },
  {
    imagen: "/imagenes/paquetes/promos/odisea-huasteca.webp",
    alt:
      "Odisea Huasteca: Tamul, el Jardín de Edward James, Cascadas de Micos y Minas Viejas. " +
      "5 días y 4 noches desde $16,500 MXN por pareja, con habitación King, traslados, " +
      "desayunos y entradas.",
    slug: "odisea-huasteca",
  },
];
