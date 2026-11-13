import { describe, expect, it } from "vitest";
import {
  CREADOR_LIGA_COTIZACION, decidirLigaDeCotizacion, ligaConCorreo, textosLigaDeCotizacion,
} from "@/lib/admin/ligasReglas";
import { anticipoDe } from "@/lib/admin/totalesCotizacion";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";
import { buildQuoteSequenceEmail, buildQuoteVenceEmail } from "@/lib/quoteSequenceEmail";

// 13 nov 2026 — pedido de Manolo: el botón «Reservar» de la cotización y de sus
// recordatorios cobra en Stripe el anticipo acordado; al pagar, la cotización
// pasa sola a reserva y sale la confirmación. Aquí las reglas y los correos; lo
// que toca la base se prueba con un script contra la base local.

const auto = (id: string, monto: number, estado = "activo") => ({ id, monto, estado, creadoPor: CREADOR_LIGA_COTIZACION });
const abierta = { status: "enviada", reemplazada: false, conReserva: false, monto: 1860, ligas: [] as ReturnType<typeof auto>[] };

describe("¿qué liga lleva el botón de la cotización? (decidirLigaDeCotizacion)", () => {
  it("sin liga: nace una con el anticipo acordado (Tamul 4 adultos $6,200 → $1,860)", () => {
    expect(anticipoDe(6200, {}).anticipo).toBe(1860);
    expect(decidirLigaDeCotizacion(abierta)).toEqual({ accion: "crear", monto: 1860, apagar: [] });
    // También al mandarla por primera vez (todavía es borrador).
    expect(decidirLigaDeCotizacion({ ...abierta, status: "borrador" }).accion).toBe("crear");
  });
  it("Erick puso otro anticipo: cobra ESE ($2,000), y el 100 % cobra todo ($6,200)", () => {
    expect(anticipoDe(6200, { anticipo: 2000 }).anticipo).toBe(2000);
    expect(anticipoDe(6200, { anticipo: 6200 }).anticipo).toBe(6200);
    expect(decidirLigaDeCotizacion({ ...abierta, monto: 6200 })).toEqual({ accion: "crear", monto: 6200, apagar: [] });
  });
  it("la automática con el mismo monto se reusa: el mismo enlace en el correo y en los recordatorios", () => {
    expect(decidirLigaDeCotizacion({ ...abierta, ligas: [auto("l1", 1860)] })).toEqual({ accion: "reusar", ligaId: "l1" });
  });
  it("🔴 se editó la cotización y cambió el monto: se apaga la vieja y nace otra", () => {
    expect(decidirLigaDeCotizacion({ ...abierta, monto: 2100, ligas: [auto("l1", 1860)] })).toEqual({ accion: "crear", monto: 2100, apagar: ["l1"] });
  });
  it("una liga viva hecha A MANO en Cobros manda (es lo que se habló con el cliente)", () => {
    const aMano = { id: "m1", monto: 3100, estado: "activo", creadoPor: "Erick" };
    expect(decidirLigaDeCotizacion({ ...abierta, ligas: [auto("l1", 1860), aMano] })).toEqual({ accion: "reusar", ligaId: "m1" });
  });
  it("🔴 nunca cobra dos veces: ya pagó una liga, ya es reserva, o se reemplazó", () => {
    expect(decidirLigaDeCotizacion({ ...abierta, ligas: [auto("l1", 1860, "pagado")] }).accion).toBe("nada");
    expect(decidirLigaDeCotizacion({ ...abierta, conReserva: true }).accion).toBe("nada");
    expect(decidirLigaDeCotizacion({ ...abierta, reemplazada: true }).accion).toBe("nada");
  });
  it("cerrada (aceptada, vencida, archivada) o menos de $10: sin liga", () => {
    for (const status of ["aceptada", "expirada", "archivada"]) {
      expect(decidirLigaDeCotizacion({ ...abierta, status }).accion).toBe("nada");
    }
    expect(decidirLigaDeCotizacion({ ...abierta, monto: 0 }).accion).toBe("nada");
  });
  it("una cancelada no estorba: se hace otra", () => {
    expect(decidirLigaDeCotizacion({ ...abierta, ligas: [auto("l1", 1860, "cancelado")] })).toEqual({ accion: "crear", monto: 1860, apagar: [] });
  });
});

