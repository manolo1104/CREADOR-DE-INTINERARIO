import { describe, expect, it } from "vitest";
import {
  avisoSoloLectura, cobraComoLaWeb, esReservaDeCotizacion, lineItemsAlEditar, lineItemsTrasBaja, mensajeTrasEnviarCorreo,
  mensajeTrasRegresar, modoDeEnvio, puedeRegresarAEnviada, reservaPosterior, type ReservaCandidata,
} from "@/lib/cotizaciones/reglasEnvio";
import { ajusteDeTotal, avisoCambioDeTotal, textoAjuste, totalConAjuste } from "@/lib/admin/precioPactado";
import { anticipoDe, desgloseCotizacion } from "@/lib/admin/totalesCotizacion";
import { buildTourQuoteEmailHtml } from "@/lib/tourEmail";
import { buildQuoteSequenceEmail, buildQuoteVenceEmail } from "@/lib/quoteSequenceEmail";
import { metaCotizacion } from "@/lib/quoteFollowUp";

// Lote 4 de la auditoría (5 nov 2026): cotizaciones — estados, envío, correos
// y precio pactado. Lo que toca la base (cron, envío, PATCH, baja) se prueba
// aparte con un script contra la base local; aquí, las reglas y los correos.

const Q = { id: "q-b", quoteNumber: "COT-B", customerEmail: "ana@x.com" };
const ENVIO = new Date("2026-11-05T15:00:00Z");
const despues = "2026-11-05T18:00:00Z";
const antes = "2026-10-01T18:00:00Z";
const reservaDe = (d: Partial<ReservaCandidata>): ReservaCandidata => ({ status: "pending", createdAt: despues, customerEmail: "ana@x.com", ...d });

describe("cron: «aceptada» solo con la reserva de ESA cotización (reservaPosterior)", () => {
  it("🔴 Ana tenía COT-A y COT-B; se convirtió A: B NO pasa a aceptada, solo se pausan sus correos", () => {
    const deA = reservaDe({ cotizacionId: "q-a" });
    expect(reservaPosterior(Q, ENVIO, [deA])).toBe("pausar");
  });

  it("la reserva que salió de ESTA cotización la acepta (por cotizacionId o por cotizacionOrigen)", () => {
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ cotizacionId: "q-b" })])).toBe("aceptar");
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ lineItems: [{ _meta: true, cotizacionOrigen: "COT-B" }, { tourSlug: "x" }] })])).toBe("aceptar");
    // Su propia reserva cuenta aunque se haya hecho antes de reenviarla.
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ cotizacionId: "q-b", createdAt: antes })])).toBe("aceptar");
  });

  it("🔴 una reserva CANCELADA (o el borrador del bot) no acepta ni pausa nada", () => {
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ cotizacionId: "q-b", status: "cancelled" })])).toBeNull();
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ status: "cancelled" })])).toBeNull();
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ status: "borrador" })])).toBeNull();
  });

  it("🔴 el correo se compara sin distinguir mayúsculas: compró otro tour en la web → se pausan sus correos", () => {
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ customerEmail: "  Ana@X.com " })])).toBe("pausar");
  });

  it("el cliente que vuelve: su reserva del año pasado no le corta el seguimiento de la cotización nueva", () => {
    expect(reservaPosterior(Q, ENVIO, [reservaDe({ createdAt: antes })])).toBeNull();
  });

  it("sin correo no se junta con nadie por correo; sin reservas no pasa nada", () => {
    expect(reservaPosterior({ ...Q, customerEmail: "" }, ENVIO, [reservaDe({})])).toBeNull();
    expect(reservaPosterior(Q, ENVIO, [])).toBeNull();
  });

  it("esReservaDeCotizacion no confunde otra cotización", () => {
    expect(esReservaDeCotizacion({ cotizacionId: "q-a" }, Q)).toBe(false);
    expect(esReservaDeCotizacion({ lineItems: [{ _meta: true, cotizacionOrigen: "COT-A" }] }, Q)).toBe(false);
  });
});

