import type { Locale } from "./config";

/**
 * Textos de los CORREOS transaccionales.
 *
 * Hasta ahora todos salían en español aunque el cliente hubiera reservado desde
 * `/en`: compraba en inglés y recibía la confirmación en un idioma que no lee.
 *
 * El idioma viaja con la reserva (`locale`) desde el checkout hasta el correo.
 * Donde no se puede saber —un lead viejo, una cotización sin origen— se cae al
 * español, que es de donde viene la mayor parte del tráfico.
 *
 * ⚠️ Las cifras y los datos operativos (teléfono, horarios, porcentajes) se
 * copian tal cual. Ninguno es nuevo.
 */

export interface EmailMessages {
  /** Formato de fecha larga por idioma. */
  fechaLocale: string;
  moneda: (n: string) => string;

  carrito: {
    tipos: Record<"cotizacion" | "recordatorio1" | "recordatorio2" | "recordatorio3", {
      subject: (t: string) => string;
      titulo: string;
      intro: string;
      cta: string;
    }>;
    vehiculos: (n: number) => string;
    adultos: (n: number) => string;
    de6a10: (n: number) => string;
    menoresDe6: (n: number) => string;
    menores: (n: number) => string;
    unaPersona: string;
    eligio: (opcion: string) => string;
    tuViaje: string;
    recorridos: (n: number) => string;
    grupoDe: (n: number) => string;
    total: string;
    apartasHoy: (pct: number) => string;
    traslado: (ciudad: string) => string;
    idaYVuelta: (pax: number) => string;
    nochesHuespedes: (noches: number, huespedes: number) => string;
    ctaSub: string;
    garantias: string[];
    prefieresChat: string;
    yaNoInteresa: string;
  };

  confirmacion: {
    subject: (folio: string) => string;
    preheader: string;
    eyebrow: string;
    h1a: string;
    h1b: string;
    intro: string;
    hola: string;
    lugarApartado: string;
    numeroConfirmacion: string;
    toursReservados: (n: number) => string;
    grupoDe: (texto: string) => string;
    tourReservado: string;
    fechaRecorrido: string;
    porConfirmar: string;
    pasamosPorTi: string;
    participantes: string;
    reservaGrupo: string;
    hospedajeIncluido: string;
    noches: (n: number) => string;
    habitaciones: (n: number) => string;
    totalDelTour: string;
    codigoAplicado: (codigo: string, pct: number) => string;
    anticipoPagado: string;
    saldoPendiente: string;
    liquidado: string;
    metodoPago: string;
    todoIncluido: string;
    proximosPasos: string;
    antesDeTuRecorrido: string;
    puntoSalida: string;
    queLlevar: string;
    queLlevarTexto: string;
    confirmaWhatsapp: string;
    enviaTuNumero: string;
    alSubir: string;
    presentaAlGuia: string;
    mientrasEsperas: string;
    descubreMas: string;
    verTodos: string;
    preguntas: string;
    idPago: (id: string) => string;
    ubicacion: string;
    guiasCert: string;
    derechos: (anio: number) => string;
    personas: (n: number) => string;
    unaPersona: string;
    adultos: (n: number) => string;
    menores: (n: number) => string;
    de6a10: (n: number) => string;
    menoresDe6: (n: number) => string;
    vehiculos: (n: number) => string;
    pickupDefault: string;
  };


  cotizacion: {
    subject: (folio: string) => string;
    tituloTab: (folio: string) => string;
    eyebrow: string;
    h1a: string;
    h1b: string;
    preview: (nombre: string) => string;
    hola: string;
    intro1: string;
    validez: string;
    intro2: string;
    numeroCotizacion: string;
    validaHoy: string;
    toursCotizados: string;
    grupoDe: (n: number) => string;
    totalCotizado: string;
    todoIncluido: string;
    notas: string;
    comoConfirmar: string;
    soloDinos: string;
    whatsappDirecto: string;
    escribenosFolio: string;
    reservarEnLinea: string;
    pagaConTarjeta: string;
    btnWhatsapp: string;
    btnReservar: string;
    vence: string;
    hospedajeIncluido: string;
    nochesHotel: string;
    ninos: (n: number) => string;
    hospedajeTitulo: string;
  };

