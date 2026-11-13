import { ContenidoNoEncontrada } from "@/components/ContenidoNoEncontrada";

// El título no puede depender del locale: `metadata` es estático y no ve el
// header de la petición. Se deja bilingüe para que la pestaña sirva en los dos
// idiomas sin forzar un `generateMetadata` dinámico en una página de error.
//
// La DESCRIPCIÓN sí sale en el idioma correcto: la hereda del `generateMetadata`
// del layout, que sí lee el locale. Hasta el 14 ago ese respaldo estaba escrito
// en español fijo, así que un 404 bajo /en se describía en español.
export const metadata = {
  title: "Page not found — Página no encontrada | Huasteca Potosina",
};

export default function NotFound() {
  return <ContenidoNoEncontrada />;
}
