// Criterio único de a quién se le escribe por un carrito abandonado.
//
// Vive aparte del cron a propósito: aquí `push` es producción directa, así que
// el script de verificación (`src/scripts/verificar-seguimiento.ts`) importa
// ESTAS funciones y no una copia. Si el filtro se toca, la verificación en seco
// se entera; una copia pegada a mano se desincronizaría en silencio.

// Relativo por consistencia con el resto de `src/scripts/`, que importa así.
// (`tsx` sí resuelve el alias `@/` vía tsconfig; ambos estilos funcionan.)
import { minBookingDate } from "./tourBooking";

/** Estados a los que el sistema todavía les escribe.
 *
 *  `recovered` está aquí por una razón histórica: hasta el 7 ago 2026, abrir el
 *  link del correo marcaba el carrito como "recovered" y el cron solo miraba
 *  "open" — o sea que el cliente MÁS interesado quedaba excluido del resto de
 *  la secuencia. Ya nada escribe ese estado, pero los carritos que quedaron
 *  atrapados ahí siguen siendo vendibles y deben recibir sus recordatorios. */
export const ESTADOS_VIVOS = ["open", "recovered"] as const;

/** "Lo lleva Manolo a mano": excluido de TODO envío automático.
 *  No está en ESTADOS_VIVOS, así que la exclusión es por construcción y no
 *  depende de que alguien se acuerde de agregar un `if` dentro del cron. */
export const ESTADO_MANUAL = "manual";

export const MAX_RECORDATORIOS = 3;
export const DIAS_VIGENCIA = 14;

/** Primera fecha para la que todavía tiene sentido recordar: mañana en zona MX.
 *  Reutiliza el mismo umbral que la página de reserva, para que el cron nunca
 *  invite a comprar algo que el sitio ya no deja comprar. */
export function minFechaTour(): string {
  return minBookingDate();
}

/** `tourDate` es String ISO (`YYYY-MM-DD`) en el esquema, no DateTime: la
 *  comparación lexicográfica de Prisma es exacta para este formato. */
export function filtroFechaPasada(minFecha: string) {
  return {
    status:   { in: [...ESTADOS_VIVOS] },
    tourDate: { lt: minFecha },
  };
}

/** Carritos tan viejos que ya no vale la pena insistir, sin importar la fecha. */
export function filtroDemasiadoViejos(limite: Date) {
  return {
    status:    { in: [...ESTADOS_VIVOS] },
    createdAt: { lt: limite },
  };
}

/** Candidatos a recibir el siguiente recordatorio. */
export function filtroPendientes(minFecha: string, creadoAntesDe: Date) {
  return {
    status:     { in: [...ESTADOS_VIVOS] },
    emailsSent: { lt: MAX_RECORDATORIOS },
    createdAt:  { lt: creadoAntesDe },
    tourDate:   { gte: minFecha },
  };
}
