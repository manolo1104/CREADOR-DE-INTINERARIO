/**
 * Lo que contesta el equipo (Erick) en WhatsApp. **La guía de lo que sabe el bot.**
 *
 * Sale del documento «Base de conocimiento del bot — preguntas y respuestas de
 * Erick en WhatsApp» (Manolo, 17 nov 2026): 1,280 pares de pregunta y respuesta
 * de 232 conversaciones reales (18 sep–16 nov 2026), ya con las decisiones de
 * Manolo encima:
 * - Los PRECIOS de los tours salen SIEMPRE de la lista del sitio (catálogo,
 *   `calcular_precio`, la cotización). Aquí no va ningún precio de tour: solo
 *   cifras fijas confirmadas (tope de OXXO, seguro opcional, la regla del Jardín
 *   para el guía en inglés, la entrada a la Aldea, el taxi).
 * - Lo que NO está en el catálogo (kayak, desayuno huasteco, solo
 *   guía, Tamul sin sótano, tubing, privado para una persona, traslados de ida):
 *   el bot lo explica con lo que contó Erick y el equipo cotiza (`alEquipo`).
 * - Una sola marca (Huasteca Potosina Tours), sin descuentos de cierre, mismo
 *   día solo RZR/Café/Gruta, mínimo estricto por WhatsApp, niños con la regla de
 *   `ninos.ts`, seguro solo en aventura.
 *
 * 🔴 El repo es PÚBLICO: nada de datos de clientes (nombres, teléfonos,
 * anécdotas) ni números de cuenta. Lo prueba `__tests__/respuestasEquipo.test.ts`.
 *
 * Cómo crece: cada pregunta que el bot no supo queda en la bitácora del panel
 * («escaló · pregunta sin respuesta»); la respuesta del equipo se agrega aquí y
 * se regenera `whatsapp-bot/data.json` (`src/scripts/export-bot-data.ts`).
 */

/** Los motivos de `escalar_a_humano` que usa esta base (ver whatsapp-bot/agent.js). */
export type MotivoEquipo =
  | "cambio_post_pago" | "cancelacion" | "descuento" | "fuera_catalogo" | "traslado_sin_tarifa"
  | "hotel" | "salud" | "pregunta_sin_respuesta" | "factura" | "recogida" | "clima" | "grupo" | "otro";

export type TemaRespuesta =
  | "tours" | "pagos" | "recogida" | "hospedaje" | "comida" | "ninos" | "seguridad"
  | "clima" | "que-llevar" | "cancelacion" | "grupos" | "confianza" | "dia-del-tour";

export interface RespuestaEquipo {
  id: string;
  tema: TemaRespuesta;
  /** Como lo preguntan los clientes (también sirven de palabras clave para buscar). */
  preguntas: string[];
  /** Lo que se le contesta al cliente. */
  respuesta: string;
  /** Los tours a los que aplica (slugs del catálogo): `obtener_tour` la trae con la ficha. */
  tours?: string[];
  /** Erick lo consultaba con operación: el bot dice esto y avisa al equipo. */
  alEquipo?: { motivo: MotivoEquipo; modo: "avisar" | "pasar" };
  /** Indicación para el bot (no se le dice al cliente). */
  nota?: string;
}

export const TEMAS_RESPUESTA: Record<TemaRespuesta, string> = {
  tours: "Tours",
  pagos: "Reservas y pagos",
  recogida: "Recogida, transporte y cómo llegar",
  hospedaje: "Hospedaje y ocasiones especiales",
  comida: "Comida",
  ninos: "Niños y adultos mayores",
  seguridad: "Seguridad",
  clima: "Clima, temporada y cierres",
  "que-llevar": "Qué llevar",
  cancelacion: "Cancelaciones y cambios",
  grupos: "Grupos, privados y empresas",
  confianza: "Confianza y la empresa",
  "dia-del-tour": "El día del tour",
};

const fuera: RespuestaEquipo["alEquipo"] = { motivo: "fuera_catalogo", modo: "avisar" };
const descuento: RespuestaEquipo["alEquipo"] = { motivo: "descuento", modo: "avisar" };

