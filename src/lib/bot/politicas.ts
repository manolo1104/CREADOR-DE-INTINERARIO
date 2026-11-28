/**
 * Lo que el bot de WhatsApp de Tours tiene que saber y que NO vive en el
 * catálogo: cómo se paga, qué pasa si llueve, a quién se recoge y dónde,
 * hotel, extranjeros, recogidas especiales…
 *
 * De dónde sale: de 26 chats reales que terminaron en reserva (jul–sep 2026),
 * resumidos en hechos cortos, más las decisiones de Manolo del 29 sep al 6 oct
 * (anticipo 30 %, vigencia 24 h / 72 h / 7 días según la fecha del tour, check-in 3 pm / check-out 12 pm, rafting con
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
 * traslados de `TRASLADOS`.
 * Lo que NO está confirmado no se escribe: el recargo de la liga de pago, si el
 * RZR cruza ríos, una tabla de descuentos de grupo. Ahí el bot dice «te lo
 * confirmo» y avisa al equipo.
 *
 * Para agregar un tema: un objeto más con `tema` (corto, sin espacios),
 * `titulo`, `texto` (frases que el bot puede citar) y `claves` (palabras con
 * que el cliente lo pregunta, en español y en inglés). Después se regenera
 * `data.json` y se vuelve a desplegar el bot.
 */
import { TOURS_DB, partesRecogida, recogidaDeTour, cargoVallesDe, type Tour } from "@/lib/tours";
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

/**
 * Los únicos tours que el bot agenda para el MISMO día (Manolo, 17 nov 2026):
 * el RZR, la Travesía del Café y la Gruta de Xilo. Los demás, desde mañana.
 */
