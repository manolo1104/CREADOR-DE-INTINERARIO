/**
 * sembrar-crm.ts — el pipeline de Leads arranca con lo que ya está vivo (Fase 2, 3 nov 2026).
 *
 * No se importa la historia completa (236 cotizaciones desde mayo): solo lo que
 * todavía se puede ganar u operar, para que el pipeline sea útil desde el día 1.
 *   - Cotización ENVIADA sin lead           → lead en «Cotizado»
 *   - Borrador de los últimos 30 días       → lead en «Calificado» (o «Nuevo» si le faltan datos)
 *   - Reserva con tour de hoy en adelante   → lead en «Confirmado» si ya pagó algo; si no, «En seguimiento»
 * Una persona con varias cosas (cotización y luego reserva) queda en UN lead.
 * El canal de lo importado es «por confirmar» salvo en reservas, que ya lo traen.
 *
 * Uso (desde la carpeta del repo):
 *   npx tsx src/scripts/sembrar-crm.ts            # ensayo: solo cuenta
 *   npx tsx src/scripts/sembrar-crm.ts --aplicar  # escribe
 * Idempotente: lo ya enlazado a un lead se salta.
 */
import { PrismaClient } from "@prisma/client";
import { cargarEnv, describeBase } from "./_env";
import { normalizarTelefono, subirA, etapaPorCobro, etapaPorReglas, type Etapa } from "../lib/admin/crm";
import { montoCobrado } from "../lib/admin/dinero";
import { diasDeTourDe } from "../lib/admin/salidas";
import { lineasDe } from "../lib/admin/reserva";

cargarEnv();
const prisma = new PrismaClient();
const POR = "Importación inicial";
const ABIERTAS = ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"];
const hoyMX = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
const esFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const toursDe = (x: { tourSlug: string; lineItems?: unknown }) => {
  const s = lineasDe(x as never).map(l => l.tourSlug).filter((v): v is string => !!v);
  return Array.from(new Set(s.length ? s : [x.tourSlug].filter(Boolean)));
};

