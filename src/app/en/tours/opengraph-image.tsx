// La imagen OG generada vive en el segmento /tours y NO se hereda en /en/tours
// (son segmentos distintos), así que /en/tours se quedaba sin preview. Se reusa
// la misma imagen en vez de duplicar el diseño.
export { default, runtime, alt, size, contentType } from "../../tours/opengraph-image";
