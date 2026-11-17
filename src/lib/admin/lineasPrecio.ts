/**
 * El precio de cada renglón de una cotización o reserva (recorridos, add-ons y
 * hospedaje). Salieron de `components/admin/ReservaModal.tsx` el 16 nov 2026,
 * sin cambiar una línea, para que el servidor arme el MISMO PDF de cotización
 * y de confirmación que descarga el panel (el bot lo manda por WhatsApp). Un
 * módulo «use client» no se puede llamar desde una ruta del servidor.
 */
import { FACTOR_NINO, FACTOR_NINO_ANTERIOR } from "@/lib/ninos";
import type { LineItem, PackageItem } from "@/components/admin/ReservaModal";
import { TOURS_LISTA, precioGrupo, precioPorCabeza, cargoVallesDe, extraDeEleccion } from "@/lib/tours";
import { ID_TRASLADO_VALLES } from "@/lib/tourPricing";
import { esConceptoSinTour, importeDeConcepto, importeHabitacion } from "@/lib/admin/reservaEdicion";

/**
 * Un concepto que NO está en el catálogo: un recorrido nuevo, una salida a
 * medida, un servicio que todavía no tiene ficha. Lleva su propio nombre y su
 * propio precio por persona, y por lo demás se comporta como cualquier otra
 * línea (fecha, adultos, niños, subtotal).
 *
 * Se guarda como un `tourSlug` reservado en vez de un campo nuevo: así viaja
 * intacto por el correo, el PDF, la ficha y la conversión a reserva, que ya
 * saben leer líneas por su nombre y su subtotal. Los dos guiones bajos lo
 * ponen fuera del alcance de cualquier slug real del catálogo.
 */
export const SLUG_PERSONALIZADO = "__personalizado";

/** ¿Esta línea es un concepto escrito a mano? */
export function esLineaPersonalizada(slug?: string): boolean {
  return slug === SLUG_PERSONALIZADO;
}

/** Las actividades opcionales que ofrece ese recorrido, según el catálogo. */
export function addOnsDeTour(slug: string) {
  return TOURS_LISTA.find(t => t.slug === slug)?.addOns ?? [];
}

/** Cuánta gente lleva contratada esa actividad en esta línea. */
export function cantidadAddOn(l: Pick<LineItem, "addOns">, id: string): number {
  return Math.max(0, l.addOns?.find(a => a.id === id)?.cantidad ?? 0);
}

/**
 * Lo que suman las actividades opcionales de una línea.
 *
 * El precio se toma del CATÁLOGO, nunca del objeto guardado: si mañana el
 * Salto sube a $400, una cotización nueva lo cobra a $400 aunque el formulario
 * traiga el número viejo pegado.
 */
export function calcAddOnsLinea(l: LineItem): number {
  // El traslado desde Ciudad Valles no es un add-on del catálogo: es el
  // `cargoValles` del recorrido (Ruta Surrealista, $400 POR RESERVA). Lo traen
  // las reservas web de Valles y lo pone «Nueva cotización» al elegir Valles.
  const valles = (l.addOns ?? []).some(a => a.id === ID_TRASLADO_VALLES)
    ? cargoVallesDe(TOURS_LISTA.find(t => t.slug === l.tourSlug))
    : 0;
  const cat = addOnsDeTour(l.tourSlug);
  if (!cat.length) return valles;
  return valles + (l.addOns ?? []).reduce((s, a) => {
    const def = cat.find(x => x.id === a.id);
    return def ? s + def.precio * Math.max(0, a.cantidad || 0) : s;
  }, 0);
}

export function calcTourLine(l: LineItem): number {
  // Concepto de la web sin recorrido (el traslado desde otra ciudad): no hay
  // lista que lo recalcule, vale lo que se cobró (lote 5, 5 nov 2026).
  if (!l.tourSlug) return esConceptoSinTour(l) ? importeDeConcepto(l) : 0;
  // Concepto escrito a mano: manda el precio por persona que se tecleó, con el
  // MISMO descuento de menores que cualquier recorrido del catálogo (de 4 a 7
  // años el 50 %, bebés de 0 a 3 gratis; `ninos.ts`). Una regla distinta aquí
  // obligaría a acordarse de cuál aplica en cada renglón.
  if (esLineaPersonalizada(l.tourSlug)) {
    const p = Math.max(0, Number(l.precioPersona) || 0);
    return p * Math.max(0, l.adults || 0)
         + Math.round(p * FACTOR_NINO_ANTERIOR) * (l.childrenMid   ?? 0)
         + Math.round(p * FACTOR_NINO) * (l.childrenSmall ?? 0);
  }
  const t = TOURS_LISTA.find(t => t.slug === l.tourSlug);
  if (!t) return 0;
  // Los que pagan deciden el escalón; en la tarifa del GRUPO (Edén) cuentan todos,
  // bebés incluidos, porque ocupan lugar y ahí no hay tramo de menor.
  const pagan    = (l.adults || 0) + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0);
  const personas = pagan + (l.infants ?? 0);
  // 🔴 Tarifa del GRUPO completo (el Edén): una sola cifra para todos. Faltaba,
  // y el panel cotizaba un Edén de 4 en $11,960 ($2,990 × 4) cuando la web lo
  // cobra en $3,480 — el escalón de cuatro.
  const delGrupo = precioGrupo(t, personas);
  if (delGrupo !== null) return delGrupo + calcAddOnsLinea(l);
  // Lo que paga cada cabeza: el precio de lista menos el escalón que le toque
  // al tamaño del grupo (`escalaPersona`). Sin escalera, el precio de siempre.
  // El extra de la opción elegida (Ruta Acuática → Tamasopo, +$150) va dentro
  // del precio por cabeza, igual que en la web (`totalRecorrido`): los menores
  // pagan su 50 % también de él.
  const porCabeza = precioPorCabeza(t, pagan) + extraDeEleccion(t, l.eleccion);
  // Tours por vehículo (RZR): la matriz flota×ruta manda; los niños no cambian el precio.
  const base = (t.precioUnidad === "vehiculo" && t.rutas && t.flota)
    ? (() => {
        const rutaIdx  = Math.max(0, t.rutas!.findIndex(r => r.nombre === l.ruta));
        const veh      = t.flota!.find(v => v.nombre === l.vehiculo) ?? t.flota![0];
        const unidades = Math.max(1, l.unidades ?? 1);
        return (veh?.precios[rutaIdx] ?? t.precio) * unidades;
      })()
    : (
        porCabeza * l.adults +
        Math.round(porCabeza * FACTOR_NINO_ANTERIOR) * (l.childrenMid   ?? 0) +
        Math.round(porCabeza * FACTOR_NINO) * (l.childrenSmall ?? 0)
      );
  return base + calcAddOnsLinea(l);
}

export function calcPackageLine(p: PackageItem): number {
  // Nunca NaN (lote 5, 5 nov 2026): la habitación de la web llega sin precio
  // por noche y el total viajaba como null («Error interno» al guardar).
  return importeHabitacion(p);
}
