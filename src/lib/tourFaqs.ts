export interface FAQ {
  q: string;
  a: string;
}

/** Keyed by tour.id (from TOURS_DB) */
export const TOUR_FAQS: Record<string, FAQ[]> = {
  "tour-rzr-xilitla": [
    {
      q: "¿Necesito licencia o experiencia para manejar el RZR?",
      a: "No necesitas experiencia: te damos un briefing de manejo y el RZR es fácil de controlar. Un guía instructor abre la ruta delante de ti todo el tiempo. El conductor debe ser mayor de edad; si prefieres no manejar, puedes ir de copiloto.",
    },
    {
      q: "¿El precio es por persona o por vehículo?",
      a: "Por vehículo. Cada unidad tiene su precio según la ruta: desde $1,600 MXN el RZR 500 (2 adultos + 1 niño) en la Ruta Nanacatli, hasta el Defender Familiar (6 adultos + 2 niños) o el Polaris Pro S premium. Todos incluyen gasolina, equipo de seguridad y guía.",
    },
    {
      q: "¿Pueden ir niños?",
      a: "Sí, según el vehículo. El RZR 500 lleva 2 adultos y 1 niño, y el Defender Familiar lleva 6 adultos y 2 niños. Avísanos las edades al reservar para asignarte la unidad adecuada.",
    },
    {
      q: "¿Está incluido el transporte y la comida?",
      a: "No. El precio incluye el vehículo con gasolina, el equipo de seguridad y el guía. El punto de encuentro es nuestra base en Xilitla; el transporte hasta allí y los alimentos no están incluidos.",
    },
    {
      q: "¿Qué debo llevar?",
      a: "Ropa que se pueda ensuciar y mojar, calzado cerrado, bloqueador y una muda de cambio. Vas a salir con barro — es parte de la diversión.",
    },
    {
      q: "¿Cuánto dura el recorrido?",
      a: "Depende de la ruta: Nanacatli 2 horas (la más popular, ideal para primerizos), Miradores 3 horas, y Nacimiento o Trinidad 5 horas cada una. En la Ruta Nacimiento te prestamos kayak y chaleco salvavidas para la actividad en el nacimiento.",
    },
  ],
  "tour-rafting-tampaon": [
    {
      q: "¿Es seguro hacer rafting si no sé nadar?",
      a: "Sí. Vas con chaleco salvavidas y casco todo el descenso, y el guía certificado va dentro de la balsa contigo. Solo avísale antes de subir para ubicarte en el mejor lugar de la balsa.",
    },
    {
      q: "¿Necesito experiencia previa?",
      a: "No. Los rápidos Clase III son el punto perfecto entre emoción real y seguridad para principiantes. Antes de tocar el agua recibes un briefing completo de seguridad y técnica de remado.",
    },
    {
      q: "¿Qué pasa si el nivel del río no permite navegar?",
      a: "Tu seguridad va primero: si el río no está en condiciones (sobre todo en temporada de lluvias, julio–septiembre), te avisamos con anticipación y reprogramamos la salida o te proponemos una actividad alternativa.",
    },
    {
      q: "¿Puedo llevar mi GoPro?",
      a: "Sí, pero únicamente con soporte de pecho o casco. No se permite llevarla en la mano: las dos manos deben quedar libres para remar y sujetarte de las cuerdas de seguridad.",
    },
    {
      q: "¿Qué debo llevar?",
      a: "Traje de baño o ropa que se pueda mojar, calzado acuático o tenis que se puedan mojar (con calcetines para evitar ampollas), bloqueador biodegradable y una muda completa de ropa seca para el regreso.",
    },
    {
      q: "¿Dónde es el punto de salida? ¿Incluye transporte?",
      a: "Sí: pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla, con traslado redondo incluido. Tú solo prepárate para remar.",
    },
    {
      q: "¿Incluye comida?",
      a: "Sí, tu reserva incluye una comida — antes o después de la actividad, como prefieras.",
    },
  ],
  "tour-rappel-tamul": [
    {
      q: "¿Necesito experiencia previa en rappel?",
      a: "No. El primer descenso es 100% guiado y la mayoría de nuestros visitantes nunca habían hecho rappel. Nuestros guías de alta montaña te dan el briefing de técnica antes de bajar.",
    },
    {
      q: "¿Está incluido el transporte?",
      // Decía que NO estaba incluido, contradiciendo la lista de "incluye" del
      // propio tour y su descripción, que sí traen el traslado desde Ciudad Valles.
      a: "Sí, el traslado desde Ciudad Valles va incluido; de ahí salimos al embarcadero del río. Lo que no incluye el precio son los alimentos.",
    },
    {
      q: "¿Las fotos y el video tienen costo extra?",
      a: "No, están incluidos. Te documentamos todo el descenso con fotografía y video con dron, sin costo adicional.",
    },
    {
      q: "¿Qué equipo debo llevar?",
      a: "Nosotros ponemos todo el equipo de seguridad (arnés, casco, guantes y cuerdas). Tú solo trae ropa deportiva cómoda que se pueda mojar, calzado cerrado con suela firme y bloqueador.",
    },
    {
      q: "¿Cuánto dura la actividad?",
      a: "Entre 3 y 5 horas, dependiendo del tamaño del grupo y las condiciones del clima.",
    },
  ],
  "tour-tamul": [
    {
      q: "¿Se puede hacer si no sé nadar?",
      a: "Sí. Usamos chalecos salvavidas en toda la travesía. No es necesario saber nadar.",
    },
    {
      q: "¿A qué hora es la salida?",
      a: "Salimos entre las 8:00 y las 9:00 AM. Confirmamos la hora exacta de tu recogida al reservar.",
    },
    {
      q: "¿Qué pasa si llueve?",
      a: "Operamos con lluvia ligera: la selva con agua se ve mejor. Si el río no está seguro, primero te cambiamos de actividad —hay recorridos que no dependen del río, como Las Pozas o la Gruta— y si ninguno te late, eliges reembolso o cambio de fecha. La idea es que ese día la pases bien de todos modos.",
    },
  ],
  "tour-edward-james": [
    {
      q: "¿Las Pozas tienen restricción de edad?",
      a: "No, pero el terreno es irregular. Para niños menores de 5 recomendamos cuidado extra.",
    },
    {
      q: "¿El guía habla inglés?",
      a: "Nuestros guías están certificados NOM-09 y en una salida compartida manejan inglés básico. Si quieres uno que lo hable con soltura, márcalo al reservar —la casilla «Quiero guía en inglés», sin costo— y te lo conseguimos; si ese día no lo tenemos, te avisamos antes por WhatsApp.",
    },
    {
      q: "¿Cuánto tiempo estamos en cada lugar?",
      a: "Aprox. 2h en Las Pozas, 1h en Huichihuayán, 45 min en cada atracción adicional.",
    },
  ],
  "tour-meco": [
    {
      q: "¿Puedo nadar en todas las cascadas?",
      a: "Sí. Todas las pozas del tour son aptas para nado con chaleco incluido.",
    },
    {
      q: "¿Hay comida incluida a mediodía?",
      a: "El desayuno está incluido. La comida del mediodía no — hay opciones en ruta.",
    },
    {
      q: "¿Es apto para adultos mayores?",
      a: "Sí, dificultad baja. El acceso a los miradores es caminata corta y plana.",
    },
  ],
  "tour-minas-micos": [
    {
      q: "¿Es seguro llevar niños pequeños?",
      a: "Sí, es uno de nuestros tours más aptos para familias. Chalecos para todos.",
    },
    {
      q: "¿Minas Viejas y Micos están cerca entre sí?",
      a: "Están en la misma ruta. En auto son 40 min entre sí — cubrimos ambos en el día.",
    },
    {
      q: "¿El agua está muy fría?",
      a: "Entre 18–22°C. Refrescante pero no helada. La mayoría lo disfruta mucho.",
    },
  ],
  "tour-puente-dios": [
    {
      q: "¿Se puede entrar al Puente de Dios con niños?",
      a: "Sí, con chaleco obligatorio. Recomendamos niños mayores de 5 años por los escalones.",
    },
    {
      q: "¿Qué tan fría está el agua?",
      a: "Entre 18–22°C — refrescante pero no helada. La mayoría lo disfruta mucho.",
    },
    {
      q: "¿La Hacienda Los Gómez tiene costo adicional?",
      a: "No, está incluida en el precio del tour.",
    },
  ],
  "tour-eden-jardin": [
    {
      q: "¿Qué veo en esta experiencia que no vea en la visita normal a Las Pozas?",
      a: "Tres cosas. Entras una hora antes de que abra al público, así que el jardín está vacío. Se abren recintos que no forman parte del recorrido general, entre ellos la Casa Estudio, donde todavía se conserva un poema escrito de puño y letra por Edward James. Y se sube a los niveles superiores del Palacio de Bambú, que en la visita normal están cerrados.",
    },
    {
      q: "¿A qué hora empieza?",
      a: "Lunes, miércoles, jueves y viernes a las 8:00 a. m.; sábados y domingos a las 7:00 a. m. También hay salida de 5:00 p. m. de miércoles a lunes. La hora exacta se confirma al apartar la fecha, porque depende del día.",
    },
    {
      q: "¿Cuántos podemos ir?",
      a: "De 1 a 7 personas. El máximo lo pone el jardín: no se permite el acceso a más de 7 por experiencia, y en algunas estructuras se sube de una en una por su capacidad de carga.",
    },
    {
      q: "¿En qué idioma es la visita?",
      a: "Español o inglés, el que prefieras. Francés e italiano se pueden pedir con anticipación y quedan sujetos a disponibilidad del guía.",
    },
    {
      q: "¿Puedo nadar en las pozas?",
      a: "No. En esta experiencia no se permiten actividades acuáticas — el jardín es Monumento Artístico y Patrimonio Nacional, y las reglas del recinto lo prohíben.",
    },
    {
      q: "¿Puedo llevar dron o tripié?",
      a: "No. El jardín no permite el acceso con mascotas, drones ni tripiés, y la administración puede negar la entrada de cualquier objeto que considere un riesgo para el patrimonio o que obstruya los caminos. Las fotos con tu cámara o tu teléfono, sin problema.",
    },
    {
      q: "¿Qué pasa si quiero cambiar la fecha?",
      a: "Se puede, avisando con 5 días o más de anticipación: el monto completo se respeta y lo usas en cualquier fecha disponible dentro de los 6 meses siguientes. Con menos de 5 días, o si no te presentas, no hay cambio ni reembolso. Si el clima obliga a suspender, se reprograma sin costo.",
    },
  ],

  // ── Los tres recorridos nuevos (28 sep 2026) ────────────────────────────
  // Cada respuesta sale de su ficha en `tours.ts`, de `tourRequisitos.ts` o de
  // `destinos.ts` (olla-de-la-luz, la-trinidad-xilitla). 🔴 Aquí NO van horas,
  // precios, cupos ni edad mínima: las horas de estos tres se inventaron una
  // vez y se publicaron, y cupo y edad siguen sin confirmar. La hora de salida
  // y el precio ya los contesta la plantilla con datos del catálogo; esta lista
  // tampoco repite "¿Qué incluye…?", "¿Cuánto dura…?" ni el punto de salida
  // (que ya dice lo del costo extra desde Ciudad Valles).
  "tour-gruta-xilo": [
    {
      q: "¿Por qué la Gruta de Xilo se recorre de noche?",
      a: "Porque es la mitad de la experiencia. Sin el ruido ni el calor del día, la caminata de 15 a 20 minutos por la selva ya se hace con la lámpara encendida, y dentro de la gruta lo único que existe es el círculo de luz de tu lámpara. Al final, en los jacuzzis naturales, se apagan las lámparas unos minutos para escuchar la cueva en silencio.",
    },
    {
      q: "¿Qué tan difícil es la Gruta de Xilo?",
      a: "Es de dificultad media. Primero caminas de 15 a 20 minutos por la selva hasta la boca de la gruta; adentro se recorren unos 900 metros sobre roca húmeda, con tramos amplios donde se camina de pie y tramos donde hay que agacharse. Se avanza despacio y en grupo chico, y antes de entrar el guía explica por dónde se pisa.",
    },
    {
      q: "¿Es para personas con claustrofobia?",
      a: "No te lo recomendamos. Hay tramos amplios donde se camina de pie, pero también tramos donde hay que agacharse, y todo se hace con la luz de tu lámpara frontal. Si sufres de claustrofobia, este no es tu recorrido.",
    },
    {
      q: "¿Me voy a mojar?",
      a: "Ve preparado para eso. Hay pasajes con agua, dentro de la gruta se camina sobre roca húmeda y el recorrido termina en unos jacuzzis naturales: pozas de agua cristalina formadas dentro de la propia cueva. Lleva calzado cerrado con agarre que se pueda mojar y una muda completa de ropa seca para el regreso.",
    },
    {
      q: "¿Cuándo me dan el casco y la lámpara?",
      a: "Al inicio, cuando pasamos por ti a tu hospedaje, no en la entrada de la cueva: así haces la caminata por la selva ya con la lámpara encendida. El casco y la lámpara frontal van incluidos para cada persona y son de uso obligatorio.",
    },
  ],
  "tour-amanecer-nubes": [
    {
      q: "¿Dónde está el Cerro del Pilón?",
      a: "En la sierra de Xilitla. Primero se sube por camino de sierra a La Trinidad, una comunidad náhuatl a unos 14 km de Xilitla, en un bosque de niebla a casi 2,000 metros, y de ahí se camina entre pinos y encinos hasta la cima del Cerro del Pilón. Cuando hay mar de nubes, lo que se ve al amanecer es una capa de nubes que tapa los valles de un lado al otro del horizonte.",
    },
    {
      q: "¿Y si ese día no hay mar de nubes?",
      a: "Puede pasar: el mar de nubes depende del clima. Es frecuente, pero nadie lo puede garantizar, y nosotros tampoco lo prometemos. La subida se calcula igual para llegar a la cima antes de que amanezca, y la bajada se hace ya con luz, que es cuando ves el bosque de niebla por el que subiste a oscuras.",
    },
    {
      q: "¿Qué tan difícil es la subida?",
      a: "Es de dificultad media. Son varias horas de caminata en subida constante, buena parte de ellas a oscuras y con lámpara frontal, por un sendero entre pinos y encinos; los últimos metros antes de la cima son de roca. No hace falta experiencia de montaña, pero sí condición para caminar en pendiente.",
    },
    {
      q: "¿Hace frío arriba?",
      a: "Sí, de verdad, aunque en Xilitla haga calor. Se camina de madrugada por un bosque de niebla a casi 2,000 metros: lleva chamarra que corte el viento, calzado de montaña con buen agarre y lámpara frontal.",
    },
    {
      q: "¿Se desayuna en la cima?",
      a: "Sí, pero el desayuno no va incluido. Como se sale de madrugada, lleva agua y algo de comer: en la cima, después del amanecer, se para todo para tomar fotos y desayunar algo.",
    },
  ],
  // 🔴 Las medidas del sótano (193 m de caída, 233 de diámetro) repiten las de
  // `destinos.ts`, que avisa que son las del operador y no un levantamiento:
  // si cambian allá, cambian aquí y en `i18n/tourFaqs.en.ts`.
  "tour-olla-de-la-luz": [
    {
      q: "¿Qué es la Olla de la Luz?",
      a: "Es un sótano vertical de 193 metros de profundidad y 233 de diámetro en lo alto de la sierra de Xilitla, rodeado de bosque de niebla y coronado por el Cerro de la Luz, el punto más alto del municipio. Es tan grande que en su fondo creció otro bosque. También lo verás escrito Hoya de la Luz: es el mismo lugar.",
    },
    {
      q: "¿Se puede ir a la Olla de la Luz sin guía?",
      a: "No. Solo se entra con guía de la comunidad de La Trinidad; no se puede llegar por cuenta propia. Por eso la caminata de este recorrido se hace con un guía de la propia comunidad.",
    },
    {
      q: "¿Qué tan difícil es la caminata?",
      a: "Es de dificultad media: unas 2 horas de caminata guiada para llegar, entre bosque cerrado, llanos abiertos y miradores, y el regreso por el mismo sendero, todo en altura. El recorrido se mueve entre los 1,950 y los 2,300 metros sobre el nivel del mar, así que conviene ir con calzado de senderismo.",
    },
    {
      q: "¿Qué tan cerca del borde se puede llegar?",
      a: "Hasta donde te indique el guía. Es un abismo de 193 metros con bordes expuestos: no te acerques al borde sin tu guía, que es quien te enseña dónde pararte y dónde no.",
    },
    {
      q: "¿Hace frío en La Trinidad?",
      a: "Sí, aunque en Xilitla estés sudando. La Trinidad está en uno de los bosques de niebla mejor conservados de la Huasteca, fresco y húmedo todo el año, con la niebla enredada entre los pinos. Lleva chamarra o impermeable.",
    },
  ],

  // 🔴 Huasteca Instagrameable es el Único recorrido que promete ENTREGA de fotos. El
  // número (25 a 30) y el plazo (3 días) tienen que ser idénticos aquí, en el
  // `incluye` de `tours.ts`, en `lib/bot/politicas.ts` y en `export-bot-data.ts`.
  "tour-huasteca-instagrameable": [
    {
      q: "¿Qué fotos me voy a llevar exactamente?",
      a: "Los encuadres de tu día, que el guía ya tiene ubicados. Día 1: la canoa entrando al cañón entre paredes de cien metros, tú sobre la roca con los 105 metros de Tamul atrás, el agua turquesa desde dentro de la canoa, y en la tarde las columnas y los arcos de Edward James y la escalera que no lleva a ningún lado, con la luz de las 5 PM. Día 2: el salto a la poza de Micos, las caídas en escalones desde la orilla y, al atardecer, los pericos entrando al Sótano de las Huahuas. Día 3: las terrazas de travertino y la cortina doble de Minas Viejas desde la pasarela, el Meco entre las 9 y las 11 AM —su hora— y la caída de El Salto.",
    },
    {
      q: "¿Cuántas fotos me entregan y cuándo?",
      a: "Entre 25 y 30 fotografías editadas, en una carpeta privada que te llega por WhatsApp o correo dentro de los 3 días siguientes al recorrido. No son las fotos en crudo: van revisadas y ajustadas de luz y color.",
    },
    {
      q: "¿Quién toma las fotos? ¿Va un fotógrafo aparte?",
      a: "Las toma tu guía, con una cámara Fujifilm X-T30 II —no con un teléfono—. No va un fotógrafo adicional: va un guía que conoce los puntos exactos de cada lugar, la hora a la que se ven mejor y dónde pararte. Por eso el grupo es de máximo 6 personas.",
    },
    {
      q: "¿Puedo usar las fotos en mis redes? ¿Ustedes también las usan?",
      a: "Son tuyas y puedes publicarlas donde quieras, sin pedirnos permiso. Nosotros también podríamos usar alguna en nuestras redes o en el sitio; si prefieres que no, dínoslo el mismo día y no se usa ninguna.",
    },
    {
      q: "¿Llevan dron?",
      a: "No. En Las Pozas están prohibidos los drones y los tripiés, así que no forman parte de este recorrido. Las fotos se hacen con cámara en mano. El único recorrido nuestro con video de dron es el Rappel en la Cascada de Tamul, porque el equipo es del operador del rappel.",
    },
    {
      q: "¿Por qué el Día 1 no sale los martes?",
      a: "Porque el Día 1 entra a Las Pozas en el horario de las 5:00 PM, y el jardín abre ese horario de miércoles a lunes. Los martes no existe, y mover el jardín a la mañana haría imposible la canoa de Tamul el mismo día. Los Días 2 y 3 salen cualquier día.",
    },
    {
      q: "¿Puedo hacer los tres días?",
      a: "Sí. Son tres días distintos, cada uno al mismo precio por persona, y se pueden tomar seguidos: Tamul y Las Pozas, Micos y el Sótano de las Huahuas, y Minas Viejas con el Meco y El Salto. Escríbenos por WhatsApp y te armamos los tres días con sus fechas en una sola cotización.",
    },
    {
      q: "¿El guía me dice cómo posar?",
      a: "Te dice dónde pararte, qué tienes detrás y hacia dónde mirar, y si quieres te propone encuadres. Si prefieres que no te dirija y solo te fotografíe como vas, también: dínoslo al empezar el día.",
    },
    {
      q: "¿Y si no me llegan las fotos?",
      a: "Escríbenos por WhatsApp al terminar el tercer día y te las mandamos. Guarda tu folio de reserva: con él el equipo ubica tu carpeta. Si se pasó el plazo, dínoslo —no esperes semanas—, porque las fotos se ordenan por salida y entre más pronto avises, más rápido se encuentran.",
    },
    {
      q: "¿Pueden ir con guía que hable inglés?",
      a: "Se pide con anticipación y el equipo lo revisa según la fecha; no lo damos por hecho al reservar. Dinos desde el principio si lo necesitas y te confirmamos antes de apartar.",
    },
    {
      q: "¿Y si llueve o el río cierra?",
      a: "Si el río cierra el paso a Tamul, el Día 1 se reacomoda sin costo: se ve la cascada desde el mirador de arriba y el jardín se mantiene. Si la lluvia impide el recorrido completo, lo reagendamos o te devolvemos lo pagado, como en todos nuestros recorridos.",
    },
  ],
};
