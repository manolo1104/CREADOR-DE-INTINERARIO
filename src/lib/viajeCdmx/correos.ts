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
import { diaMX, fechaLarga, pesos, rangoLargo, saldoVence } from "./precio";
import {
  ANTICIPO_PCT, HORA_CITA, HORA_SALIDA, INCLUYE, LIDER_PERSONAS, PUNTO_SALIDA, QUE_LLEVAR, VIAJE_NOMBRE, VIAJE_RUTA, mensajeWhatsApp,
} from "./config";

const URL_VIAJE = `${BASE}${VIAJE_RUTA}`;
const wa = (texto: string) => `https://wa.me/${WA}?text=${encodeURIComponent(texto)}`;
const nombrePila = (n: string) => escapeHtml((n || "").trim().split(/\s+/)[0] || "");

function puntoDeSalida(): string {
  return `${escapeHtml(PUNTO_SALIDA.nombre)} · viernes ${HORA_SALIDA} (llega a las ${HORA_CITA})`;
}

async function salidaDe(r: TourBooking): Promise<SalidaGrupal | null> {
  return r.salidaId ? prisma.salidaGrupal.findUnique({ where: { id: r.salidaId } }) : null;
}

// ── Al cliente ──────────────────────────────────────────────────────────────

/** Confirmación del anticipo. Al cliente, con el equipo en copia oculta. */
export async function correoConfirmacion(reservaId: string): Promise<void> {
  const r = await prisma.tourBooking.findUnique({ where: { id: reservaId } });
  if (!r) return;
  const s = await salidaDe(r);
  if (!s) return;
  const fechas = rangoLargo(s.fechaSalida, s.fechaRegreso);
  const saldo = Math.max(0, r.totalAmount - r.depositoPagado);
  const vence = saldoVence(s);

  const cuerpo = [
    titulo(`Tu lugar está apartado, ${nombrePila(r.customerName)}.`),
    parrafo(`Nos vemos el <strong>${fechaLarga(s.fechaSalida)}</strong>. Guarda este correo: aquí está todo lo que necesitas.`),
    tabla([
      filaDato("Folio", escapeHtml(r.confirmationNumber), true),
      filaDato("Fechas", fechas),
      filaDato("Viajeros", `${r.adults} persona${r.adults === 1 ? "" : "s"}`),
      filaDato("Salida", puntoDeSalida()),
    ].join("")),
    barra("Tu pago"),
    tabla([
      filaMoney("Total del viaje", pesos(r.totalAmount), undefined, false, true),
      filaMoney(`Anticipo pagado (${ANTICIPO_PCT} %)`, pesos(r.depositoPagado), "verde"),
      filaMoney("Saldo", pesos(saldo), saldo > 0 ? "terracota" : undefined, true),
    ].join("")),
    saldo > 0
      ? nota(`El saldo vence el <strong>${fechaLarga(vence)}</strong>. Unos días antes te mandamos por correo la liga para pagarlo con tarjeta.`)
      : "",
    nota("Tu anticipo no es reembolsable, pero sí transferible: si no puedes ir, lo pasamos a otra fecha del viaje. Si la salida no junta el mínimo de viajeros, te ofrecemos otra fecha o te devolvemos el 100 %."),
    barra("Tu viaje incluye"),
    parrafo(INCLUYE.map((x) => `✓ ${escapeHtml(x)}`).join("<br>"), "18px 0 0 0"),
    barra("Qué llevar"),
    parrafo(QUE_LLEVAR.map((x) => `· ${escapeHtml(x)}`).join("<br>"), "18px 0 0 0"),
    boton(wa(mensajeWhatsApp(fechas) + ` Mi folio es ${r.confirmationNumber}.`), "Escríbenos por WhatsApp", "whatsapp"),
    bajoBoton("Para cambios, dudas o si viajas con alguien que necesite algo especial."),
  ].join("");

  await sendBrevoEmail({
    to:  [{ email: r.customerEmail, name: r.customerName }],
    bcc: correosEquipo(),
    subject: `Lugar apartado · ${VIAJE_NOMBRE} · ${fechas} · ${r.confirmationNumber}`,
    htmlContent: shellCorreo({
      locale: "es",
      preheader: `Folio ${r.confirmationNumber}`,
      eyebrow: VIAJE_NOMBRE,
      h1a: "Tu lugar",
      h1b: "está apartado",
      entradilla: fechas,
      cuerpo,
      pie: `¿Dudas? Contesta este correo o escríbenos por <a href="${wa(mensajeWhatsApp(fechas))}" style="color:${C.verde};">WhatsApp</a>.`,
      origen: `Correo de tu reserva ${escapeHtml(r.confirmationNumber)}.`,
    }),
    textContent: `Tu lugar está apartado. Folio ${r.confirmationNumber}. ${VIAJE_NOMBRE}, ${fechas}. ${r.adults} persona(s). Anticipo ${pesos(r.depositoPagado)} de ${pesos(r.totalAmount)}. Saldo ${pesos(saldo)}, vence el ${fechaLarga(vence)}.`,
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