describe("«Enviar por correo»: envío de verdad o solo una copia (modoDeEnvio)", () => {
  const pkgs = (m: Record<string, unknown>) => [{ _meta: true, anticipo: 1500, ...m }];

  it("🔴 ya es la reserva HP-M-7: sale una copia y no cambia nada", () => {
    expect(modoDeEnvio({ status: "aceptada", customerEmail: "a@x.com", packageItems: pkgs({}) }, "HP-M-7"))
      .toEqual({ tipo: "copia", motivo: "reserva", folio: "HP-M-7" });
    // Aunque el estado se hubiera quedado en «enviada» (convertida antes del candado).
    expect(modoDeEnvio({ status: "enviada", customerEmail: "a@x.com" }, "HP-M-7").tipo).toBe("copia");
  });

  it("aceptada sin reserva (liga pagada) o reemplazada: copia", () => {
    expect(modoDeEnvio({ status: "aceptada", customerEmail: "a@x.com", packageItems: pkgs({ reservaFolio: "HP-M-9" }) }, null))
      .toEqual({ tipo: "copia", motivo: "aceptada", folio: "HP-M-9" });
    expect(modoDeEnvio({ status: "expirada", customerEmail: "a@x.com", packageItems: pkgs({ reemplazadaPor: "COT-NUEVA" }) }, null))
      .toEqual({ tipo: "copia", motivo: "reemplazada", folio: "COT-NUEVA" });
  });

  it("🔴 sin correo del cliente: solo le llega al equipo y nada cambia", () => {
    expect(modoDeEnvio({ status: "borrador", customerEmail: "" }, null)).toEqual({ tipo: "sin-correo" });
    expect(modoDeEnvio({ status: "borrador", customerEmail: "   " }, null)).toEqual({ tipo: "sin-correo" });
  });

  it("borrador, enviada o vencida con correo: se manda de verdad", () => {
    for (const status of ["borrador", "enviada", "expirada"]) expect(modoDeEnvio({ status, customerEmail: "a@x.com" }, null)).toEqual({ tipo: "envio" });
  });

  it("la pantalla dice lo que pasó de verdad", () => {
    expect(mensajeTrasEnviarCorreo({ emailEnviado: true, destinatario: "a@x.com" })).toContain("quedó Enviada");
    const copia = mensajeTrasEnviarCorreo({ emailEnviado: true, destinatario: "a@x.com", copia: { motivo: "reserva", folio: "HP-M-7" } });
    expect(copia).toContain("Copia enviada a a@x.com");
    expect(copia).toContain("Sigue Aceptada (ya es la reserva HP-M-7)");
    const sin = mensajeTrasEnviarCorreo({ emailEnviado: false, soloEquipo: true });
    expect(sin).toContain("no tiene correo del cliente");
    expect(sin).toContain("No cambió a Enviada");
    expect(sin.startsWith("✅")).toBe(false);
    expect(mensajeTrasEnviarCorreo({ emailEnviado: true, destinatario: "a@x.com", copia: { motivo: "reemplazada", folio: "COT-N" } }))
      .toContain("la que vale es la COT-N");
  });
});

describe("el PATCH conserva el `_meta` que maneja el servidor (lineItemsAlEditar)", () => {
  const tour = { tourSlug: "expedicion-tamul", tourName: "Tamul", tourDate: "2026-11-20", adults: 2, subtotal: 5000 };
  const guardados = [
    { _meta: true, locale: "es", seqDesde: "2026-11-04T16:00:00Z", seqPaso: 3, seqUltimoAt: "2026-11-05T16:00:00Z", seqEstado: "activo", venceEl: "2026-11-07", avisoVenceAt: "2026-11-06T13:00:00Z", recordadoWaAt: "2026-11-06T15:00:00Z" },
    tour,
  ];

  it("🔴 mandada por correo sin recargar: la copia del navegador no trae `_meta` y la fecha límite y el seguimiento NO se borran", () => {
    const r = lineItemsAlEditar([{ ...tour, adults: 3 }], guardados, null);
    const meta = metaCotizacion(r);
    expect(meta.venceEl).toBe("2026-11-07");
    expect(meta.seqDesde).toBe("2026-11-04T16:00:00Z");
    expect(meta.seqPaso).toBe(3);
    expect(r.filter((l: any) => !l._meta)).toEqual([{ ...tour, adults: 3 }]);
  });

  it("🔴 página vieja: el `_meta` del navegador (paso 1, sin aviso) no regresa lo que el cron ya mandó", () => {
    const viejo = [{ _meta: true, seqPaso: 1, venceEl: "2026-11-01", seqEstado: "activo" }, tour];
    const meta = metaCotizacion(lineItemsAlEditar(viejo, guardados, null));
    expect(meta.seqPaso).toBe(3);
    expect(meta.avisoVenceAt).toBe("2026-11-06T13:00:00Z");
    expect(meta.venceEl).toBe("2026-11-07");
  });

  it("mover la fecha límite a propósito: cambia y los recordatorios de la anterior ya no cuentan", () => {
    const meta = metaCotizacion(lineItemsAlEditar([tour], guardados, "2026-11-12"));
    expect(meta.venceEl).toBe("2026-11-12");
    expect(meta.avisoVenceAt).toBeUndefined();
    expect(meta.recordadoWaAt).toBeUndefined();
    expect(meta.seqPaso).toBe(3);
  });

  it("la misma fecha o una que no es fecha no borran nada", () => {
    expect(metaCotizacion(lineItemsAlEditar([tour], guardados, "2026-11-07")).avisoVenceAt).toBe("2026-11-06T13:00:00Z");
    expect(metaCotizacion(lineItemsAlEditar([tour], guardados, "mañana")).venceEl).toBe("2026-11-07");
  });

  it("un borrador sin `_meta` guarda solo sus renglones; con fecha nueva nace el `_meta`", () => {
    expect(lineItemsAlEditar([tour], [tour], null)).toEqual([tour]);
    expect(metaCotizacion(lineItemsAlEditar([tour], [tour], "2026-11-12")).venceEl).toBe("2026-11-12");
  });
});

