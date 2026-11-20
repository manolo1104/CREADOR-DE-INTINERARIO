/**
 * La GUÍA PRÁCTICA de los destinos más buscados (20 nov 2026, auditoría de la
 * sección Destinos): lo que hace falta para ir —con o sin nosotros— escrito a
 * mano y con su fuente.
 *
 * Reglas:
 *  · Cada cifra viene de una fuente con fecha (`fuentes`). Si dos fuentes se
 *    contradicen, se publica la más reciente y confiable y se dice «aprox.».
 *  · `revisado` es la fecha en que se revisaron las fuentes. `enCampo` solo se
 *    llena cuando un guía lo comprobó en el lugar: entonces la ficha dice
 *    «Verificado en campo el … por …». Nunca se pone sin que haya pasado.
 *  · Lo que está aquí MANDA sobre `destinos.ts` en la ficha (costos, FAQs).
 *    Si cambias un precio aquí, revisa que `precio_entrada` y la meta de
 *    `destinos.ts` digan lo mismo (lo revisa `datosUnificados.test.ts`).
 *  · Solo español por ahora: en /en la ficha enseña los bloques que salen de
 *    los datos (nivel, cerca de aquí, cómo llegar), no estos textos.
 */
import { POZAS_ACCESO } from "./destinos";

export interface Fuente {
  nombre: string;
  url?: string;
  /** AAAA-MM-DD, AAAA-MM o AAAA: la fecha de la fuente, no la de hoy. */
  fecha: string;
}

export interface LineaCosto {
  concepto: string;
  /** «$100», «$150 por persona», «Incluido», «Gratis». */
  monto: string;
  nota?: string;
}

export interface RutaDesde {
  desde: string;
  tiempo: string;
  detalle?: string;
}

export interface Temporada {
  meses: string;
  agua: string;
  nota: string;
}

export interface GuiaDestino {
  /** AAAA-MM-DD: cuándo se revisaron las fuentes de esta ficha. */
  revisado: string;
  /** Solo si un guía lo comprobó en el lugar. */
  enCampo?: { fecha: string; por: string };
  /** 3–4 líneas: qué es, dónde, cuánto cuesta, cuánto tiempo, para quién. */
  respuestaRapida: string;
  costos: LineaCosto[];
  /** «Solo efectivo; el cajero más cercano está en…». */
  pago?: string;
  /** Lo que cuesta y toma ir por tu cuenta, para la comparación con el tour. */
  porTuCuenta: { costo: string; tiempo: string; logistica: string };
  horario?: string;
  rutas: RutaDesde[];
  /** Embarcadero, estacionamiento o acceso: a donde se pone el GPS. */
  puntoDeLlegada?: { nombre: string; lat: number; lng: number };
  /** Terracería, curvas, señal de celular. */
  camino?: string;
  transportePublico?: string;
  pasoAPaso: string[];
  edadMinima?: string;
  saberNadar?: string;
  accesibilidad?: string;
  seguridad: string[];
  temporadas: Temporada[];
  servicios: string[];
  responsable: string[];
  faqs: { pregunta: string; respuesta: string }[];
  fuentes: Fuente[];
}

const REVISADO = "2026-11-20";

