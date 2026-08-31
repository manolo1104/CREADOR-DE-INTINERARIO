import { prisma } from "@/lib/prisma";
import { EXTRAS_PRESET, normalizarPreset, type PresetExtra } from "@/lib/admin/extras";

/**
 * La lista de conceptos con sus precios, tal como la ve el panel.
 *
 * Mientras Manolo no haya guardado nada, devuelve el arranque de
 * `EXTRAS_PRESET`. En cuanto guarda una vez, la tabla manda entera: si borró un
 * concepto, se queda borrado —no reaparece porque siga en el código—.
 */
export async function leerPreciosExtras(): Promise<PresetExtra[]> {
  const filas = await prisma.precioExtra.findMany({ orderBy: [{ orden: "asc" }, { concepto: "asc" }] });
  if (filas.length === 0) return EXTRAS_PRESET;
  return filas.map(f => normalizarPreset({
    concepto:   f.concepto,
    detalle:    f.detalle ?? "",
    precio:     f.precio,
    costo:      f.costo,
    porPersona: f.porPersona,
  }));
}

/**
 * Reemplaza la lista completa. Va en una transacción a propósito: si el borrado
 * pasara y el alta fallara, Manolo se quedaría sin ningún precio y sin saberlo.
 */
export async function guardarPreciosExtras(lista: PresetExtra[]): Promise<PresetExtra[]> {
  const limpia = lista
    .map(normalizarPreset)
    .filter(p => p.concepto !== "")
    // Un mismo concepto dos veces reventaría la llave primaria: gana el primero.
    .filter((p, i, arr) => arr.findIndex(x => x.concepto === p.concepto) === i);

  await prisma.$transaction([
    prisma.precioExtra.deleteMany({}),
    prisma.precioExtra.createMany({
      data: limpia.map((p, i) => ({
        concepto:   p.concepto,
        detalle:    p.detalle || null,
        precio:     p.precio,
        costo:      p.costo,
        porPersona: p.porPersona,
        orden:      i,
      })),
    }),
  ]);

  return limpia;
}
