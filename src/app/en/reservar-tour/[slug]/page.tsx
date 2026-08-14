// Versión en inglés del adaptador de /reservar-tour/<slug>. Existe para que un
// link en inglés —de un correo o del bot— no cruce al flujo en español a medio
// camino: la plantilla lee el locale del header y reencamina a /en/reservar/carrito.
export { default, dynamic } from "../../../reservar-tour/[slug]/page";