export const TOURS_MISMO_DIA = ["rzr-xilitla", "travesia-del-cafe", "gruta-de-xilo"] as const;
const NOMBRES_MISMO_DIA = TOURS_MISMO_DIA.map((s) => tour(s)?.nombreCorto ?? s);

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
  /** Pasamos por él a su hospedaje en Xilitla o en Ciudad Valles, sin costo extra. */
  ambas:       nombresDe((t) => recogidaDeTour(t).tipo === "hospedaje" && !ciudadUnica(t) && cargoVallesDe(t) === 0),
  /** En las dos, pero desde Valles cobra el traslado por reserva (la Ruta Surrealista, +$400). */
  conCargoValles: TOURS_DB.filter((t) => cargoVallesDe(t) > 0)
    .map((t) => `${t.nombreCorto} (desde Ciudad Valles, +$${cargoVallesDe(t).toLocaleString("es-MX")} por reserva, no por persona)`),
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
  ZONAS.conCargoValles.length ? `En Xilitla va incluido; desde Ciudad Valles cuesta más: ${listaY(ZONAS.conCargoValles)}.` : "",
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
      "Tour suelto: el resto se paga el primer día, antes de iniciar el tour (cuando llega el guía), en efectivo, por transferencia o con liga de pago. Se puede ir abonando antes de la fecha, pero se liquida completo antes de empezar: no se deja una parte para después del tour. " +
      "Paquete con hotel: el saldo se paga al hacer check-in en la recepción del hotel, en efectivo, con tarjeta o por transferencia. " +
      "Con tarjeta, el saldo se paga con una liga de pago (sin comisión) o en la recepción del hotel: el guía no lleva terminal. " +
      "No hay depósito en garantía ni cargos extra al llegar: el precio cotizado es el precio final.",
    claves: ["saldo", "resto", "restante", "liquidar", "pagar allá", "al llegar", "check-in", "efectivo", "guía cobra", "balance", "pay the rest"],
  },
  {
    tema: "metodos-de-pago",
    titulo: "Formas de pago",
    texto:
      "El anticipo se paga por transferencia a la CLABE, con depósito en efectivo en OXXO o con tarjeta con la liga de pago de su cotización, sin comisión. Las tres opciones van juntas en un solo mensaje. " +
      "Si viajan varias personas y cada una quiere pagar su parte, se manda una liga por persona. " +
      "Para TRANSFERIR se usa la CLABE interbancaria; el número de tarjeta es SOLO para depositar en OXXO. Si transfieren al número de la tarjeta, el banco responde «cuenta inexistente». " +
      "Concepto de la transferencia: el folio de la cotización (COT-…). " +
      "Al pagar, el cliente manda el comprobante (foto o PDF) a este mismo chat y el equipo lo valida. " +
      "Los datos bancarios salen de la herramienta de pago con el monto y el folio: nunca los escribas de memoria. " +
      "Pagar con la liga no lleva comisión: es el mismo monto. Meses sin intereses: lo confirma el equipo. " +
      "En OXXO el límite es de $5,000 por depósito: para montos mayores, transferencia o liga con tarjeta. " +
      "Se puede combinar (por ejemplo, anticipo por transferencia y el resto con tarjeta). " +
      "También se puede pagar en persona en nuestra oficina de Xilitla (colonia La Conchita, camino a Las Pozas), avisando más o menos a qué hora llegan; en Ciudad Valles no hay oficina.",
    claves: ["transferencia", "clabe", "oxxo", "depósito", "tarjeta", "cuenta", "datos bancarios", "concepto", "comprobante", "cuenta inexistente", "liga", "link de pago", "meses sin intereses", "msi", "spei", "oxxo límite", "5,000", "oficina", "en persona", "combinar", "card", "bank transfer"],
  },
  {
    tema: "extranjeros",
    titulo: "Clientes del extranjero",
    texto:
      "Contesta en el idioma del cliente y manda los links en su versión /en/ cuando escribe en inglés. " +
      "Con tarjeta extranjera se paga con la liga de pago de su cotización (Stripe, sin comisión). " +
      "La transferencia solo sirve si el cliente tiene cuenta en un banco mexicano. " +
      "No aceptamos Revolut ni transferencias internacionales (no hay datos SWIFT). " +
      "Los precios son en pesos mexicanos (MXN).",
    claves: ["extranjero", "foreign", "revolut", "swift", "wire", "international", "tarjeta extranjera", "dólares", "usd", "dollars", "english", "inglés"],
  },
  {
    tema: "vigencia",
    titulo: "Cuánto dura una cotización",
    texto:
      "La vigencia de una cotización depende de qué tan cerca está el tour: 24 horas si es en menos de 3 días, 72 horas si es en menos de 15 días y 7 días si es más lejos; nunca después del día antes del tour. Hasta la fecha que trae la propia cotización se respetan su precio y su lugar. " +
      "Si vence sin pago, se vuelve a cotizar con el precio y la disponibilidad de ese momento. " +
      "La fecha de vencimiento la da el sistema al crear la cotización: cítala tal cual, no la calcules.",
    claves: ["vigencia", "vence", "hasta cuándo", "cuánto dura la cotización", "respetan el precio", "expira", "valid", "expire"],
  },
  {
    tema: "para-manana",
    titulo: "Tours para mañana o para hoy",
    texto:
      "Para MAÑANA sí se cotiza, pero el anticipo tiene que quedar pagado antes de las 9:00 pm de hoy (Erick: el guía avisa la hora entre 8 y 9 pm), para organizar la logística de la mañana; el equipo confirma que haya salida armada para esa fecha y zona. " +
      `Para HOY (el mismo día) NO se agendan tours, salvo ${listaY(NOMBRES_MISMO_DIA)}. ` +
      `Si piden otro tour para hoy, dilo claro y ofrece mañana u otra fecha, o uno de esos ${NOMBRES_MISMO_DIA.length}. ` +
      "Si es uno de esos, se cotiza para hoy y el equipo confirma lugar y hora: avísale al equipo y nunca digas que ya quedó.",
    claves: ["mañana", "para mañana", "hoy", "para hoy", "mismo día", "última hora", "urgente", "ahorita", "tomorrow", "today", "tonight"],
  },
  {
    tema: "cancelacion",
    titulo: "Cancelación y cambios",
    texto:
      "Si cancela el cliente: con 48 horas o más de anticipación se devuelve el 100 %, incluido el anticipo; entre 48 y 24 horas antes se retiene el 50 %; con menos de 24 horas no hay reembolso, pero puede reagendar una vez sin costo. " +
      "Si cancelamos nosotros (tormenta eléctrica, alerta meteorológica, río no seguro o paraje cerrado): el cliente elige reembolso del 100 % o reagendar sin costo; ahí no aplica la regla de las 48 horas. " +
      // 19 nov 2026, Manolo: fuera la «garantía turquesa» («no hay garantía del color ya que no lo controlamos nosotros»).
      "El color del agua NO se garantiza: depende del río y del clima. Si el tour opera, no hay reagendar ni reembolso porque el agua no esté turquesa; si preguntan cómo está ese día, lo confirma el equipo. " +
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
      "Si preguntan por un pronóstico de lluvia: aunque marque lluvia, normalmente no afecta a los ríos de los parajes; lo que cierra un paraje es que el río crezca, y eso se confirma con operación antes del tour. No prometas clima ni color del agua: el clima de la Huasteca es un albur.",
    claves: ["lluvia", "llueve", "clima", "río", "crecido", "turquesa", "café", "temporada", "cerrado", "tormenta", "septiembre", "octubre", "rain", "weather", "river"],
  },
  {
    tema: "ninos-y-edades",
    titulo: "Niños y edades",
    texto:
      "En los tours que se cobran por persona: niños de 4 a 7 años pagan el 50 % del precio de adulto; de 3 años o menos van GRATIS (ocupan lugar en la camioneta, pero no cuentan para el mínimo de personas); de 8 años en adelante pagan como adulto. No aplica al RZR (se cobra por vehículo) ni a los tours que se cobran por grupo. " +
      "En las herramientas: los de 8 en adelante van en `adultos`, los de 4 a 7 en `ninosSmall` y los de 0 a 3 en `bebes`. " +
      "Cada tour tiene su edad mínima en su ficha (`edadMinima` y `edadNota`): rafting, rappel, Gruta de Xilo, Amanecer de Nubes y Olla de la Luz son desde 8 años, así que ahí no hay precio de niño. " +
      "En el RZR los niños van según el vehículo (cada unidad dice cuántos adultos y niños lleva). " +
      "Pregunta las edades junto con el número de personas, antes de proponer. " +
      "Una excepción a la edad mínima no la decides tú: la confirma el equipo.",
    claves: ["niños", "niño", "hijo", "hija", "edad", "años", "bebé", "bebe", "menor", "familia", "gratis", "descuento niños", "kids", "children", "child", "baby", "toddler", "infant"],
  },
  {
    tema: "minimos-y-viajero-solo",
    titulo: "Mínimos de personas y viajero solo",
    texto:
      `Cada tour tiene mínimo y máximo de personas (\`groupMin\` y \`groupMax\` de su ficha). ` +
      // 🔴 17 nov 2026, Manolo: por WhatsApp el mínimo SÍ es mínimo. Desde el
      // 8 oct se vendía bajo el mínimo (tarifa normal, salida compartida y
      // reembolso si no se juntaba); el bot le aceptó 3 al rafting, que pide 5.
      "Por WhatsApp el mínimo SÍ es mínimo: con menos personas NO se cotiza ni se reserva. " +
      (MINIMOS_ALTOS.length ? `Dilo al vender, sobre todo en los de mínimo alto: ${listaY(MINIMOS_ALTOS)}. ` : "") +
      "Si no les alcanza, ofrece una alternativa: otro tour cuyo mínimo sí cumplan, que completen el grupo, o el tour privado si su ficha lo permite (lo cotiza el equipo). " +
      "Viajero solo (como lo hace Erick): puede sumarse a un grupo que ya esté armado para esa fecha —eso lo revisa el equipo en el calendario— o ir privado con costo adicional. No le cotices tú a una persona bajo el mínimo: avisa al equipo. " +
      "Nunca llevamos grupos de más de 12 por salida. " +
      "Una excepción al mínimo no la decides tú: la decide el equipo.",
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
      "La hora exacta de recogida se la manda el guía al cliente la noche anterior, entre 8 y 9 pm (casi siempre la recogida es entre 8 y 9 am). " +
      "También recogemos en la central de autobuses de Ciudad Valles. En Aquismón se puede, pero el equipo confirma si tiene costo extra. Si llegan en su carro, lo dejan en el estacionamiento de nuestra base en Xilitla.",
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
      "No se cruzan ríos (por conservación) y se va a 40–45 km/h: son rutas para ver el paisaje, por terracería y asfalto, no difíciles. En la ruta Nacimiento se nada en un río cristalino y se hace kayak. " +
      "Es totalmente automático; pueden manejar ellos o el guía, cuesta lo mismo (cuando manejan ellos, el guía va adelante en moto).",
    claves: ["rzr", "razer", "cuatrimoto", "todoterreno", "off-road", "can-am", "polaris", "defender", "maverick", "licencia", "manejar", "cruza ríos", "hora rzr", "atv", "utv", "driver license"],
  },
  {
    tema: "rafting",
    titulo: "Rafting en el Río Tampaón",
    texto:
      "Incluye una comida, que el cliente elige tomar antes o después del descenso (no lleva el desayuno buffet de los otros tours). " +
      `Se firma una responsiva. Sale con mínimo de ${minimo("rafting-rio-tampaon")} personas: dilo al vender; con menos NO se cotiza (ofrece otra actividad o que completen el grupo). ` +
      "Depende del nivel del río: en lluvias la salida se confirma según el río ese día; si no es seguro, se reprograma o se propone una alternativa. " +
      "No hace falta saber nadar: se va con chaleco y casco, y el guía va dentro de la balsa. La edad mínima está en su ficha.",
    claves: ["rafting", "balsa", "rápidos", "tampaón", "descenso en río", "comida rafting", "whitewater"],
  },
  {
    tema: "rappel",
    titulo: "Rappel en la Cascada de Tamul",
    texto:
      "Incluye el traslado desde Ciudad Valles: pasamos por el cliente a su hospedaje en Ciudad Valles y vamos al embarcadero del Río Tampaón. Si se hospeda en otra zona, el punto de encuentro lo confirma el equipo. " +
      `Sale con mínimo de ${minimo("rappel-tamul")} personas. No incluye alimentos. Las fotos y el video los toma el guía (ya NO lleva dron ni fotógrafo aparte). No se necesita experiencia previa. ` +
      "Desde el 27 nov 2026 también hay RAPPEL EN SÓTANOS, cada uno es un recorrido propio: `rappel-sotano-del-cepillo`, `rappel-sotano-de-las-huahuas` y `rappel-sotano-de-las-golondrinas` (usa obtener_tour para precio e incluye; no escribas cifras de memoria). Salen desde 2 personas, mayores de 8 años y hasta 100 kg; incluyen traslado desde Xilitla o Ciudad Valles, desayuno, equipo y briefing; el instructor tiene la constancia DC-3 (NOM-009-STPS-2011). El de Golondrinas NO es la visita para ver las aves (`tour-sotano-de-las-golondrinas`). " +
      "El rappel en otros lugares (por ejemplo la Cascada de los Comales) no está en el catálogo.",
    claves: ["rappel", "descenso", "cuerda", "comales", "rapel", "rappelling", "cepillo", "sótano", "huahuas", "golondrinas rappel"],
  },
  {
    tema: "tamul",
    titulo: "Expedición Tamul: esfuerzo y detalles",
    texto:
      "Antes de subir a la canoa se firma una responsiva. Se va en canoa hasta la cascada: cerca de una hora remando (remar es opcional). " +
      "Si el río lo permite, después de la cascada se bajan de la canoa y flotan unos 20 minutos, con chaleco, hasta la Cueva del Agua. " +
      "A la Cueva del Agua se suben unos 35 escalones. Lo más pesado es el Sótano de las Huahuas: unos 600 escalones de bajada y de subida. Si alguien tiene problemas de rodillas o de movilidad, que lo diga antes. " +
      "Si cierran Tamul por el río, se suspende TODO el tour (Tamul, Cueva del Agua y sótano) y se ofrece Cascadas del Meco u otra alternativa del mismo nivel al mismo precio, o reagendar sin costo o el reembolso del 100 %.",
    claves: ["tamul", "canoa", "escalones", "cueva del agua", "huahuas", "flotar", "nadar", "rodilla", "esfuerzo", "cascada cerrada", "canoe", "stairs"],
  },
  {
    tema: "meco",
    titulo: "Cascadas del Meco",
    texto:
      "Es de las mejores cascadas y un recorrido tranquilo; para adultos mayores Erick recomienda la Ruta Surrealista (a paso cómodo y sin prisas). " +
      "Incluye el paseo en canoa hasta el pie de la cascada (para verla bien hay que ir en lancha). Kayak, paddle board o tubing son opcionales y tienen costo aparte (lo confirma el equipo). Fue la alternativa cuando otros parajes cerraron por lluvia.",
    claves: ["meco", "el salto", "adulto mayor", "abuelo", "abuela", "tercera edad", "tranquilo", "poco esfuerzo", "tubing", "kayak", "paddle", "elderly"],
  },
  {
    tema: "golondrinas",
    titulo: "Sótano de las Golondrinas",
    texto:
      // 19 nov 2026 (Manolo): entra al catálogo con recorrido propio.
      "YA está en el catálogo: recorrido `tour-sotano-de-las-golondrinas` (usa obtener_tour para el precio, el privado, los horarios y lo que incluye; no escribas cifras de memoria). Mínimo 2 personas; en privado tiene tarifa propia (precio para 1 persona + un monto por cada persona adicional, en obtener_tour). Precio y horas son SALIENDO DE XILITLA: incluye traslado redondo desde el hospedaje en Xilitla, taquillas y guía; no incluye alimentos. Desde Ciudad Valles se suma el traslado y cambian las horas de salida: eso lo cotiza el equipo por WhatsApp (traslado_sin_tarifa, avisar). " +
      "Dos horarios que elige el cliente: al amanecer (recogida 4:00 am, las aves salen hacia las 5:45 am, regreso 11 am–12 pm) o al atardecer (recogida 3–4 pm, para verlas entrar: más de mil cotorritos y vencejos girando hacia el sótano; regreso 8:30–9 pm). Las horas se mueven según a qué hora salgan las aves: lo confirma el equipo con la gente de allá. " +
      "NO sale si está nublado, hace mucho frío o llueve, porque las aves no salen: ahí aplica «si cancelamos nosotros» (reembolso completo o reagendar sin costo). " +
      "Son 568 escalones de bajada y la subida es pesada. Para asomarse al borde amarrado con cuerda, peso máximo 90 kg (puede variar: lo maneja la comunidad). Desde 3 años. Sin mascotas de ningún tipo ni cámaras con flash. Está en Aquismón, por carretera de mucha subida y curvas. " +
      "Si al cliente le da igual cuál sótano, Erick opina que el de las Huahuas (dentro de la Expedición Tamul) es más chico pero el espectáculo se aprecia mejor.",
    claves: ["golondrinas", "sótano de las golondrinas", "vencejos", "aves", "cotorros", "swallows", "cave of swallows"],
  },
  {
    tema: "guia-en-ingles",
    titulo: "Guía en inglés",
    texto:
      "Sí hay guías bilingües, pero se piden con anticipación y el equipo confirma según la fecha: no lo des por hecho; avisa al equipo. En una salida compartida el guía puede hablar inglés básico: pregúntale al cliente si está bien así. " +
      "En el Jardín de Edward James el guía en inglés cuesta $500 extra (es regla del Jardín).",
    claves: ["inglés", "english", "bilingüe", "bilingual", "guía en inglés", "speak english", "idioma"],
  },
  {
    tema: "fotos",
    titulo: "Fotos y video",
    texto:
      "Las fotos y el video los toma el guía durante el recorrido, sin costo extra. " +
      "Nunca digas «fotógrafo profesional» ni prometas sesión, edición, número de fotos o un plazo de entrega. " +
      "Si después del tour piden sus fotos o no les han llegado: «le pido a tu guía que te las haga llegar» y avisa al equipo.",
    claves: ["fotos", "video", "fotógrafo", "dron", "fotografías", "photos", "pictures", "editadas", "reels", "contenido"],
  },
  {
    tema: "factura",
    titulo: "Factura",
    texto:
      "Sí se factura: se factura a otra cuenta, se paga el total de las actividades por adelantado y se suma el IVA del 16 % (los precios no incluyen IVA). Lo coordina administración: avisa al equipo (factura) y no mandes los datos de pago normales hasta que el equipo responda.",
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
