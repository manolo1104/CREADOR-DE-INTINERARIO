// El precio pactado de una reserva, como AJUSTE (lote 4 de la auditoría, 5 nov
// 2026, regla de Manolo).
//
// 🔴 Cuando el total de una reserva no cuadraba con la lista del panel —el
// precio fijado a mano en la cotización, lo que cobró la web, un trato con el
// cliente— se cargaba como «total editado», y ese total se BORRABA en cuanto
// alguien tocaba un renglón, aunque fuera solo la fecha: el total brincaba a
// la suma de lista y el saldo con él, sin que nadie lo viera hasta el día del
// tour. Ahora la diferencia vive como ajuste (pactado − calculado): sobrevive
// a la edición, se vuelve a aplicar sobre el precio nuevo y, si el total se
// mueve, se pregunta antes de guardar diciendo de cuánto a cuánto.
//
// Sin dependencias: lo usan el cuadro de la reserva y su lista.

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * El ajuste que explica un total: lo pactado menos lo que da la lista (ya con
 * el descuento). 0 si cuadran. Al abrir una reserva se saca del total
 * GUARDADO, que es el que manda: así guardarla sin cambios nunca lo mueve,
 * aunque la lista haya cambiado de precio desde que se vendió.
 */
export function ajusteDeTotal(totalPactado: number, calculado: number): number {
  return entero(totalPactado) - entero(calculado);
}

/** El total con el ajuste pactado encima de lo que da la lista. Nunca negativo. */
export function totalConAjuste(calculado: number, ajuste: number): number {
  return Math.max(0, entero(calculado) + entero(ajuste));
}

/**
 * La pregunta antes de guardar una reserva cuyo total cambió, o null si no
 * cambió. Cambiar solo la fecha, el guía o los datos del cliente no lo mueve.
 */
export function avisoCambioDeTotal(antes: number, despues: number): string | null {
  const a = entero(antes);
  const d = entero(despues);
  if (a === d) return null;
  const dif = d - a;
  return `⚠️ El total de la reserva cambia de ${pesos(a)} a ${pesos(d)} (${dif > 0 ? "+" : "−"}${pesos(Math.abs(dif))}).\n\n`
    + "¿Guardar con el total nuevo? Si solo cambiaste la fecha o algo que no es el precio, cancela y revisa los renglones.";
}

/** «+$450» / «−$450», para decir el ajuste en pantalla. */
export function textoAjuste(ajuste: number): string {
  const a = entero(ajuste);
  return `${a > 0 ? "+" : "−"}${pesos(Math.abs(a))}`;
}
