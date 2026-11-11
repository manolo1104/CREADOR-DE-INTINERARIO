import type { ErratasPorArticulo } from "@/lib/erratas/tipos";

/** Fe de erratas del blog, grupo c (11 nov 2026). Ver `src/lib/blogErratas.ts`. */

// Razones que se repiten en varios artículos.
const VALLES_XILITLA =
  "El tramo Ciudad Valles–Xilitla es de hora y media en auto (número confirmado por Manolo, `MINUTOS_VALLES_XILITLA` en tiemposDeViaje.ts); cada artículo daba otro (1 h 23, 1 h 45, 2 h).";
const SIN_AEROPUERTO =
  "Ciudad Valles no tiene vuelos comerciales que el sitio respalde: todo el sitio (infoPractica, ciudadesOrigen, paquetes) da Tampico (TAM) como el aeropuerto más práctico y San Luis Potosí como alternativa.";
const CIFRA_SIN_RESPALDO = "Cifra de visitantes o porcentaje sin ninguna fuente: se quita la cifra y la frase queda bien sin ella.";
const PLANTILLA = "Frase rota de la plantilla (pegaba la palabra clave del artículo como si fuera un tour); se redacta bien.";
const PROMO_VENCIDA =
  "Precio viejo: era el de la promo de temporada baja (−$100), que venció el 29 de octubre (`PROMO_TEMPORADA` en tours.ts). La marca lo toma del catálogo.";
const ALTITUD =
  "La altitud de Xilitla sale distinta en cada artículo (800, 980 y ~1,100 m) y ninguna tiene fuente en el sitio; se quita la cifra hasta confirmarla (lo que suele publicarse es ~600 m).";
const RIO_TAMPAON =
  "Tamul es la cascada que forma el río Gallinas al caer al cañón; el río sobre el que cae y por el que se llega en lancha es el Tampaón (destinos.ts: «accesible remando por el río Tampaón»).";

