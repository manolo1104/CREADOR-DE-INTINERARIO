/**
 * Los correos del viaje CDMX–Xilitla. Todos con el lienzo de la marca
 * (`shellCorreo`) y con el texto del cliente escapado.
 *
 * Los números salen de la reserva o de la salida y de `precio.ts`: ningún
 * correo escribe un precio a mano.
 */
import type { ApartadoSalida, LiderGrupo, ListaEspera, SalidaGrupal, TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail, correosEquipo } from "@/lib/brevo";
import { escapeHtml } from "@/lib/escapeHtml";
import { estaDeBaja } from "@/lib/estaDeBaja";
import { telefonoWhatsapp } from "@/lib/reviewRequest";
import {
  BASE, C, WA, barra, boton, bajoBoton, filaDato, filaMoney, nota, parrafo, shellCorreo, tabla, titulo,
} from "@/lib/emailLayout";
import { diaMX, fechaLarga, fechaLargaEn, pesos, pesosEn, rangoLargo, rangoLargoEn, saldoVence } from "./precio";
import type { SalidaVista } from "./salidas";
import {
  ANTICIPO_PCT, CAMBIO_SOLO_DIAS_ANTES, CORTE_DIAS_ANTES, CUARTOS, HORA_CITA, HORA_SALIDA, INCLUYE, LIDER_PERSONAS, PUNTO_SALIDA, QUE_LLEVAR,
  SUPLEMENTO_PRIVADO, VIAJE_NOMBRE, VIAJE_RUTA, mensajeWhatsApp, type Cuarto,
} from "./config";
import { INCLUYE_EN, QUE_LLEVAR_EN, VIAJE_NOMBRE_EN, VIAJE_RUTA_EN, mensajeWhatsAppEn } from "./en";
import { metaDe } from "@/lib/admin/reserva";

const URL_VIAJE = `${BASE}${VIAJE_RUTA}`;
const wa = (texto: string) => `https://wa.me/${WA}?text=${encodeURIComponent(texto)}`;
const nombrePila = (n: string) => escapeHtml((n || "").trim().split(/\s+/)[0] || "");

function puntoDeSalida(en = false): string {
  return en
    ? `Angel of Independence · meet Friday at ${HORA_CITA}, we leave at midnight (${HORA_SALIDA})`
    : `${escapeHtml(PUNTO_SALIDA.nombre)} · cita el viernes a las ${HORA_CITA}, salida a la medianoche (${HORA_SALIDA})`;
}

async function salidaDe(r: TourBooking): Promise<SalidaGrupal | null> {
  return r.salidaId ? prisma.salidaGrupal.findUnique({ where: { id: r.salidaId } }) : null;
}

// ── Al cliente ──────────────────────────────────────────────────────────────

/**
 * Confirmación del anticipo. Al cliente, con el equipo en copia oculta. En
 * inglés si apartó en la página en inglés (16 oct 2026); el cuarto que eligió
 * va en la tabla.
 */
