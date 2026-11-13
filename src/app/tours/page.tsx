// Español: la misma plantilla con su idioma como dato (13 nov 2026).
// Sin leer la petición, la página se guarda en caché (ISR) y se rehace cada 60 min.
import { Pagina, metadataPagina } from "./PaginaTours";

export const revalidate = 3600;

export function generateMetadata() { return metadataPagina("es"); }
export default function Page() { return <Pagina locale="es" />; }
