import { localePath, type Locale } from "./config";

/**
 * Traducción de /creditos (10 nov 2026). La lista de fotos y sus autores vive
 * en la página (`CREDITOS_CC`); aquí solo el texto que la rodea.
 *
 * Los nombres de autor y de licencia NO se traducen: la atribución tiene que
 * coincidir con la de Wikimedia Commons.
 */

export interface CreditosContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;

  inLanguage: string;
  webPageName: string;
  webPageDescription: string;

  breadcrumbHome: string;
  /** Miga visible (corta). */
  breadcrumbActual: string;
  /** Miga del JSON-LD (larga, como siempre la tuvo). */
  breadcrumbSchema: string;

  eyebrow: string;
  h1: string;
  introPre: string;
  introLink: string;
  introHref: string;
  introPost: string;
  nota: string;
  fotoPre: string;
  contacto: string;
}

const ES: CreditosContent = {
  metaTitle: "Créditos de fotografía — Huasteca Potosina Tours",
  metaDescription:
    "Atribución de las fotografías con licencia Creative Commons utilizadas en las páginas de destinos de la Huasteca Potosina.",
  ogTitle: "Créditos de fotografía — Huasteca Potosina Tours",
  ogDescription:
    "Atribución de las fotografías con licencia Creative Commons utilizadas en las páginas de destinos de la Huasteca Potosina.",
  ogImageAlt: "Tours Huasteca Potosina",

  inLanguage: "es-MX",
  webPageName: "Créditos de fotografía",
  webPageDescription:
    "Atribución de las fotografías con licencia Creative Commons utilizadas en las páginas de destinos de la Huasteca Potosina.",

  breadcrumbHome: "Inicio",
  breadcrumbActual: "Créditos",
  breadcrumbSchema: "Créditos de fotografía",

  eyebrow: "Atribución de fotografía",
  h1: "Créditos de imágenes",
  introPre:
    "La mayoría de las fotografías de este sitio son propias o cortesía de nuestros viajeros y aliados. Algunas imágenes de las páginas de ",
  introLink: "destinos",
  introHref: "/destinos",
  introPost:
    " provienen de Wikimedia Commons bajo licencias Creative Commons; aquí está su atribución, con gratitud a sus autores.",
  nota:
    "Las imágenes marcadas como “representativas” ilustran el tipo de paisaje o tradición del lugar mientras conseguimos fotografía propia del sitio exacto. Las fotos de La Trinidad, la Olla de la Luz, la Cueva del Salitre y el Museo Leonora Carrington de Xilitla provienen de los sitios oficiales de cada lugar y de la Secretaría de Cultura (Sistema de Información Cultural).",
  fotoPre: "Fotografía: ",
  contacto:
    "¿Eres autor de alguna de estas imágenes y quieres ajustar o retirar su atribución? Escríbenos a tours@huasteca-potosina.com y lo resolvemos de inmediato.",
};

const EN: CreditosContent = {
  // 39 caracteres.
  metaTitle: "Photo Credits — Huasteca Potosina Tours",
  metaDescription:
    "Attribution for the Creative Commons–licensed photos used on our Huasteca Potosina destination pages: the author and license of each image.",
  ogTitle: "Photo Credits — Huasteca Potosina Tours",
  ogDescription:
    "Attribution for the Creative Commons–licensed photos used on our Huasteca Potosina destination pages.",
  ogImageAlt: "Huasteca Potosina Tours",

  inLanguage: "en",
  webPageName: "Photo credits",
  webPageDescription:
    "Attribution for the Creative Commons–licensed photos used on the Huasteca Potosina destination pages.",

  breadcrumbHome: "Home",
  breadcrumbActual: "Credits",
  breadcrumbSchema: "Photo credits",

  eyebrow: "Photo attribution",
  h1: "Image credits",
  introPre:
    "Most of the photos on this site are our own or courtesy of our travelers and partners. Some images on the ",
  introLink: "destination",
  introHref: localePath("/destinos", "en"),
  introPost:
    " pages come from Wikimedia Commons under Creative Commons licenses; here is their attribution, with thanks to their authors.",
  nota:
    "Images marked as “representative” show the kind of landscape or tradition of the place while we get our own photos of the exact site. The photos of La Trinidad, the Olla de la Luz, the Cueva del Salitre and the Leonora Carrington Museum in Xilitla come from each place's official website and from Mexico's Ministry of Culture (Secretaría de Cultura, Sistema de Información Cultural).",
  fotoPre: "Photo: ",
  contacto:
    "Are you the author of one of these images and want to adjust or remove its attribution? Write to us at tours@huasteca-potosina.com and we'll take care of it right away.",
};

export function getCreditos(locale: Locale): CreditosContent {
  return locale === "en" ? EN : ES;
}