export const ERRATAS_GRUPO_C: ErratasPorArticulo = {
  "museo-leonora-carrington-leonora-carrington-en-xilitla-guia-para-visit": [
    {
      from: "y el recinto amplió su horario de viernes a domingo hasta las <strong>18:00 h</strong>",
      to: "y el recinto abre de martes a domingo de <strong>11:00 a 17:00 h</strong>",
      porque:
        "Decía que abre hasta las 18:00 de viernes a domingo, pero el mismo artículo da último acceso a las 16:30; el horario del catálogo (destinos.ts, museo-leonora-carrington-xilitla) es martes a domingo de 11:00 a 17:00, último acceso 16:30.",
    },
    {
      from: "enclavado en la Sierra Madre Oriental, a 980 metros de altitud, donde",
      to: "enclavado en la Sierra Madre Oriental, donde",
      porque: ALTITUD,
    },
    {
      from: "cultura totonaca-huasteca",
      to: "cultura huasteca",
      porque: "Los totonacas son de Veracruz, no de la Huasteca Potosina; los pueblos de la región son teenek (huastecos) y nahuas.",
    },
    {
      from: "debido a la alta demanda, con un promedio de <strong>320 visitantes diarios</strong> durante los fines de semana de febrero.",
      to: "debido a la alta demanda.",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "Según operadores locales de la región, el museo Leonora Carrington recibe más de <strong>8,000 visitantes por trimestre</strong> en temporada alta (julio-agosto y diciembre), lo que convierte a Xilitla en uno de los destinos culturales más activos del noreste del país. ",
      to: "",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: ">reserva el tour a museo leonora carrington</a>",
      to: ">reserva un tour por Xilitla</a>",
      porque: PLANTILLA,
    },
    {
      from: "para viajeros que llegan en autobús o avión desde Ciudad de México",
      to: "para viajeros que llegan en autobús o en auto desde Ciudad de México",
      porque: SIN_AEROPUERTO,
    },
    {
      from: "con un tiempo estimado de <strong>1 hora 23 minutos</strong>",
      to: "con un tiempo estimado de <strong>{{vallesXilitla}}</strong>",
      porque: VALLES_XILITLA,
    },
    {
      from: '<a href="https://www.huasteca-potosina.com/tours">tours de museo leonora carrington</a> disponibles con transporte incluido desde Ciudad Valles.',
      to: '<a href="https://www.huasteca-potosina.com/tours">Tours por Xilitla</a> con traslado desde tu hospedaje en Xilitla o Ciudad Valles.',
      porque:
        "Frase rota de la plantilla; además el museo no va en ningún tour (la Ruta Surrealista lo deja libre, como dice la tabla del mismo artículo) y desde Valles el traslado cuesta $400 más por reserva (tours.ts, `cargoValles`).",
    },
    {
      from: "<td>Gasolina ~$180 MXN / 1 h 23 min</td>",
      to: "<td>Gasolina ~$180 MXN / {{vallesXilitla}}</td>",
      porque: VALLES_XILITLA,
    },
    {
      from: "¿Quieres vivir museo leonora carrington con guía experto?",
      to: "¿Quieres conocer Xilitla con guía experto?",
      porque: PLANTILLA,
    },
  ],

  // Congelado: solo la cifra o la palabra equivocada.
  "xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia": [
    {
      from: "entre sierra y rivera del río Tampaón",
      to: "entre sierra y ribera del río Tampaón",
      porque: "Errata: la orilla del río es «ribera», con b.",
    },
    {
      from: "ha crecido más de un <strong>40% entre 2022 y 2025</strong>",
      to: "ha crecido en los últimos años",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "participan activamente más de <strong>80 comparsas distintas</strong>",
      to: "participan activamente <strong>numerosas comparsas</strong>",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "especialmente en municipios de mayor altitud como Xilitla o Tamazunchale.",
      to: "especialmente en municipios de mayor altitud como Xilitla.",
      porque: "Tamazunchale no es de altura: está en el valle del río Moctezuma, tierra caliente y de las zonas más bajas de la Huasteca Potosina.",
    },
    {
      from: "tiene aeropuerto regional, central camionera",
      to: "tiene central camionera",
      porque: SIN_AEROPUERTO,
    },
    {
      from: "está a <strong>45 minutos</strong> de Ciudad Valles por carretera federal",
      to: "está a <strong>~1 h</strong> de Ciudad Valles por carretera federal",
      porque: "El catálogo (destinos.ts, Aquismón — Pueblo Mágico) da ~1 h desde Ciudad Valles (~55 km al sur por la 85).",
    },
    {
      from: "Desde Ciudad de México, Ciudad Valles se alcanza en <strong>5 horas y 30 minutos</strong>",
      to: "Desde Ciudad de México, Ciudad Valles se alcanza en <strong>{{autoValles:cdmx}}</strong>",
      porque: "CDMX–Ciudad Valles en auto son 6.5 a 7 h (tiemposDeViaje.ts, número de Manolo), como dicen «¿Cuánto cuesta la Huasteca?» y el del zacahuil.",
    },
    {
      from: "Desde Ciudad de México son <strong>5 horas 30 minutos</strong> por autopista",
      to: "Desde Ciudad de México son <strong>{{autoValles:cdmx}}</strong> por autopista",
      porque: "CDMX–Ciudad Valles en auto son 6.5 a 7 h (tiemposDeViaje.ts, número de Manolo).",
    },
    {
      from: "Aquismón está a <strong>45 minutos</strong> de Ciudad Valles",
      to: "Aquismón está a <strong>~1 h</strong> de Ciudad Valles",
      porque: "El catálogo (destinos.ts, Aquismón — Pueblo Mágico) da ~1 h desde Ciudad Valles.",
    },
  ],

  "cascadas-de-minas-viejas-guia-completa": [
    {
      from: "<td>Ruta por federal 70 hacia El Naranjo SLP;",
      to: "<td>Ruta por la federal 85 al norte y la 80 hacia El Naranjo SLP;",
      porque: "La federal 70 corre de este a oeste; a El Naranjo se va por la 85 al norte y luego la 80.",
    },
    {
      from: "¿Quieres vivir minas viejas con guía experto?",
      to: "¿Quieres conocer Minas Viejas con guía experto?",
      porque: PLANTILLA,
    },
  ],

  "boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james": [
    {
      from: "<td>1 h 45 min en auto desde Ciudad Valles; el jardín está en Xilitla</td>",
      to: "<td>A {{vallesXilitla}} en auto de Ciudad Valles; el jardín está en Xilitla</td>",
      porque: VALLES_XILITLA,
    },
    {
      from: "recibe más de <strong>8,000 visitantes al mes</strong> durante la temporada alta, lo que hace",
      to: "se llena en temporada alta, lo que hace",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "¿Quieres vivir boletos las pozas con guía experto?",
      to: "¿Quieres conocer Las Pozas con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "la distancia por carretera hasta Xilitla es de aproximadamente <strong>130 kilómetros</strong>, con un tiempo estimado de <strong>2 horas</strong>",
      to: "el trayecto por carretera hasta Xilitla es de <strong>{{vallesXilitla}}</strong>",
      porque: `${VALLES_XILITLA} Los ~130 km no tienen fuente y contradecían la tabla del mismo artículo.`,
    },
  ],

  // Congelado: solo la cifra o la palabra equivocada.
  "equipaje-que-llevar-en-tu-maleta-para-la-selva-potosina-checklist": [
    {
      from: "más del <strong>70%</strong> de los viajeros que llegan",
      to: "buena parte de los viajeros que llegan",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "en lancha compartida cuesta entre <strong>$150 y $250 MXN</strong> por persona",
      to: "en lancha compartida cuesta <strong>$220 MXN</strong> de entrada más <strong>$300 MXN</strong> por persona de panga",
      porque: "Catálogo (destinos.ts, cascada-de-tamul): entrada $220 MXN + $300 MXN de panga por persona, lo mismo que dice «¿Cuánto cuesta la Huasteca?».",
    },
    {
      from: ">Reserva el tour a equipaje</a>",
      to: ">Reserva un tour guiado</a>",
      porque: PLANTILLA,
    },
    {
      from: "<td>Recorrido en río Tamul</td>",
      to: "<td>Recorrido en el río Tampaón</td>",
      porque: RIO_TAMPAON,
    },
    {
      from: "Los traslados en lancha por el río Tamul generan",
      to: "Los traslados en lancha por el río Tampaón generan",
      porque: RIO_TAMPAON,
    },
    {
      from: "rafting en el río Tampáon</a>",
      to: "rafting en el río Tampaón</a>",
      porque: "Errata en el nombre del río: es Tampaón (acento en la segunda a).",
    },
    {
      from: "Las entradas van desde <strong>$30 MXN</strong> (Sótano de las Golondrinas) hasta <strong>$180 MXN</strong> (Las Pozas de Xilitla, más <strong>$30 MXN</strong> de guía obligatoria).",
      to: "Las entradas van desde <strong>$30 MXN</strong> (Nacimiento de Huichihuayán) hasta <strong>$220 MXN</strong> (Cascada de Tamul, más <strong>$300 MXN</strong> de panga).",
      porque:
        "La entrada del Sótano de las Golondrinas es $100 MXN, no $30 (destinos.ts); la de $30 es la del Nacimiento de Huichihuayán. Y la más cara no es Las Pozas ($180) sino Tamul: $220 + $300 de panga (destinos.ts).",
    },
    {
      from: "¿Quieres vivir equipaje con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "Micos cuesta <strong>$80–$100 MXN</strong>",
      to: "Micos cuesta <strong>$100 MXN</strong>",
      porque: "Catálogo (destinos.ts, Cascadas de Micos): entrada $100 MXN.",
    },
    {
      from: "y la lancha a Tamul entre <strong>$150 y $250 MXN</strong>",
      to: "y Tamul <strong>$220 MXN</strong> de entrada más <strong>$300 MXN</strong> por persona de panga (lancha)",
      porque: "Catálogo (destinos.ts, cascada-de-tamul): entrada $220 MXN + $300 MXN de panga por persona.",
    },
  ],

  "comida-tipica-la-historia-detras-del-zacahuil-el-platillo-gi": [
    {
      from: " Según datos de Sectur SLP 2026, el gasto promedio en alimentación de un turista en la región es de <strong>$280 MXN diarios</strong>, lo que convierte a la mesa huasteca en una de las más accesibles de México.",
      to: "",
      porque: "Cifra atribuida a la Sectur SLP sin ninguna fuente que la respalde: se quita la frase.",
    },
    {
      from: ">Reserva el tour a comida típica</a>",
      to: ">Reserva un tour guiado</a>",
      porque: PLANTILLA,
    },
    {
      from: "¿Quieres vivir comida típica con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: PLANTILLA,
    },
  ],

  // Congelado: solo la cifra o la palabra equivocada.
  "la-huasteca-potosina-en-octubre-clima-rios-y-que-esperar": [
    {
      campo: "coverImageAlt",
      from: "cayendo sobre el río Gallinas",
      to: "cayendo sobre el río Tampaón",
      porque: RIO_TAMPAON,
    },
    {
      from: ">Reserva el tour a huasteca potosina en octubre</a>",
      to: ">Reserva un tour en la Huasteca Potosina</a>",
      porque: PLANTILLA,
    },
    {
      from: "habrá condiciones favorables en más del <strong>70 %</strong> de los días",
      to: "habrá condiciones favorables en la mayoría de los días",
      porque: "Porcentaje sin ninguna fuente: se quita la cifra.",
    },
    {
      from: "La cascada de Tamul cayendo con fuerza sobre el río Gallinas",
      to: "La cascada de Tamul cayendo con fuerza sobre el río Tampaón",
      porque: RIO_TAMPAON,
    },
    {
      from: "<strong>105 metros</strong> sobre el Río Gallinas",
      to: "<strong>105 metros</strong> sobre el Río Tampaón",
      porque: RIO_TAMPAON,
    },
    {
      from: "la neblina matutina que se forma sobre el Río Gallinas",
      to: "la neblina matutina que se forma sobre el Río Tampaón",
      porque: RIO_TAMPAON,
    },
    {
      from: "más del <strong>60 %</strong> de los visitantes en octubre",
      to: "muchos de los visitantes en octubre",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "¿Quieres vivir huasteca potosina en octubre con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina en octubre con guía experto?",
      porque: PLANTILLA,
    },
  ],

  "la-huasteca-potosina-en-noviembre-puentes-clima-y-cascadas": [
    {
      campo: "coverImageAlt",
      from: "huasteca potosina en noviembre Cascada Minas Viejas, joya escondida de la Huasteca Potosina Huasteca Potosina 2026",
      to: "Cascadas de Minas Viejas en noviembre, joya escondida de la Huasteca Potosina",
      porque: "Texto roto de plantilla en el alt de la portada («Huasteca Potosina Huasteca Potosina 2026»).",
    },
    {
      from: "<strong>noviembre concentra hasta un 35 % más de visitantes</strong> durante los fines de semana largos en comparación con semanas ordinarias del mismo mes",
      to: "<strong>los fines de semana largos de noviembre llegan muchos más visitantes</strong> que en las semanas ordinarias del mes",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "Todo por <strong>$1,450 MXN por persona</strong>.",
      to: "Todo por <strong>{{tour:expedicion-tamul}} por persona</strong>.",
      porque: PROMO_VENCIDA,
    },
    {
      from: "Los tours guiados arrancan en <strong>$1,300 MXN</strong> (Ruta Surrealista o Descubre el Buceo en la Laguna de la Media Luna) y suben hasta <strong>$1,850 MXN</strong> en el Rafting",
      to: "Los tours guiados que se cobran por persona arrancan en <strong>{{tour:travesia-del-cafe}}</strong> (Travesía del Café o Gruta de Xilo) y suben hasta <strong>{{tour:rafting-rio-tampaon}}</strong> en el Rafting",
      porque:
        "Los más baratos por persona son la Travesía del Café y la Gruta de Xilo ($900, tours.ts); la Ruta Surrealista cuesta $1,400 y el buceo en la Media Luna se retiró del catálogo el 29 oct (`TOURS_RETIRADOS`). El rafting cuesta $1,950 ($1,850 era la promo vencida).",
    },
    {
      from: "los planes de <strong>3 días / 2 noches</strong> tienen tres niveles: Plan Ahorra a <strong>$5,999 MXN</strong>, Plan Básico a <strong>$7,499 MXN</strong> y Plan Todo Incluido a <strong>$8,599 MXN</strong>.",
      to: "el paquete de <strong>3 días / 2 noches</strong> con hotel en Xilitla, Inmersión Huasteca, cuesta <strong>$8,699 MXN por pareja</strong>.",
      porque:
        "Plan Ahorra, Plan Básico y Plan Todo Incluido no existen en el catálogo (paquetes.ts); el de 3 días / 2 noches es Inmersión Huasteca, $8,699 MXN por pareja.",
    },
    {
      from: "y compara qué incluye cada nivel antes de reservar",
      to: "y compara qué incluye cada uno antes de reservar",
      porque: "Los «niveles» eran los planes que ya no existen (ver la corrección de Plan Ahorra/Básico/Todo Incluido).",
    },
    {
      from: " Según los guías locales con quienes operamos, <strong>las cascadas alcanzan entre el 70 y el 85 % de su caudal máximo anual</strong> durante noviembre.",
      to: "",
      porque: "Porcentaje de caudal sin ninguna fuente; la frase anterior ya dice lo mismo sin cifra.",
    },
    {
      from: "en un solo recorrido de jornada completa por <strong>$1,600 MXN por persona</strong>",
      to: "en un solo recorrido de jornada completa por <strong>{{tour:cascadas-del-meco}} por persona</strong>",
      porque: "El tour Cascadas del Meco cuesta $1,700 MXN por persona (tours.ts).",
    },
    {
      from: "en una misma jornada por <strong>$1,500 MXN por persona</strong>",
      to: "en una misma jornada por <strong>{{tour:paraiso-escalonado-minas-micos}} por persona</strong>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "o las Cascadas de Tamasopo por <strong>$1,500 MXN por persona</strong>",
      to: "o las Cascadas de Tamasopo por <strong>{{tour:ruta-acuatica-puente-de-dios}} por persona</strong>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "El tour de <strong>$1,850 MXN por persona</strong> incluye",
      to: "El tour de <strong>{{tour:rafting-rio-tampaon}} por persona</strong> incluye",
      porque: PROMO_VENCIDA,
    },
    {
      from: "Sótano de las Huahuas al atardecer (<strong>$1,450 MXN</strong>)",
      to: "Sótano de las Huahuas al atardecer (<strong>{{tour:expedicion-tamul}}</strong>)",
      porque: PROMO_VENCIDA,
    },
    {
      from: "Cascadas de Minas Viejas y Micos (<strong>$1,500 MXN</strong>)",
      to: "Cascadas de Minas Viejas y Micos (<strong>{{tour:paraiso-escalonado-minas-micos}}</strong>)",
      porque: PROMO_VENCIDA,
    },
    {
      from: "traslado a Xilitla (<strong>~2 h desde Ciudad Valles</strong>)",
      to: "traslado a Xilitla (<strong>{{vallesXilitla}} desde Ciudad Valles</strong>)",
      porque: VALLES_XILITLA,
    },
    {
      from: "la Cueva de las Quilas (<strong>$1,300 MXN</strong>)",
      to: "la Cueva de las Quilas (<strong>{{tour:ruta-surrealista-edward-james}}</strong>)",
      porque: PROMO_VENCIDA,
    },
    {
      from: "Ciudad Valles funciona como la puerta de entrada más práctica: tiene aeropuerto con vuelos desde Ciudad de México, y desde el centro urbano",
      to: "Ciudad Valles funciona como la puerta de entrada más práctica: desde el centro urbano",
      porque: SIN_AEROPUERTO,
    },
    {
      from: "Xilitla se ubica a <strong>~130 km al suroeste</strong> por carretera de curvas serranas.",
      to: "Xilitla queda a <strong>{{vallesXilitla}}</strong> al sur, por carretera de curvas serranas.",
      porque: `${VALLES_XILITLA} Los ~130 km no tienen fuente, y Xilitla está al sur de Valles (casi la misma longitud), no al suroeste.`,
    },
    {
      from: "<td>Expedición Tamul</td><td><strong>$1,450 MXN</strong></td>",
      to: "<td>Expedición Tamul</td><td><strong>{{tour:expedicion-tamul}}</strong></td>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "<td>Rafting Río Tampaón</td><td><strong>$1,850 MXN</strong></td>",
      to: "<td>Rafting Río Tampaón</td><td><strong>{{tour:rafting-rio-tampaon}}</strong></td>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "<td>Paraíso Escalonado</td><td><strong>$1,500 MXN</strong></td>",
      to: "<td>Paraíso Escalonado</td><td><strong>{{tour:paraiso-escalonado-minas-micos}}</strong></td>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "<td>Ruta Surrealista</td><td><strong>$1,300 MXN</strong></td>",
      to: "<td>Ruta Surrealista</td><td><strong>{{tour:ruta-surrealista-edward-james}}</strong></td>",
      porque: PROMO_VENCIDA,
    },
    {
      from: "<td>Cascadas del Meco</td><td><strong>$1,600 MXN</strong></td>",
      to: "<td>Cascadas del Meco</td><td><strong>{{tour:cascadas-del-meco}}</strong></td>",
      porque: "El tour Cascadas del Meco cuesta $1,700 MXN por persona (tours.ts).",
    },
    {
      from: "El Plan Todo Incluido a <strong>$8,599 MXN</strong> puede resultar más económico si ya incluye tours y desayunos.",
      to: "El paquete Inmersión Huasteca, a <strong>$8,699 MXN por pareja</strong>, puede resultar más económico: ya incluye hotel, tours y desayunos.",
      porque: "El Plan Todo Incluido no existe en el catálogo (paquetes.ts); el de 3 días / 2 noches es Inmersión Huasteca, $8,699 MXN por pareja, con hotel, tours y desayuno los días de tour.",
    },
    {
      from: "¿Quieres vivir huasteca potosina en noviembre con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina en noviembre con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "Los tours guiados de un día cuestan entre <strong>$1,300 MXN</strong> (Ruta Surrealista) y <strong>$1,850 MXN</strong> (Rafting en el Río Tampaón) por persona. Los paquetes de 3 días/2 noches van de <strong>$5,999 MXN</strong> (Plan Ahorra) a <strong>$8,599 MXN</strong> (Plan Todo Incluido).",
      to: "Los tours guiados que se cobran por persona cuestan entre <strong>{{tour:travesia-del-cafe}}</strong> (Travesía del Café o Gruta de Xilo) y <strong>{{tour:rafting-rio-tampaon}}</strong> (Rafting en el Río Tampaón). El paquete de 3 días/2 noches con hotel en Xilitla, Inmersión Huasteca, cuesta <strong>$8,699 MXN por pareja</strong>.",
      porque:
        "Precios del catálogo (tours.ts: desde $900 la Travesía del Café y la Gruta de Xilo hasta $1,950 el rafting) y el paquete real de 3 días / 2 noches (paquetes.ts: Inmersión Huasteca, $8,699 por pareja); los «planes» Ahorra y Todo Incluido no existen.",
    },
    {
      from: "con un recorrido total de <strong>~450 km</strong> y <strong>5 a 6 horas</strong> en auto. También hay vuelos directos a Ciudad Valles. Si tu destino final es Xilitla, agrega <strong>~2 horas más</strong> de carretera serrana.",
      to: "con un recorrido de <strong>{{autoValles:cdmx}}</strong> en auto. Si tu destino final es Xilitla, son unas <strong>{{auto:cdmx}}</strong> desde CDMX, con el último tramo de carretera serrana.",
      porque: `tiemposDeViaje.ts (Manolo): CDMX–Valles 6.5 a 7 h y CDMX–Xilitla 7 h (Xilitla queda antes de Valles por esa ruta: no se le suman 2 h). Los ~450 km no tienen fuente. ${SIN_AEROPUERTO}`,
    },
  ],

  "voladores-de-tamaleton-donde-y-cuando-verlos": [
    {
      campo: "coverImageAlt",
      from: "voladores de tamaleton Voladores de Tamaletón, ritual ancestral totonaca declarado Patrimonio de la Humanidad Huasteca Potosina 2026",
      to: "Voladores de Tamaletón descendiendo del palo volador, ritual ancestral teenek en Tancanhuitz, Huasteca Potosina",
      porque: "El alt decía «ritual totonaca» (la danza totonaca es la de Papantla, Veracruz); el artículo y el catálogo (destinos.ts) hablan del ritual teenek de Tamaletón. Además traía texto de plantilla repetido.",
    },
    {
      from: "Según operadores locales que trabajan con la comunidad de <strong>tamaleton tancanhuitz</strong>, el sitio recibe entre <strong>800 y 1,200 visitantes</strong> los fines de semana de diciembre a febrero de <strong>2026</strong>, que es la temporada alta del ritual.",
      to: "La temporada alta del ritual en <strong>tamaleton tancanhuitz</strong> va de diciembre a febrero.",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: "si quieres combinar Tamaletón con el Castillo de la Salud en un mismo día de recorrido",
      to: "si quieres sumar el Castillo de la Salud, Las Pozas y el Nacimiento de Huichihuayán en otro día de tu viaje",
      porque: "La Ruta Surrealista dura de 8 a 10 h y no pasa por Tamaletón (tours.ts): no cabe con Tamaletón en el mismo día.",
    },
    {
      from: "del centro urbano de Tancanhuitz por la brecha hacia San Antonio",
      to: "del centro urbano de Tancanhuitz por el camino hacia San Antonio",
      porque: "El mismo artículo dice que la brecha es solo el último kilómetro; los 3.6 km son el camino de Tancanhuitz hacia San Antonio.",
    },
    {
      from: '<img src="https://www.huasteca-potosina.com/imagenes/castillo-de-la-salud/gallery-1.jpg" alt="danza voladores huasteca guía viaje Huasteca Potosina"',
      to: '<img src="https://www.huasteca-potosina.com/imagenes/voladores-tamaleton/gallery-1.jpg" alt="danza voladores huasteca: voladores con penacho rosa subiendo por el palo volador sobre los tejados de un pueblo"',
      porque: "La foto era del Castillo de la Salud (Axtla) con pie de voladores; se cambia por una foto de voladores de la carpeta del destino (public/imagenes/voladores-tamaleton/gallery-1.jpg).",
    },
    {
      from: "<figcaption>Los voladores de Tamaletón en el Centro Ceremonial de Tancanhuitz, Huasteca Potosina — el ritual teenek",
      to: "<figcaption>Voladores subiendo al palo volador en la Huasteca Potosina — el ritual teenek",
      porque: "La foto nueva es de voladores en un pueblo, no en el Centro Ceremonial: el pie describe lo que se ve.",
    },
    {
      from: "incluye el Castillo de la Salud y es un complemento natural para el mismo día.",
      to: "incluye el Castillo de la Salud y es un complemento natural para otro día del viaje.",
      porque: "La Ruta Surrealista dura de 8 a 10 h y no pasa por Tamaletón (tours.ts): no cabe en el mismo día.",
    },
    {
      from: "¿Quieres vivir voladores de tamaleton con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "más <strong>3.6 km</strong> de terracería hacia el recinto",
      to: "más <strong>3.6 km</strong> hacia San Antonio y <strong>1 km</strong> final de brecha hasta el recinto",
      porque: "El cuerpo del artículo dice que la terracería es solo el último kilómetro; los 3.6 km son el camino de Tancanhuitz hacia San Antonio.",
    },
    {
      from: "Según guías locales que acompañan grupos en la región, más de <strong>4,500 visitantes</strong> presencian el <strong>ritual teenek</strong> en el Centro Ceremonial de Tamaletón durante los tres meses de temporada alta de <strong>2026</strong>, con picos los sábados entre las 10:00 y las 13:00 h.",
      to: "Los sábados entre las 10:00 y las 13:00 h son las horas de más visitantes para presenciar el <strong>ritual teenek</strong> en el Centro Ceremonial de Tamaletón.",
      porque: `${CIFRA_SIN_RESPALDO} (Además no cuadraba con los 800–1,200 por fin de semana del inicio.)`,
    },
  ],

  // Congelado: solo la cifra o la palabra equivocada.
  "mejor-epoca-para-visitar-la-huasteca-potosina": [
    {
      from: "Xilitla, a <strong>800 metros sobre el nivel del mar según el INEGI (2020)</strong>, puede bajar",
      to: "Xilitla, en la sierra, puede bajar",
      porque: ALTITUD,
    },
    {
      from: '<a href="/paquetes">habitaciones del Hotel Paraíso Encantado</a>',
      to: '<a href="https://www.paraisoencantado.com/">habitaciones del Hotel Paraíso Encantado</a>',
      porque: "El texto dice «habitaciones del Hotel Paraíso Encantado» y enlazaba a /paquetes; las habitaciones están en el sitio del hotel (el mismo enlace que usa «¿Cuánto cuesta la Huasteca?»).",
    },
    {
      from: "<figcaption>Hotel Paraíso Encantado, a pasos del Jardín Surrealista de Edward James en Xilitla</figcaption>",
      to: "<figcaption>Bañistas en la poza turquesa al pie de una cascada de la Huasteca Potosina</figcaption>",
      porque: "La foto (estaciones-huasteca/gallery-1.jpg) es una cascada con bañistas, como dice su alt; no es el hotel.",
    },
  ],

  "mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par": [
    {
      from: "la altitud (~<strong>1,100 m</strong>) intensifica",
      to: "la altitud de la sierra intensifica",
      porque: ALTITUD,
    },
    {
      from: "¿Quieres vivir mejor temporada para ir con guía experto?",
      to: "¿Quieres recorrer Xilitla con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "Xilitla se ubica a aproximadamente <strong>450 km</strong> y unas <strong>7 h</strong> en automóvil",
      to: "Xilitla se ubica a unas <strong>{{auto:cdmx}}</strong> en automóvil",
      porque: "Las 7 h son las de tiemposDeViaje.ts (Manolo); los kilómetros CDMX–Xilitla salen distintos en cada artículo (450, 480, 391) y no tienen fuente: se quitan.",
    },
  ],

  "seguridad-xilitla-consejos-de-seguridad-para-viajar-por-carretera-en-l": [
    {
      from: "un trayecto que puede tomar entre <strong>1 hora 45 minutos y 2 horas</strong> dependiendo de las condiciones del camino",
      to: "un trayecto de <strong>{{vallesXilitla}}</strong> que puede alargarse según las condiciones del camino",
      porque: VALLES_XILITLA,
    },
    {
      from: ">Reserva el tour a seguridad xilitla</a>",
      to: ">Reserva un tour con traslado</a>",
      porque: PLANTILLA,
    },
    {
      from: "neblina frecuente en temporada de lluvias (mayo a octubre)",
      to: "neblina frecuente en temporada de lluvias (julio a octubre)",
      porque: "El resto del sitio (mejor época, clima en Xilitla) da lluvias de julio a octubre, con junio de transición; en mayo «aún no llegan» (tabla del clima de Xilitla).",
    },
    {
      from: " Según operadores locales, más de <strong>15,000 vehículos privados</strong> recorren esta ruta entre diciembre y enero.",
      to: "",
      porque: CIFRA_SIN_RESPALDO,
    },
    {
      from: " Según guías locales, el <strong>40%</strong> de los incidentes viales en esta ruta en 2025 se relacionó con llantas en mal estado o frenos con desgaste excesivo.",
      to: "",
      porque: "Estadística de accidentes sin ninguna fuente: se quita la frase.",
    },
    {
      from: "¿Quieres vivir seguridad xilitla con guía experto?",
      to: "¿Quieres recorrer Xilitla con guía experto?",
      porque: PLANTILLA,
    },
    {
      from: "El tiempo estimado es de <strong>1 hora 45 minutos a 2 horas</strong> en condiciones normales.",
      to: "El tiempo estimado es de <strong>{{vallesXilitla}}</strong> en condiciones normales.",
      porque: VALLES_XILITLA,
    },
  ],

  "sotano-de-las-golondrinas-la-cueva-mas-profunda-de-mexico": [
    {
      campo: "coverImageAlt",
      from: "Sótano de las Golondrinas: La Cueva más Profunda de México — Huasteca Potosina",
      to: "Vencejos volando dentro del Sótano de las Golondrinas, abismo rodeado de selva en Aquismón — Huasteca Potosina",
      porque: "No es la cueva más profunda de México (el Sistema Huautla, en Oaxaca, es mucho más profunda); el alt ahora describe la foto: los vencejos dentro del sótano.",
    },
    {
      from: "El abismo natural más profundo de México: datos que debes conocer",
      to: "Uno de los abismos más profundos de México: datos que debes conocer",
      porque: "No es el abismo más profundo de México (el Sótano del Barro, en Querétaro, tiene una caída libre mayor); sí es de los más profundos, como dice el catálogo del de las Huahuas.",
    },
    {
      from: "Es considerado el pozo de pared libre más profundo del mundo.",
      to: "Es considerado uno de los pozos a cielo abierto más grandes del mundo.",
      porque: "No es el más profundo del mundo; lo que se le reconoce es ser de los más grandes. El sitio en inglés ya lo dice así (sobreHuasteca.en.ts).",
    },
    {
      from: "con un trayecto en auto de aproximadamente <strong>1 hora 45 minutos</strong>",
      to: "con un trayecto en auto de aproximadamente <strong>1 hora 15 minutos</strong>",
      porque: "Catálogo (destinos.ts, sotano-de-las-golondrinas): 1 h 15 min desde Valles, lo mismo que la FAQ del artículo.",
    },
    {
      from: ">reserva el tour a sotano de las golondrinas</a>",
      to: ">reserva un tour por la Huasteca Potosina</a>",
      porque: `${PLANTILLA} Además no hay tour al Sótano de las Golondrinas (lo dice el mismo artículo).`,
    },
    {
      from: '<img src="https://www.huasteca-potosina.com/imagenes/sotano-de-las-huahuas/gallery-1.jpg" alt="vencejos golondrinas guía viaje Huasteca Potosina"',
      to: '<img src="https://www.huasteca-potosina.com/imagenes/sotano-de-las-golondrinas/aves-cielo.jpg" alt="vencejos golondrinas volando sobre la selva al salir del Sótano de las Golondrinas, Aquismón"',
      porque: "La foto era del Sótano de las Huahuas con pie de Golondrinas; se cambia por una de vencejos de la carpeta del destino (public/imagenes/sotano-de-las-golondrinas/aves-cielo.jpg).",
    },
    {
      from: "La ruta desde Ciudad Valles tarda <strong>~1 hora 45 minutos</strong>.",
      to: "La ruta desde Ciudad Valles tarda <strong>~1 hora 15 minutos</strong>.",
      porque: "Catálogo (destinos.ts, sotano-de-las-golondrinas): 1 h 15 min desde Valles, lo mismo que la FAQ del artículo.",
    },
    {
      from: "¿Quieres vivir sotano de las golondrinas con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: PLANTILLA,
    },
  ],
};
