/**
 * Correos del funnel del curso "Turismo con IA".
 *
 * Cada correo vive aquí con TRES cosas juntas: su ID, su condición de envío
 * (`due`) y su contenido (`build`). El cron (/api/cron/curso) recorre este
 * registro y manda A LO SUMO UN correo por persona por corrida — así un lead
 * que entra tarde no recibe tres correos golpeados en la misma hora.
 *
 * Reglas de baja (ref: una baja que apaga una sola tabla es mentira):
 * - Secuencias A, B, D y W (no ha pagado) → llevan baja de un clic.
 * - Secuencia C (ya es alumno) → NO lleva baja: no es publicidad.
 *
 * El remitente es "Manolo · Huasteca Potosina Tours": el curso lo vende una
 * persona, no una marca. Tono: primera persona, párrafos cortos, UN CTA.
 */

import type { CursoLead } from "@prisma/client";
import {
  BASE, C, WA,
  barra, bajoBoton, boton, nota, parrafo, regla, shellCorreo, tabla, titulo,
} from "@/lib/emailLayout";
import {
  BONOS, CIFRAS, FECHAS, GARANTIA, LINKS, PRECIOS, PROGRAMA, SESIONES,
  fechaLarga, horaCorta, mxnCurso, precioVigente,
} from "@/lib/curso";

export const REMITENTE_CURSO = "Manolo · Huasteca Potosina Tours";

const URL_CURSO = `${BASE}/curso`;
const HORA_CDMX = (ms: string) => new Date(ms).getTime();

// Momentos fijos del calendario (CDMX = -06:00 todo el año)
const T = {
  a6: HORA_CDMX("2026-09-07T09:00:00-06:00"),
  a7: HORA_CDMX("2026-09-08T18:00:00-06:00"),
  d1: HORA_CDMX("2026-09-11T09:00:00-06:00"),
  d2: HORA_CDMX("2026-09-12T09:00:00-06:00"),
  d3: HORA_CDMX("2026-09-13T12:00:00-06:00"),
  d4: HORA_CDMX("2026-09-14T10:00:00-06:00"),
  w2: HORA_CDMX("2026-09-10T09:00:00-06:00"),
  w3: HORA_CDMX("2026-09-10T18:00:00-06:00"),
  c2: HORA_CDMX("2026-09-12T10:00:00-06:00"),
  c11: HORA_CDMX("2026-09-20T10:00:00-06:00"),
  c12: HORA_CDMX("2026-10-09T10:00:00-06:00"),
} as const;

const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;

export interface ContextoCorreo {
  lead: CursoLead;
  ahora: Date;
  /** Alumnos ya pagados (para cupo y precio vigente reales). */
  pagados: number;
}

export interface CorreoCurso {
  id: string;
  /** ¿Ya toca mandarlo? (la condición "no se le ha mandado" la pone el cron) */
  due: (cx: ContextoCorreo) => boolean;
  build: (cx: ContextoCorreo) => { subject: string; html: string };
}

// ── Piezas compartidas ─────────────────────────────────────────────────────

const enMinuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const saludo = (lead: CursoLead) =>
  lead.nombre ? `Hola, ${lead.nombre.split(" ")[0]}.` : "Hola.";

/** "Quedan N lugares de 25" — solo cuando la cifra ya empuja de verdad. */
const lineaCupo = (pagados: number) =>
  pagados >= 3
    ? nota(`<strong>${PRECIOS.cupoTotal - pagados} lugares disponibles</strong> de ${PRECIOS.cupoTotal}. La cohorte arranca el ${fechaLarga(FECHAS.inicioCohorte)}.`, C.terracota)
    : nota(`Cupo real: ${PRECIOS.cupoTotal} lugares. La cohorte arranca el ${fechaLarga(FECHAS.inicioCohorte)}.`);

