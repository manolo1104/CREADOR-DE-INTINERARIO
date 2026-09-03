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
// La piel de estos correos es la del funnel (negra, azul eléctrico y blanco),
// no la crema de la marca de tours: es otro producto y otro público. Misma
// API, así que sólo cambia de dónde vienen las piezas.
import {
  BASE, C, WA,
  barra, bajoBoton, boton, nota, parrafo, regla, shellCorreo, tabla, titulo,
} from "@/lib/cursoEmailLayout";
import { linkBaja } from "@/lib/baja";
import {
  BONOS, CIFRAS, FECHAS, GARANTIA, LINKS, PRECIOS, PROGRAMA, SESIONES,
  TALLER_NOCHES,
  fechaLarga, fechaSinDia, NOCHES_TEXTO, horaCorta, mxnCurso, precioVigente,
} from "@/lib/curso";

export const REMITENTE_CURSO = "Manolo · Huasteca Potosina Tours";

const URL_CURSO = `${BASE}/curso`;
const HORA_CDMX = (ms: string) => new Date(ms).getTime();

// Momentos fijos del calendario (CDMX = -06:00 todo el año)
// Momentos fijos. El orden importa: la oferta se presenta la noche del 10, así
// que TODO lo que habla de precio va después de esa hora, no antes.
const T = {
  // El taller: 8, 9 y 10 de septiembre a las 7 pm
  w2: HORA_CDMX("2026-09-08T09:00:00-06:00"), // mañana de la noche 1
  // 🔴 Estos tres decían "en 30 minutos" y salían a las 18:30. NO SE PUEDE:
  // el cron de GitHub está programado cada hora y en 29 corridas medidas
  // (29 ago–3 sep) NINGUNA llegó dentro de esa hora — media real 4.08 h,
  // máximo 7.79 h. Un correo disparado a las 18:30 llegaba a las 20:33, con la
  // sesión ya terminada, prometiendo que empezaba en media hora.
  //
  // Ahora salen a las 14:00 y el texto dice la HORA, no una cuenta atrás: da
  // igual si llega a las 15:00 o a las 21:00, nunca miente. El recordatorio de
  // verdad, el de "empezamos ya", va por el grupo de WhatsApp, que es
  // instantáneo y no depende de nadie.
  w3: HORA_CDMX("2026-09-08T14:00:00-06:00"), // tarde de la noche 1
  w4: HORA_CDMX("2026-09-09T09:00:00-06:00"), // grabación N1 + aviso noche 2
  w5: HORA_CDMX("2026-09-09T14:00:00-06:00"), // tarde de la noche 2
  w6: HORA_CDMX("2026-09-10T09:00:00-06:00"), // grabación N2 + aviso noche 3
  w7: HORA_CDMX("2026-09-10T14:00:00-06:00"), // tarde de la noche 3
  // El cierre, ya con la oferta presentada
  d1: HORA_CDMX("2026-09-10T22:00:00-06:00"), // al salir de la noche 3
  d2: HORA_CDMX("2026-09-11T09:00:00-06:00"),
  // 🔴 A2..A5 iban a "createdAt + 1, 2, 3 y 4 días" Y "después de que abra la
  // oferta". Para quien se registró el 3, esas cuatro condiciones se cumplían
  // TODAS la noche del 10, y el cron las escupía una cada ~4 h: seis correos el
  // día 11. Ahora cada uno tiene su hora fija dentro de la ventana de cierre,
  // así que el reparto no depende de cuándo entró la persona.
  a2: HORA_CDMX("2026-09-11T13:00:00-06:00"),
  // a2 y a3 quedan pausados en esta cohorte; sus horas se conservan por si se
  // reactivan en enero.
  a3: HORA_CDMX("2026-09-12T10:00:00-06:00"),
  a4: HORA_CDMX("2026-09-12T10:00:00-06:00"),
  a5: HORA_CDMX("2026-09-13T09:00:00-06:00"),
  a6: HORA_CDMX("2026-09-11T18:00:00-06:00"), // mañana sube el precio
  a7: HORA_CDMX("2026-09-12T18:00:00-06:00"), // últimas 6 horas
  d3: HORA_CDMX("2026-09-13T12:00:00-06:00"),
  d4: HORA_CDMX("2026-09-14T10:00:00-06:00"),
  c2: HORA_CDMX("2026-09-14T10:00:00-06:00"), // víspera del arranque
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
  build: (cx: ContextoCorreo) => {
    subject: string;
    html: string;
    /** Versión de texto plano. Sólo la traen los correos "escritos a mano"
     *  (shellPlano); en los demás Brevo genera la suya. */
    texto?: string;
    /** El .ics que va adjunto, si lo lleva. Lo resuelve el cron. */
    adjunto?: "taller" | "curso";
  };
}

