// Qué puede TOCAR quien entró, no sólo qué ve.
//
// Vivía dentro de `FinanzasClient.tsx`; se sacó a su propio archivo cuando las
// siete pestañas se volvieron una sola pantalla, para que cada bloque lo importe
// sin arrastrar la pantalla entera.
export interface Permisos {
  gastoGeneral: boolean;
  anular: boolean;
  cerrarCorte: boolean;
  socios: boolean;
  /** Dar por recibido el efectivo que trae quien cobró. */
  entregaEfectivo: boolean;
}
