/**
 * Lenguaje visual de las guías nuevas de búsqueda (10 nov 2026):
 * /donde-hospedarse-en-la-huasteca-potosina y /cascadas-de-la-huasteca-potosina,
 * con sus gemelas en inglés.
 *
 * Son las mismas clases que /info-practica (fondo crema, Cormorant en los
 * títulos, cajas blancas, píldora dorada para la acción principal): una guía
 * que se ve igual que la otra se lee como parte del mismo sitio. Viven aquí y
 * no copiadas en cada página para que las dos no se desparejen.
 */
export const H2 = "font-cormorant font-light leading-[1.1] text-verde-profundo";
export const H2_SIZE = { fontSize: "clamp(28px,3.4vw,42px)" } as const;
export const H1_SIZE = { fontSize: "clamp(38px,5.2vw,64px)" } as const;
export const PARRAFO = "font-dm text-[15px] leading-relaxed text-negro/70 sm:text-base";
export const ENLACE =
  "text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota";
export const PILDORA_DORADA =
  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-dorado px-6 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]";
export const PILDORA_LINEA =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-verde-selva px-5 font-dm text-sm font-medium text-verde-selva transition-colors hover:bg-verde-selva/10";
export const PILDORA_WHATSAPP =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#25D366] px-5 font-dm text-sm font-medium text-[#128C4A] transition-colors hover:bg-[#25D366]/10";
export const CAJA = "rounded-2xl bg-white p-6 sm:p-7";
export const ETIQUETA = "font-dm text-[13px] font-medium text-dorado";
export const SECCION = "border-t border-negro/10 py-14 sm:py-20";
export const CONTENEDOR = "mx-auto max-w-4xl px-4 sm:px-6";
/** La tabla se desliza DENTRO de su caja en el teléfono: la página nunca se sale de ancho. */
export const TABLA_CAJA = "overflow-x-auto rounded-2xl bg-white px-4 py-2 sm:px-7";
/** Sin ancho mínimo: cada tabla pone el suyo (`min-w-[…]`) según cuántas columnas trae. */
export const TABLA = "w-full border-collapse font-dm text-sm";
export const TH = "py-3 pr-4 text-left align-bottom font-medium text-verde-profundo last:pr-0";
export const TD = "py-3 pr-4 align-top text-negro/70 last:pr-0";
