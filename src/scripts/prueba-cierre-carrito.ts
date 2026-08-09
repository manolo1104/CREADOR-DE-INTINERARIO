/**
 * prueba-cierre-carrito.ts — prueba de regresión de `cerrarCarritosDe`.
 *
 * Uso:  npx tsx src/scripts/prueba-cierre-carrito.ts
 *       (sale con código 1 si algo falla)
 *
 * Protege contra el bug de ago 2026: las reservas hechas a mano desde el panel
 * (prefijo HP-M-) no cerraban el carrito abandonado, así que el cron seguía
 * escribiéndole "¿Apartamos tu lugar?" a clientes que ya habían pagado.
 *
 * CÓMO PRUEBA ESCRITURAS SIN BASE DE PRUEBA: el repo no tiene Docker, PGlite ni
 * framework de tests, así que crea carritos con correos `@test.invalid`
 * (dominio reservado por RFC 2606: no existe y no puede recibir correo), corre
 * el cierre y los borra al final. Todos los filtros van por esos correos
 * ficticios — nunca toca datos de clientes reales. Los carritos recién creados
 * tampoco son candidatos del cron, que exige `createdAt < hace 1 h`.
 *
 * Si lo interrumpes a media corrida, vuelve a ejecutarlo: limpia al arrancar.
 */
import { PrismaClient } from "@prisma/client";
import { cargarEnv } from "./_env";
cargarEnv();

import { cerrarCarritosDe, toursDeReserva } from "@/lib/cerrarCarrito";

const prisma = new PrismaClient();

const YO = "prueba-cierre@test.invalid";
const OTRO = "prueba-otro@test.invalid";

let fallas = 0;
function chk(ok: boolean, msg: string) {
  console.log(`  ${ok ? "✅" : "❌"} ${msg}`);
  if (!ok) fallas++;
}

// Payload realista del panel: lineItems[0] es _meta, luego 2 tours distintos.
const PAYLOAD = {
  tourSlug: "expedicion-tamul",
  tourDate: "2026-12-01",
  lineItems: [
    { _meta: true, metodoPago: "Transferencia", folioPago: "X", pickupLugar: "Hotel", numPersonas: 4 },
    { tourSlug: "expedicion-tamul", tourDate: "2026-12-01", adults: 2, subtotal: 3100 },
    { tourSlug: "rzr-xilitla",      tourDate: "2026-12-02", adults: 2, subtotal: 2500 },
  ],
};

async function limpiar() {
  await prisma.abandonedCart.deleteMany({ where: { customerEmail: { in: [YO, OTRO] } } });
}

function base(tourSlug: string, tourDate: string, email: string) {
  return {
    tourId: tourSlug, tourSlug, tourName: "PRUEBA " + tourSlug, tourDate,
    adults: 2, total: 1000, customerEmail: email, status: "open" as const,
  };
}

async function main() {
  await limpiar(); // por si una corrida anterior murió a medias

  console.log("\n1) toursDeReserva() sobre un payload del panel");
  const tours = toursDeReserva(PAYLOAD);
  chk(tours.length === 3, `extrae 3 entradas (principal + 2 líneas), obtuvo ${tours.length}`);
  chk(!tours.some((t) => (t as any)._meta), "descarta el objeto _meta");
  chk(tours.some((t) => t.tourSlug === "rzr-xilitla" && t.tourDate === "2026-12-02"),
      "conserva la 2a línea con SU propia fecha");

  console.log("\n2) Cierre con carritos desechables");
  await prisma.abandonedCart.createMany({
    data: [
      base("expedicion-tamul", "2026-12-01", YO),   // debe cerrarse
      base("rzr-xilitla",      "2026-12-02", YO),   // debe cerrarse (2a línea)
      base("expedicion-tamul", "2027-05-05", YO),   // MISMO tour, OTRA fecha → NO
      base("expedicion-tamul", "2026-12-01", OTRO), // otro cliente → NO
    ],
  });
  { const c = await prisma.abandonedCart.findFirst({ where: { customerEmail: YO, tourSlug: "rzr-xilitla" } });
    chk(c?.status === "open", "semilla creada en estado open"); }

  const cerrados = await cerrarCarritosDe(YO, tours);
  chk(cerrados === 2, `cierra exactamente 2 carritos, devolvió ${cerrados}`);

  const mios = await prisma.abandonedCart.findMany({ where: { customerEmail: YO } });
  const est = (slug: string, fecha: string) =>
    mios.find((c) => c.tourSlug === slug && c.tourDate === fecha)?.status;
  chk(est("expedicion-tamul", "2026-12-01") === "converted", "tour principal → converted");
  chk(est("rzr-xilitla", "2026-12-02") === "converted", "2a línea → converted");
  chk(est("expedicion-tamul", "2027-05-05") === "open", "misma tour, otra fecha → INTACTO");

  const otro = await prisma.abandonedCart.findFirst({ where: { customerEmail: OTRO } });
  chk(otro?.status === "open", "carrito de otro cliente → INTACTO");

  console.log("\n3) Casos límite (no deben tocar nada ni lanzar)");
  chk((await cerrarCarritosDe("", tours)) === 0, "correo vacío → 0");
  chk((await cerrarCarritosDe("sin-arroba", tours)) === 0, "correo inválido → 0");
  chk((await cerrarCarritosDe(null, tours)) === 0, "correo null → 0");
  chk((await cerrarCarritosDe(YO, [])) === 0, "sin tours → 0");
  chk((await cerrarCarritosDe(YO, [{ _meta: true } as any])) === 0, "solo _meta → 0");
  chk((await prisma.abandonedCart.count({ where: { customerEmail: OTRO, status: "open" } })) === 1,
      "el control sigue open tras los casos límite");

  console.log("\n4) Idempotencia");
  chk((await cerrarCarritosDe(YO, tours)) === 0, "segunda pasada no vuelve a cerrar nada");

  await limpiar();
  const quedan = await prisma.abandonedCart.count({ where: { customerEmail: { in: [YO, OTRO] } } });
  chk(quedan === 0, "filas de prueba borradas");

  console.log(fallas === 0 ? "\n🎉 TODO BIEN\n" : `\n💥 ${fallas} FALLA(S)\n`);
  process.exitCode = fallas === 0 ? 0 : 1;
}

main()
  .catch(async (e) => { console.error("Error:", e); await limpiar().catch(() => {}); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