// ── Piezas compartidas ─────────────────────────────────────────────────────

const enMinuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const saludo = (lead: CursoLead) =>
  lead.nombre ? `Hola, ${lead.nombre.split(" ")[0]}.` : "Hola.";

/** "Quedan N lugares de 25" — solo cuando la cifra ya empuja de verdad. */
const lineaCupo = (pagados: number) =>
  pagados >= 3
    ? nota(`<strong>${PRECIOS.cupoTotal - pagados} lugares disponibles</strong> de ${PRECIOS.cupoTotal}. La cohorte arranca el ${fechaLarga(FECHAS.inicioCohorte)}.`, C.azulVivo)
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

const firmaWhats = `¿Dudas? Responde a este correo o escríbeme por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.azulVivo};font-weight:500;">+52 489 125 1458</a>. Te contesto yo.`;

/**
 * Envoltorio de correo PLANO: el que parece escrito a mano.
 *
 * Un correo con fondo negro, logo y tres botones es, para una bandeja que no
 * conoce al remitente, la firma exacta de una campaña — y se va a Promociones.
 * Los correos cuyo trabajo es que la persona CONTESTE (la confirmación W0 y
 * las preguntas del cierre) no llevan diseño: fuente del sistema, negro sobre
 * blanco, enlaces subrayados y nada más. La baja sigue estando, porque es
 * obligatoria, pero en una línea de texto como la escribiría una persona.
 *
 * Se manda además `texto` en el `textContent` de Brevo, para que la versión
 * sin HTML sea idéntica y no un revoltijo de etiquetas.
 */
function shellPlano(d: { cuerpo: string[]; paraBaja?: string }): { html: string; texto: string } {
  const enlaces: string[] = [];
  const html = d.cuerpo
    .map((linea) => `<p style="margin:0 0 16px 0;">${linea}</p>`)
    .join("");

  // Versión de texto: los enlaces se sacan a pie de correo, numerados, que es
  // como se leen bien sin HTML.
  const texto = d.cuerpo
    .map((linea) =>
      linea
        .replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g, (_m, href: string, txt: string) => {
          enlaces.push(href);
          return `${txt} [${enlaces.length}]`;
        })
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
    )
    .join("\n\n");

  const pieBaja = d.paraBaja
    ? `Si no quieres saber más de esto, te das de baja aquí: ${linkBaja(d.paraBaja, BASE)}`
    : "";

  return {
    html:
      `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:600px;">` +
      html +
      (pieBaja
        ? `<p style="margin:24px 0 0 0;font-size:12px;color:#888;">Si no quieres saber más de esto, <a href="${linkBaja(d.paraBaja!, BASE)}" style="color:#888;">te das de baja aquí</a>.</p>`
        : "") +
      `</div>`,
    texto: pieBaja
      ? `${texto}\n\n${enlaces.map((u, i) => `[${i + 1}] ${u}`).join("\n")}\n\n--\n${pieBaja}`
      : `${texto}\n\n${enlaces.map((u, i) => `[${i + 1}] ${u}`).join("\n")}`,
  };
}

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

// ── Secuencia T — Que se registren al taller ───────────────────────────────
//
// Con el taller como puerta de entrada, quien deja su correo en /curso y NO
// se registra está a medio camino. Estos tres correos existen para cerrar ese
// hueco, y los tres se apagan solos en cuanto la persona se registra: la
// condición es `!lead.webinar`, así que el momento en que pasa a true toda la
// secuencia deja de existir para ella y arranca la W.
//
// Van ANTES que la A en el registro, y la A queda esperando a que el taller
// termine: si no, el cron alternaría "ven al taller" con "compra el curso" y
// la persona recibiría dos conversaciones distintas el mismo día.