describe("lo que el cliente ve en la página de pago de Stripe", () => {
  it("concepto y línea chica, como los de Cobros", () => {
    const t = textosLigaDeCotizacion({
      quoteNumber: "COT-9", customerName: "Ana López", tourName: "Expedición Tamul — día completo", tourDate: "2026-11-14",
      personas: 4, total: 6200, monto: 1860,
    }, 2026);
    expect(t.titulo).toBe("Anticipo de Expedición Tamul");
    expect(t.detalle).toBe("Ana López · 4 personas · sale el 14 de noviembre · COT-9");
  });
  it("pago completo y varios tours; otro año lleva el año", () => {
    const t = textosLigaDeCotizacion({
      quoteNumber: "COT-1", customerName: "Leo", tourName: "Tamul + Meco + Micos", tourDate: "2027-01-03", personas: 1, total: 900, monto: 900,
    }, 2026);
    expect(t.titulo).toBe("Pago de Tamul y 2 tours más");
    expect(t.detalle).toBe("Leo · 1 persona · sale el 3 de enero de 2027 · COT-1");
  });
  it("el correo del cliente ya escrito; sin correo válido, la liga tal cual", () => {
    expect(ligaConCorreo("https://buy.stripe.com/x", "ana+1@x.com")).toBe("https://buy.stripe.com/x?prefilled_email=ana%2B1%40x.com");
    expect(ligaConCorreo("https://buy.stripe.com/x", "")).toBe("https://buy.stripe.com/x");
    expect(ligaConCorreo("https://buy.stripe.com/x", "sin@desconocido")).toBe("https://buy.stripe.com/x");
  });
});

describe("🔴 el botón del correo cobra lo cotizado: la liga va primero", () => {
  const lineaTamul = { tourName: "Expedición Tamul", tourSlug: "expedicion-tamul", tourDate: "2026-12-20", adults: 2, subtotal: 5000 };
  const liga = { url: "https://buy.stripe.com/test_auto", monto: 1500 };

  it("cotización a precio de lista CON liga: el botón es la liga, ya no el carrito", () => {
    const html = buildTourQuoteEmailHtml({
      customerName: "Ana", quoteNumber: "COT-7", tourName: "Expedición Tamul", tourDate: "2026-12-20", tourSlug: "expedicion-tamul",
      adults: 2, children: 0, totalAmount: 5000, lineItems: [lineaTamul], venceEl: "2026-11-20", ligaPago: liga,
    });
    expect(html).toContain("https://buy.stripe.com/test_auto");
    expect(html).toContain("Pagar $1,500 MXN en línea");
    expect(html).not.toContain("/reservar/carrito");
  });
  it("sin liga (Stripe caído o sin llave): el carrito como antes", () => {
    const html = buildTourQuoteEmailHtml({
      customerName: "Ana", quoteNumber: "COT-7", tourName: "Expedición Tamul", tourDate: "2026-12-20", tourSlug: "expedicion-tamul",
      adults: 2, children: 0, totalAmount: 5000, lineItems: [lineaTamul], venceEl: "2026-11-20",
    });
    expect(html).toContain("/reservar/carrito?agregar=expedicion-tamul");
  });
  it("recordatorios y «vence mañana»: también la liga", () => {
    const seg = { locale: "es" as const, customerName: "Ana", quoteNumber: "COT-7", tourName: "Expedición Tamul", tourDate: "2026-12-20", totalAmount: 5000, lineItems: [{ _meta: true }, lineaTamul] };
    const paso = buildQuoteSequenceEmail({ ...seg, paso: 2, ligaPago: liga });
    expect(paso.html).toContain("https://buy.stripe.com/test_auto");
    expect(paso.html).not.toContain("/reservar/carrito");
    const vence = buildQuoteVenceEmail({ ...seg, venceEl: "2026-11-20", cuando: "mañana", ligaPago: liga });
    expect(vence.html).toContain("https://buy.stripe.com/test_auto");
    expect(vence.html).not.toContain("/reservar/carrito");
  });
  it("una copia (ya es reserva) nunca lleva liga", () => {
    const html = buildTourQuoteEmailHtml({
      customerName: "Ana", quoteNumber: "COT-7", tourName: "Expedición Tamul", tourDate: "2026-12-20", tourSlug: "expedicion-tamul",
      adults: 2, children: 0, totalAmount: 5000, lineItems: [lineaTamul], ligaPago: liga, copia: { motivo: "reserva", folio: "HP-M-7" },
    });
    expect(html).not.toContain("https://buy.stripe.com/test_auto");
  });
});
