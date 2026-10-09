/**
 * Los números del cupo que también necesita el NAVEGADOR.
 *
 * 🔴 Por qué están aquí y no en `cupoTour.ts`
 *
 * `cupoTour.ts` importa `prisma`: es solo servidor. Un componente cliente puede
 * traerse de ahí el *tipo* `EstadoDia` —los tipos se borran al compilar— pero
 * no un valor: eso arrastraría el módulo entero, y con él Prisma, al bundle del
 * navegador. Es el mismo motivo por el que `lib/anclas.ts` existe aparte.
 *
 * Así que el número vive aquí, sin una sola importación, y `cupoTour.ts` lo
 * toma de este archivo. Una sola fuente: si el cupo cambia, cambia en los dos
 * lados a la vez.
 */

/**
 * Desde cuántos lugares libres un día se considera «casi lleno».
 *
 * Con el cupo de 12 son las 9 a 11 personas que pidió Manolo el 7 oct 2026; en
 * un recorrido de grupo chico (la Gruta de Xilo sale con 8) se pone rojo cuando
 * quedan 3, que es lo mismo dicho en lugares. El calendario lo pinta y el aviso
 * junto a la fecha lo dice con palabras.
 */
export const LIBRES_CASI_LLENO = 3;
