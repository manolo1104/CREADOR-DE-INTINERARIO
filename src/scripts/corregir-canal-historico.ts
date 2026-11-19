/**
 * corregir-canal-historico.ts — «web» solo si la reserva nació de una compra en el sitio.
 *
 * v1 (3 nov 2026): Ventas decía Web 90 / WhatsApp 7, pero por el folio solo 16
 * se crearon en un pago de la web. Se creyó que el formulario dejaba «web» por
 * default hasta el 28 oct y se movían solo las de a mano de antes de esa fecha.
 *
 * v2 (19 nov 2026). El ensayo en producción dio web 115 = 17 del sitio + 65 de
 * antes del 28 oct + 33 sin explicar. La revisión del historial encontró por qué:
 *   - el botón viejo «Convertir a reserva» de Cotizaciones NO mandaba canal y la
 *     API guardaba «web» (hasta el 18 nov 22:06, merge 9254376);
 *   - antes del 28 oct el formulario venía en WhatsApp, así que «web» lo puso el
 *     botón de convertir o alguien que eligió «Web (pagó en línea)» para una venta
 *     cobrada con liga o tarjeta (eso es el método de pago, no el canal).
 * Ninguna compra del sitio crea folios HP-M- (panel: a mano o al convertir) ni
 * HP-P (bot de agosto), así que la regla ya no lleva fecha:
 *   - folio web (HP + base36) con pago de Stripe          → se queda «web»;
 *   - folio web SIN pago de Stripe                        → se LISTA para revisarla
 *     a mano (cotizaciones del bot viejo de may–oct, o compras de antes del 28 may);
 *     no se toca;
 *   - folio del panel (HP-M-) o del bot de agosto (HP-P) con «web» → «por_confirmar»;
 *   - cualquier origen distinto de «web» → se respeta (alguien ya lo eligió).
 *
 * El ensayo imprime cada folio (folio, fecha, estado y tour; nunca nombres ni
 * teléfonos) y una huella. «--aplicar=<huella>» escribe EXACTAMENTE esa lista,
 * en una transacción junto con su renglón de bitácora (con los folios, para
 * poder deshacerlo). Idempotente: la segunda corrida no encuentra nada.
 *
 * Uso (desde la carpeta del repo):
 *   npx tsx src/scripts/corregir-canal-historico.ts                     # ensayo
 *   npx tsx src/scripts/corregir-canal-historico.ts --aplicar=<huella>  # escribe
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";
import { tipoFolio } from "../lib/admin/folio";
import { ORIGEN_POR_CONFIRMAR } from "../lib/origenReserva";

cargarEnv();
const prisma = new PrismaClient();

/** «Nueva reserva» obliga a elegir el canal desde el push de da3c4ae. Solo para explicar el motivo. */
const FORMULARIO_OBLIGA_DESDE = new Date("2026-10-28T16:51:00-06:00");
/** Desde aquí el sitio guarda el PaymentIntent de cada compra (81e7105). */
const SITIO_GUARDA_PAGO_DESDE = new Date("2026-05-28T00:00:00-06:00");
const NO_CUENTAN = ["cancelled", "borrador"];

