/**
 * Las redacciones que la IA del recomendador escribió de verdad (11 oct 2026).
 *
 * 🔴 Por qué existe: `/api/recomendar-tour/enviar` manda por correo el plan que
 * la persona ya vio, y la redacción le llegaba DEL NAVEGADOR. Cualquiera podía
 * llamar a esa ruta con el correo de otra persona y su propio texto («Tu lugar
 * vence en 2 h, paga aquí: …»), y el correo salía firmado por nosotros.
 *
 * Ahora la ruta que calcula el plan apunta aquí cada redacción de la IA, y la
 * de enviar solo acepta una que esté en la lista; si no, el correo abre con la
 * frase de respaldo. Vive en memoria a propósito: Railway corre UN proceso
 * largo, y si un deploy borra la lista lo peor que pasa es que ese correo use
 * la frase de respaldo.
 */

const VIGENCIA_MS = 6 * 60 * 60 * 1000;
const MAXIMO = 500;

const emitidas = new Map<string, number>();

/** Misma forma en los dos lados: sin saltos ni espacios dobles. */
export function normalizarRazon(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

export function recordarRazon(texto: string | null | undefined): void {
  const r = normalizarRazon(texto);
  if (!r) return;
  const ahora = Date.now();
  for (const [k, vence] of Array.from(emitidas)) {
    if (vence < ahora) emitidas.delete(k);
  }
  // Tope duro por si alguien martillea la ruta: se va la más vieja.
  while (emitidas.size >= MAXIMO) {
    const primera = emitidas.keys().next().value;
    if (primera === undefined) break;
    emitidas.delete(primera);
  }
  emitidas.set(r, ahora + VIGENCIA_MS);
}

/** La redacción tal cual la escribió la IA, o null si no salió de aquí. */
export function razonEmitida(v: unknown): string | null {
  const r = normalizarRazon(v);
  if (!r) return null;
  const vence = emitidas.get(r);
  return vence && vence >= Date.now() ? r : null;
}
