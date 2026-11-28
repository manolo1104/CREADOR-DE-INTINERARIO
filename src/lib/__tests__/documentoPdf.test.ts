// El PDF de verdad del panel (27 nov 2026): la ruta arma un PDF válido para una
// cotización y para una reserva, el folio de Stripe no sale y una cancelada no
// lleva comprobante.
import { describe, it, expect, vi } from "vitest";

const quote: any = {
  quoteNumber: "COT-PRUEBA1", tourSlug: "rappel-sotano-del-cepillo", tourName: "Rappel en el Sótano del Cepillo", tourDate: "2026-12-13",
  adults: 2, children: 0, totalAmount: 6400, customerName: "Cliente Prueba", customerPhone: "4890000000", customerEmail: "prueba@example.com", notes: "",
  lineItems: [{ tourSlug: "rappel-sotano-del-cepillo", tourName: "Rappel en el Sótano del Cepillo", tourDate: "2026-12-13", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 6400 }],
  packageItems: [], extraItems: [],
};
const booking: any = {
  confirmationNumber: "HP-M-PRUEBA2", tourSlug: "rappel-tamul", tourName: "Rappel en la Cascada de Tamul", tourDate: "2026-12-14",
  adults: 4, children: 0, totalAmount: 9800, depositoPagado: 2940, createdAt: new Date("2026-11-27T12:00:00Z"), customerName: "Cliente Prueba", status: "confirmed",
  packageItems: [], lineItems: [
    { tourSlug: "rappel-tamul", tourName: "Rappel en la Cascada de Tamul", tourDate: "2026-12-14", adults: 4, childrenMid: 0, childrenSmall: 0, subtotal: 9800 },
    { _meta: true, metodoPago: "Liga de pago", folioPago: "cs_live_a0I4Of5mAyhJAsI43HiY8ZQCQNiovXW76W5GOAaWjzaby9MiVSkH5buYiW" },
  ],
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tourQuote: { findUnique: async ({ where }: any) => (where.quoteNumber === "COT-PRUEBA1" ? quote : null) },
    tourBooking: { findUnique: async ({ where }: any) => (where.confirmationNumber === "HP-M-PRUEBA2" ? booking : where.confirmationNumber === "HP-M-CANCELADA" ? { ...booking, status: "cancelled" } : null) },
  },
}));

import { GET } from "@/app/api/admin/documento/[folio]/route";
import { datosConfirmacion } from "@/lib/documentos/datosConfirmacion";

const pedir = (folio: string) => GET({} as any, { params: { folio } });

describe("PDF del panel", () => {
  it("cotización: PDF válido que se descarga con su nombre", async () => {
    const r = await pedir("cot-prueba1");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(r.headers.get("content-disposition")).toContain("COT-PRUEBA1");
    const bytes = Buffer.from(await r.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60000);
  it("confirmación: PDF válido y sin el folio de Stripe", async () => {
    const r = await pedir("HP-M-PRUEBA2");
    expect(r.status).toBe(200);
    expect(Buffer.from(await r.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(datosConfirmacion(booking).folioPago).toBe("");
  }, 60000);
  it("una cancelada no lleva comprobante y un folio que no existe da 404", async () => {
    expect((await pedir("HP-M-CANCELADA")).status).toBe(409);
    expect((await pedir("COT-NOEXISTE")).status).toBe(404);
  }, 60000);
});