export async function correoConfirmacion(reservaId: string): Promise<void> {
  const r = await prisma.tourBooking.findUnique({ where: { id: reservaId } });
  if (!r) return;
  const s = await salidaDe(r);
  if (!s) return;
  const meta = metaDe(r);
  const en = meta.locale === "en";
  const cuarto: Cuarto = meta.cuarto === "privado" ? "privado" : "compartido";
  const cuartoTexto = CUARTOS[cuarto][en ? "en" : "es"].titulo + (meta.compartirCon
    ? (en ? ` (shared with ${meta.compartirCon === "mujeres" ? "women" : "men"})` : ` (con ${escapeHtml(String(meta.compartirCon))})`)
    : "");
  const fechas = en ? rangoLargoEn(s.fechaSalida, s.fechaRegreso) : rangoLargo(s.fechaSalida, s.fechaRegreso);
  const saldo = Math.max(0, r.totalAmount - r.depositoPagado);
  const vence = saldoVence(s);
  const $ = en ? pesosEn : pesos;
  const dia = en ? fechaLargaEn : fechaLarga;
  const nombre = en ? VIAJE_NOMBRE_EN : VIAJE_NOMBRE;
  const waTexto = en ? mensajeWhatsAppEn(fechas) : mensajeWhatsApp(fechas);

  const cuerpo = [
    titulo(en ? `Your spot is booked, ${nombrePila(r.customerName)}.` : `Tu lugar está apartado, ${nombrePila(r.customerName)}.`),
    parrafo(en
      ? `See you on <strong>${dia(s.fechaSalida)}</strong>. Keep this email: everything you need is here.`
      : `Nos vemos el <strong>${dia(s.fechaSalida)}</strong>. Guarda este correo: aquí está todo lo que necesitas.`),
    tabla([
      filaDato(en ? "Booking code" : "Folio", escapeHtml(r.confirmationNumber), true),
      filaDato(en ? "Dates" : "Fechas", fechas),
      filaDato(en ? "Travelers" : "Viajeros", en ? `${r.adults} ${r.adults === 1 ? "person" : "people"}` : `${r.adults} persona${r.adults === 1 ? "" : "s"}`),
      filaDato(en ? "Room" : "Cuarto", cuartoTexto),
      filaDato(en ? "Departure" : "Salida", puntoDeSalida(en)),
    ].join("")),
    barra(en ? "Your payment" : "Tu pago"),
    tabla([
      filaMoney(en ? "Trip total" : "Total del viaje", $(r.totalAmount), undefined, false, true),
      filaMoney(en ? `Deposit paid (${ANTICIPO_PCT}%)` : `Anticipo pagado (${ANTICIPO_PCT} %)`, $(r.depositoPagado), "verde"),
      filaMoney(en ? "Balance" : "Saldo", $(saldo), saldo > 0 ? "terracota" : undefined, true),
    ].join("")),
    saldo > 0
      ? nota(en
        ? `The balance is due on <strong>${dia(vence)}</strong>. A few days before, we email you the link to pay it by card.`
        : `El saldo vence el <strong>${dia(vence)}</strong>. Unos días antes te mandamos por correo la liga para pagarlo con tarjeta.`)
      : "",
    nota(en
      ? `Your deposit is non-refundable but transferable to another date. If the departure doesn't reach the minimum group, you choose another date or a 100% refund. From ${CAMBIO_SOLO_DIAS_ANTES} days before departure there are no refunds, only date changes.`
      : `Tu anticipo no es reembolsable, pero sí transferible a otra fecha del viaje. Si la salida no junta el mínimo de viajeros, te ofrecemos otra fecha o te devolvemos el 100 %. A partir de ${CAMBIO_SOLO_DIAS_ANTES} días antes de salir ya no hay devoluciones, solo cambio de fecha.`),
    barra(en ? "Your trip includes" : "Tu viaje incluye"),
    parrafo((en ? INCLUYE_EN : INCLUYE).map((x) => `✓ ${escapeHtml(x)}`).join("<br>"), "18px 0 0 0"),
    barra(en ? "What to bring" : "Qué llevar"),
    parrafo((en ? QUE_LLEVAR_EN : QUE_LLEVAR).map((x) => `· ${escapeHtml(x)}`).join("<br>"), "18px 0 0 0"),
    boton(wa(waTexto + (en ? ` My booking code is ${r.confirmationNumber}.` : ` Mi folio es ${r.confirmationNumber}.`)), en ? "Message us on WhatsApp" : "Escríbenos por WhatsApp", "whatsapp"),
    bajoBoton(en ? "For changes, questions or anything special someone in your group needs." : "Para cambios, dudas o si viajas con alguien que necesite algo especial."),
  ].join("");

  await sendBrevoEmail({
    to:  [{ email: r.customerEmail, name: r.customerName }],
    bcc: correosEquipo(),
    subject: en
      ? `Booked · ${nombre} · ${fechas} · ${r.confirmationNumber}`
      : `Lugar apartado · ${nombre} · ${fechas} · ${r.confirmationNumber}`,
    htmlContent: shellCorreo({
      locale: en ? "en" : "es",
      preheader: en ? `Booking code ${r.confirmationNumber}` : `Folio ${r.confirmationNumber}`,
      eyebrow: nombre,
      h1a: en ? "Your spot" : "Tu lugar",
      h1b: en ? "is booked" : "está apartado",
      entradilla: fechas,
      cuerpo,
      pie: en
        ? `Questions? Reply to this email or message us on <a href="${wa(waTexto)}" style="color:${C.verde};">WhatsApp</a>.`
        : `¿Dudas? Contesta este correo o escríbenos por <a href="${wa(waTexto)}" style="color:${C.verde};">WhatsApp</a>.`,
      origen: en ? `Email for your booking ${escapeHtml(r.confirmationNumber)}.` : `Correo de tu reserva ${escapeHtml(r.confirmationNumber)}.`,
    }),
    textContent: en
      ? `Your spot is booked. Code ${r.confirmationNumber}. ${nombre}, ${fechas}. ${r.adults} traveler(s). ${cuartoTexto}. Deposit ${$(r.depositoPagado)} of ${$(r.totalAmount)}. Balance ${$(saldo)}, due ${dia(vence)}.`
      : `Tu lugar está apartado. Folio ${r.confirmationNumber}. ${nombre}, ${fechas}. ${r.adults} persona(s). ${cuartoTexto}. Anticipo ${$(r.depositoPagado)} de ${$(r.totalAmount)}. Saldo ${$(saldo)}, vence el ${dia(vence)}.`,
  });
}