const ctaReservar = (cx: ContextoCorreo, texto = "Reservar mi lugar") => {
  const pv = precioVigente(cx.ahora, cx.pagados);
  return [
    boton(`${URL_CURSO}#inversion`, `${texto} · ${mxnCurso(pv.precio)}`, "dorado"),
    bajoBoton(
      pv.esFundador
        ? `Precio de fundador hasta el ${fechaLarga(FECHAS.finFundador)} · 3 meses sin intereses`
        : `Inscripciones abiertas hasta el ${fechaLarga(FECHAS.cierreInscripciones)} · 3 meses sin intereses`
    ),
  ].join("");
};

const firmaWhats = `¿Dudas? Responde a este correo o escríbeme por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a>. Te contesto yo.`;

const shellCurso = (d: {
  preheader: string; eyebrow: string; h1a: string; h1b?: string;
  entradilla?: string; cuerpo: string; paraBaja?: string; alumno?: boolean;
}) => {
  const { alumno, ...resto } = d;
  return shellCorreo({
    locale: "es",
    origen: alumno
      ? "Recibes este correo porque estás en la cohorte 1 del curso Turismo con IA."
      : "Recibes este correo porque pediste información del curso Turismo con IA.",
    pie: firmaWhats,
    ...resto,
  });
};

// ── Secuencia A — Nurture ──────────────────────────────────────────────────

