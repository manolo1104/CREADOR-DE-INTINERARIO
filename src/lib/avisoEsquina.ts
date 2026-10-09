"use client";

/**
 * Quién puede usar la esquina de abajo a la izquierda.
 *
 * 🔴 Por qué existe (9 oct 2026)
 *
 * En la ficha de un recorrido viven ya dos avisos que salen solos y aterrizan
 * en el MISMO sitio: `SocialProofToast` (por qué reservar con nosotros) y, desde
 * hoy, `ReservasRecientes` (quién reservó de verdad). Cada uno con su propio
 * reloj. En un teléfono de 390 px las dos cajas miden casi lo mismo que el
 * ancho de la pantalla: cuando los relojes coinciden, una tapa a la otra y lo
 * que se lee es un sándwich de texto.
 *
 * Esto es un semáforo de un solo carril, en memoria del módulo (vive mientras
 * viva la pestaña). Quien quiere aparecer pide turno; si está ocupado, no
 * aparece y vuelve a intentarlo en su siguiente ciclo. No hay cola ni espera:
 * un aviso que llega tarde ya no viene a cuento.
 *
 * No usa estado de React a propósito: los dos componentes son hermanos
 * montados por un Server Component y no comparten padre cliente, así que un
 * contexto obligaría a envolver la página entera para coordinar dos cajas.
 */

let ocupadaPor: string | null = null;

/**
 * ¿Puede este aviso ocupar la esquina? `true` si la toma; `false` si hay otro.
 * Idempotente: si ya la tenía, sigue siendo `true`.
 */
export function pedirEsquina(quien: string): boolean {
  if (ocupadaPor !== null && ocupadaPor !== quien) return false;
  ocupadaPor = quien;
  return true;
}

/** La suelta. Se llama al ocultar el aviso y al desmontar el componente. */
export function soltarEsquina(quien: string): void {
  if (ocupadaPor === quien) ocupadaPor = null;
}