/** La ficha OXXO, para quien cierra la ventana antes de imprimirla. */
export async function correoFichaOxxo(a: ApartadoSalida, voucherUrl: string | null, vence: Date): Promise<void> {
  const s = await prisma.salidaGrupal.findUnique({ where: { id: a.salidaId } });
  if (!s) return;
  const fechas = rangoLargo(s.fechaSalida, s.fechaRegreso);
  const cuerpo = [
    titulo(`${nombrePila(a.nombre)}, tu lugar te espera.`),
    parrafo(`Apartamos <strong>${a.personas} lugar${a.personas === 1 ? "" : "es"}</strong> en el viaje del ${fechas} mientras pagas tu ficha en OXXO.`),
    tabla([
      filaMoney("A pagar en OXXO", pesos(a.anticipo), "verde", true, true),
      filaDato("Paga antes del", `${diaMX(vence)}, 11:59 pm`),
    ].join("")),
    voucherUrl ? boton(voucherUrl, "Ver mi ficha OXXO", "dorado") : "",
    nota("Cuando OXXO nos confirme el pago (puede tardar hasta un día hábil) te llega tu confirmación con el folio. Si la ficha vence sin pagarse, el lugar se libera."),
  ].join("");
  await sendBrevoEmail({
    to: [{ email: a.email, name: a.nombre }],
    subject: `Tu ficha OXXO · ${VIAJE_NOMBRE} · ${fechas}`,
    htmlContent: shellCorreo({ locale: "es", preheader: "Paga tu ficha para confirmar tu lugar", eyebrow: VIAJE_NOMBRE, h1a: "Tu ficha", h1b: "OXXO", entradilla: fechas, cuerpo }),
    textContent: `Tu ficha OXXO por ${pesos(a.anticipo)} para el ${VIAJE_NOMBRE} (${fechas}). Paga antes del ${diaMX(vence)}.${voucherUrl ? ` Ficha: ${voucherUrl}` : ""}`,
  });
}

/** El recordatorio del saldo, con su liga de pago. */
export async function correoLiquidacion(r: TourBooking, s: SalidaGrupal, liga: string, saldo: number): Promise<void> {
  const fechas = rangoLargo(s.fechaSalida, s.fechaRegreso);
  const vence = saldoVence(s);
  const cuerpo = [
    titulo(`Ya casi, ${nombrePila(r.customerName)}.`),
    parrafo(`Tu viaje del <strong>${fechas}</strong> se acerca. Para dejar tu lugar listo, liquida el saldo antes del <strong>${fechaLarga(vence)}</strong>.`),
    tabla([
      filaDato("Folio", escapeHtml(r.confirmationNumber), true),
      filaMoney("Saldo", pesos(saldo), "terracota", true),
    ].join("")),
    boton(liga, "Pagar mi saldo"),
    bajoBoton("Pago seguro con tarjeta a través de Stripe."),
    nota(`¿Prefieres transferencia? Escríbenos por <a href="${wa(`Hola, quiero liquidar mi viaje. Folio ${r.confirmationNumber}.`)}" style="color:${C.verde};">WhatsApp</a>.`),
  ].join("");
  await sendBrevoEmail({
    to:  [{ email: r.customerEmail, name: r.customerName }],
    bcc: correosEquipo(),
    subject: `Tu saldo del ${VIAJE_NOMBRE} · ${fechas} · ${r.confirmationNumber}`,
    htmlContent: shellCorreo({ locale: "es", preheader: `Saldo ${pesos(saldo)}`, eyebrow: VIAJE_NOMBRE, h1a: "Liquida", h1b: "tu viaje", entradilla: fechas, cuerpo, origen: `Correo de tu reserva ${escapeHtml(r.confirmationNumber)}.` }),
    textContent: `Saldo de ${pesos(saldo)} de tu ${VIAJE_NOMBRE} (${fechas}), vence el ${fechaLarga(vence)}. Paga aquí: ${liga}`,
  });
}