interface Plan { clave: string; nombre: string; telefono: string | null; correo: string | null; etapa: Etapa; canal: string; tours: string[]; fechaViaje: string | null; pax: number | null; monto: number; cotizaciones: string[]; reservas: string[]; origen: string[] }

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(describeBase());
  console.log(aplicar ? "MODO: aplicar (escribe en la base)" : "MODO: ensayo (no escribe nada)");
  const hoy = hoyMX();
  const hace30 = new Date(Date.now() - 30 * 86400000);

  const [cotizaciones, reservas] = await Promise.all([
    prisma.tourQuote.findMany({ where: { oportunidadId: null, OR: [{ status: "enviada" }, { status: "borrador", createdAt: { gte: hace30 } }] }, orderBy: { createdAt: "asc" } }),
    prisma.tourBooking.findMany({ where: { oportunidadId: null, status: { not: "cancelled" } }, orderBy: { createdAt: "asc" } }),
  ]);
  const futuras = reservas.filter(r => (diasDeTourDe(r).map(d => d.fecha).sort().at(-1) ?? "") >= hoy);

  const planes = new Map<string, Plan>();
  const claveDe = (tel: string | null, correo: string | null, nombre: string, id: string) => tel ?? (correo ? `correo:${correo.toLowerCase()}` : `sin:${nombre}:${id}`);

  for (const q of cotizaciones) {
    const tel = normalizarTelefono(q.customerPhone);
    const clave = claveDe(tel, q.customerEmail || null, q.customerName, q.id);
    const datos = { tours: toursDe(q), fechaViaje: esFecha(q.tourDate) ? q.tourDate : null, pax: (q.adults + q.children) || null };
    const etapa: Etapa = q.status === "enviada" ? "cotizado" : etapaPorReglas("nuevo", datos);
    const p = planes.get(clave);
    if (p) { p.etapa = subirA(p.etapa, etapa); p.cotizaciones.push(q.id); p.origen.push(q.quoteNumber); p.monto = q.totalAmount; Object.assign(p, datos); continue; }
    planes.set(clave, { clave, nombre: q.customerName, telefono: tel, correo: q.customerEmail || null, etapa, canal: "por_confirmar", ...datos, monto: q.totalAmount, cotizaciones: [q.id], reservas: [], origen: [q.quoteNumber] });
  }
  for (const r of futuras) {
    const tel = normalizarTelefono(r.customerPhone);
    const clave = claveDe(tel, r.customerEmail || null, r.customerName, r.id);
    const etapa: Etapa = etapaPorCobro(montoCobrado(r), r.totalAmount);
    const datos = { tours: toursDe(r), fechaViaje: esFecha(r.tourDate) ? r.tourDate : null, pax: (r.adults + r.children) || null };
    const p = planes.get(clave);
    if (p) { p.etapa = subirA(p.etapa, etapa); p.reservas.push(r.id); p.origen.push(r.confirmationNumber); p.canal = r.origen; p.monto = r.totalAmount; Object.assign(p, datos); continue; }
    planes.set(clave, { clave, nombre: r.customerName, telefono: tel, correo: r.customerEmail || null, etapa, canal: r.origen, ...datos, monto: r.totalAmount, cotizaciones: [], reservas: [r.id], origen: [r.confirmationNumber] });
  }

  const porEtapa: Record<string, number> = {};
  for (const p of Array.from(planes.values())) porEtapa[p.etapa] = (porEtapa[p.etapa] ?? 0) + 1;
  console.log(`Cotizaciones a enlazar: ${cotizaciones.length} · reservas futuras: ${futuras.length}`);
  console.log(`Leads que se crearían: ${planes.size}`, porEtapa);
  if (!aplicar) { console.log("Ensayo terminado. Corre con --aplicar para escribir."); return; }

  let creados = 0, reusados = 0;
  for (const p of Array.from(planes.values())) {
    let contacto = p.telefono ? await prisma.contacto.findUnique({ where: { telefono: p.telefono } })
      : p.correo ? await prisma.contacto.findFirst({ where: { correo: p.correo.toLowerCase() } }) : null;
    if (!contacto) contacto = await prisma.contacto.create({ data: { nombre: p.nombre, telefono: p.telefono, correo: p.correo?.toLowerCase() ?? null } });
    let op = await prisma.oportunidad.findFirst({ where: { contactoId: contacto.id, etapa: { in: ABIERTAS } } });
    if (op) {
      const etapa = subirA(op.etapa as Etapa, p.etapa);
      if (etapa !== op.etapa) { await prisma.oportunidad.update({ where: { id: op.id }, data: { etapa } }); await prisma.etapaOportunidad.create({ data: { oportunidadId: op.id, anterior: op.etapa, nueva: etapa, por: `${POR} (${p.origen.join(", ")})`, origen: "regla" } }); }
      reusados++;
    } else {
      op = await prisma.oportunidad.create({ data: { contactoId: contacto.id, etapa: p.etapa, canal: p.canal, tours: p.tours, fechaViaje: p.fechaViaje, pax: p.pax, monto: p.monto, creadoPor: POR } });
      await prisma.etapaOportunidad.create({ data: { oportunidadId: op.id, anterior: null, nueva: p.etapa, por: `${POR} (${p.origen.join(", ")})`, origen: "regla" } });
      creados++;
    }
    if (p.cotizaciones.length) await prisma.tourQuote.updateMany({ where: { id: { in: p.cotizaciones } }, data: { oportunidadId: op.id } });
    if (p.reservas.length) await prisma.tourBooking.updateMany({ where: { id: { in: p.reservas } }, data: { oportunidadId: op.id } });
  }
  await prisma.bitacora.create({ data: { accion: "creó", entidad: "lead", referencia: "Importación", resumen: `CRM sembrado: ${creados} leads nuevos y ${reusados} actualizados desde cotizaciones activas y reservas futuras`, usuario: "sistema", nombre: "Importación", rol: "sistema" } }).catch(() => {});
  console.log(`Listo: ${creados} leads creados, ${reusados} actualizados.`);
}

main().catch(e => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
