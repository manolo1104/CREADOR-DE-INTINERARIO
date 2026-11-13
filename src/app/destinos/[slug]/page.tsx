// Español: la misma plantilla con su idioma como dato (13 nov 2026).
// Sin leer la petición, la página se guarda en caché (ISR) y se rehace cada 60 min.
import { Pagina, metadataPagina, generateStaticParams } from "./PaginaDestino";

export { generateStaticParams };
export const revalidate = 3600;

type Props = { params: { slug: string } };
export function generateMetadata({ params }: Props) { return metadataPagina({ params }, "es"); }
export default function Page({ params }: Props) { return <Pagina params={params} locale="es" />; }