const A: CorreoCurso[] = [
  {
    id: "A1",
    // Inmediato (lo intenta la propia ruta; el cron lo repesca si Brevo falló).
    // Quien llegó por el taller gratuito recibe W1 en su lugar.
    due: ({ lead }) => lead.origen !== "webinar",
    build: (cx) => ({
      subject: "Tu programa completo del curso Turismo con IA",
      html: shellCurso({
        preheader: "El programa de las 4 semanas y lo que construyes cada una",
        eyebrow: "Turismo con IA",
        h1a: "Aquí está lo que",
        h1b: "te prometí",
        entradilla: `${saludo(cx.lead)} Soy Manolo. Llevo Huasteca Potosina Tours y un hotel en la Huasteca. Este es el programa completo del curso.`,
        cuerpo: [
          ...PROGRAMA.map((s) =>
            tabla(`
            <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:18px 22px;">
              ${titulo(`Semana ${s.semana} · ${s.titulo}`, "0 0 8px 0")}
              ${parrafo(`Al terminar la semana tienes: <strong>${enMinuscula(s.entregable)}</strong>.`, "0")}
            </td></tr>`)
          ),
          parrafo(`Todo lo que se enseña está funcionando hoy en mis negocios: con este sistema los tours vendieron más de ${mxnCurso(CIFRAS.toursVentas4m)} y el hotel superó ${mxnCurso(CIFRAS.hotelReservas4m)} en reservas, cada uno en sus primeros 4 meses, sin pagar publicidad.`, "18px 0 0 0"),
          ctaReservar(cx),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A2",
    due: ({ lead, ahora }) => ahora.getTime() >= lead.createdAt.getTime() + 1 * DIA,
    build: (cx) => ({
      subject: "$500,000 en 4 meses sin pagar un solo anuncio",
      html: shellCurso({
        preheader: "No fue suerte ni presupuesto. Fue el sistema.",
        eyebrow: "La historia",
        h1a: "Sin presupuesto,",
        h1b: "pero con sistema",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Cuando arranqué los tours no había dinero para anuncios. Las cotizaciones salían a mano, las reservas vivían en un Excel y el WhatsApp no paraba ni en la cena.`),
          parrafo("En vez de contratar una agencia, construí con IA la página, un agente que atiende el WhatsApp y las automatizaciones de cobro y seguimiento."),
          parrafo(`El resultado: más de <strong>${mxnCurso(CIFRAS.toursVentas4m)} en ventas</strong> en los primeros 4 meses. Repetí la fórmula en el hotel: más de <strong>${mxnCurso(CIFRAS.hotelReservas4m)} en reservas</strong> en el mismo plazo. Publicidad pagada: <strong>$0</strong>. El único gasto fijo fue la suscripción de IA.`),
          nota("No fue suerte ni presupuesto. Fue el sistema. Y el sistema se puede copiar: eso es exactamente lo que hacemos en las 4 semanas.", C.verde),
          ctaReservar(cx, "Ver el programa"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A3",
    due: ({ lead, ahora }) => ahora.getTime() >= lead.createdAt.getTime() + 2 * DIA,
    build: (cx) => ({
      subject: "Mi agente cerró una reserva mientras yo manejaba",
      html: shellCurso({
        preheader: "Así se ve un agente de IA atendiendo tu WhatsApp",
        eyebrow: "El agente",
        h1a: "Vende mientras",
        h1b: "tú vives",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} La semana pasada iba manejando a Ciudad Valles. Al llegar, la venta ya estaba hecha: mi agente cotizó, resolvió las dudas y mandó la liga de pago. Yo solo vi la notificación.`),
          parrafo("Eso es lo que construyes en la <strong>semana 2</strong> del curso: un agente conectado a tu WhatsApp y a tu catálogo, con el tono de tu marca, que sabe qué responder y qué pasarte a ti."),
          parrafo("No es un menú de opciones como los bots de antes. Conversa, entiende y cotiza con tus precios reales."),
          ctaReservar(cx),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A4",
    due: ({ lead, ahora }) => ahora.getTime() >= lead.createdAt.getTime() + 3 * DIA,
    build: (cx) => ({
      subject: "“Manolo, es que yo no sé programar”",
      html: shellCurso({
        preheader: "Tampoco necesitas. Si usas WhatsApp y Excel, puedes.",
        eyebrow: "La objeción",
        h1a: "No necesitas",
        h1b: "saber programar",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Es la duda que más me repiten. Y la entiendo, porque yo tampoco soy ingeniero: estudié turismo.`),
          parrafo("La IA escribe el código. Tu trabajo es DIRIGIR: decirle qué necesita tu negocio, revisar que quede bien y pedirle cambios en español. Si sabes explicarle a un empleado nuevo cómo trabajas, sabes hacer esto."),
          parrafo("¿El tiempo? 3 horas a la semana en vivo y unas 2 de práctica. Las grabaciones quedan para siempre, y los sábados revisamos TU proyecto en los talleres abiertos hasta destrabarlo."),
          nota(`${GARANTIA.nombre}: ${GARANTIA.texto}`, C.verde),
          ctaReservar(cx),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A5",
    due: ({ lead, ahora }) => ahora.getTime() >= lead.createdAt.getTime() + 4 * DIA,
    build: (cx) => ({
      subject: "Lo que te cuesta NO tener este sistema",
      html: shellCurso({
        preheader: "La cuenta que nadie hace: página + asistente + CRM",
        eyebrow: "Las cuentas",
        h1a: "Hagamos cuentas,",
        h1b: "con calma",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Suma lo que un negocio turístico paga hoy por fuera: la página ($8,000 a $25,000 por hacerla), un asistente que conteste ($6,000 al mes), el CRM o la plataforma ($1,000 a $3,000 al mes).`),
          parrafo(`Son más de <strong>${mxnCurso(CIFRAS.reemplazaAnualMxn)} al año</strong>, pagados a terceros, por un sistema que no controlas.`),
          parrafo(`El curso cuesta ${mxnCurso(precioVigente(cx.ahora, cx.pagados).precio)}, en 3 meses sin intereses. Con que tu agente capture <strong>una reserva extra por semana</strong>, se pagó solo en el primer mes.`),
          parrafo(`Y el ancla de fondo: con este sistema mis dos negocios hicieron más de <strong>${mxnCurso(CIFRAS.total4m)} en 4 meses</strong> con $0 de publicidad. El curso cuesta menos del 1.5% de eso.`),
          ctaReservar(cx),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A6",
    due: ({ lead, ahora }) =>
      ahora.getTime() >= T.a6 &&
      ahora.getTime() <= FECHAS.finFundador.getTime() &&
      lead.createdAt.getTime() < HORA_CDMX("2026-09-07T00:00:00-06:00"),
    build: (cx) => ({
      subject: "Mañana se acaba el precio de fundador",
      html: shellCurso({
        preheader: `De ${mxnCurso(PRECIOS.fundador)} a ${mxnCurso(PRECIOS.regular)} el 9 de septiembre`,
        eyebrow: "Aviso",
        h1a: "Mañana sube",
        h1b: "el precio",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Corto y claro: el precio de fundador de <strong>${mxnCurso(PRECIOS.fundador)}</strong> termina mañana ${fechaLarga(FECHAS.finFundador)} a las 11:59 pm. Después queda en ${mxnCurso(PRECIOS.regular)}.`),
          parrafo(`También desaparecen los 3 bonos de fundador: la auditoría 1 a 1 conmigo, el Kit Huasteca y la sesión de IA para redes (${mxnCurso(BONOS.reduce((s, b) => s + b.valor, 0))} en valor).`),
          ctaReservar(cx, "Asegurar precio de fundador"),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A7",
    due: ({ lead, ahora }) =>
      ahora.getTime() >= T.a7 &&
      ahora.getTime() <= FECHAS.finFundador.getTime() &&
      lead.createdAt.getTime() < HORA_CDMX("2026-09-08T12:00:00-06:00"),
    build: (cx) => ({
      subject: "Última llamada: 6 horas",
      html: shellCurso({
        preheader: "A las 11:59 pm el precio de fundador desaparece",
        eyebrow: "Última llamada",
        h1a: "Hoy a las 11:59",
        h1b: "se cierra",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy a las 11:59 pm termina el precio de fundador de ${mxnCurso(PRECIOS.fundador)} y se van los bonos. No te escribo para presionarte: te escribo para que no te enteres mañana.`),
          ctaReservar(cx, "Entrar con precio de fundador"),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia B — Recuperación de checkout ─────────────────────────────────

const bDue = (horas: number) => ({ lead, ahora }: ContextoCorreo) =>
  !!lead.checkoutIniciadoAt &&
  ahora.getTime() >= lead.checkoutIniciadoAt.getTime() + horas * HORA;

const B: CorreoCurso[] = [
  {
    id: "B1",
    due: bDue(1),
    build: (cx) => ({
      subject: "¿Te quedaste a medias?",
      html: shellCurso({
        preheader: "Si algo falló con el pago, respóndeme y lo resolvemos",
        eyebrow: "Tu inscripción",
        h1a: "¿Te quedaste",
        h1b: "a medias?",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Vi que empezaste tu inscripción al curso y no se completó. Si fue un problema con el pago o te quedó una duda, <strong>responde a este correo y te contesto yo</strong>, no un robot.`),
          ctaReservar(cx, "Terminar mi inscripción"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "B2",
    due: bDue(24),
    build: (cx) => ({
      subject: "Tu lugar sigue disponible (por hoy)",
      html: shellCurso({
        preheader: "Garantía de 2 sesiones y 3 meses sin intereses",
        eyebrow: "Tu inscripción",
        h1a: "Tu lugar sigue",
        h1b: "disponible",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Sigo guardando tu intención de entrar a la cohorte. Dos cosas por si son las que te detienen:`),
          parrafo(`<strong>1.</strong> Puedes pagar en 3 meses sin intereses con tarjeta.<br/><strong>2.</strong> ${GARANTIA.nombre}: ${GARANTIA.texto}`),
          ctaReservar(cx, "Terminar mi inscripción"),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "B3",
    due: bDue(48),
    build: (cx) => ({
      subject: "Última vez que te escribo sobre esto",
      html: shellCurso({
        preheader: "Si no es el momento, está perfecto",
        eyebrow: "Sin presión",
        h1a: "Última vez que",
        h1b: "te lo menciono",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Si no es el momento, está perfecto: un curso al que entras a medias no te sirve, y prefiero que llegues cuando puedas aprovecharlo.`),
          parrafo(
            LINKS.grabacionWebinar
              ? `Te dejo la <a href="${LINKS.grabacionWebinar}" style="color:${C.verde};font-weight:500;">grabación de mi taller gratuito</a>: ahí muestro el sistema real funcionando. Sin costo, sin registro.`
              : "Si quieres, respóndeme con la palabra “grabación” y te mando el taller gratuito donde muestro el sistema real funcionando."
          ),
          parrafo("Cuando abra la siguiente cohorte, serás de los primeros en saberlo."),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia W — Taller gratuito del 10 de septiembre ─────────────────────

const W: CorreoCurso[] = [
  {
    id: "W1",
    due: ({ lead }) => lead.webinar,
    build: (cx) => ({
      subject: "Listo: tu lugar en el taller gratuito del jueves 10",
      html: shellCurso({
        preheader: `${fechaLarga(FECHAS.webinar)} a las ${horaCorta(FECHAS.webinar)} · en vivo por Zoom`,
        eyebrow: "Taller gratuito",
        h1a: "Nos vemos el",
        h1b: "jueves 10",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Ya quedó tu registro al taller <strong>“Cómo automaticé Huasteca Potosina Tours”</strong>: ${fechaLarga(FECHAS.webinar)} a las ${horaCorta(FECHAS.webinar)} (hora del centro), en vivo por Zoom.`),
          parrafo("Voy a mostrar el sistema real, no diapositivas: la página, el agente contestando el WhatsApp y el panel con los números."),
          LINKS.zoomWebinar
            ? boton(LINKS.zoomWebinar, "Guardar mi liga de Zoom", "verde")
            : parrafo("La liga de Zoom te llega por este mismo correo un día antes."),
          regla(),
          parrafo(`Mientras tanto, aquí está el programa del curso que abre el ${fechaLarga(FECHAS.inicioCohorte)}:`, "0 0 6px 0"),
          ctaReservar(cx, "Ver el programa"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "W2",
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= T.w2 && lead.createdAt.getTime() < T.w2,
    build: (cx) => ({
      subject: "Es hoy a las 7 pm: el taller en vivo",
      html: shellCurso({
        preheader: "Cómo automaticé Huasteca Potosina Tours, con el sistema real",
        eyebrow: "Es hoy",
        h1a: "Hoy a las 7 pm,",
        h1b: "en vivo",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy ${fechaLarga(FECHAS.webinar)} a las ${horaCorta(FECHAS.webinar)} nos vemos en Zoom. Trae papel: voy a enseñar el sistema completo con mis números reales.`),
          LINKS.zoomWebinar
            ? boton(LINKS.zoomWebinar, "Entrar al taller (Zoom)", "verde")
            : parrafo("<strong>La liga de Zoom te llega en un correo aparte antes de las 6 pm.</strong>"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "W3",
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= T.w3 && lead.createdAt.getTime() < T.w3,
    build: (cx) => ({
      subject: "Empezamos en una hora",
      html: shellCurso({
        preheader: "El taller en vivo empieza a las 7 pm",
        eyebrow: "En una hora",
        h1a: "Empezamos",
        h1b: "a las 7",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} En una hora arrancamos. Conéctate unos minutos antes.`),
          LINKS.zoomWebinar
            ? boton(LINKS.zoomWebinar, "Entrar al taller (Zoom)", "verde")
            : parrafo("<strong>Revisa tu bandeja: la liga de Zoom va en un correo aparte.</strong>"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia D — Cierre de cohorte (11–14 sep) ────────────────────────────

const D: CorreoCurso[] = [
  {
    id: "D1",
    due: ({ ahora }) => ahora.getTime() >= T.d1 && ahora.getTime() <= FECHAS.cierreInscripciones.getTime(),
    build: (cx) => ({
      subject: "Cerramos inscripciones el sábado",
      html: shellCurso({
        preheader: `El martes ${fechaLarga(FECHAS.inicioCohorte)} arrancamos; no se puede entrar a medias`,
        eyebrow: "Cierre",
        h1a: "El sábado cerramos",
        h1b: "inscripciones",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} El martes ${fechaLarga(FECHAS.inicioCohorte)} a las 7 pm arranca la cohorte, y como cada semana construye sobre la anterior, no se puede entrar a medias: las inscripciones cierran el <strong>sábado ${fechaLarga(FECHAS.cierreInscripciones)} a las 11:59 pm</strong>.`),
          parrafo("Ya hay dentro agencias, guías y hoteles. En la semana 1 todos publican su página; en la 2, su agente de WhatsApp."),
          ctaReservar(cx),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "D2",
    due: ({ ahora }) => ahora.getTime() >= T.d2 && ahora.getTime() <= FECHAS.cierreInscripciones.getTime(),
    build: (cx) => ({
      subject: "Una pregunta honesta",
      html: shellCurso({
        preheader: "¿Qué te detiene? Respóndeme y te contesto yo.",
        eyebrow: "Entre tú y yo",
        h1a: "¿Qué te",
        h1b: "detiene?",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Pediste el programa del curso y no has entrado. No pasa nada, pero me interesa saber: <strong>¿qué te detiene?</strong>`),
          parrafo("¿El precio? ¿El tiempo? ¿Miedo a que “lo técnico” no sea lo tuyo? ¿Otra cosa?"),
          parrafo("Responde a este correo con una línea. Lo leo yo y te contesto yo, hoy mismo. Si el curso no es para ti, también te lo digo de frente."),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "D3",
    due: ({ ahora }) => ahora.getTime() >= T.d3 && ahora.getTime() <= FECHAS.cierreInscripciones.getTime(),
    build: (cx) => ({
      subject: "Se cierra hoy a las 11:59 pm",
      html: shellCurso({
        preheader: "La siguiente cohorte es hasta enero, a precio regular",
        eyebrow: "Hoy cierra",
        h1a: "Hoy a las 11:59",
        h1b: "cerramos",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy a las 11:59 pm se cierran las inscripciones. La siguiente cohorte abre en ${FECHAS.proximaCohorte}, a precio regular y sin los bonos de esta.`),
          ctaReservar(cx, "Entrar a la cohorte"),
          lineaCupo(cx.pagados),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "D4",
    due: ({ ahora }) => ahora.getTime() >= T.d4,
    build: (cx) => ({
      subject: "Gracias, y esto es lo que viene",
      html: shellCurso({
        preheader: "Te aviso primero cuando abra la cohorte de enero",
        eyebrow: "Gracias",
        h1a: "Esto es lo",
        h1b: "que viene",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} La cohorte 1 ya arrancó. Gracias por haberte asomado, de verdad.`),
          parrafo(
            LINKS.grabacionWebinar
              ? `Te regalo la <a href="${LINKS.grabacionWebinar}" style="color:${C.verde};font-weight:500;">grabación del taller</a> donde muestro el sistema completo. Es tuya, sin costo.`
              : "Si quieres ver el sistema completo funcionando, respóndeme “grabación” y te mando el taller gratuito grabado."
          ),
          parrafo(`Cuando abra la cohorte de ${FECHAS.proximaCohorte}, te aviso a ti primero. Mientras tanto te escribiré de vez en cuando con algo útil de IA para turismo, nada más.`),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia C — Alumnos (onboarding y acompañamiento) ────────────────────

const cuerpoBienvenida = (cx: ContextoCorreo) => [
  parrafo(`${saludo(cx.lead)} Ya eres parte de la cohorte 1 de <strong>Turismo con IA</strong>. Tu pago quedó registrado y tu lugar está apartado. A partir de hoy, esto deja de ser un curso que compraste y empieza a ser un sistema que construyes.`),
  barra("Tus fechas"),
  parrafo(`Arrancamos el <strong>${fechaLarga(FECHAS.inicioCohorte)} a las ${horaCorta(FECHAS.inicioCohorte)}</strong> (hora del centro). Son 8 sesiones en vivo, martes y jueves de 7:00 a 8:30 pm, más 4 talleres abiertos los sábados a las 10:00 am. Va adjunto el calendario para que lo agregues a tu teléfono de un toque.`),
  LINKS.zoomSesiones
    ? boton(LINKS.zoomSesiones, "Guardar la liga de Zoom", "verde")
    : parrafo("<strong>La liga de Zoom te llega por correo antes de la primera sesión.</strong>"),
  barra("La comunidad"),
  parrafo(
    LINKS.comunidadWhatsApp
      ? `Entra hoy mismo al grupo de WhatsApp de alumnos: ahí resolvemos dudas entre sesiones y ahí compartes tus avances.`
      : "En estos días te llega la invitación al grupo de WhatsApp de alumnos: ahí resolvemos dudas entre sesiones."
  ),
  ...(LINKS.comunidadWhatsApp ? [boton(LINKS.comunidadWhatsApp, "Entrar a la comunidad", "whatsapp")] : []),
  barra("Tu tarea antes del martes"),
  parrafo("Escribe en una hoja, a mano si quieres: qué vendes, a quién, tus 3 productos estrella con precios, y las 5 preguntas que más te repiten los clientes. Con esa hoja construimos TODO lo demás. No necesitas instalar nada todavía: eso lo hacemos juntos en la sesión 1."),
  nota(`${GARANTIA.nombre}: ${GARANTIA.texto}`, C.verde),
];

const C_SERIE: CorreoCurso[] = [
  {
    id: "C1",
    // La manda el webhook de Stripe al pagar; el cron la repesca si falló.
    due: () => true,
    build: (cx) => ({
      subject: "¡Estás dentro! Esto es lo que sigue",
      html: shellCurso({
        alumno: true,
        preheader: `Arrancamos el ${fechaLarga(FECHAS.inicioCohorte)} · calendario adjunto`,
        eyebrow: "Tu inscripción",
        h1a: "Estás",
        h1b: "dentro",
        cuerpo: cuerpoBienvenida(cx).join(""),
      }),
    }),
  },
  {
    id: "C2",
    due: ({ ahora }) => ahora.getTime() >= T.c2,
    build: (cx) => ({
      subject: "Prepara esto antes del martes",
      html: shellCurso({
        alumno: true,
        preheader: "La lista corta para llegar listo a la sesión 1",
        eyebrow: "Antes de arrancar",
        h1a: "Llega listo",
        h1b: "al martes",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} El martes arrancamos. La lista corta:`),
          parrafo(`<strong>1.</strong> Tu hoja del negocio (qué vendes, a quién, precios, las 5 preguntas de siempre).<br/><strong>2.</strong> Computadora con Chrome instalado; la sesión se sigue mejor en pantalla grande que en celular.<br/><strong>3.</strong> Si ya tienes dominio (tunegocio.com), ten a la mano dónde lo compraste y su contraseña. Si no tienes, no compres nada: elegimos juntos en la sesión.<br/><strong>4.</strong> 90 minutos sin interrupciones. Avisa en casa que el martes de 7 a 8:30 estás en clase.`),
          parrafo("Todo lo demás (cuentas, herramientas, instalación) lo hacemos EN VIVO en la sesión 1, paso a paso."),
        ].join(""),
      }),
    }),
  },
  {
    id: "C3",
    due: ({ ahora }) => ahora.getTime() >= SESIONES[0].fecha.getTime() - 10 * HORA,
    build: (cx) => ({
      subject: "Hoy arrancamos a las 7 pm",
      html: shellCurso({
        alumno: true,
        preheader: `Sesión 1: ${SESIONES[0].tema}`,
        eyebrow: "Es hoy",
        h1a: "Hoy empieza",
        h1b: "tu sistema",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy a las <strong>${horaCorta(SESIONES[0].fecha)}</strong> nos vemos en Zoom. Sesión 1: ${SESIONES[0].tema.toLowerCase()}.`),
          LINKS.zoomSesiones
            ? boton(LINKS.zoomSesiones, "Entrar a la sesión (Zoom)", "verde")
            : parrafo("<strong>La liga de Zoom va en un correo aparte hoy mismo.</strong>"),
          parrafo("Ten a la mano tu hoja del negocio. Nos vemos al rato."),
        ].join(""),
      }),
    }),
  },
  // Recordatorio de las sesiones 2 a 8, la mañana de cada sesión (9:00).
  ...SESIONES.slice(1).map((s, i): CorreoCurso => ({
    id: `C${4 + i}`,
    due: ({ ahora }) => ahora.getTime() >= s.fecha.getTime() - 10 * HORA,
    build: (cx) => ({
      subject: `Hoy 7 pm · Sesión ${s.n}: ${s.tema}`,
      html: shellCurso({
        alumno: true,
        preheader: "Nos vemos en Zoom a las 7:00 pm (hora del centro)",
        eyebrow: `Sesión ${s.n} de 8`,
        h1a: "Hoy a las 7,",
        h1b: "en vivo",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy a las <strong>${horaCorta(s.fecha)}</strong>: <strong>${s.tema}</strong>.`),
          LINKS.zoomSesiones
            ? boton(LINKS.zoomSesiones, "Entrar a la sesión (Zoom)", "verde")
            : parrafo("<strong>Usa la misma liga de Zoom de siempre.</strong>"),
          parrafo("Si no llegas, queda grabada; pero en vivo puedes preguntar sobre TU proyecto."),
        ].join(""),
      }),
    }),
  })),
  {
    id: "C11",
    due: ({ ahora }) => ahora.getTime() >= T.c11,
    build: (cx) => ({
      subject: "Tu página ya está publicada. Ahora esto.",
      html: shellCurso({
        alumno: true,
        preheader: "Cierra la semana 1 y asómate a lo que viene",
        eyebrow: "Fin de semana 1",
        h1a: "Ya tienes página.",
        h1b: "Sigue el agente.",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Semana 1 cerrada: tu página existe y está en TU dominio. Léelo otra vez, porque hace 7 días no era cierto.`),
          parrafo("Comparte la liga de tu página en el grupo de alumnos este fin de semana; ver los proyectos de los demás es la mitad del aprendizaje."),
          parrafo("El martes empieza la semana 2: tu agente de IA en WhatsApp. Es la semana que más cambia el día a día."),
        ].join(""),
      }),
    }),
  },
  {
    id: "C12",
    due: ({ ahora }) => ahora.getTime() >= T.c12,
    build: (cx) => ({
      subject: "Lo que construiste en 4 semanas",
      html: shellCurso({
        alumno: true,
        preheader: "Certificado, encuesta y tu plan de 90 días",
        eyebrow: "Cierre de cohorte",
        h1a: "Mira lo que",
        h1b: "construiste",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hace 4 semanas esto era una promesa. Hoy es tu página publicada, tu agente contestando el WhatsApp, tus automatizaciones y tu panel. Lo construiste tú.`),
          parrafo("En estos días te llega tu certificado y una encuesta corta (5 minutos): dime qué sirvió y qué mejorar para la cohorte 2."),
          parrafo("Y un favor personal: si el curso te sirvió, grábame un video de 60 segundos con tu teléfono contando qué construiste. Los testimonios reales de la cohorte 1 valen oro."),
          parrafo(`La comunidad sigue abierta y ahí sigo yo. Tu plan de 90 días es el mapa: ejecútalo y me cuentas cómo va.`),
        ].join(""),
      }),
    }),
  },
];

// ── Registro unificado (el orden ES la prioridad del cron) ─────────────────
// C (alumnos) → B (checkout a medias) → W (taller, con hora fija) → D (cierre)
// → A (nurture). Un lead recibe a lo sumo UN correo por corrida.

export const CORREOS_ALUMNO: CorreoCurso[] = C_SERIE;
export const CORREOS_PROSPECTO: CorreoCurso[] = [...B, ...W, ...D, ...A];

export function correoPorId(id: string): CorreoCurso | undefined {
  return [...C_SERIE, ...B, ...W, ...D, ...A].find((c) => c.id === id);
}