export const RESPUESTAS_EQUIPO: RespuestaEquipo[] = [
  // ── Tours ──────────────────────────────────────────────────────────────────
  {
    id: "tour-mas-recomendado", tema: "tours",
    preguntas: ["¿Cuál es el tour que más recomiendas?", "¿Cuál es el más famoso?", "¿Qué tour me recomiendas?"],
    respuesta: "El más famoso y el más pedido es la Expedición Tamul: canoa por el río Tampaón hasta la Cascada de Tamul, el cenote de la Cueva del Agua y el Sótano de las Huahuas al atardecer. Si lo suyo son las cascadas, Cascadas del Meco y El Salto también es de las mejores.",
    tours: ["expedicion-tamul", "cascadas-del-meco"],
  },
  {
    id: "tour-mas-extremo", tema: "tours",
    preguntas: ["¿Cuál es su tour más extremo?", "Algo de aventura", "¿Qué tienen de adrenalina?"],
    respuesta: "Dos: el RZR por Xilitla (manejas tú el todoterreno) y el Rafting en el río Tampaón (14 km de rápidos clase III en agua turquesa). También está el Rappel en la Cascada de Tamul.",
    tours: ["rzr-xilitla", "rafting-rio-tampaon", "rappel-tamul"],
  },
  {
    id: "combinaciones-por-dia", tema: "tours",
    preguntas: ["¿Qué combinaciones hacen por día?", "¿Qué se visita en un día?", "¿Cuántos lugares por día?"],
    respuesta: "Se conoce un lugar fuerte por día, combinado con otros cercanos: Puente de Dios con Hacienda Gómez (Ruta Acuática); Tamul con la Cueva del Agua y el Sótano de las Huahuas; Micos con Minas Viejas (Paraíso Escalonado); y el Jardín Surrealista con el Castillo de la Salud, los manantiales y las cuevas (Ruta Surrealista).",
  },
  {
    id: "poco-tiempo", tema: "tours",
    preguntas: ["Tengo poco tiempo, ¿qué tour puedo hacer?", "Llegamos tarde, ¿qué alcanzamos?", "Solo tenemos medio día"],
    respuesta: "Los tours de cascadas son de día completo: salen entre 8 y 9 am y regresan entre 7 y 9 pm. Si llegan tarde o traen poco tiempo, lo que mejor encaja es un RZR de 2 horas o la Gruta de Xilo por la noche.",
    tours: ["rzr-xilitla", "gruta-de-xilo"],
  },
  {
    id: "adulto-mayor", tema: "ninos",
    preguntas: ["¿Qué tour hay para un adulto mayor?", "Somos de la tercera edad, ¿qué recomiendas?", "Mi mamá tiene 69 años, camina bien, ¿aguanta?", "Quizá alguien tenga que dejar el recorrido por salud"],
    respuesta: "La Ruta Surrealista: muy amena, a paso cómodo y sin prisas. El Jardín de Edward James se recorre en 1 h 30 con paradas cada pocos minutos y el Castillo en 1 h, también con paradas. Vamos a buen ritmo cuidando que todos vayan a gusto, y si alguien necesita dejar el recorrido, no hay problema.",
    tours: ["ruta-surrealista-edward-james"],
    nota: "Si hay una condición médica concreta, da los hechos (escalones, esfuerzo) y avisa al equipo (salud, avisar).",
  },
  {
    id: "cansados-ligero", tema: "tours",
    preguntas: ["Venimos cansados, ¿qué tour es ligero?", "Algo tranquilo, que no se camine mucho"],
    respuesta: "El RZR: es tranquilo y casi no se camina. La Ruta Surrealista también es a paso cómodo.",
    tours: ["rzr-xilitla", "ruta-surrealista-edward-james"],
  },
  {
    id: "tubing", tema: "tours",
    preguntas: ["¿Tienen tubing?", "¿Se puede hacer tubing?"],
    respuesta: "Sí, el tubing se puede agregar en Cascadas del Meco o en Minas Viejas y Micos. El precio te lo confirma el equipo.",
    tours: ["cascadas-del-meco", "paraiso-escalonado-minas-micos"], alEquipo: fuera,
  },
  {
    id: "escalada", tema: "tours",
    preguntas: ["¿Tienen escalada?", "¿Hay tours de escalada en roca?"],
    respuesta: "Por el momento no tenemos tours de escalada. Rappel sí: en la Cascada de Tamul y en los sótanos del Cepillo, las Huahuas y las Golondrinas.",
    tours: ["rappel-tamul", "rappel-sotano-del-cepillo", "rappel-sotano-de-las-huahuas", "rappel-sotano-de-las-golondrinas"],
  },
  {
    id: "cuatrimotos", tema: "tours",
    preguntas: ["¿Tienen cuatrimotos?", "¿Rentan cuatris o ATV?"],
    respuesta: "Ya no tenemos cuatrimotos; solo vehículos RZR (todoterreno).",
    tours: ["rzr-xilitla"],
  },
  {
    id: "tirolesa", tema: "tours",
    preguntas: ["¿Hay tirolesas?", "¿Tienen tirolesa o sky bike?"],
    respuesta: "Sí hay tirolesas en Xilitla y en Micos (en Micos también sky bike), con costo aparte.",
    tours: ["paraiso-escalonado-minas-micos"],
    nota: "Si preguntan cuánto cuesta, no lo sabes: pregunta_sin_respuesta.",
  },
  {
    id: "somos-el-lugar", tema: "confianza",
    preguntas: ["¿Ustedes son el lugar o dan el tour?", "¿Son los dueños de la cascada?"],
    respuesta: "Nosotros damos el tour: pasamos por ustedes, entramos con ustedes a cada lugar y los guiamos todo el día.",
  },
  {
    id: "huahuas-vs-golondrinas", tema: "tours",
    preguntas: ["¿Cuál es la diferencia entre Huahuas y Golondrinas?", "¿Qué sótano es mejor?"],
    respuesta: "El Sótano de las Huahuas es más chico, pero el espectáculo de las aves entrando se aprecia mejor; la Expedición Tamul termina ahí al atardecer. El de las Golondrinas tiene su propio recorrido: se ve de madrugada (salen las aves) o por la tarde (entran).",
    tours: ["expedicion-tamul", "tour-sotano-de-las-golondrinas"],
  },
  {
    id: "golondrinas", tema: "tours",
    preguntas: ["¿Van al Sótano de las Golondrinas?", "Quiero ver las golondrinas", "¿Tamul con Golondrinas en vez de Huahuas?"],
    // 19 nov 2026: ya es recorrido del catálogo; antes lo cotizaba el equipo.
    respuesta: "Sí, tenemos recorrido al Sótano de las Golondrinas (mínimo 2 personas), con traslado desde tu hospedaje en Xilitla, entrada y guía (el precio es saliendo de Xilitla; desde Ciudad Valles se suma el traslado, cambian las horas y te lo cotizamos). Eliges horario: de madrugada (pasamos a las 4 am) para ver salir a las aves, o al atardecer (pasamos entre 3 y 4 pm) para verlas entrar. Si está nublado, hace mucho frío o llueve no sale, porque las aves no salen; las horas se ajustan a la salida de las aves y te las confirmamos. También se puede en privado. Ojo: la carretera tiene mucha subida y curvas, y son 568 escalones de bajada.",
    tours: ["tour-sotano-de-las-golondrinas"],
  },
  {
    id: "kayak", tema: "tours",
    preguntas: ["¿Tienen kayak?", "¿Hay tour en kayak?", "Algo más tranquilo que el rafting"],
    respuesta: "Sí hay aventura en kayak por los ríos cristalinos de Xilitla: unas 5 horas, más tranquila que el rafting; incluye transporte desde Xilitla, desayuno buffet, taquillas, equipo y un kayak por persona. El precio te lo confirma el equipo. En el RZR, la ruta Nacimiento también lleva kayak.",
    tours: ["rzr-xilitla"], alEquipo: fuera,
  },
  {
    id: "desayuno-huasteco", tema: "comida",
    preguntas: ["¿Tienen desayuno huasteco?", "¿Venden bandeja huasteca?"],
    respuesta: "Sí, una bandeja huasteca a las 8:00 am: 3 enchiladas (morita, huastecas y verdes), bocoles, cecina huasteca, café y agua. El precio te lo confirma el equipo.",
    alEquipo: fuera,
  },
  {
    id: "tamul-sin-sotano", tema: "tours",
    preguntas: ["¿Puedo hacer Tamul sin el sótano?", "Solo la cascada de Tamul"],
    respuesta: "Se puede hacer sin el sótano; ese precio te lo confirma el equipo.",
    tours: ["expedicion-tamul"], alEquipo: fuera,
  },
  {
    id: "solo-una-parte", tema: "tours",
    preguntas: ["¿Puedo hacer solo una parte del tour?", "Solo queremos Minas Viejas", "¿Me cobras menos si no entro a todo?"],
    respuesta: "Es decisión de ustedes qué hacer ese día, pero se cubre el costo acordado del tour completo.",
  },
  {
    id: "rappel-y-tamul", tema: "tours",
    preguntas: ["¿Se puede hacer rappel el mismo día de Tamul?", "¿Rappel y Expedición Tamul juntos?"],
    respuesta: "No: el rappel es un tour de día completo y no se combina con la Expedición Tamul el mismo día.",
    tours: ["rappel-tamul", "expedicion-tamul"],
  },
  {
    id: "rafting-donde", tema: "tours",
    preguntas: ["¿En Tamasopo hay rafting?", "¿El rafting pasa por Tamul?", "¿Dónde es el rafting?"],
    respuesta: "El rafting es en el río Tampaón, dentro de un cañón de agua turquesa: no se hace en Tamasopo ni pasa por la Cascada de Tamul.",
    tours: ["rafting-rio-tampaon"],
  },
  {
    id: "rafting-duracion", tema: "tours",
    preguntas: ["¿Cuánto dura el rafting dentro del río?", "¿Es seguro el rafting?"],
    respuesta: "De 2 a 3 horas en el río. El guía certificado va dentro de la balsa, antes hay práctica en agua tranquila y alrededor van kayakistas profesionales con cuerdas de seguridad; todos llevan casco y chaleco de alta flotabilidad.",
    tours: ["rafting-rio-tampaon"],
  },
  {
    id: "rafting-por-su-cuenta", tema: "tours",
    preguntas: ["¿Puedo llegar al embarcadero del rafting por mi cuenta?", "Llevamos nuestro carro al rafting"],
    respuesta: "No: se necesita el vehículo de la empresa, porque lleva el equipo y la actividad no termina donde empieza.",
    tours: ["rafting-rio-tampaon"],
  },
  {
    id: "rafting-nadar", tema: "seguridad",
    preguntas: ["¿Necesito saber nadar para el rafting?", "Nunca he hecho rafting"],
    respuesta: "No hace falta saber nadar ni tener experiencia: van con casco y chaleco y el guía va dentro de la balsa.",
    tours: ["rafting-rio-tampaon"],
  },
  {
    id: "rafting-temporada", tema: "clima",
    preguntas: ["¿Hay rafting en esta temporada?", "¿Sale el rafting en noviembre?"],
    respuesta: "Sí sale, pero necesita mínimo 5 personas por la capacidad de la balsa.",
    tours: ["rafting-rio-tampaon"],
  },
  {
    id: "rzr-rios-velocidad", tema: "tours",
    preguntas: ["¿En RZR se cruzan ríos?", "¿Hay límite de velocidad en el RZR?", "¿Es pesado el camino del RZR?"],
    respuesta: "No se cruzan ríos, por conservación. Se va a unos 40–45 km/h porque son rutas para disfrutar el paisaje, por caminos de terracería y asfalto que no son difíciles. En la ruta Nacimiento sí se nada en un río cristalino y se hace kayak.",
    tours: ["rzr-xilitla"],
  },
  {
    id: "rzr-quien-maneja", tema: "tours",
    preguntas: ["Si el guía maneja el RZR, ¿cuesta más?", "No quiero manejar el RZR", "¿El RZR es difícil de manejar?"],
    respuesta: "Pueden manejar ustedes o el guía, cuesta lo mismo. Es totalmente automático y antes hay una explicación de manejo; cuando manejan ustedes, el guía va adelante en moto abriendo la ruta.",
    tours: ["rzr-xilitla"],
  },
  {
    id: "rzr-por-vehiculo", tema: "tours",
    preguntas: ["¿El precio del RZR es por persona?", "¿Por qué un RZR cuesta más que otro?"],
    respuesta: "El RZR se cobra por vehículo, no por persona: depende de la ruta y de la unidad. La diferencia de precio es el vehículo (por ejemplo, el Polaris Pro S es la unidad más reciente). El Can-Am 800 es solo para 2 y el Maverick X3 no viene en versión de 2 plazas.",
    tours: ["rzr-xilitla"],
    nota: "El precio exacto sale de cotizar_rzr.",
  },
  {
    id: "rzr-descuento-dos", tema: "pagos",
    preguntas: ["Si rento dos RZR, ¿hay descuento?", "¿Descuento por varias unidades?"],
    respuesta: "Déjame consultarlo con el equipo antes de prometerte algo.",
    tours: ["rzr-xilitla"], alEquipo: descuento,
  },
  {
    id: "rzr-ninos", tema: "ninos",
    preguntas: ["¿Pueden subir niños de 2 y 3 años al RZR?", "Somos 2 adultos y un niño, ¿cabemos en el RZR?"],
    respuesta: "Sí: las rutas no son de riesgo, son para disfrutar el paisaje. Cada unidad dice cuántos adultos y niños lleva, y hay una para 6 adultos y 2 niños.",
    tours: ["rzr-xilitla"],
  },
  {
    id: "rzr-aldea-nanacatli", tema: "tours",
    preguntas: ["¿La Aldea Nanacatli tiene costo?", "¿Qué se ve en la ruta Nanacatli?"],
    respuesta: "La ruta Nanacatli pasa por la aldea (temática de hongos gigantes), un túnel de piedra, un mirador y el centro de Xilitla. La entrada a la aldea es de $50 por persona, aparte. En el punto de salida venden buff, lentes y jersey.",
    tours: ["rzr-xilitla"],
  },
  {
    id: "surrealista-y-rzr", tema: "tours",
    preguntas: ["¿Puedo hacer la Ruta Surrealista y RZR el mismo día?", "¿Dos actividades en un día?"],
    respuesta: "Sí: la Ruta Surrealista termina entre 4:30 y 5:00 pm (saliendo de Xilitla) y después se puede hacer una ruta de RZR de 2 o 3 horas. Se puede contratar más de una actividad.",
    tours: ["ruta-surrealista-edward-james", "rzr-xilitla"],
  },
  {
    id: "minas-viejas-caminar", tema: "tours",
    preguntas: ["¿Se camina mucho en Minas Viejas?", "¿Es pesado el Paraíso Escalonado?"],
    respuesta: "Solo una caminata leve entre escalones; no requiere mucho esfuerzo.",
    tours: ["paraiso-escalonado-minas-micos"],
  },
  {
    id: "salto-micos", tema: "seguridad",
    preguntas: ["¿Qué tan alto es el salto en Micos?", "¿Es obligatorio saltar?"],
    respuesta: "El más alto es de 8 a 9 metros. Los saltos son opcionales y dependen del nivel del río.",
    tours: ["paraiso-escalonado-minas-micos"],
  },
  {
    id: "olla-vs-amanecer", tema: "tours",
    preguntas: ["¿Cuál cuesta menos esfuerzo, Olla de la Luz o Amanecer de Nubes?", "¿Cuánto se camina en el Amanecer?"],
    respuesta: "El Amanecer de Nubes: la caminata es de 40 minutos a 1 hora (4–5 km). La Olla de la Luz es más larga: 2 h 30 a 3 h, unos 9–10 km por el bosque de La Trinidad.",
    tours: ["amanecer-de-nubes", "olla-de-la-luz"],
  },
  {
    id: "amanecer-horario", tema: "dia-del-tour",
    preguntas: ["¿A qué hora pasan para el Amanecer de Nubes?", "¿A qué hora regresamos del Amanecer?", "Una persona no va a subir al Amanecer"],
    respuesta: "Recogida entre 4:00 y 4:30 am y regreso entre 12:00 y 1:00 pm. Quien no quiera subir puede esperar en la comunidad de La Trinidad; ese precio te lo confirma el equipo.",
    tours: ["amanecer-de-nubes"],
    nota: "Si alguien no sube, el precio especial lo cotiza el equipo (fuera_catalogo, avisar).",
  },
  {
    id: "gruta-xilo-horario", tema: "dia-del-tour",
    preguntas: ["¿A qué hora es la Gruta de Xilo?", "¿Cuánto dura la Gruta de Xilo?", "¿Se entra a la cueva?"],
    respuesta: "Es de noche: el guía pasa por ustedes como a las 7:40 pm para la salida de las 8:00 (también hay a las 9:00). Dura unas 3 horas: traslado en RZR, una caminata de 15–20 minutos por la selva y unos 900 m dentro de la cueva. Se regresa entre 10:30 y 11:00 pm.",
    tours: ["gruta-de-xilo"],
  },
  {
    id: "jardin-cuando-ir", tema: "tours",
    preguntas: ["¿Cuándo es mejor ir al Jardín Surrealista?", "¿El Jardín abre los martes?"],
    respuesta: "Entre semana hay menos gente. El Jardín cierra los martes por mantenimiento; en temporada alta a veces abre, y eso se confirma con el Jardín.",
    tours: ["ruta-surrealista-edward-james", "eden-en-el-jardin"],
  },
  {
    id: "jardin-nocturno", tema: "tours",
    preguntas: ["¿Hay recorrido nocturno en el Jardín?", "Experiencia de luces en Las Pozas"],
    respuesta: "Hay una experiencia nocturna de luces con cupo muy limitado; déjame consultarlo con el equipo.",
    tours: ["ruta-surrealista-edward-james", "eden-en-el-jardin"], alEquipo: fuera,
  },
  {
    id: "mirador-cristal", tema: "tours",
    preguntas: ["¿El tour pasa por el Mirador de Cristal?"],
    respuesta: "No: el Mirador de Cristal es un restaurante-cafetería sobre la carretera rumbo a Xilitla. Los miradores del tour están en la sierra de Xilitla.",
  },
  {
    id: "xantolo-huehues", tema: "tours",
    preguntas: ["¿Tienen tour de Xantolo o de Huehues?", "¿Qué fecha de noviembre recomiendas?"],
    respuesta: "Esas demostraciones culturales son gratuitas, así que no hay tour solo para eso. Los primeros días de noviembre (1, 2 y 3) son Xantolo, la fiesta más grande de la Huasteca: en esas fechas la Ruta Surrealista visita el Castillo de la Salud adornado con flores, catrinas y altares.",
    tours: ["ruta-surrealista-edward-james"],
  },
  {
    id: "puente-de-dios-tamasopo", tema: "tours",
    preguntas: ["¿Van a las cascadas de Tamasopo?", "Si cierra Puente de Dios, ¿cierra también Tamasopo?"],
    respuesta: "La Ruta Acuática va a Puente de Dios (poza turquesa donde se nada por una caverna) y a las cascadas de Hacienda Gómez. Si cierra un paraje no necesariamente cierra el otro: son ríos y zonas distintas, y si avisan de un cierre te informamos enseguida.",
    tours: ["ruta-acuatica-puente-de-dios"],
    nota: "Si piden Tamasopo, la ficha del tour dice si esa opción está disponible y su precio; no la prometas de memoria.",
  },

  // ── Reservas y pagos ───────────────────────────────────────────────────────
  {
    id: "como-reservar", tema: "pagos",
    preguntas: ["¿Qué se necesita para reservar?", "¿Con cuánto se separa?", "¿Se reserva en la página o contigo?"],
    respuesta: "Se aparta con el 30 % del total. Primero te mando la cotización (para eso necesito nombre, correo, fechas y tours) y después los pasos para reservar, aquí mismo por WhatsApp.",
  },
  {
    id: "tarjeta-msi", tema: "pagos",
    preguntas: ["¿Se puede pagar con tarjeta de crédito?", "¿Aceptan meses sin intereses?", "¿Hay diferencia si pago con la liga?"],
    respuesta: "Sí, con tarjeta de débito o crédito por la liga de pago, sin comisión: es el mismo monto. Meses sin intereses: déjame confirmarlo con el equipo.",
    alEquipo: { motivo: "pregunta_sin_respuesta", modo: "avisar" },
    nota: "Avisa al equipo SOLO si el cliente quiere pagar a meses.",
  },
  {
    id: "combinar-metodos", tema: "pagos",
    preguntas: ["¿Puedo pagar el anticipo por transferencia y el resto con tarjeta?", "¿Puedo dividir el pago de la liga en dos?"],
    respuesta: "Sí, se puede combinar. Si son dos personas pagando, se manda una liga por persona con la parte de cada quien (te pido los nombres de ambos).",
    nota: "Para montos distintos a partes iguales, avisa al equipo (otro, avisar).",
  },
  {
    id: "oxxo-tope", tema: "pagos",
    preguntas: ["¿En OXXO puedo pagar todo?", "¿Cuánto se puede depositar en OXXO?"],
    respuesta: "En OXXO el límite es de $5,000 por depósito. Para montos mayores, transferencia o la liga con tarjeta.",
  },
  {
    id: "pago-desde-extranjero", tema: "pagos",
    preguntas: ["Estoy en Estados Unidos, ¿cómo transfiero?", "Estoy en Brasil, ¿cómo pago?"],
    respuesta: "La transferencia es solo desde cuentas mexicanas; desde fuera, con la liga de pago con tarjeta.",
  },
  {
    id: "concepto-transferencia", tema: "pagos",
    preguntas: ["¿Qué pongo en el concepto?", "¿Qué referencia pongo?"],
    respuesta: "El folio de tu cotización (por ejemplo, COT-1234).",
  },
  {
    id: "cuando-resto", tema: "pagos",
    preguntas: ["¿Cuándo pago el resto?", "¿Puedo pagar el resto en partes?", "¿Tienen facilidades de pago?"],
    respuesta: "Con el 30 % se aparta, y el resto lo puedes ir abonando antes de la fecha si te acomoda. Lo que quede se liquida completo el primer día, antes de iniciar el tour, cuando llega el guía: en efectivo, transferencia o liga con tarjeta. No se puede dejar una parte para después del tour.",
  },
  {
    id: "terminal", tema: "pagos",
    preguntas: ["¿Traen terminal?", "¿El guía cobra con tarjeta?"],
    respuesta: "No llevamos terminal: efectivo, transferencia o la liga de pago con tarjeta.",
  },
  {
    id: "pagar-todo-dia-tour", tema: "pagos",
    preguntas: ["¿Puedo pagar todo el día del tour?", "¿Tengo que dar anticipo?"],
    respuesta: "Para agendar se necesita el anticipo del 30 %: con eso se preparan vehículo, equipo y guía, y sin anticipo no se aparta el lugar. El resto sí se paga el día del tour, antes de empezar.",
  },
  {
    id: "con-cuanta-anticipacion", tema: "pagos",
    preguntas: ["¿Con cuánto tiempo de anticipación reservo?"],
    respuesta: "Desde ahora. En temporada alta (Semana Santa, puentes, fin de año) conviene reservar con tiempo porque el cupo es limitado.",
  },
  {
    id: "reservar-para-manana", tema: "pagos",
    preguntas: ["¿Hasta qué hora puedo reservar para mañana?", "¿Todavía alcanzo para mañana?"],
    respuesta: "Para mañana se puede reservar hasta las 9:00 pm de hoy, con el anticipo pagado.",
  },
  {
    id: "tiempo-para-pagar", tema: "pagos",
    preguntas: ["¿Cuánto tiempo tengo para pagar el anticipo?", "¿Me respetan el precio?"],
    respuesta: "Lo que dure la vigencia de tu cotización; al vencer, se pierden las fechas y los precios acordados.",
  },
  {
    id: "comprobante-impreso", tema: "pagos",
    preguntas: ["¿Necesito el comprobante impreso?", "¿Llevo la confirmación impresa?"],
    respuesta: "No, el guía ya tiene la información.",
  },
  {
    id: "pagar-en-oficina", tema: "pagos",
    preguntas: ["¿Puedo ir a su oficina a pagar en persona?", "¿Dónde están sus oficinas?"],
    respuesta: "Sí, en nuestra oficina de Xilitla: colonia La Conchita, camino a Las Pozas de Edward James (es también el punto de partida). Dime más o menos a qué hora llegas. En Ciudad Valles no hay oficina.",
    nota: "La ubicación de Google la manda el equipo: si la piden, avisa (recogida, avisar).",
  },
  {
    id: "descuento-varias", tema: "pagos",
    preguntas: ["¿Hay descuento si reservamos varias actividades?", "¿Hay descuento si somos más de 3?", "¿Me haces descuento?"],
    respuesta: "En varios tours el precio por persona ya baja solo desde 3 personas, y eso sale en la cotización. Un descuento aparte lo consulto con el equipo antes de prometerte algo.",
    alEquipo: descuento,
  },
  {
    id: "factura", tema: "pagos",
    preguntas: ["¿Emiten factura?", "Necesito factura para la empresa"],
    respuesta: "Sí facturamos. Se factura a otra cuenta, se paga el total de las actividades por adelantado y se suma el IVA del 16 % (los precios no incluyen IVA). Lo coordina administración.",
    alEquipo: { motivo: "factura", modo: "avisar" },
  },
  {
    id: "agencias", tema: "grupos",
    preguntas: ["¿Trabajan con agencias?", "Soy agencia de viajes"],
    respuesta: "Sí. Los recorridos de grupo de una agencia son privados, exclusivos para su grupo. En hospedaje se da 10 % de comisión o descuento arriba de 8 habitaciones; en tours, la comisión la define el equipo según el número de personas.",
    alEquipo: { motivo: "grupo", modo: "avisar" },
  },

  // ── Recogida, transporte y cómo llegar ─────────────────────────────────────
  {
    id: "pasan-por-nosotros", tema: "recogida",
    preguntas: ["¿Pasan por nosotros?", "¿Dónde nos recogen?", "¿Desde dónde salen los tours?"],
    respuesta: "Pasamos por ustedes a su hospedaje en Xilitla o en Ciudad Valles, que son los dos puntos de salida. ¿Dónde se hospedan?",
    nota: "Algunos tours tienen otro punto (el RZR es en nuestra base de Xilitla; el rappel recoge en Valles): usa el campo «transporte» de obtener_tour.",
  },
  {
    id: "hora-recogida", tema: "recogida",
    preguntas: ["¿A qué hora pasan por nosotros?", "¿Quién será nuestro guía?", "¿Cuándo me dicen la hora?"],
    respuesta: "El guía te escribe la noche anterior, entre 8 y 9 pm, con la hora exacta; casi siempre la recogida es entre 8 y 9 am. A veces sigue en tour y escribe un poco más tarde.",
  },
  {
    id: "central-valles", tema: "recogida",
    preguntas: ["¿Me recogen en la central de autobuses de Ciudad Valles?", "Llegamos en autobús a Valles"],
    respuesta: "Sí, el guía pasa por ustedes a la central de Ciudad Valles y de ahí salen al tour.",
  },
  {
    id: "recoger-aquismon", tema: "recogida",
    preguntas: ["¿Recogen en Aquismón?", "¿Recogen en otros pueblos?"],
    respuesta: "En Aquismón se puede, pero hay que confirmar con el equipo si tiene costo extra.",
    alEquipo: { motivo: "traslado_sin_tarifa", modo: "avisar" },
  },
  {
    id: "hospedaje-slp", tema: "recogida",
    preguntas: ["Me hospedo en San Luis Potosí, ¿me recogen ahí?", "¿Tienen traslado desde San Luis?"],
    respuesta: "Los puntos de salida son Ciudad Valles y Xilitla. Desde San Luis Potosí sí hay traslado privado, también solo el traslado sin tour.",
    nota: "Las tarifas de traslado de la lista salen de obtener_logistica; uno de solo ida o desde otra ciudad lo cotiza el equipo (traslado_sin_tarifa, avisar).",
  },
  {
    id: "traslados-otras-ciudades", tema: "recogida",
    preguntas: ["¿Tienen traslado desde Tampico?", "¿Hacen traslado solo de ida?", "¿Traslado desde León o Zacatecas?"],
    respuesta: "Hay traslado privado desde San Luis Potosí, Tampico y la Ciudad de México. Uno de solo ida, desde otra ciudad o dentro de Xilitla lo cotiza el equipo. Desde León o Zacatecas no hacemos traslados.",
    alEquipo: { motivo: "traslado_sin_tarifa", modo: "avisar" },
    nota: "Para las tarifas de la lista (redondo, por vehículo) usa obtener_logistica; avisa al equipo solo si piden algo fuera de esa lista.",
  },
  {
    id: "carro-propio", tema: "recogida",
    preguntas: ["Llegamos en nuestro carro, ¿dónde lo dejamos?", "¿Hay estacionamiento?"],
    respuesta: "En el estacionamiento de nuestra base en Xilitla, que es el punto de partida. Si prefieren, el equipo les cotiza sin transporte.",
  },
  {
    id: "desde-valles-cargo", tema: "recogida",
    preguntas: ["Si salimos de Valles a un tour en Xilitla, ¿cuesta más?", "¿Me cobran el traslado desde Valles?"],
    respuesta: "Los tours acuáticos no tienen costo extra desde Valles. La Ruta Surrealista desde Valles lleva su cargo de traslado (sale en la cotización); la Travesía del Café y los senderismos (Amanecer de Nubes, Olla de la Luz) también llevan costo de traslado, que te confirma el equipo.",
    alEquipo: { motivo: "traslado_sin_tarifa", modo: "avisar" },
    nota: "Avisa al equipo solo para Café o senderismos desde Valles: el cargo de la Ruta Surrealista ya lo calcula la cotización.",
  },
  {
    id: "xilitla-a-valles", tema: "recogida",
    preguntas: ["¿Me pueden recoger en Xilitla y dejarme en Valles?"],
    respuesta: "Sí, con un cargo extra por el traslado de Xilitla a Valles; te lo confirma el equipo.",
    alEquipo: { motivo: "traslado_sin_tarifa", modo: "avisar" },
  },
  {
    id: "guia-acompana", tema: "dia-del-tour",
    preguntas: ["¿El guía es el mismo que maneja?", "¿El guía entra con nosotros?"],
    respuesta: "El guía los acompaña en todo momento y en todas las actividades: canoa, saltos de cascada, etc.",
  },
  {
    id: "vehiculo-tour", tema: "dia-del-tour",
    preguntas: ["¿En qué vehículo nos llevan?", "¿Es camioneta compartida?"],
    respuesta: "Normalmente en un auto o una Avanza, según disponibilidad; para grupos, Urvan o Sprinter.",
  },
  {
    id: "solo-guia", tema: "grupos",
    preguntas: ["Solo queremos guía, llevamos nuestro transporte", "Vamos en autobús de grupo, ¿necesitamos su transporte?"],
    respuesta: "Se puede contratar solo el servicio de guía: incluye taquillas, guías y las actividades dentro de los parajes. El precio lo arma el equipo según los lugares.",
    alEquipo: fuera,
  },
  {
    id: "llegar-cdmx", tema: "recogida",
    preguntas: ["¿Cómo llego desde la Ciudad de México?", "¿Cuánto se hace de la CDMX?", "¿Cuánto se hace de Querétaro?"],
    respuesta: "En autobús, con salidas nocturnas de la Terminal del Norte: unas 8 h a Ciudad Valles y 9–10 h directo a Xilitla (por ejemplo, Transportes Frontera/Coordinados sale a las 10:15 pm y llega a Xilitla como a las 6:30 am, unos $650). En auto son 6 h 30 a 7 h. De Querétaro, 4 h 30 a 5 h.",
  },
  {
    id: "llegar-slp-valles", tema: "recogida",
    preguntas: ["¿Cómo llego desde San Luis Potosí?", "¿Cómo llego de Valles a Xilitla?", "¿Cuánto cuesta el taxi de la central al hotel?"],
    respuesta: "Desde San Luis Potosí hay autobús directo a Xilitla (línea Vencedor) y a Ciudad Valles (unas 4 h). De Valles a Xilitla hay autobús directo: es alrededor de 1 h 30. De la central de Xilitla al hotel, un taxi de $70–80.",
  },
  {
    id: "llegar-avion", tema: "recogida",
    preguntas: ["¿A qué aeropuerto llego?", "Vamos en avión"],
    respuesta: "El aeropuerto más práctico es Tampico: unas 2 h en auto a Ciudad Valles y 3 h 30 a Xilitla. También se puede volar a San Luis Potosí.",
  },
  {
    id: "manejar-sierra", tema: "recogida",
    preguntas: ["¿Es peligroso manejar a Xilitla?", "¿Cómo está la carretera?"],
    respuesta: "Recomendamos manejar de día por la sierra. Las carreteras a los sótanos, sobre todo a Golondrinas, tienen mucha subida y curvas.",
  },
  {
    id: "guadalajara", tema: "recogida",
    preguntas: ["¿Hay autobús de Xilitla a Guadalajara?"],
    respuesta: "No hay directo: hay que ir a Ciudad Valles o a Querétaro y de ahí seguir.",
  },

  // ── Hospedaje y ocasiones especiales ───────────────────────────────────────
  {
    id: "paquetes-con-hotel", tema: "hospedaje",
    preguntas: ["¿Manejan paquetes con hospedaje?", "¿Tienen hotel?"],
    respuesta: "Sí: hospedaje en nuestro hotel Paraíso Encantado, en Xilitla, muy cerca del Jardín Surrealista, más los tours. También te cotizo solo los tours, o una opción con hotel y otra sin hotel para que compares.",
  },
  {
    id: "xilitla-o-valles", tema: "hospedaje",
    preguntas: ["¿Me conviene hospedarme en Xilitla o en Valles?", "¿Dónde me hospedo?"],
    respuesta: "Te recomiendo Xilitla: mejor clima, más tranquilo y más cerca de las actividades. Desde Ciudad Valles también se llega a todos los destinos en menos de 2 horas.",
  },
  {
    id: "hotel-incluye", tema: "hospedaje",
    preguntas: ["¿Qué incluye el hotel?", "¿El hotel tiene internet?", "¿El hotel incluye desayuno?"],
    respuesta: "Estacionamiento, alberca, tina de hidromasaje, terraza con vista a las montañas, doble aire acondicionado, internet y agua caliente. El desayuno no va en el hotel: es en el buffet cuando salen al tour. El hotel tiene restaurante.",
  },
  {
    id: "hotel-familiar", tema: "hospedaje",
    preguntas: ["¿El hotel es solo para adultos?"],
    respuesta: "No, es un hotel familiar.",
  },
  {
    id: "hotel-horarios", tema: "hospedaje",
    preguntas: ["¿A qué hora es la salida del hotel?", "¿Puedo dejar mis maletas?", "¿Qué datos me piden en el check-in?"],
    respuesta: "Check-in desde las 3:00 pm y salida antes de las 12:00 pm. Si llegan antes, dejan las maletas en recepción (o en nuestra oficina). En el check-in solo piden su nombre.",
  },
  {
    id: "hotel-noches", tema: "hospedaje",
    preguntas: ["¿Qué noches cubre el paquete?", "¿Llegamos la noche anterior?"],
    respuesta: "Llegan la noche anterior o temprano el primer día (el primer tour sale a las 8:00 am) y el último día dejan el hotel antes de las 12:00 pm. Dime a qué hora llegan para cuadrar las noches.",
  },
  {
    id: "hotel-misma-cuenta", tema: "hospedaje",
    preguntas: ["¿El hotel se paga en la misma cuenta?", "¿Y si no me hospedo en su hotel?"],
    respuesta: "Sí: nosotros hacemos la reserva directamente con el hotel y va en la misma cotización. Si no se hospedan con nosotros, solo pagan los tours.",
  },
  {
    id: "hotel-planta-baja", tema: "hospedaje",
    preguntas: ["¿Puede ser en planta baja?", "Va alguien con muletas o silla de ruedas"],
    respuesta: "Lo confirmo con el hotel según la disponibilidad.",
    alEquipo: { motivo: "hotel", modo: "avisar" },
  },
  {
    id: "hotel-descuento", tema: "hospedaje",
    preguntas: ["¿Hay descuento si me quedo en su hotel?"],
    respuesta: "Déjame consultarlo con el equipo antes de darte un porcentaje.",
    alEquipo: descuento,
  },
  {
    id: "otros-hoteles-xilitla", tema: "hospedaje",
    preguntas: ["Su hotel está lleno, ¿qué me recomiendas?", "¿Otros hoteles en Xilitla?"],
    respuesta: "En Xilitla, rodeados de naturaleza: Hotel Cervecería James (cabañas, habitaciones y tipis estilo camping), Finca Santa Mónica (cabañas y camping, sin restaurante), Finca La Pagua, Monte Ixk'al y Aldea Nanacatli (temática de hongos gigantes). También Hotel Téneka y Hotel Bugambilias. Camino Surreal es bueno, pero pesado para llegar. Pasamos por ustedes a cualquiera de ellos en los tours con recogida.",
    nota: "No reservamos por ellos ni damos sus precios.",
  },
  {
    id: "hoteles-valles", tema: "hospedaje",
    preguntas: ["¿Dónde me hospedo en Ciudad Valles?", "Hoteles en Valles"],
    respuesta: "Hotel Valles (tradicional, con alberca), Hotel Casa Real (boutique, céntrico), Hostal La Huasteca (para mochileros) o un Airbnb. Desde Valles se llega a todos los destinos en menos de 2 horas.",
    nota: "No reservamos por ellos ni damos sus precios.",
  },
  {
    id: "acampar", tema: "hospedaje",
    preguntas: ["¿Hay zonas para acampar?", "¿Se puede hacer camping?"],
    respuesta: "Sí, en Xilitla hay campings (por ejemplo, Finca Santa Mónica) y te los cotiza el equipo.",
    alEquipo: fuera,
  },
  {
    id: "cabanas-trinidad", tema: "hospedaje",
    preguntas: ["Queremos cabañas en La Trinidad", "¿Hay hospedaje en La Trinidad?"],
    respuesta: "En La Trinidad solo hay cabañas y no hay señal para preguntar disponibilidad. Si se hospedan ahí, no conviene el RZR (llega a esa misma zona): mejor los senderismos de Olla de la Luz o Amanecer de Nubes.",
    tours: ["olla-de-la-luz", "amanecer-de-nubes"],
  },
  {
    id: "propuesta-matrimonio", tema: "hospedaje",
    preguntas: ["Quiero hacer una propuesta de matrimonio", "Pedida de mano"],
    respuesta: "¡Qué bonito! Hay paquete con decoración en el hotel y una experiencia privada en el Jardín de Edward James para la entrega del anillo. ¿Cómo te la imaginas?",
    tours: ["eden-en-el-jardin"], alEquipo: { motivo: "hotel", modo: "avisar" },
  },
  {
    id: "aniversario-luna-miel", tema: "hospedaje",
    preguntas: ["Es nuestro aniversario", "Vamos de luna de miel", "¿Tienen paquete romántico?"],
    respuesta: "Se arma con 2 noches, visita guiada al Jardín, la Expedición Tamul y una cena romántica con decoración y botella de vino (a las 9:00 pm en el roof garden, o en la cava si llueve); se le puede sumar otra noche y otro tour. La cena te la cotiza el equipo.",
    alEquipo: { motivo: "hotel", modo: "avisar" },
  },
  {
    id: "ambiente-fiestas", tema: "hospedaje",
    preguntas: ["¿Hay ambiente en el pueblo el 24 en la noche?", "¿Qué hay en Xilitla en Año Nuevo?"],
    respuesta: "Sí, en esas fechas hay eventos en el pueblo.",
  },

  // ── Comida ─────────────────────────────────────────────────────────────────
  {
    id: "incluye-alimentos", tema: "comida",
    preguntas: ["¿Incluye alimentos?", "¿Incluye comida o cena?", "¿Cuántos desayunos incluye el paquete?"],
    respuesta: "Los tours de día completo incluyen un desayuno buffet de comida típica huasteca (guisos a leña, tortillas hechas a mano, café de la región) en una parada camino a los destinos, entre 9:00 y 9:30 am. La comida de la tarde y la cena no van incluidas (el rafting sí lleva una comida). En paquete es un desayuno por cada día de tour; el día de salida no hay.",
  },
  {
    id: "parar-a-comer", tema: "comida",
    preguntas: ["¿Podemos parar a comer?", "¿Podemos llevar bebidas?", "¿Puedo llevar hielera con agua y cerveza?"],
    respuesta: "Sí, se para en algún restaurante o comedor en el camino, por cuenta de ustedes. Pueden llevar bebidas, también hielera; solo el conductor no puede tomar en exceso.",
  },
  {
    id: "cambiar-desayuno", tema: "comida",
    preguntas: ["Ya tenemos desayuno en el hotel, ¿puede ser comida en vez de desayuno?", "Ya no alcanzamos el desayuno, ¿nos bajan el precio?"],
    respuesta: "Déjame confirmarlo con el equipo.",
    alEquipo: { motivo: "otro", modo: "avisar" },
  },
  {
    id: "amanecer-comida", tema: "comida",
    preguntas: ["¿El Amanecer de Nubes incluye desayuno?"],
    respuesta: "No incluye desayuno: al terminar, gente de la comunidad ofrece comida (costo aparte) y en La Trinidad hay un restaurante.",
    tours: ["amanecer-de-nubes"],
  },
  {
    id: "restaurantes-xilitla", tema: "comida",
    preguntas: ["¿Qué restaurante recomiendas en Xilitla?", "¿Dónde cenamos?"],
    respuesta: "Ámbar de Dona (pastas y cortes), La Condesa (comida típica) y la taquería Los Jarros. Nuestro hotel también tiene restaurante.",
  },

  // ── Niños ──────────────────────────────────────────────────────────────────
  {
    id: "ninos-precio", tema: "ninos",
    preguntas: ["¿El menor de edad paga?", "¿Los niños pagan?", "¿Los bebés pagan?"],
    respuesta: "Los niños de 4 a 7 años pagan el 50 %; de 3 años o menos van gratis (ocupan lugar); de 8 en adelante pagan como adulto. En el RZR (por vehículo) y en los tours que se cobran por grupo no aplica. ¿Qué edades tienen?",
    nota: "Pregunta SIEMPRE la edad de cada niño antes de cotizar.",
  },
  {
    id: "ninos-que-lugares", tema: "ninos",
    preguntas: ["Voy con niños, ¿qué lugares recomiendas?", "¿Qué tour es bueno para niños?"],
    respuesta: "Dime las edades y te propongo tours con agua clara y tranquila. Ojo: el rafting, el rappel, la Gruta de Xilo, el Amanecer de Nubes y la Olla de la Luz son desde 8 años.",
  },

  // ── Seguridad ──────────────────────────────────────────────────────────────
  {
    id: "seguro", tema: "seguridad",
    preguntas: ["¿Incluye seguro?", "¿Tienen seguro de viajero?"],
    respuesta: "Los tours de aventura (rafting y RZR) incluyen seguro de viajero. En los demás es opcional: $80 por persona, y lo agregas al reservar. En Tamul se firma una responsiva.",
    nota: "Si lo quieren agregar, avisa al equipo (otro, avisar) para que lo sume a su reserva.",
  },
  {
    id: "equipo-seguridad", tema: "seguridad",
    preguntas: ["¿Qué equipo dan?", "¿Dan chaleco?", "¿Tengo que meterme a nadar?"],
    respuesta: "Chalecos salvavidas y, si hacen saltos, casco; el guía lleva botiquín. Nadar es opcional.",
  },
  {
    id: "rio-crecido", tema: "seguridad",
    preguntas: ["¿Salen con el río crecido?", "¿Es peligroso con lluvia?"],
    respuesta: "Nunca: por seguridad, con el río crecido o un paraje cerrado no se hacen actividades acuáticas. Se ofrece otro tour abierto del mismo nivel al mismo precio, reagendar sin costo o el reembolso completo.",
  },

  // ── Clima, temporada y cierres ─────────────────────────────────────────────
  {
    id: "mejor-epoca", tema: "clima",
    preguntas: ["¿Cuál es la mejor época para ir?", "¿Cuándo está turquesa el agua?", "¿Enero es buena temporada?"],
    respuesta: "Se puede todo el año. Del 30 de octubre a mayo el agua baja clara, y el turquesa más intenso es de marzo a mayo, cuando más gente hay. De julio a octubre las cascadas van a todo caudal y el agua puede traer sedimento. Para agua clara antes de las multitudes de primavera: de noviembre a enero, fechas tranquilas con los ríos en buen nivel. El clima de la Huasteca es un albur: el color del agua no se puede prometer.",
  },
  {
    id: "pronostico-lluvia", tema: "clima",
    preguntas: ["El pronóstico dice que va a llover, ¿se cancela?", "¿Y si llueve?"],
    respuesta: "Aunque el pronóstico marque lluvia, normalmente no afecta a los ríos de los parajes: lo que cierra un paraje es que el río crezca, y eso se confirma con operación antes del tour. Si cierra, el precio se respeta y se cambia a otro tour abierto, se reagenda sin costo o se reembolsa el 100 %.",
  },
  {
    id: "tamul-abierto", tema: "clima",
    preguntas: ["¿Está abierto Tamul?", "¿Cómo está el río hoy?", "¿De qué color está el agua?"],
    respuesta: "Déjame confirmarlo con el equipo (dame unos 30 minutos). Te lo digo con honestidad: si el agua todavía no está turquesa te lo decimos, y si un paraje está cerrado te propongo opciones abiertas.",
    alEquipo: { motivo: "clima", modo: "avisar" },
  },
  {
    id: "tamul-cerrado", tema: "clima",
    preguntas: ["Si cierran Tamul, ¿se suspende solo Tamul o todo el tour?"],
    respuesta: "Se suspende todo el tour (Tamul, Cueva del Agua y sótano). Se ofrece Cascadas del Meco u otra alternativa del mismo nivel al mismo precio, reagendar sin costo o el reembolso del 100 %.",
    tours: ["expedicion-tamul"],
  },
  {
    id: "hace-frio", tema: "clima",
    preguntas: ["¿Hace frío?", "¿Qué clima hace en diciembre?"],
    respuesta: "En el día el clima es agradable o caluroso y refresca un poco en la tarde-noche. En el bosque (La Trinidad, Amanecer de Nubes, Olla de la Luz) hace más fresco: lleven ropa abrigadora.",
  },
  {
    id: "abierto-festivos", tema: "clima",
    preguntas: ["¿Está abierto el 25 de diciembre?", "¿Trabajan en días festivos?"],
    respuesta: "Sí, siempre estamos en servicio, también en días festivos. El Jardín Surrealista suele cerrar los martes, pero en temporada alta abre; se confirma con el Jardín.",
  },

  // ── Qué llevar ─────────────────────────────────────────────────────────────
  {
    id: "que-llevar", tema: "que-llevar",
    preguntas: ["¿Qué llevo?", "¿Llevamos el traje de baño puesto?", "¿Tenis o chanclas?", "¿Recomiendan shorts?"],
    respuesta: "Para que disfrutes al máximo: aqua shoes o tenis que se puedan mojar; traje de baño (ya puesto) y una muda de ropa seca; ropa de secado rápido o shorts y gorra; toalla; bloqueador y repelente biodegradables; funda impermeable para el celular; efectivo (en los parajes no hay cajero) e identificación oficial.",
    nota: "Si el tour trae su propia lista (queLlevar en obtener_tour), usa esa.",
  },
  {
    id: "aqua-shoes", tema: "que-llevar",
    preguntas: ["No trajimos aqua shoes, ¿rentan?"],
    respuesta: "No se rentan, pero se pueden comprar en el lugar.",
  },
  {
    id: "bloqueador", tema: "que-llevar",
    preguntas: ["¿Qué bloqueador recomiendas?"],
    respuesta: "Biodegradable, para cuidar los ríos; el que más llevan es Eternal Secret FPS 50.",
  },
  {
    id: "mochila-camara", tema: "que-llevar",
    preguntas: ["¿Puedo llevar mochila?", "¿Dónde se queda mi ropa extra?", "¿Puedo llevar mi cámara?"],
    respuesta: "Sí. Las cosas se quedan en el vehículo durante el tour. La cámara, en una mochila a prueba de agua y bajo tu propio riesgo.",
  },
  {
    id: "banos-jardin", tema: "dia-del-tour",
    preguntas: ["¿Hay baños en el estacionamiento del Jardín?"],
    respuesta: "En el estacionamiento no hay; los hay al llegar al Jardín.",
    tours: ["ruta-surrealista-edward-james", "eden-en-el-jardin"],
  },

  // ── Cancelaciones y cambios ────────────────────────────────────────────────
  {
    id: "politica-cancelacion", tema: "cancelacion",
    preguntas: ["¿Qué pasa si cancelo?", "¿Qué seguridad tengo si cancelo después del anticipo?"],
    respuesta: "Con 48 horas o más de anticipación, reembolso del 100 %. Entre 48 y 24 horas antes se retiene el 50 %. Con menos de 24 horas no hay reembolso, pero se puede reagendar una vez sin costo dentro de los siguientes 12 meses. Si el paraje cierra por clima o por el río: reembolso del 100 %, reagendar o cambiar a un destino alternativo del mismo nivel.",
    nota: "Si quiere cancelar una reserva ya pagada: cancelacion, pasar, hoy.",
  },
  {
    id: "cancelar-emergencia", tema: "cancelacion",
    preguntas: ["Me salió una emergencia, ¿puedo cancelar y tener reembolso?", "¿Tarda mucho la devolución?"],
    respuesta: "Claro, lo vemos. Según tu fecha te digo qué te corresponde con la política; ¿prefieres cancelar o buscamos otra fecha? Para un reembolso se pide una cuenta mexicana, y los tiempos los revisa el equipo.",
    alEquipo: { motivo: "cancelacion", modo: "pasar" },
  },
  {
    id: "cambiar-fecha", tema: "cancelacion",
    preguntas: ["¿Puedo cambiar la fecha?", "Si no puedo el martes, ¿lo hago el miércoles?", "¿Hasta cuándo confirmo para las cascadas?"],
    respuesta: "Sí, con 48 horas de anticipación y sin costo, según haya lugar en la nueva fecha (en puentes, mejor avisar con más tiempo).",
    nota: "Si ya pagó, el cambio lo hace el equipo: cambio_post_pago, pasar, hoy.",
  },
  {
    id: "persona-ya-no-va", tema: "cancelacion",
    preguntas: ["Una persona del grupo ya no va", "Somos uno menos"],
    respuesta: "Se puede cancelar a esa persona; el reembolso de su parte aplica si se avisa con al menos 48 horas.",
    alEquipo: { motivo: "cambio_post_pago", modo: "pasar" },
  },

  // ── Grupos, privados y empresas ────────────────────────────────────────────
  {
    id: "tour-compartido", tema: "grupos",
    preguntas: ["¿Es un tour compartido?", "¿Ya hay más personas confirmadas?", "¿Cuántas personas van en el grupo?"],
    respuesta: "Si se suman más personas se va en grupo; si no, van solo ustedes. Nunca llevamos grupos de más de 12. Cuántos van en esa fecha te lo confirmo con el equipo.",
    alEquipo: { motivo: "otro", modo: "avisar" },
    nota: "Avisa al equipo solo si quiere saber cuántos van en esa fecha.",
  },
  {
    id: "minimo-grupo", tema: "grupos",
    preguntas: ["¿Cuántas personas se necesitan para que se abra el grupo?", "¿Cuál es el mínimo?"],
    respuesta: "De 2 personas en adelante; el rafting, de 5 (por la capacidad de la balsa) y el rappel, de 4.",
    nota: "El mínimo exacto de cada tour está en obtener_tour (minPersonas).",
  },
  {
    id: "viajero-solo", tema: "grupos",
    preguntas: ["Viajo solo, ¿puedo ir?", "Soy una sola persona", "¿Cuánto cuesta privado para una persona?"],
    respuesta: "Sí, de dos formas: sumarte a un grupo que ya esté armado para esa fecha (lo reviso con el equipo en el calendario), o un tour privado con costo adicional, que te cotiza el equipo.",
    alEquipo: { motivo: "otro", modo: "avisar" },
    nota: "Por WhatsApp no se cotiza a una persona por debajo del mínimo: no llames a crear_cotizacion para 1.",
  },
  {
    id: "tour-privado", tema: "grupos",
    preguntas: ["Queremos el tour solo para nosotros", "¿Hacen tours privados?", "No hay grupo para mi fecha, ¿qué hago?"],
    respuesta: "Se puede hacer privado, con un costo distinto al de grupo. Si no hay grupo para tu fecha, te propongo otra fecha con grupo abierto o el privado, y si se abre un grupo te aviso enseguida.",
    nota: "Si la ficha del tour trae el extra de privado (privadoDisponible en obtener_tour), dalo; si no, lo cotiza el equipo (fuera_catalogo, avisar).",
  },
  {
    id: "descuento-grupo", tema: "grupos",
    preguntas: ["¿Hay descuento por grupo?", "Somos muchos, ¿hay precio especial?"],
    respuesta: "En varios tours el precio por persona ya baja solo desde 3 personas (sale en la cotización). Para grupos grandes se arma una cotización personalizada y el descuento lo define el equipo.",
    alEquipo: { motivo: "grupo", modo: "avisar" },
    nota: "Grupos de más de 10: caso de grupo (pasar), como dice el prompt.",
  },
  {
    id: "guia-ingles", tema: "grupos",
    preguntas: ["¿Tienen guías que hablen inglés?", "Do you have English-speaking guides?"],
    respuesta: "Sí, hay guías bilingües: se piden con anticipación y el equipo confirma según la fecha. En el Jardín de Edward James, el guía en inglés cuesta $500 extra (es regla del Jardín).",
    alEquipo: { motivo: "otro", modo: "avisar" },
  },

  // ── Confianza y la empresa ─────────────────────────────────────────────────
  {
    id: "redes-sociales", tema: "confianza",
    preguntas: ["¿Tienen redes sociales?", "¿Tienen Instagram o Facebook?"],
    respuesta: "Sí: Instagram y Facebook de Huasteca Potosina Tours, y nuestro perfil de Google Maps con las reseñas.",
    nota: "Manda los enlaces de «CONFIANZA» tal cual. Solo la marca Huasteca Potosina Tours: no menciones otros nombres.",
  },
  {
    id: "att-senal", tema: "confianza",
    preguntas: ["¿Funciona AT&T en Xilitla?", "¿Hay señal?"],
    respuesta: "La red de AT&T no funciona en Xilitla. Si alguna vez tardamos en contestar, es por las fallas de red del pueblo.",
  },
  {
    id: "fotos-del-tour", tema: "dia-del-tour",
    preguntas: ["¿Me pasas las fotos y videos del tour?", "¿Cuándo me mandan las fotos?"],
    respuesta: "¡Claro! Le pido a tu guía que te las haga llegar.",
    alEquipo: { motivo: "otro", modo: "avisar" },
    nota: "Sin prometer plazo.",
  },
];