describe("el botón de pagar en la web solo si cobra lo cotizado (cobraComoLaWeb)", () => {
  const l1 = { tourSlug: "expedicion-tamul", tourName: "Tamul", tourDate: "2026-11-20", adults: 4, subtotal: 6000 };
  const l2 = { tourSlug: "cascadas-del-meco", tourName: "Meco", tourDate: "2026-11-21", adults: 4, subtotal: 4000 };

  it("a precio de lista, sin nada más: sí", () => {
    expect(cobraComoLaWeb({ lineItems: [{ _meta: true, seqPaso: 1 }, l1, l2], packageItems: [{ _meta: true, anticipo: 3000 }], totalAmount: 10000 })).toBe(true);
  });

  it("🔴 con 10 % de descuento: no (el carrito cobraba el precio de lista)", () => {
    expect(cobraComoLaWeb({ lineItems: [l1, l2], packageItems: [{ _meta: true, discountType: "percent", discountValue: 10 }], totalAmount: 9000 })).toBe(false);
  });

  it("🔴 con «Comida» cobrada aparte: no (el carrito no la cobra ni la aparta); incluida sin costo: sí", () => {
    const comida = { concepto: "Comida típica", cantidad: 4, precioUnitario: 300, incluido: false };
    expect(cobraComoLaWeb({ lineItems: [l1], extraItems: [comida], totalAmount: 7200 })).toBe(false);
    expect(cobraComoLaWeb({ lineItems: [l1], extraItems: [{ ...comida, incluido: true }], totalAmount: 6000 })).toBe(true);
  });

  it("precio editado a mano o un concepto escrito a mano: no", () => {
    expect(cobraComoLaWeb({ lineItems: [l1], packageItems: [{ _meta: true, priceOverride: 5500 }], totalAmount: 5500 })).toBe(false);
    expect(cobraComoLaWeb({ lineItems: [l1], totalAmount: 5500 })).toBe(false);
    expect(cobraComoLaWeb({ lineItems: [{ ...l1, tourSlug: "__personalizado" }], totalAmount: 6000 })).toBe(false);
  });
});

describe("el anticipo de la cotización (anticipoDe)", () => {
  it("sin capturar es el 30 %; capturado manda; nunca más que el total", () => {
    expect(anticipoDe(10000, {})).toEqual({ anticipo: 3000, pct: 30 });
    expect(anticipoDe(18000, { anticipo: 9000 })).toEqual({ anticipo: 9000, pct: 50 });
    expect(anticipoDe(5000, { anticipo: 8000 })).toEqual({ anticipo: 5000, pct: 100 });
    // El desglose del PDF y del correo sigue diciendo lo mismo.
    expect(desgloseCotizacion(18000, 18000, { anticipo: 9000 }).anticipoPct).toBe(50);
  });
});

// ── Los correos ──────────────────────────────────────────────────────────────

const lineaTamul = { tourSlug: "expedicion-tamul", tourName: "Expedición Tamul", tourDate: "2026-11-20", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 5000 };
const baseCorreo = {
  customerName: "Ana", quoteNumber: "COT-7", tourName: "Expedición Tamul", tourDate: "2026-11-20", tourSlug: "expedicion-tamul",
  adults: 2, children: 0, totalAmount: 5000,
};

