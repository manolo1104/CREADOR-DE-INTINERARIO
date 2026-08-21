import type { Locale } from "./config";

/**
 * Diccionario del MOTOR DE RESERVAS (catálogo, carrito, pago y confirmación).
 *
 * Vive aparte de `messages.ts` —que es el chrome compartido— por la misma razón
 * por la que el copy de las páginas de marketing vive en sus propios archivos:
 * son cientos de cadenas de un solo flujo y mezclarlas volvía `messages.ts`
 * ilegible.
 *
 * La interfaz obliga a que `en` tenga EXACTAMENTE las mismas claves que `es`:
 * una pantalla de pago a medio traducir es peor que una en español entero.
 *
 * Las cadenas con número o nombre dentro son funciones, no plantillas partidas
 * en trozos: el inglés no ordena las palabras como el español y concatenar
 * fragmentos ("Ya tienes" + nombre + "ese día") produce frases rotas.
 */

export interface BookingMessages {
  // ── Catálogo (/reservar) ──────────────────────────────────────────────────
  catalogo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    eyebrow: string;
    h1: string;
    /** Lleva <strong> alrededor del 30 % y de la cancelación. */
    introApartas: string;
    introY: string;
    introMedio: string;
    introCancelas: string;
    resenasGoogle: string;
    verlas: string;
    confianza: { t: string; s: string }[];
    pasos: { n: string; t: string; s: string }[];
    todosLosRecorridos: string;
    conteo: (n: number, desde: string) => string;
    ordenadosPorReservas: string;
    viajesVariosDias: string;
    viajesVariosDiasSub: string;
    paquete: string;
    diasNoches: (dias: number, noches: number) => string;
    apartasDesde: string;
    reservar: string;
    /** Etiqueta del botón flotante que aparece en todo el sitio. */
    reservarTourFlotante: string;
    detalles: string;
    sinRiesgoTitulo: string;
    sinRiesgo: string[];
    pagoSeguro: string;
    ayudaTitulo: string;
    ayudaTexto: string;
    verMiTourIdeal: string;
    preguntarWhatsapp: string;
    waAyuda: string;
  };

  // ── Tarjeta de tour del catálogo ──────────────────────────────────────────
  tarjeta: {
    masReservado: string;
    porPersona: string;
    porVehiculo: string;
    personas: (n: number) => string;
    noches: (n: number) => string;
    porNoche: (precio: string) => string;
    nochesGratisLinea: (n: number, ahorro: string) => string;
    antesDePagarCola: string;
    apartaCon: (monto: string) => string;
    agregar: string;
    enTuCarrito: string;
    verDetalles: string;
    horas: string;
    hastaPersonas: (n: number) => string;
    apartasConLabel: string;
    vistaRapida: string;
    vistaRapidaDe: (tour: string) => string;
    informacionDe: (tour: string) => string;
    cerrar: string;
    maxN: (n: number) => string;
    rangoPersonas: (min: number, max: number) => string;
    resenas: (n: number) => string;
    dificultad: Record<string, string>;
    unidadHoras: string;
    unidadH: string;
    queSeVisita: string;
    incluye: string;
    apartasCon: (monto: string) => string;
    precioUnidadYAnticipo: (unidad: string, anticipo: string) => string;
    reservarEsteRecorrido: string;
    verFichaCompleta: string;
  };

  // ── Carrito (/reservar/carrito) ───────────────────────────────────────────
  carrito: {
    vacioTitulo: string;
    vacioTexto: string;
    verRecorridos: string;
    seguirEligiendo: string;
    pasos: [string, string, string];
    tuViaje: string;
    conteo: (recorridos: number, dias: number) => string;
    compartirTitulo: string;
    compartirTexto: (n: number, total: string) => string;
    eligeElDia: string;
    eligeElDiaN: (n: number) => string;
    tuItinerario: string;

    // Renglón
    quitar: (nombre: string) => string;
    fechaDe: (nombre: string) => string;
    eligeLaFecha: string;
    diaOcupado: string;
    yaTienesEseDia: (nombre: string) => string;
    chocaMismoDia: (nombre: string) => string;
    rutaDe: (nombre: string) => string;
    vehiculoDe: (nombre: string) => string;
    menosUnidades: string;
    masUnidades: string;
    unidades: (n: number) => string;
    adultos: string;
    adulto: string;
    de6a10: string;
    menoresDe6: string;
    menorDe6: string;
    menos: (etiqueta: string, tour: string) => string;
    mas: (etiqueta: string, tour: string) => string;
    soloMayores: string;
    saleAPartirDeIntro: string;
    saleAPartirDe: (n: number) => string;
    vanMenos: string;
    escribenosYLosSumamos: string;
    waGrupoMinimo: (personas: number, tour: string) => string;
    porPersonaExtra: string;
    quitarAddOn: string;
    agregarAddOn: string;
    cuantosLoHacen: string;
    queIncluyeYSeVisita: string;
    seVisita: string;
    incluye: string;
    duracionGrupo: (horas: number, min: number, max: number) => string;

    // Agregar otro
    agregarOtroRecorrido: string;
    /** Escasez real, calculada contra las reservas pagadas. */
    quedanLugares: (quedan: number, cupo: number) => string;
    salidaLlena: string;
    faltanParaSalir: (faltan: number, minimo: number) => string;
    /** Gancho al descuento por varios recorridos, bajo el botón de agregar. */
    gancho2doRecorrido: string;
    gancho3erRecorrido: string;
    ahorroMultiple: (pesos: string) => string;
    yaTienesTodos: string;

    // Logística
    pasamosPorTi: string;
    pasamosPorTiFuerte1: string;
    pasamosPorTiFuerte2: string;
    pasamosPorTiCola: string;
    porPersona: string;
    porVehiculo: string;
    personas: (n: number) => string;
    noches: (n: number) => string;
    porNoche: (precio: string) => string;
    nochesGratisLinea: (n: number, ahorro: string) => string;
    antesDePagarCola: string;
    salimosEntre: string;
    salimosEntreFuerte: string;
    cancelacionGratuita: string;

    // Hospedaje
    hospedajeTitulo: string;
    hospedajeSub: string;
    elegida: string;
    vistaMontana: string;
    hastaPersonasDesde: (max: number, precio: string) => string;
    duermenAqui: string;
    menosHuespedes: (hab: string) => string;
    masHuespedes: (hab: string) => string;
    verFotosYDetalles: string;
    eligeAlMenosUna: string;
    entrada: string;
    salida: string;
    huespedesEnHabitaciones: (huespedes: number, habs: number) => string;
    salidaDespuesDeEntrada: string;
    resumenNoches: (noches: number, huespedes: number, habs: number) => string;
    nochesGratis: (n: number, ahorro: string) => string;
    terceraNocheGratisAviso: string;

    // Traslado
    trasladoTitulo: string;
    trasladoSub: string;
    desdeRedondo: (precio: string) => string;
    cuantosViajan: string;
    menosPasajeros: string;
    masPasajeros: string;
    trasladoLinea: (ciudad: string, pax: number) => string;
    trasladoGrupoGrande: (pax: number) => string;
    escribenosPorWhatsapp: string;
    trasladoSigueSin: string;
    waTrasladoGrande: (pax: number, ciudad: string) => string;
    trasladoPorVehiculo: string;

    // Datos y pago
    nombreCompleto: string;
    correoElectronico: string;
    whatsappOpcional: string;
    dondeTeHospedas: string;
    faltanDatos: (n: number, primero: string) => string;
    llevameAhi: string;
    unMomento: string;
    continuarAlPago: string;
    continuar: string;
    pagasHoy: string;
    necesitamosNombreCorreo: string;
    noSePudoIniciar: string;
    noSePudoConectar: string;
    yaTienesEseDiaError: (nombre: string) => string;

    // Guardar cotización
    cotizacionEnviada: string;
    todaviaLoPiensas: string;
    tuCorreoPlaceholder: string;
    enviar: string;
    sinCompromiso: string;
    correoInvalido: string;
    noSePudoGuardar: string;
    sinConexion: string;

    // Apartado + pago
    apartadoActivo: string;
    apartadoActivoHabitacion: string;
    apartadoVencido: string;
    procesando: string;
    pagar: (monto: string) => string;
    pagoCifrado: (saldo: string) => string;
    prefieresTransferencia: string;
    apartarPorWhatsapp: string;
    mandamosDatos: string;
    errorPago: string;
    pagoEnProceso: string;
    waPagoAlterno: {
      intro: string;
      hospedaje: (hab: string, noches: number, huespedes: number, total: string) => string;
      terceraGratis: (ahorro: string) => string;
      totalViaje: (total: string) => string;
      anticipo: (monto: string) => string;
      saldo: (monto: string) => string;
      aNombreDe: (nombre: string) => string;
      pendiente: string;
      correo: (correo: string) => string;
      meHospedoEn: (lugar: string) => string;
      linea: (tour: string, fecha: string, personas: number, subtotal: string) => string;
    };
    waRescate: {
      intro: string;
      sinFecha: string;
      hospedaje: (habs: string, noches: number) => string;
      totalEstimado: (total: string) => string;
    };
    waDudaAntesDePagar: string;

    // Prueba social + FAQ
    resenasGoogle: string;
    verlas: string;
    credenciales: string;
    /** Franja de confianza alta del carrito (arriba del itinerario). */
    confianzaCancelas: string;
    /** Recibe el % que se cobra hoy: 100 en un solo día, 30 en varios. */
    confianzaPago: (pct: number) => string;
    /** Vacío en español; en inglés avisa de que las reseñas van en su idioma original. */
    resenasEnEspanol: string;
    antesDePagar: string;
    otraDuda: string;
    escribenosWhatsapp: string;
    faq: { q: string; a: string }[];

    // Notas que van al equipo (correo + panel). Se mandan SIEMPRE en español:
    // las lee el equipo en Xilitla, no el cliente.
    notas: {
      recogida: (lugar: string) => string;
      reservaVarios: (n: number) => string;
      eligio: (tour: string, opcion: string) => string;
      /** Actividad opcional contratada: hay que operarla y cobrarla. */
      extras: (tour: string, lista: string) => string;
      hospedaje: (hab: string, noches: number, huespedes: number, entrada: string, salida: string) => string;
      traslado: (ciudad: string, pax: number) => string;
      idiomaCliente: string;
    };
    trasladoRenglon: (ciudad: string) => string;
    hospedajeRenglon: (hab: string) => string;
    recorridosResumen: (n: number) => string;
  };

  // ── Resumen de reserva (aside) ────────────────────────────────────────────
  resumen: {
    titulo: string;
    faltaLaFecha: string;
    elegiste: (opcion: string) => string;
    loQueVaIncluido: string;
    salidaEntre: string;
    salidaEntreFuerte: string;
    confirmamosHora: string;
    pasamosPorTi: string;
    pasamosPorTiFuerte: string;
    cancelasGratis: string;
    fotosYVideo: string;
    totalDelViaje: string;
    sumaDeRecorridos: string;
    descuentoVariosRecorridos: string;
    pagasHoy: (pct: number) => string;
    saldoDia: string;
  };

  // ── Calendario ────────────────────────────────────────────────────────────
  calendario: {
    dias: [string, string, string, string, string, string, string];
    proximosDias: string;
    oEligeOtraFecha: string;
    mesAnterior: string;
    mesSiguiente: string;
    cerrar: string;
    quitarLaFecha: string;
    placeholder: string;
    titulo: string;
    fechaSeleccionada: string;
    salidaEntre: string;
    hoy: string;
    manana: string;
  };

  // ── Galería de habitación ─────────────────────────────────────────────────
  galeria: {
    cerrar: string;
    fotoAnterior: string;
    fotoSiguiente: string;
    verFoto: (n: number) => string;
    hastaPersonas: (n: number) => string;
    contador: (i: number, total: number) => string;
    etiquetaHabitacion: string;
    etiquetaAreas: string;
    altHotel: string;
    altTerraza: string;
    altAreas: string;
  };

  // ── Compartir ─────────────────────────────────────────────────────────────
  compartir: {
    compartir: string;
    trabajando: string;
    copiado: string;
    error: string;
  };

  // ── Popup de rescate ──────────────────────────────────────────────────────
  rescate: {
    cerrar: string;
    titulo: string;
    texto: string;
    cta: string;
    sigoRevisando: string;
  };

  // ── Barras de carrito ─────────────────────────────────────────────────────
  barra: {
    verCarrito: string;
    recorridos: (n: number) => string;
    resumen: (n: number, total: string) => string;
    apartasCon: (monto: string) => string;
    anticipo: string;
    agregado: string;
    enTuCarrito: string;
    carrito: string;
    yaEstaEnCarrito: (tour: string) => string;
    agregarAlCarrito: (tour: string) => string;
    verTuCarrito: (n: number) => string;
    mxnPersona: string;
    mxnVehiculo: string;
    agregar: string;
    desde: string;
    preguntarWhatsapp: string;
  };

  // ── Confirmación ──────────────────────────────────────────────────────────
  confirmacion: {
    cargando: string;
    cargandoSub: string;
    verTodosLosTours: string;
    titulo: string;
    saludo: (nombre: string, correo: string) => string;
    numeroConfirmacion: string;
    copiar: string;
    copiado: string;
    presentaAlGuia: string;
    resumenTitulo: string;
    tuItinerario: string;
    tour: string;
    fecha: string;
    horaPorAcordar: string;
    participantes: string;
    personas: (n: number) => string;
    adultosNinos: (adultos: number, ninos: number) => string;
    duracion: string;
    horasAprox: (n: number) => string;
    depositoPagado: string;
    totalPagado: string;
    anticipoPagado: (pct: number, saldo: string) => string;
    queSigue: string;
    pasos: { num: string; title: string; text: string }[];
    confirmarWhatsapp: string;
    compartirReserva: string;
    enlaceCopiado: string;
    agregarCalendario: string;
    verMasTours: string;
    problemas: string;
    oAl: string;
    waConfirmo: string;
    waParticipantes: (n: number) => string;
    waConfirmacion: (folio: string) => string;
    waFecha: (fecha: string) => string;
    compartirTexto: (tour: string, url: string) => string;
    compartirTitulo: string;
    icsDescripcion: (folio: string, personas: number) => string;
  };

  // ── Validación del carrito ────────────────────────────────────────────────
  validacion: {
    faltaFecha: string;
    faltaFechaLargo: (nombre: string) => string;
    choque: (otro: string) => string;
    choqueLargo: (nombre: string, otro: string) => string;
    faltaEleccion: string;
    faltaEleccionLargo: (nombre: string) => string;
    grupoMinimo: (n: number) => string;
    grupoMinimoLargo: (nombre: string, n: number) => string;
  };

  // ── Cotización de habitaciones ────────────────────────────────────────────
  hotel: {
    faltanNoches: string;
    faltaHabitacion: string;
    noEncontrada: string;
    admiteHasta: (hab: string, max: number) => string;
    servicios: string[];
    vistas: Record<string, string>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const es: BookingMessages = {
  catalogo: {
    metaTitle: "Reservar tour en la Huasteca Potosina — Aparta con el 30 %",
    metaDescription:
      "Aparta con el 30 % y cancela gratis hasta 48 h antes. Transporte desde tu hospedaje, guía NOM-09, entradas y seguro de viaje incluidos. Liquidas el día del tour.",
    ogTitle: "Reservar tour en la Huasteca Potosina",
    ogDescription: "Aparta con el 30 %. Cancelación gratuita hasta 48 h antes.",
    eyebrow: "Motor de reservas",
    h1: "Elige tu recorrido y aparta tu lugar",
    introApartas: "No pagas todo hoy: ",
    introY: "apartas con el 30 % si son varios días",
    introMedio: " y liquidas el día del tour. Si algo cambia, ",
    introCancelas: "cancelas gratis hasta 48 h antes",
    resenasGoogle: "492 reseñas en Google",
    verlas: "Verlas →",
    confianza: [
      { t: "Apartas con el 30 %", s: "En viajes de varios días. Uno solo se paga completo." },
      { t: "Cancelación gratuita", s: "Hasta 48 h antes, sin preguntas" },
      { t: "Grupos pequeños", s: "Guías certificados NOM-09" },
      { t: "Pasamos por ti", s: "En tu hospedaje de Xilitla o Cd. Valles" },
    ],
    pasos: [
      { n: "1", t: "Elige tus recorridos", s: "Puedes juntar varios días en un solo carrito y pagarlos de una vez." },
      { n: "2", t: "Pago seguro con tarjeta", s: "Eliges fecha y personas. Los viajes de varios días se apartan con el 30 %." },
      { n: "3", t: "Liquidas el día del tour", s: "En efectivo o tarjeta, al llegar." },
    ],
    todosLosRecorridos: "Todos los recorridos",
    conteo: (n, desde) => `${n} recorridos · desde ${desde} MXN`,
    ordenadosPorReservas: " · ordenados por los más reservados",
    viajesVariosDias: "Viajes de varios días",
    viajesVariosDiasSub: "Con hospedaje, desayunos y traslados incluidos",
    paquete: "Paquete",
    diasNoches: (dias, noches) => `${dias} días · ${noches} noches`,
    apartasDesde: "Apartas desde",
    reservar: "Reservar",
    reservarTourFlotante: "Reservar tour",
    detalles: "Detalles",
    sinRiesgoTitulo: "Reservar aquí no tiene riesgo",
    sinRiesgo: [
      "Cancelación gratuita hasta 48 h antes del tour, sin preguntas y sin penalización.",
      "Hoy solo pagas el 30 %. El resto lo liquidas el día del recorrido.",
      "El precio que ves es el final: transporte, entradas, guía, equipo y seguro incluidos.",
      "Si el clima obliga a suspender, se reprograma o se devuelve el anticipo.",
      "Pago con tarjeta procesado por Stripe. Nosotros no guardamos tus datos bancarios.",
      "¿Dudas antes de pagar? Te contestamos por WhatsApp y reservas cuando quieras.",
    ],
    pagoSeguro: "Pago seguro · Stripe",
    ayudaTitulo: "¿No sabes cuál elegir?",
    ayudaTexto:
      "Dinos cuántos días tienes y con quién viajas, y te decimos qué recorrido te conviene. Sin compromiso.",
    verMiTourIdeal: "Ver mi tour ideal",
    preguntarWhatsapp: "Preguntar por WhatsApp",
    waAyuda: "Hola, quiero reservar un recorrido en la Huasteca. ¿Me ayudan a elegir?",
  },

  tarjeta: {
    masReservado: "El más reservado",
    porPersona: "por persona",
    porVehiculo: "por vehículo",
    personas: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,
    noches: (n) => `${n} noche${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/noche`,
    nochesGratisLinea: (n, ahorro) => `${n} noche${n > 1 ? "s" : ""} gratis — te ahorras ${ahorro}`,
    antesDePagarCola: " antes de pagar.",
    apartaCon: (monto) => `Apartas con ${monto}`,
    agregar: "Agregar",
    enTuCarrito: "En tu carrito",
    verDetalles: "Ver detalles",
    horas: "horas",
    hastaPersonas: (n) => `hasta ${n} personas`,
    apartasConLabel: "Apartas con",
    vistaRapida: "Vista rápida",
    vistaRapidaDe: (tour) => `Vista rápida de ${tour}`,
    informacionDe: (tour) => `Información de ${tour}`,
    cerrar: "Cerrar",
    maxN: (n) => `máx. ${n}`,
    rangoPersonas: (min, max) => (min > 1 ? `${min}–${max} personas` : `Máx. ${max}`),
    resenas: (n) => `· ${n} reseñas`,
    dificultad: { baja: "Fácil", media: "Moderado", alta: "Avanzado" },
    unidadHoras: " horas",
    unidadH: " h",
    queSeVisita: "Qué se visita",
    incluye: "Incluye",
    apartasCon: (monto) => `Apartas con ${monto}`,
    precioUnidadYAnticipo: (unidad, anticipo) => `MXN ${unidad} · apartas con ${anticipo}`,
    reservarEsteRecorrido: "Reservar este recorrido",
    verFichaCompleta: "Ver ficha completa",
  },

  carrito: {
    vacioTitulo: "Tu carrito está vacío",
    vacioTexto: "Elige tus recorridos y agrégalos aquí: puedes apartar varios días en un solo pago.",
    verRecorridos: "Ver los recorridos",
    seguirEligiendo: "Seguir eligiendo recorridos",
    pasos: ["Tu viaje", "Tus datos", "Pago"],
    tuViaje: "Tu viaje",
    conteo: (recorridos, dias) =>
      `${recorridos} ${recorridos === 1 ? "recorrido" : "recorridos"} · ${dias} ${dias === 1 ? "día" : "días"}`,
    compartirTitulo: "Mi viaje a la Huasteca Potosina",
    compartirTexto: (n, total) => `Armé este viaje: ${n} recorrido${n !== 1 ? "s" : ""} · ${total} MXN`,
    eligeElDia: "Elige el día",
    eligeElDiaN: (n) => `Elige el día (${n})`,
    tuItinerario: "Tu itinerario",

    quitar: (nombre) => `Quitar ${nombre}`,
    fechaDe: (nombre) => `Fecha de ${nombre}`,
    eligeLaFecha: "Elige la fecha",
    diaOcupado: "Día ocupado",
    yaTienesEseDia: (nombre) => `Ya tienes "${nombre}" ese día`,
    chocaMismoDia: (nombre) => `Ya tienes "${nombre}" ese día. Cada recorrido ocupa el día completo.`,
    rutaDe: (nombre) => `Ruta de ${nombre}`,
    vehiculoDe: (nombre) => `Vehículo de ${nombre}`,
    menosUnidades: "Menos unidades",
    masUnidades: "Más unidades",
    unidades: (n) => `${n} unidad${n > 1 ? "es" : ""}`,
    adultos: "adultos",
    adulto: "adulto",
    de6a10: "de 6 a 10 años",
    menoresDe6: "menores de 6",
    menorDe6: "menor de 6",
    menos: (etiqueta, tour) => `Menos ${etiqueta} en ${tour}`,
    mas: (etiqueta, tour) => `Más ${etiqueta} en ${tour}`,
    soloMayores: "Este recorrido es solo para mayores de 10 años.",
    saleAPartirDeIntro: "Este recorrido sale a partir de ",
    saleAPartirDe: (n) => `${n} personas`,
    vanMenos: "¿Van menos?",
    escribenosYLosSumamos: "Escríbenos y los sumamos a otro grupo",
    waGrupoMinimo: (personas, tour) =>
      `Hola, somos ${personas} y nos interesa ${tour}. ¿Nos pueden sumar a otro grupo?`,
    porPersonaExtra: "por persona",
    quitarAddOn: "Quitar",
    agregarAddOn: "Agregar",
    cuantosLoHacen: "¿Cuántos lo hacen?",
    queIncluyeYSeVisita: "Qué incluye y qué se visita",
    seVisita: "Se visita",
    incluye: "Incluye",
    duracionGrupo: (horas, min, max) =>
      `${horas} horas aprox. · grupo de ${min > 1 ? `${min} a ` : "hasta "}${max} personas`,

    agregarOtroRecorrido: "＋ Agregar otro recorrido",
    quedanLugares: (quedan, cupo) =>
      quedan === 1 ? `Queda 1 lugar de ${cupo} para ese día` : `Quedan ${quedan} lugares de ${cupo} para ese día`,
    salidaLlena: "Esa salida ya está llena — elige otro día",
    faltanParaSalir: (faltan, minimo) =>
      faltan === 1
        ? `Falta 1 persona para confirmar esta salida (mínimo ${minimo})`
        : `Faltan ${faltan} personas para confirmar esta salida (mínimo ${minimo})`,
    gancho2doRecorrido: "La mayoría de nuestros viajeros hace 2 o 3 recorridos",
    gancho3erRecorrido: "Te armamos el itinerario día por día",
    ahorroMultiple: (pesos: string) => `Ahorras ${pesos} por llevar varios recorridos`,
    yaTienesTodos: "Ya tienes todos los recorridos en el carrito.",

    pasamosPorTi: " —hotel, hostal, cabaña o Airbnb— en ",
    pasamosPorTiFuerte1: "Pasamos por ti a tu hospedaje",
    pasamosPorTiFuerte2: "Xilitla o en Ciudad Valles",
    pasamosPorTiCola: ", y te regresamos al terminar. No necesitas hospedarte con nosotros.",
    porPersona: "por persona",
    porVehiculo: "por vehículo",
    personas: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,
    noches: (n) => `${n} noche${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/noche`,
    nochesGratisLinea: (n, ahorro) => `${n} noche${n > 1 ? "s" : ""} gratis — te ahorras ${ahorro}`,
    antesDePagarCola: " antes de pagar.",
    salimosEntre: ". La hora exacta de tu recogida te la confirmamos por WhatsApp al reservar.",
    salimosEntreFuerte: "Salimos entre 8:00 y 9:00 AM",
    cancelacionGratuita: "Cancelación gratuita hasta 48 h antes, con reembolso completo.",

    hospedajeTitulo: "¿Quieres que también te hospedemos?",
    hospedajeSub:
      "En nuestro Hotel Paraíso Encantado, en Xilitla. Es opcional: pasamos por ti aunque te quedes en otro lado.",
    elegida: "Elegida",
    vistaMontana: "Vista a la montaña",
    hastaPersonasDesde: (max, precio) => `hasta ${max} personas · desde ${precio}/noche`,
    duermenAqui: "Duermen aquí",
    menosHuespedes: (hab) => `Menos huéspedes en ${hab}`,
    masHuespedes: (hab) => `Más huéspedes en ${hab}`,
    verFotosYDetalles: "Ver fotos y detalles",
    eligeAlMenosUna: "Elige al menos una habitación.",
    entrada: "Entrada",
    salida: "Salida",
    huespedesEnHabitaciones: (huespedes, habs) =>
      `${huespedes} huésped${huespedes !== 1 ? "es" : ""} en ${habs} habitación${habs !== 1 ? "es" : ""}`,
    salidaDespuesDeEntrada: "La salida tiene que ser al menos un día después de la entrada.",
    resumenNoches: (noches, huespedes, habs) =>
      `${noches} noche${noches > 1 ? "s" : ""} · ${huespedes} huésped${huespedes > 1 ? "es" : ""} · ${habs} habitación${habs > 1 ? "es" : ""}`,
    nochesGratis: (n, ahorro) =>
      `🎁 ${n === 1 ? "La 3.ª noche va gratis" : `${n} noches gratis`}: te ahorras ${ahorro}.`,
    terceraNocheGratisAviso: "Si te quedas una noche más, la 3.ª va gratis — pagarías lo mismo.",

    trasladoTitulo: "¿Te llevamos desde tu ciudad?",
    trasladoSub: "Traslado privado de ida y vuelta hasta Xilitla. Es opcional: si vienes en tu coche, sáltalo.",
    desdeRedondo: (precio) => `desde ${precio} redondo`,
    cuantosViajan: "¿Cuántos viajan?",
    menosPasajeros: "Menos pasajeros",
    masPasajeros: "Más pasajeros",
    trasladoLinea: (ciudad, pax) => `${ciudad} → Xilitla · ida y vuelta · ${pax} pasajero${pax !== 1 ? "s" : ""}`,
    trasladoGrupoGrande: (pax) =>
      `Nuestra unidad más grande llega a 12 pasajeros. Para ${pax} lo cotizamos aparte — `,
    escribenosPorWhatsapp: "escríbenos por WhatsApp",
    trasladoSigueSin: ". Tu reserva sigue sin el traslado.",
    waTrasladoGrande: (pax, ciudad) =>
      `Hola, somos ${pax} y queremos traslado de ${ciudad} a Xilitla. ¿Me cotizan?`,
    trasladoPorVehiculo:
      "El precio es por vehículo, no por persona. Te recogemos en tu domicilio y te regresamos al terminar.",

    nombreCompleto: "Nombre completo *",
    correoElectronico: "Correo electrónico *",
    whatsappOpcional: "WhatsApp (opcional)",
    dondeTeHospedas: "¿Dónde te hospedas? (Xilitla o Cd. Valles)",
    faltanDatos: (n, primero) => `Faltan ${n} datos: ${primero.toLowerCase()}…`,
    llevameAhi: "Llévame ahí →",
    unMomento: "Un momento…",
    continuarAlPago: "Continuar al pago →",
    continuar: "Continuar →",
    pagasHoy: "Pagas hoy (30 %)",
    necesitamosNombreCorreo: "Necesitamos tu nombre y tu correo para mandarte la confirmación.",
    noSePudoIniciar: "No se pudo iniciar el pago.",
    noSePudoConectar: "No se pudo conectar. Revisa tu internet e intenta de nuevo.",
    yaTienesEseDiaError: (nombre) =>
      `Ya tienes "${nombre}" ese día. Cada recorrido ocupa el día completo: elige otra fecha.`,

    cotizacionEnviada: "✓ Te mandamos tu cotización. El carrito te espera en ese correo.",
    todaviaLoPiensas: "¿Todavía lo estás pensando? Te mandamos tu cotización y la retomas cuando quieras.",
    tuCorreoPlaceholder: "tucorreo@ejemplo.com",
    enviar: "Enviar",
    sinCompromiso: "Sin compromiso. Necesita al menos un recorrido con fecha.",
    correoInvalido: "Escribe un correo válido.",
    noSePudoGuardar: "No se pudo guardar. Intenta de nuevo.",
    sinConexion: "No se pudo conectar. Revisa tu internet.",

    apartadoActivo: "Te apartamos tus lugares por",
    apartadoActivoHabitacion: "Te apartamos tus lugares y la habitación por",
    apartadoVencido:
      "Se acabó el apartado. Puedes seguir pagando, pero vuelve a revisar el resumen por si algo cambió.",
    procesando: "Procesando…",
    pagar: (monto) => `Pagar ${monto} MXN`,
    pagoCifrado: (saldo) => `Pago cifrado con Stripe · El saldo de ${saldo} lo liquidas el día del primer recorrido`,
    prefieresTransferencia: "¿Prefieres transferencia SPEI u OXXO?",
    apartarPorWhatsapp: "Apartar por WhatsApp",
    mandamosDatos: "Te mandamos los datos y apartamos tus lugares al recibir el comprobante.",
    errorPago: "Error al procesar el pago. Intenta de nuevo.",
    pagoEnProceso: "Tu pago está en proceso. En cuanto el banco lo confirme te llega el correo.",
    waPagoAlterno: {
      intro: "Hola, quiero apartar este viaje pero prefiero pagar por transferencia SPEI u OXXO.",
      hospedaje: (hab, noches, huespedes, total) =>
        `Hospedaje: ${hab} — ${noches} noche(s) — ${huespedes} huésped(es) — ${total}`,
      terceraGratis: (ahorro) => `(ya con la 3.ª noche gratis: ahorro de ${ahorro})`,
      totalViaje: (total) => `Total del viaje: ${total} MXN`,
      anticipo: (monto) => `Anticipo (30 %): ${monto} MXN`,
      saldo: (monto) => `Saldo el día del primer recorrido: ${monto} MXN`,
      aNombreDe: (nombre) => `A nombre de: ${nombre}`,
      pendiente: "(pendiente)",
      correo: (correo) => `Correo: ${correo}`,
      meHospedoEn: (lugar) => `Me hospedo en: ${lugar}`,
      linea: (tour, fecha, personas, subtotal) => `• ${tour} — ${fecha} — ${personas} persona(s) — ${subtotal}`,
    },
    waRescate: {
      intro: "Hola, estoy armando mi viaje en la página y tengo una duda:",
      sinFecha: " — (sin fecha)",
      hospedaje: (habs, noches) => `• Hospedaje: ${habs}${noches ? ` — ${noches} noche(s)` : ""}`,
      totalEstimado: (total) => `Total estimado: ${total} MXN`,
    },
    waDudaAntesDePagar: "Hola, estoy por pagar mi carrito y tengo una pregunta.",

    resenasGoogle: "492 reseñas en Google",
    verlas: "Verlas →",
    credenciales: "+10,000 viajeros desde 2019 · Premio Arival 2023 · Guías certificados NOM-09 SECTUR",
    confianzaCancelas: "Cancelas gratis hasta 48 h antes",
    confianzaPago: (pct) => pct >= 100
      ? "Pago seguro con Stripe · Pagas el total y no queda saldo"
      : `Pago seguro con Stripe · Apartas con el ${pct} %`,
    resenasEnEspanol: "",
    antesDePagar: "Antes de pagar",
    otraDuda: "¿Te quedó otra duda?",
    escribenosWhatsapp: "Escríbenos por WhatsApp",
    faq: [
      {
        q: "¿Cuánto pago hoy y cuándo el resto?",
        a: "Hoy apartas con el 30 % del total. El saldo lo liquidas el día del primer recorrido, en efectivo o con tarjeta, al llegar.",
      },
      {
        q: "¿Puedo cancelar?",
        a: "Sí. Cancelación gratuita hasta 48 horas antes, con reembolso completo y sin preguntas.",
      },
      {
        q: "¿De dónde salimos y a qué hora?",
        a: "No hay un punto de salida único: pasamos por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, y te regresamos al terminar. Salimos entre las 8:00 y las 9:00 AM, y la hora exacta de tu recogida la confirmamos por WhatsApp al reservar.",
      },
      {
        q: "¿Necesito hospedarme con ustedes?",
        a: "No. Pasamos por ti donde te estés quedando, sea nuestro hotel o cualquier otro.",
      },
      {
        q: "¿Qué pasa si llueve?",
        a: "Operamos con lluvia ligera. Si hay tormenta eléctrica, reprogramamos sin costo.",
      },
      {
        q: "¿Puedo pagar varios recorridos juntos?",
        a: "Es justo lo que hace este carrito: apartas todos tus días con un solo pago y un solo folio, en vez de reservar uno por uno.",
      },
    ],

    notas: {
      recogida: (lugar) => `Recogida: ${lugar}`,
      reservaVarios: (n) => `Reserva de ${n} recorridos en un solo pago.`,
      eligio: (tour, opcion) => `${tour} — eligió: ${opcion}`,
      extras: (tour, lista) => `${tour} — ACTIVIDAD EXTRA CONTRATADA: ${lista}`,
      hospedaje: (hab, noches, huespedes, entrada, salida) =>
        `Hospedaje: ${hab}, ${noches} noche(s), ${huespedes} huésped(es)${entrada ? ` — entrada ${entrada}` : ""}${salida ? `, salida ${salida}` : ""}.`,
      traslado: (ciudad, pax) =>
        `TRASLADO: ${ciudad} → Xilitla, ida y vuelta, ${pax} pasajero(s). Falta acordar hora y domicilio de recogida.`,
      idiomaCliente: "",
    },
    trasladoRenglon: (ciudad) => `Traslado ${ciudad} → Xilitla (ida y vuelta)`,
    hospedajeRenglon: (hab) => `Hospedaje · ${hab}`,
    recorridosResumen: (n) => `${n} recorridos`,
  },

  resumen: {
    titulo: "Resumen de tu reserva",
    faltaLaFecha: "Falta la fecha",
    elegiste: (opcion) => `Elegiste: ${opcion}`,
    loQueVaIncluido: "Lo que va incluido",
    salidaEntre: "Salida entre ",
    salidaEntreFuerte: "8:00 y 9:00 AM",
    confirmamosHora: ". Confirmamos tu hora exacta por WhatsApp.",
    pasamosPorTi: "Pasamos por ti a tu hospedaje en ",
    pasamosPorTiFuerte: "Xilitla o Ciudad Valles",
    cancelasGratis: "Cancelas gratis hasta 48 h antes, con reembolso completo.",
    fotosYVideo: "Fotos y video del recorrido, entregados el mismo día.",
    totalDelViaje: "Total del viaje",
    sumaDeRecorridos: "Suma de los recorridos",
    descuentoVariosRecorridos: "Descuento por varios recorridos",
    pagasHoy: (pct) => `Pagas hoy (${pct} %)`,
    saldoDia: "Saldo el día del primer recorrido",
  },

  calendario: {
    dias: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"],
    proximosDias: "Próximos días",
    oEligeOtraFecha: "O elige otra fecha",
    mesAnterior: "Mes anterior",
    mesSiguiente: "Mes siguiente",
    cerrar: "Cerrar",
    quitarLaFecha: "Quitar la fecha",
    placeholder: "Toca para seleccionar fecha",
    titulo: "Selecciona la fecha",
    fechaSeleccionada: "Fecha seleccionada:",
    salidaEntre: " · Salida entre 8:00 y 9:00 AM",
    hoy: "Hoy",
    manana: "Mañana",
  },

  galeria: {
    cerrar: "Cerrar galería",
    fotoAnterior: "Foto anterior",
    fotoSiguiente: "Foto siguiente",
    verFoto: (n) => `Ver foto ${n}`,
    hastaPersonas: (n) => `Hasta ${n} persona${n !== 1 ? "s" : ""}`,
    contador: (i, total) => `${i} de ${total}`,
    etiquetaHabitacion: "La habitación",
    etiquetaAreas: "Áreas comunes",
    altHotel: "Hotel Paraíso Encantado",
    altTerraza: "Terraza del hotel",
    altAreas: "Áreas del hotel",
  },

  compartir: {
    compartir: "Compartir",
    trabajando: "Preparando…",
    copiado: "¡Enlace copiado!",
    error: "No se pudo, intenta de nuevo",
  },

  rescate: {
    cerrar: "Cerrar",
    titulo: "¿Te quedó alguna duda?",
    texto:
      "Escríbenos y lo resolvemos en un par de mensajes: fechas, cuánta gente cabe, o pagar por transferencia u OXXO si prefieres no usar tarjeta.",
    cta: "Escríbenos por WhatsApp",
    sigoRevisando: "Sigo revisando",
  },

  barra: {
    verCarrito: "Ver carrito",
    recorridos: (n) => `${n} recorrido${n !== 1 ? "s" : ""}`,
    resumen: (n, total) => `${n} ${n === 1 ? "recorrido" : "recorridos"} · ${total} MXN`,
    apartasCon: (monto) => `Apartas con ${monto}`,
    anticipo: "Anticipo",
    agregado: "Agregado",
    enTuCarrito: "En tu carrito",
    carrito: "Carrito",
    yaEstaEnCarrito: (tour) => `${tour} ya está en tu carrito — ir al carrito`,
    agregarAlCarrito: (tour) => `Agregar ${tour} al carrito`,
    verTuCarrito: (n) => `Ver tu carrito (${n})`,
    mxnPersona: "MXN/persona",
    mxnVehiculo: "MXN/vehículo",
    agregar: "Agregar",
    desde: "Desde",
    preguntarWhatsapp: "Preguntar por WhatsApp",
  },

  confirmacion: {
    cargando: "Cargando confirmación...",
    cargandoSub: "Si ya realizaste tu pago, revisa tu correo electrónico.",
    verTodosLosTours: "Ver todos los tours",
    titulo: "¡Tour Confirmado!",
    saludo: (nombre, correo) =>
      `Hola ${nombre}, tu reserva está lista. Confirmación enviada a ${correo}.`,
    numeroConfirmacion: "Número de Confirmación",
    copiar: "Copiar número",
    copiado: "¡Copiado! ✓",
    presentaAlGuia: "Presenta este número al guía el día del tour",
    resumenTitulo: "Resumen de tu reserva",
    tuItinerario: "Tu itinerario",
    tour: "Tour",
    fecha: "Fecha",
    horaPorAcordar: "Hora: por acordar con el guía",
    participantes: "Participantes",
    personas: (n) => `${n} persona${n !== 1 ? "s" : ""}`,
    adultosNinos: (adultos, ninos) =>
      `${adultos} adulto${adultos !== 1 ? "s" : ""}${ninos > 0 ? ` · ${ninos} niño${ninos !== 1 ? "s" : ""}` : ""}`,
    duracion: "Duración",
    horasAprox: (n) => `${n} horas aprox.`,
    depositoPagado: "Depósito pagado",
    totalPagado: "Total pagado",
    anticipoPagado: (pct, saldo) =>
      `✓ Anticipo de ${pct}% pagado · Saldo de ${saldo} MXN el día del tour, en efectivo o con tarjeta`,
    queSigue: "¿Qué sigue?",
    pasos: [
      {
        num: "01",
        title: "Revisa tu correo",
        text: "Recibirás la confirmación completa en tu bandeja de entrada en los próximos 5 minutos. Revisa también el spam.",
      },
      {
        num: "02",
        title: "Confirma por WhatsApp",
        text: "Envíanos tu número de confirmación al +52 489 125 1458. Te responderemos para coordinar tu punto de recogida exacto.",
      },
      {
        num: "03",
        title: "Un día antes de tu tour",
        text: "Te contactaremos por WhatsApp con los detalles finales: hora exacta de recogida, clima esperado y cualquier recomendación especial.",
      },
      {
        num: "04",
        title: "Prepara tu equipo",
        text: "Ropa cómoda, calzado cerrado, traje de baño, protector solar biodegradable y mucha energía. Todo lo demás lo incluye tu tour.",
      },
      {
        num: "05",
        title: "El día del tour",
        text: "Preséntate en el punto acordado con tu guía y muestra tu número de confirmación. ¡El resto lo hacemos nosotros!",
      },
    ],
    confirmarWhatsapp: "Confirmar por WhatsApp · +52 489 125 1458",
    compartirReserva: "Compartir mi reserva",
    enlaceCopiado: "¡Enlace copiado! Compártelo 🎉",
    agregarCalendario: "Agregar al calendario",
    verMasTours: "Ver más tours",
    problemas: "¿Problemas? Escríbenos a",
    oAl: "o al",
    waConfirmo: "Hola, confirmo mi reserva:",
    waParticipantes: (n) => `• Participantes: ${n}`,
    waConfirmacion: (folio) => `• Confirmación: ${folio}`,
    waFecha: (fecha) => `• Fecha: ${fecha}`,
    compartirTexto: (tour, url) =>
      `¡Acabo de reservar "${tour}" en la Huasteca Potosina! 🌊 ¿Quién se apunta al próximo? 👉 ${url}`,
    compartirTitulo: "Mi tour en la Huasteca Potosina",
    icsDescripcion: (folio, personas) =>
      `Confirmación ${folio}. ${personas} participante(s). Te contactaremos por WhatsApp (+52 489 125 1458) un día antes para coordinar la hora exacta de recogida.`,
  },

  validacion: {
    faltaFecha: "Elige la fecha de este recorrido",
    faltaFechaLargo: (nombre) => `Falta la fecha de ${nombre}`,
    choque: (otro) => `Ya tienes "${otro}" ese día. Cada recorrido ocupa el día completo.`,
    choqueLargo: (nombre, otro) => `${nombre} choca con ${otro}: los dos el mismo día`,
    faltaEleccion: "Elige una para poder continuar",
    faltaEleccionLargo: (nombre) => `Falta elegir el recorrido de ${nombre}`,
    grupoMinimo: (n) => `Sale a partir de ${n} personas`,
    grupoMinimoLargo: (nombre, n) => `${nombre} sale a partir de ${n} personas`,
  },

  hotel: {
    faltanNoches: "Faltan las noches.",
    faltaHabitacion: "Falta elegir la habitación.",
    noEncontrada: "Habitación no encontrada.",
    admiteHasta: (hab, max) => `${hab} admite hasta ${max} personas.`,
    servicios: [
      "Estacionamiento",
      "Alberca",
      "WiFi",
      "Aire acondicionado",
      "Restaurante",
      "A 7 min del centro de Xilitla",
    ],
    vistas: {
      "Selva / jardín": "Selva / jardín",
      "Terraza con vista a la piscina": "Terraza con vista a la piscina",
      Montaña: "Montaña",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const en: BookingMessages = {
  catalogo: {
    metaTitle: "Book a Huasteca Potosina tour — Hold your spot with 30 %",
    metaDescription:
      "Pay 30 % today and cancel free up to 48 h before. Pickup at your lodging, NOM-09 certified guide, entrance fees and travel insurance included. Settle the rest on tour day.",
    ogTitle: "Book a Huasteca Potosina tour",
    ogDescription: "Hold your spot with 30 %. Free cancellation up to 48 h before.",
    eyebrow: "Booking engine",
    h1: "Pick your tour and hold your spot",
    introApartas: "You don't pay it all today: ",
    introY: "hold your spot with 30 % on multi-day trips",
    introMedio: " and settle the rest on tour day. If anything changes, ",
    introCancelas: "cancel free up to 48 h before",
    resenasGoogle: "492 Google reviews",
    verlas: "Read them →",
    confianza: [
      { t: "Hold with 30 %", s: "On multi-day trips. A single day is paid in full." },
      { t: "Free cancellation", s: "Up to 48 h before, no questions" },
      { t: "Small groups", s: "NOM-09 certified guides" },
      { t: "We pick you up", s: "At your lodging in Xilitla or Ciudad Valles" },
    ],
    pasos: [
      { n: "1", t: "Pick your tours", s: "You can put several days in one cart and pay for them all at once." },
      { n: "2", t: "Hold with 30 %", s: "Choose your date and party. Secure card payment." },
      { n: "3", t: "Settle on tour day", s: "Cash or card, when you arrive." },
    ],
    todosLosRecorridos: "All tours",
    conteo: (n, desde) => `${n} tours · from ${desde} MXN`,
    ordenadosPorReservas: " · sorted by most booked",
    viajesVariosDias: "Multi-day trips",
    viajesVariosDiasSub: "Lodging, breakfasts and transfers included",
    paquete: "Package",
    diasNoches: (dias, noches) => `${dias} days · ${noches} nights`,
    apartasDesde: "Hold it from",
    reservar: "Book",
    reservarTourFlotante: "Book a tour",
    detalles: "Details",
    sinRiesgoTitulo: "Booking here carries no risk",
    sinRiesgo: [
      "Free cancellation up to 48 h before the tour, no questions and no penalty.",
      "Today you only pay 30 %. You settle the rest on tour day.",
      "The price you see is final: transport, entrance fees, guide, gear and insurance included.",
      "If the weather forces a cancellation, we reschedule or refund your deposit.",
      "Card payment processed by Stripe. We never store your bank details.",
      "Questions before paying? We answer on WhatsApp and you book whenever you want.",
    ],
    pagoSeguro: "Secure payment · Stripe",
    ayudaTitulo: "Not sure which one to pick?",
    ayudaTexto:
      "Tell us how many days you have and who you're traveling with, and we'll tell you which tour suits you. No commitment.",
    verMiTourIdeal: "Find my ideal tour",
    preguntarWhatsapp: "Ask on WhatsApp",
    waAyuda: "Hi, I'd like to book a tour in the Huasteca. Can you help me choose?",
  },

  tarjeta: {
    masReservado: "Most booked",
    porPersona: "per person",
    porVehiculo: "per vehicle",
    personas: (n) => `${n} ${n === 1 ? "person" : "people"}`,
    noches: (n) => `${n} night${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/night`,
    nochesGratisLinea: (n, ahorro) => `${n} free night${n > 1 ? "s" : ""} — you save ${ahorro}`,
    antesDePagarCola: " before you pay.",
    apartaCon: (monto) => `Hold it with ${monto}`,
    agregar: "Add",
    enTuCarrito: "In your cart",
    verDetalles: "See details",
    horas: "hours",
    hastaPersonas: (n) => `up to ${n} people`,
    apartasConLabel: "Hold it with",
    vistaRapida: "Quick look",
    vistaRapidaDe: (tour) => `Quick look at ${tour}`,
    informacionDe: (tour) => `About ${tour}`,
    cerrar: "Close",
    maxN: (n) => `max. ${n}`,
    rangoPersonas: (min, max) => (min > 1 ? `${min}–${max} people` : `Max. ${max}`),
    resenas: (n) => `· ${n} reviews`,
    dificultad: { baja: "Easy", media: "Moderate", alta: "Advanced" },
    unidadHoras: " hours",
    unidadH: " h",
    queSeVisita: "What you'll visit",
    incluye: "Includes",
    apartasCon: (monto) => `Hold it with ${monto}`,
    precioUnidadYAnticipo: (unidad, anticipo) => `MXN ${unidad} · hold it with ${anticipo}`,
    reservarEsteRecorrido: "Book this tour",
    verFichaCompleta: "See full page",
  },

  carrito: {
    vacioTitulo: "Your cart is empty",
    vacioTexto: "Pick your tours and add them here: you can book several days in a single payment.",
    verRecorridos: "See the tours",
    seguirEligiendo: "Keep choosing tours",
    pasos: ["Your trip", "Your details", "Payment"],
    tuViaje: "Your trip",
    conteo: (recorridos, dias) =>
      `${recorridos} ${recorridos === 1 ? "tour" : "tours"} · ${dias} ${dias === 1 ? "day" : "days"}`,
    compartirTitulo: "My trip to the Huasteca Potosina",
    compartirTexto: (n, total) => `I put this trip together: ${n} tour${n !== 1 ? "s" : ""} · ${total} MXN`,
    eligeElDia: "Choose the day",
    eligeElDiaN: (n) => `Choose the day (${n})`,
    tuItinerario: "Your itinerary",

    quitar: (nombre) => `Remove ${nombre}`,
    fechaDe: (nombre) => `Date for ${nombre}`,
    eligeLaFecha: "Choose the date",
    diaOcupado: "Day already taken",
    yaTienesEseDia: (nombre) => `You already have "${nombre}" that day`,
    chocaMismoDia: (nombre) => `You already have "${nombre}" that day. Each tour takes the whole day.`,
    rutaDe: (nombre) => `Route for ${nombre}`,
    vehiculoDe: (nombre) => `Vehicle for ${nombre}`,
    menosUnidades: "Fewer units",
    masUnidades: "More units",
    unidades: (n) => `${n} unit${n > 1 ? "s" : ""}`,
    adultos: "adults",
    adulto: "adult",
    de6a10: "ages 6 to 10",
    menoresDe6: "under 6",
    menorDe6: "under 6",
    menos: (etiqueta, tour) => `Fewer ${etiqueta} on ${tour}`,
    mas: (etiqueta, tour) => `More ${etiqueta} on ${tour}`,
    soloMayores: "This tour is for ages 10 and over only.",
    saleAPartirDeIntro: "This tour runs from ",
    saleAPartirDe: (n) => `${n} people`,
    vanMenos: "Fewer than that?",
    escribenosYLosSumamos: "Message us and we'll add you to another group",
    waGrupoMinimo: (personas, tour) =>
      `Hi, there are ${personas} of us and we're interested in ${tour}. Could you add us to another group?`,
    porPersonaExtra: "per person",
    quitarAddOn: "Remove",
    agregarAddOn: "Add",
    cuantosLoHacen: "How many will do it?",
    queIncluyeYSeVisita: "What's included and what you'll visit",
    seVisita: "You'll visit",
    incluye: "Includes",
    duracionGrupo: (horas, min, max) =>
      `${horas} hours approx. · group of ${min > 1 ? `${min} to ` : "up to "}${max} people`,

    agregarOtroRecorrido: "＋ Add another tour",
    quedanLugares: (quedan, cupo) =>
      quedan === 1 ? `1 spot left of ${cupo} for that day` : `${quedan} spots left of ${cupo} for that day`,
    salidaLlena: "That departure is full — pick another day",
    faltanParaSalir: (faltan, minimo) =>
      faltan === 1
        ? `1 more person needed to confirm this departure (minimum ${minimo})`
        : `${faltan} more people needed to confirm this departure (minimum ${minimo})`,
    gancho2doRecorrido: "Most of our travelers do 2 or 3 tours",
    gancho3erRecorrido: "We lay out your day-by-day itinerary",
    ahorroMultiple: (pesos: string) => `You save ${pesos} by booking several tours`,
    yaTienesTodos: "You already have every tour in your cart.",

    pasamosPorTi: " —hotel, hostel, cabin or Airbnb— in ",
    pasamosPorTiFuerte1: "We pick you up at your lodging",
    pasamosPorTiFuerte2: "Xilitla or Ciudad Valles",
    pasamosPorTiCola: ", and bring you back at the end. You don't need to stay with us.",
    porPersona: "per person",
    porVehiculo: "per vehicle",
    personas: (n) => `${n} ${n === 1 ? "person" : "people"}`,
    noches: (n) => `${n} night${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/night`,
    nochesGratisLinea: (n, ahorro) => `${n} free night${n > 1 ? "s" : ""} — you save ${ahorro}`,
    antesDePagarCola: " before you pay.",
    salimosEntre: ". We confirm your exact pickup time on WhatsApp when you book.",
    salimosEntreFuerte: "We leave between 8:00 and 9:00 AM",
    cancelacionGratuita: "Free cancellation up to 48 h before, with a full refund.",

    hospedajeTitulo: "Would you like us to host you too?",
    hospedajeSub:
      "At our Hotel Paraíso Encantado, in Xilitla. It's optional: we pick you up even if you stay somewhere else.",
    elegida: "Selected",
    vistaMontana: "Mountain view",
    hastaPersonasDesde: (max, precio) => `up to ${max} people · from ${precio}/night`,
    duermenAqui: "Sleeping here",
    menosHuespedes: (hab) => `Fewer guests in ${hab}`,
    masHuespedes: (hab) => `More guests in ${hab}`,
    verFotosYDetalles: "See photos and details",
    eligeAlMenosUna: "Choose at least one room.",
    entrada: "Check-in",
    salida: "Check-out",
    huespedesEnHabitaciones: (huespedes, habs) =>
      `${huespedes} guest${huespedes !== 1 ? "s" : ""} in ${habs} room${habs !== 1 ? "s" : ""}`,
    salidaDespuesDeEntrada: "Check-out has to be at least one day after check-in.",
    resumenNoches: (noches, huespedes, habs) =>
      `${noches} night${noches > 1 ? "s" : ""} · ${huespedes} guest${huespedes > 1 ? "s" : ""} · ${habs} room${habs > 1 ? "s" : ""}`,
    nochesGratis: (n, ahorro) =>
      `🎁 ${n === 1 ? "The 3rd night is free" : `${n} free nights`}: you save ${ahorro}.`,
    terceraNocheGratisAviso: "Stay one more night and the 3rd is free — you'd pay the same.",

    trasladoTitulo: "Shall we drive you from your city?",
    trasladoSub: "Private round-trip transfer to Xilitla. Optional: if you're driving, skip it.",
    desdeRedondo: (precio) => `from ${precio} round trip`,
    cuantosViajan: "How many are traveling?",
    menosPasajeros: "Fewer passengers",
    masPasajeros: "More passengers",
    trasladoLinea: (ciudad, pax) => `${ciudad} → Xilitla · round trip · ${pax} passenger${pax !== 1 ? "s" : ""}`,
    trasladoGrupoGrande: (pax) =>
      `Our largest vehicle seats 12 passengers. For ${pax} we quote it separately — `,
    escribenosPorWhatsapp: "message us on WhatsApp",
    trasladoSigueSin: ". Your booking goes ahead without the transfer.",
    waTrasladoGrande: (pax, ciudad) =>
      `Hi, there are ${pax} of us and we'd like a transfer from ${ciudad} to Xilitla. Could you quote it?`,
    trasladoPorVehiculo:
      "The price is per vehicle, not per person. We pick you up at your address and bring you back at the end.",

    nombreCompleto: "Full name *",
    correoElectronico: "Email address *",
    whatsappOpcional: "WhatsApp (optional)",
    dondeTeHospedas: "Where are you staying? (Xilitla or Cd. Valles)",
    faltanDatos: (n, primero) => `${n} things missing: ${primero.toLowerCase()}…`,
    llevameAhi: "Take me there →",
    unMomento: "One moment…",
    continuarAlPago: "Continue to payment →",
    continuar: "Continue →",
    pagasHoy: "You pay today (30 %)",
    necesitamosNombreCorreo: "We need your name and email to send you the confirmation.",
    noSePudoIniciar: "We couldn't start the payment.",
    noSePudoConectar: "We couldn't connect. Check your internet and try again.",
    yaTienesEseDiaError: (nombre) =>
      `You already have "${nombre}" that day. Each tour takes the whole day: choose another date.`,

    cotizacionEnviada: "✓ We sent you your quote. Your cart is waiting in that email.",
    todaviaLoPiensas: "Still thinking about it? We'll email you the quote and you pick it up whenever you want.",
    tuCorreoPlaceholder: "youremail@example.com",
    enviar: "Send",
    sinCompromiso: "No commitment. Needs at least one tour with a date.",
    correoInvalido: "Enter a valid email address.",
    noSePudoGuardar: "We couldn't save it. Try again.",
    sinConexion: "We couldn't connect. Check your internet.",

    apartadoActivo: "We're holding your spots for",
    apartadoActivoHabitacion: "We're holding your spots and the room for",
    apartadoVencido:
      "The hold has expired. You can still pay, but check the summary again in case something changed.",
    procesando: "Processing…",
    pagar: (monto) => `Pay ${monto} MXN`,
    pagoCifrado: (saldo) => `Encrypted payment with Stripe · You settle the ${saldo} balance on your first tour day`,
    prefieresTransferencia: "Prefer a SPEI transfer or OXXO?",
    apartarPorWhatsapp: "Hold it on WhatsApp",
    mandamosDatos: "We'll send you the details and hold your spots once we get the receipt.",
    errorPago: "Something went wrong with the payment. Please try again.",
    pagoEnProceso: "Your payment is processing. As soon as the bank confirms it, you'll get the email.",
    waPagoAlterno: {
      intro: "Hi, I'd like to book this trip but I'd rather pay by SPEI transfer or OXXO.",
      hospedaje: (hab, noches, huespedes, total) =>
        `Lodging: ${hab} — ${noches} night(s) — ${huespedes} guest(s) — ${total}`,
      terceraGratis: (ahorro) => `(3rd night already free: ${ahorro} saved)`,
      totalViaje: (total) => `Trip total: ${total} MXN`,
      anticipo: (monto) => `Deposit (30 %): ${monto} MXN`,
      saldo: (monto) => `Balance on the first tour day: ${monto} MXN`,
      aNombreDe: (nombre) => `Under the name: ${nombre}`,
      pendiente: "(pending)",
      correo: (correo) => `Email: ${correo}`,
      meHospedoEn: (lugar) => `I'm staying at: ${lugar}`,
      linea: (tour, fecha, personas, subtotal) => `• ${tour} — ${fecha} — ${personas} person(s) — ${subtotal}`,
    },
    waRescate: {
      intro: "Hi, I'm putting my trip together on your site and I have a question:",
      sinFecha: " — (no date yet)",
      hospedaje: (habs, noches) => `• Lodging: ${habs}${noches ? ` — ${noches} night(s)` : ""}`,
      totalEstimado: (total) => `Estimated total: ${total} MXN`,
    },
    waDudaAntesDePagar: "Hi, I'm about to pay for my cart and I have a question.",

    resenasGoogle: "492 Google reviews",
    verlas: "Read them →",
    credenciales: "+10,000 travellers since 2019 · Arival Award 2023 · NOM-09 SECTUR certified guides",
    confianzaCancelas: "Free cancellation up to 48 h before",
    confianzaPago: (pct) => pct >= 100
      ? "Secure payment with Stripe · Paid in full, no balance left"
      : `Secure payment with Stripe · ${pct} % deposit`,
    // Las reseñas son de viajeros reales, con nombre y ciudad. Se dejan tal como
    // las escribieron y se avisa de que están en español: traducirlas en
    // silencio sería poner palabras en boca de una persona identificable.
    resenasEnEspanol: "Reviews from our travellers, in their own words (Spanish).",
    antesDePagar: "Before you pay",
    otraDuda: "Still have a question?",
    escribenosWhatsapp: "Message us on WhatsApp",
    faq: [
      {
        q: "How much do I pay today and when do I pay the rest?",
        a: "Today you hold your spot with 30 % of the total. You settle the balance on the day of your first tour, in cash or by card, when you arrive.",
      },
      {
        q: "Can I cancel?",
        a: "Yes. Free cancellation up to 48 hours before, with a full refund and no questions asked.",
      },
      {
        q: "Where do we leave from and at what time?",
        a: "There is no single meeting point: we pick you up at your lodging —hotel, hostel, cabin or Airbnb— in Xilitla or Ciudad Valles, and bring you back at the end. We leave between 8:00 and 9:00 AM, and we confirm your exact pickup time on WhatsApp when you book.",
      },
      {
        q: "Do I have to stay at your hotel?",
        a: "No. We pick you up wherever you're staying, whether it's our hotel or any other.",
      },
      {
        q: "What happens if it rains?",
        a: "We run tours in light rain. If there's a thunderstorm, we reschedule at no cost.",
      },
      {
        q: "Can I pay for several tours together?",
        a: "That's exactly what this cart does: you book all your days with a single payment and a single confirmation number, instead of booking one by one.",
      },
    ],

    // Las notas las lee el EQUIPO en Xilitla, no el cliente: van en español
    // aunque el cliente haya reservado en inglés. Se le añade el aviso de que
    // el cliente habla inglés, que es justo lo que el equipo necesita saber.
    notas: {
      recogida: (lugar) => `Recogida: ${lugar}`,
      reservaVarios: (n) => `Reserva de ${n} recorridos en un solo pago.`,
      eligio: (tour, opcion) => `${tour} — eligió: ${opcion}`,
      extras: (tour, lista) => `${tour} — ACTIVIDAD EXTRA CONTRATADA: ${lista}`,
      hospedaje: (hab, noches, huespedes, entrada, salida) =>
        `Hospedaje: ${hab}, ${noches} noche(s), ${huespedes} huésped(es)${entrada ? ` — entrada ${entrada}` : ""}${salida ? `, salida ${salida}` : ""}.`,
      traslado: (ciudad, pax) =>
        `TRASLADO: ${ciudad} → Xilitla, ida y vuelta, ${pax} pasajero(s). Falta acordar hora y domicilio de recogida.`,
      idiomaCliente: "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio.",
    },
    trasladoRenglon: (ciudad) => `Transfer ${ciudad} → Xilitla (round trip)`,
    hospedajeRenglon: (hab) => `Lodging · ${hab}`,
    recorridosResumen: (n) => `${n} tours`,
  },

  resumen: {
    titulo: "Your booking summary",
    faltaLaFecha: "Date missing",
    elegiste: (opcion) => `You chose: ${opcion}`,
    loQueVaIncluido: "What's included",
    salidaEntre: "Departure between ",
    salidaEntreFuerte: "8:00 and 9:00 AM",
    confirmamosHora: ". We confirm your exact time on WhatsApp.",
    pasamosPorTi: "We pick you up at your lodging in ",
    pasamosPorTiFuerte: "Xilitla or Ciudad Valles",
    cancelasGratis: "Cancel free up to 48 h before, with a full refund.",
    fotosYVideo: "Photos and video of the tour, delivered the same day.",
    totalDelViaje: "Trip total",
    sumaDeRecorridos: "Tours subtotal",
    descuentoVariosRecorridos: "Multi-tour discount",
    pagasHoy: (pct) => `You pay today (${pct} %)`,
    saldoDia: "Balance on your first tour day",
  },

  calendario: {
    dias: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    proximosDias: "Next few days",
    oEligeOtraFecha: "Or pick another date",
    mesAnterior: "Previous month",
    mesSiguiente: "Next month",
    cerrar: "Close",
    quitarLaFecha: "Clear the date",
    placeholder: "Tap to pick a date",
    titulo: "Pick your date",
    fechaSeleccionada: "Date selected:",
    salidaEntre: " · Departure between 8:00 and 9:00 AM",
    hoy: "Today",
    manana: "Tomorrow",
  },

  galeria: {
    cerrar: "Close gallery",
    fotoAnterior: "Previous photo",
    fotoSiguiente: "Next photo",
    verFoto: (n) => `See photo ${n}`,
    hastaPersonas: (n) => `Up to ${n} ${n !== 1 ? "people" : "person"}`,
    contador: (i, total) => `${i} of ${total}`,
    etiquetaHabitacion: "The room",
    etiquetaAreas: "Shared areas",
    altHotel: "Hotel Paraíso Encantado",
    altTerraza: "Hotel terrace",
    altAreas: "Hotel grounds",
  },

  compartir: {
    compartir: "Share",
    trabajando: "Preparing…",
    copiado: "Link copied!",
    error: "It didn't work, try again",
  },

  rescate: {
    cerrar: "Close",
    titulo: "Still have a question?",
    texto:
      "Message us and we'll sort it out in a couple of messages: dates, how many people fit, or paying by bank transfer or OXXO if you'd rather not use a card.",
    cta: "Message us on WhatsApp",
    sigoRevisando: "I'm still looking",
  },

  barra: {
    verCarrito: "View cart",
    recorridos: (n) => `${n} tour${n !== 1 ? "s" : ""}`,
    resumen: (n, total) => `${n} ${n === 1 ? "tour" : "tours"} · ${total} MXN`,
    apartasCon: (monto) => `Hold it with ${monto}`,
    anticipo: "Deposit",
    agregado: "Added",
    enTuCarrito: "In your cart",
    carrito: "Cart",
    yaEstaEnCarrito: (tour) => `${tour} is already in your cart — go to cart`,
    agregarAlCarrito: (tour) => `Add ${tour} to your cart`,
    verTuCarrito: (n) => `View your cart (${n})`,
    mxnPersona: "MXN/person",
    mxnVehiculo: "MXN/vehicle",
    agregar: "Add",
    desde: "From",
    preguntarWhatsapp: "Ask on WhatsApp",
  },

  confirmacion: {
    cargando: "Loading your confirmation...",
    cargandoSub: "If you already paid, please check your email.",
    verTodosLosTours: "See all tours",
    titulo: "Tour Confirmed!",
    saludo: (nombre, correo) =>
      `Hi ${nombre}, your booking is set. Confirmation sent to ${correo}.`,
    numeroConfirmacion: "Confirmation Number",
    copiar: "Copy number",
    copiado: "Copied! ✓",
    presentaAlGuia: "Show this number to your guide on tour day",
    resumenTitulo: "Your booking summary",
    tuItinerario: "Your itinerary",
    tour: "Tour",
    fecha: "Date",
    horaPorAcordar: "Time: to be agreed with your guide",
    participantes: "Participants",
    personas: (n) => `${n} ${n !== 1 ? "people" : "person"}`,
    adultosNinos: (adultos, ninos) =>
      `${adultos} adult${adultos !== 1 ? "s" : ""}${ninos > 0 ? ` · ${ninos} child${ninos !== 1 ? "ren" : ""}` : ""}`,
    duracion: "Duration",
    horasAprox: (n) => `${n} hours approx.`,
    depositoPagado: "Deposit paid",
    totalPagado: "Total paid",
    anticipoPagado: (pct, saldo) =>
      `✓ ${pct}% deposit paid · ${saldo} MXN balance on tour day, in cash or by card`,
    queSigue: "What happens next?",
    pasos: [
      {
        num: "01",
        title: "Check your email",
        text: "You'll get the full confirmation in your inbox within the next 5 minutes. Check your spam folder too.",
      },
      {
        num: "02",
        title: "Confirm on WhatsApp",
        text: "Send us your confirmation number at +52 489 125 1458. We'll reply to arrange your exact pickup point.",
      },
      {
        num: "03",
        title: "The day before your tour",
        text: "We'll contact you on WhatsApp with the final details: exact pickup time, expected weather and any special recommendations.",
      },
      {
        num: "04",
        title: "Pack your gear",
        text: "Comfortable clothes, closed shoes, swimwear, biodegradable sunscreen and plenty of energy. Everything else is included in your tour.",
      },
      {
        num: "05",
        title: "On tour day",
        text: "Meet your guide at the agreed point and show your confirmation number. We'll take care of the rest!",
      },
    ],
    confirmarWhatsapp: "Confirm on WhatsApp · +52 489 125 1458",
    compartirReserva: "Share my booking",
    enlaceCopiado: "Link copied! Share it 🎉",
    agregarCalendario: "Add to calendar",
    verMasTours: "See more tours",
    problemas: "Trouble? Write to us at",
    oAl: "or at",
    waConfirmo: "Hi, I'm confirming my booking:",
    waParticipantes: (n) => `• Participants: ${n}`,
    waConfirmacion: (folio) => `• Confirmation: ${folio}`,
    waFecha: (fecha) => `• Date: ${fecha}`,
    compartirTexto: (tour, url) =>
      `I just booked "${tour}" in the Huasteca Potosina! 🌊 Who's coming on the next one? 👉 ${url}`,
    compartirTitulo: "My tour in the Huasteca Potosina",
    icsDescripcion: (folio, personas) =>
      `Confirmation ${folio}. ${personas} participant(s). We'll contact you on WhatsApp (+52 489 125 1458) the day before to arrange the exact pickup time.`,
  },

  validacion: {
    faltaFecha: "Choose the date for this tour",
    faltaFechaLargo: (nombre) => `${nombre} is missing its date`,
    choque: (otro) => `You already have "${otro}" that day. Each tour takes the whole day.`,
    choqueLargo: (nombre, otro) => `${nombre} clashes with ${otro}: both on the same day`,
    faltaEleccion: "Choose one to continue",
    faltaEleccionLargo: (nombre) => `${nombre} still needs you to choose a route`,
    grupoMinimo: (n) => `Runs from ${n} people up`,
    grupoMinimoLargo: (nombre, n) => `${nombre} runs from ${n} people up`,
  },

  hotel: {
    faltanNoches: "The nights are missing.",
    faltaHabitacion: "You still need to choose a room.",
    noEncontrada: "Room not found.",
    admiteHasta: (hab, max) => `${hab} sleeps up to ${max} people.`,
    servicios: [
      "Parking",
      "Pool",
      "WiFi",
      "Air conditioning",
      "Restaurant",
      "7 min from downtown Xilitla",
    ],
    vistas: {
      "Selva / jardín": "Jungle / garden",
      "Terraza con vista a la piscina": "Terrace overlooking the pool",
      Montaña: "Mountain",
    },
  },
};

export function getBooking(locale: Locale): BookingMessages {
  return locale === "en" ? en : es;
}
