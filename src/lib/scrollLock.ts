/**
 * Bloquea el scroll del fondo mientras hay algo abierto encima.
 *
 * Existe porque en el carrito hay VARIOS calendarios a la vez, uno por
 * recorrido. Cada uno ponía y quitaba `document.body.style.overflow` por su
 * cuenta, así que el que se desmontaba —al borrar un renglón, por ejemplo—
 * desbloqueaba el scroll aunque otro siguiera abierto, y el fondo se movía
 * debajo del modal.
 *
 * Con un contador solo libera el último, y se restaura el valor que hubiera
 * antes en vez de asumir que era vacío.
 */

let abiertos = 0;
let anterior = "";

export function bloquearScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  if (abiertos === 0) {
    anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  abiertos++;

  let liberado = false;
  return () => {
    // Idempotente: React puede llamar la limpieza de un efecto más de una vez
    // y no queremos que el contador se vaya a negativo.
    if (liberado) return;
    liberado = true;
    abiertos = Math.max(0, abiertos - 1);
    if (abiertos === 0) document.body.style.overflow = anterior;
  };
}
