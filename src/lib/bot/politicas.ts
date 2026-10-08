/**
 * Lo que el bot de WhatsApp de Tours tiene que saber y que NO vive en el
 * catálogo: cómo se paga, qué pasa si llueve, a quién se recoge y dónde,
 * hotel, extranjeros, recogidas especiales…
 *
 * De dónde sale: de 26 chats reales que terminaron en reserva (jul–sep 2026),
 * resumidos en hechos cortos, más las decisiones de Manolo del 29 sep al 6 oct
 * (anticipo 30 %, vigencia 48 h, check-in 3 pm / check-out 12 pm, rafting con
 * comida, rappel con traslado desde Ciudad Valles, RZR a la hora que elija el
 * cliente). `src/scripts/export-bot-data.ts` lo copia a `whatsapp-bot/data.json`
 * y el bot lo consulta con su herramienta `consultar_politica({tema})`.
 *
 * 🔴 El repo es PÚBLICO: aquí no va NINGÚN dato de un cliente (nombres,
 * teléfonos, correos, cuentas). Solo hechos del negocio, redactados para que el
 * bot los pueda decir tal cual.
 *
 * 🔴 Ninguna cifra que el sitio ya calcula se escribe a mano: el anticipo sale
 * de `ANTICIPO_PCT` (el que cobra el servidor), los mínimos de `groupMin`, los
 * traslados de `TRASLADOS` y quién acepta viajero solo de `aceptaViajeroSolo`.
 * Lo que NO está confirmado no se escribe: el recargo de la liga de pago, si el
 * RZR cruza ríos, una tabla de descuentos de grupo. Ahí el bot dice «te lo
 * confirmo» y avisa al equipo.
 *
 * Para agregar un tema: un objeto más con `tema` (corto, sin espacios),
 * `titulo`, `texto` (frases que el bot puede citar) y `claves` (palabras con
 * que el cliente lo pregunta, en español y en inglés). Después se regenera
 * `data.json` y se vuelve a desplegar el bot.
 */