interface Fila {
  id: string; confirmationNumber: string; origen: string; createdAt: Date; status: string; tourSlug: string;
  stripePaymentIntentId: string | null; cotizacionId: string | null; lineItems: unknown;
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const contar = (xs: { origen: string }[]) => xs.reduce<Record<string, number>>((a, r) => { a[r.origen] = (a[r.origen] ?? 0) + 1; return a; }, {});
const vivas = (xs: Fila[]) => xs.filter(r => !NO_CUENTAN.includes(r.status));
/** El botón viejo de Cotizaciones dejaba el folio de la cotización en un renglón (`cotizacionOrigen`). */
const vieneDeCotizacion = (lineItems: unknown) =>
  Array.isArray(lineItems) && lineItems.some(x => !!x && typeof x === "object" && !!(x as Record<string, unknown>).cotizacionOrigen);

function motivo(r: Fila): string {
  if (tipoFolio(r.confirmationNumber) === "cotizacion") return "folio del bot de agosto (HP-P)";
  if (r.cotizacionId) return "conversión nueva (desde el 18 nov): alguien eligió «Web»";
  if (vieneDeCotizacion(r.lineItems)) return "botón viejo «Convertir a reserva» (no pedía canal)";
  if (r.createdAt < FORMULARIO_OBLIGA_DESDE) return "capturada a mano antes del 28 oct";
  return "capturada a mano: alguien eligió «Web (pagó en línea)»";
}

async function main() {
  const arg = process.argv.find(a => a === "--aplicar" || a.startsWith("--aplicar="));
  const aplicar = !!arg;
  const huellaPedida = arg?.split("=")[1] ?? "";
  console.log(describeBase());
  console.log(aplicar ? "MODO: aplicar (escribe en la base)" : "MODO: ensayo (no escribe nada)");

  const reservas: Fila[] = await prisma.tourBooking.findMany({
    select: { id: true, confirmationNumber: true, origen: true, createdAt: true, status: true, tourSlug: true, stripePaymentIntentId: true, cotizacionId: true, lineItems: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("Antes (todas):", contar(reservas), "· sin canceladas ni borradores:", contar(vivas(reservas)));

  const web = reservas.filter(r => r.origen === "web");
  const delSitio = web.filter(r => tipoFolio(r.confirmationNumber) === "web" && !!r.stripePaymentIntentId);
  const sinPago = web.filter(r => tipoFolio(r.confirmationNumber) === "web" && !r.stripePaymentIntentId);
  const raros = web.filter(r => tipoFolio(r.confirmationNumber) === "otro");
  const mover = web.filter(r => ["manual", "cotizacion"].includes(tipoFolio(r.confirmationNumber)));

  const linea = (r: Fila, extra = "") => `    ${r.confirmationNumber} · ${ymd(r.createdAt)} · ${r.status} · ${r.tourSlug}${extra}`;
  console.log(`\n✅ Se quedan «web» (compra en el sitio con pago de Stripe): ${delSitio.length} (vivas ${vivas(delSitio).length})`);
  if (sinPago.length) {
    console.log(`\n⚠️ Folio de la web SIN pago de Stripe — NO se tocan, revisar a mano: ${sinPago.length}`);
    for (const r of sinPago) console.log(linea(r, r.createdAt < SITIO_GUARDA_PAGO_DESDE ? " · antes de que el sitio guardara el pago" : " · ¿cotización del bot viejo?"));
  }
  if (raros.length) {
    console.log(`\n⚠️ Folios que no reconozco — NO se tocan: ${raros.length}`);
    for (const r of raros) console.log(linea(r));
  }

  const grupos = new Map<string, Fila[]>();
  for (const r of mover) grupos.set(motivo(r), [...(grupos.get(motivo(r)) ?? []), r]);
  console.log(`\n→ Pasan a «por confirmar»: ${mover.length} (vivas ${vivas(mover).length})`);
  for (const [m, xs] of Array.from(grupos)) {
    console.log(`\n  ${m}: ${xs.length} (vivas ${vivas(xs).length})`);
    for (const r of xs) console.log(linea(r));
  }

  if (!mover.length) { console.log("\nNada que cambiar."); return; }
  const ids = mover.map(r => r.id).sort();
  const huella = createHash("sha256").update(ids.join(",")).digest("hex").slice(0, 8);
  if (!aplicar) {
    console.log(`\nHuella de esta lista: ${huella}`);
    console.log(`Ensayo terminado. Para escribir EXACTAMENTE esta lista: el mismo comando con --aplicar=${huella} al final.`);
    return;
  }
  if (huellaPedida !== huella) {
    console.log(`\n❌ No escribí nada: la lista de hoy tiene la huella ${huella} y pediste «${huellaPedida || "sin huella"}». Corre el ensayo otra vez y revísalo.`);
    process.exitCode = 1;
    return;
  }

  const folios = mover.map(r => r.confirmationNumber);
  await prisma.$transaction(async tx => {
    // Solo las que siguen en «web»: si alguien eligió un canal entre el ensayo y ahora, se aborta todo.
    const r = await tx.tourBooking.updateMany({ where: { id: { in: ids }, origen: "web" }, data: { origen: ORIGEN_POR_CONFIRMAR } });
    if (r.count !== ids.length) throw new Error(`se esperaban ${ids.length} cambios y hubo ${r.count}: no se escribió nada, corre el ensayo otra vez`);
    await tx.bitacora.create({
      data: {
        usuario: "sistema", nombre: "Corrección de datos", rol: "sistema",
        accion: "modificó", entidad: "reserva", referencia: "corregir-canal-historico",
        resumen: `Canal corregido: ${r.count} reservas hechas en el panel (a mano o desde una cotización) pasan de «web» a «por confirmar»; «web» queda solo para las compras en el sitio`,
        detalle: folios.map(f => ({ campo: `origen ${f}`, antes: "web", despues: ORIGEN_POR_CONFIRMAR })),
      },
    });
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(`\nCambiadas: ${folios.length}`);
  console.log("Después (todas):", contar(await prisma.tourBooking.findMany({ select: { origen: true } })));
}

main()
  .catch(e => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