/** Fuentes que se repiten en varias fichas. */
const F = {
  pcCierres2026: { nombre: "ADN40: las lluvias obligan al cierre de atractivos naturales en SLP", url: "https://www.adn40.mx/mexico/2026-07-16/las-lluvias-obligan-al-cierre-de-estos-atractivos-naturales-en-san-luis-potosi/", fecha: "2026-07-16" },
  pcCierres2024: { nombre: "Milenio: restringen actividades en parajes de la Huasteca por lluvias", url: "https://www.milenio.com/estados/restringen-actividades-parajes-acuaticos-huasteca-potosina", fecha: "2024-07-11" },
  universalRuta: { nombre: "El Universal SLP: cuánto cuesta la entrada a los parajes de la Ruta Turquesa", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/cuanto-cuesta-la-entrada-a-los-parajes-de-la-ruta-turquesa-en-la-huasteca-de-slp/", fecha: "2025-09-23" },
  universalTresParaisos: { nombre: "El Universal SLP: Micos, El Meco y Minas Viejas", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/cascadas-micos-el-meco-y-minas-viejas-tres-paraisos-naturales-para-semana-santa-en-slp/", fecha: "2026-03-09" },
  universalMicosMecoTamul: { nombre: "El Universal SLP: cuánto cuesta la entrada a Micos, El Meco y Tamul", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/micos-el-meco-y-tamul-cuanto-cuesta-la-entrada-a-las-cascadas-de-san-luis-potosi/", fecha: "2026-04-01" },
  osrm: { nombre: "Tiempos de manejo calculados sobre OpenStreetMap (sin tráfico; en la sierra suma 15–30 %)", fecha: "2026-11-20" },
} satisfies Record<string, Fuente>;

export const GUIA_DESTINO: Record<string, GuiaDestino> = {
  // ─── Cascada de Tamul ────────────────────────────────────────────────────
  "cascada-de-tamul": {
    revisado: REVISADO,
    respuestaRapida:
      "Tamul es la cascada más alta de San Luis Potosí: unos 105 metros de caída al fondo del cañón del río Tampaón, en Aquismón. Se llega remando en canoa de 1 a 2 horas río arriba desde los embarcaderos de La Morena o Tanchachín, a una hora de Ciudad Valles. La canoa se cobra por embarcación (unos $2,000 hasta para 10 personas, con chaleco) y solo en efectivo. El paseo completo toma unas 3 horas: sal antes de las 11:00. Pide buena condición física; la mejor época es de noviembre a febrero.",
    costos: [
      { concepto: "Canoa a remo (ida y vuelta, con chaleco)", monto: "~$2,000 por canoa", nota: "Caben hasta 10 personas. Si se completa el grupo, ~$200 por persona; si no, no se puede compartir." },
      { concepto: "Entrada al embarcadero", monto: "$10–$50 por persona", nota: "Varía por embarcadero; en La Morena incluía estacionamiento y vestidores." },
      { concepto: "Baños", monto: "~$5", nota: "Tarifa de 2020; puede haber subido." },
      { concepto: "Ruta por arriba (El Naranjito), guía local", monto: "~$1,600 de 1 a 5 personas", nota: "Opcional; se camina a la parte alta y se baja por escaleras empinadas. Vehículo alto." },
    ],
    pago: "Solo efectivo: no hay terminal ni cajero en los embarcaderos. Retira en Ciudad Valles o Aquismón.",
    porTuCuenta: {
      costo: "~$2,000 la canoa + $10–$50 p/p (en grupo de 10, unos $250 por persona)",
      tiempo: "Un día: ~1 h de Valles al embarcadero y ~3 h en el río",
      logistica: "Manejas 18 km de terracería, juntas tu grupo para llenar la canoa y remas tú.",
    },
    horario: "Embarcaderos de ~08:00 a 18:00; sal antes de las 11:00",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h", detalle: "Carretera 70 unos 30 km y ~18 km de terracería hasta el embarcadero" },
      { desde: "San Luis Potosí", tiempo: "~4–5 h", detalle: "A Ciudad Valles (3–4 h) y de ahí al embarcadero" },
      { desde: "Monterrey", tiempo: "~7 h", detalle: "Vía Ciudad Valles" },
      { desde: "Ciudad de México", tiempo: "~7–7.5 h", detalle: "Vía Ciudad Valles" },
    ],
    camino: "Los últimos ~18 km son de terracería. En el cañón no hay señal de celular: descarga el mapa antes.",
    transportePublico: "Colectivos de Ciudad Valles hacia El Sauz o al crucero de Tanchachín y de ahí camionetas comunitarias; sin horarios publicados.",
    pasoAPaso: [
      "En Tanchachín se estaciona en la carretera y se baja ~1 km a pie al río; en La Morena el estacionamiento está junto al agua y se reman unos 3 km menos.",
      "Se rema río arriba, contra la corriente, unos 4 km en canoa de madera sin motor: todos reman. Toma de 1 a 2 horas según el nivel del río.",
      "A medio camino hay rápidos: se baja de la canoa y se caminan unos 400 m por la orilla hasta la siguiente.",
      "Se llega a La Piedra, la roca frente a la cascada, que hace de mirador. Al pie de la caída NO se nada: la corriente es muy fuerte.",
      "El regreso es a favor de la corriente y más rápido. Casi siempre se para en la Cueva del Agua a nadar con chaleco.",
    ],
    edadMinima: "Sin regla oficial; algunas operadoras piden 12 años",
    saberNadar: "No hace falta: el chaleco es obligatorio",
    accesibilidad: "No apto para movilidad reducida: hay que caminar a la orilla y remar.",
    seguridad: [
      "El chaleco es obligatorio y viene con la canoa: no hace falta llevar el tuyo.",
      "No te acerques al pie de la cascada ni nades ahí: la corriente es muy fuerte.",
      "Protección Civil cierra el río cuando crece en temporada de lluvias (lo cerró el 16 de julio de 2026). Pregunta antes de salir de Valles.",
      "Cuidado con las guerras de agua entre canoas: en 2026 se hizo viral una canoa hundida.",
    ],
    temporadas: [
      { meses: "Nov–Feb", agua: "Turquesa, cascada con caudal", nota: "La mejor época: clima templado y la cascada llena." },
      { meses: "Mar–May", agua: "Turquesa, cascada baja o seca", nota: "Por el estiaje y el riego la caída puede quedar en roca desnuda (pasó en 2024, 2025 y 2026)." },
      { meses: "Jun–Oct", agua: "Café, río crecido", nota: "Temporada de lluvias: la cascada se ve enorme pero la navegación se suspende cuando el río crece." },
    ],
    servicios: [
      "Estacionamiento, vestidores y baños en el embarcadero de La Morena",
      "Comida en la entrada de La Morena y puestos junto a la Cueva del Agua",
      "Zonas para acampar en La Morena y campamento por la ruta de arriba",
      "Hospedaje en Aquismón y Ciudad Valles",
    ],
    responsable: [
      "Bloqueador biodegradable: el río es agua viva y la usan las comunidades",
      "Regresa con tu basura; en el cañón no hay botes",
      "Las canoas son sin motor por acuerdo de los ejidos: respétalo",
    ],
    faqs: [
      { pregunta: "¿Cuánto cuesta ir a la Cascada de Tamul por tu cuenta?", respuesta: "La canoa se cobra por embarcación: unos $2,000 MXN por canoa, para hasta 10 personas y con chaleco incluido, o unos $200 por persona cuando se completa el grupo. Aparte se pagan de $10 a $50 por persona en el embarcadero. Solo efectivo: no hay cajero." },
      { pregunta: "¿Cuánto se tarda en llegar a la cascada en canoa?", respuesta: "De 1 a 2 horas remando río arriba, según el nivel del río y el embarcadero (desde La Morena se reman unos 3 km menos que desde Tanchachín). El paseo completo, con la ida, la cascada y el regreso, dura unas 3 horas." },
      { pregunta: "¿A qué hora hay que llegar a Tamul?", respuesta: "Los embarcaderos abren hacia las 8:00. Lo prudente es salir antes de las 11:00, porque el paseo dura unas 3 horas y conviene regresar con luz y antes de que se llene." },
      { pregunta: "¿Se puede nadar en la Cascada de Tamul?", respuesta: "Al pie de la caída no: la corriente es muy fuerte. Se nada con chaleco en la Cueva del Agua, que es parada del mismo paseo, y en pozas tranquilas si el lanchero lo autoriza." },
      { pregunta: "¿Cuál es la mejor época para ver Tamul?", respuesta: "De noviembre a febrero: agua turquesa y cascada con caudal. En abril y mayo puede quedarse casi seca por el estiaje, y de julio a octubre el agua baja café y Protección Civil cierra el río cuando crece." },
      { pregunta: "¿Hay que saber nadar o tener experiencia remando?", respuesta: "No hace falta saber nadar: el chaleco es obligatorio. Sí pide condición física, porque se rema de 1 a 2 horas contra la corriente y hay un tramo de unos 400 m a pie por la orilla." },
    ],
    fuentes: [
      { nombre: "Municipio de Aquismón: protocolo y tarifas de la Cascada de Tamul", url: "https://www.aquismon-slp.gob.mx/2018-2021/images/turismo/PDSSCOVID19-CASCADA_DE_TAMUL.pdf", fecha: "2020-10-03" },
      { nombre: "Escapadah: nadar junto a una cascada de 105 metros", url: "https://www.escapadah.com/pueblos-magicos/2025/8/30/disfruta-de-nadar-en-aguas-turquesa-junto-una-cascada-de-105-metros-en-un-pueblo-magico-de-slp-31602.html", fecha: "2025-08-30" },
      { nombre: "Reseñas recientes de viajeros en TripAdvisor (precio por canoa, nov 2026)", url: "https://www.tripadvisor.com/Attraction_Review-g3181059-d6823061-Reviews-Cascada_de_Tamul-Aquismon_Central_Mexico_and_Gulf_Coast.html", fecha: "2026-11" },
      { nombre: "Mexico News Daily: Tamul sin agua por el estiaje", url: "https://mexiconewsdaily.com/news/huasteca-potosina-cascada-de-tamul-picturesque/", fecha: "2026-05-06" },
      F.pcCierres2026,
      F.osrm,
    ],
  },

  // ─── Cueva del Agua ──────────────────────────────────────────────────────
  "cueva-del-agua": {
    revisado: REVISADO,
    respuestaRapida:
      "La Cueva del Agua es una poza de agua azul y fría dentro de una cueva, a la orilla del río Tampaón, en Aquismón. No se llega a pie: es parada del paseo en canoa a la Cascada de Tamul, casi siempre al regreso. No hay cobro aparte documentado: va con la canoa. Se nada con chaleco y se echan clavados; calcula de 15 minutos a una hora.",
    costos: [
      { concepto: "Acceso", monto: "Incluido en la canoa a Tamul", nota: "No hay cobro aparte documentado; confírmalo con el lanchero." },
      { concepto: "Canoa a Tamul (con parada aquí)", monto: "~$2,000 por canoa", nota: "Hasta 10 personas, chaleco incluido. Ver la ficha de Tamul." },
    ],
    pago: "Solo efectivo, como todo en los embarcaderos de Tamul.",
    porTuCuenta: {
      costo: "La misma canoa de Tamul (~$2,000 por embarcación)",
      tiempo: "Es parte del paseo de ~3 h a Tamul",
      logistica: "Pide al lanchero la parada en la cueva; con el río alto a veces no se detienen.",
    },
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h + canoa", detalle: "Al embarcadero de La Morena o Tanchachín y luego en canoa" },
    ],
    camino: "Solo por el río. Sin señal de celular en el cañón.",
    pasoAPaso: [
      "La canoa se arrima a la orilla del río y se sube un tramo corto de escalones hasta la poza.",
      "La poza es profunda y fría: se entra con chaleco. Hay una roca alta desde donde se echan clavados.",
      "En temporada alta se llena y el agua se enturbia con el lodo de los zapatos: si puedes, entra temprano.",
    ],
    edadMinima: "La misma del paseo a Tamul",
    saberNadar: "Recomendable, aunque se nada con chaleco",
    seguridad: [
      "Es muy profunda (las cifras publicadas van de 8 a 45 m: ninguna es confiable). Siempre con chaleco.",
      "Las rocas de la orilla resbalan: entra con zapatos acuáticos.",
      "Si el río crece, Protección Civil cierra la navegación y no se llega.",
    ],
    temporadas: [
      { meses: "Nov–Feb", agua: "Azul y clara", nota: "La mejor época, junto con Tamul." },
      { meses: "Mar–May", agua: "Azul y clara", nota: "Si Tamul se queda sin agua, el paseo llega solo hasta aquí." },
      { meses: "Jun–Oct", agua: "Río café", nota: "Lluvias: cierres por creciente." },
    ],
    servicios: ["Puestos de comida y bebida cerca de la parada"],
    responsable: ["Nada sin bloqueador o con uno biodegradable", "No dejes basura en la cueva"],
    faqs: [
      { pregunta: "¿Cómo se llega a la Cueva del Agua?", respuesta: "Solo en canoa por el río Tampaón: es parada del paseo a la Cascada de Tamul, normalmente al regreso. No hay acceso a pie documentado." },
      { pregunta: "¿Cuánto cuesta la Cueva del Agua?", respuesta: "No hay un cobro aparte documentado: va incluida en la renta de la canoa a Tamul, que cuesta unos $2,000 MXN por embarcación para hasta 10 personas." },
      { pregunta: "¿Se puede nadar en la Cueva del Agua?", respuesta: "Sí, con chaleco. Es una poza profunda y fría dentro de una cueva; hay una roca alta para clavados y las orillas resbalan." },
    ],
    fuentes: [
      { nombre: "México Desconocido: el río Tampaón y sus cascadas (consultada)", url: "https://www.mexicodesconocido.com.mx/el-rio-tampaon-y-las-cascadas-de-micos-en-la-huasteca-potosina.html", fecha: "2026-11-20" },
      { nombre: "Reseñas de viajeros en TripAdvisor (Cueva del Agua)", url: "https://www.tripadvisor.com/Attraction_Review-g3181059-d12361611-Reviews-Cueva_de_Agua-Aquismon_Central_Mexico_and_Gulf_Coast.html", fecha: "2019-03" },
      F.pcCierres2026,
    ],
  },

  // ─── Sótano de las Golondrinas ───────────────────────────────────────────
  "sotano-de-las-golondrinas": {
    revisado: REVISADO,
    respuestaRapida:
      "El Sótano de las Golondrinas es un abismo de 376 metros de caída libre y unos 512 de profundidad en la sierra de Aquismón, a hora y media de Ciudad Valles. Al amanecer salen en espiral miles de vencejos y pericos verdes, y al atardecer regresan en picada. La entrada cuesta $100 por persona, solo en efectivo. Se bajan más de 500 escalones: hay que estar en el borde antes de las 6:00.",
    costos: [
      { concepto: "Entrada (derecho ejidal)", monto: "$100 por persona" },
      { concepto: "Estacionamiento comunitario", monto: "$30–$50" },
      { concepto: "Guía local", monto: "~$150", nota: "Unas fuentes lo dan como obligatorio y otras como opcional: pregunta al llegar." },
      { concepto: "Acampar (con permiso del comité ejidal)", monto: "~$40 por persona", nota: "Tarifa de 2024." },
    ],
    pago: "Solo efectivo; no hay cajero ni señal en la sierra. Retira en Ciudad Valles o Aquismón.",
    porTuCuenta: {
      costo: "~$100 + $30–$50 de estacionamiento (+ guía si te lo piden)",
      tiempo: "Salir de Valles hacia las 4:00 para ver la salida de las aves",
      logistica: "Manejas de madrugada por la sierra con curvas y sin señal.",
    },
    horario: "Abre de madrugada (~05:00) a 18:00, todos los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h 30 min", detalle: "Federal 85 a Aquismón y subida por la sierra vía Tamapatz a Unión de Guadalupe" },
      { desde: "Monterrey", tiempo: "~7 h 30 min", detalle: "Vía Ciudad Valles" },
      { desde: "Ciudad de México", tiempo: "~7 h 45 min", detalle: "Vía Ciudad Valles" },
    ],
    camino: "Carretera pavimentada pero de sierra, con muchas curvas. Sin señal de celular.",
    transportePublico: "Camionetas desde Aquismón, sin horarios publicados; para llegar al amanecer, en la práctica hace falta auto o tour.",
    pasoAPaso: [
      "Del estacionamiento de Unión de Guadalupe se baja por más de 500 escalones de piedra (las cifras van de 526 a 686) hasta el borde.",
      "En el borde hay barandal. Se guarda silencio y no se apunta con lámparas al fondo mientras salen las aves.",
      "La salida empieza más o menos entre 6:00 y 8:30; con niebla se retrasa, y con lluvia o frío intenso a veces no salen.",
      "La subida de regreso toma unos 40 minutos.",
      "Por la tarde (17:00–18:30; antes en invierno) las aves regresan y se lanzan en picada al sótano.",
    ],
    edadMinima: "Sin regla oficial; mejor con niños que ya suban escaleras largas",
    saberNadar: "No aplica",
    accesibilidad: "No apto para movilidad reducida ni rodillas delicadas.",
    seguridad: [
      "No pases del barandal ni te asomes sin guía.",
      "Prohibidos los drones: en mayo de 2024 unos helicópteros sobrevolaron el sótano en plena anidación y se denunció la muerte de unas 1,200 aves.",
      "El descenso al fondo solo se hace con operador certificado y permiso del ejido.",
    ],
    temporadas: [
      { meses: "Nov–Abr", agua: "Seco, cielo despejado", nota: "La mejor época (dic–feb, la más recomendada). Madrugadas frías: lleva chamarra." },
      { meses: "Abr–May", agua: "Calor", nota: "Época de anidación; puede pasar de 40 °C por la tarde." },
      { meses: "Jun–Sep", agua: "Lluvia y niebla", nota: "La niebla puede retrasar o suspender la salida de las aves." },
    ],
    servicios: [
      "Estacionamiento comunitario y comida local en Unión de Guadalupe",
      "Camping con permiso del comité ejidal",
      "Hospedaje en Aquismón",
    ],
    responsable: [
      "Silencio y sin luces hacia el fondo durante la salida de las aves",
      "Sin drones ni bocinas",
      "Es Monumento Natural estatal administrado por la comunidad: tu entrada lo mantiene",
    ],
    faqs: [
      { pregunta: "¿A qué hora salen las aves del Sótano de las Golondrinas?", respuesta: "Al amanecer, más o menos entre 6:00 y 8:30 (más tarde si hay niebla), y regresan al atardecer, entre 17:00 y 18:30. Para ver la salida hay que estar en el borde antes de las 6:00: si llegas a las 9:00, ya salieron." },
      { pregunta: "¿Cuánto cuesta la entrada al Sótano de las Golondrinas?", respuesta: "$100 MXN por persona, más $30 a $50 de estacionamiento. Puede que te pidan guía local (unos $150). Solo efectivo: no hay cajero en la sierra." },
      { pregunta: "¿Cuántos escalones tiene?", respuesta: "Más de 500: las cifras publicadas van de 526 a 686. Bajar es fácil; la subida de regreso toma unos 40 minutos." },
      { pregunta: "¿Qué aves salen del sótano?", respuesta: "Vencejos de collar blanco y pericos verdes. Golondrinas verdaderas casi no hay: el nombre es tradicional." },
      { pregunta: "¿Qué tan profundo es?", respuesta: "376 metros de caída libre y unos 512 metros de profundidad total; la boca mide unos 60 metros de ancho." },
    ],
    fuentes: [
      { nombre: "Milenio: Sótano de las Golondrinas, ubicación, precios y actividades", url: "https://www.milenio.com/estados/sotano-de-las-golondrinas-ubicacion-precios-y-actividades", fecha: "2026-02-05" },
      { nombre: "Escapadah: el destino subterráneo de la Huasteca", url: "https://www.escapadah.com/destinos/2026/2/6/sotano-de-las-golondrinas-el-destino-subterraneo-para-disfrutar-la-huasteca-potosina-34913.html", fecha: "2026-02-06" },
      { nombre: "Fotografiando México: guía del Sótano de las Golondrinas", url: "https://www.fotografiandomexico.com/mexico-magico/sotano-de-las-golondrinas-un-increible-abismo-subterraneo", fecha: "2026-05-17" },
      { nombre: "Crónica: denuncian sobrevuelos sobre el sótano", url: "https://www.cronica.com.mx/estados/2026/04/22/acusan-ecocidio-en-el-sotano-de-las-golondrinas-de-san-luis-potosi/", fecha: "2026-04-22" },
      { nombre: "Wikipedia: Sótano de las Golondrinas", url: "https://es.wikipedia.org/wiki/Sótano_de_las_Golondrinas", fecha: "2026-11-20" },
    ],
  },

  // ─── Sótano de las Huahuas ───────────────────────────────────────────────
  "sotano-de-las-huahuas": {
    revisado: REVISADO,
    respuestaRapida:
      "El Sótano de las Huahuas es un abismo de 478 metros en San Isidro Tampaxal, Aquismón, donde vencejos y pericos verdes («huahua» es perico en tének) salen al amanecer y regresan al atardecer. Está a unos 75 minutos de Ciudad Valles y la cooperación es de unos $100 en efectivo. Se llega por un sendero de 1.2 km con más de 800 escalones: llega una hora antes del atardecer.",
    costos: [
      { concepto: "Cooperación a los guías comunitarios", monto: "~$100 por persona", nota: "Una fuente dice que los menores de 10 no pagan." },
      { concepto: "Camping con fogata", monto: "Se paga aparte", nota: "Rentan casas de campaña; tarifa sin fuente reciente." },
    ],
    pago: "Solo efectivo; sin señal ni cajero en la ruta.",
    porTuCuenta: {
      costo: "~$100 por persona",
      tiempo: "Medio día: ~75 min de Valles y ~1 h de sendero",
      logistica: "Tramo final de terracería y sin señal; regreso de noche si ves el atardecer.",
    },
    horario: "~06:00 a 18:00, todos los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h 15 min", detalle: "Federal 85 a Aquismón y 17–19 km al norte hasta San Isidro Tampaxal" },
      { desde: "Aquismón", tiempo: "~30 min", detalle: "Carretera Limoncito–Tampaxal, km 7.5" },
    ],
    camino: "El último tramo es de terracería. Sin señal de celular en la ruta.",
    pasoAPaso: [
      "Se camina alrededor de 1.2 km por la selva y se suben más de 800 escalones hasta el mirador.",
      "Del mirador se ve la boca de unos 60 metros; no te acerques al borde sin guía.",
      "Las aves salen al amanecer y regresan al atardecer; conviene llegar una hora antes de que se ponga el sol.",
      "Se regresa por el mismo sendero; si te quedas al atardecer, lleva lámpara para bajar.",
    ],
    accesibilidad: "No apto para rodillas delicadas ni movilidad reducida.",
    seguridad: [
      "No te acerques al borde sin guía comunitario.",
      "Prohibidos los drones y las mascotas.",
      "Evita los días de lluvia o niebla cerrada: las aves casi no salen y el sendero resbala.",
    ],
    temporadas: [
      { meses: "Nov–Abr", agua: "Seco", nota: "Menos lluvia y niebla (igual que en el vecino Sótano de las Golondrinas)." },
      { meses: "Jun–Sep", agua: "Lluvia y niebla", nota: "El vuelo puede no verse y el sendero se pone lodoso." },
    ],
    servicios: ["Camping a cielo abierto con fogata", "Venta de comida típica", "Estacionamiento"],
    responsable: ["Sin radios ni bocinas", "No arrojes piedras al sótano ni colectes plantas", "Fuego solo en el área de camping"],
    faqs: [
      { pregunta: "¿Cuánto cuesta entrar al Sótano de las Huahuas?", respuesta: "Una cooperación de unos $100 MXN por persona para los guías comunitarios, en efectivo." },
      { pregunta: "¿Cuántos escalones tiene?", respuesta: "Se camina alrededor de 1.2 km por la selva y se suben más de 800 escalones hasta el mirador: no es apto para rodillas delicadas." },
      { pregunta: "¿Cómo llegar al Sótano de las Huahuas?", respuesta: "Está en San Isidro Tampaxal, unos 17 a 19 km al norte de Aquismón (unos 30 minutos). Desde Ciudad Valles son cerca de 75 minutos; el último tramo es de terracería." },
      { pregunta: "¿Huahuas o Golondrinas?", respuesta: "Las dos tienen vencejos y pericos al amanecer y al atardecer. Golondrinas es más profundo y famoso; Huahuas es menos concurrido, con un sendero más largo por la selva." },
    ],
    fuentes: [
      { nombre: "El Universal SLP: así se ve el interior del Sótano de las Huahuas", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/video-asi-se-ve-el-interior-del-sotano-de-las-huahuas-el-abismo-de-slp/", fecha: "2025-05-24" },
      { nombre: "México Desconocido: Sótano de las Huahuas (consultada)", url: "https://escapadas.mexicodesconocido.com.mx/atractivos/sotano-de-las-huahuas/", fecha: "2026-11-20" },
      { nombre: "Milenio: cómo llegar al Sótano de las Huahuas", url: "https://www.milenio.com/estilo/viajes/sotano-huahuas-san-luis-potosi-llegar", fecha: "2022-07-26" },
    ],
  },

  // ─── Puente de Dios (Tamasopo) ───────────────────────────────────────────
  "puente-de-dios-tamasopo": {
    revisado: REVISADO,
    respuestaRapida:
      "Puente de Dios es una poza turquesa bajo un arco natural de roca en Tamasopo, con una caverna a la que se entra nadando con chaleco y sujetándose de cuerdas. Está a una hora de Ciudad Valles y la entrada cuesta $150 en efectivo. Se bajan unos 300 escalones. La luz entra a la cueva hacia el mediodía. No se recomienda para menores de 5 años ni para quien no sabe nadar.",
    costos: [
      { concepto: "Entrada", monto: "$150 por persona", nota: "INAPAM $100 según una fuente." },
      { concepto: "Chaleco (obligatorio en el agua)", monto: "$25–$50 de renta" },
      { concepto: "Estacionamiento", monto: "$20–$50", nota: "Hay varios particulares junto a la entrada." },
      { concepto: "Guía local", monto: "Opcional", nota: "Recomendado para la cueva y los saltos." },
    ],
    pago: "Solo efectivo, también en los puestos de comida.",
    porTuCuenta: {
      costo: "~$150 + chaleco y estacionamiento (~$200–$250 por persona)",
      tiempo: "Medio día: ~1 h de Valles y 2–3 h en el lugar",
      logistica: "Rentas chaleco y cruzas a la cueva por tu cuenta, con cuerdas.",
    },
    horario: "~08:00 a 18:00, todos los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h", detalle: "Federal 70 rumbo a San Luis Potosí, desvío a Tamasopo y ~3–5 km hacia El Cafetal" },
      { desde: "San Luis Potosí", tiempo: "~3 h", detalle: "Federal 70 rumbo a Ciudad Valles" },
    ],
    camino: "El último tramo, del pueblo de Tamasopo a la entrada, es de terracería. Señal débil.",
    pasoAPaso: [
      "Se bajan unos 300 escalones y pasarelas hasta la poza turquesa, con pequeñas cascadas.",
      "Con chaleco y sujetándote de las cuerdas, cruzas la corriente y un túnel corto bajo el arco hasta la caverna.",
      "Dentro de la cueva el rayo de luz se ve hacia el mediodía. Para salir hay que nadar contra la corriente.",
      "Hay saltos opcionales de 1 a unos 8 metros.",
      "La subida de regreso es lo más pesado: tómalo con calma.",
    ],
    edadMinima: "No recomendado para menores de 5 años",
    saberNadar: "Muy recomendable: para salir de la cueva se nada contra la corriente",
    accesibilidad: "No apto para adultos mayores con problemas de rodilla ni movilidad reducida.",
    seguridad: [
      "Chaleco obligatorio para entrar al agua.",
      "Con el río crecido no se entra a la cueva.",
      "En lluvias fuertes Protección Civil restringe los parajes con agua de la Huasteca.",
      "Hay otros dos «Puente de Dios» (en Aquismón y en Querétaro): revisa que la noticia o el GPS sean de este, en Tamasopo.",
    ],
    temporadas: [
      { meses: "Nov–Abr", agua: "Turquesa", nota: "La mejor época; en invierno el agua está fría." },
      { meses: "Jun–Oct", agua: "Turbia, más caudal", nota: "Corriente fuerte; la cueva puede cerrarse." },
      { meses: "Dic y Semana Santa", agua: "—", nota: "Muy concurrido: llega temprano." },
    ],
    servicios: ["Estacionamientos", "Renta de chalecos", "Casilleros de madera (poco seguros: no dejes valores)", "Puestos de comida (efectivo)"],
    responsable: ["Bloqueador biodegradable", "No alimentes a la fauna ni te lleves plantas", "Lo administra un ejido pame: tu entrada lo sostiene"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a Puente de Dios en Tamasopo?", respuesta: "$150 MXN por persona, más la renta del chaleco ($25 a $50, obligatorio para entrar al agua) y el estacionamiento ($20 a $50). Solo efectivo." },
      { pregunta: "¿Cuántos escalones tiene Puente de Dios?", respuesta: "Unos 300 escalones de bajada hasta la poza. La subida de regreso es lo más pesado de la visita." },
      { pregunta: "¿A qué hora entra la luz a la cueva?", respuesta: "Hacia el mediodía, más o menos de 11:00 a 13:00." },
      { pregunta: "¿Pueden ir niños a Puente de Dios?", respuesta: "No se recomienda para menores de 5 años. Para entrar a la cueva hay que cruzar la corriente con chaleco y cuerdas y salir nadando contra ella, así que conviene saber nadar." },
    ],
    fuentes: [
      F.universalRuta,
      { nombre: "El Universal SLP: cuántos escalones tiene Puente de Dios", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/puente-de-dios-en-tamasopo-cuantos-escalones-hay-en-el-paraje-de-la-huasteca/", fecha: "2024-12-03" },
      { nombre: "Meteored: guía para visitar Puente de Dios", url: "https://www.meteored.mx/noticias/ocio/la-cueva-que-esconde-un-rio-turquesa-guia-para-visitar-puente-de-dios-en-la-huasteca-potosina.html", fecha: "2025-11-01" },
      { nombre: "México Desconocido: Puente de Dios, Tamasopo (consultada)", url: "https://www.mexicodesconocido.com.mx/puente-de-dios-tamasopo-huasteca-potosina.html", fecha: "2026-11-20" },
      F.pcCierres2024,
    ],
  },

  // ─── Cascadas de Tamasopo ────────────────────────────────────────────────
  "cascadas-de-tamasopo": {
    revisado: REVISADO,
    respuestaRapida:
      "Las Cascadas de Tamasopo son un parque con pozas turquesa, tres caídas y una zona poco profunda para niños, a una hora de Ciudad Valles. Desde marzo de 2026 la entrada cuesta $200 por persona (INAPAM $150), más $100 de estacionamiento. El chaleco se renta ahí y no se permite el propio, ni entrar con comida o bebida. Es de los parajes más cómodos para ir en familia.",
    costos: [
      { concepto: "Entrada", monto: "$200 por persona", nota: "Desde el 1 de marzo de 2026. INAPAM $150; menores de 3 años gratis. Incluye baños, regaderas, puentes colgantes y tirolesa." },
      { concepto: "Estacionamiento", monto: "$100 por auto", nota: "Cupo limitado." },
      { concepto: "Chaleco", monto: "$15 la hora o $60 el día", nota: "Se deja una identificación por cada 4 chalecos. No se permite el chaleco propio." },
    ],
    pago: "Lleva efectivo: no hay cajero y la terminal no siempre funciona.",
    porTuCuenta: {
      costo: "$200 + chaleco, más $100 por auto",
      tiempo: "Medio día: ~1 h de Valles",
      logistica: "Sin comida ni bebida propia: comes en los restaurantes del parque.",
    },
    horario: "08:00 a 18:00; último acceso por la tarde y sin reingreso",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h", detalle: "~55 km por la federal 70; en Tamasopo, km 2 de la carretera a Agua Buena" },
      { desde: "San Luis Potosí", tiempo: "~3 h", detalle: "Federal 70 rumbo a Ciudad Valles" },
    ],
    camino: "Pavimentado hasta la entrada.",
    pasoAPaso: [
      "Al entrar rentas el chaleco y dejas una identificación.",
      "«La Playita»: tres caídas con un frente poco profundo, la zona para niños.",
      "La «Poza de la espuma» y la «Poza del mecate», donde se salta desde una liana; ahí la profundidad pasa de 8 m.",
      "La profundidad aumenta hacia las caídas: vigila a los niños.",
      "Hay que salir del agua a las 17:00.",
    ],
    edadMinima: "Apto para todas las edades en La Playita",
    saberNadar: "No indispensable con chaleco; sí para las pozas hondas",
    seguridad: [
      "Chaleco obligatorio (se renta ahí; el tuyo no lo dejan pasar).",
      "La Poza del mecate es muy honda: solo para quien nada bien.",
      "En lluvias fuertes Protección Civil deja el parque «solo para ver y tomar fotos» (pasó en julio de 2024).",
    ],
    temporadas: [
      { meses: "Nov–May", agua: "Turquesa", nota: "La mejor época para nadar." },
      { meses: "Jul–Oct", agua: "Puede bajar turbia", nota: "Lluvias: posibles restricciones de Protección Civil." },
    ],
    servicios: [
      "Baños, regaderas y lockers",
      "Restaurantes y tienda",
      "Renta de chalecos y primeros auxilios",
      "Hamacas, puentes colgantes, tirolesa y mirador",
      "Cabañas con reservación",
    ],
    responsable: ["No se entra con comida, bebida, hieleras, asadores ni drones", "Regresa con tu basura"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a las Cascadas de Tamasopo en 2026?", respuesta: "$200 MXN por persona desde el 1 de marzo de 2026; INAPAM $150 y menores de 3 años gratis. Aparte: $100 de estacionamiento por auto y la renta del chaleco ($15 la hora o $60 el día)." },
      { pregunta: "¿Puedo llevar comida o mi propio chaleco?", respuesta: "No. El parque no deja entrar con comida, bebida, hieleras ni chaleco propio: el chaleco se renta en la entrada y adentro hay restaurantes." },
      { pregunta: "¿Es para niños?", respuesta: "Sí: «La Playita» tiene un frente poco profundo. La profundidad aumenta hacia las caídas y la Poza del mecate pasa de 8 m, así que hay que vigilarlos." },
      { pregunta: "¿Hasta qué hora se puede entrar?", respuesta: "El parque abre a las 8:00. El sistema de reservas oficial pone el último acceso a las 15:00 (otra fuente dice 17:00); hay que salir del agua a las 17:00 y no hay reingreso." },
    ],
    fuentes: [
      { nombre: "Cascadas de Tamasopo: sistema de reservas oficial", url: "https://reserva.cascadastamasopo.com/", fecha: "2026-03-01" },
      { nombre: "Top10: Cascadas de Tamasopo, costos, horarios y estacionamiento", url: "https://www.top10.mx/viajes/destinos/huasteca-potosina/cascadas-de-tamasopo-costos-horarios-estacionamiento.html", fecha: "2026-10" },
      { nombre: "El Universal SLP: Cascadas de Tamasopo, costos y horarios", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/cascadas-de-tamasopo-costos-horarios-y-todo-lo-que-debes-saber-para-visitarlo-en-semana-santa/", fecha: "2024-03-26" },
      F.universalRuta,
    ],
  },

  // ─── Cascadas de Micos ───────────────────────────────────────────────────
  "cascadas-de-micos": {
    revisado: REVISADO,
    respuestaRapida:
      "Las Cascadas de Micos son siete saltos de agua turquesa a 30 minutos de Ciudad Valles, el paraje más cercano a la ciudad. La entrada cuesta unos $100 e incluye chaleco y estacionamiento. Puedes nadar en las pozas o hacer el circuito de 7 saltos (de 2 a 8 m) con guía, chaleco y casco, desde los 6 años. Abre de 7:00 a 19:00.",
    costos: [
      { concepto: "Entrada", monto: "~$100 por persona", nota: "Incluye chaleco y estacionamiento." },
      { concepto: "Circuito de saltos con guía", monto: "Paquetes de $750 a más de $1,000", nota: "Precio de operadores; en el sitio varía." },
      { concepto: "Tirolesa, skybike, kayak, lancha", monto: "Se pagan aparte" },
    ],
    porTuCuenta: {
      costo: "~$100 (solo pozas) o $750+ con saltos",
      tiempo: "Medio día: 30 min de Valles",
      logistica: "Contratas el guía de saltos en el lugar.",
    },
    horario: "07:00 a 19:00, todos los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~30 min", detalle: "~24 km por la carretera a El Naranjo (ejido Los Platanitos)" },
      { desde: "Xilitla", tiempo: "~1 h 45 min", detalle: "Vía Ciudad Valles" },
      { desde: "San Luis Potosí", tiempo: "~4 h", detalle: "Federal 70 y Ciudad Valles" },
      { desde: "Monterrey", tiempo: "~7 h 45 min", detalle: "Federal 85" },
      { desde: "Ciudad de México", tiempo: "~6 h 45 min", detalle: "Vía Ciudad Valles" },
    ],
    camino: "Pavimentado. Señal débil: descarga el mapa.",
    transportePublico: "No hay ruta directa confirmada: autobús o colectivo hacia El Platanito y caminar o taxi.",
    pasoAPaso: [
      "En la entrada te dan el chaleco (obligatorio) y hay estacionamiento.",
      "Si solo vas a nadar: las pozas de abajo y la Cascada del Toro (unos 20 m) son para nadar, no para saltar.",
      "El circuito de saltos recorre ~1 km de río en unos 90 minutos; el primer salto, de 5 m, es «la prueba». Una vez que empiezas, solo se sale por las cascadas.",
      "Hay que nadar de poza en poza entre salto y salto.",
    ],
    edadMinima: "Saltos desde 6 años; las pozas, para todos",
    saberNadar: "Para los saltos, sí; en las pozas basta el chaleco",
    accesibilidad: "Las pozas de abajo y la lancha son aptas para familias.",
    seguridad: [
      "Saltos solo con guía, chaleco y casco.",
      "No apto para problemas cardiacos o de columna si vas a saltar.",
      "Protección Civil cierra el paraje con el río crecido (en 2026 reabrió hacia el 15 de octubre).",
    ],
    temporadas: [
      { meses: "Oct–Mar", agua: "Turquesa, buen nivel", nota: "La mejor época, sobre todo tras las lluvias." },
      { meses: "Jun–Oct", agua: "Más turbia", nota: "Lluvias: cierres por creciente." },
      { meses: "Semana Santa y vacaciones", agua: "—", nota: "Mucha gente." },
    ],
    servicios: [
      "Comida regional y palapas",
      "Vestidores rústicos y sanitarios",
      "Camping y cabañas",
      "Venta de zapatos acuáticos y fundas impermeables (no hay dónde guardar maletas)",
    ],
    responsable: ["Llévate tu basura", "Bloqueador biodegradable"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a las Cascadas de Micos?", respuesta: "Unos $100 MXN por persona, con chaleco y estacionamiento incluidos. El circuito de saltos con guía se paga aparte, en paquetes de $750 a más de $1,000." },
      { pregunta: "¿Cuántos saltos hay y de qué altura?", respuesta: "Siete, de 2 a 8 metros, en ~1 km de río; el circuito dura unos 90 minutos y se hace con guía, chaleco y casco." },
      { pregunta: "¿Desde qué edad se puede saltar?", respuesta: "Los operadores lo permiten desde los 6 años. Las pozas de abajo son para todas las edades." },
      { pregunta: "¿Qué horario tiene?", respuesta: "De 7:00 a 19:00, todos los días, salvo cierres de Protección Civil por creciente del río." },
    ],
    fuentes: [
      F.universalTresParaisos,
      F.universalMicosMecoTamul,
      { nombre: "Plano Informativo: reabren parajes de la Huasteca", url: "https://planoinformativo.com/1175982/reabren-parajes-de-la-huasteca-para-recibir-turistas-en-xantolo", fecha: "2026-10-15" },
      { nombre: "Huasteca Secreta: un día de saltos en Micos (consultada)", url: "https://huastecasecreta.com/un-dia-de-saltos-de-cascada-en-micos/", fecha: "2026-11-20" },
      F.osrm,
    ],
  },

  // ─── Cascadas de Minas Viejas ────────────────────────────────────────────
  "cascadas-minas-viejas": {
    revisado: REVISADO,
    respuestaRapida:
      "Minas Viejas son dos caídas de unos 50 metros sobre una poza azul en El Naranjo, a cerca de 1 h 45 min de Ciudad Valles. La entrada cuesta $100 (niños e INAPAM $50) e incluye chaleco y baños. Se bajan unos 200 escalones con barandal y se nada en la poza principal con salvavidas vigilando. Abre de 8:00 a 18:00.",
    costos: [
      { concepto: "Entrada adulto", monto: "$100", nota: "Incluye chaleco y sanitarios." },
      { concepto: "Niños e INAPAM", monto: "$50" },
      { concepto: "Estacionamiento", monto: "~$50 auto · $100 autobús", nota: "Particulares; varía." },
      { concepto: "Rappel", monto: "$600 adulto · $400 niño" },
      { concepto: "Camping", monto: "$200 por casa de campaña + entrada" },
    ],
    porTuCuenta: {
      costo: "$100 + $50 de estacionamiento",
      tiempo: "Día completo: ~1 h 45 min de Valles cada sentido",
      logistica: "Manejas por La Hincada; combina con El Meco el mismo día.",
    },
    horario: "08:00 a 18:00, todos los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h 45 min", detalle: "~70 km por La Hincada hacia El Naranjo" },
      { desde: "El Naranjo", tiempo: "~30–40 min", detalle: "~20 km por el camino a La Hincada y desvío a Minas Viejas" },
      { desde: "San Luis Potosí", tiempo: "~4 h 15 min", detalle: "Vía Ciudad del Maíz" },
      { desde: "Monterrey", tiempo: "~7 h 30 min", detalle: "Federal 85" },
    ],
    transportePublico: "Autobús Valles–El Naranjo; te deja en la carretera a 3.5–5 km (taxi desde El Naranjo $50–$120).",
    pasoAPaso: [
      "Del estacionamiento se bajan unos 200 escalones con barandal (~10 min), con un mirador a medio camino.",
      "Abajo, la poza azul grande frente a las dos caídas: se nada con chaleco y hay salvavidas con silbato.",
      "Hay pozas más abajo y saltos desde rocas en algunos puntos; el agua está fría (~21 °C).",
    ],
    edadMinima: "Apto para niños con chaleco",
    saberNadar: "No indispensable con chaleco",
    seguridad: [
      "Chaleco obligatorio en las pozas; nada donde indiquen los salvavidas.",
      "En lluvias el agua se pone café y Protección Civil puede prohibir acercarse (julio de 2025).",
    ],
    temporadas: [
      { meses: "Nov–Mar", agua: "Azul", nota: "La mejor época; dic–feb, clima templado." },
      { meses: "Sep–Nov", agua: "Azul, caída más llena", nota: "Justo después de las lluvias." },
      { meses: "Jul–Oct", agua: "Turbia", nota: "Lluvias y riesgo de cierre." },
    ],
    servicios: ["Baños y vestidores en la bajada", "Puestos de comida y restaurante campestre", "Palapas, asadores y mesas", "Camping en pasto", "Cabañas cerca"],
    responsable: ["Bloqueador biodegradable", "Llévate tu basura"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a Minas Viejas?", respuesta: "$100 MXN por adulto y $50 para niños y adultos mayores con INAPAM; incluye chaleco y sanitarios. El estacionamiento se paga aparte (unos $50)." },
      { pregunta: "¿Cuántos escalones hay?", respuesta: "Unos 200 escalones con barandal: unos 10 minutos de bajada, con un mirador a medio camino." },
      { pregunta: "¿Cómo llegar a Minas Viejas desde Ciudad Valles?", respuesta: "Son unos 70 km por La Hincada hacia El Naranjo, cerca de 1 h 45 min. Desde el pueblo de El Naranjo son unos 20 km." },
    ],
    fuentes: [
      { nombre: "El Universal SLP: cuánto cuesta la entrada a Minas Viejas", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/cascadas-de-minas-viejas-cuanto-cuesta-la-entrada-a-la-maravilla-de-la-huasteca/", fecha: "2026-06-01" },
      { nombre: "Sally Sees: Cascadas de Minas Viejas", url: "https://sallysees.com/cascadas-de-minas-viejas/", fecha: "2025-10-09" },
      F.universalTresParaisos,
      F.osrm,
    ],
  },

  // ─── Cascada El Meco ─────────────────────────────────────────────────────
  "cascada-el-meco": {
    revisado: REVISADO,
    respuestaRapida:
      "El Meco es una cascada de unos 35 metros que cae todo el año sobre el río, a 10 km de El Naranjo y cerca de 1 h 45 min de Ciudad Valles. El mirador desde la carretera es gratis; la entrada a los parajes cuesta $60–$70 y la panga hasta casi el pie de la caída unos $150. Al pie no se nada: se nada en las pozas de río abajo. Solo efectivo.",
    costos: [
      { concepto: "Mirador desde la carretera", monto: "Gratis" },
      { concepto: "Entrada a los parajes", monto: "$60–$70 adulto · niños ~$50", nota: "Hay varios accesos con precios distintos." },
      { concepto: "Panga a remo hasta la caída", monto: "~$150 por persona", nota: "En algún acceso va incluida en $100. No opera con el río crecido." },
      { concepto: "Rappel o tubing", monto: "~$200–$280" },
    ],
    pago: "Solo efectivo; no hay cajero en la zona.",
    porTuCuenta: {
      costo: "$60–$70 + ~$150 de panga",
      tiempo: "Día completo: ~1 h 45 min de Valles",
      logistica: "Combina con El Salto y Minas Viejas; no hay señal.",
    },
    horario: "~08:00 a 18:00",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~1 h 30 min–1 h 50 min", detalle: "~106 km; desde El Naranjo, ~10 km por la carretera 80 hacia Ciudad del Maíz" },
      { desde: "San Luis Potosí", tiempo: "~3 h 45 min", detalle: "Vía Ciudad del Maíz" },
      { desde: "Monterrey", tiempo: "~6 h 45 min", detalle: "Federal 85" },
    ],
    camino: "Sin señal de celular: descarga el mapa.",
    pasoAPaso: [
      "Desde la carretera hay un mirador natural sobre el cañón, gratis.",
      "En los centros ecoturísticos se toma la panga a remo río arriba hasta unos 10 m de la caída.",
      "Río abajo hay pozas turquesa para nadar; los saltos desde rocas, solo donde indiquen los guías.",
    ],
    saberNadar: "Recomendable para las pozas; los guías dan chaleco",
    seguridad: [
      "Al pie de la cascada la corriente es muy fuerte: ahí no se nada.",
      "La panga no opera con el río crecido.",
    ],
    temporadas: [
      { meses: "Nov–Mar", agua: "Turquesa", nota: "La mejor época; enero, máximas de ~26 °C." },
      { meses: "May–Jun", agua: "Turquesa", nota: "Mucho calor: máximas de hasta 38 °C." },
      { meses: "Jul–Oct", agua: "Más corriente", nota: "Lluvias: la panga puede no salir." },
    ],
    servicios: ["Hotel-restaurante con vista junto al mirador", "Centros ecoturísticos con comida, renta de equipo y guías", "Cabañas y hoteles en El Meco"],
    responsable: ["No dejes basura", "Evita bloqueadores que dañen el agua"],
    faqs: [
      { pregunta: "¿Cuánto cuesta ver la cascada El Meco?", respuesta: "El mirador desde la carretera es gratis. La entrada a los parajes cuesta $60 a $70 por adulto y la panga hasta casi el pie de la caída unos $150 por persona. Solo efectivo." },
      { pregunta: "¿Se puede nadar en El Meco?", respuesta: "Al pie de la cascada no, por la corriente. Se nada en las pozas turquesa de río abajo, siguiendo a los guías." },
      { pregunta: "¿Dónde está El Meco?", respuesta: "A unos 10 km de El Naranjo por la carretera 80 hacia Ciudad del Maíz; desde Ciudad Valles son unos 106 km, cerca de 1 h 45 min." },
    ],
    fuentes: [
      { nombre: "El Universal SLP: cascadas El Meco, cómo llegar y precio", url: "https://sanluis.eluniversal.com.mx/mas-de-san-luis/cascadas-el-meco-como-llegar-y-que-precio-tiene-la-entrada-al-paraje-de-slp/", fecha: "2025-09-11" },
      F.universalMicosMecoTamul,
      { nombre: "Kitti Around the World: las cascadas de El Naranjo", url: "https://kittiaroundtheworld.com/all-you-need-to-know-about-visiting-the-waterfalls-of-el-naranjo-huasteca-potosina-mexico/", fecha: "2025-01-15" },
      F.osrm,
    ],
  },

  // ─── Las Pozas ───────────────────────────────────────────────────────────
  "las-pozas-jardin-surrealista": {
    revisado: REVISADO,
    respuestaRapida:
      `Las Pozas es el jardín surrealista que el poeta inglés Edward James construyó en la selva de Xilitla: esculturas de concreto entre cascadas y pozas. La entrada cuesta $${POZAS_ACCESO.adulto} por adulto más $${POZAS_ACCESO.guiaEspanol} de guía obligatoria, y el recorrido guiado dura una hora y media. Abre de miércoles a lunes (cierra martes). No hay venta en línea: reservas tu turno gratis y pagas en taquilla. No se nada en las pozas.`,
    costos: [
      { concepto: "Adulto", monto: `$${POZAS_ACCESO.adulto}` },
      { concepto: "Niños de 6 a 12 y mayores de 65", monto: `$${POZAS_ACCESO.reducida}` },
      { concepto: "Menores de 6", monto: "Gratis" },
      { concepto: "Guía obligatoria (español)", monto: `$${POZAS_ACCESO.guiaEspanol} por persona` },
    ],
    pago: "Taquilla en efectivo o tarjeta. Reserva tu turno sin costo en boletos.laspozasxilitla.org.mx (hasta 60 días antes).",
    porTuCuenta: {
      costo: `$${POZAS_ACCESO.adulto + POZAS_ACCESO.guiaEspanol} por adulto`,
      tiempo: "~1 h 30 min de Valles y 1.5 h de recorrido",
      logistica: "Reservas turno, llegas 10 min antes (si no, lo pierdes) y el jardín no tiene estacionamiento.",
    },
    horario: `Miércoles a lunes, ${POZAS_ACCESO.abre}–${POZAS_ACCESO.cierra}; último acceso ${POZAS_ACCESO.ultimoAcceso}; cerrado martes`,
    rutas: [
      { desde: "Centro de Xilitla", tiempo: "~10 min", detalle: "~2.6 km en auto o taxi" },
      { desde: "Ciudad Valles", tiempo: "~1 h 30 min", detalle: "~85 km por la federal 85 y la carretera 120" },
      { desde: "San Luis Potosí", tiempo: "~5 h" },
      { desde: "Ciudad de México", tiempo: "~5 h 30 min–7 h", detalle: "Por la Sierra Gorda de Querétaro" },
      { desde: "Monterrey", tiempo: "~8 h 30 min" },
    ],
    camino: "Pavimentado. No manejes a Xilitla de noche: curvas y neblina.",
    transportePublico: "Autobús Ciudad Valles–Xilitla (~2 h) y taxi al jardín.",
    pasoAPaso: [
      "Llega 10 minutos antes de tu turno con la confirmación y una identificación: si llegas tarde, lo pierdes.",
      "Pagas en taquilla y entras con un guía autorizado, en grupos de hasta 25 personas.",
      "El recorrido dura cerca de hora y media, subiendo y bajando escaleras y senderos de ladera entre las esculturas.",
      "No se nada en las pozas ni en el río La Conchita, y solo se entra con agua embotellada.",
    ],
    accesibilidad: "No se recomienda para personas con movilidad reducida: escaleras y senderos de ladera, resbalosos con lluvia.",
    seguridad: ["Los senderos resbalan con lluvia: calzado con suela de agarre.", "No te subas a las esculturas ni a los barandales."],
    temporadas: [
      { meses: "Nov–Mar", agua: "Menos lluvia", nota: "La mejor época para caminar el jardín." },
      { meses: "Junio", agua: "Lluvias", nota: "Florecen las orquídeas; lleva repelente." },
      { meses: "Semana Santa y puentes", agua: "—", nota: "Turnos agotados: reserva con tiempo." },
    ],
    servicios: ["Hospedaje a pasos del jardín y en el centro de Xilitla", "Restaurantes en el pueblo"],
    responsable: ["Sin comida, bebida (solo agua), mascotas, drones, tripiés ni selfie stick", "No toques ni pongas objetos en las esculturas"],
    faqs: [
      { pregunta: "¿Cuánto cuesta entrar a Las Pozas de Xilitla?", respuesta: `$${POZAS_ACCESO.adulto} MXN por adulto y $${POZAS_ACCESO.reducida} para niños de 6 a 12 y mayores de 65; los menores de 6 no pagan. Aparte se paga la guía obligatoria: $${POZAS_ACCESO.guiaEspanol} por persona.` },
      { pregunta: "¿Se compran los boletos en línea?", respuesta: "No. Reservas tu turno sin costo en el sistema oficial (boletos.laspozasxilitla.org.mx, hasta 60 días antes) y pagas en la taquilla el día de tu visita, en efectivo o con tarjeta." },
      { pregunta: "¿Qué días abre Las Pozas?", respuesta: `De miércoles a lunes, de ${POZAS_ACCESO.abre} a ${POZAS_ACCESO.cierra}, con último acceso a las ${POZAS_ACCESO.ultimoAcceso}. Cierra los martes.` },
      { pregunta: "¿Cuánto dura el recorrido?", respuesta: "El recorrido guiado oficial dura cerca de hora y media, en grupos de hasta 25 personas." },
      { pregunta: "¿Se puede nadar en Las Pozas?", respuesta: "No: el reglamento prohíbe nadar en las pozas y en el río La Conchita, entrar en traje de baño y con comida o bebida (solo agua)." },
    ],
    fuentes: [
      { nombre: "Las Pozas Xilitla: sitio oficial", url: "https://laspozasxilitla.org.mx/", fecha: "2026-11-20" },
      { nombre: "Las Pozas Xilitla: reglamento", url: "https://laspozasxilitla.org.mx/reglamento", fecha: "2026-11-20" },
      { nombre: "Posta: visita el jardín surrealista por menos de 200 pesos", url: "https://www.posta.com.mx/share/san-luis-potosi-visita-este-jardin-surrealista-en-la-huasteca-por-menos-de-200-pesos/vl2214996", fecha: "2026-06-11" },
      F.osrm,
    ],
  },

  // ─── Manantial de la Media Luna ──────────────────────────────────────────
  "laguna-media-luna": {
    revisado: REVISADO,
    respuestaRapida:
      "La Media Luna es un manantial de agua tibia (27–30 °C) y cristalina en Rioverde, con hasta 30 metros de visibilidad: el mejor lugar de la región para snorkel y buceo en agua dulce. Desde el 15 de julio de 2026 la entrada cuesta $150 (niños de 3 a 9 y adultos mayores $80), más chaleco obligatorio y estacionamiento. Está a unas 2 horas de Ciudad Valles y de San Luis Potosí. Solo efectivo.",
    costos: [
      { concepto: "Entrada adulto", monto: "$150", nota: "Desde el 15 de julio de 2026 (antes $100)." },
      { concepto: "Niños de 3 a 9 y adultos mayores", monto: "$80" },
      { concepto: "Chaleco (obligatorio)", monto: "$50–$80 de renta" },
      { concepto: "Estacionamiento", monto: "$50" },
      { concepto: "Equipo de snorkel", monto: "Desde $200" },
      { concepto: "Inmersión de buceo guiada", monto: "~$850–$1,000", nota: "Con operadora." },
      { concepto: "Camping", monto: "~$150 por casa de campaña" },
    ],
    pago: "Solo efectivo: no aceptan tarjeta dentro del parque.",
    porTuCuenta: {
      costo: "$150 + chaleco + $50 de estacionamiento (~$270 por persona)",
      tiempo: "Día completo: ~2 h de Valles cada sentido",
      logistica: "Llega antes de las 9:00 para conseguir palapa.",
    },
    horario: "08:00 a 18:00; actividades en el agua hasta las 17:00",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~2 h 10 min", detalle: "~135 km por la federal 70 hasta Rioverde y el ejido El Jabalí" },
      { desde: "San Luis Potosí", tiempo: "~2 h 15 min", detalle: "~136 km por la federal 70" },
      { desde: "Ciudad de México", tiempo: "~7 h", detalle: "~504 km" },
      { desde: "Monterrey", tiempo: "~7 h 15 min", detalle: "~558 km" },
    ],
    camino: "Pavimentado desde la federal 70.",
    transportePublico: "Autobús a Rioverde y taxi (~$200) el último tramo.",
    puntoDeLlegada: { nombre: "Acceso al Parque Estatal Manantial de la Media Luna", lat: 21.8605, lng: -100.0278 },
    pasoAPaso: [
      "En la entrada rentas el chaleco: es obligatorio para todos los que no buceen.",
      "El espejo de agua en forma de media luna y sus canales tienen zonas delimitadas para nadar; en las orillas hay ~1.5 m de fondo.",
      "En el nacimiento principal llega a unos 36 m de profundidad: el buceo, solo con operadora.",
      "Hay palapas, asadores, kayak y balsas; las Grutas de la Catedral se pagan aparte.",
    ],
    edadMinima: "Apta para niños con chaleco",
    saberNadar: "No indispensable: el chaleco es obligatorio",
    seguridad: ["Chaleco obligatorio fuera del buceo.", "No toques el fondo: se levanta el sedimento y se pierde la visibilidad.", "En Semana Santa y puentes cierran el acceso cuando se llena el cupo."],
    temporadas: [
      { meses: "Todo el año", agua: "Tibia, 27–30 °C", nota: "La temperatura del agua no cambia." },
      { meses: "Nov–Mar", agua: "Cristalina", nota: "Menos gente y clima fresco: la mejor época." },
      { meses: "Semana Santa y puentes", agua: "—", nota: "Cupo lleno: llega muy temprano." },
    ],
    servicios: ["Estacionamiento y sanitarios", "Palapas, asadores y cabañas", "Camping vigilado con regaderas", "Renta de chalecos, snorkel, kayak y balsas", "Escuelas de buceo y puestos de comida"],
    responsable: ["Solo bloqueador y repelente biodegradables", "Sin jabón ni shampoo en el manantial", "Sin mascotas, alcohol, vidrio ni bocinas"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a la Media Luna en 2026?", respuesta: "$150 MXN por adulto desde el 15 de julio de 2026, y $80 para niños de 3 a 9 años y adultos mayores. Aparte: el chaleco obligatorio ($50 a $80) y $50 de estacionamiento. Solo efectivo." },
      { pregunta: "¿El agua de la Media Luna es fría?", respuesta: "No: es tibia, de 27 a 30 °C todo el año." },
      { pregunta: "¿Se puede bucear en la Media Luna?", respuesta: "Sí, con operadora: una inmersión guiada cuesta unos $850 a $1,000. La visibilidad llega a 30 metros y el nacimiento principal tiene unos 36 m de fondo." },
      { pregunta: "¿Qué no se puede llevar?", respuesta: "Bloqueador o repelente químicos, jabón, mascotas, alcohol, vidrio y bocinas. La comida, fría o sellada." },
    ],
    fuentes: [
      { nombre: "Pulso SLP: aumentan la cuota de entrada a la Media Luna", url: "https://pulsoslp.com.mx/estado/aumentan-cuota-de-entrada-a-media-luna/2053360", fecha: "2026-06-02" },
      { nombre: "Plano Informativo: cobros en la Media Luna", url: "https://planoinformativo.com/1158449/cobros-excesivos-en-la-media-luna-exponen-a-turistas", fecha: "2026-07-20" },
      { nombre: "Milenio: Media Luna, ubicación y actividades", url: "https://www.milenio.com/estilo/media-luna-rio-verde-san-luis-potosi-ubicacion-actividades", fecha: "2025-04-16" },
      { nombre: "México Desconocido: la Media Luna", url: "https://www.mexicodesconocido.com.mx/la-media-luna-slp.html", fecha: "2025" },
      F.osrm,
    ],
  },

  // ─── Tamtoc ──────────────────────────────────────────────────────────────
  "zona-arqueologica-tamtoc": {
    revisado: REVISADO,
    respuestaRapida:
      "Tamtoc es la zona arqueológica más importante de la cultura huasteca, en Tamuín, a unos 55 minutos de Ciudad Valles. La entrada cuesta $80 para nacionales y $145 para extranjeros; el domingo es gratis para nacionales con identificación. Ojo: la ficha oficial del INAH (enero 2026) dice que por ahora solo abre los domingos, de 9:00 a 18:00. Confírmalo antes de ir. Hay muy poca sombra.",
    costos: [
      { concepto: "Nacionales y residentes", monto: "$80", nota: "Domingo gratis con identificación." },
      { concepto: "Extranjeros", monto: "$145" },
      { concepto: "Menores de 13, estudiantes, maestros, INAPAM y personas con discapacidad", monto: "Gratis" },
      { concepto: "Cámara profesional", monto: "Cuota aparte" },
    ],
    porTuCuenta: {
      costo: "$80 (gratis en domingo para nacionales)",
      tiempo: "Medio día: ~55 min de Valles",
      logistica: "Confirma los días con el INAH antes de manejar.",
    },
    horario: "09:00 a 18:00 (último acceso 17:00); confirma los días",
    rutas: [
      { desde: "Ciudad Valles", tiempo: "~55 min", detalle: "~52 km por la carretera 70 rumbo a Tamuín" },
      { desde: "Xilitla", tiempo: "~1 h 50 min", detalle: "Vía Ciudad Valles" },
      { desde: "Ciudad de México", tiempo: "~6 h 50 min" },
      { desde: "San Luis Potosí", tiempo: "~4 h 40 min" },
    ],
    transportePublico: "El INAH indica que hay transporte público; sin detalle de rutas.",
    puntoDeLlegada: { nombre: "Acceso a la Zona Arqueológica de Tamtoc", lat: 21.9242, lng: -98.8143 },
    pasoAPaso: [
      "En la entrada hay estacionamiento, módulo de información y sanitarios.",
      "No se entra con alimentos ni mascotas.",
      "El recorrido es al sol: lleva sombrero y bastante agua.",
    ],
    accesibilidad: "Terreno plano; el calor es lo más pesado.",
    seguridad: ["Poca sombra: en mayo puede pasar de 45 °C.", "Estuvo cerrada de julio a diciembre de 2024 porque las lluvias dañaron los accesos."],
    temporadas: [
      { meses: "Dic–Feb", agua: "—", nota: "La época más fresca para caminar el sitio." },
      { meses: "Abr–Jun", agua: "—", nota: "Calor extremo: ve temprano." },
    ],
    servicios: ["Estacionamiento", "Módulo de información", "Sanitarios"],
    responsable: ["No subas a las estructuras", "Drones solo con permiso del INAH", "No fumes ni entres con alimentos"],
    faqs: [
      { pregunta: "¿Cuánto cuesta la entrada a Tamtoc?", respuesta: "$80 MXN para nacionales y residentes y $145 para extranjeros. El domingo es gratis para nacionales con identificación, y no pagan menores de 13, estudiantes, maestros, INAPAM ni personas con discapacidad." },
      { pregunta: "¿Qué días abre Tamtoc?", respuesta: "La ficha oficial del INAH (actualizada en enero de 2026) dice que por ahora solo abre los domingos, de 9:00 a 18:00, con último acceso a las 17:00. En 2025 se anunció apertura diaria: confirma con el Centro INAH San Luis Potosí (444 813 4831) antes de ir." },
      { pregunta: "¿Cómo llegar a Tamtoc desde Ciudad Valles?", respuesta: "Son unos 52 km por la carretera 70 rumbo a Tamuín, cerca de 55 minutos." },
    ],
    fuentes: [
      { nombre: "INAH: Zona Arqueológica de Tamtoc", url: "https://www.inah.gob.mx/zonas/115-zona-arqueologica-de-tamtoc", fecha: "2026-01-13" },
      { nombre: "Secretaría de Cultura: el INAH anuncia la reapertura de Tamtoc", url: "https://www.gob.mx/cultura/prensa/el-inah-anuncia-la-reapertura-de-la-zona-arqueologica-de-tamtoc-en-san-luis-potosi?idiom=es-MX", fecha: "2024-12-27" },
      { nombre: "Chilango: precios de zonas arqueológicas 2026", url: "https://www.chilango.com/que-hacer/arte-y-cultura/precios-de-entrada-museos-cdmx-zonas-arqueologicas-del-pais-2026/", fecha: "2026-01-07" },
      F.osrm,
    ],
  },
};

export function guiaDe(slug: string): GuiaDestino | undefined {
  return GUIA_DESTINO[slug];
}

/** «20 de noviembre de 2026» / «November 20, 2026». */
export function fechaLarga(iso: string, en = false): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!m) return String(a);
  const f = new Date(Date.UTC(a, m - 1, d || 1, 12));
  return f.toLocaleDateString(en ? "en-US" : "es-MX", d ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" });
}