import { TOURS_DB, partesRecogida, recogidaDeTour, type Tour } from "@/lib/tours";
import { aceptaViajeroSolo, CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
import { enAuto } from "@/lib/tiemposDeViaje";
import { TRASLADOS } from "@/lib/traslados";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { fechaInicioTexto } from "@/lib/temporada";

export interface PoliticaBot {
  /** Identificador corto que pide la herramienta (`anticipo-y-pago`, `rzr`…). */
  tema: string;
  titulo: string;
  /** Hechos cortos que el bot puede decir tal cual. */
  texto: string;
  /** Cómo lo pregunta el cliente: sirven para encontrar el tema sin saber su nombre. */
  claves: string[];
}

const SALDO_PCT = 100 - ANTICIPO_PCT;

const tour = (slug: string) => TOURS_DB.find((t) => t.slug === slug);

/** "a, b y c". */
function listaY(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

const pesos = (n: number) => `$${n.toLocaleString("es-MX")}`;

/** El mínimo de personas de un tour, leído del catálogo (rafting 5, rappel 4…). */
const minimo = (slug: string) => tour(slug)?.groupMin ?? 0;

/**
 * Los mínimos que hay que decir al vender: los de más de 2. El rafting se vendió
 * una vez sin saber que pide 5 y se canceló la víspera; que no vuelva a pasar.
 */
const MINIMOS_ALTOS = TOURS_DB.filter((t) => t.groupMin > 2).map((t) => `${t.nombreCorto}, desde ${t.groupMin} personas`);

/** Los tours donde un viajero solo puede unirse a la salida compartida. */
const CON_VIAJERO_SOLO = TOURS_DB.filter(aceptaViajeroSolo).map((t) => t.nombreCorto);

/** El cupo más grande de una salida normal. */
const GRUPO_MAX = Math.max(...TOURS_DB.map((t) => t.groupMax));

/** Traslados privados con tarifa, armados de `traslados.ts` (la única fuente de esos precios). */
const TRASLADOS_TEXTO = TRASLADOS.map((r) => {
  const tramos = r.tarifas
    .map((t) => `${pesos(t.precio)} (${t.hasta === null ? `${t.desde} o más personas` : `${t.desde} a ${t.hasta} personas`})`)
    .join(", ");
  return `${r.ciudad}: ${tramos}`;
}).join("; ");

/**
 * La ÚNICA ciudad donde recogemos cuando el catálogo cae al «Xilitla o Ciudad
 * Valles» por defecto pero la línea de traslado de su `incluye` nombra una
 * sola (hoy el rappel: «Traslado desde Ciudad Valles»). Es la regla de
 * `ciudadUnicaDeRecogida` de la ficha (components/TourDeparture.tsx), que no
 * se puede importar aquí: es un componente de Next y este archivo también lo
 * lee el export del bot, que corre fuera de Next.
 */
function ciudadUnica(t: Tour): "Xilitla" | "Ciudad Valles" | null {
  if (recogidaDeTour(t).tipo !== "hospedaje") return null;
  const linea = t.incluye.find((i) => /traslado/i.test(i)) ?? "";
  const xilitla = /xilitla/i.test(linea);
  const valles = /ciudad valles/i.test(linea);
  if (xilitla === valles) return null;
  return xilitla ? "Xilitla" : "Ciudad Valles";
}

const nombresDe = (f: (t: Tour) => boolean) => TOURS_DB.filter(f).map((t) => t.nombreCorto);

/**
 * Dónde recoge cada recorrido, agrupado y leído del catálogo (`recogida`):
 * de eso depende en qué zona le conviene hospedarse al cliente. Un recorrido
 * nuevo cae solo en su grupo.
 */
const ZONAS = {
  /** Pasamos por él a su hospedaje en Xilitla o en Ciudad Valles. */
  ambas:       nombresDe((t) => recogidaDeTour(t).tipo === "hospedaje" && !ciudadUnica(t)),
  /** Solo en su hospedaje de Xilitla; desde Ciudad Valles el traslado se cotiza aparte. */
  soloXilitla: nombresDe((t) => recogidaDeTour(t).tipo === "hospedaje-xilitla" || ciudadUnica(t) === "Xilitla"),
  /** Solo en su hospedaje de Ciudad Valles. */
  soloValles:  nombresDe((t) => ciudadUnica(t) === "Ciudad Valles"),
  /** Nos vemos en nuestra base de Xilitla: llega por su cuenta. */
  baseXilitla: nombresDe((t) => recogidaDeTour(t).tipo === "base-xilitla"),
  /** En el lugar mismo: llega por su cuenta, se hospede donde se hospede. */
  enSitio:     TOURS_DB.filter((t) => recogidaDeTour(t).tipo === "en-sitio")
    .map((t) => `${t.nombreCorto} es en ${partesRecogida(t, false).lugar}`),
};

/**
 * «¿Dónde nos recomiendan quedarnos?». En la prueba de Manolo del 6 oct el bot
 * se saltó la pregunta, brincó al precio y al «¿te lo aparto?» e inventó un
 * traslado de Valles a Xilitla «sin costo extra». Aquí va la respuesta con lo
 * que de verdad hay: la recogida de cada tour (del catálogo), nuestro hotel
 * (los datos de `hotelServicios` del export) y, para otros hoteles, el tema
 * «hoteles-alternativos».
 */
const DONDE_HOSPEDARSE = [
  "No hace falta hospedarse con nosotros: en los tours con traslado pasamos por el cliente a su hospedaje (hotel, hostal, cabaña o Airbnb) y lo regresamos ahí. La zona depende de los tours que eligió.",
  ZONAS.ambas.length ? `En Xilitla o en Ciudad Valles, cualquiera le sirve: ${listaY(ZONAS.ambas)}.` : "",
  ZONAS.soloXilitla.length
    ? `Solo en Xilitla (desde Ciudad Valles el traslado NO va incluido: se cotiza aparte): ${listaY(ZONAS.soloXilitla)}.`
    : "",
  ZONAS.soloValles.length ? `Solo en Ciudad Valles: ${listaY(ZONAS.soloValles)}.` : "",
  ZONAS.baseXilitla.length ? `${listaY(ZONAS.baseXilitla)}: en nuestra base de Xilitla; llega por su cuenta.` : "",
  ZONAS.enSitio.length ? `${listaY(ZONAS.enSitio)}: llega por su cuenta.` : "",
  "En corto: si alguno de sus tours recoge solo en Xilitla" +
    (ZONAS.baseXilitla.length ? " o empieza en nuestra base" : "") +
    ", le conviene Xilitla" +
    (ZONAS.soloValles.length ? `; con ${listaY(ZONAS.soloValles)}, Ciudad Valles` : "") +
    "; si todos recogen en las dos, la que prefiera.",
  "En Xilitla está nuestro hotel, el Hotel Paraíso Encantado, a 5 minutos caminando de Las Pozas, con alberca, restaurante y estacionamiento gratis: ofrécelo como opción, no como requisito, y revisa disponibilidad antes de ofrecer un cuarto. Si prefiere otro, consulta «hoteles-alternativos»: también pasamos por él ahí.",
  "Un traslado entre Ciudad Valles y Xilitla (cambiar de zona, o ir desde Valles a un tour de solo Xilitla) NO va incluido salvo que una herramienta lo diga: nunca digas «sin costo», «gratis» ni «sin costo extra»; si lo pide, se cotiza con el equipo (escalar_a_humano: traslado_sin_tarifa, avisar).",
  "Contesta esto primero y pregúntale qué zona prefiere; en ese mensaje no cotices ni ofrezcas apartar.",
].filter(Boolean).join(" ");

export const POLITICAS_BOT: PoliticaBot[] = [
  {
    tema: "anticipo-y-pago",
    titulo: "Anticipo y cómo se aparta",
    texto:
      `Toda reserva —tour, RZR, paquete con hotel o viaje a la medida— se aparta con el ${ANTICIPO_PCT} % de anticipo; el ${SALDO_PCT} % restante es el saldo. ` +
      `Dilo siempre con montos: «se aparta con $X (${ANTICIPO_PCT} %) y el resto, $Y, se paga…». ` +
      "Si el cliente prefiere pagar el 100 % desde el principio, también se puede. " +
      "El lugar queda apartado cuando el equipo valida el pago: nunca des una reserva por confirmada; di «en cuanto lo validemos te mando tu confirmación». " +
      "Se puede reservar por este chat o en la página del tour.",
    claves: ["anticipo", "apartar", "reservar", "cómo reservo", "cuánto pago", "porcentaje", "depósito", "pagar todo", "100 %", "deposit", "how to book"],
  },
  {
    tema: "saldo",
    titulo: "Cuándo y cómo se paga el resto",
    texto:
      "Tour suelto: el saldo se paga el día del tour, en efectivo al guía o por transferencia (avisándole al guía). " +
      "Paquete con hotel: el saldo se paga al hacer check-in en la recepción del hotel, en efectivo, con tarjeta o por transferencia. " +
      "Con tarjeta, el saldo solo se paga en la recepción del hotel o con una liga de pago que manda el equipo: el guía NO cobra con tarjeta. " +
      "No hay depósito en garantía ni cargos extra al llegar: el precio cotizado es el precio final.",
    claves: ["saldo", "resto", "restante", "liquidar", "pagar allá", "al llegar", "check-in", "efectivo", "guía cobra", "balance", "pay the rest"],
  },
  {
    tema: "metodos-de-pago",
    titulo: "Formas de pago",
    texto:
      "El anticipo se paga por transferencia a la CLABE, con depósito en efectivo en OXXO o con tarjeta (en la página para los tours por persona, o con una liga de pago que manda el equipo). " +
      "Para TRANSFERIR se usa la CLABE interbancaria; el número de tarjeta es SOLO para depositar en OXXO. Si transfieren al número de la tarjeta, el banco responde «cuenta inexistente». " +
      "Concepto de la transferencia: el folio de la cotización (COT-…). " +
      "Al pagar, el cliente manda el comprobante (foto o PDF) a este mismo chat y el equipo lo valida. " +
      "Los datos bancarios salen de la herramienta de pago con el monto y el folio: nunca los escribas de memoria. " +
      "Meses sin intereses o cargos por pagar con liga: lo confirma el equipo.",
    claves: ["transferencia", "clabe", "oxxo", "depósito", "tarjeta", "cuenta", "datos bancarios", "concepto", "comprobante", "cuenta inexistente", "liga", "link de pago", "meses sin intereses", "msi", "spei", "card", "bank transfer"],
  },
  {
    tema: "extranjeros",
    titulo: "Clientes del extranjero",
    texto:
      "Contesta en el idioma del cliente y manda los links en su versión /en/ cuando escribe en inglés. " +
      "Con tarjeta extranjera se paga con tarjeta en línea: en la página del tour o con una liga de pago que manda el equipo. " +
      "La transferencia solo sirve si el cliente tiene cuenta en un banco mexicano. " +
      "No aceptamos Revolut ni transferencias internacionales (no hay datos SWIFT). " +
      "Los precios son en pesos mexicanos (MXN).",
    claves: ["extranjero", "foreign", "revolut", "swift", "wire", "international", "tarjeta extranjera", "dólares", "usd", "dollars", "english", "inglés"],
  },
  {
    tema: "vigencia",
    titulo: "Cuánto dura una cotización",
    texto:
      "Una cotización vale 48 horas: hasta la fecha y hora que trae la propia cotización se respetan su precio y su lugar. " +
      "Si vence sin pago, se vuelve a cotizar con el precio y la disponibilidad de ese momento. " +
      "La fecha de vencimiento la da el sistema al crear la cotización: cítala tal cual, no la calcules.",
    claves: ["vigencia", "vence", "hasta cuándo", "cuánto dura la cotización", "respetan el precio", "expira", "valid", "expire"],
  },
  {
    tema: "para-manana",
    titulo: "Tours para mañana o para hoy",
    texto:
      "Para MAÑANA sí se cotiza, pero el anticipo tiene que quedar pagado antes de las 10:00 pm de hoy, para organizar la logística de la mañana; el equipo confirma que haya salida armada para esa fecha y zona. " +
      "Para HOY no lo confirmes tú: di que el equipo lo revisa y te responde, y ofrece la fecha de mañana como opción.",
    claves: ["mañana", "para mañana", "hoy", "para hoy", "mismo día", "última hora", "urgente", "ahorita", "tomorrow", "today", "tonight"],
  },
  {
    tema: "cancelacion",
    titulo: "Cancelación y cambios",
    texto:
      "Si cancela el cliente: con 48 horas o más de anticipación se devuelve el 100 %, incluido el anticipo; entre 48 y 24 horas antes se retiene el 50 %; con menos de 24 horas no hay reembolso, pero puede reagendar una vez sin costo. " +
      "Si cancelamos nosotros (tormenta eléctrica, alerta meteorológica, río no seguro o paraje cerrado): el cliente elige reembolso del 100 % o reagendar sin costo; ahí no aplica la regla de las 48 horas. " +
      "Garantía turquesa: si el día del tour el agua no está turquesa, aunque el recorrido opere, puede reagendar una vez gratis avisando por WhatsApp antes de la hora de salida. " +
      "El reembolso se hace por transferencia a la cuenta que indique el cliente. " +
      "Algún recorrido tiene política propia (el campo `cancelacion` de su ficha manda). " +
      "Cambios o cancelaciones de una reserva YA pagada los atiende el equipo: explica la política sin prometer montos y pasa el chat.",
    claves: ["cancelar", "cancelación", "reembolso", "devolución", "reagendar", "cambiar fecha", "cambio", "no puedo ir", "refund", "cancel", "reschedule"],
  },
  {
    tema: "clima-y-rio",
    titulo: "Lluvia, clima y estado del río",
    texto:
      "Se sale con lluvia ligera si es seguro; con tormenta eléctrica, alerta o el río crecido no se sale y aplica «si cancelamos nosotros» (reembolso o reagendar). " +
      "Normalmente llueve por la tarde-noche, así que a la hora de los recorridos el agua suele estar asentada; si llovió el día anterior puede no estar turquesa, pero tampoco café. " +
      // La regla de temporada.ts (7 oct 2026), con su fecha. Decía «temporada
      // seca: noviembre a junio, con el agua más turquesa», que no es lo que
      // dicen la web ni la franja del río (junio es de transición).
      `Se puede venir todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara; el turquesa más intenso es de marzo a mayo, y es cuando más gente hay. Junio es de transición: llegan las primeras lluvias. ` +
      "Temporada de lluvias: julio a octubre; las cascadas van a todo caudal, el agua puede bajar con sedimento y el rafting depende del nivel del río ese día (si crece, aplica «si cancelamos nosotros»: reagendar sin costo o reembolso). " +
      `Del ${fechaInicioTexto("es")} a diciembre es «la mejor temporada para venir» (aflojan las lluvias, el agua se aclara y todavía no llegan las multitudes de primavera; las fechas de fin de año sí se llenan): no prometas para esas fechas el turquesa más intenso. ` +
      "Si un paraje está cerrado por el río, se ofrece la alternativa del tour al mismo precio o reagendar. " +
      "Nunca digas que la lluvia no afecta a los ríos: sí los afecta.",
    claves: ["lluvia", "llueve", "clima", "río", "crecido", "turquesa", "café", "temporada", "cerrado", "tormenta", "septiembre", "octubre", "rain", "weather", "river"],
  },
  {
    tema: "ninos-y-edades",
    titulo: "Niños y edades",
    texto:
      "En los tours que se cobran por persona: niños de 6 a 10 años pagan el 70 % del precio de adulto y menores de 6 el 50 %; de 11 años en adelante pagan como adulto. " +
      "Cada tour tiene su edad mínima en su ficha (`edadMinima` y `edadNota`); el buceo es solo para mayores de 10. " +
      "En el RZR los niños van según el vehículo (cada unidad dice cuántos adultos y niños lleva). " +
      "Pregunta las edades junto con el número de personas, antes de proponer. " +
      "Una excepción a la edad mínima no la decides tú: la confirma el equipo.",
    claves: ["niños", "niño", "hijo", "hija", "edad", "años", "bebé", "menor", "familia", "kids", "children", "child", "baby"],
  },
  {
    tema: "minimos-y-viajero-solo",
    titulo: "Mínimos de personas y viajero solo",
    texto:
      `Cada tour tiene mínimo y máximo de personas (\`groupMin\` y \`groupMax\` de su ficha). ` +
      // 🔴 8 oct 2026: cambió la regla. Antes, quien iba bajo el mínimo pagaba
      // el precio de dos personas menos $2; ahora paga TARIFA NORMAL y lo que
      // protege el margen es que la salida no corre si no se llena.
      `Quien va BAJO el mínimo sí puede reservar en línea: paga la tarifa normal por persona y se le suma a una salida compartida. ` +
      `Se le confirma ${CONFIRMA_SALIDA_DIAS} días antes de la fecha y, si no se junta el grupo, se le devuelve el 100 %. ` +
      (MINIMOS_ALTOS.length ? `Los de mínimo alto, dilo al vender: ${listaY(MINIMOS_ALTOS)}. ` : "") +
      "NUNCA le prometas que la salida ya está armada: eso lo confirma el equipo.",
    claves: ["mínimo", "mínimo de personas", "solo", "sola", "viajo solo", "una persona", "1 persona", "me puedo unir", "unirme", "grupo armado", "solo traveler", "alone", "minimum"],
  },
  {
    tema: "grupos",
    titulo: "Grupos grandes y descuentos de grupo",
    texto:
      "No hay tabla de descuentos de grupo: cotiza el precio normal como referencia y di que el equipo le confirma si hay un precio especial (avisa al equipo). Nunca inventes un descuento. " +
      `Una salida normal lleva hasta ${GRUPO_MAX} personas (el máximo de cada tour está en su ficha). ` +
      "Grupos más grandes, escuelas, empresas o agencias: van con unidad y guía exclusivos y los cotiza el equipo; junta fechas, número de personas, ciudad de salida y tipo de grupo.",
    claves: ["grupo", "grupo grande", "descuento", "precio especial", "somos muchos", "escuela", "empresa", "agencia", "familia grande", "group", "discount"],
  },
  {
    tema: "recogida",
    titulo: "Recogida y punto de encuentro",
    texto:
      "En los tours con traslado pasamos por el cliente a su hospedaje —hotel, hostal, cabaña o Airbnb— en Xilitla o en Ciudad Valles, según el tour (su campo `salida` lo dice), y al terminar lo dejamos de nuevo ahí. Por eso pregunta dónde se hospeda antes de proponer. " +
      "Casos especiales: desde El Naranjo se puede recoger, alrededor de las 10:00 am en vez de la hora normal; desde Jalpan u otra zona fuera de Xilitla y Ciudad Valles, el cliente llega al Hotel Paraíso Encantado (Xilitla) antes de las 8:30 am y de ahí sale la unidad; en Tamasopo no recogemos (solo Ciudad Valles y Xilitla, por logística). " +
      "El RZR es en nuestra base de Xilitla, aunque se hospede cerca (por ejemplo en Huichihuayán). " +
      "En paquetes con hotel los recorridos salen del hotel: estar 15 minutos antes en el estacionamiento. " +
      "La hora exacta de recogida la da el guía la tarde anterior al tour.",
    claves: ["recogida", "recogen", "pasan por", "punto de encuentro", "dónde empieza", "de dónde sale", "hotel", "airbnb", "jalpan", "el naranjo", "tamasopo", "huichihuayán", "a qué hora pasan", "pickup", "meeting point"],
  },
  {
    tema: "traslados",
    titulo: "Traslados desde otra ciudad",
    texto:
      `Traslado privado hasta Xilitla, precio POR VEHÍCULO e IDA Y VUELTA (no por persona), con recogida a domicilio: ${TRASLADOS_TEXTO}. ` +
      "Otras ciudades, tramos sencillos (solo ida o solo regreso), aeropuertos o grupos más grandes los cotiza el equipo: no inventes precio.",
    claves: ["traslado", "transporte desde", "aeropuerto", "tampico", "san luis potosí", "cdmx", "ciudad de méxico", "rioverde", "monterrey", "querétaro", "transfer", "airport", "shuttle"],
  },
  {
    tema: "como-llegar",
    titulo: "Cómo llegar a Xilitla o Ciudad Valles",
    texto:
      "En auto desde la Ciudad de México se va por Querétaro y Peña de Bernal; el último tramo es sierra con curvas: conviene manejar de día y con calma. " +
      "En autobús: hay salida nocturna desde la Central del Norte (CDMX) alrededor de las 10:15 pm que llega a Xilitla hacia las 6:30 am. " +
      `En avión, el aeropuerto más práctico es Tampico; de Tampico a Ciudad Valles son ${enAuto("tampico", "valles")} y hasta Xilitla ${enAuto("tampico")}. Desde Puebla conviene llegar vía Tampico. ` +
      "Horarios y tarifas de autobús son aproximados: que el cliente los confirme al comprar. Para no manejar, existe el traslado privado (tema traslados).",
    claves: ["cómo llego", "cómo llegar", "autobús", "camión", "avión", "manejar", "carretera", "ruta", "central del norte", "puebla", "how to get", "bus", "flight", "drive"],
  },
  {
    tema: "hotel",
    titulo: "Hotel Paraíso Encantado (el nuestro, en Xilitla)",
    texto:
      "Check-in a partir de las 3:00 pm y check-out a las 12:00 pm. Se registra solo con el nombre del titular de la reserva. " +
      "Si llegan temprano —por ejemplo en el autobús de la mañana—: se les da la habitación al llegar si ya está libre; si no, dejan las maletas en recepción (ahí quedan seguras) y esperan la camioneta del tour. " +
      "En los paquetes, el primer tour sale del hotel temprano el MISMO día de llegada (8:30 a 9:00 am): si no alcanzan a llegar a esa hora, conviene agregar la noche anterior (la herramienta de precio la calcula como noche extra). " +
      "No hace falta hospedarse con nosotros para tomar un tour. " +
      "Disponibilidad de habitaciones: revísala antes de cotizar un paquete; si no hay o piden una cama especial, avisa al equipo.",
    claves: ["check-in", "check in", "check-out", "checkout", "entrada al hotel", "salida del hotel", "llegamos temprano", "maletas", "equipaje", "habitación", "noche extra", "noche antes", "hotel", "luggage", "early arrival"],
  },
  {
    // Antes de «hoteles-alternativos» a propósito: en un empate de la búsqueda
    // gana el que va primero, y «¿dónde nos quedamos?» se contesta con éste.
    tema: "donde-hospedarse",
    titulo: "Dónde conviene hospedarse según sus tours",
    texto: DONDE_HOSPEDARSE,
    claves: [
      "dónde hospedarnos", "dónde hospedarse", "dónde nos hospedamos", "hospedarse", "hospedarnos", "hospedaje",
      "dónde quedarnos", "dónde nos quedamos", "quedarnos", "quedarse", "dónde dormir", "dormir",
      "hotel", "recomiendan", "xilitla o valles", "valles o xilitla", "xilitla", "valles", "qué zona", "en qué ciudad",
      "where to stay", "where should we stay", "stay in xilitla", "stay in valles", "lodging", "accommodation",
    ],
  },
  {
    tema: "hoteles-alternativos",
    titulo: "Otros hoteles que recomendamos",
    texto:
      "Si nuestro hotel no tiene lugar o el cliente prefiere otro: en Xilitla, Posada James (parecido al nuestro), Puerta del Cielo, Roof Top, Camino Surreal, Teneka, Real de Lua, Cervecería James, Tapasoli y Posada El Castillo (la antigua casa de Edward James); en Ciudad Valles, Los Arcos, Sierra Huasteca Inn y Hotel Valles. " +
      "Pasamos por el cliente a cualquiera de ellos en los tours con recogida. No reservamos por ellos ni damos sus precios.",
    claves: ["otro hotel", "hoteles", "dónde hospedarme", "dónde quedarme", "recomiendas hotel", "no hay lugar", "lleno", "hospedaje", "other hotels", "where to stay"],
  },
  {
    tema: "senal-celular",
    titulo: "Señal de celular",
    texto:
      "En Xilitla la señal de Telcel sí funciona; AT&T no. En los parajes (cascadas, ríos y sótanos) normalmente no hay señal. " +
      "Conviene avisar a la familia antes de salir al tour.",
    claves: ["señal", "celular", "internet", "telcel", "at&t", "cobertura", "datos", "signal", "phone", "wifi"],
  },
  {
    tema: "rzr",
    titulo: "Recorrido en RZR",
    texto:
      "Hora de inicio: la elige el cliente, entre 9:00 am y 5:00 pm. Punto de encuentro: nuestra base en Xilitla; el cliente llega por su cuenta. " +
      "Requisitos: el conductor presenta su licencia de conducir y todos firman una responsiva; no se necesita experiencia (hay briefing de manejo y un guía instructor abre la ruta). " +
      "No incluye alimentos; se puede llevar una mochila con agua y algo de comer. " +
      "El precio es por vehículo, según la ruta y la unidad, y es el precio final (no hay depósito en garantía). " +
      "Si preguntan si se cruzan ríos: no lo afirmes ni lo niegues; di «te lo confirmo» y avisa al equipo.",
    claves: ["rzr", "razer", "cuatrimoto", "todoterreno", "off-road", "can-am", "polaris", "defender", "maverick", "licencia", "manejar", "cruza ríos", "hora rzr", "atv", "utv", "driver license"],
  },
  {
    tema: "rafting",
    titulo: "Rafting en el Río Tampaón",
    texto:
      "Incluye una comida, que el cliente elige tomar antes o después del descenso (no lleva el desayuno buffet de los otros tours). " +
      `Se firma una responsiva. Sale con mínimo de ${minimo("rafting-rio-tampaon")} personas: dilo al vender; si no se junta el grupo, el equipo ofrece otra actividad o la devolución. ` +
      "Depende del nivel del río: en lluvias la salida se confirma según el río ese día; si no es seguro, se reprograma o se propone una alternativa. " +
      "No hace falta saber nadar: se va con chaleco y casco, y el guía va dentro de la balsa. La edad mínima está en su ficha.",
    claves: ["rafting", "balsa", "rápidos", "tampaón", "descenso en río", "comida rafting", "whitewater"],
  },
  {
    tema: "rappel",
    titulo: "Rappel en la Cascada de Tamul",
    texto:
      "Incluye el traslado desde Ciudad Valles: pasamos por el cliente a su hospedaje en Ciudad Valles y vamos al embarcadero del Río Tampaón. Si se hospeda en otra zona, el punto de encuentro lo confirma el equipo. " +
      `Sale con mínimo de ${minimo("rappel-tamul")} personas. No incluye alimentos. Las fotos y el video con dron van incluidos. No se necesita experiencia previa. ` +
      "El rappel en otros lugares (por ejemplo la Cascada de los Comales) no está en el catálogo.",
    claves: ["rappel", "descenso", "cuerda", "comales", "rapel", "rappelling"],
  },
  {
    tema: "tamul",
    titulo: "Expedición Tamul: esfuerzo y detalles",
    texto:
      "Al llegar a la cascada se va en canoa (remar es opcional), aproximadamente 1 hora y media de ida y 1 hora de regreso. " +
      "Si el río lo permite, después de la cascada se bajan de la canoa y flotan unos 20 minutos, con chaleco, hasta la Cueva del Agua. " +
      "A la Cueva del Agua se suben unos 35 escalones. Lo más pesado es el Sótano de las Huahuas: unos 600 escalones de bajada y de subida. Si alguien tiene problemas de rodillas o de movilidad, que lo diga antes. " +
      "Si cierran la cascada por el río, hay alternativa al mismo precio: se ve la cascada desde arriba, se baja por un costado para fotos y se visita el Sótano de las Huahuas; si el río mejora, se hace completo.",
    claves: ["tamul", "canoa", "escalones", "cueva del agua", "huahuas", "flotar", "nadar", "rodilla", "esfuerzo", "cascada cerrada", "canoe", "stairs"],
  },
  {
    tema: "meco",
    titulo: "Cascadas del Meco",
    texto:
      "Es el recorrido más tranquilo: el indicado para adultos mayores o para quien no quiere mucho esfuerzo físico. " +
      "Incluye el paseo en canoa. Kayak, paddle board o tubing son opcionales y tienen costo aparte.",
    claves: ["meco", "el salto", "adulto mayor", "abuelo", "abuela", "tercera edad", "tranquilo", "poco esfuerzo", "tubing", "kayak", "paddle", "elderly"],
  },
  {
    tema: "golondrinas",
    titulo: "Sótano de las Golondrinas",
    texto:
      "El Sótano de las Golondrinas NO lo operamos ni va dentro de ningún tour (tampoco de la Expedición Tamul). " +
      "Si el cliente quiere ir por su cuenta: está en Aquismón, a poco más de 1 hora de Ciudad Valles por sierra; lo mejor es al amanecer, cuando salen las aves (hacia las 5:45 am). Más datos en la ficha del destino `sotano-de-las-golondrinas`. " +
      "Ofrece lo que sí hay: la Expedición Tamul, que visita el Sótano de las Huahuas, otro sótano de aves.",
    claves: ["golondrinas", "sótano de las golondrinas", "vencejos", "aves", "swallows", "cave of swallows"],
  },
  {
    tema: "guia-en-ingles",
    titulo: "Guía en inglés",
    texto:
      "En una salida compartida el guía habla inglés básico: pregúntale al cliente si está bien así. " +
      "Un guía bilingüe solo se consigue si se pide con anticipación y no está garantizado: nunca lo prometas; di que el equipo lo revisa.",
    claves: ["inglés", "english", "bilingüe", "bilingual", "guía en inglés", "speak english", "idioma"],
  },
  {
    tema: "fotos",
    titulo: "Fotos y video",
    texto:
      "Las fotos y el video los toma el guía durante el recorrido, sin costo extra. " +
      "Nunca digas «fotógrafo profesional» ni prometas sesión, edición o un plazo de entrega. " +
      "ÚNICA EXCEPCIÓN, Huasteca Instagrameable: ese recorrido SÍ promete entrega, porque es lo que se cobra en él. " +
      "De 25 a 30 fotografías editadas, en una carpeta privada, dentro de 3 días. Las toma el guía con una cámara " +
      "Fujifilm X-T30 II: no va un fotógrafo aparte y no hay dron (en Las Pozas está prohibido, igual que el tripié). " +
      "Esa promesa es SOLO de Huasteca Instagrameable; en cualquier otro recorrido no se promete número ni plazo. " +
      "Si al cliente no le han llegado, avisa al equipo.",
    claves: ["fotos", "video", "fotógrafo", "dron", "fotografías", "photos", "pictures", "editadas", "icons", "instagrameable", "instagram", "reels", "contenido"],
  },
  {
    tema: "factura",
    titulo: "Factura",
    texto:
      "Si el cliente pide factura: «lo veo con administración y te confirmo». Avisa al equipo; no prometas que se puede ni en cuánto tiempo.",
    claves: ["factura", "facturar", "cfdi", "rfc", "constancia fiscal", "invoice"],
  },
  {
    tema: "mascotas",
    titulo: "Mascotas",
    texto:
      "En el Hotel Paraíso Encantado no se admiten mascotas. En los tours: lo confirma el equipo; no lo prometas.",
    claves: ["mascota", "perro", "gato", "pet", "dog"],
  },
];
