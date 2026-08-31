import { prisma } from "@/lib/prisma";
import { TARIFAS_PROVEEDOR_BASE, escalonesDe, type TarifaProveedor } from "@/lib/admin/proveedor";

/**
 * Las tarifas del proveedor tal como las ve el panel.
 *
 * Mientras Manolo no haya guardado nada, devuelve las que dio el 31 ago 2026.
 * En cuanto guarda una vez, la tabla manda entera: si borró un recorrido, se
 * queda borrado aunque siga en el código.
 */
export async function leerTarifasProveedor(): Promise<TarifaProveedor[]> {
  const filas = await prisma.tarifaProveedor.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  if (filas.length === 0) return TARIFAS_PROVEEDOR_BASE;
  return filas.map(f => ({
    clave:    f.clave,
    tourSlug: f.tourSlug,
    variante: f.variante ?? "",
    nombre:   f.nombre,
    tarifas:  escalonesDe(f.tarifas),
  }));
}

/** Reemplaza la lista completa, en una transacción (ver `preciosExtras`). */
export async function guardarTarifasProveedor(lista: TarifaProveedor[]): Promise<TarifaProveedor[]> {
  const limpia = lista
    .map(t => ({
      clave:    String(t.clave ?? "").trim(),
      tourSlug: String(t.tourSlug ?? "").trim(),
      variante: String(t.variante ?? "").trim(),
      nombre:   String(t.nombre ?? "").trim(),
      tarifas:  escalonesDe(t.tarifas),
    }))
    .filter(t => t.clave && t.tourSlug && t.nombre)
    .filter((t, i, arr) => arr.findIndex(x => x.clave === t.clave) === i);

  await prisma.$transaction([
    prisma.tarifaProveedor.deleteMany({}),
    prisma.tarifaProveedor.createMany({
      data: limpia.map((t, i) => ({
        clave: t.clave, tourSlug: t.tourSlug, variante: t.variante || null,
        nombre: t.nombre, tarifas: t.tarifas as never, orden: i,
      })),
    }),
  ]);
  return limpia;
}