/** «Se liberó un lugar» o «abrió la fecha». Solo si no se dio de baja. */
export async function correoListaEspera(e: ListaEspera, s: SalidaGrupal, disponibles: number): Promise<boolean> {
  if (await estaDeBaja(e.email)) return false;
  const fechas = rangoLargo(s.fechaSalida, s.fechaRegreso);
  const cuerpo = [
    titulo(`${nombrePila(e.nombre)}, hay lugar.`),
    parrafo(`En este momento quedan <strong>${disponibles} lugar${disponibles === 1 ? "" : "es"}</strong> en el viaje del <strong>${fechas}</strong>. Te avisamos a todos los de la lista a la vez: el lugar es de quien aparte primero.`),
    boton(`${URL_VIAJE}?fecha=${s.fechaSalida}#fechas`, "Apartar mi lugar", "dorado"),
  ].join("");
  await sendBrevoEmail({
    to: [{ email: e.email, name: e.nombre }],
    subject: `Hay lugar · ${VIAJE_NOMBRE} · ${fechas}`,
    htmlContent: shellCorreo({ locale: "es", preheader: "Te avisamos porque estás en la lista de espera", eyebrow: VIAJE_NOMBRE, h1a: "Hay lugar", entradilla: fechas, cuerpo, paraBaja: e.email, origen: "Te llega porque te anotaste en la lista de espera del viaje." }),
    textContent: `Hay ${disponibles} lugar(es) en el ${VIAJE_NOMBRE} del ${fechas}. Aparta aquí: ${URL_VIAJE}?fecha=${s.fechaSalida}`,
  });
  return true;
}

/**
 * La información del viaje, al momento, para quien dejó su correo en el popup
 * (17 oct 2026): las fechas abiertas con sus lugares, el precio por cuarto, lo
 * que incluye y el botón a la página. Es publicidad que pidió: lleva baja.
 */
