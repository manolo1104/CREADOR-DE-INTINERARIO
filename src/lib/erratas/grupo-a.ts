import type { ErratasPorArticulo } from "@/lib/erratas/tipos";

/** Fe de erratas del blog, grupo a (11 nov 2026). Ver `src/lib/blogErratas.ts`. */

const CTA = "Frase rota de la plantilla del CTA (pegaba la palabra clave tal cual, en minúsculas y sin artículo).";
const ENLACE = "Texto de enlace roto de la plantilla («Reserva el tour a <palabra clave>»).";
const VALLES_XILITLA = "El tramo Valles–Xilitla es hora y media en auto (confirmado por Manolo, `MINUTOS_VALLES_XILITLA`); los km que daba no tienen fuente y en otros artículos salen 57, 88, 90, 110 o 120.";

export const ERRATAS_GRUPO_A: ErratasPorArticulo = {
  "hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber": [
    {
      from: `Las Pozas es un jardín escultórico de <strong>32 estructuras de concreto</strong>`,
      to: `Las Pozas es un jardín escultórico de <strong>decenas de estructuras de concreto</strong>`,
      porque: "La cifra no tiene fuente y choca con la guía de Las Pozas («más de ochenta»); las dos parecen salir de las 32 ha / 80 acres del terreno. Sin cifra segura, se quita.",
    },
    {
      from: `integradas en plena selva subtropical a <strong>1,000 metros de altitud</strong>.`,
      to: `integradas en plena selva subtropical.`,
      porque: "Xilitla está a unos 600 m y otros artículos dan 800 o 1,100 m; los 1,000 m no tienen fuente. Se quita la cifra.",
    },
    {
      from: `y es <strong>gratuita para estudiantes</strong> con credencial vigente. El museo abre de <strong>miércoles a domingo de 10:00 a.m. a 6:00 p.m.</strong>, así que`,
      to: `y <strong>$25 MXN</strong> para estudiantes, maestros y adultos mayores con credencial; los menores de 12 años entran gratis. El museo abre de <strong>martes a domingo de 11:00 a.m. a 5:00 p.m.</strong> (último acceso 4:30 p.m.) y cierra los lunes, así que`,
      porque: "Tarifa y horario del Museo Leonora Carrington según `destinos.ts`: estudiantes $25 (no gratis), martes a domingo 11:00–17:00, cerrado lunes. Con eso se arregla también lo de «Las Pozas el lunes y el museo al día siguiente».",
    },
    {
      from: `Leonora Carrington cierra <strong>lunes y martes</strong>`,
      to: `Leonora Carrington cierra los <strong>lunes</strong>`,
      porque: "El museo cierra solo los lunes (`destinos.ts`, museo-leonora-carrington-xilitla); abre los martes.",
    },
    {
      from: `abre hasta las 6:00 p.m. de miércoles a domingo`,
      to: `abre hasta las 5:00 p.m. de martes a domingo`,
      porque: "Horario del museo en `destinos.ts`: martes a domingo, 11:00–17:00.",
    },
    {
      from: `considerablemente: según operadores locales de la región, el jardín puede recibir más de <strong>800 visitantes diarios</strong> en esos periodos frente a los <strong>200–300 habituales</strong> entre semana.`,
      to: `considerablemente.`,
      porque: "Cifras de visitantes sin respaldo (800 al día / 200–300): se quitan.",
    },
    {
      from: `a <strong>120 kilómetros</strong> de Ciudad Valles y a aproximadamente <strong>480 kilómetros</strong> de la Ciudad de México`,
      to: `a <strong>{{vallesXilitla}}</strong> de Ciudad Valles y a unas <strong>{{auto:cdmx}}</strong> en auto de la Ciudad de México`,
      porque: `${VALLES_XILITLA} CDMX–Xilitla: 7 h (\`tiemposDeViaje.ts\`); los 480 km no cuadran con los 450 de «cómo llegar».`,
    },
    {
      from: `<td><strong>6–7 horas</strong></td>`,
      to: `<td><strong>{{auto:cdmx}}</strong></td>`,
      porque: "CDMX–Xilitla en auto son 7 h (`tiemposDeViaje.ts`, número de Manolo); el mismo artículo dice 7 h arriba.",
    },
    {
      from: `25 kilómetros</strong> de Xilitla, con un trayecto de unos <strong>40 minutos</strong> por carretera de montaña.`,
      to: `25 kilómetros</strong> de Xilitla en línea recta, aunque por carretera de montaña el trayecto es más largo.`,
      porque: "25 km es la distancia en línea recta; por carretera hay que bajar a la 85 y subir por San Pedro de las Anonas (Huahuas 75 min y Xilitla 90 min desde Valles, `destinos.ts`), así que «40 minutos» no tiene respaldo. Se quita el tiempo.",
    },
    {
      from: `para ver la salida de los vencejos al atardecer`,
      to: `para ver el regreso de los vencejos al atardecer`,
      porque: "Las aves salen en la mañana y REGRESAN en la tarde (confirmado por Manolo, 10 nov 2026).",
    },
    {
      from: `reserva el tour a qué hacer en Xilitla</a>`,
      to: `reserva un tour por Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `tour de qué hacer en Xilitla</a>`,
      to: `tour por Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `¿Quieres vivir qué hacer en xilitla con guía experto?`,
      to: `¿Quieres recorrer Xilitla con guía experto?`,
      porque: CTA,
    },
  ],

  "sotano-de-las-golondrinas-vs-sotano-de-las-huahuas-cual-visitar": [
    {
      campo: "coverImageAlt",
      from: `sótano de las golondrinas Sótano de las Huahuas, impresionante formación geológica en la Huasteca Huasteca Potosina 2026`,
      to: `Vencejos volando sobre la boca del Sótano de las Huahuas, en Aquismón, Huasteca Potosina`,
      porque: "La portada es el Sótano de las Huahuas (imagenes/sotano-de-las-huahuas/hero.jpg) y el alt le pegaba «sótano de las golondrinas» y repetía «Huasteca Huasteca».",
    },
    {
      from: `es la cueva vertical más profunda del mundo accesible al público, con una caída libre de <strong>512 metros</strong>`,
      to: `es uno de los pozos verticales más grandes del mundo accesibles al público, con una caída libre de <strong>376 metros</strong> (hasta 512 de profundidad total)`,
      porque: "`destinos.ts`: 376 m de caída libre y hasta 512 m de profundidad total (512 no es la caída libre). Y no es «la más profunda del mundo»: el Sótano del Barro (Querétaro) tiene un tiro de 410 m.",
    },
    {
      from: `enclavado en la Sierra Gorda huasteca`,
      to: `enclavado en la Sierra Madre Oriental`,
      porque: "La Sierra Gorda está en Querétaro y Guanajuato; Aquismón está en la Sierra Madre Oriental.",
    },
    {
      from: `millones de vencejos colicortos`,
      to: `miles de vencejos de collar blanco`,
      porque: "Streptoprocne zonaris es el vencejo de collar blanco (el «colicorto» es otra especie), y «millones» no tiene respaldo: el mismo artículo habla de miles de aves.",
    },
    {
      from: `Según operadores locales de la región, más de <strong>8,000 visitantes</strong> llegaron al sótano de las golondrinas solo durante la temporada de julio a septiembre de 2025, lo que convierte a este destino en uno de los más demandados`,
      to: `El sótano de las golondrinas es uno de los destinos más demandados`,
      porque: "Cifra de visitantes sin respaldo (8,000): se quita.",
    },
    {
      from: `guía completa sobre el sótano de las golondrinas como la cueva más profunda de México</a>`,
      to: `guía completa sobre el sótano de las golondrinas</a>`,
      porque: "No es la cueva más profunda de México (el Sistema Huautla, en Oaxaca, es mucho más profundo); se quita el superlativo del texto del enlace.",
    },
    {
      from: `ver tours disponibles en la Huasteca Potosina</a> que incluyan ambos sótanos en un mismo día.`,
      to: `ver tours disponibles en la Huasteca Potosina</a>: la Expedición Tamul termina en el Sótano de las Huahuas.`,
      porque: "Ningún tour nuestro incluye los dos sótanos: el mismo artículo dice que Golondrinas no va en nuestros recorridos y que la Expedición Tamul cierra en Huahuas.",
    },
    {
      from: `A diferencia del sótano de las golondrinas, el Sótano de las Huahuas no tiene una tarifa comunitaria fija publicada. Los guías locales`,
      to: `La entrada al Sótano de las Huahuas cuesta {{entrada:sotano-de-las-huahuas}} por persona; aparte, los guías locales`,
      porque: "Huahuas sí tiene entrada: $60 MXN (`destinos.ts`, sotano-de-las-huahuas).",
    },
    {
      from: `si combinás con las Huahuas`,
      to: `si combinas con las Huahuas`,
      porque: "Errata: «combinás» (voseo).",
    },
    {
      from: `la distancia al sótano de las golondrinas es de <strong>poco más de 50 km</strong> en carretera, con un tiempo de trayecto de aproximadamente <strong>1 hora</strong>`,
      to: `el trayecto al sótano de las golondrinas toma aproximadamente <strong>1 h 15 min</strong>`,
      porque: "`destinos.ts`: 1 h 15 min desde Valles. Los «poco más de 50 km» no cuadran: Aquismón ya está a ~55 km de Valles y el sótano queda más allá.",
    },
    {
      from: `La distancia es de <strong>poco más de 50 km</strong> por carretera federal 85 hacia Aquismón, con un trayecto de aproximadamente <strong>1 hora</strong>.`,
      to: `Se va por la carretera federal 85 hacia Aquismón, con un trayecto de aproximadamente <strong>1 h 15 min</strong>.`,
      porque: "`destinos.ts`: 1 h 15 min desde Valles; los km no tienen fuente (Aquismón ya está a ~55 km).",
    },
    {
      from: `<td>~1 hora / costo de gasolina</td>`,
      to: `<td>~1 h 15 min / costo de gasolina</td>`,
      porque: "`destinos.ts`: 1 h 15 min desde Valles.",
    },
    {
      from: `¿Quieres vivir sótano de las golondrinas con guía experto?`,
      to: `¿Quieres recorrer la Huasteca Potosina con guía experto?`,
      porque: `${CTA} Además, Golondrinas no va en nuestros recorridos.`,
    },
  ],

  "xilitla-en-pareja-escapada-romantica-planes-para-parejas-en-la-huastec": [
    {
      from: `gastronomía de montaña a más de 800 metros sobre el nivel del mar en la Sierra Madre Oriental`,
      to: `gastronomía de montaña en la Sierra Madre Oriental`,
      porque: "Altitud sin fuente segura (Xilitla está a unos 600 m; otros artículos dan 800, 1,000 o 1,100). Se quita la cifra.",
    },
    {
      from: `el acceso implica una caminata de aproximadamente <strong>45 minutos</strong> por selva media y`,
      to: `está a unos 50 metros de la entrada de Las Pozas y`,
      porque: "`destinos.ts` (cascada-los-comales): está a ~50 m de la entrada de Las Pozas; no hay caminata de 45 min.",
    },
    {
      from: `como el zacahuil y el bocoles`,
      to: `como el zacahuil y los bocoles`,
      porque: "Errata de concordancia («el bocoles»).",
    },
    {
      from: `Los meses de <strong>octubre, noviembre y febrero</strong> ofrecen`,
      to: `Los meses de <strong>noviembre, diciembre y febrero</strong> ofrecen`,
      porque: "Octubre es de los meses de lluvia más intensa (artículo del clima de Xilitla; la guía definitiva dice evitar septiembre–octubre) y la temporada ideal de Xilitla es noviembre–marzo (`destinos.ts`).",
    },
    {
      from: `Los meses de <strong>octubre, noviembre, febrero y marzo</strong> son ideales`,
      to: `Los meses de <strong>noviembre, diciembre, febrero y marzo</strong> son ideales`,
      porque: "Octubre es de lluvias intensas; la temporada ideal de Xilitla es noviembre–marzo (`destinos.ts`, artículo del clima).",
    },
    {
      from: `a <strong>391 km de Ciudad de México</strong>, <strong>280 km de Monterrey</strong> y <strong>190 km de San Luis Potosí capital</strong>`,
      to: `a unas <strong>{{auto:cdmx}} en auto de la Ciudad de México</strong>, <strong>{{auto:monterrey}} de Monterrey</strong> y <strong>{{auto:san-luis-potosi}} de San Luis Potosí capital</strong>`,
      porque: "Km sin fuente y que chocan con los demás artículos (Monterrey a 280 km es imposible). Se dan los tiempos en auto de `tiemposDeViaje.ts` (números de Manolo): 7 h, ~7 h y 5 h.",
    },
    {
      from: `sigue la carretera federal <strong>México-Tampico (MEX-85)</strong> hasta Ciudad Valles y de ahí la carretera estatal hacia Xilitla: el tiempo total es de aproximadamente <strong>5 horas y 30 minutos</strong> con buen tráfico`,
      to: `sigue la carretera federal <strong>México-Laredo (MEX-85)</strong> por Pachuca y Tamazunchale hasta el desvío de la carretera federal 120, que sube a Xilitla: el tiempo total es de unas <strong>{{auto:cdmx}}</strong> con buen tráfico`,
      porque: "La MEX-85 es la México–Laredo (no la México–Tampico); viniendo de CDMX el desvío a Xilitla (la 120, federal) está antes de Ciudad Valles. CDMX–Xilitla son 7 h (`tiemposDeViaje.ts`), no 5 h 30.",
    },
    {
      from: `toma alrededor de <strong>4 horas y 20 minutos</strong>`,
      to: `toma <strong>{{auto:monterrey}}</strong>`,
      porque: "Monterrey–Xilitla son ~7 h (`tiemposDeViaje.ts`), no 4 h 20.",
    },
    {
      from: `por trayecto / 5h 30min</td>`,
      to: `por trayecto / {{auto:cdmx}}</td>`,
      porque: "CDMX–Xilitla en auto: 7 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `por persona ida / 6–7h total</td>`,
      to: `por persona ida / 9 a 10 h total</td>`,
      porque: "En autobús CDMX–Xilitla son 9 a 10 h (`tiemposDeViaje.ts`, busXilitla); 6–7 h es menos que en auto.",
    },
    {
      from: `Desde CDMX el viaje toma <strong>aproximadamente 5 horas y media</strong>.`,
      to: `Desde CDMX el viaje toma <strong>unas {{auto:cdmx}}</strong> en auto.`,
      porque: "CDMX–Xilitla: 7 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `Reserva el tour a xilitla en pareja</a>`,
      to: `Reserva un tour a Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `¿Quieres vivir xilitla en pareja con guía experto?`,
      to: `¿Quieres vivir Xilitla en pareja con guía experto?`,
      porque: CTA,
    },
  ],

  "las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece": [
    {
      from: `donde más de ochenta estructuras de concreto conviven`,
      to: `donde decenas de estructuras de concreto conviven`,
      porque: "Cifra sin fuente que choca con la guía definitiva («32 estructuras»); las dos parecen salir de las 32 ha / 80 acres del terreno. Se quita.",
    },
    {
      from: `En Xilitla, San Luis Potosí: 1 h 45 min en auto desde Ciudad Valles`,
      to: `En Xilitla, San Luis Potosí: {{vallesXilitla}} en auto desde Ciudad Valles`,
      porque: VALLES_XILITLA,
    },
    {
      from: `<strong>Xilitla queda a 90 km</strong>, un recorrido de aproximadamente <strong>una hora y media</strong> por carretera`,
      to: `<strong>Xilitla queda a {{vallesXilitla}}</strong> por carretera`,
      porque: VALLES_XILITLA,
    },
    {
      from: `La ruta más utilizada es la federal 120 hacia Tamazunchale, tomando el desvío hacia Xilitla.`,
      to: `La ruta más utilizada es la federal 85 hacia Tamazunchale, tomando el desvío de la carretera 120 hacia Xilitla.`,
      porque: "La que va de Valles a Tamazunchale es la 85; la 120 es el desvío que sube a Xilitla (`destinos.ts`, xilitla-pueblo-magico: «Carretera 85 sur → desvío Carr. 120»).",
    },
    {
      from: `Ciudad Valles está a 90 km de Xilitla, aproximadamente 1 hora y media por carretera.`,
      to: `Ciudad Valles está a {{vallesXilitla}} de Xilitla por carretera.`,
      porque: VALLES_XILITLA,
    },
    {
      from: `¿Quieres vivir las pozas xilitla con guía experto?`,
      to: `¿Quieres conocer Las Pozas con guía experto?`,
      porque: CTA,
    },
  ],

  "historia-de-xilitla-mitos-y-leyendas-de-xilitla-el-misticismo-de-la-hu": [
    {
      campo: "coverImageAlt",
      from: `Escultura surrealista de Leonora Carrington en Xilitla, evocando`,
      to: `Pintura surrealista de Leonora Carrington, evocando`,
      porque: "La portada (imagenes/blog/mitos-xilitla/hero.jpg) es una pintura, no una escultura en Xilitla.",
    },
    {
      from: `Según operadores locales de la región, <strong>más de 15,000 visitantes</strong> recorren Xilitla entre los meses de noviembre y marzo, la temporada alta, cuando`,
      to: `La temporada alta en Xilitla va de noviembre a marzo, cuando`,
      porque: "Cifra de visitantes sin respaldo (15,000): se quita.",
    },
    {
      from: `arquitectura colonial del siglo XVII crea`,
      to: `arquitectura colonial del siglo XVI crea`,
      porque: "El convento agustino de Xilitla (San Agustín) es del siglo XVI (hacia 1550–1557), no del XVII.",
    },
    {
      from: `Parroquia de San Agustín —construida en el siglo XVII sobre`,
      to: `Parroquia de San Agustín —construida en el siglo XVI sobre`,
      porque: "El convento agustino de Xilitla es del siglo XVI (hacia 1550–1557).",
    },
    {
      from: `reserva el tour a historia de xilitla</a>`,
      to: `reserva un tour por Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `el Castillo de la Salud, uno de los edificios más emblemáticos`,
      to: `el exconvento de San Agustín, uno de los edificios más emblemáticos`,
      porque: "La foto (imagenes/blog/mitos-xilitla/imagen-2.jpg) es el exconvento agustino del centro de Xilitla (campanario y reloj); el Castillo de la Salud está en Axtla.",
    },
    {
      from: ` Según guías locales, <strong>al menos 8 sitios</strong> dentro del perímetro urbano tienen un relato mítico asociado documentado hasta 2026.`,
      to: ``,
      porque: "Cifra sin respaldo («al menos 8 sitios»): se quita la frase.",
    },
    {
      from: `la distancia es de <strong>88 kilómetros</strong>.`,
      to: `el trayecto es de <strong>{{vallesXilitla}}</strong>.`,
      porque: VALLES_XILITLA,
    },
    {
      from: `La distancia desde Ciudad Valles a Xilitla es de <strong>88 kilómetros</strong> por carretera, un trayecto de aproximadamente <strong>2 horas</strong> según las condiciones viales.`,
      to: `El trayecto por carretera desde Ciudad Valles a Xilitla es de aproximadamente <strong>{{vallesXilitla}}</strong>, según las condiciones viales.`,
      porque: VALLES_XILITLA,
    },
    {
      from: `¿Quieres vivir historia de xilitla con guía experto?`,
      to: `¿Quieres recorrer Xilitla con guía experto?`,
      porque: CTA,
    },
  ],

  "xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando": [
    {
      from: `en Cascadas de Micos — actividades para niños en Xilitla`,
      to: `en Cascadas de Micos, cerca de Ciudad Valles`,
      porque: "La foto (bici aérea) es de las Cascadas de Micos, que están en Ciudad Valles, no en Xilitla. Se corrigen el alt y el pie.",
    },
    {
      from: `Reserva el tour a xilitla con niños</a>`,
      to: `Reserva un tour a Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `¿Quieres vivir xilitla con niños con guía experto?`,
      to: `¿Quieres recorrer Xilitla en familia con guía experto?`,
      porque: CTA,
    },
  ],

  "huasteca-potosina-con-ninos-la-ruta-familiar-perfecta": [
    {
      from: `entrada de <strong>$50 pesos</strong> con pozas`,
      to: `entrada de <strong>{{entrada:cascadas-de-tamasopo}}</strong> con pozas`,
      porque: "Entrada de las Cascadas de Tamasopo: $60 MXN (`destinos.ts`).",
    },
    {
      from: `Puente de Dios, a solo <strong>$40 pesos</strong>,`,
      to: `Puente de Dios, a <strong>{{entrada:puente-de-dios-tamasopo}}</strong>,`,
      porque: "Entrada del Puente de Dios: $150 MXN (`destinos.ts`), no $40.",
    },
    {
      from: `pero Puente de Dios ($40 pesos) y Tamasopo ($50 pesos) son las entradas más accesibles`,
      to: `pero el Nacimiento de Tambaque ({{entrada:nacimiento-tambaque}}) y el de Huichihuayán ({{entrada:nacimiento-huichihuayan}}) son de las entradas más accesibles`,
      porque: "Puente de Dios cuesta $150 y Tamasopo $60 (`destinos.ts`), así que ya no son las más baratas; las más baratas del catálogo son Tambaque ($10) y Huichihuayán ($30).",
    },
    {
      from: `<strong>$150 pesos por persona desde 1 año de edad</strong>`,
      to: `<strong>{{entrada:cascada-de-tamul}} desde 1 año de edad</strong>`,
      porque: "Tamul: $220 MXN de entrada más $300 MXN de panga por persona (`destinos.ts`), no $150.",
    },
    {
      from: `<strong>todos los días de 7:00 a 16:00 horas</strong>`,
      to: `<strong>todos los días de 8:00 a 17:00 horas</strong>`,
      porque: "Horario de Tamul en `destinos.ts`: 08:00–17:00.",
    },
    {
      from: `¿Quieres vivir huasteca potosina con niños con guía experto?`,
      to: `¿Quieres recorrer la Huasteca Potosina en familia con guía experto?`,
      porque: CTA,
    },
  ],

  "cascada-los-comales-mas-alla-del-castillo-3-cascadas-secretas-cerca-de": [
    {
      from: `Este artículo reúne las <strong>3 cascadas menos conocidas</strong> cercanas a Xilitla`,
      to: `Este artículo reúne las <strong>cascadas menos conocidas</strong> cercanas a Xilitla`,
      porque: "El artículo describe dos lugares (Los Comales y Los Tepales), no tres. El título no se toca (regla), queda anotado para Manolo.",
    },
    {
      from: `en 2026 el número de visitantes que combina Las Pozas con al menos una cascada adicional creció un <strong>28 %</strong> respecto al año anterior`,
      to: `cada vez más visitantes combinan Las Pozas con al menos una cascada adicional`,
      porque: "Cifra sin respaldo (28 %): se quita.",
    },
    {
      from: `se ubica a pocos minutos caminando desde el centro de Xilitla y comparte zona con el famoso Jardín Surrealista`,
      to: `se ubica a unos 50 metros de la entrada del famoso Jardín Surrealista`,
      porque: "`destinos.ts` (cascada-los-comales): está a ~50 m de la entrada de Las Pozas, que queda a las afueras del pueblo, no en el centro.",
    },
    {
      from: `Reserva el tour a cascada los comales</a>`,
      to: `Reserva un tour a Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `alt="turismo naturaleza guía viaje Huasteca Potosina"`,
      to: `alt="Estructura de concreto de Edward James frente a una cascada en Las Pozas, Xilitla"`,
      porque: "La foto (imagenes/blog/cascadas-secretas/imagen-2.jpg) es una estructura de Las Pozas frente a su cascada, no Los Comales.",
    },
    {
      from: `<figcaption>Cascada los comales y la vegetación exuberante que caracteriza`,
      to: `<figcaption>Una poza del Jardín Surrealista de Edward James, vecino de la cascada los comales, y la vegetación exuberante que caracteriza`,
      porque: "La foto es de Las Pozas (estructura de concreto frente a la cascada del jardín), no de Los Comales.",
    },
    {
      from: `La distancia hasta Xilitla es de aproximadamente <strong>88 km</strong> recorridos en <strong>1 hora 30 minutos</strong> en automóvil tomando la <strong>Carretera Federal 85</strong> y desviándose por la <strong>Carretera Estatal 120</strong>.`,
      to: `El trayecto hasta Xilitla es de <strong>{{vallesXilitla}}</strong> en automóvil tomando la <strong>Carretera Federal 85</strong> y desviándose por la <strong>Carretera Federal 120</strong>.`,
      porque: `${VALLES_XILITLA} La 120 es federal (\`destinos.ts\`, cueva-del-salitre).`,
    },
    {
      from: `el estacionamiento frente al jardín sirve de punto de partida.`,
      to: `la entrada del jardín sirve de punto de partida (el camino no tiene estacionamiento).`,
      porque: "Las Pozas no tiene estacionamiento (`destinos.ts`, xilitla-pueblo-magico, y la guía de Las Pozas).",
    },
    {
      from: `Según guías locales, más de <strong>9,000 visitantes</strong> recorren esta ruta durante el puente de noviembre, por lo que`,
      to: `La ruta se llena en el puente de noviembre, por lo que`,
      porque: "Cifra de visitantes sin respaldo (9,000): se quita.",
    },
    {
      from: `La distancia es de <strong>88 km</strong> por la <strong>Carretera Federal 85</strong> hasta el desvío en la <strong>Carretera Estatal 120</strong>, con un tiempo de viaje de aproximadamente <strong>1 hora 30 minutos</strong> en automóvil.`,
      to: `Se va por la <strong>Carretera Federal 85</strong> hasta el desvío en la <strong>Carretera Federal 120</strong>, con un tiempo de viaje de aproximadamente <strong>{{vallesXilitla}}</strong> en automóvil.`,
      porque: `${VALLES_XILITLA} La 120 es federal.`,
    },
    {
      from: `Actualmente el baño no está permitido en la zona de la cascada los comales. Las restricciones se implementaron para preservar el ecosistema y la seguridad de los visitantes. La visita se orienta a la contemplación y la fotografía desde los senderos habilitados en 2026.`,
      to: `Sí: la cascada los comales forma pozas de aguas semicálidas aptas para nadar. Lleva calzado antiderrapante, porque las rocas son resbalosas.`,
      porque: "`destinos.ts` (cascada-los-comales): «Sí, forma pozas de aguas semicálidas aptas para nadar»; la prohibición de nadar es de Las Pozas, no de Los Comales.",
    },
    {
      from: `¿Quieres vivir cascada los comales con guía experto?`,
      to: `¿Quieres recorrer Xilitla con guía experto?`,
      porque: CTA,
    },
  ],

  "altura-la-tradicion-del-cafe-en-xilitla-de-la-planta-a-tu-taza": [
    {
      from: `la Garnica es una variedad criolla adaptada al microclima local`,
      to: `la Garnica es un híbrido mexicano desarrollado por el INMECAFE, adaptado al microclima local`,
      porque: "La Garnica no es criolla: es un híbrido creado por el INMECAFE (Instituto Mexicano del Café).",
    },
    {
      from: ` Según operadores de la región, la Huasteca Potosina recibe más de <strong>12,000 visitantes mensuales durante la temporada alta de verano</strong> en 2026, y Xilitla concentra una porción creciente de ese flujo gracias al turismo cafetalero.`,
      to: ``,
      porque: "Cifra de visitantes sin respaldo (12,000 al mes): se quita la frase.",
    },
    {
      from: `la ruta más directa sigue la carretera federal <strong>85D</strong> hasta Ciudad Valles y luego la carretera estatal hacia Xilitla, cubriendo aproximadamente <strong>480 km en 5.5 a 6 horas</strong> en condiciones normales`,
      to: `la ruta más directa sigue la carretera federal <strong>85</strong> por Pachuca y Tamazunchale hasta el desvío de la carretera federal 120, que sube a Xilitla, en unas <strong>{{auto:cdmx}}</strong> en condiciones normales`,
      porque: "CDMX–Xilitla son 7 h (`tiemposDeViaje.ts`), no 5.5–6; viniendo por la 85 el desvío a Xilitla está antes de Valles; los 480 km chocan con los 450 de «cómo llegar» y se quitan.",
    },
    {
      from: `la distancia es similar —alrededor de <strong>470 km</strong>— tomando la autopista Monterrey-Saltillo-Matehuala-Ciudad Valles, con un tiempo estimado de <strong>6 a 7 horas</strong>`,
      to: `la ruta baja por Ciudad Victoria y Ciudad Valles, con un tiempo estimado de <strong>{{auto:monterrey}}</strong>`,
      porque: "Por Matehuala no se llega a Valles: de Monterrey se baja por Ciudad Victoria y Mante (guía definitiva y «cómo llegar»). Tiempo de `tiemposDeViaje.ts` (~7 h); km sin fuente.",
    },
    {
      from: `son aproximadamente <strong>290 km y 3.5 horas</strong> por la carretera 70 hacia Ciudad Valles y de ahí hacia Xilitla`,
      to: `son unas <strong>{{auto:san-luis-potosi}}</strong> por Rioverde y Jalpan: esa ruta no pasa por Ciudad Valles`,
      porque: "SLP–Xilitla son 5 h por Rioverde y Jalpan, sin pasar por Valles (`tiemposDeViaje.ts`, número de Manolo).",
    },
    {
      from: `<th>Distancia / Tiempo estimado</th>`,
      to: `<th>Tiempo estimado en auto</th>`,
      porque: "Se quitan los km sin fuente de la tabla; queda el tiempo.",
    },
    {
      from: `<strong>480 km / 5.5–6 h</strong>`,
      to: `<strong>{{auto:cdmx}}</strong>`,
      porque: "CDMX–Xilitla: 7 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `Carretera 85D hasta Ciudad Valles, luego federal a Xilitla`,
      to: `Carretera 85 por Pachuca y Tamazunchale, luego la federal 120 a Xilitla`,
      porque: "Viniendo de CDMX por la 85, el desvío a Xilitla (la 120) está antes de Ciudad Valles.",
    },
    {
      from: `<strong>470 km / 6–7 h</strong>`,
      to: `<strong>{{auto:monterrey}}</strong>`,
      porque: "Monterrey–Xilitla: ~7 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `Autopista Monterrey-Matehuala-Ciudad Valles-Xilitla`,
      to: `Por Ciudad Victoria y Ciudad Valles hasta Xilitla`,
      porque: "La ruta de Monterrey baja por Ciudad Victoria, no por Matehuala.",
    },
    {
      from: `<strong>290 km / 3.5 h</strong>`,
      to: `<strong>{{auto:san-luis-potosi}}</strong>`,
      porque: "SLP–Xilitla: 5 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `Carretera 70 hasta Ciudad Valles y estatal a Xilitla`,
      to: `Por Rioverde y Jalpan; no pasa por Ciudad Valles`,
      porque: "Las 5 h de SLP son por Rioverde y Jalpan (`tiemposDeViaje.ts`).",
    },
    {
      from: `¿Quieres vivir café de altura con guía experto?`,
      to: `¿Quieres conocer el café de altura con guía experto?`,
      porque: CTA,
    },
  ],

  "cascada-el-salto-y-el-aguacate-guia": [
    {
      campo: "coverImageAlt",
      from: `cascada el salto Cascada El Aguacate con aguas cristalinas rodeada de selva verde Huasteca Potosina 2026`,
      to: `Cascada El Aguacate con aguas cristalinas rodeada de selva verde, en Tamasopo, Huasteca Potosina`,
      porque: "La portada (imagenes/cascada-el-aguacate/hero.jpg) es El Aguacate y el alt le pegaba «cascada el salto».",
    },
    {
      from: ` Según operadores locales de la región, el tramo que conecta cascada El Salto con cascada El Aguacate recibe más de <strong>8,000 visitantes en los meses de temporada alta</strong> (septiembre–octubre de 2026), lo que hace indispensable llegar temprano y planificar bien cada parada.`,
      to: ` En temporada alta (septiembre–octubre) es indispensable llegar temprano y planificar bien cada parada.`,
      porque: "Cifra de visitantes sin respaldo (8,000), y no hay un «tramo que conecta» las dos: están en municipios distintos (`destinos.ts`).",
    },
    {
      from: ` hasta el cañón del río Guayalejo,`,
      to: ``,
      porque: "El Guayalejo es un río de Tamaulipas; El Salto está en El Naranjo, SLP.",
    },
    {
      from: `$1,600 MXN`,
      to: `{{tour:cascadas-del-meco}}`,
      porque: "Precio del tour Cascadas del Meco en `tours.ts`: $1,700 MXN por persona.",
    },
    {
      from: `La cascada El Aguacate se encuentra a menos de <strong>15 minutos en vehículo</strong> de cascada El Salto, siguiendo la misma carretera que conecta El Naranjo con Ciudad del Maíz.`,
      to: `La cascada El Aguacate está en el municipio de Tamasopo, a unos 3 km al norte del pueblo y a <strong>75 minutos</strong> de Ciudad Valles por la autopista a San Luis Potosí.`,
      porque: "`destinos.ts` (cascada-el-aguacate): zona Tamasopo, «75 min desde Valles · Autopista a SLP → Tamasopo → Ejido El Aguacate (~3 km al norte del pueblo)». No está junto a El Salto (El Naranjo).",
    },
    {
      from: `<strong>$30 MXN por persona</strong> y el sitio abre de <strong>08:00 a 17:00</strong>`,
      to: `<strong>{{entrada:cascada-el-aguacate}} por persona</strong> y el sitio abre de <strong>09:00 a 17:00</strong>`,
      porque: "`destinos.ts`: entrada $50 MXN y horario 09:00–17:00.",
    },
    {
      from: `Combinar cascada El Aguacate con cascada El Salto en un solo día es factible si sales de Ciudad Valles antes de las <strong>08:00</strong>, lo que te deja margen para disfrutar ambas pozas y regresar antes del cierre a las <strong>17:30</strong>.`,
      to: `Combinar cascada El Aguacate con cascada El Salto en un solo día es una jornada larga, porque están en municipios distintos: sal de Ciudad Valles antes de las <strong>08:00</strong> y llega a El Aguacate antes de su cierre, a las <strong>17:00</strong>.`,
      porque: "Están en municipios distintos (El Salto en El Naranjo, El Aguacate en Tamasopo) y El Aguacate cierra a las 17:00, no a las 17:30 (`destinos.ts`).",
    },
    {
      from: `Los tours organizados que combinan la Cascada del Meco y cascada el salto tienen un precio de <strong>$1,350 MXN</strong> por persona, con un descuento del <strong>20%</strong> para niños de <strong>3 a 8 años</strong>.`,
      to: `Nuestro tour Cascadas del Meco, que combina la Cascada del Meco y cascada el salto, cuesta <strong>{{tour:cascadas-del-meco}}</strong> por persona; los niños de 6 a 10 años pagan el 70 % y los menores de 6, el 50 %.`,
      porque: "Era el mismo tour con otro precio: el Cascadas del Meco cuesta $1,700 (`tours.ts`) y la escala de menores es 70 % (6–10 años) y 50 % (menores de 6) (`paquetePricing.ts`, `faqTours.ts`).",
    },
    {
      from: `\n    <tr>\n      <td>Tour organizado combinado (Meco + El Salto)</td>\n      <td><strong>$1,350 MXN</strong> por persona</td>\n      <td>20% descuento niños 3–8 años; solo efectivo; salida desde Ciudad Valles</td>\n    </tr>`,
      to: ``,
      porque: "Fila duplicada: el «tour combinado Meco + El Salto» es el tour Cascadas del Meco de la fila de arriba, con otro precio ($1,350 vs $1,700 en `tours.ts`) y otra escala de niños.",
    },
    {
      from: `salir a las <strong>07:00</strong> te permite llegar a la apertura de las <strong>08:00</strong>`,
      to: `salir a las <strong>06:00</strong> te permite llegar a la apertura de las <strong>08:00</strong>`,
      porque: "Con 110 minutos de camino (`destinos.ts`), saliendo a las 07:00 se llega cerca de las 08:50, no a la apertura.",
    },
    {
      from: `<p>Según operadores locales de la región, <strong>más de 8,000 visitantes recorren las cascadas el naranjo slp en los meses de septiembre y octubre de 2026</strong>, lo que las consolida como uno de los destinos de agua dulce más visitados del norte de San Luis Potosí. Si tu itinerario`,
      to: `<p>Si tu itinerario`,
      porque: "Cifra de visitantes sin respaldo (8,000): se quita la frase.",
    },
    {
      from: `más técnica cerca de la misma región, el`,
      to: `más técnica, a 45 minutos de Ciudad Valles, el`,
      porque: "El rafting del Tampaón sale de Tanchachín, al sureste de Valles (45 min, `destinos.ts`), no de la zona de El Naranjo.",
    },
    {
      from: `<strong>$1,850 MXN por persona</strong>`,
      to: `<strong>{{tour:rafting-rio-tampaon}} por persona</strong>`,
      porque: "Precio del Rafting en el Río Tampaón en `tours.ts`: $1,950 MXN.",
    },
    {
      from: `¿Quieres vivir cascada el salto con guía experto?`,
      to: `¿Quieres conocer la cascada El Salto con guía experto?`,
      porque: CTA,
    },
  ],

  "el-trampolin-de-tamasopo-guia-precio-y-como-llegar": [
    {
      campo: "coverImageAlt",
      from: `el trampolin tamasopo Cascadas de Tamasopo con aguas turquesa entre la selva potosina Huasteca Potosina 2026`,
      to: `Cascadas de Tamasopo con aguas turquesa entre la selva potosina, Huasteca Potosina`,
      porque: "La portada (imagenes/cascadas-de-tamasopo/hero.jpg) es el parque de las Cascadas de Tamasopo, no el trampolín; el alt le pegaba «el trampolin tamasopo».",
    },
    {
      from: `—apenas 48 km por la Mex-85—`,
      to: `—a unos 45 minutos por la federal 70, rumbo a Rioverde—`,
      porque: "A Tamasopo se llega por la federal 70 Valles–Rioverde, no por la 85 (que va al norte y al sur). Km sin fuente; 45 min desde Valles en `destinos.ts` (cascadas-de-tamasopo).",
    },
    {
      from: ` Según registros de operadores locales de la región, en 2026 el área de Tamasopo recibe más de <strong>8,000 visitantes</strong> durante los fines de semana de temporada alta (julio y Semana Santa), la mayoría de ellos atraídos por sus ríos de agua turquesa.`,
      to: ` Los fines de semana de temporada alta (julio y Semana Santa) son los más concurridos.`,
      porque: "Cifra de visitantes sin respaldo (8,000): se quita.",
    },
    {
      from: `<strong>$1,500 MXN por persona</strong>`,
      to: `<strong>{{tour:ruta-acuatica-puente-de-dios}} por persona</strong>`,
      porque: "Precio de la Ruta Acuática — Puente de Dios en `tours.ts`: $1,600 MXN por persona.",
    },
    {
      from: `$200 MXN por persona`,
      to: `{{entrada:cascadas-de-tamasopo}} por persona`,
      porque: "Entrada de las Cascadas de Tamasopo en `destinos.ts`: $60 MXN (ya corregida así en el artículo de Siete Cascadas, `blogSeo.ts`).",
    },
    {
      from: `https://www.huasteca-potosina.com/imagenes/cascada-de-tamul/gallery-1.jpg`,
      to: `https://www.huasteca-potosina.com/imagenes/cascada-el-trampolin-tamasopo/gallery-2.jpg`,
      porque: "La foto era de Tamul (cascada-de-tamul/gallery-1.jpg) con pie del trampolín; se cambia por una del río Agua Buena en Tamasopo (carpeta cascada-el-trampolin-tamasopo).",
    },
    {
      from: `<p>Según guías locales que trabajan con nosotros, en <strong>2026</strong> los fines de semana de julio concentran hasta <strong>400–500 personas</strong> simultáneas en el área completa de Agua Buena, incluyendo el trampolín y la zona de las cascadas. Para comparar`,
      to: `<p>Para comparar`,
      porque: "Cifra de afluencia sin respaldo (400–500 personas): se quita la frase.",
    },
    {
      from: `toma la carretera federal <strong>Mex-85</strong> con dirección norte hacia Tamasopo.`,
      to: `toma la carretera federal <strong>70</strong> con dirección poniente hacia Tamasopo (rumbo a Rioverde).`,
      porque: "Tamasopo está al poniente de Valles sobre la federal 70 Valles–Rioverde, no al norte por la 85.",
    },
    {
      from: `¿Quieres vivir el trampolin tamasopo con guía experto?`,
      to: `¿Quieres recorrer Tamasopo con guía experto?`,
      porque: CTA,
    },
  ],

  "nacimiento-de-tambaque-guia-completa": [
    {
      from: `La Huasteca Potosina recibe más de 500,000 visitantes anuales según datos del gobierno estatal de San Luis Potosí, y Aquismón se ha consolidado como uno de sus municipios más visitados`,
      to: `Aquismón se ha consolidado como uno de los municipios más visitados de la Huasteca Potosina`,
      porque: "Cifra de visitantes sin respaldo (500,000 al año): se quita.",
    },
    {
      from: `https://www.huasteca-potosina.com/imagenes/nacimiento-huichihuayan/gallery-1.jpg`,
      to: `https://www.huasteca-potosina.com/imagenes/nacimiento-tambaque/gallery-1.webp`,
      porque: "La foto era de Huichihuayán (nacimiento-huichihuayan/gallery-1.jpg) con pie de Tambaque; se cambia por una de la galería de Tambaque.",
    },
    {
      from: `<p>Según operadores locales con quienes trabajamos, más de <strong>8,000 visitantes</strong> acceden al paraje de Tambaque durante los meses de julio y agosto de cada temporada, lo que convierte esas semanas en las más concurridas del año.`,
      to: `<p>Julio y agosto son las semanas más concurridas del año en el paraje de Tambaque.`,
      porque: "Cifra de visitantes sin respaldo (8,000): se quita.",
    },
    {
      from: `si salges temprano`,
      to: `si sales temprano`,
      porque: "Errata: «salges».",
    },
  ],

  "como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp": [
    {
      from: `El trayecto sigue la carretera <strong>México-Tuxpan (Federal 130D)</strong> hasta Tamazunchale y luego la <strong>Federal 85</strong> hacia Xilitla.`,
      to: `El trayecto sigue la <strong>Federal 85</strong> por Pachuca hasta Tamazunchale y luego toma el desvío de la <strong>Federal 120</strong> hacia Xilitla.`,
      porque: "La México–Tuxpan (130D) va a Tuxpan, Veracruz; a Tamazunchale se llega por la 85 vía Pachuca, y a Xilitla se sube por la 120 (`destinos.ts`).",
    },
    {
      from: `Reserva el tour a cómo llegar a xilitla</a>`,
      to: `Reserva un tour a Xilitla</a>`,
      porque: ENLACE,
    },
    {
      from: `desde donde se toman <strong>57 km adicionales</strong> por carretera estatal hasta Xilitla. Este tramo final dura cerca de <strong>1 hora y 15 minutos</strong> por las curvas.`,
      to: `desde donde se sigue por la Federal 85 al sur y la Federal 120 hasta Xilitla. Este tramo final dura cerca de <strong>{{vallesXilitla}}</strong> por las curvas.`,
      porque: VALLES_XILITLA,
    },
    {
      from: `Se toma la <strong>Federal 70</strong> dirección Ciudad Valles y desde allí la carretera estatal a Xilitla.`,
      to: `Se toma la <strong>Federal 70</strong> hasta Rioverde y de ahí la ruta por Jalpan hasta Xilitla: no pasa por Ciudad Valles.`,
      porque: "Las 5 h de SLP a Xilitla son por Rioverde y Jalpan, sin pasar por Valles (`tiemposDeViaje.ts`, número de Manolo).",
    },
    {
      from: `oscila entre <strong>$400 y $600 MXN</strong> por unidad`,
      to: `ronda los <strong>$1,200 MXN</strong> por unidad`,
      porque: "`destinos.ts` (Las Pozas, cómo llegar): «Taxi $1,200» desde Valles.",
    },
    {
      from: `<tr><td>CDMX</td><td><strong>450 km</strong></td>`,
      to: `<tr><td>CDMX</td><td><strong>{{km:cdmx}}</strong></td>`,
      porque: "CDMX–Xilitla ≈ 350 km por la Federal 85 (OSRM, 13 nov 2026; `tiemposDeViaje.ts`). El sitio decía 339 en paquetes y 450 aquí.",
    },
    {
      from: `<td><strong>6–7 h</strong></td>`,
      to: `<td><strong>{{auto:cdmx}}</strong></td>`,
      porque: "CDMX–Xilitla: 7 h (`tiemposDeViaje.ts`); el mismo artículo dice 7 h arriba.",
    },
    {
      from: `<td><strong>6.5–7.5 h</strong></td>`,
      to: `<td><strong>{{auto:monterrey}}</strong></td>`,
      porque: "Monterrey–Xilitla: ~7 h (`tiemposDeViaje.ts`).",
    },
    {
      from: `<td><strong>4–4.5 h</strong></td>`,
      to: `<td><strong>{{auto:san-luis-potosi}}</strong></td>`,
      porque: "SLP–Xilitla: 5 h (`tiemposDeViaje.ts`); el mismo artículo dice 5 h arriba.",
    },
    {
      from: `por la Federal 130D hasta Tamazunchale y luego la Federal 85.`,
      to: `por la Federal 85, vía Pachuca, hasta Tamazunchale y luego la Federal 120.`,
      porque: "La 130D es la México–Tuxpan; a Tamazunchale se llega por la 85 vía Pachuca y a Xilitla se sube por la 120.",
    },
    {
      from: `<strong>8–9 horas</strong> considerando transbordos`,
      to: `<strong>9 a 10 horas</strong> considerando transbordos`,
      porque: "En autobús CDMX–Xilitla son 9 a 10 h (`tiemposDeViaje.ts`, busXilitla).",
    },
    {
      from: `¿Quieres vivir cómo llegar a xilitla con guía experto?`,
      to: `¿Quieres recorrer Xilitla con guía experto?`,
      porque: CTA,
    },
  ],

  "cascadas-de-micos-guia-completa-para-tu-visita": [
    {
      from: `ubicadas a <strong>8 kilómetros de Ciudad Valles</strong>`,
      to: `ubicadas a <strong>20 minutos de Ciudad Valles</strong>`,
      porque: "`destinos.ts`: 20 min desde Valles; el paraje está a unos 20 km, no a 8.",
    },
    {
      from: `La duración aproximada es de <strong>7 horas</strong>, con inicio habitual cerca de las <strong>9:00 am</strong>.`,
      to: `El inicio habitual es cerca de las <strong>9:00 am</strong>.`,
      porque: "Las 7 horas no tienen respaldo (la visita completa dura unas 4 h según `destinos.ts`; el 7 parece salir de las siete cascadas). Se quita.",
    },
    {
      from: `recorre la totalidad de estas caídas en aproximadamente <strong>7 horas</strong>, con saltos`,
      to: `recorre la totalidad de estas caídas, con saltos`,
      porque: "Las 7 horas no tienen respaldo (la visita completa dura unas 4 h, `destinos.ts`).",
    },
    {
      from: `el paraje está a <strong>8 km de Ciudad Valles</strong>. Está a 20 minutos de Ciudad Valles.`,
      to: `el paraje está a 20 minutos de Ciudad Valles.`,
      porque: "`destinos.ts`: 20 min desde Valles; los 8 km no cuadran (son unos 20 km).",
    },
    {
      from: `¿Quieres vivir cascadas de micos con guía experto?`,
      to: `¿Quieres conocer las Cascadas de Micos con guía experto?`,
      porque: CTA,
    },
  ],

  "nacimiento-de-huichihuayan-la-joya-escondida-de-la-huasteca": [
    {
      from: ` Según operadores locales de la región, la temporada de noviembre a mayo concentra más del <strong>70%</strong> de las visitas anuales al sitio, gracias a`,
      to: ` La temporada de noviembre a mayo es la más visitada, gracias a`,
      porque: "Porcentaje sin respaldo (70 %): se quita.",
    },
    {
      from: `se ubica a <strong>65 km</strong> de Ciudad Valles por la carretera federal México-Laredo.`,
      to: `se ubica al sur de Ciudad Valles por la carretera federal México-Laredo.`,
      porque: "Km sin fuente que no cuadran con el tiempo del catálogo (80 min desde Valles, `destinos.ts`). Se quitan.",
    },
    {
      from: `toma aproximadamente <strong>50 a 60 minutos</strong> en 2026`,
      to: `toma aproximadamente <strong>80 minutos</strong> en 2026`,
      porque: "`destinos.ts` (nacimiento-huichihuayan): 80 min desde Valles.",
    },
    {
      from: `Huichihuayan está a <strong>65 km</strong> de Ciudad Valles por la carretera México-Laredo. En auto el trayecto dura entre <strong>50 y 60 minutos</strong>.`,
      to: `Huichihuayan está al sur de Ciudad Valles por la carretera México-Laredo. En auto el trayecto dura unos <strong>80 minutos</strong>.`,
      porque: "`destinos.ts`: 80 min desde Valles; km sin fuente.",
    },
    {
      from: `No hay horario oficial publicado en 2026; contacta`,
      to: `Abre de 08:30 a 18:00; aun así, contacta`,
      porque: "`destinos.ts` (nacimiento-huichihuayan): horario 08:30–18:00.",
    },
    {
      from: `¿Quieres vivir nacimiento de huichihuayan con guía experto?`,
      to: `¿Quieres conocer el Nacimiento de Huichihuayán con guía experto?`,
      porque: CTA,
    },
  ],
};
