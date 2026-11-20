/**
 * unir-anticipo-confirmado.ts — «Anticipo pagado» se unió a Confirmado (19 nov 2026).
 *
 * Manolo: «combina la de anticipo pagado con el de confirmado (porque una vez
 * que pagan se confirma el tour)». Desde que se sube ese cambio el panel ya NO
 * escribe la etapa «anticipo» y la lee como Confirmado (`normalizarEtapa` en
 * `lib/admin/crm.ts`): esos leads ya se ven, se cuentan y se mueven como
 * Confirmado. Este script solo cambia el nombre guardado para dejar la base limpia.
 *
 * 🔴 Córrelo SOLO cuando el despliegue nuevo sea el único que atiende: mientras
 * Railway cambia de servidor, el viejo todavía puede escribir «anticipo» (un
 * pago de Stripe, por ejemplo). Repite el ensayo hasta que diga 0, también al
 * día siguiente.
 *
 * El ensayo imprime cuántos leads hay por etapa y cada lead en «anticipo» (su
 * id, el día en que entró, la fecha del viaje, su monto y lo cobrado de sus
 * reservas vivas; nunca nombres ni teléfonos) y una huella. Aparte enlista los
 * que no tienen dinero en ninguna reserva viva, para revisarlos a mano (pasan
 * igual: ya se ven como Confirmado). «--aplicar=<huella>» escribe EXACTAMENTE
 * esa lista, en una transacción junto con su renglón de bitácora (con cada id,
 * para poder deshacerlo).
 *
 * No toca el historial de etapas: las filas viejas que dicen «anticipo» son la
 * auditoría y el panel las lee como Confirmado. Tampoco usa `registrarEtapa`:
 * no hay un cambio de etapa real, solo de nombre (y así no salen renglones
 * «Confirmado → Confirmado» ni se disparan las reglas de cambio de etapa). La
 * fecha de «última modificación» de esos leads sí cambia; no afecta nada.
 * Idempotente: la segunda corrida no encuentra nada.
 *
 * Uso (desde la carpeta del repo):
 *   npx tsx src/scripts/unir-anticipo-confirmado.ts                     # ensayo
 *   npx tsx src/scripts/unir-anticipo-confirmado.ts --aplicar=<huella>  # escribe
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";
import { ETAPAS_LEGADO } from "../lib/admin/crm";
import { montoCobrado } from "../lib/admin/dinero";

cargarEnv();
const prisma = new PrismaClient();

/** La clave vieja y la etapa en que queda (la misma regla con que el panel ya la lee). */
const VIEJA = "anticipo";
const NUEVA = ETAPAS_LEGADO[VIEJA];

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const pesos = (n: number | null) => (n === null ? "sin monto" : `$${Math.round(n).toLocaleString("es-MX")}`);
const contar = (xs: { etapa: string }[]) => xs.reduce<Record<string, number>>((a, o) => { a[o.etapa] = (a[o.etapa] ?? 0) + 1; return a; }, {});

async function main() {
  const arg = process.argv.find(a => a === "--aplicar" || a.startsWith("--aplicar="));
  const aplicar = !!arg;
  const huellaPedida = arg?.split("=")[1] ?? "";
  console.log(describeBase());
  console.log(aplicar ? "MODO: aplicar (escribe en la base)" : "MODO: ensayo (no escribe nada)");
  if (NUEVA !== "confirmado") throw new Error(`«${VIEJA}» debería leerse como «confirmado» y crm.ts dice «${NUEVA}»: no se toca nada`);

  console.log("Leads por etapa (antes):", contar(await prisma.oportunidad.findMany({ select: { etapa: true } })));

  const leads = await prisma.oportunidad.findMany({
    where: { etapa: VIEJA },
    select: { id: true, createdAt: true, fechaViaje: true, monto: true },
    orderBy: { createdAt: "asc" },
  });
  if (!leads.length) { console.log(`\nNada que cambiar: ningún lead en «${VIEJA}».`); return; }

  // Lo cobrado de sus reservas vivas: solo para revisar, no cambia la lista.
  const reservas = await prisma.tourBooking.findMany({
    where: { oportunidadId: { in: leads.map(l => l.id) }, status: { not: "cancelled" } },
    select: { oportunidadId: true, totalAmount: true, depositoPagado: true, stripePaymentIntentId: true, createdAt: true },
  });
  const dineroDe = (id: string) => {
    const suyas = reservas.filter(r => r.oportunidadId === id);
    return { reservas: suyas.length, cobrado: suyas.reduce((t, r) => t + montoCobrado(r), 0), total: suyas.reduce((t, r) => t + r.totalAmount, 0) };
  };
  const linea = (l: (typeof leads)[number]) => {
    const d = dineroDe(l.id);
    const dinero = d.reservas ? `cobrado ${pesos(d.cobrado)} de ${pesos(d.total)} en ${d.reservas} reserva${d.reservas === 1 ? "" : "s"} viva${d.reservas === 1 ? "" : "s"}` : "sin reservas vivas";
    return `    ${l.id} · entró ${ymd(l.createdAt)} · viaje ${l.fechaViaje ?? "sin fecha"} · monto ${pesos(l.monto)} · ${dinero}`;
  };

  console.log(`\n→ Pasan de «${VIEJA}» a «${NUEVA}»: ${leads.length}`);
  for (const l of leads) console.log(linea(l));
  const sinDinero = leads.filter(l => dineroDe(l.id).cobrado <= 0);
  if (sinDinero.length) {
    console.log(`\n⚠️ Sin dinero en ninguna reserva viva: ${sinDinero.length}. Pasan igual (ya se ven como Confirmado), pero revísalos a mano:`);
    console.log("   ¿pagaron la liga y la reserva no se creó? ¿alguien los movió a mano? ¿falta registrar el cobro?");
    for (const l of sinDinero) console.log(linea(l));
  }

  const ids = leads.map(l => l.id).sort();
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

  await prisma.$transaction(async tx => {
    // Solo los que siguen en «anticipo»: si alguno cambió entre el ensayo y ahora, se aborta todo.
    const r = await tx.oportunidad.updateMany({ where: { id: { in: ids }, etapa: VIEJA }, data: { etapa: NUEVA } });
    if (r.count !== ids.length) throw new Error(`se esperaban ${ids.length} cambios y hubo ${r.count}: no se escribió nada, corre el ensayo otra vez`);
    await tx.bitacora.create({
      data: {
        usuario: "sistema", nombre: "Corrección de datos", rol: "sistema",
        accion: "modificó", entidad: "lead", referencia: "unir-anticipo-confirmado",
        resumen: `«Anticipo pagado» se unió a Confirmado: ${r.count} leads pasan de «${VIEJA}» a «${NUEVA}» (solo el nombre guardado; el historial de etapas no se toca)`,
        detalle: ids.map(id => ({ campo: `etapa ${id}`, antes: VIEJA, despues: NUEVA })),
      },
    });
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(`\nCambiados: ${ids.length}`);
  console.log("Leads por etapa (después):", contar(await prisma.oportunidad.findMany({ select: { etapa: true } })));
}

main()
  .catch(e => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
