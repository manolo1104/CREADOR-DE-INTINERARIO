/**
 * 🔴 Las reseñas del VIAJE CDMX–Xilitla. Nace VACÍO a propósito (15 oct 2026).
 *
 * Mientras esté vacío, la página no pinta ninguna cita. Se llena SOLO con
 * reseñas reales de gente que fue a este viaje, copiadas tal cual (mismas
 * reglas que `src/lib/resenasReales.ts`: ni inventadas, ni «basadas en», ni
 * corregidas, ni con foto de archivo).
 *
 * Cómo pegar una (Manolo): copia el bloque de ejemplo, quítale las dos barras
 * del principio de cada línea y cambia los datos.
 *
 *   // { autor: "Nombre como lo publicó", fecha: "Diciembre 2026", texto: "El texto, literal.", estrellas: 5, salida: "11–13 dic" },
 */
import type { ResenaReal } from "@/lib/resenasReales";

export interface ResenaViaje extends Omit<ResenaReal, "recorrido"> {
  /** De qué salida, como se ve en el calendario («11–13 dic»). */
  salida?: string;
}

export const RESENAS_VIAJE: ResenaViaje[] = [
];
