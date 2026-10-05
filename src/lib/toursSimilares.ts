import { TOURS_DB, recogidaDeTour, rankTour, type Tour } from "./tours";

/**
 * Los `n` recorridos que más se parecen a `base`, del catálogo público.
 *
 * Nació en la ficha de tour (la sección "otros recorridos") y se mudó aquí el
 * 2 oct 2026 para que el comparador sugiera EXACTAMENTE los mismos: si cada
 * pantalla tuviera su regla, la ficha diría "parecidos: A y B" y el
 * comparador, al abrirlo desde esa misma ficha, "C y D".
 *
 * 🔴 Eran siempre los dos primeros del catálogo (el RZR y el Rappel), en
 * cualquier ficha: al buceo de Rioverde le sugería manejar un RZR en
 * Xilitla. Ahora van primero los que recogen igual —o también salen de
 * Xilitla— y los de la misma familia; a igualdad, los que más se venden.
 * ⚠️ El buceo es el único `en-sitio`: "recoger igual" no le deja a nadie,
 * y con solo la categoría volvían a ganar el RZR y la Gruta. Su base
 * natural es Ciudad Valles (a unas 2 h de la laguna), así que para él
 * cuentan como misma salida los que recogen en Valles.
 *
 * `excluir`: slugs que no deben salir (la ficha quita el combo recomendado,
 * que ya se enseña aparte).
 */
export function toursSimilares(base: Tour, n: number, excluir: readonly string[] = []): Tour[] {
  const recActual = recogidaDeTour(base).tipo;
  const deXilitla = (tipo: string) => tipo === "hospedaje-xilitla" || tipo === "base-xilitla";
  const afinidad = (tr: Tour) => {
    const tipo = recogidaDeTour(tr).tipo;
    const mismaSalida = recActual === "en-sitio"
      ? tipo === "hospedaje"
      : tipo === recActual || (deXilitla(tipo) && deXilitla(recActual));
    return (mismaSalida ? 2 : 0) + (tr.categoria === base.categoria ? 1 : 0);
  };
  return TOURS_DB
    .map((tr, i) => ({ tr, i }))
    .filter(({ tr }) => tr.slug !== base.slug && !excluir.includes(tr.slug))
    .sort((a, b) => afinidad(b.tr) - afinidad(a.tr) || rankTour(a.tr.slug) - rankTour(b.tr.slug) || a.i - b.i)
    .slice(0, n)
    .map(({ tr }) => tr);
}