  paquete: {
    subject: (folio: string) => string;
    titulo: string;
    saludo: (nombre: string) => string;
    confirmacion: string;
    paquete: string;
    fechaTentativa: string;
    personas: string;
    precio: string;
    pagoInicial: (pct: number) => string;
    saldoPendiente: string;
    notaSaldo: string;
    notaLiquidado: string;
    dudas: string;
  };
}

const ES: EmailMessages = {
  fechaLocale: "es-MX",
  moneda: (n) => `$${n} MXN`,
  carrito: {
    tipos: {
      cotizacion: {
        subject: (t) => `Tu cotización para ${t} 🌿`,
        titulo: "¡Aquí está tu cotización!",
        intro: "Guardamos tu selección para que la reserves cuando quieras. Tu lugar no está apartado hasta que confirmes — resérvalo en un clic:",
        cta: "Reservar mi lugar",
      },
      recordatorio1: {
        subject: (t) => `Tu tour ${t} te está esperando 🌿`,
        titulo: "¿Seguimos con tu aventura?",
        intro: "Notamos que empezaste tu reserva pero no la terminaste. Te guardamos tu cotización — puedes retomarla justo donde la dejaste:",
        cta: "Terminar mi reserva",
      },
      recordatorio2: {
        subject: (t) => `Últimos detalles para tu ${t}`,
        titulo: "Tu lugar sigue disponible",
        intro: "Antes de que se llene la fecha, aquí tienes tu cotización lista. Recuerda: cancelación gratuita hasta 48 h antes, sin riesgo.",
        cta: "Reservar ahora",
      },
      recordatorio3: {
        subject: (t) => `¿Apartamos tu lugar para ${t}?`,
        titulo: "Aparta tu lugar con el 30 %",
        intro: "No hace falta que pagues todo hoy: puedes apartar tu lugar con el 30 % y liquidar el resto el día del tour. Cancelación gratuita hasta 48 h antes. Si prefieres organizarlo por WhatsApp, escríbenos al +52 489 125 1458.",
        cta: "Apartar con el 30 %",
      },
    },
    vehiculos: (n) => `${n} vehículo${n !== 1 ? "s" : ""}`,
    adultos: (n) => `${n} adulto${n !== 1 ? "s" : ""}`,
    de6a10: (n) => `${n} de 6 a 10 años`,
    menoresDe6: (n) => `${n} menor${n !== 1 ? "es" : ""} de 6`,
    menores: (n) => `${n} menor${n !== 1 ? "es" : ""}`,
    unaPersona: "1 persona",
    eligio: (opcion) => ` · Eligió: ${opcion}`,
    tuViaje: "Tu viaje",
    recorridos: (n) => ` · ${n} recorridos`,
    grupoDe: (n) => `Grupo de <strong style="color:#1a2e1a">${n} persona${n !== 1 ? "s" : ""}</strong>`,
    total: "Total",
    apartasHoy: (pct) => `Apartas hoy con el ${pct} %`,
    traslado: (ciudad) => `🚐 Traslado ${ciudad} → Xilitla`,
    idaYVuelta: (pax) => `Ida y vuelta · ${pax} pasajero${pax !== 1 ? "s" : ""}`,
    nochesHuespedes: (noches, huespedes) =>
      `${noches} noche${noches !== 1 ? "s" : ""} · ${huespedes} huésped${huespedes !== 1 ? "es" : ""}`,
    ctaSub: "Se abre con todo lo que elegiste, listo para pagar.",
    garantias: [
      "✓ Cancelación gratuita hasta 48 h antes",
      "✓ Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles",
      "✓ Guías certificados NOM-09 SECTUR · grupos pequeños",
    ],
    prefieresChat: "¿Prefieres organizarlo por chat? Escríbenos al",
    yaNoInteresa: "Si ya no te interesa, ignora este correo y no te volveremos a escribir por esta reserva.",
  },

  confirmacion: {
    subject: (folio) => `Tour confirmado — ${folio}`,
    preheader: "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: "Confirmación de Tour",
    h1a: "¡Tu aventura está",
    h1b: "confirmada!",
    intro: "Prepárate para vivir la Huasteca Potosina como nunca antes. Aquí tienes todos los detalles de tu recorrido.",
    hola: "¡Hola,",
    lugarApartado: "Tu lugar está apartado. Nuestro equipo de guías certificados ya conoce tu reserva y estará listo para darte la mejor experiencia.",
    numeroConfirmacion: "Número de Confirmación",
    toursReservados: (n) => `Tours reservados (${n})`,
    grupoDe: (texto) => `Grupo de ${texto}`,
    tourReservado: "Tour Reservado",
    fechaRecorrido: "Fecha del Recorrido",
    porConfirmar: "Por confirmar",
    pasamosPorTi: "Pasamos por ti entre 8:00 y 9:00 AM",
    participantes: "Participantes",
    reservaGrupo: "Reserva confirmada para tu grupo",
    hospedajeIncluido: "🏨 Hospedaje incluido",
    noches: (n) => `${n} noche${n !== 1 ? "s" : ""}`,
    habitaciones: (n) => ` · ${n} habitaciones`,
    totalDelTour: "Total del tour",
    codigoAplicado: (codigo, pct) => `✓ Código ${codigo} aplicado — ${pct}% de descuento`,
    anticipoPagado: "Anticipo pagado",
    saldoPendiente: "Saldo pendiente",
    liquidado: "✓ Liquidado",
    metodoPago: "Método de pago:",
    todoIncluido: "Todo incluido en tu tour",
    proximosPasos: "Próximos pasos",
    antesDeTuRecorrido: "Antes de tu recorrido",
    puntoSalida: "🌅 Punto de Salida",
    queLlevar: "👟 Qué Llevar",
    queLlevarTexto: "Ropa cómoda, calzado cerrado, traje de baño, protector solar biodegradable.",
    confirmaWhatsapp: "📱 Confirma por WhatsApp",
    enviaTuNumero: "Envía tu número:",
    alSubir: "🆔 Al Subir al Transporte",
    presentaAlGuia: "Presenta este número al guía:",
    mientrasEsperas: "Mientras esperas",
    descubreMas: "Descubre más tours de la Huasteca",
    verTodos: "Ver Todos los Tours",
    preguntas: "¿Tienes preguntas?",
    idPago: (id) => `ID de Pago: ${id}`,
    ubicacion: "Xilitla &middot; San Luis Potosí &middot; México",
    guiasCert: "Guías certificados NOM-09 SECTUR · +8 años de experiencia",
    derechos: (anio) => `© ${anio} Tours Huasteca Potosina · Todos los derechos reservados`,
    personas: (n) => `${n} personas`,
    unaPersona: "1 persona",
    adultos: (n) => `${n} adulto${n !== 1 ? "s" : ""}`,
    menores: (n) => `${n} menor${n !== 1 ? "es" : ""}`,
    de6a10: (n) => `${n} de 6 a 10 años`,
    menoresDe6: (n) => `${n} menor${n !== 1 ? "es" : ""} de 6`,
    vehiculos: (n) => `${n} vehículo${n !== 1 ? "s" : ""}`,
    pickupDefault: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles. Confirma tu dirección exacta por WhatsApp.",
  },


  cotizacion: {
    subject: (folio) => `Tu cotización — ${folio}`,
    tituloTab: (folio) => `Tu cotización — ${folio}`,
    eyebrow: "Tu cotización está lista",
    h1a: "Aquí tienes tu",
    h1b: "propuesta de viaje",
    preview: (nombre) => `Hola ${nombre}, preparamos esta cotización con todos los detalles para que puedas planear tu aventura en la Huasteca Potosina.`,
    hola: "Hola,",
    intro1: "Con gusto te compartimos los detalles y el precio de tu recorrido. Esta cotización es válida por",
    validez: "48 horas",
    intro2: ". Para confirmar tu lugar, contáctanos por WhatsApp o reserva directamente desde el sitio.",
    numeroCotizacion: "Número de Cotización",
    validaHoy: "⏳ Válida por 48 horas a partir de hoy",
    toursCotizados: "Tours cotizados",
    grupoDe: (n) => `Grupo de ${n} persona${n !== 1 ? "s" : ""}`,
    totalCotizado: "Total Cotizado",
    todoIncluido: "Todo incluido en el precio",
    notas: "Notas",
    comoConfirmar: "¿Cómo confirmar?",
    soloDinos: "Solo dinos que vas y apartamos tu lugar",
    whatsappDirecto: "📱 WhatsApp directo",
    escribenosFolio: "Escríbenos tu número de cotización:",
    reservarEnLinea: "🌐 Reservar en línea",
    pagaConTarjeta: "Paga con tarjeta de forma rápida y segura",
    btnWhatsapp: "WhatsApp +52 489 125 1458",
    btnReservar: "Reservar y pagar en línea",
    vence: "Esta cotización vence en 48 horas · Sujeta a disponibilidad",
    hospedajeIncluido: "Hospedaje incluido",
    nochesHotel: "🏨 Noches de hotel",
    ninos: (n) => `${n} niño${n !== 1 ? "s" : ""}`,
    hospedajeTitulo: "Habitación",
  },

  paquete: {
    subject: (folio) => `Tu paquete está reservado — ${folio}`,
    titulo: "¡Tu paquete está reservado! 🎉",
    saludo: (nombre) => `Hola ${nombre}, gracias por reservar con nosotros. Aquí está tu confirmación:`,
    confirmacion: "Confirmación",
    paquete: "Paquete",
    fechaTentativa: "Fecha tentativa",
    personas: "Personas",
    precio: "Precio del paquete",
    pagoInicial: (pct) => `Pago inicial (${pct}%)`,
    saldoPendiente: "Saldo pendiente",
    notaSaldo: "El saldo restante se cubre antes o durante tu llegada. Te contactaremos por WhatsApp para coordinar fechas y detalles.",
    notaLiquidado: "Tu paquete está pagado al 100%. Te contactaremos por WhatsApp para coordinar los detalles.",
    dudas: "¿Dudas? Escríbenos por WhatsApp al +52 489 125 1458.",
  },
};