export async function correoInfoViaje(email: string, locale: "es" | "en", salidas: SalidaVista[]): Promise<boolean> {
  if (await estaDeBaja(email)) return false;
  const en = locale === "en";
  const $ = en ? pesosEn : pesos;
  const rango = (x: SalidaVista) => (en ? rangoLargoEn(x.fechaSalida, x.fechaRegreso) : rangoLargo(x.fechaSalida, x.fechaRegreso));
  const abiertas = salidas.filter((x) => x.estado === "preventa" || x.estado === "disponible" || x.estado === "ultimos").slice(0, 3);
  const desde = abiertas.length ? Math.min(...abiertas.map((x) => x.precioVigente)) : null;
  const base = en ? `${BASE}${VIAJE_RUTA_EN}` : URL_VIAJE;
  const liga = `${base}?utm_source=popup&utm_medium=email&utm_campaign=viaje-cdmx#fechas`;
  const waTexto = en ? mensajeWhatsAppEn() : mensajeWhatsApp();

  const cuerpo = [
    titulo(en ? "Here's the Mexico City trip." : "Aquí está el viaje desde la CDMX."),
    parrafo(en
      ? "Leave the Angel of Independence on Friday at midnight, wake up in Xilitla, and be back at the Angel on Monday at 6:00 am, in time for work."
      : "Sales del Ángel de la Independencia el viernes a la medianoche, despiertas en Xilitla y estás de vuelta en el Ángel el lunes a las 6:00 am, a tiempo para trabajar."),
    abiertas.length
      ? barra(en ? "Next dates" : "Próximas salidas") + tabla(abiertas.map((x, i) => filaDato(rango(x), en ? `${x.disponibles} of ${x.capacidad} spots left` : `Quedan ${x.disponibles} de ${x.capacidad} lugares`, i === 0)).join(""))
      : "",
    desde != null
      ? barra(en ? "Price per person" : "Precio por persona") + tabla([
          filaDato(CUARTOS.compartido[en ? "en" : "es"].titulo, $(desde), true),
          filaDato(CUARTOS.privado[en ? "en" : "es"].titulo, $(desde + SUPLEMENTO_PRIVADO)),
        ].join("")) + nota(en ? `You book with ${ANTICIPO_PCT}% and pay the rest ${CORTE_DIAS_ANTES} days before departure.` : `Apartas con el ${ANTICIPO_PCT} % y pagas el resto ${CORTE_DIAS_ANTES} días antes de salir.`)
      : "",
    barra(en ? "What's included" : "Qué incluye"),
    parrafo((en ? INCLUYE_EN : INCLUYE).map((x) => `✓ ${escapeHtml(x)}`).join("<br>"), "18px 0 0 0"),
    boton(liga, en ? "See dates and book" : "Ver fechas y apartar", "dorado"),
    boton(wa(waTexto), en ? "Ask on WhatsApp" : "Preguntar por WhatsApp", "whatsapp"),
  ].join("");

  await sendBrevoEmail({
    to: [{ email }],
    subject: en
      ? `Huasteca Potosina from Mexico City${desde != null ? ` · from ${pesosEn(desde)}` : ""}`
      : `Viaje a la Huasteca desde CDMX${desde != null ? ` · desde ${pesos(desde)}` : ""}`,
    htmlContent: shellCorreo({
      locale: en ? "en" : "es",
      preheader: en ? "Dates, prices and what's included" : "Fechas, precios y lo que incluye",
      eyebrow: en ? VIAJE_NOMBRE_EN : VIAJE_NOMBRE,
      h1a: en ? "The Huasteca" : "La Huasteca",
      h1b: en ? "from Mexico City" : "desde la CDMX",
      entradilla: en ? "A weekend, all included" : "Un fin de semana, todo incluido",
      cuerpo,
      paraBaja: email,
      origen: en ? "You get this because you asked for the trip details on our website." : "Te llega porque pediste la información del viaje en nuestra página.",
    }),
    textContent: (en ? "The Mexico City trip: " : "El viaje desde la CDMX: ") +
      abiertas.map((x) => `${rango(x)} (${x.disponibles})`).join(", ") +
      (desde != null ? (en ? `. From ${pesosEn(desde)} per person.` : `. Desde ${pesos(desde)} por persona.`) : ".") + ` ${liga}`,
  });
  return true;
}

/** Bienvenida al líder, con la liga que va a compartir. */
export async function correoLider(l: LiderGrupo): Promise<void> {
  const liga = `${URL_VIAJE}?lider=${encodeURIComponent(l.codigo)}`;
  const cuerpo = [
    titulo(`Gracias, ${nombrePila(l.nombre)}.`),
    parrafo(`Comparte esta liga con tu grupo. Cada lugar que se aparta con ella cuenta para ti: cuando <strong>${LIDER_PERSONAS} personas</strong> de tu grupo tengan su anticipo pagado, tú viajas gratis.`),
    tabla(filaDato("Tu código", escapeHtml(l.codigo), true)),
    boton(liga, "Mi liga para compartir", "dorado"),
    bajoBoton(escapeHtml(liga)),
    nota("Te escribimos por WhatsApp para ayudarte a armar el grupo y elegir la fecha."),
  ].join("");
  await sendBrevoEmail({
    to: [{ email: l.email, name: l.nombre }],
    bcc: correosEquipo(),
    subject: `Tu liga de líder · ${VIAJE_NOMBRE}`,
    htmlContent: shellCorreo({ locale: "es", preheader: `Código ${l.codigo}`, eyebrow: VIAJE_NOMBRE, h1a: "Arma tu grupo", h1b: "y viaja gratis", cuerpo }),
    textContent: `Tu código de líder es ${l.codigo}. Comparte esta liga: ${liga}. Con ${LIDER_PERSONAS} lugares pagados de tu grupo, viajas gratis.`,
  });
}

