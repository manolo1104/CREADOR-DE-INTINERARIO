// Versión en inglés de la página de tour. Reutiliza la MISMA plantilla; el locale
// ("en") lo resuelve el root layout/plantilla vía el header x-locale del middleware.
export { default, generateMetadata, generateStaticParams } from "../../../tours/[slug]/page";

// Los precios de la promo de temporada baja se apagan solos al terminar (ver
// `TOURS_DB` en lib/tours.ts); esta página estática se regenera cada hora para
// que lo que anuncia no se quede congelado desde el último despliegue.
export const revalidate = 3600;