describe("correo de la cotización", () => {
  it("🔴 el `_meta` de lineItems ya no sale como renglón con «$NaN» ni «undefined»", () => {
    const html = buildTourQuoteEmailHtml({
      ...baseCorreo, partySize: 2, venceEl: "2026-11-07",
      lineItems: [{ _meta: true, seqPaso: 1, venceEl: "2026-11-07" } as any, lineaTamul],
    });
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("Grupo de");
    const dos = buildTourQuoteEmailHtml({
      ...baseCorreo, totalAmount: 9000, venceEl: "2026-11-07",
      lineItems: [lineaTamul, { _meta: true } as any, { ...lineaTamul, tourSlug: "cascadas-del-meco", tourName: "Cascadas del Meco", subtotal: 4000 }],
    });
    expect(dos).not.toContain("NaN");
    expect(dos).toContain("Cascadas del Meco");
  });

  it("🔴 la vigencia es la real: «válida hasta el …», no «48 horas» fijo", () => {
    const html = buildTourQuoteEmailHtml({ ...baseCorreo, lineItems: [lineaTamul], venceEl: "2026-11-19", packageItems: [{ _meta: true, vigencia: "15dias" } as any] });
    expect(html).not.toContain("48 horas");
    expect(html).toContain("válida hasta el <strong>jueves 19 de noviembre de 2026</strong>");
    expect(html).toContain("vence el jueves 19 de noviembre de 2026");
    // Sin fecha límite, la vigencia elegida.
    const sinFecha = buildTourQuoteEmailHtml({ ...baseCorreo, lineItems: [lineaTamul], packageItems: [{ _meta: true, vigencia: "15dias" } as any] });
    expect(sinFecha).toContain("válida por <strong>15 días</strong>");
    expect(sinFecha).not.toContain("48 horas");
  });

  it("a precio de lista: botón al carrito con los recorridos", () => {
    const html = buildTourQuoteEmailHtml({ ...baseCorreo, lineItems: [lineaTamul], venceEl: "2026-11-07" });
    expect(html).toContain("/reservar/carrito?agregar=expedicion-tamul");
    expect(html).toContain("Reservar y pagar en línea");
  });

  it("🔴 con descuento: sin carrito; con su liga, el botón es la liga de ESA cotización", () => {
    const conDescuento = { ...baseCorreo, totalAmount: 4500, lineItems: [lineaTamul], venceEl: "2026-11-07", packageItems: [{ _meta: true, discountType: "percent", discountValue: 10 } as any] };
    const conLiga = buildTourQuoteEmailHtml({ ...conDescuento, ligaPago: { url: "https://buy.stripe.com/test_liga", monto: 1350 } });
    expect(conLiga).not.toContain("/reservar/carrito");
    expect(conLiga).toContain("https://buy.stripe.com/test_liga");
    expect(conLiga).toContain("Pagar $1,350 MXN en línea");
    const sinLiga = buildTourQuoteEmailHtml(conDescuento);
    expect(sinLiga).not.toContain("/reservar/carrito");
    expect(sinLiga).not.toContain("Reservar en línea");
    expect(sinLiga).toContain("Para confirmar tu lugar, contáctanos por WhatsApp.");
    expect(sinLiga).toContain("wa.me/524891090388");
  });

  it("🔴 copia de una cotización que ya es reserva: sin botón de pago, sin vigencia y con su folio", () => {
    const html = buildTourQuoteEmailHtml({ ...baseCorreo, lineItems: [lineaTamul], copia: { motivo: "reserva", folio: "HP-M-7" } });
    expect(html).toContain("tu reserva <strong>HP-M-7</strong>");
    expect(html).toContain("no hace falta volver a pagar");
    expect(html).not.toContain("/reservar/carrito");
    expect(html).not.toContain("Válida");
    expect(html).not.toContain("¿Cómo confirmar?");
  });

  it("el anticipo del correo es el de la cotización", () => {
    const html = buildTourQuoteEmailHtml({ ...baseCorreo, lineItems: [lineaTamul], venceEl: "2026-11-07", packageItems: [{ _meta: true, anticipo: 2500 } as any] });
    expect(html).toContain("Anticipo para apartar (50 %)");
  });
});