// ── Al equipo ───────────────────────────────────────────────────────────────

async function alEquipo(asunto: string, h1: string, cuerpo: string): Promise<void> {
  const to = correosEquipo();
  if (!to.length) return;
  await sendBrevoEmail({
    to,
    subject: asunto,
    htmlContent: shellCorreo({ locale: "es", preheader: "Aviso del sitio", eyebrow: `${VIAJE_NOMBRE} · equipo`, h1a: h1, cuerpo }),
  });
}

export async function correoSobrecupo(reservaId: string): Promise<void> {
  const r = await prisma.tourBooking.findUnique({ where: { id: reservaId } });
  if (!r) return;
  const s = await salidaDe(r);
  await alEquipo(
    `⚠️ SOBRECUPO · ${VIAJE_NOMBRE} · ${s ? rangoLargo(s.fechaSalida, s.fechaRegreso) : r.tourDate}`,
    "Sobrecupo",
    parrafo(`Entró un pago (${escapeHtml(r.confirmationNumber)}, ${escapeHtml(r.customerName)}, ${r.adults} persona${r.adults === 1 ? "" : "s"}) cuando la salida ya estaba llena. La reserva quedó guardada. Muévela a otra fecha desde <a href="${BASE}/admin/salidas" style="color:${C.verde};">Salidas</a> o sube el cupo.`),
  );
}

export async function correoNuevoEnEspera(e: ListaEspera, s: SalidaGrupal | null): Promise<void> {
  const tel = telefonoWhatsapp(e.whatsapp);
  await alEquipo(
    `Lista de espera · ${VIAJE_NOMBRE}${s ? ` · ${rangoLargo(s.fechaSalida, s.fechaRegreso)}` : " · siguiente fecha"}`,
    "Lista de espera",
    parrafo(`${escapeHtml(e.nombre)} (${escapeHtml(e.email)}${e.whatsapp ? `, ${escapeHtml(e.whatsapp)}` : ""}) quiere ${e.personas} lugar${e.personas === 1 ? "" : "es"} ${s ? `en el viaje del ${rangoLargo(s.fechaSalida, s.fechaRegreso)}` : "en la siguiente fecha que abra"}.`) +
    (tel ? boton(`https://wa.me/${tel}`, "Escribirle por WhatsApp", "whatsapp") : ""),
  );
}

export async function correoNuevoLider(l: LiderGrupo): Promise<void> {
  const tel = telefonoWhatsapp(l.whatsapp);
  await alEquipo(
    `Nuevo líder de grupo · ${escapeHtml(l.nombre)} · ~${l.personasEstimadas} personas`,
    "Líder de grupo",
    parrafo(`${escapeHtml(l.nombre)} (${escapeHtml(l.email)}, ${escapeHtml(l.whatsapp)}) quiere armar un grupo de ~${l.personasEstimadas}. Código <strong>${escapeHtml(l.codigo)}</strong>.${l.notas ? `<br>Nota: ${escapeHtml(l.notas)}` : ""}`) +
    (tel ? boton(`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${l.nombre.split(" ")[0]}, te escribimos de Tours Huasteca por tu grupo para el ${VIAJE_NOMBRE}.`)}`, "Escribirle por WhatsApp", "whatsapp") : ""),
  );
}

export async function correoBajoMinimo(s: SalidaGrupal, confirmados: number): Promise<void> {
  await alEquipo(
    `🔴 Bajo el mínimo · ${VIAJE_NOMBRE} · ${rangoLargo(s.fechaSalida, s.fechaRegreso)}`,
    "Bajo el mínimo",
    parrafo(`La salida del ${rangoLargo(s.fechaSalida, s.fechaRegreso)} lleva <strong>${confirmados} de ${s.minimo}</strong> viajeros y su fecha de corte es el ${diaMX(s.fechaCorte)}. Si no se llega, hay que ofrecer cambio de fecha o reembolso del 100 % a cada pasajero.`) +
    boton(`${BASE}/admin/salidas`, "Abrir Salidas"),
  );
}
