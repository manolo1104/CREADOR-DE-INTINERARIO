/**
 * Baja un archivo del servidor con su nombre (27 nov 2026, PDF del panel).
 * Un enlace con `download` funciona igual en computadora y en el celular
 * (en iPhone abre la vista previa con «Compartir → Guardar en Archivos»).
 */
export function descargarArchivo(url: string, nombre: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