describe("correos de seguimiento: anticipo real y el botón correcto", () => {
  // Sin `email`: el enlace de baja se firma con un secreto del servidor que la prueba no tiene.
  const seg = {
    locale: "es" as const, customerName: "Ana", quoteNumber: "COT-7",
    tourName: "Expedición Tamul", tourDate: "2026-12-20", totalAmount: 5000, lineItems: [{ _meta: true }, lineaTamul],
  };

  it("🔴 el paso «aparta» dice el anticipo de ESA cotización: 50 %, $4,000 o pago completo (no 30 % fijo)", () => {
    const cincuenta = buildQuoteSequenceEmail({ ...seg, paso: 3, packageItems: [{ _meta: true, anticipo: 2500, anticipoTipo: "percent" }] });
    expect(cincuenta.subject).toBe("Aparta tu Expedición Tamul con el 50 %");
    expect(cincuenta.html).toContain("Apartas hoy con el 50 %");
    expect(cincuenta.html).toContain("$2,500 MXN");
    expect(cincuenta.html).not.toContain("30 %");

    const fijo = buildQuoteSequenceEmail({ ...seg, totalAmount: 18000, paso: 3, packageItems: [{ _meta: true, anticipo: 4000, anticipoTipo: "fixed" }] });
    expect(fijo.subject).toBe("Aparta tu Expedición Tamul con $4,000 MXN");
    expect(fijo.html).toContain("Apartas hoy con $4,000 MXN");

    const completo = buildQuoteSequenceEmail({ ...seg, paso: 3, packageItems: [{ _meta: true, anticipo: 5000, anticipoTipo: "percent" }] });
    expect(completo.subject).toBe("Aparta tu Expedición Tamul");
    expect(completo.html).toContain("Pago completo");
    expect(completo.html).not.toContain("No hace falta que");
  });

  it("sin anticipo capturado sigue siendo el 30 %", () => {
    const r = buildQuoteSequenceEmail({ ...seg, paso: 3 });
    expect(r.subject).toBe("Aparta tu Expedición Tamul con el 30 %");
    expect(r.html).toContain("$1,500 MXN");
  });

  it("🔴 con descuento: el botón es la liga de la cotización (con su monto) o WhatsApp, nunca el carrito", () => {
    const conDescuento = { ...seg, totalAmount: 4500, packageItems: [{ _meta: true, discountType: "fixed", discountValue: 500 }] };
    const conLiga = buildQuoteSequenceEmail({ ...conDescuento, paso: 3, ligaPago: { url: "https://buy.stripe.com/test_l", monto: 1350 } });
    expect(conLiga.html).toContain("https://buy.stripe.com/test_l");
    expect(conLiga.html).toContain("Pagar $1,350 MXN en línea");
    expect(conLiga.html).not.toContain("/reservar/carrito");
    const sinLiga = buildQuoteSequenceEmail({ ...conDescuento, paso: 2 });
    expect(sinLiga.html).not.toContain("/reservar/carrito");
    expect(sinLiga.html).toContain("wa.me/524891090388");
    // «Abrir mi cotización» no puede llevar a un chat: el botón dice WhatsApp.
    expect(sinLiga.html).toContain("Escríbenos por WhatsApp");
    expect(sinLiga.html).not.toContain("Abrir mi cotización");
    // Con extras cobrados, igual.
    const comida = buildQuoteSequenceEmail({ ...seg, totalAmount: 6200, paso: 2, extraItems: [{ concepto: "Comida", cantidad: 4, precioUnitario: 300 }] });
    expect(comida.html).not.toContain("/reservar/carrito");
  });

  it("a precio de lista: al carrito, como siempre", () => {
    expect(buildQuoteSequenceEmail({ ...seg, paso: 2 }).html).toContain("/reservar/carrito?agregar=expedicion-tamul");
  });

  it("«vence mañana» también con el anticipo real; y en inglés", () => {
    const v = buildQuoteVenceEmail({ ...seg, packageItems: [{ _meta: true, anticipo: 2500, anticipoTipo: "percent" }], venceEl: "2026-11-07", cuando: "mañana" });
    expect(v.html).toContain("apártala con el 50 %");
    expect(v.html).toContain("Apartar con el 50 %");
    expect(v.html).not.toContain("30 %");
    const en = buildQuoteSequenceEmail({ ...seg, locale: "en", paso: 3, packageItems: [{ _meta: true, anticipo: 2500, anticipoTipo: "percent" }] });
    expect(en.subject).toBe("Hold your Expedición Tamul with 50 %");
    expect(en.html).toContain("You pay 50 % today");
  });
});

// ── La baja, «Regresar a Enviada» y la cotización de solo lectura ────────────