const EN: EmailMessages = {
  fechaLocale: "en-US",
  moneda: (n) => `$${n} MXN`,
  carrito: {
    tipos: {
      cotizacion: {
        subject: (t) => `Your quote for ${t} 🌿`,
        titulo: "Here's your quote!",
        intro: "We've saved your selection so you can book whenever you're ready. Your place isn't held until you confirm — book it in one click:",
        cta: "Book my place",
      },
      recordatorio1: {
        subject: (t) => `Your ${t} tour is waiting 🌿`,
        titulo: "Shall we carry on with your adventure?",
        intro: "We noticed you started your booking but didn't finish it. We've saved your quote — you can pick up right where you left off:",
        cta: "Finish my booking",
      },
      recordatorio2: {
        subject: (t) => `Last details for your ${t}`,
        titulo: "Your place is still available",
        intro: "Before the date fills up, here's your quote ready to go. Remember: free cancellation up to 48 h before, no risk.",
        cta: "Book now",
      },
      recordatorio3: {
        subject: (t) => `Shall we hold your place for ${t}?`,
        titulo: "Hold your place with 30 %",
        intro: "You don't have to pay it all today: you can hold your place with 30 % and settle the rest on the day of the tour. Free cancellation up to 48 h before. If you'd rather sort it out on WhatsApp, message us at +52 489 125 1458.",
        cta: "Hold it with 30 %",
      },
    },
    vehiculos: (n) => `${n} vehicle${n !== 1 ? "s" : ""}`,
    adultos: (n) => `${n} adult${n !== 1 ? "s" : ""}`,
    de6a10: (n) => `${n} aged 6 to 10`,
    menoresDe6: (n) => `${n} under 6`,
    menores: (n) => `${n} child${n !== 1 ? "ren" : ""}`,
    unaPersona: "1 person",
    eligio: (opcion) => ` · Chose: ${opcion}`,
    tuViaje: "Your trip",
    recorridos: (n) => ` · ${n} tours`,
    grupoDe: (n) => `A group of <strong style="color:#1a2e1a">${n} ${n !== 1 ? "people" : "person"}</strong>`,
    total: "Total",
    apartasHoy: (pct) => `You hold it today with ${pct} %`,
    traslado: (ciudad) => `🚐 Transfer ${ciudad} → Xilitla`,
    idaYVuelta: (pax) => `Round trip · ${pax} passenger${pax !== 1 ? "s" : ""}`,
    nochesHuespedes: (noches, huespedes) =>
      `${noches} night${noches !== 1 ? "s" : ""} · ${huespedes} guest${huespedes !== 1 ? "s" : ""}`,
    ctaSub: "It opens with everything you chose, ready to pay.",
    garantias: [
      "✓ Free cancellation up to 48 h before",
      "✓ We pick you up at your lodging in Xilitla or Ciudad Valles",
      "✓ NOM-09 SECTUR certified guides · small groups",
    ],
    prefieresChat: "Prefer to sort it out by chat? Message us at",
    yaNoInteresa: "If you're no longer interested, ignore this email and we won't write to you again about this booking.",
  },

  confirmacion: {
    subject: (folio) => `Tour confirmed — ${folio}`,
    preheader: "Huasteca Potosina · San Luis Potosí · Mexico",
    eyebrow: "Tour Confirmation",
    h1a: "Your adventure is",
    h1b: "confirmed!",
    intro: "Get ready to experience the Huasteca Potosina like never before. Here are all the details of your tour.",
    hola: "Hi,",
    lugarApartado: "Your place is held. Our team of certified guides already knows about your booking and will be ready to give you the best possible experience.",
    numeroConfirmacion: "Confirmation Number",
    toursReservados: (n) => `Tours booked (${n})`,
    grupoDe: (texto) => `A group of ${texto}`,
    tourReservado: "Tour Booked",
    fechaRecorrido: "Tour Date",
    porConfirmar: "To be confirmed",
    pasamosPorTi: "We pick you up between 8:00 and 9:00 AM",
    participantes: "Participants",
    reservaGrupo: "Booking confirmed for your group",
    hospedajeIncluido: "🏨 Lodging included",
    noches: (n) => `${n} night${n !== 1 ? "s" : ""}`,
    habitaciones: (n) => ` · ${n} rooms`,
    totalDelTour: "Tour total",
    codigoAplicado: (codigo, pct) => `✓ Code ${codigo} applied — ${pct}% off`,
    anticipoPagado: "Deposit paid",
    saldoPendiente: "Outstanding balance",
    liquidado: "✓ Paid in full",
    metodoPago: "Payment method:",
    todoIncluido: "Everything included in your tour",
    proximosPasos: "What happens next",
    antesDeTuRecorrido: "Before your tour",
    puntoSalida: "🌅 Pickup Point",
    queLlevar: "👟 What to Bring",
    queLlevarTexto: "Comfortable clothes, closed shoes, swimwear, biodegradable sunscreen.",
    confirmaWhatsapp: "📱 Confirm on WhatsApp",
    enviaTuNumero: "Send us your number:",
    alSubir: "🆔 When You Board",
    presentaAlGuia: "Show this number to your guide:",
    mientrasEsperas: "While you wait",
    descubreMas: "Discover more Huasteca tours",
    verTodos: "See All Tours",
    preguntas: "Any questions?",
    idPago: (id) => `Payment ID: ${id}`,
    ubicacion: "Xilitla &middot; San Luis Potosí &middot; Mexico",
    guiasCert: "NOM-09 SECTUR certified guides · 8+ years of experience",
    derechos: (anio) => `© ${anio} Huasteca Potosina Tours · All rights reserved`,
    personas: (n) => `${n} people`,
    unaPersona: "1 person",
    adultos: (n) => `${n} adult${n !== 1 ? "s" : ""}`,
    menores: (n) => `${n} child${n !== 1 ? "ren" : ""}`,
    de6a10: (n) => `${n} aged 6 to 10`,
    menoresDe6: (n) => `${n} under 6`,
    vehiculos: (n) => `${n} vehicle${n !== 1 ? "s" : ""}`,
    pickupDefault: "We pick you up at your lodging in Xilitla or Ciudad Valles. Confirm your exact address on WhatsApp.",
  },


  cotizacion: {
    subject: (folio) => `Your quote — ${folio}`,
    tituloTab: (folio) => `Your quote — ${folio}`,
    eyebrow: "Your quote is ready",
    h1a: "Here's your",
    h1b: "trip proposal",
    preview: (nombre) => `Hi ${nombre}, we've put together this quote with all the details so you can plan your adventure in the Huasteca Potosina.`,
    hola: "Hi,",
    intro1: "We're glad to share the details and the price of your tour. This quote is valid for",
    validez: "48 hours",
    intro2: ". To confirm your place, message us on WhatsApp or book directly on the site.",
    numeroCotizacion: "Quote Number",
    validaHoy: "⏳ Valid for 48 hours from today",
    toursCotizados: "Tours quoted",
    grupoDe: (n) => `A group of ${n} ${n !== 1 ? "people" : "person"}`,
    totalCotizado: "Quoted Total",
    todoIncluido: "Everything included in the price",
    notas: "Notes",
    comoConfirmar: "How to confirm",
    soloDinos: "Just tell us you're coming and we'll hold your place",
    whatsappDirecto: "📱 WhatsApp us directly",
    escribenosFolio: "Send us your quote number:",
    reservarEnLinea: "🌐 Book online",
    pagaConTarjeta: "Pay by card, quick and secure",
    btnWhatsapp: "WhatsApp +52 489 125 1458",
    btnReservar: "Book and pay online",
    vence: "This quote expires in 48 hours · Subject to availability",
    hospedajeIncluido: "Lodging included",
    nochesHotel: "🏨 Hotel nights",
    ninos: (n) => `${n} child${n !== 1 ? "ren" : ""}`,
    hospedajeTitulo: "Room",
  },

  paquete: {
    subject: (folio) => `Your package is booked — ${folio}`,
    titulo: "Your package is booked! 🎉",
    saludo: (nombre) => `Hi ${nombre}, thank you for booking with us. Here's your confirmation:`,
    confirmacion: "Confirmation",
    paquete: "Package",
    fechaTentativa: "Approximate date",
    personas: "People",
    precio: "Package price",
    pagoInicial: (pct) => `Initial payment (${pct}%)`,
    saldoPendiente: "Outstanding balance",
    notaSaldo: "The remaining balance is settled before or during your arrival. We'll contact you on WhatsApp to arrange dates and details.",
    notaLiquidado: "Your package is paid in full. We'll contact you on WhatsApp to arrange the details.",
    dudas: "Questions? Message us on WhatsApp at +52 489 125 1458.",
  },
};

export function getEmails(locale: Locale): EmailMessages {
  return locale === "en" ? EN : ES;
}

/** Normaliza cualquier valor guardado a un Locale válido. */
export function emailLocale(v: unknown): Locale {
  return v === "en" ? "en" : "es";
}