const noRegistrado = ({ lead, ahora }: ContextoCorreo) =>
  !lead.webinar && ahora.getTime() <= FECHAS.aperturaOferta.getTime();

const SEC_TALLER: CorreoCurso[] = [
  {
    id: "T1",
    due: (cx) => noRegistrado(cx),
    build: (cx) => ({
      subject: "Tu programa, y algo mejor que leerlo",
      html: shellCurso({
        preheader: "El programa completo, y tres noches para verlo funcionando",
        eyebrow: "Turismo con IA",
        h1a: "Aquí está tu",
        h1b: "programa",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Te dejo el programa completo de las 4 semanas: qué se construye cada una y con qué sales.`),
          boton(URL_CURSO, "Ver el programa"),
          regla("30px 0 26px 0"),
          titulo("Pero antes de que decidas nada"),
          parrafo(
            `El <strong>${NOCHES_TEXTO}</strong> doy tres noches en vivo, gratis, donde construyo frente a ti lo mismo que le enseño al curso: una página, un agente de WhatsApp y las automatizaciones. Sin diapositivas: comparto pantalla y lo armo, y tú ves cada clic.`
          ),
          parrafo(
            `Ir es la forma más barata de saber si esto es para ti. Y si al final no lo es, te quedas con tres noches de cosas aplicables.`
          ),
          boton(`${BASE}/taller`, "Reservar mi lugar gratis", "dorado"),
          bajoBoton("Es gratis y no pide tarjeta."),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "T2",
    due: (cx) => noRegistrado(cx) && cx.ahora.getTime() >= cx.lead.createdAt.getTime() + 1 * DIA,
    build: (cx) => ({
      subject: "Qué pasa en cada una de las tres noches",
      html: shellCurso({
        preheader: `${NOCHES_TEXTO} · 7 pm · sin costo`,
        eyebrow: "El taller",
        h1a: "Tres noches,",
        h1b: "una hora cada una",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Para que sepas exactamente a qué entras:`),
          ...TALLER_NOCHES.map((n) =>
            [
              barra(`Noche ${n.n} · ${fechaSinDia(n.fecha)}`, n.n === 1 ? 24 : 26),
              parrafo(`<strong style="color:${C.claro};">${n.titulo}</strong>`, "16px 0 10px 0"),
              parrafo(n.puntos.join("<br>"), "0 0 0 0"),
            ].join("")
          ),
          regla("30px 0 24px 0"),
          parrafo(
            `Cada noche trae un workbook, pero va protegido con una contraseña que sólo digo en vivo. Si faltas, te quedas sin él.`
          ),
          boton(`${BASE}/taller`, "Reservar mi lugar gratis", "dorado"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "T3",
    due: (cx) => noRegistrado(cx) && cx.ahora.getTime() >= HORA_CDMX("2026-09-07T18:00:00-06:00"),
    build: (cx) => ({
      subject: "mañana empieza (y no lo repito)",
      html: shellCurso({
        preheader: "La noche 1 es mañana a las 7. Después ya no hay forma de entrar.",
        eyebrow: "Última llamada",
        h1a: "Mañana",
        h1b: "a las 7",
        cuerpo: [
          parrafo(
            `${saludo(cx.lead)} Mañana arranca la noche 1 y no voy a repetir el taller: la siguiente vez que enseñe esto en vivo será con la cohorte de enero.`
          ),
          parrafo(
            `Si te registras hoy, mañana a las 7 me ves abrir mi panel real y construir una página de tours desde cero en 20 minutos.`
          ),
          boton(`${BASE}/taller`, "Reservar mi lugar gratis", "dorado"),
          bajoBoton("Gratis, tres noches, sin tarjeta."),
          nota(
            `Si no es tu momento, está perfecto y no te vuelvo a escribir del taller. Sigo por aquí cuando lo sea.`,
            C.tenue,
            "26px 0 0 0"
          ),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia A — Nurture ──────────────────────────────────────────────────

/**
 * 🔴 La secuencia A NO se le manda a quien vino por el taller.
 *
 * A2..A5 se disparan a los 1, 2, 3 y 4 días del registro **y** después de que
 * abre la oferta (10 sep 20:00). Para alguien que se registró el 3, esas cuatro
 * condiciones se cumplen TODAS a la vez esa noche — y como el cron manda uno
 * por corrida cada ~4 h, recibía A2, A3, A4, A5, A6, D1 y D2: siete correos en
 * 36 horas. Eso no vende, da de baja.
 *
 * Y no hace falta: quien fue al taller ya recibió ocho correos (W0–W7), me vio
 * construir tres noches y escuchó la oferta en vivo. Lo que le toca es el
 * cierre (D1–D4), no el nurture de quien nunca vino. La A se queda para quien
 * pidió el programa y no se registró.
 */
const soloNoTaller = (cx: ContextoCorreo) => !cx.lead.webinar;

const A: CorreoCurso[] = [
  {
    id: "A1",
    // Inmediato (lo intenta la propia ruta; el cron lo repesca si Brevo falló).
    // Quien llegó por el taller gratuito recibe W1 en su lugar.
    due: ({ lead, ahora }) =>
      lead.origen !== "webinar" && ahora.getTime() > FECHAS.aperturaOferta.getTime(),
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
    // 🔴 PAUSADO en la cohorte 1. Del 11 al 13 de septiembre ya salen cuatro
    // correos de fecha límite (D1, A6, A7, D3) más D2 y A5. La cifra de los $500,000 ya la leyó en la landing, en A1, en T1, T2 y T3.
    // Repetirla una sexta vez en la ventana de cierre no añade nada.
    // El texto se conserva tal cual para la cohorte de enero, donde la ventana
    // es más larga: sólo hay que devolverle su condición.
    due: () => false,
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
          nota("No fue suerte ni presupuesto. Fue el sistema. Y el sistema se puede copiar: eso es exactamente lo que hacemos en las 4 semanas.", C.azulVivo),
          ctaReservar(cx, "Ver el programa"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A3",
    // 🔴 PAUSADO en la cohorte 1. Del 11 al 13 de septiembre ya salen cuatro
    // correos de fecha límite (D1, A6, A7, D3) más D2 y A5. Es una historia de embudo alto. En tres días con cuatro avisos de fecha
    // límite, una anécdota no ayuda a decidir: distrae.
    // El texto se conserva tal cual para la cohorte de enero, donde la ventana
    // es más larga: sólo hay que devolverle su condición.
    due: () => false,
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
    // Hora fija, no "N días desde que se registró": si no, se amontonan.
    // Y sigue exigiendo que lleve al menos un día dentro, para no dispararle
    // toda la secuencia a quien entra el último día.
    due: (cx) =>
      soloNoTaller(cx) &&
      cx.ahora.getTime() >= T.a4 &&
      cx.ahora.getTime() <= FECHAS.cierreInscripciones.getTime() &&
      cx.ahora.getTime() >= cx.lead.createdAt.getTime() + 1 * DIA,
    build: (cx) => ({
      subject: "“Manolo, es que yo no sé programar”",
      html: shellCurso({
        preheader: "Tampoco necesitas. Si usas WhatsApp y Excel, puedes.",
        eyebrow: "La objeción",
        h1a: "No necesitas",
        h1b: "saber programar",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Es la duda que más me repiten. Y la entiendo, porque yo tampoco soy ingeniero: estudié estrategia de negocios.`),
          parrafo("La IA escribe el código. Tu trabajo es DIRIGIR: decirle qué necesita tu negocio, revisar que quede bien y pedirle cambios en español. Si sabes explicarle a un empleado nuevo cómo trabajas, sabes hacer esto."),
          parrafo("¿El tiempo? 3 horas a la semana en vivo y unas 2 de práctica. Las grabaciones quedan para siempre, y los sábados revisamos TU proyecto en los talleres abiertos hasta destrabarlo."),
          nota(`${GARANTIA.nombre}: ${GARANTIA.texto}`, C.azulVivo),
          ctaReservar(cx),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  {
    id: "A5",
    // Hora fija, no "N días desde que se registró": si no, se amontonan.
    // Y sigue exigiendo que lleve al menos un día dentro, para no dispararle
    // toda la secuencia a quien entra el último día.
    due: (cx) =>
      soloNoTaller(cx) &&
      cx.ahora.getTime() >= T.a5 &&
      cx.ahora.getTime() <= FECHAS.cierreInscripciones.getTime() &&
      cx.ahora.getTime() >= cx.lead.createdAt.getTime() + 1 * DIA,
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
    due: (cx) =>
      soloNoTaller(cx) &&
      cx.ahora.getTime() >= T.a6 &&
      cx.ahora.getTime() <= FECHAS.finFundador.getTime() &&
      cx.lead.createdAt.getTime() < HORA_CDMX("2026-09-11T12:00:00-06:00"),
    build: (cx) => ({
      subject: "Mañana se acaba el precio de fundador",
      html: shellCurso({
        preheader: `De ${mxnCurso(PRECIOS.fundador)} a ${mxnCurso(PRECIOS.regular)} el ${fechaSinDia(FECHAS.finFundador)}`,
        eyebrow: "Aviso",
        h1a: "Mañana sube",
        h1b: "el precio",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Corto y claro: el precio de fundador de <strong>${mxnCurso(PRECIOS.fundador)}</strong> termina mañana ${fechaSinDia(FECHAS.finFundador)} a las 11:59 pm. Después queda en ${mxnCurso(PRECIOS.regular)}.`),
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
    due: (cx) =>
      soloNoTaller(cx) &&
      cx.ahora.getTime() >= T.a7 &&
      cx.ahora.getTime() <= FECHAS.finFundador.getTime() &&
      cx.lead.createdAt.getTime() < HORA_CDMX("2026-09-12T12:00:00-06:00"),
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
              ? `Te dejo la <a href="${LINKS.grabacionWebinar}" style="color:${C.azulVivo};font-weight:500;">grabación de mi taller gratuito</a>: ahí muestro el sistema real funcionando. Sin costo, sin registro.`
              : "Si quieres, respóndeme con la palabra “grabación” y te mando el taller gratuito donde muestro el sistema real funcionando."
          ),
          parrafo("Cuando abra la siguiente cohorte, serás de los primeros en saberlo."),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
];

// ── Secuencia W — El taller gratuito de 3 noches (8, 9 y 10 de septiembre) ──
//
// Siete envíos. Son los que llenan la sala: un taller con 200 registrados y
// sin recordatorios se llena con 30 personas. El correo de la grabación es el
// que más trabaja, porque la grabación CADUCA y la contraseña del workbook
// sólo se dice en vivo: eso convierte "algún día la veo" en "tengo que estar".

/** Liga del taller, o la promesa de mandarla, según exista o no. */
const botonSala = (texto: string) =>
  LINKS.salaTaller
    ? boton(LINKS.salaTaller, texto, "verde")
    : parrafo("<strong>La liga te llega en un correo aparte y en el grupo de WhatsApp.</strong>");

/** El grupo del taller, donde van las ligas y los workbooks. */
const bloqueGrupo = () =>
  LINKS.grupoTaller
    ? boton(LINKS.grupoTaller, "Entrar al grupo de WhatsApp", "verde")
    : parrafo("<strong>En un momento te mando la liga del grupo de WhatsApp del taller.</strong>");

/** Recordatorio de media hora antes, para las noches 2 y 3. */
function avisoNoche(id: string, n: 2 | 3, cuando: number): CorreoCurso {
  const noche = TALLER_NOCHES[n - 1];
  return {
    id,
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= cuando && lead.createdAt.getTime() < cuando,
    build: (cx) => ({
      subject: n === 3 ? "Última noche: hoy a las 7" : "Noche 2: hoy a las 7",
      html: shellCurso({
        preheader: `${noche.titulo} · 7:00 pm hora del centro`,
        eyebrow: `Noche ${n}`,
        h1a: n === 3 ? "Última noche:" : "Noche 2:",
        h1b: "hoy a las 7",
        cuerpo: [
          parrafo(
            n === 3
              ? `${saludo(cx.lead)} Hoy cerramos. Confirmación, cobro y recordatorio funcionando solos, más el panel. Y al final te cuento cómo hacemos esto mismo con tu negocio en cuatro semanas: quédate hasta ahí, porque esa parte no queda en la grabación.`
              : `${saludo(cx.lead)} Ayer armamos el mapa. Hoy armamos el vendedor: construyo un agente de WhatsApp de principio a fin, en vivo.`
          ),
          botonSala("Entrar al taller"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  };
}

/** La grabación de anoche, que caduca en 24 horas. */
function correoGrabacion(id: string, nocheVista: 1 | 2, cuando: number): CorreoCurso {
  const siguiente = TALLER_NOCHES[nocheVista];
  return {
    id,
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= cuando && lead.createdAt.getTime() < cuando,
    build: (cx) => ({
      subject: "La grabación de anoche (se cae en 24 horas)",
      html: shellCurso({
        preheader: `Hoy a las 7: ${siguiente.titulo}`,
        eyebrow: `Noche ${nocheVista} · grabación`,
        h1a: "La grabación",
        h1b: "de anoche",
        cuerpo: [
          parrafo(
            LINKS.grabacionWebinar
              ? `${saludo(cx.lead)} Aquí está la grabación de la noche ${nocheVista}. La dejo arriba hasta mañana a esta hora y después la bajo.`
              : `${saludo(cx.lead)} La grabación de la noche ${nocheVista} está en el grupo de WhatsApp del taller. La dejo arriba hasta mañana a esta hora y después la bajo.`
          ),
          parrafo(
            `Una cosa: la contraseña del workbook <strong>“${TALLER_NOCHES[nocheVista - 1].workbook}”</strong> la dije en vivo y no la escribo en ningún lado. Si no estuviste, hoy la vuelvo a decir.`
          ),
          regla(),
          parrafo(`Hoy a las 7:00 pm, noche ${nocheVista + 1}: <strong>${siguiente.titulo}</strong>.`, "0 0 6px 0"),
          botonSala("Entrar al taller"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  };
}

const W: CorreoCurso[] = [
  {
    /**
     * W0 — la confirmación de seis líneas, en texto plano, que sale AL
     * INSTANTE del formulario.
     *
     * Antes W1 hacía dos trabajos a la vez: confirmar (transaccional) y pedir
     * tres acciones (marketing). Separarlos da dos cosas: (1) la primera
     * bandeja que toca este remitente recibe un correo que parece escrito a
     * mano, que es lo que entra a Principal, y (2) W1 llega después ya
     * "buscado", porque W0 dice exactamente qué asunto buscar. Es el patrón
     * de Iman y la razón por la que sus correos no se van a Promociones.
     */
    id: "W0",
    due: ({ lead }) => lead.webinar,
    build: (cx) => {
      const { html, texto } = shellPlano({
        cuerpo: [
          `${saludo(cx.lead)}`,
          `Confirmado: tienes lugar en el taller. Son tres noches, ${NOCHES_TEXTO}, a las 7:00 pm hora del centro.`,
          `En un rato te llega otro correo mío con el asunto <strong>“[Acción requerida] Tu lugar en el taller”</strong>. Ese trae la liga, el grupo de WhatsApp y tres cosas que te van a tomar dos minutos. Búscalo; si no lo ves en Principal, mira en Promociones y arrástralo a Principal.`,
          `Si me respondes cualquier cosa a este correo —aunque sea “ok”— te llego siempre a la bandeja de entrada. Lo leo yo.`,
          `Nos vemos el ${fechaLarga(TALLER_NOCHES[0].fecha)}.`,
          `Manolo<br>Huasteca Potosina Tours`,
        ],
        paraBaja: cx.lead.email,
      });
      return { subject: "Confirmado: tu lugar en el taller", html, texto };
    },
  },
  {
    id: "W1",
    // 20 minutos después de W0: dos aperturas separadas, no dos correos
    // golpeados en el mismo minuto.
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= lead.createdAt.getTime() + 20 * 60 * 1000,
    build: (cx) => ({
      subject: "[Acción requerida] Tu lugar en el taller: haz estas 3 cosas",
      html: shellCurso({
        preheader: `${NOCHES_TEXTO}, 7 pm · tres noches en vivo, sin costo`,
        eyebrow: "Taller gratuito",
        h1a: "Tres noches,",
        h1b: "en vivo",
        cuerpo: [
          parrafo(
            `${saludo(cx.lead)} Ya quedó tu lugar en <strong>Turismo con IA en vivo</strong>: ${NOCHES_TEXTO}, a las 7:00 pm hora del centro, por Google Meet.`
          ),
          parrafo(
            "No voy a darte teoría. Voy a construir frente a ti, clic por clic, lo mismo que me dio más de " +
              mxnCurso(CIFRAS.total4m) +
              " en cuatro meses sin pagar un solo anuncio."
          ),
          regla(),
          parrafo("<strong>Para que no te pierdas nada, haz esto hoy:</strong>", "0 0 10px 0"),
          parrafo(
            "<strong>1) Entra al grupo de WhatsApp del taller.</strong> Ahí mando la liga de cada noche, los workbooks y el material extra. No lo comparto en ningún otro lado.",
            "0 0 10px 0"
          ),
          bloqueGrupo(),
          parrafo(
            `<strong>2) Aparta las tres noches.</strong> Cada una trae un workbook, pero está protegido con contraseña, y la contraseña sólo la digo en vivo. Si faltas, te quedas sin él.`,
            "18px 0 10px 0"
          ),
          boton(`${BASE}/curso/taller.ics`, "Agregar las 3 noches a mi calendario", "dorado"),
          bajoBoton("Va con la liga de la sala dentro y un aviso 30 minutos antes de cada noche."),
          parrafo(
            "<strong>3) Saca tu número.</strong> La mayoría de las agencias no pierde clientes por precio: los pierde por contestar tarde. Contesta 3 preguntas y te digo cuántos pesos se te van cada mes por WhatsApps sin responder.",
            "18px 0 10px 0"
          ),
          boton(`${BASE}/curso/calculadora?ref=registrado`, "Ver cuánto pierdo", "dorado"),
          regla(),
          parrafo("Haz estas tres cosas hoy y llegas listo al martes.", "0 0 10px 0"),
          /* La petición de respuesta no es un adorno: una sola contestación le
             dice a Gmail que este remitente es conocido, y a partir de ahí los
             seis correos del taller le llegan a Principal a esa persona. */
          parrafo(
            "Y cuando termines las tres, <strong>respóndeme “listo”</strong> a este correo. Con eso sé que te llegó, y además te aseguras de que los siguientes no se te vayan a Promociones.",
            "0 0 0 0"
          ),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
      adjunto: "taller",
    }),
  },
  {
    id: "W2",
    due: ({ lead, ahora }) =>
      lead.webinar && ahora.getTime() >= T.w2 && lead.createdAt.getTime() < T.w2,
    build: (cx) => ({
      subject: "hoy a las 7",
      html: shellCurso({
        preheader: TALLER_NOCHES[0].titulo,
        eyebrow: "Noche 1",
        h1a: "Hoy es",
        h1b: "la noche 1",
        cuerpo: [
          parrafo(
            `${saludo(cx.lead)} Abro mi panel real de Huasteca Potosina Tours, te enseño los números en pantalla y construyo una página de tours desde cero en 20 minutos, mientras miras.`
          ),
          parrafo("7:00 pm, hora del centro. Trae papel: al final doy la contraseña del primer workbook."),
          botonSala("Entrar al taller"),
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
      subject: "Es hoy: noche 1 a las 7",
      html: shellCurso({
        preheader: "La noche 1 arranca a las 7:00 pm hora del centro",
        eyebrow: "Hoy",
        h1a: "Noche 1,",
        h1b: "hoy a las 7",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Es hoy a las 7:00 pm, hora del centro. Conéctate unos minutos antes; empiezo puntual y la primera media hora es la que arma el mapa.`),
          botonSala("Entrar al taller"),
        ].join(""),
        paraBaja: cx.lead.email,
      }),
    }),
  },
  correoGrabacion("W4", 1, T.w4),
  avisoNoche("W5", 2, T.w5),
  correoGrabacion("W6", 2, T.w6),
  avisoNoche("W7", 3, T.w7),
];

// ── Secuencia D — Cierre de cohorte (11–14 sep) ────────────────────────────

const D: CorreoCurso[] = [
  {
    id: "D1",
    due: ({ ahora }) => ahora.getTime() >= T.d1 && ahora.getTime() <= FECHAS.cierreInscripciones.getTime(),
    build: (cx) => ({
      subject: "Cerramos el domingo",
      html: shellCurso({
        preheader: `El ${fechaLarga(FECHAS.inicioCohorte)} arrancamos; no se puede entrar a medias`,
        eyebrow: "Cierre",
        h1a: "El domingo cerramos",
        h1b: "inscripciones",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} El ${fechaLarga(FECHAS.inicioCohorte)} a las 7 pm arranca la cohorte, y como cada semana construye sobre la anterior, no se puede entrar a medias: las inscripciones cierran el <strong>${fechaLarga(FECHAS.cierreInscripciones)} a las 11:59 pm</strong>.`),
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
              ? `Te regalo la <a href="${LINKS.grabacionWebinar}" style="color:${C.azulVivo};font-weight:500;">grabación del taller</a> donde muestro el sistema completo. Es tuya, sin costo.`
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
  LINKS.salaSesiones
    ? boton(LINKS.salaSesiones, "Guardar la liga de Google Meet", "verde")
    : parrafo("<strong>La liga de Google Meet te llega por correo antes de la primera sesión.</strong>"),
  barra("La comunidad"),
  parrafo(
    LINKS.comunidadWhatsApp
      ? `Entra hoy mismo al grupo de WhatsApp de alumnos: ahí resolvemos dudas entre sesiones y ahí compartes tus avances.`
      : "En estos días te llega la invitación al grupo de WhatsApp de alumnos: ahí resolvemos dudas entre sesiones."
  ),
  ...(LINKS.comunidadWhatsApp ? [boton(LINKS.comunidadWhatsApp, "Entrar a la comunidad", "whatsapp")] : []),
  barra("Tu tarea antes del martes"),
  parrafo("Escribe en una hoja, a mano si quieres: qué vendes, a quién, tus 3 productos estrella con precios, y las 5 preguntas que más te repiten los clientes. Con esa hoja construimos TODO lo demás. No necesitas instalar nada todavía: eso lo hacemos juntos en la sesión 1."),
  nota(`${GARANTIA.nombre}: ${GARANTIA.texto}`, C.azulVivo),
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
          parrafo(`${saludo(cx.lead)} Hoy a las <strong>${horaCorta(SESIONES[0].fecha)}</strong> nos vemos en Google Meet. Sesión 1: ${SESIONES[0].tema.toLowerCase()}.`),
          LINKS.salaSesiones
            ? boton(LINKS.salaSesiones, "Entrar a la sesión", "verde")
            : parrafo("<strong>La liga de Google Meet va en un correo aparte hoy mismo.</strong>"),
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
        preheader: "Nos vemos en Google Meet a las 7:00 pm (hora del centro)",
        eyebrow: `Sesión ${s.n} de 8`,
        h1a: "Hoy a las 7,",
        h1b: "en vivo",
        cuerpo: [
          parrafo(`${saludo(cx.lead)} Hoy a las <strong>${horaCorta(s.fecha)}</strong>: <strong>${s.tema}</strong>.`),
          LINKS.salaSesiones
            ? boton(LINKS.salaSesiones, "Entrar a la sesión", "verde")
            : parrafo("<strong>Usa la misma liga de Google Meet de siempre.</strong>"),
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
// El orden manda: el cron recorre esta lista y manda el PRIMERO que toque.
// B primero (un pago a medias es la señal más caliente), luego el taller,
// luego el empujón a registrarse, el cierre y al final la nutrición larga.
export const CORREOS_PROSPECTO: CorreoCurso[] = [...B, ...W, ...SEC_TALLER, ...D, ...A];

export function correoPorId(id: string): CorreoCurso | undefined {
  return [...C_SERIE, ...B, ...W, ...SEC_TALLER, ...D, ...A].find((c) => c.id === id);
}
