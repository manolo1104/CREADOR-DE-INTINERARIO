// Versión en inglés de la ficha de paquete (itinerario día por día).
export { default, generateMetadata, generateStaticParams } from "../../../paquetes/[slug]/page";

// Los precios de la promo de temporada baja se apagan solos al terminar (ver
// `TOURS_DB` en lib/tours.ts); esta página estática se regenera cada hora para
// que lo que anuncia no se quede congelado desde el último despliegue.
export const revalidate = 3600;
