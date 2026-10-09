import type { Locale } from "./config";
import { CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
// El número de reseñas sale de resenas.ts (constante pura): escrito a mano en
// cuatro sitios de este diccionario, se quedaba atrás del JSON-LD.
import { GOOGLE_RESENAS } from "@/lib/resenas";

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
    /**
     * La segunda mitad del H1, la que va en cursiva lima. El hero de
     * /sustentabilidad parte el título en dos y el acento es lo que le da
     * carácter; sin partir la frase no hay dónde ponerlo.
     */
    h1Acento: string;
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
    /** Reservas pagadas del último mes. Solo se pinta si pasan el mínimo de `reservasStats.ts`. */
    reservasUltimoMes: (n: number) => string;
    /** El total real del grupo que la persona declaró en el buscador. */
    totalParaGrupo: (total: string, personas: number) => string;
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
    /** Tarifa del grupo completo (ver `precioUnidad: "grupo"` en tours.ts). */
    porGrupo: string;
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
    /** Antes era la etiqueta "Apartas con" seguida del 30 % del precio. Mentía:
     *  la tarjeta lleva UN recorrido al carrito y un solo día sin hotel se cobra
     *  completo (`pctACobrar`). Ahora cuenta la regla, que además empuja al
     *  segundo día, que es donde está el ticket grande. */
    notaPago: string;
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
    precioUnidadYPago: (unidad: string) => string;
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
    /**
     * Etiqueta del contador cuando el recorrido se cobra por GRUPO: ahí no hay
     * tramos de menor que mostrar, porque un niño no paga el 70 % de una tarifa
     * plana. Ver `precioUnidad: "grupo"` en tours.ts.
     */
    personaSing: string;
    personaPl: string;
    menorDe6: string;
    menos: (etiqueta: string, tour: string) => string;
    mas: (etiqueta: string, tour: string) => string;
    soloMayores: string;
    saleAPartirDeIntro: string;
    saleAPartirDe: (n: number) => string;
    vanMenos: string;
    escribenosYLosSumamos: string;
    waGrupoMinimo: (personas: number, tour: string) => string;
    /** Va UNA persona en un recorrido que sale desde 2 (ver `aceptaViajeroSolo`). */
    viajeroSoloTitulo: string;
    /** `dias` = `CONFIRMA_SALIDA_DIAS`. Es una función para que el número no se escriba a mano. */
    viajeroSolo: (dias: number) => string;
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
    // 🔴 La hora y el lugar de recogida ya NO viven aquí: el carrito los arma
    // con `resumenSalidas()` desde el catálogo. Aquí había "Pasamos por ti … en
    // Xilitla o en Ciudad Valles" y "Salimos entre 8:00 y 9:00 AM" para todo el
    // carrito, y la Gruta de Xilo sale a las 7 de la NOCHE y solo recoge en
    // Xilitla. Quedan solo las frases que valen para cualquier recorrido.
    /**
     * Encabezado de la lista cuando los recorridos del carrito se recogen
     * distinto. Dice "cómo llegas" y no "recogida": en la lista caben el RZR
     * (nos vemos en la base) y el buceo (llegas por tu cuenta), que no recogen.
     */
    recogidaCadaRecorrido: string;
    noHaceFaltaHospedarte: string;
    /** Sin hora: la hora sale de cada recorrido. */
    horaExacta: string;
    porPersona: string;
    porVehiculo: string;
    /** Tarifa del grupo completo (ver `precioUnidad: "grupo"` en tours.ts). */
    porGrupo: string;
    /**
     * Antes del precio de un recorrido por grupo en "agregar otro": `precio` es
     * solo el primer escalón de `tarifaGrupo` (el Edén va de $2,990 a $4,160).
     */
    desde: string;
    personas: (n: number) => string;
    noches: (n: number) => string;
    porNoche: (precio: string) => string;
    nochesGratisLinea: (n: number, ahorro: string) => string;
    antesDePagarCola: string;
    /**
     * 🔴 Solo cuando NINGÚN recorrido del carrito trae `cancelacion` propia
     * (tours.ts). El Edén no se reembolsa nunca —la Fundación Las Pozas no
     * devuelve— y el carrito le prometía "reembolso completo" en tres sitios
     * de la misma pantalla de pago. Con él dentro, se pinta su texto del
     * catálogo y, para los demás, `cancelacionResto`.
     */
    cancelacionGratuita: string;
    cancelacionResto: string;
    /** Franja de arriba cuando algún recorrido del carrito no entra en las 48 h. */
    confianzaCancelasSalvo: (tours: string) => string;
    /** Cola de "¿Puedo cancelar?" por cada recorrido con política propia. */
    cancelarExcepcion: (tour: string, texto: string) => string;

    // Hospedaje
    hospedajeTitulo: string;
    hospedajeSub: string;
    /** Lo que se ve SIN abrir nada: cuántas habitaciones, desde cuánto y qué tiene el hotel. */
    hospedajeResumen: (n: number, precio: string) => string;
    hospedajeVerHabitaciones: string;
    /** Botón corto para volver atrás cuando ya se abrieron las habitaciones. */
    hospedajeYaTengo: string;
    /** Frase, no etiqueta: en gris y a secas parecía un botón desactivado. */
    hospedajeSaltar: string;
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
    /** Recibe el porcentaje REAL que se cobra hoy (`pctACobrar`), no un 30 fijo:
     *  cuando la regla cobraba completo el día suelto (hasta sep 2026), el
     *  letrero decía "30 %" encima del importe del 100 %. */
    pagasHoy: (pct: number) => string;
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

    // Pago
    procesando: string;
    pagar: (monto: string) => string;
    pagoCifrado: (saldo: string) => string;
    prefieresTransferencia: string;
    apartarPorWhatsapp: string;
    mandamosDatos: string;
    /** Encabezado del bloque de «otras formas de pago». */
    otrasFormas: string;
    /** Meses sin intereses, cuando el importe de hoy llega al umbral. */
    msiTitulo: (plazos: string) => string;
    msiDetalle: string;
    /** El botón de pagar el viaje completo, que es lo que habilita los meses. */
    pagarTodoTitulo: (total: string) => string;
    pagarTodoMsi: string;
    pagarTodoVolver: (anticipo: string) => string;
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
    /** Recibe el % real que se cobra hoy (`pctACobrar`). */
    confianzaPago: (pct: number) => string;
    antesDePagar: string;
    otraDuda: string;
    escribenosWhatsapp: string;
    /**
     * `clave: "salidas"` marca la respuesta que el carrito REEMPLAZA por la de
     * sus propios recorridos (`resumenSalidas`, o `excepcionesSalida` si está
     * vacío). El `a` escrito aquí es solo el respaldo y no lleva horas: una hora
     * a mano en esta respuesta ya mandó a esperar de mañana a quien iba de noche.
     *
     * `clave: "cancelar"`: el carrito le PEGA la `cancelacion` de los
     * recorridos que no entran en las 48 h (el Edén), o la pone en su lugar si
     * el carrito solo lleva esos.
     */
    faq: { q: string; a: string; clave?: "salidas" | "cancelar" }[];

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
      /** Pagó la tarifa de viajero solo: hay que sumarlo a un grupo de esa fecha. */
      /** Pidió guía en inglés. SIEMPRE en español: lo lee el equipo en Xilitla. */
      guiaEnIngles: string;
      viajeroSolo: (tour: string, fecha: string) => string;
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
    /**
     * SOLO para los renglones que no traen `recogida`: los paquetes, que duermen
     * en nuestro hotel de Xilitla y cuyo transporte "te lleva del hotel al
     * inicio de cada tour y de regreso" (paquetes.ts). Un recorrido suelto pinta
     * su propia frase (`fraseRecogida`) y no pasa por aquí.
     *
     * 🔴 Sin hora y sin Ciudad Valles. Decía "Salida entre 8:00 y 9:00 AM" y
     * "tu hospedaje en Xilitla o Ciudad Valles", y el paquete duerme en nuestro
     * hotel de Xilitla: nadie lo recoge en Valles. La hora de cada día se
     * confirma por WhatsApp, como en los recorridos sueltos.
     */
    trasladoPaquete: string;
    /** Frase suelta, sin hora, que acompaña a la recogida de cada recorrido. */
    horaExacta: string;
    /**
     * 🔴 Solo si ningún renglón trae `cancelacion` propia (el Edén no se
     * reembolsa). Si alguno la trae, se pinta la suya y `cancelasGratisResto`.
     */
    cancelasGratis: string;
    cancelasGratisResto: string;
    /** Pidió guía en inglés, sin costo. */
    guiaEnIngles: string;
    fotosYVideo: string;
    totalDelViaje: string;
    sumaDeRecorridos: string;
    descuentoVariosRecorridos: string;
    pagasHoy: (pct: number) => string;
    saldoDia: string;
  };

  // ── Calendario ────────────────────────────────────────────────────────────
  /**
   * El módulo de reserva de la FICHA del tour: fecha, personas y total sin
   * cambiar de pantalla. Vive aparte de `carrito` porque son dos momentos
   * distintos —aquí se elige un recorrido, allá se arma el viaje— y mezclarlos
   * acababa con textos que no encajaban en ninguno de los dos.
   */
  ficha: {
    cuandoVas: string;
    cuantosVan: string;
    total: string;
    /** Botón con fecha: el monto es lo que se paga HOY (el anticipo). */
    reservarHoy: (montoHoy: string) => string;
    /** Debajo del botón: qué porcentaje es y cuánto queda para el día del tour. */
    restoElDia: (pct: number, resto: string) => string;
    /** Eligió una fecha después de la promo de temporada baja. */
    sinPromoEnFecha: (hasta: string) => string;
    continuar: string;
    /**
     * Cuántos pasos faltan desde la ficha. Paraíso lo dice desde el primer
     * paso con su barra «1 Fechas · 2 Datos · 3 Pago»; aquí no se decía en
     * ningún lado y el botón parecía llevar directo al cobro.
     */
    pasoUnoDeTres: string;
    grupoLleno: (max: number) => string;
    /** Contador de un recorrido de tarifa por grupo: una sola casilla, sin tramos de niño. */
    personas: string;
    /**
     * El tope de un recorrido que YA es privado. `grupoLleno` ofrece "armamos
     * una salida privada", y en el Edén eso es mentira: el máximo de 7 lo pone
     * el reglamento del jardín y no hay privado que lo suba.
     */
    grupoTope: (max: number) => string;
    /** Aclara que la cifra de abajo es del grupo entero, no de cada quien. */
    tarifaDelGrupo: (max: number) => string;
    /** Lo que sale cada uno al dividir la tarifa; solo se enseña si van 2 o más. */
    porCabeza: (monto: string) => string;
    /** Precio por persona del escalón vigente (`escalaPersona` en tours.ts). */
    cadaUno: (monto: string) => string;
    /** Lo que bajaría el precio por persona si fueran uno más. El gancho. */
    unoMasBaja: (personas: number, monto: string) => string;
    /** El precio por persona más bajo de la escalera, con cuánta gente se logra. */
    escaleraDesde: (personas: number, monto: string) => string;
    /** Ya tienen el escalón más barato: no hay nada más que ofrecer. */
    mejorPrecio: string;
    /** Va UNA persona: tarifa de 2 personas menos $2 y se le suma a un grupo. */
    viajeroSoloTitulo: string;
    /** `dias` = `CONFIRMA_SALIDA_DIAS`. Es una función para que el número no se escriba a mano. */
    viajeroSolo: (dias: number) => string;
  };

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
    /** Recibe la hora del recorrido (`salidaCorta`): "7:00 PM", "3:00–4:00 AM". */
    salida: (hora: string) => string;
    /**
     * Horario fijo que pone el LUGAR (`recogida.horaTexto`, el Edén): no es la
     * hora a la que pasamos por ti, así que no se le dice "Salida".
     */
    horario: (texto: string) => string;
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
    /** `pct` es lo que se cobra HOY (`pctACobrar`). Con el 100 % no se "aparta"
     *  nada: se paga el viaje entero, y llamarlo anticipo era mentira. */
    apartasCon: (monto: string, pct: number) => string;
    anticipo: string;
    agregado: string;
    enTuCarrito: string;
    carrito: string;
    yaEstaEnCarrito: (tour: string) => string;
    agregarAlCarrito: (tour: string) => string;
    verTuCarrito: (n: number) => string;
    mxnPersona: string;
    mxnVehiculo: string;
    /** Tarifa del grupo entero: la barra no puede decir "por persona". */
    mxnGrupo: string;
    agregar: string;
    /** Botón de la barra móvil cuando la ficha trae módulo de reserva. */
    elegirFecha: string;
    /** Con hotel en el carrito esta barra NO puede calcular el total: lo dice en vez de inventarlo. */
    masHospedaje: string;
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
  /**
   * Checkout rediseñado (oct 2026): encabezado cerrado, banda con foto, tres
   * pasos que se pliegan y barra fija con «hoy pagas». Lo que ya existía en
   * `carrito` (pagos, FAQ, hospedaje, traslado) se sigue leyendo de ahí.
   */
  checkout: {
    pagoSeguro: string;
    dudasWhatsapp: string;
    waDudas: string;
    tuViajeHuasteca: string;
    recorridosYDias: (recorridos: number, rango: string) => string;
    pasoExperiencia: string;
    pasoDatos: string;
    pasoPago: string;
    editar: string;
    continuar: string;
    irAlPago: string;
    preparandoPago: string;
    sinFechaResumen: string;
    // Respuestas rápidas
    respuestasTitulo: string;
    edadTitulo: string;
    nadoTitulo: string;
    lluviaTitulo: string;
    cancelTitulo: string;
    /** «¿Cómo puedo pagar?», en el paso ① del checkout nuevo (8 oct 2026). */
    pagoTitulo: string;
    pagoTarjeta: string;
    pagoMsi: string;
    pagoAlterno: string;
    edadNinos: string;
    edadMinima: (tour: string, edad: number) => string;
    soloAdultos: (tour: string) => string;
    /** Solo se usa si el dato existe (`TOUR_REQUISITOS`): nunca se inventa. */
    nadoSinSaber: string;
    lluviaGenerica: string;
    cancelHasta: (fecha: string) => string;
    cancelGenerica: string;
    // Extras
    extrasTitulo: string;
    extrasSub: (precioNoche: string) => string;
    cotizacionLink: string;
    // Datos
    datosIntro: string;
    nombreLabel: string;
    whatsappLabel: string;
    whatsappAyuda: string;
    correoLabel: string;
    correoAyuda: string;
    hospedajeLabel: string;
    hospedajeAyuda: string;
    errNombre: string;
    errCorreo: string;
    errWhatsapp: string;
    // Pago y cierre
    totalDelViaje: string;
    queSigueTitulo: string;
    queSigue: (saldo: string) => string[];
    verDesglose: string;
    pagoCifrado: string;
    /** La casilla de guía en inglés, sin costo (8 oct 2026). */
    guiaInglesLabel: string;
    guiaInglesAyuda: string;
    barraTotal: (total: string) => string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const es: BookingMessages = {
  catalogo: {
    metaTitle: "Reservar tour en la Huasteca Potosina — Aparta con el 30 %",
    // Sin "transporte desde tu hospedaje": no es de todos (el RZR y el buceo
    // no recogen) y con él la meta pasaba de 155 y Google la cortaba.
    metaDescription:
      "Aparta con el 30 % y liquida el resto el día del tour. Cancela gratis hasta 48 h antes. Guía NOM-09, entradas y seguro incluidos.",
    ogTitle: "Reservar tour en la Huasteca Potosina",
    ogDescription: "Aparta con el 30 % y liquida el resto el día del tour. Cancelación gratuita hasta 48 h antes.",
    eyebrow: "Motor de reservas",
    h1: "Elige tu recorrido",
    h1Acento: "y aparta tu lugar",
    introApartas: "No pagas todo hoy: ",
    introY: "apartas con el 30 %",
    introMedio: " y liquidas el día del tour. Si algo cambia, ",
    introCancelas: "cancelas gratis hasta 48 h antes",
    resenasGoogle: `${GOOGLE_RESENAS} reseñas en Google`,
    verlas: "Verlas →",
    confianza: [
      { t: "Apartas con el 30 %", s: "El resto lo liquidas el día del tour" },
      { t: "Cancelación gratuita", s: "Hasta 48 h antes, sin preguntas" },
      { t: "Grupos pequeños", s: "Guías certificados NOM-09" },
      // 🔴 "casi todos" a propósito: el RZR es en nuestra base, al buceo se
      // llega por cuenta propia y cinco recorridos cobran aparte desde Valles.
      { t: "Pasamos por ti", s: "En tu hospedaje, en casi todos los recorridos" },
    ],
    pasos: [
      { n: "1", t: "Elige tus recorridos", s: "Puedes juntar varios días en un solo carrito y pagarlos de una vez." },
      { n: "2", t: "Pago seguro con tarjeta", s: "Eliges fecha y personas. Apartas con el 30 % del total." },
      { n: "3", t: "Liquidas el día del tour", s: "Si quedó saldo, en efectivo o con tarjeta al llegar." },
    ],
    todosLosRecorridos: "Todos los recorridos",
    conteo: (n, desde) => `${n} recorridos · desde ${desde} MXN`,
    ordenadosPorReservas: " · ordenados por los más reservados",
    reservasUltimoMes: (n) => `${n} reservas confirmadas en los últimos 30 días`,
    totalParaGrupo: (total, n) => `${total} MXN en total para ${n} ${n === 1 ? "persona" : "personas"}`,
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
      "Hoy solo pagas el 30 % y liquidas el resto el día del recorrido.",
      "El precio que ves es el final: transporte, entradas, guía, equipo y seguro incluidos.",
      "Si el río no está en condiciones seguras, eliges tú: reembolso del 100 % o cambiar la fecha sin costo.",
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
    porGrupo: "por el grupo",
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
    notaPago: "Apartas con el 30 % · liquidas el resto el día del tour",
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
    precioUnidadYPago: (unidad) => `MXN ${unidad} · apartas con el 30 %`,
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
    personaSing: "persona",
    personaPl: "personas",
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
    viajeroSoloTitulo: "Falta gente para la salida:",
    viajeroSolo: (dias) => `pagas tu lugar al precio normal y te sumamos a una salida compartida. Te confirmamos ${dias} días antes; si no se junta el grupo, te devolvemos el 100 %.`,
    porPersonaExtra: "por persona",
    quitarAddOn: "Quitar",
    agregarAddOn: "Agregar",
    cuantosLoHacen: "¿Cuántos lo hacen?",
    queIncluyeYSeVisita: "Qué incluye y qué se visita",
    seVisita: "Se visita",
    incluye: "Incluye",
    duracionGrupo: (horas, min, max) =>
      `${horas} horas aprox. · grupo de ${min > 1 ? `${min} a ` : "hasta "}${max} personas`,

    agregarOtroRecorrido: "Agregar otro recorrido",
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

    recogidaCadaRecorrido: "Cómo llegas a cada recorrido:",
    noHaceFaltaHospedarte: "No necesitas hospedarte con nosotros.",
    horaExacta: "La hora exacta te la confirmamos por WhatsApp al reservar.",
    porPersona: "por persona",
    porVehiculo: "por vehículo",
    porGrupo: "por el grupo",
    desde: "desde",
    personas: (n) => `${n} ${n === 1 ? "persona" : "personas"}`,
    noches: (n) => `${n} noche${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/noche`,
    nochesGratisLinea: (n, ahorro) => `${n} noche${n > 1 ? "s" : ""} gratis — te ahorras ${ahorro}`,
    antesDePagarCola: " antes de pagar.",
    cancelacionGratuita: "Cancelación gratuita hasta 48 h antes, con reembolso completo.",
    cancelacionResto: "El resto de tus recorridos: cancelación gratuita hasta 48 h antes, con reembolso completo.",
    confianzaCancelasSalvo: (tours) => `Cancelas gratis hasta 48 h antes, salvo ${tours}`,
    cancelarExcepcion: (tour, texto) => `La excepción es ${tour}. ${texto}`,

    hospedajeTitulo: "¿Quieres que también te hospedemos?",
    // 🔴 Nada de "pasamos por ti aunque te quedes en otro lado": el RZR y el
    // buceo no recogen, y desde Valles cinco recorridos cobran el traslado.
    // Cómo llega cada quien ya lo dice el bloque de logística de arriba.
    hospedajeSub:
      "En nuestro Hotel Paraíso Encantado, en Xilitla. Es opcional: no necesitas hospedarte con nosotros para reservar tus recorridos.",
    hospedajeResumen: (n, precio) =>
      `${n} habitaciones desde ${precio} por noche · alberca, restaurante y a 7 min del centro de Xilitla`,
    hospedajeVerHabitaciones: "Ver habitaciones y precios",
    hospedajeYaTengo: "Ya tengo dónde dormir",
    hospedajeSaltar: "¿Ya reservaste en otro lado? Sigue sin hospedaje: arriba ves cómo llegas a cada recorrido.",
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
      `${huespedes} huésped${huespedes !== 1 ? "es" : ""} en ${habs} ${habs !== 1 ? "habitaciones" : "habitación"}`,
    salidaDespuesDeEntrada: "La salida tiene que ser al menos un día después de la entrada.",
    resumenNoches: (noches, huespedes, habs) =>
      `${noches} noche${noches > 1 ? "s" : ""} · ${huespedes} huésped${huespedes > 1 ? "es" : ""} · ${habs} ${habs > 1 ? "habitaciones" : "habitación"}`,
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
    // Sin "(Xilitla o Cd. Valles)": la Gruta, el Edén y otros solo recogen en
    // Xilitla, y el RZR y el buceo no recogen. Dónde pasamos lo dice el bloque
    // de logística, recorrido por recorrido.
    dondeTeHospedas: "¿Dónde te hospedas? (hotel y ciudad)",
    faltanDatos: (n, primero) => `Faltan ${n} datos: ${primero.toLowerCase()}…`,
    llevameAhi: "Llévame ahí →",
    unMomento: "Un momento…",
    continuarAlPago: "Continuar al pago →",
    continuar: "Continuar →",
    pagasHoy: (pct) => `Pagas hoy (${pct} %)`,
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

    procesando: "Procesando…",
    pagar: (monto) => `Pagar ${monto} MXN`,
    pagoCifrado: (saldo) => `Pago cifrado con Stripe · El saldo de ${saldo} lo liquidas el día del primer recorrido`,
    prefieresTransferencia: "¿Prefieres transferencia SPEI u OXXO?",
    apartarPorWhatsapp: "Apartar por WhatsApp",
    mandamosDatos: "Te mandamos los datos y apartamos tus lugares al recibir el comprobante.",
    otrasFormas: "Otras formas de pago",
    msiTitulo: (plazos) => `Hasta ${plazos} meses sin intereses`,
    msiDetalle: "Con tarjetas participantes. Los meses se eligen en el formulario de pago, al poner la tarjeta.",
    pagarTodoTitulo: (total) => `Pagar el viaje completo hoy · ${total}`,
    pagarTodoMsi: "Es lo que habilita los meses sin intereses: sobre el anticipo no los ofrece ningún banco.",
    pagarTodoVolver: (anticipo) => `Mejor pago solo el anticipo de ${anticipo}`,
    errorPago: "Error al procesar el pago. Intenta de nuevo.",
    pagoEnProceso: "Tu pago está en proceso. En cuanto el banco lo confirme te llega el correo.",
    waPagoAlterno: {
      intro: "Hola, quiero apartar este viaje pero prefiero pagar por transferencia SPEI u OXXO.",
      hospedaje: (hab, noches, huespedes, total) =>
        `Hospedaje: ${hab} — ${noches} noche(s) — ${huespedes} huésped(es) — ${total}`,
      terceraGratis: (ahorro) => `(ya con la 3.ª noche gratis: ahorro de ${ahorro})`,
      totalViaje: (total) => `Total del viaje: ${total} MXN`,
      anticipo: (monto) => `Pago de hoy: ${monto} MXN`,
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

    resenasGoogle: `${GOOGLE_RESENAS} reseñas en Google`,
    verlas: "Verlas →",
    credenciales: "+10,000 viajeros guiados · Guías certificados NOM-09 SECTUR · Seguro de viaje incluido",
    confianzaCancelas: "Cancelas gratis hasta 48 h antes",
    confianzaPago: (pct) => pct >= 100
      ? "Pago seguro con Stripe · Pagas el total y no queda saldo"
      : `Pago seguro con Stripe · Apartas con el ${pct} %`,
    antesDePagar: "Antes de pagar",
    otraDuda: "¿Te quedó otra duda?",
    escribenosWhatsapp: "Escríbenos por WhatsApp",
    faq: [
      {
        q: "¿Cuánto pago hoy y cuándo el resto?",
        a: "Hoy apartas con el 30 % del total y el saldo lo liquidas el día del primer recorrido, en efectivo o con tarjeta. Si prefieres pagar todo de una vez, escríbenos por WhatsApp y te mandamos la liga.",
      },
      {
        q: "¿Puedo cancelar?",
        clave: "cancelar",
        a: "Sí. Cancelación gratuita hasta 48 horas antes, con reembolso completo y sin preguntas.",
      },
      {
        q: "¿De dónde salimos y a qué hora?",
        clave: "salidas",
        a: "Depende del recorrido: la mayoría pasa por ti a tu hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, y algunos tienen horario y punto de encuentro propios. La hora exacta te la confirmamos por WhatsApp al reservar.",
      },
      {
        q: "¿Necesito hospedarme con ustedes?",
        a: "No. Hospedarte con nosotros es opcional; dónde pasamos por ti depende de cada recorrido y lo ves en «¿De dónde salimos y a qué hora?».",
      },
      {
        q: "¿Qué pasa si llueve?",
        a: "Operamos con lluvia ligera: la selva con agua se ve mejor. Si el río no está seguro, primero te cambiamos de actividad —hay recorridos que no dependen del río, como Las Pozas o la Gruta— y si ninguno te late, eliges reembolso o cambio de fecha. La idea es que ese día la pases bien de todos modos.",
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
      guiaEnIngles: "PIDIÓ GUÍA EN INGLÉS (sin costo): asignar guía bilingüe o avisarle antes por WhatsApp.",
      viajeroSolo: (tour, fecha) =>
        `${tour} — BAJO EL MÍNIMO (${fecha}): pagó tarifa normal. Sumarlo a una salida compartida y confirmarle ${CONFIRMA_SALIDA_DIAS} días antes; si no se junta, REEMBOLSO del 100 %.`,
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
    trasladoPaquete: "Te llevamos de tu hotel en Xilitla al inicio de cada recorrido y de regreso.",
    horaExacta: "Confirmamos tu hora exacta por WhatsApp.",
    cancelasGratis: "Cancelas gratis hasta 48 h antes, con reembolso completo.",
    cancelasGratisResto: "Lo demás: cancelas gratis hasta 48 h antes, con reembolso completo.",
    guiaEnIngles: "Sale un guía que habla inglés, sin costo extra.",
    fotosYVideo: "Fotos y video del recorrido que toma tu guía, sin costo extra.",
    totalDelViaje: "Total del viaje",
    sumaDeRecorridos: "Suma de los recorridos",
    descuentoVariosRecorridos: "Descuento por varios recorridos",
    pagasHoy: (pct) => `Pagas hoy (${pct} %)`,
    saldoDia: "Saldo el día del primer recorrido",
  },

  ficha: {
    cuandoVas: "¿Cuándo vas?",
    cuantosVan: "¿Cuántos van?",
    total: "Total",
    reservarHoy: (montoHoy) => `Reservar · hoy pagas ${montoHoy}`,
    restoElDia: (pct, resto) => `Apartas con el ${pct} %. El resto (${resto}) lo pagas el día del tour.`,
    sinPromoEnFecha: (hasta) => `Precio normal en esta fecha: la promo de temporada baja es para recorridos hasta el ${hasta}.`,
    continuar: "Elegir fecha y reservar",
    pasoUnoDeTres: "Paso 1 de 3 · después: tus datos y el pago. Puedes cambiar fecha y personas.",
    grupoLleno: (max) => `Este recorrido sale con grupos de máximo ${max} personas. ¿Van más? Escríbenos y armamos una salida privada.`,
    personas: "personas",
    grupoTope: (max) => `${max} personas es el máximo que permite el jardín por experiencia; no se puede ampliar.`,
    tarifaDelGrupo: (max) => `Tarifa del grupo completo, hasta ${max} personas`,
    porCabeza: (monto) => `Les sale en ${monto} por persona`,
    cadaUno: (monto) => `${monto} por persona`,
    unoMasBaja: (personas, monto) => `Si van ${personas}, baja a ${monto} por persona`,
    escaleraDesde: (personas, monto) => `Entre más van, menos pagan: ${monto} por persona si van ${personas}`,
    mejorPrecio: "Es el mejor precio por persona de este recorrido",
    viajeroSoloTitulo: "Falta gente para la salida:",
    viajeroSolo: (dias) => `pagas tu lugar al precio normal y te sumamos a una salida compartida. Te confirmamos ${dias} días antes; si no se junta el grupo, te devolvemos el 100 %.`,
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
    salida: (hora) => `Salida: ${hora}`,
    horario: (texto) => `Horario: ${texto}`,
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
    apartasCon: (monto, pct) => (pct >= 100 ? `Pagas hoy ${monto}` : `Apartas con ${monto}`),
    anticipo: "Anticipo",
    agregado: "Agregado",
    enTuCarrito: "En tu carrito",
    carrito: "Carrito",
    yaEstaEnCarrito: (tour) => `${tour} ya está en tu carrito — ir al carrito`,
    agregarAlCarrito: (tour) => `Agregar ${tour} al carrito`,
    verTuCarrito: (n) => `Ver tu carrito (${n})`,
    mxnPersona: "MXN/persona",
    mxnVehiculo: "MXN/vehículo",
    mxnGrupo: "MXN/grupo",
    agregar: "Agregar",
    elegirFecha: "Elegir fecha",
    masHospedaje: "+ hospedaje · ver total",
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
        text: "Envíanos tu número de confirmación al +52 489 109 0388. Te responderemos para coordinar tu punto de recogida exacto.",
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
    confirmarWhatsapp: "Confirmar por WhatsApp · +52 489 109 0388",
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
      `Confirmación ${folio}. ${personas} participante(s). Te contactaremos por WhatsApp (+52 489 109 0388) un día antes para coordinar la hora exacta de recogida.`,
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
  checkout: {
    pagoSeguro: "Pago seguro",
    dudasWhatsapp: "¿Dudas?",
    waDudas: "Hola, estoy en el pago de mi reserva y tengo una duda:",
    tuViajeHuasteca: "Tu viaje por la Huasteca",
    recorridosYDias: (n, rango) => `${n} ${n === 1 ? "recorrido" : "recorridos"} · ${rango}`,
    pasoExperiencia: "Tu experiencia",
    pasoDatos: "Tus datos",
    pasoPago: "Pago",
    editar: "Editar",
    continuar: "Continuar",
    irAlPago: "Ir al pago",
    preparandoPago: "Preparando tu pago…",
    sinFechaResumen: "Falta elegir la fecha",
    respuestasTitulo: "Lo que más nos preguntan",
    edadTitulo: "¿Pueden ir niños?",
    nadoTitulo: "¿Y si no sé nadar?",
    lluviaTitulo: "¿Y si llueve?",
    cancelTitulo: "¿Puedo cancelar?",
    pagoTitulo: "¿Cómo puedo pagar?",
    pagoTarjeta: "Con tarjeta de crédito o débito, y con Apple Pay o Google Pay si tu teléfono los tiene.",
    pagoMsi: "Y a 3, 6 o 9 meses sin intereses con tarjetas participantes, si eliges pagar el viaje completo hoy.",
    pagoAlterno: "¿Prefieres transferencia SPEI o pagar en OXXO? Se arma por WhatsApp: te mandamos los datos y apartamos tus lugares al recibir el comprobante.",
    edadNinos: "Sí. De 6 a 10 años pagan el 70 % y los menores de 6, el 50 %.",
    edadMinima: (tour, edad) => `${tour}: desde ${edad} años.`,
    soloAdultos: (tour) => `${tour} es solo para adultos.`,
    nadoSinSaber: "No necesitas saber nadar: llevas chaleco salvavidas todo el recorrido y vas con guía certificado.",
    lluviaGenerica: "Operamos con lluvia ligera: la selva con agua se ve mejor. Si el río no está seguro, primero te cambiamos de actividad —hay recorridos que no dependen del río, como Las Pozas o la Gruta— y si ninguno te late, eliges reembolso o cambio de fecha. La idea es que ese día la pases bien de todos modos.",
    cancelHasta: (fecha) => `Gratis hasta el ${fecha} (48 h antes), con reembolso completo.`,
    cancelGenerica: "Gratis hasta 48 h antes de tu recorrido, con reembolso completo.",
    extrasTitulo: "¿Necesitas hospedaje o traslado?",
    extrasSub: (precio) => `Hotel Paraíso Encantado desde ${precio}/noche · traslados desde SLP, Tampico y CDMX`,
    cotizacionLink: "¿Lo quieres pensar? Te mandamos la cotización por correo",
    datosIntro: "Para mandarte tu confirmación y coordinar tu recogida.",
    nombreLabel: "Nombre completo",
    whatsappLabel: "WhatsApp",
    whatsappAyuda: "Por aquí te confirmamos la hora de recogida.",
    correoLabel: "Correo electrónico",
    correoAyuda: "Aquí te llega tu confirmación.",
    hospedajeLabel: "¿Dónde te hospedas? (opcional)",
    hospedajeAyuda: "Hotel y ciudad. Si aún no lo sabes, déjalo vacío.",
    errNombre: "Escribe tu nombre completo.",
    errCorreo: "Revisa tu correo: le falta la @ o el dominio.",
    errWhatsapp: "Escribe tu WhatsApp con lada (10 dígitos en México).",
    totalDelViaje: "Total del viaje",
    queSigueTitulo: "Qué pasa después de reservar",
    queSigue: (saldo) => [
      "Te llega tu confirmación al instante, por correo.",
      "Te escribimos por WhatsApp para confirmarte la hora de recogida.",
      `El día del tour pagas el resto (${saldo}), en efectivo o con tarjeta.`,
    ],
    verDesglose: "Ver el desglose",
    pagoCifrado: "Pago cifrado con Stripe",
    guiaInglesLabel: "Quiero guía en inglés · sin costo",
    guiaInglesAyuda: "Lo anotamos en tu reserva y sale un guía que habla inglés. Si ese día no lo tenemos, te avisamos antes por WhatsApp.",
    barraTotal: (total) => `Total ${total}`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const en: BookingMessages = {
  catalogo: {
    metaTitle: "Book a Huasteca Potosina tour — 30 % deposit",
    metaDescription:
      "Pay 30 % today and settle the rest on tour day. Free cancellation up to 48 h before. NOM-09 guide, entrance fees and insurance included.",
    ogTitle: "Book a Huasteca Potosina tour",
    ogDescription: "A 30 % deposit holds your spot. Free cancellation up to 48 h before.",
    eyebrow: "Booking engine",
    h1: "Pick your tour",
    h1Acento: "and hold your spot",
    introApartas: "You don't pay it all today: ",
    introY: "hold your spot with 30 %",
    introMedio: " and settle the rest on tour day. If anything changes, ",
    introCancelas: "cancel free up to 48 h before",
    resenasGoogle: `${GOOGLE_RESENAS} Google reviews`,
    verlas: "Read them →",
    confianza: [
      { t: "Hold with 30 %", s: "Settle the rest on tour day" },
      { t: "Free cancellation", s: "Up to 48 h before, no questions" },
      { t: "Small groups", s: "NOM-09 certified guides" },
      { t: "We pick you up", s: "At your lodging, on most tours" },
    ],
    pasos: [
      { n: "1", t: "Pick your tours", s: "You can put several days in one cart and pay for them all at once." },
      { n: "2", t: "Hold with 30 %", s: "Choose your date and party. Secure card payment for the deposit." },
      { n: "3", t: "Settle on tour day", s: "If a balance is left, cash or card when you arrive." },
    ],
    todosLosRecorridos: "All tours",
    conteo: (n, desde) => `${n} tours · from ${desde} MXN`,
    ordenadosPorReservas: " · sorted by most booked",
    reservasUltimoMes: (n) => `${n} confirmed bookings in the last 30 days`,
    totalParaGrupo: (total, n) => `${total} MXN total for ${n} ${n === 1 ? "person" : "people"}`,
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
      "You only pay 30 % today and settle the rest on tour day.",
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
    porGrupo: "for the group",
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
    notaPago: "Hold with 30 % · settle the rest on tour day",
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
    precioUnidadYPago: (unidad) => `MXN ${unidad} · 30 % deposit at booking`,
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
    personaSing: "person",
    personaPl: "people",
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
    viajeroSoloTitulo: "Your group is below the minimum:",
    viajeroSolo: (dias) => `you pay the normal per-person price and we add you to a shared departure. We confirm ${dias} days ahead; if the group does not come together, you get 100 % back.`,
    porPersonaExtra: "per person",
    quitarAddOn: "Remove",
    agregarAddOn: "Add",
    cuantosLoHacen: "How many will do it?",
    queIncluyeYSeVisita: "What's included and what you'll visit",
    seVisita: "You'll visit",
    incluye: "Includes",
    duracionGrupo: (horas, min, max) =>
      `${horas} hours approx. · group of ${min > 1 ? `${min} to ` : "up to "}${max} people`,

    agregarOtroRecorrido: "Add another tour",
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

    recogidaCadaRecorrido: "How you get to each tour:",
    noHaceFaltaHospedarte: "You don't need to stay with us.",
    horaExacta: "We confirm the exact time on WhatsApp when you book.",
    porPersona: "per person",
    porVehiculo: "per vehicle",
    porGrupo: "for the group",
    desde: "from",
    personas: (n) => `${n} ${n === 1 ? "person" : "people"}`,
    noches: (n) => `${n} night${n > 1 ? "s" : ""}`,
    porNoche: (precio) => `${precio}/night`,
    nochesGratisLinea: (n, ahorro) => `${n} free night${n > 1 ? "s" : ""} — you save ${ahorro}`,
    antesDePagarCola: " before you pay.",
    cancelacionGratuita: "Free cancellation up to 48 h before, with a full refund.",
    cancelacionResto: "The rest of your tours: free cancellation up to 48 h before, with a full refund.",
    confianzaCancelasSalvo: (tours) => `Free cancellation up to 48 h before, except ${tours}`,
    cancelarExcepcion: (tour, texto) => `The exception is ${tour}. ${texto}`,

    hospedajeTitulo: "Would you like us to host you too?",
    hospedajeSub:
      "At our Hotel Paraíso Encantado, in Xilitla. It's optional: you don't need to stay with us to book your tours.",
    hospedajeResumen: (n, precio) =>
      `${n} rooms from ${precio} per night · pool, restaurant, 7 min from downtown Xilitla`,
    hospedajeVerHabitaciones: "See rooms and prices",
    hospedajeYaTengo: "I already have a place",
    hospedajeSaltar: "Already booked elsewhere? Skip this: you can see above how you get to each tour.",
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
    dondeTeHospedas: "Where are you staying? (hotel and town)",
    faltanDatos: (n, primero) => `${n} things missing: ${primero.toLowerCase()}…`,
    llevameAhi: "Take me there →",
    unMomento: "One moment…",
    continuarAlPago: "Continue to payment →",
    continuar: "Continue →",
    pagasHoy: (pct) => `You pay today (${pct} %)`,
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

    procesando: "Processing…",
    pagar: (monto) => `Pay ${monto} MXN`,
    pagoCifrado: (saldo) => `Encrypted payment with Stripe · You settle the ${saldo} balance on your first tour day`,
    prefieresTransferencia: "Prefer a SPEI transfer or OXXO?",
    apartarPorWhatsapp: "Hold it on WhatsApp",
    mandamosDatos: "We'll send you the details and hold your spots once we get the receipt.",
    otrasFormas: "Other ways to pay",
    msiTitulo: (plazos) => `Up to ${plazos} monthly payments, interest free`,
    msiDetalle: "With participating Mexican cards. You pick the plan in the payment form, once you enter the card.",
    pagarTodoTitulo: (total) => `Pay for the whole trip today · ${total}`,
    pagarTodoMsi: "This is what unlocks the interest-free months: no bank offers them on the deposit alone.",
    pagarTodoVolver: (anticipo) => `I'd rather pay just the ${anticipo} deposit`,
    errorPago: "Something went wrong with the payment. Please try again.",
    pagoEnProceso: "Your payment is processing. As soon as the bank confirms it, you'll get the email.",
    waPagoAlterno: {
      intro: "Hi, I'd like to book this trip but I'd rather pay by SPEI transfer or OXXO.",
      hospedaje: (hab, noches, huespedes, total) =>
        `Lodging: ${hab} — ${noches} night(s) — ${huespedes} guest(s) — ${total}`,
      terceraGratis: (ahorro) => `(3rd night already free: ${ahorro} saved)`,
      totalViaje: (total) => `Trip total: ${total} MXN`,
      anticipo: (monto) => `Due today: ${monto} MXN`,
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

    resenasGoogle: `${GOOGLE_RESENAS} Google reviews`,
    verlas: "Read them →",
    credenciales: "10,000+ travellers guided · NOM-09 SECTUR certified guides · Travel insurance included",
    confianzaCancelas: "Free cancellation up to 48 h before",
    confianzaPago: (pct) => pct >= 100
      ? "Secure payment with Stripe · Paid in full, no balance left"
      : `Secure payment with Stripe · ${pct} % deposit`,
    // Las reseñas son de viajeros reales, con nombre y ciudad. Se dejan tal como
    // las escribieron y se avisa de que están en español: traducirlas en
    // silencio sería poner palabras en boca de una persona identificable.
    antesDePagar: "Before you pay",
    otraDuda: "Still have a question?",
    escribenosWhatsapp: "Message us on WhatsApp",
    faq: [
      {
        q: "How much do I pay today and when do I pay the rest?",
        a: "You pay 30 % of the total today and settle the balance on the day of your first tour, in cash or by card. If you'd rather pay everything up front, message us on WhatsApp and we'll send you the link.",
      },
      {
        q: "Can I cancel?",
        clave: "cancelar",
        a: "Yes. Free cancellation up to 48 hours before, with a full refund and no questions asked.",
      },
      {
        q: "Where do we leave from and at what time?",
        clave: "salidas",
        a: "It depends on the tour: most pick you up at your lodging —hotel, hostel, cabin or Airbnb— in Xilitla or Ciudad Valles, and a few have their own schedule and meeting point. We confirm the exact time on WhatsApp when you book.",
      },
      {
        q: "Do I have to stay at your hotel?",
        a: "No. Staying with us is optional; where we pick you up depends on each tour — see «Where do we leave from and at what time?».",
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
      guiaEnIngles: "PIDIÓ GUÍA EN INGLÉS (sin costo): asignar guía bilingüe o avisarle antes por WhatsApp.",
      viajeroSolo: (tour, fecha) =>
        `${tour} — BAJO EL MÍNIMO (${fecha}): pagó tarifa normal. Sumarlo a una salida compartida y confirmarle ${CONFIRMA_SALIDA_DIAS} días antes; si no se junta, REEMBOLSO del 100 %.`,
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
    trasladoPaquete: "We take you from your hotel in Xilitla to the start of each tour and back.",
    horaExacta: "We confirm your exact time on WhatsApp.",
    cancelasGratis: "Cancel free up to 48 h before, with a full refund.",
    cancelasGratisResto: "Everything else: cancel free up to 48 h before, with a full refund.",
    /** Pidió guía en inglés, sin costo (8 oct 2026). */
    guiaEnIngles: "We'll send a guide who speaks English, at no extra cost.",
    fotosYVideo: "Photos and video of the tour, taken by your guide, at no extra charge.",
    totalDelViaje: "Trip total",
    sumaDeRecorridos: "Tours subtotal",
    descuentoVariosRecorridos: "Multi-tour discount",
    pagasHoy: (pct) => `You pay today (${pct} %)`,
    saldoDia: "Balance on your first tour day",
  },

  ficha: {
    cuandoVas: "When are you going?",
    cuantosVan: "How many of you?",
    total: "Total",
    reservarHoy: (montoHoy) => `Book · pay ${montoHoy} today`,
    restoElDia: (pct, resto) => `A ${pct}% deposit holds your spot. The rest (${resto}) is paid on the day of the tour.`,
    sinPromoEnFecha: (hasta) => `Regular price on this date: the low-season deal is for tours through ${hasta}.`,
    continuar: "Pick a date and book",
    pasoUnoDeTres: "Step 1 of 3 · next: your details and payment. You can still change date and party size.",
    grupoLleno: (max) => `This tour runs with groups of up to ${max}. More of you? Message us and we'll set up a private departure.`,
    personas: "people",
    grupoTope: (max) => `${max} people is the maximum the garden allows per experience; it cannot be extended.`,
    tarifaDelGrupo: (max) => `Flat rate for the whole group, up to ${max} people`,
    porCabeza: (monto) => `That works out to ${monto} per person`,
    cadaUno: (monto) => `${monto} per person`,
    unoMasBaja: (personas, monto) => `With ${personas} it drops to ${monto} per person`,
    escaleraDesde: (personas, monto) => `The more of you, the less you pay: ${monto} per person with ${personas}`,
    mejorPrecio: "That's the best per-person price on this tour",
    viajeroSoloTitulo: "Your group is below the minimum:",
    viajeroSolo: (dias) => `you pay the normal per-person price and we add you to a shared departure. We confirm ${dias} days ahead; if the group does not come together, you get 100 % back.`,
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
    salida: (hora) => `Departure: ${hora}`,
    horario: (texto) => `Schedule: ${texto}`,
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
    apartasCon: (monto, pct) => (pct >= 100 ? `You pay today ${monto}` : `Hold it with ${monto}`),
    anticipo: "Deposit",
    agregado: "Added",
    enTuCarrito: "In your cart",
    carrito: "Cart",
    yaEstaEnCarrito: (tour) => `${tour} is already in your cart — go to cart`,
    agregarAlCarrito: (tour) => `Add ${tour} to your cart`,
    verTuCarrito: (n) => `View your cart (${n})`,
    mxnPersona: "MXN/person",
    mxnVehiculo: "MXN/vehicle",
    mxnGrupo: "MXN/group",
    agregar: "Add",
    elegirFecha: "Pick a date",
    masHospedaje: "+ lodging · see total",
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
        text: "Send us your confirmation number at +52 489 109 0388. We'll reply to arrange your exact pickup point.",
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
    confirmarWhatsapp: "Confirm on WhatsApp · +52 489 109 0388",
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
      `Confirmation ${folio}. ${personas} participant(s). We'll contact you on WhatsApp (+52 489 109 0388) the day before to arrange the exact pickup time.`,
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
  checkout: {
    pagoSeguro: "Secure checkout",
    dudasWhatsapp: "Questions?",
    waDudas: "Hi, I'm on the payment page for my booking and I have a question:",
    tuViajeHuasteca: "Your Huasteca trip",
    recorridosYDias: (n, rango) => `${n} ${n === 1 ? "tour" : "tours"} · ${rango}`,
    pasoExperiencia: "Your experience",
    pasoDatos: "Your details",
    pasoPago: "Payment",
    editar: "Edit",
    continuar: "Continue",
    irAlPago: "Go to payment",
    preparandoPago: "Preparing your payment…",
    sinFechaResumen: "Date still missing",
    respuestasTitulo: "What people ask us most",
    edadTitulo: "Can kids come?",
    nadoTitulo: "What if I can't swim?",
    lluviaTitulo: "What if it rains?",
    cancelTitulo: "Can I cancel?",
    pagoTitulo: "How can I pay?",
    pagoTarjeta: "By credit or debit card, and with Apple Pay or Google Pay if your phone has them.",
    pagoMsi: "And in 3, 6 or 9 interest-free monthly payments with participating Mexican cards, if you choose to pay for the whole trip today.",
    pagoAlterno: "Prefer a SPEI transfer or paying in cash at OXXO? We set it up on WhatsApp: we send you the details and hold your spots once we get the receipt.",
    edadNinos: "Yes. Kids aged 6 to 10 pay 70% and under-6s pay 50%.",
    edadMinima: (tour, edad) => `${tour}: ages ${edad} and up.`,
    soloAdultos: (tour) => `${tour} is adults only.`,
    nadoSinSaber: "You don't need to swim: you wear a life jacket the whole way and go with a certified guide.",
    lluviaGenerica: "We run in light rain: the jungle looks better wet. If the river isn't safe we first switch you to another activity — there are tours that don't depend on the river, like Las Pozas or the Xilo Cave — and if none of them appeals, you choose a refund or a new date. The point is that you still have a good day.",
    cancelHasta: (fecha) => `Free until ${fecha} (48 h before), with a full refund.`,
    cancelGenerica: "Free up to 48 h before your tour, with a full refund.",
    extrasTitulo: "Need a place to stay or a transfer?",
    extrasSub: (precio) => `Hotel Paraíso Encantado from ${precio}/night · transfers from SLP, Tampico and Mexico City`,
    cotizacionLink: "Want to think it over? We'll email you the quote",
    datosIntro: "So we can send your confirmation and arrange your pickup.",
    nombreLabel: "Full name",
    whatsappLabel: "WhatsApp",
    whatsappAyuda: "We'll confirm your pickup time here.",
    correoLabel: "Email",
    correoAyuda: "Your confirmation goes here.",
    hospedajeLabel: "Where are you staying? (optional)",
    hospedajeAyuda: "Hotel and town. Leave it blank if you don't know yet.",
    errNombre: "Please enter your full name.",
    errCorreo: "Check your email: it's missing the @ or the domain.",
    errWhatsapp: "Enter your WhatsApp number with country code (e.g. +1 for the US).",
    totalDelViaje: "Trip total",
    queSigueTitulo: "What happens after you book",
    queSigue: (saldo) => [
      "Your confirmation arrives instantly by email.",
      "We message you on WhatsApp to confirm your pickup time.",
      `On the day of the tour you pay the rest (${saldo}), in cash or by card.`,
    ],
    verDesglose: "See the breakdown",
    pagoCifrado: "Encrypted payment with Stripe",
    guiaInglesLabel: "I'd like an English-speaking guide · no extra cost",
    guiaInglesAyuda: "We note it on your booking and send a guide who speaks English. If we don't have one that day, we'll tell you on WhatsApp beforehand.",
    barraTotal: (total) => `Total ${total}`,
  },
};

export function getBooking(locale: Locale): BookingMessages {
  return locale === "en" ? en : es;
}