describe("la baja de correos solo pausa (lineItemsTrasBaja)", () => {
  it("🔴 un seguimiento vivo se pausa y se conserva todo lo demás del `_meta`", () => {
    const r = lineItemsTrasBaja([{ _meta: true, seqEstado: "activo", seqPaso: 2, venceEl: "2026-11-09" }, lineaTamul])!;
    expect(metaCotizacion(r)).toMatchObject({ seqEstado: "pausada", seqPaso: 2, venceEl: "2026-11-09" });
    expect(r).toContainEqual(lineaTamul);
    expect(metaCotizacion(lineItemsTrasBaja([lineaTamul])).seqEstado).toBe("pausada");
  });

  it("terminado, sin tiempo o ya pausada: no se toca", () => {
    for (const seqEstado of ["terminado", "sin-tiempo", "pausada"]) {
      expect(lineItemsTrasBaja([{ _meta: true, seqEstado }])).toBeNull();
    }
  });
});

describe("«Regresar a Enviada» y «Editar» de una aceptada", () => {
  it("solo la aceptada sin reserva y sin pago por liga regresa", () => {
    expect(puedeRegresarAEnviada({ status: "aceptada" }, { reservaFolio: null, ligaPagada: false })).toEqual({ ok: true });
    const conReserva = puedeRegresarAEnviada({ status: "aceptada" }, { reservaFolio: "HP-M-7", ligaPagada: false });
    expect(conReserva.ok).toBe(false);
    expect(!conReserva.ok && conReserva.motivo).toContain("HP-M-7");
    const conPago = puedeRegresarAEnviada({ status: "aceptada" }, { reservaFolio: null, ligaPagada: true });
    expect(!conPago.ok && conPago.motivo).toContain("conviértela en reserva");
    expect(puedeRegresarAEnviada({ status: "enviada" }, { reservaFolio: null, ligaPagada: false }).ok).toBe(false);
  });

  it("🔴 una aceptada se abre para ver, con el aviso de qué reserva editar", () => {
    expect(avisoSoloLectura({ status: "enviada" }, null)).toBeNull();
    expect(avisoSoloLectura({ status: "aceptada" }, "HP-M-7")).toContain("edita la reserva HP-M-7");
    expect(avisoSoloLectura({ status: "aceptada", packageItems: [{ _meta: true, reservaFolio: "HP-M-9" }] }, null)).toContain("HP-M-9");
    expect(avisoSoloLectura({ status: "aceptada" }, null)).toContain("Regresar a Enviada");
  });

  it("al regresarla dice si su fecha límite ya pasó", () => {
    expect(mensajeTrasRegresar("2026-11-01", "2026-11-05")).toContain("ya pasó");
    expect(mensajeTrasRegresar("2026-11-09", "2026-11-05")).toContain("Regresó a Enviada");
  });
});

// ── El precio pactado en la reserva ──────────────────────────────────────────

describe("precio pactado de la reserva como ajuste (precioPactado)", () => {
  it("🔴 pactado en $9,000 (lista $9,450): cambiar la fecha no lo mueve; sumar a alguien sí, y se pregunta de cuánto a cuánto", () => {
    const ajuste = ajusteDeTotal(9000, 9450);
    expect(ajuste).toBe(-450);
    // Solo la fecha: la lista da lo mismo → el total se queda y no se pregunta nada.
    expect(totalConAjuste(9450, ajuste)).toBe(9000);
    expect(avisoCambioDeTotal(9000, totalConAjuste(9450, ajuste))).toBeNull();
    // Un adulto más ($1,050 de lista): el ajuste se respeta y se avisa.
    const nuevo = totalConAjuste(10500, ajuste);
    expect(nuevo).toBe(10050);
    const aviso = avisoCambioDeTotal(9000, nuevo)!;
    expect(aviso).toContain("de $9,000 a $10,050");
    expect(aviso).toContain("+$1,050");
  });

  it("🔴 lo que cobró la web y el panel no sabe armar ($4,450 vs $4,050): se queda como ajuste", () => {
    const ajuste = ajusteDeTotal(4450, 4050);
    expect(ajuste).toBe(400);
    expect(totalConAjuste(4050, ajuste)).toBe(4450);
    expect(textoAjuste(ajuste)).toBe("+$400");
    expect(textoAjuste(-450)).toBe("−$450");
  });

  it("si el total baja también se pregunta; nunca queda negativo", () => {
    expect(avisoCambioDeTotal(5000, 4000)).toContain("−$1,000");
    expect(totalConAjuste(300, -1000)).toBe(0);
  });
});
