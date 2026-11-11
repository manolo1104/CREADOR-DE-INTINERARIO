import type { ErratasPorArticulo } from "@/lib/erratas/tipos";

/** Fe de erratas del blog, grupo b (11 nov 2026). Ver `src/lib/blogErratas.ts`. */
export const ERRATAS_GRUPO_B: ErratasPorArticulo = {
  "aquismon-pueblo-magico-que-ver-y-como-llegar": [
    {
      from: "El municipio forma parte de la Sierra Gorda Potosina, una zona donde conviven más de <strong>12 grupos de flora endémica</strong> y comunidades indígenas",
      to: "El municipio forma parte de la Sierra Madre Oriental, una zona donde conviven flora endémica y comunidades indígenas",
      porque: "Aquismón está en la Sierra Madre Oriental (región Huasteca); «Sierra Gorda Potosina» no es su sierra (la Sierra Gorda es la de Querétaro) y los «12 grupos de flora endémica» no tienen fuente.",
    },
    {
      from: "Según operadores locales de la región, más de <strong>15,000 visitantes</strong> recorren el municipio durante la Semana Santa, lo que convierte",
      to: "En Semana Santa el municipio se llena de visitantes, lo que convierte",
      porque: "Cifra de visitantes sin respaldo (15,000 en Semana Santa): se quita el número y queda la idea.",
    },
    {
      from: "que operan <strong>lunes a domingo de 8:00 a 16:00 h</strong>. El costo es <strong>$250 MXN</strong> el boleto de panga colectiva, más <strong>$50 MXN</strong> de acceso ejidal y <strong>$40 MXN</strong> de chaleco salvavidas obligatorio.",
      to: "que abren <strong>todos los días desde las 8:00 h</strong>; las pangas dejan de salir a las <strong>14:00 h</strong>. El costo es <strong>{{entrada:cascada-de-tamul}}</strong>, solo en efectivo, con chaleco salvavidas obligatorio.",
      porque: "Precio y horario de Tamul de `destinos.ts` (cascada-de-tamul): entrada $220 + panga $300 por persona (no $250 + $50 + $40) y los lancheros dejan de salir a las 2 PM.",
    },
    {
      from: "que está cerca de Aquismón y cuyas aves regresan al atardecer.",
      to: "que está cerca de Aquismón y cuyas aves también salen en la mañana y regresan en la tarde.",
      porque: "Confirmado por Manolo: en Golondrinas Y en Huahuas las aves salen en la mañana y regresan en la tarde; la frase daba a entender que era una diferencia entre los dos sótanos.",
    },
    {
      from: "abren de <strong>8:00 a 17:00 h</strong> todos los días",
      to: "abren de <strong>9:00 a 17:00 h</strong> todos los días",
      porque: "Horario de las Cuevas de Mantetzulel en `destinos.ts` (cuevas-de-mantetzulel): 09:00–17:00.",
    },
    {
      from: "Según guías locales de la región, el <strong>70 % de los visitantes</strong> en 2026 combina Tamul con las cuevas de Mantetzulel el mismo día.",
      to: "Muchos visitantes combinan Tamul con las cuevas de Mantetzulel el mismo día.",
      porque: "Porcentaje sin respaldo (70 % de los visitantes): se quita la cifra.",
    },
    {
      from: "cuando el Río Tampaón sube más de <strong>1.5 metros</strong> sobre su nivel habitual,",
      to: "cuando el Río Tampaón crece por las lluvias,",
      porque: "El umbral de «1.5 metros» no tiene fuente; los lancheros suspenden según la creciente, sin una cifra publicada.",
    },
    {
      from: "Tamul (<strong>$340 MXN</strong> entre panga + ejido + chaleco)",
      to: "Tamul (<strong>{{entrada:cascada-de-tamul}}</strong>)",
      porque: "Precio de Tamul de `destinos.ts` (cascada-de-tamul): $220 de entrada + $300 de panga por persona, no $340.",
    },
    {
      from: "Calcula mínimo <strong>$500–$600 MXN</strong> por persona para cubrir todas las entradas y el guía.",
      to: "Calcula mínimo <strong>$700 MXN</strong> por persona solo en entradas, más el guía.",
      porque: "Con los precios de `destinos.ts` las entradas suman $690 (Tamul $220 + $300 de panga, Golondrinas $100, Mantetzulel $70): $500–$600 no alcanzaba ni para ellas.",
    },
    {
      from: "Los embarcaderos de Tamul cierran a las <strong>16:00 h</strong>",
      to: "Las pangas a Tamul dejan de salir a las <strong>14:00 h</strong>",
      porque: "`destinos.ts` (cascada-de-tamul): «Lancheros dejan de salir a las 2 PM».",
    },
    {
      from: "La carretera federal <strong>85D</strong> y luego la <strong>MEX-69</strong> conectan ambos puntos",
      to: "La carretera federal <strong>85</strong> y luego la desviación a Aquismón conectan ambos puntos",
      porque: "`destinos.ts` (aquismon-pueblo-magico): ~55 km al sur de Ciudad Valles «por la Carr. 85»; ahí no hay carretera MEX-69 y el tramo no es la 85D.",
    },
    {
      from: "la distancia es mayor (<strong>~90 km</strong>) y conviene",
      to: "conviene",
      porque: "Los ~90 km desde Xilitla no tienen fuente y Aquismón queda entre Ciudad Valles y Xilitla, así que «mayor» tampoco es seguro: se quita la cifra.",
    },
    {
      from: "por <strong>$1,450 MXN</strong> por persona.",
      to: "por <strong>{{tour:expedicion-tamul}}</strong> por persona.",
      porque: "Precio de la Expedición Tamul en `tours.ts`: $1,550 por persona.",
    },
    {
      from: "toma unas <strong>3.5 horas</strong>; desde ahí se suma la hora hasta Aquismón. Desde Monterrey, la distancia es de aproximadamente <strong>420 km</strong> por la carretera <strong>MEX-85</strong>, unas <strong>4.5 horas</strong> en condiciones normales.",
      to: "toma <strong>{{autoValles:san-luis-potosi}}</strong>; desde ahí se suma la hora hasta Aquismón. Desde Monterrey, por la carretera <strong>MEX-85</strong> son <strong>{{autoValles:monterrey}}</strong> hasta Ciudad Valles, más la hora hasta Aquismón.",
      porque: "`tiemposDeViaje.ts`: San Luis Potosí–Ciudad Valles ~3 h (no 3.5) y Monterrey–Ciudad Valles ~6 h; «420 km / 4.5 h» desde Monterrey era imposible.",
    },
    {
      from: "<td><strong>280 km / ~4.5 h</strong></td>",
      to: "<td><strong>~315 km / ~4 h</strong></td>",
      porque: "`tiemposDeViaje.ts`: San Luis Potosí–Ciudad Valles 260 km y ~3 h, más los ~55 km y ~1 h de Valles a Aquismón (`destinos.ts`).",
    },
    {
      from: "en auto por la carretera MEX-69,",
      to: "en auto por la carretera federal 85,",
      porque: "`destinos.ts` (aquismon-pueblo-magico): se llega «por la Carr. 85»; no existe una MEX-69 en ese tramo.",
    },
    {
      from: "aprovechando los <strong>60 km</strong> de distancia",
      to: "aprovechando los <strong>55 km</strong> de distancia",
      porque: "`destinos.ts` (aquismon-pueblo-magico): ~55 km de Ciudad Valles, la misma cifra que el resto del artículo.",
    },
    {
      from: "Si partes antes de las <strong>7:30 h</strong>, tienes tiempo",
      to: "Si sales de madrugada (hay que estar en el sótano antes de las <strong>7:00 h</strong>), tienes tiempo",
      porque: "Salir de Valles a las 7:30 no deja llegar antes de las 7:00 al Sótano de las Golondrinas, como pide el propio artículo (≈1 h solo hasta Aquismón).",
    },
    {
      from: "incluye el traslado en panga colectiva (<strong>$250 MXN</strong>), el acceso ejidal (<strong>$50 MXN</strong>) y el alquiler de chaleco salvavidas obligatorio (<strong>$40 MXN</strong>).",
      to: "incluye la entrada y el traslado en panga (<strong>{{entrada:cascada-de-tamul}}</strong>), con chaleco salvavidas obligatorio.",
      porque: "Precio de Tamul de `destinos.ts` (cascada-de-tamul): $220 de entrada + $300 de panga por persona.",
    },
    {
      from: "calcula mínimo <strong>$600–$700 MXN</strong> por persona: <strong>$340 MXN</strong> en Tamul,",
      to: "calcula mínimo <strong>$800–$900 MXN</strong> por persona: <strong>{{entrada:cascada-de-tamul}}</strong> en Tamul,",
      porque: "Con los precios de `destinos.ts` (Tamul $520 con panga, Golondrinas $100, Mantetzulel $70) más $100–$200 de comida, el día suma $790–$890.",
    },
    {
      from: "<p>Según la Secretaría de Turismo de San Luis Potosí, Aquismón registró más de <strong>80,000 visitantes</strong> durante 2025, consolidándose como uno de los Pueblos Mágicos con mayor crecimiento turístico del estado. La infraestructura",
      to: "<p>La infraestructura",
      porque: "Cifra de visitantes atribuida a la Secretaría de Turismo sin fuente (80,000 en 2025): se quita la frase.",
    },
    {
      from: "¿Quieres vivir aquismon pueblo magico con guía experto?",
      to: "¿Quieres conocer Aquismón Pueblo Mágico con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin acentos ni mayúsculas).",
    },
  ],
  "siete-cascadas-de-tamasopo-guia-completa": [
    {
      from: "Tamasopo forma parte de la Sierra Gorda potosina, una región",
      to: "Tamasopo está en las faldas de la Sierra Madre Oriental, una región",
      porque: "Tamasopo está al pie de la Sierra Madre Oriental, en la Huasteca; la «Sierra Gorda potosina» no es su sierra (la Sierra Gorda es la de Querétaro).",
    },
    {
      from: "cuenta con apenas unos <strong>15,000 habitantes</strong>, lo que le otorga una escala humana",
      to: "tiene una escala humana",
      porque: "La cifra de habitantes no tiene fuente (y no cuadra con el municipio): se quita y queda la idea.",
    },
    {
      from: "src=\"https://www.huasteca-potosina.com/imagenes/puente-de-dios-tamasopo/gallery-1.jpg\" alt=\"siete cascadas tamasopo",
      to: "src=\"https://www.huasteca-potosina.com/imagenes/siete-cascadas-tamasopo/gallery-1.jpg\" alt=\"siete cascadas tamasopo",
      porque: "La foto era del cañón del Puente de Dios (carpeta puente-de-dios-tamasopo) con pie de las Siete Cascadas; se cambia por una de las Siete Cascadas (carpeta siete-cascadas-tamasopo, la misma que usa la Ruta Acuática).",
    },
    {
      from: "Según operadores locales de la región, más de <strong>12,000 visitantes</strong> recorren el corredor Tamasopo-Puente de Dios durante el mes de julio de cada año, lo que convierte ese periodo en el de mayor demanda",
      to: "En el corredor Tamasopo-Puente de Dios, julio es el periodo de mayor demanda",
      porque: "Cifra de visitantes sin respaldo (12,000 en julio): se quita el número y queda la idea.",
    },
    {
      from: "Los grupos que organizamos desde Ciudad Valles salen habitualmente entre las",
      to: "Si vas por tu cuenta, conviene salir de Ciudad Valles entre las",
      porque: "Nuestros grupos no hacen eso: la Ruta Acuática (`tours.ts`) recoge de 8:00 a 9:00, llega al Puente de Dios a las 11:00 y deja Tamasopo o las Siete Cascadas para las 3 PM.",
    },
    {
      from: "Según guías locales, alrededor del <strong>70 %</strong> de los visitantes llegan en vehículo propio",
      to: "La mayoría de los visitantes llega en vehículo propio",
      porque: "Porcentaje sin respaldo (70 %): se quita la cifra.",
    },
    {
      from: "estacionamiento <strong>$100 MXN</strong> en parque",
      to: "estacionamiento aparte en el parque",
      porque: "El texto dice dos veces que el estacionamiento «se paga aparte» sin cifra, y `destinos.ts` no da tarifa: los $100 de la tabla no tienen fuente.",
    },
    {
      from: "dedicarle entre <strong>3 y 4 horas</strong> y trasladarse a Puente de Dios para la tarde, aprovechando la luz que filtra por el cañón entre las <strong>11:00 am y las 2:00 pm</strong>.",
      to: "dedicarle unas <strong>3 horas</strong> y trasladarse a Puente de Dios hacia el mediodía, aprovechando la luz que filtra por el cañón entre las <strong>11:00 am y la 1:00 pm</strong>.",
      porque: "Se contradecía: llegar a Puente de Dios «en la tarde» se pierde la luz de media mañana. `destinos.ts` (puente-de-dios-tamasopo): la luz entra entre 11:00 y 13:00.",
    },
    {
      from: "¿Quieres vivir siete cascadas tamasopo con guía experto?",
      to: "¿Quieres conocer las Siete Cascadas de Tamasopo con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin artículo ni mayúsculas).",
    },
  ],
  "laguna-de-la-media-luna-manantiales-y-buceo-guia": [
    {
      from: "Rioverde es una ciudad de poco más de 100,000 habitantes ubicada en la zona media",
      to: "Rioverde es una ciudad ubicada en la zona media",
      porque: "La cifra de habitantes no tiene fuente (y no cuadra: es el municipio, no la ciudad): se quita.",
    },
    {
      from: "Según operadores locales que trabajan el sitio de manera constante, el parque recibió más de <strong>80,000 visitantes en 2025</strong>, con picos entre diciembre y marzo cuando la temperatura exterior hace que las aguas termales resulten",
      to: "El parque tiene sus picos entre diciembre y marzo, cuando la temperatura exterior hace que sus aguas templadas resulten",
      porque: "Cifra de visitantes sin respaldo (80,000 en 2025); y `destinos.ts` (laguna-media-luna) aclara que es un manantial, no un balneario de aguas termales.",
    },
    {
      from: "<a href=\"https://www.huasteca-potosina.com/tours/buceo-media-luna\">Reserva el tour Descubre el Buceo en la Laguna de la Media Luna</a> si quieres vivir esa inmersión con instructor certificado PADI desde <strong>$1,300 MXN por persona</strong>.",
      to: "Si quieres vivir esa inmersión, más abajo están las opciones de buceo para principiantes.",
      porque: "El tour de buceo en la Media Luna se retiró del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`; su URL redirige a la ficha del lugar): ya no se vende.",
    },
    {
      from: "<p>Nuestro tour de <a href=\"https://www.huasteca-potosina.com/tours/buceo-media-luna\">Descubre el Buceo en la Laguna de la Media Luna</a> tiene un costo de <strong>$1,300 MXN por persona</strong> e incluye orientación con instructor certificado PADI, práctica en aguas poco profundas e inmersión de <strong>5 a 10 metros</strong> — la profundidad ideal para ver las tortugas y el nacimiento sin necesitar certificación previa. <a",
      to: "<p><a",
      porque: "El tour de buceo en la Media Luna se retiró del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`): ya no es «nuestro tour» ni cuesta $1,300.",
    },
    {
      from: "Las fuentes actuales indican un horario de <strong>8:00 a 18:30 hrs.</strong> de lunes a domingo, aunque otra fuente señala cierre los <strong>martes</strong> con horario hasta las <strong>17:00 hrs.</strong> La discrepancia existe: llama directamente",
      to: "El parque abre de <strong>8:00 a 18:30 hrs.</strong> de lunes a domingo; aun así, llama directamente",
      porque: "Horario de `destinos.ts` (laguna-media-luna): 08:00–18:30, lunes a domingo; el «cierre los martes» de «otra fuente» no tiene respaldo.",
    },
    {
      from: "la distancia es de aproximadamente <strong>110 kilómetros</strong> con un tiempo de <strong>1 hora 20 minutos</strong> tomando la autopista de cuota.",
      to: "también se llega por la Federal 70, que une la capital con Rioverde.",
      porque: "«110 km / 1 h 20 por autopista de cuota» de San Luis Potosí a Rioverde no tiene fuente y no cuadra con `tiemposDeViaje.ts` (SLP–Valles 260 km y ~3 h por la misma 70): se quita la cifra.",
    },
    {
      from: " Reserva el tour de <a href=\"https://www.huasteca-potosina.com/tours/buceo-media-luna\">Descubre el Buceo en la Laguna de la Media Luna</a> si prefieres no preocuparte por la logística de transporte.",
      to: "",
      porque: "El tour de buceo en la Media Luna se retiró del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`).",
    },
    {
      from: "combinarla con la zona arqueológica de Tamtoc o con una parada gastronómica en Rioverde",
      to: "combinarla con una parada gastronómica en Rioverde",
      porque: "Tamtoc está junto a Tamuín, al oriente de Ciudad Valles; la Media Luna está al poniente, junto a Rioverde: no se combinan en medio día.",
    },
    {
      from: "\n    <tr>\n      <td>Tour operado desde Ciudad Valles</td>\n      <td>Desde <strong>$1,300 MXN/persona</strong></td>\n      <td>Incluye transporte, guía certificado PADI e inmersión; sin gestión logística propia</td>\n    </tr>",
      to: "",
      porque: "Fila del tour de buceo, retirado del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`).",
    },
    {
      from: "¿Quieres vivir laguna media luna con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: "Frase rota de plantilla; y ya no hay tour propio a la Media Luna (el buceo se retiró el 29 oct 2026).",
    },
    {
      from: "La escuela del parque y nuestro tour ofrecen buceo",
      to: "La escuela del parque ofrece buceo",
      porque: "El tour de buceo en la Media Luna se retiró del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`).",
    },
    {
      from: " Nuestro tour tiene un precio de <strong>$1,300 MXN</strong> por persona con instructor PADI.",
      to: "",
      porque: "El tour de buceo en la Media Luna se retiró del catálogo el 29 oct 2026 (`TOURS_RETIRADOS` en `tours.ts`).",
    },
    {
      from: "Desde la capital San Luis Potosí son alrededor de <strong>110 km</strong> en unos <strong>80 minutos</strong> por autopista.",
      to: "Desde la capital San Luis Potosí también se llega por la Federal 70.",
      porque: "«110 km en 80 minutos por autopista» de San Luis Potosí a Rioverde no tiene fuente y no cuadra con `tiemposDeViaje.ts` (SLP–Valles ~3 h por la misma 70): se quita la cifra.",
    },
  ],
  "zona-arqueologica-de-tamohi-el-consuelo-guia": [
    {
      from: "es el sitio arqueológico huasteco precolombino más extenso de San Luis Potosí, ubicado a orillas del río Tampaón en el municipio de Tamuín, con una superficie de <strong>más de 210 hectáreas</strong> de traza urbana compleja.",
      to: "es uno de los sitios arqueológicos huastecos precolombinos más importantes de San Luis Potosí, ubicado a orillas del río Tampaón en el municipio de Tamuín, con una traza urbana compleja.",
      porque: "Las 210 hectáreas son la cifra que se da para Tamtoc, que es el gran sitio huasteco del estado; no hay fuente segura de que Tamohi sea «el más extenso» ni de su superficie, así que se quitan las dos cosas.",
    },
    {
      from: "solo la zona explorada y abierta al público representa <strong>menos del 0.6 %</strong> de las 210 hectáreas totales.",
      to: "solo una pequeña parte del asentamiento está explorada y abierta al público.",
      porque: "El «0.6 % de 210 hectáreas» se apoya en la superficie de Tamtoc, no de Tamohi: se quita la cifra.",
    },
    {
      from: "el otro gran sitio huasteco de San Luis Potosí, ubicado a unos <strong>30 km al norte</strong> de tamohi tamuin.",
      to: "el otro gran sitio huasteco de San Luis Potosí, también en el municipio de Tamuín.",
      porque: "Tamtoc no está a 30 km al norte de Tamohi: las dos zonas están en el municipio de Tamuín (`destinos.ts`, zona-arqueologica-tamohi-el-consuelo). Sin una distancia segura, se quita la cifra.",
    },
    {
      from: "los Voladores de Tamaleón</a>",
      to: "los Voladores de Tamaletón</a>",
      porque: "Errata en el nombre: la comunidad es Tamaletón (`destinos.ts`, voladores-tamaleton).",
    },
    {
      from: "src=\"https://www.huasteca-potosina.com/imagenes/cascada-el-salto/gallery-1.jpg\" alt=\"tamohi el consuelo zona arqueologica guía viaje Huasteca Potosina\"",
      to: "src=\"https://www.huasteca-potosina.com/imagenes/zona-arqueologica-tamohi-el-consuelo/hero.jpg\" alt=\"Plataforma de cantos rodados de la zona arqueológica Tamohi El Consuelo, en Tamuín, San Luis Potosí\"",
      porque: "La foto era de la Cascada El Salto (carpeta cascada-el-salto) con pie de Tamohi; se cambia por la de Tamohi (carpeta zona-arqueologica-tamohi-el-consuelo, la portada de su ficha), que sí muestra sus plataformas.",
    },
    {
      from: "ver tours disponibles en la Huasteca Potosina</a> que combinan arqueología y río en la misma jornada.",
      to: "ver tours disponibles en la Huasteca Potosina</a> en los ríos de la región.",
      porque: "Ningún tour del catálogo (`tours.ts`) combina una zona arqueológica con río: la frase prometía algo que no vendemos.",
    },
    {
      from: "¿Quieres vivir tamohi el consuelo con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: "Frase rota de plantilla; y no hay tour a Tamohi en el catálogo, así que se invita a la región.",
    },
    {
      from: "Tamohi El Consuelo ocupa <strong>más de 210 hectáreas</strong> de traza urbana compleja, aunque en 2026 menos del <strong>0.6 %</strong> del sitio está excavado y abierto al público.",
      to: "Tamohi El Consuelo tiene una traza urbana extensa, aunque en 2026 solo una pequeña parte del sitio está excavada y abierta al público.",
      porque: "Las 210 hectáreas son la cifra de Tamtoc; sin una fuente segura para Tamohi, se quitan la superficie y el porcentaje.",
    },
    {
      from: "ubicada a unos <strong>30 km al norte</strong> de Tamohi, lo que permite",
      to: "también en el municipio de Tamuín (por ahora solo abre los domingos), lo que permite",
      porque: "Tamtoc no está a 30 km al norte: las dos están en Tamuín (`destinos.ts`). Y `destinos.ts` (zona-arqueologica-tamtoc) avisa que hoy SOLO abre los domingos, así que la combinación solo se puede ese día.",
    },
  ],
  "puente-de-dios-tamasopo-el-portal-de-luz-de-la-huasteca": [
    {
      from: "El <strong>tamasopo turismo</strong> registra un crecimiento sostenido: según operadores locales de la región, más de <strong>9,000 visitantes</strong> recorren el parque natural de Tamasopo durante el puente de Semana Santa de 2026, lo que lo convierte en uno de los destinos más concurridos",
      to: "El parque natural de Tamasopo es uno de los destinos más concurridos",
      porque: "Cifra de visitantes sin respaldo (9,000 en Semana Santa) y «crecimiento sostenido» sin dato: se quitan y queda la idea.",
    },
    {
      from: "llegar entre las <strong>10:00 a.m. y las 12:00 p.m.</strong> maximiza las fotografías.",
      to: "llegar entre las <strong>11:00 a.m. y la 1:00 p.m.</strong> maximiza las fotografías.",
      porque: "La tabla del propio artículo y `destinos.ts` (puente-de-dios-tamasopo) dicen que la luz entra en la cueva de 11:00 a 13:00, no de 10 a 12.",
    },
    {
      from: ">Reserva el tour a puente de dios tamasopo</a>",
      to: ">Reserva el tour al Puente de Dios</a>",
      porque: "Frase rota de plantilla («Reserva el tour a puente de dios tamasopo»).",
    },
    {
      from: "se distribuyen en tres niveles dentro del mismo parque.",
      to: "se distribuyen en tres niveles en un parque aparte, con su propia entrada (<strong>{{entrada:cascadas-de-tamasopo}}</strong>).",
      porque: "Las Cascadas de Tamasopo no están dentro del parque del Puente de Dios: `destinos.ts` las tiene como lugar aparte con entrada de $60, y la Ruta Acuática (`tours.ts`) obliga a elegir entre ellas y las Siete Cascadas.",
    },
    {
      from: "El horario de visita es de <strong>8:00 a.m. a 6:00 p.m.</strong> todos los días del año",
      to: "El horario de visita es de <strong>8:00 a.m. a 5:00 p.m.</strong> todos los días del año",
      porque: "Horario de las Cascadas de Tamasopo en `destinos.ts` (cascadas-de-tamasopo): 08:00–17:00.",
    },
    {
      from: "detalla otra corriente natural de agua cristalina a menos de una hora de distancia.",
      to: "detalla otra corriente natural de agua cristalina, en el municipio de Huehuetlán.",
      porque: "Huichihuayán no está «a menos de una hora» de Tamasopo: está del otro lado de Ciudad Valles, en el municipio de Huehuetlán (confirmado por Manolo), cerca de Xilitla.",
    },
    {
      from: "hasta el parque toma aproximadamente <strong>45 minutos</strong> en auto por la carretera hacia Tamasopo. En el camino encontrarás <strong>dos casetas de peaje</strong> con un costo aproximado de <strong>$70 MXN</strong> cada una.",
      to: "hasta el parque toma aproximadamente <strong>1 hora</strong> en auto por la carretera hacia Tamasopo.",
      porque: "`destinos.ts` (puente-de-dios-tamasopo) y la tabla del artículo: 1 h desde Valles, no 45 min. Las «dos casetas de $70» chocan con la guía de la Media Luna (la 70 a Rioverde «no tiene casetas»): sin fuente segura, se quitan.",
    },
    {
      from: ", estacionamiento <strong>$30 MXN</strong> y dos casetas de peaje <strong>$140 MXN</strong> en total si se viaja en auto desde Ciudad Valles.",
      to: " y estacionamiento <strong>$30 MXN</strong> si se viaja en auto.",
      porque: "Las casetas de la carretera 70 no tienen fuente y otro artículo dice que ese tramo no tiene peaje: se quitan del presupuesto.",
    },
    {
      from: "¿Quieres vivir puente de dios tamasopo con guía experto?",
      to: "¿Quieres conocer el Puente de Dios con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin artículo ni mayúsculas).",
    },
    {
      from: " Si vienes desde Ciudad Valles en auto, añade <strong>$140 MXN</strong> de peaje (dos casetas).",
      to: "",
      porque: "Las «dos casetas» de la carretera 70 no tienen fuente y chocan con la guía de la Media Luna (sin peaje): se quitan.",
    },
    {
      from: "Ciudad Valles se encuentra a <strong>~45 minutos</strong> en auto.",
      to: "Ciudad Valles se encuentra a <strong>~1 hora</strong> en auto.",
      porque: "`destinos.ts` (puente-de-dios-tamasopo): 1 h desde Valles por la autopista a San Luis Potosí, igual que la tabla del artículo.",
    },
    {
      from: "El parque abre todos los días de <strong>8:00 a.m. a 6:00 p.m.</strong>",
      to: "El parque abre todos los días de <strong>8:00 a.m. a 5:00 p.m.</strong>",
      porque: "`destinos.ts` (puente-de-dios-tamasopo) y la tabla del artículo: 08:00–17:00.",
    },
  ],
  "cultura-huasteca-potosina-cultura-huasteca-tradiciones-music": [
    {
      from: "documenta extensamente su arquitectura y códices en",
      to: "documenta extensamente su arquitectura y su escultura en",
      porque: "No se conocen códices huastecos (los teenek no dejaron códices conservados); lo que el INAH documenta es su arquitectura y su escultura (p. ej. el Adolescente Huasteco).",
    },
    {
      from: "¿Quieres vivir cultura huasteca potosina con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin artículo); no hay tour cultural en el catálogo, así que se invita a la región.",
    },
  ],
  "zona-arqueologica-tamtoc-zona-arqueologica-de-tamtoc-histori": [
    {
      from: "Su datación apunta al periodo Clásico tardío, entre los años 600 y 900 d.C., lo que lo convierte",
      to: "Su datación apunta al periodo Preclásico, siglos antes de nuestra era, lo que lo convierte",
      porque: "El gran monumento grabado de Tamtoc (el Monumento 32, «la Sacerdotisa») es del Preclásico, del primer milenio antes de Cristo, no del Clásico tardío (600–900 d.C.); por eso mismo es «de los más antiguos».",
    },
    {
      from: "<a href=\"https://www.huasteca-potosina.com/tours\" title=\"tours zona arqueologica tamtoc Huasteca Potosina\">Reserva el tour a zona arqueologica tamtoc</a> con guía certificado por el INAH para aprovechar cada detalle.",
      to: "Ve con un guía certificado por el INAH para aprovechar cada detalle; para el resto de tu viaje, <a href=\"https://www.huasteca-potosina.com/tours\">mira nuestros tours guiados</a>.",
      porque: "Frase rota de plantilla («Reserva el tour a zona arqueologica tamtoc») que además ofrecía un tour a Tamtoc que no está en el catálogo (`tours.ts`).",
    },
    {
      from: "más de <strong>160 hectáreas</strong> de zona arqueológica",
      to: "unas <strong>210 hectáreas</strong> de zona arqueológica",
      porque: "La superficie que da el INAH para Tamtoc es de 210 hectáreas, la cifra habitual; las 160 no tienen fuente.",
    },
    {
      from: "el trayecto es de <strong>~30 minutos</strong> por carretera a Tampico",
      to: "el trayecto es de <strong>~45 minutos</strong> por carretera a Tampico",
      porque: "`destinos.ts` (zona-arqueologica-tamtoc): 45 min desde Ciudad Valles.",
    },
    {
      from: "¿Quieres vivir zona arqueologica tamtoc con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: "Frase rota de plantilla; y no hay tour a Tamtoc en el catálogo, así que se invita a la región.",
    },
    {
      from: "de Tamuín, a unos <strong>30 minutos</strong> en auto.",
      to: "de Tamuín, a unos <strong>45 minutos</strong> en auto.",
      porque: "`destinos.ts` (zona-arqueologica-tamtoc): 45 min desde Ciudad Valles.",
    },
  ],
  "olla-de-la-luz-hoya-de-la-luz-y-cueva-del-salitre-dos-secretos": [
    {
      campo: "excerpt",
      from: "La Olla de la Luz es una depresión natural en el bosque de niebla de Xilitla desde donde los rayos de sol perforan el dosel con una precisión casi geológica.",
      to: "La Olla de la Luz es una sima en el bosque de niebla de Xilitla donde, hacia el mediodía, la luz del sol entra hasta el fondo.",
      porque: "La ficha del tour `olla-de-la-luz` (tours.ts) la describe como una sima y el recorrido llega al borde hacia el mediodía; el resumen hablaba de una «depresión» y de rayos a cualquier hora (el cuerpo ya se corrigió igual).",
    },
    {
      from: "es una depresión natural tipo embudo ubicada en el bosque de niebla de La Trinidad,",
      to: "es un enorme sótano de 233 metros de diámetro y 193 de profundidad, ubicado en el bosque de niebla de La Trinidad,",
      porque: "`destinos.ts` y `tours.ts` (olla-de-la-luz): es un sótano vertical de 233 m de diámetro y 193 m de tiro, no una depresión tipo embudo (el propio pie de foto lo llama sótano).",
    },
    {
      from: "Según operadores locales que trabajan la ruta, en 2026 el número de visitantes que solicita este circuito ha crecido un <strong>40 %</strong> respecto a 2024, lo que convierte estos <strong>xilitla lugares secretos</strong> en uno de los segmentos de mayor expansión",
      to: "Estos <strong>xilitla lugares secretos</strong> son cada vez más buscados dentro",
      porque: "Porcentaje de crecimiento sin respaldo (40 % sobre 2024): se quita la cifra.",
    },
    {
      from: "a aproximadamente <strong>12 km</strong> del centro de Xilitla por camino de terracería.",
      to: "a unos <strong>5 km</strong> a pie de la comunidad, que está a <strong>~14 km</strong> de Xilitla.",
      porque: "`destinos.ts` (olla-de-la-luz y la-trinidad-xilitla): la Olla está a unos 5 km a pie de La Trinidad, y La Trinidad a ~14 km de Xilitla.",
    },
    {
      from: "especialmente entre las <strong>7:00 y las 9:30 h</strong>, cuando el ángulo solar es bajo y la neblina actúa como pantalla difusora. El fenómeno se apaga conforme avanza la mañana, razón por la que madrugar no es opcional sino estructural para la visita.",
      to: "especialmente hacia el mediodía, cuando el sol está alto y alcanza el fondo del sótano. Fuera de esas horas el fondo queda en sombra, razón por la que la caminata se calcula para llegar al borde entre media mañana y mediodía.",
      porque: "En un tiro de 193 m el sol de las 7:00–9:30 no llega al fondo; `tours.ts` (olla-de-la-luz) llega al borde a las 11:45 y `destinos.ts` da «media mañana» como mejor hora: el artículo contradecía nuestro propio recorrido.",
    },
    {
      from: "(<strong>1,650 m s. n. m.</strong> en el punto más alto de la ruta)",
      to: "(hasta <strong>~2,300 m s. n. m.</strong> en el Cerro de la Luz)",
      porque: "`destinos.ts` (olla-de-la-luz): la caminata va de 1,950 a 2,300 m; La Trinidad sola ya está a ~1,950 m.",
    },
    {
      from: "e incluye transporte desde Xilitla, guía local certificado y equipo básico de seguridad para la cueva. El acceso directo al bosque de La Trinidad tiene un cobro comunitario de <strong>$80 MXN por persona</strong>",
      to: "e incluye traslado desde tu hospedaje en Xilitla, guía certificado, la caminata guiada y equipo de seguridad; la Cueva del Salitre no va incluida. La entrada al bosque de La Trinidad es de <strong>$100 MXN por persona</strong>",
      porque: "`tours.ts` (olla-de-la-luz): el tour incluye traslado en Xilitla, caminata guiada, guía y equipo de seguridad, no la Cueva del Salitre; `destinos.ts` (la-trinidad-xilitla): entrada $100 por persona, no $80.",
    },
    {
      from: "<strong>Sal antes de las 6:00 h:</strong> El fenómeno lumínico de la <strong>olla de la luz</strong> alcanza su máxima expresión entre las <strong>7:00 y las 9:30 h</strong>.",
      to: "<strong>Sal temprano:</strong> El fenómeno lumínico de la <strong>olla de la luz</strong> alcanza su máxima expresión hacia el mediodía, y la caminata desde La Trinidad es de unas <strong>2 horas</strong>.",
      porque: "La luz llega al fondo del sótano con el sol alto, no de 7:00 a 9:30; `tours.ts` (olla-de-la-luz): caminata de unas 2 horas y llegada al borde a las 11:45.",
    },
    {
      from: "Cubre el cobro comunitario (<strong>$80 MXN</strong>)",
      to: "Cubre la entrada a La Trinidad (<strong>$100 MXN</strong>)",
      porque: "`destinos.ts` (la-trinidad-xilitla): la entrada es de $100 por persona.",
    },
    {
      from: "son <strong>12 km</strong> en vehículo, con un tiempo estimado de <strong>35 a 50 minutos</strong> dependiendo del estado de la brecha. Los primeros <strong>8 km</strong> son pavimento en buen estado; los últimos <strong>4 km</strong> son terracería que requiere doble tracción en temporada húmeda. Desde Ciudad Valles, la distancia total hasta Xilitla es de <strong>110 km</strong> (<strong>2 h 15 min</strong> aproximadamente).",
      to: "son unos <strong>14 km</strong> en vehículo, con un tiempo estimado de <strong>45 minutos a 1 hora</strong> dependiendo del estado de la brecha. El tramo final es una subida muy empinada de terracería quebrada que pide un vehículo alto (doble tracción en temporada húmeda). Desde Ciudad Valles hasta Xilitla hay <strong>{{vallesXilitla}}</strong> en auto.",
      porque: "`destinos.ts` (la-trinidad-xilitla): ~14 km y de 45 min a 1 h desde Xilitla, con tramo final de terracería empinada (12 km no cuadraba con sus «8 + 4»). Ciudad Valles–Xilitla es hora y media (Manolo, `MINUTOS_VALLES_XILITLA`), no 110 km / 2 h 15.",
    },
    {
      from: "suele llegar a Xilitla entre las <strong>13:00 y las 14:00 h</strong>",
      to: "suele llegar a Xilitla entre las <strong>15:00 y las 16:00 h</strong>",
      porque: "`tours.ts` (olla-de-la-luz): el regreso al hospedaje en Xilitla es de 3:00 a 4:00 PM.",
    },
    {
      from: "<strong>$1,800 MXN</strong> · <strong>~6 h</strong></td><td>Incluye bosque de niebla, miradores del cerro de la luz y cueva del salitre</td>",
      to: "<strong>$1,800 MXN</strong> · <strong>~8–9 h</strong></td><td>Incluye bosque de niebla, miradores del cerro de la luz y el borde de la Olla</td>",
      porque: "`tours.ts` (olla-de-la-luz): dura de 8 a 9 horas y sus destinos son La Trinidad, los miradores del Cerro de la Luz y la Olla; la Cueva del Salitre no va incluida.",
    },
    {
      from: "<strong>$1,700 MXN</strong> · <strong>~5 h</strong></td>",
      to: "<strong>$1,700 MXN</strong> · <strong>~7–8 h</strong></td>",
      porque: "`tours.ts` (amanecer-de-nubes): dura de 7 a 8 horas.",
    },
    {
      from: "<tr><td>Acceso independiente (vehículo propio)</td><td><strong>$80 MXN</strong> cobro comunitario · <strong>~35-50 min</strong> desde Xilitla</td><td>Requiere 4×4 en temporada de lluvias; sin guía ni seguro incluido</td></tr>",
      to: "<tr><td>Acceso independiente (vehículo propio hasta La Trinidad)</td><td><strong>$100 MXN</strong> de entrada + guía de la comunidad · <strong>45 min a 1 h</strong> desde Xilitla</td><td>A la Olla solo se entra con guía local de La Trinidad; vehículo alto o 4×4 en lluvias</td></tr>",
      porque: "`destinos.ts`: entrada a La Trinidad $100 (no $80), 45 min a 1 h desde Xilitla, y a la Olla «no se puede llegar por cuenta propia»: es obligatorio el guía de la comunidad (~$150–$250 por grupo).",
    },
    {
      from: "¿Quieres vivir olla de la luz con guía experto?",
      to: "¿Quieres conocer la Olla de la Luz con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin artículo ni mayúsculas).",
    },
    {
      from: "es una depresión natural en forma de embudo dentro del bosque de niebla de La Trinidad, Xilitla. Su nombre describe el efecto que ocurre entre las 7:00 y las 9:30 h: los rayos solares perforan el dosel vegetal",
      to: "es un sótano de 233 metros de diámetro y 193 de profundidad dentro del bosque de niebla de La Trinidad, Xilitla. Su nombre describe el efecto que ocurre hacia el mediodía: los rayos solares entran casi en vertical",
      porque: "`destinos.ts` (olla-de-la-luz): sótano de 233 m × 193 m; la luz alcanza el fondo con el sol alto, no de 7:00 a 9:30 (nuestro tour llega al borde a las 11:45).",
    },
    {
      from: "e incluye transporte, guía certificado y equipo básico para la cueva. Si vas por cuenta propia, el cobro comunitario en el ejido de La Trinidad es de <strong>$80 MXN por persona</strong>,",
      to: "e incluye transporte, guía certificado, la caminata guiada y equipo de seguridad (la Cueva del Salitre no va incluida). Si vas por cuenta propia, la entrada a La Trinidad es de <strong>$100 MXN por persona</strong> y el guía de la comunidad es obligatorio,",
      porque: "`tours.ts` (olla-de-la-luz) no incluye la Cueva del Salitre; `destinos.ts`: entrada a La Trinidad $100 y a la Olla solo se llega con guía local.",
    },
    {
      from: "Llegar antes de las <strong>7:00 h</strong> es clave en cualquier época.",
      to: "Salir temprano es clave en cualquier época: la caminata desde La Trinidad es de unas <strong>2 horas</strong>.",
      porque: "La luz entra al fondo con el sol alto, no al amanecer; lo que obliga a madrugar es la caminata de unas 2 horas (`tours.ts`, olla-de-la-luz).",
    },
    {
      from: "limitados a un máximo de <strong>8 personas</strong>",
      to: "limitados a un máximo de <strong>12 personas</strong>",
      porque: "`tours.ts` (olla-de-la-luz): groupMax 12.",
    },
  ],
  "precios-presupuesto-para-viajar-a-xilitla-cuanto-cuesta-un-fin": [
    {
      from: "declarada Pueblo Mágico en 2012",
      to: "declarada Pueblo Mágico en 2011",
      porque: "Xilitla recibió el nombramiento de Pueblo Mágico en 2011, no en 2012.",
    },
    {
      from: "Los grupos que coordinamos siempre reservan en línea con al menos 48 horas de anticipación,",
      to: "Los grupos que coordinamos siempre reservan su turno en el sistema oficial con al menos 48 horas de anticipación,",
      porque: "El mismo artículo (y `destinos.ts`, las-pozas-jardin-surrealista) dice que por ahora no hay venta en línea: el turno se reserva gratis y se paga en taquilla.",
    },
    {
      from: ">Reserva el tour a precios xilitla</a>",
      to: ">Reserva tu tour en Xilitla</a>",
      porque: "Frase rota de plantilla («Reserva el tour a precios xilitla»).",
    },
    {
      from: "<figcaption>Precios xilitla 2026: las esculturas de concreto de Las Pozas, jardín surrealista de Edward James en la Sierra Potosina, Xilitla, San Luis Potosí.</figcaption>",
      to: "<figcaption>Precios xilitla 2026: vendedoras en el tianguis de Xilitla, con verduras, hierbas y flores de la Sierra Potosina.</figcaption>",
      porque: "La foto es del tianguis de Xilitla (xilitla-pueblo-magico/tianguis.jpg, y así lo dice su alt), no de las esculturas de Las Pozas.",
    },
    {
      from: "Xilitla queda a aproximadamente <strong>100 km por carretera</strong>, un trayecto que en condiciones normales toma entre <strong>2 y 2.5 horas</strong> por la ruta estatal.",
      to: "Xilitla queda a <strong>{{vallesXilitla}}</strong> por carretera en condiciones normales.",
      porque: "Ciudad Valles–Xilitla es hora y media en auto (Manolo, `MINUTOS_VALLES_XILITLA`), no 2 a 2.5 h; el kilometraje no tiene fuente y se quita.",
    },
    {
      from: "Según operadores locales de la Huasteca Potosina, más del <strong>35 % de los visitantes en 2026</strong> combinan",
      to: "Muchos visitantes combinan",
      porque: "Porcentaje sin respaldo (35 % de los visitantes): se quita la cifra.",
    },
    {
      from: "el trayecto es de aproximadamente <strong>330 km y 4.5 horas</strong> en coche.",
      to: "el trayecto es de unas <strong>{{auto:san-luis-potosi}}</strong> en coche.",
      porque: "`tiemposDeViaje.ts`: San Luis Potosí–Xilitla son 5 h en auto (por Rioverde y Jalpan); los 330 km / 4.5 h no tienen fuente.",
    },
    {
      from: "<td>~$350 MXN gasolina / 2.5 h</td>",
      to: "<td>~$350 MXN gasolina / {{vallesXilitla}}</td>",
      porque: "Ciudad Valles–Xilitla es hora y media en auto (Manolo, `MINUTOS_VALLES_XILITLA`).",
    },
    {
      from: "¿Quieres vivir precios xilitla con guía experto?",
      to: "¿Quieres conocer Xilitla con guía experto?",
      porque: "Frase rota de plantilla («¿Quieres vivir precios xilitla…?»).",
    },
    {
      from: "Según guías locales y operadores de la Huasteca Potosina, Xilitla recibe más de <strong>8,000 visitantes mensuales en temporada alta (diciembre–febrero) de 2026</strong>, lo que convierte",
      to: "En temporada alta (diciembre–febrero) Xilitla se llena de visitantes, lo que convierte",
      porque: "Cifra de visitantes sin respaldo (8,000 al mes): se quita el número y queda la idea.",
    },
  ],
  "la-trinidad-el-bosque-de-niebla-de-xilitla-guia": [
    {
      from: "Según los operadores locales que trabajan en la zona, <strong>más de 3,500 visitantes subieron a La Trinidad durante la temporada alta de 2025</strong>, un número que sigue creciendo conforme",
      to: "La Trinidad recibe cada vez más visitantes conforme",
      porque: "Cifra de visitantes sin respaldo (3,500 en la temporada alta de 2025): se quita el número y queda la idea.",
    },
    {
      from: "La entrada en 2026 cuesta <strong>$50 MXN por adulto</strong> y <strong>$25 MXN por menor</strong> según el sitio oficial de la comunidad, aunque conviene confirmar al reservar porque algunas fuentes registran <strong>$100 MXN</strong>.",
      to: "La entrada en 2026 cuesta <strong>$100 MXN por persona</strong>; conviene confirmarlo al reservar.",
      porque: "`destinos.ts` (la-trinidad-xilitla): entrada de $100 por persona; el artículo daba $50/$25 como dato oficial y $100 como duda.",
    },
    {
      from: "el mirador del Cerro del Pilón, a 1,950 m sobre el nivel del mar.</figcaption>",
      to: "el mirador del Cerro del Pilón, por encima del bosque de La Trinidad.</figcaption>",
      porque: "Los ~1,950 m son la altitud de La Trinidad (`destinos.ts`); la cima del Cerro del Pilón queda bastante más arriba (el Amanecer de Nubes sube casi 2 horas desde ahí, `tours.ts`), así que la cifra no era del mirador.",
    },
    {
      from: "entrada solo visita <strong>$50 MXN adultos / $25 MXN menores</strong>; cabaña con hospedaje <strong>$500 MXN por persona</strong>;",
      to: "entrada solo visita <strong>$100 MXN por persona</strong>; cabañas para parejas y grupos de <strong>$700 a $2,500 MXN</strong>;",
      porque: "`destinos.ts` (la-trinidad-xilitla): entrada $100 por persona y cabañas para parejas y grupos de $700 a $2,500 aparte.",
    },
    {
      from: "Xilitla pueblo queda a <strong>~85 km</strong> por la Carretera Federal 85 hasta Tamazunchale y luego la 120 hacia Xilitla, con un tiempo estimado de <strong>1 hora 20 minutos</strong> en condiciones normales.",
      to: "Xilitla pueblo queda a <strong>{{vallesXilitla}}</strong> por la Carretera Federal 85 con dirección a Tamazunchale y, antes de llegar, la 120 hacia Xilitla por Huichihuayán, en condiciones normales.",
      porque: "Ciudad Valles–Xilitla es hora y media (Manolo, `MINUTOS_VALLES_XILITLA`), no 1 h 20; el entronque a Xilitla está antes de Tamazunchale (la 120 sale de la 85 por Huichihuayán, `destinos.ts`, cueva-del-salitre); los ~85 km no tienen fuente.",
    },
    {
      from: "sale desde Xilitla a las <strong>5:00 h</strong> y regresa antes del mediodía.",
      to: "sale desde Xilitla entre las <strong>3:00 y las 4:00 h</strong> y regresa antes del mediodía.",
      porque: "`tours.ts` (amanecer-de-nubes): la recogida es de 3:00 a 4:00 AM y el regreso de 10:00 a 11:00 AM.",
    },
    {
      from: "Según guías locales de la región, <strong>aproximadamente el 30% de los visitantes que suben solos tienen algún contratiempo</strong> relacionado con el acceso —llanta ponchada, vehículo atascado o equivocación de ruta— en 2025.",
      to: "Según guías locales de la región, es frecuente que quienes suben solos tengan algún contratiempo relacionado con el acceso —llanta ponchada, vehículo atascado o equivocación de ruta—.",
      porque: "Porcentaje sin respaldo (30 % de los visitantes): se quita la cifra.",
    },
    {
      from: "<td><strong>$50 MXN</strong> entrada + combustible / <strong>~2 h</strong> desde Valles</td>",
      to: "<td><strong>$100 MXN</strong> entrada + combustible / <strong>~2.5 h</strong> desde Valles</td>",
      porque: "`destinos.ts` (la-trinidad-xilitla): entrada $100; desde Valles son hora y media a Xilitla (Manolo) más 45 min a 1 h de subida.",
    },
    {
      from: "¿Quieres vivir la trinidad xilitla con guía experto?",
      to: "¿Quieres conocer La Trinidad con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin mayúsculas).",
    },
    {
      from: "La entrada a La Trinidad Xilitla cuesta <strong>$50 MXN por adulto</strong> y <strong>$25 MXN por menor</strong> según el sitio oficial de la comunidad. Algunas fuentes registran <strong>$100 MXN</strong>, por lo que se recomienda confirmar al hacer la reserva. El hospedaje en cabaña cuesta <strong>$500 MXN por persona</strong>",
      to: "La entrada a La Trinidad Xilitla cuesta <strong>$100 MXN por persona</strong>; se recomienda confirmarlo al hacer la reserva. Las cabañas para parejas y grupos cuestan de <strong>$700 a $2,500 MXN</strong>",
      porque: "`destinos.ts` (la-trinidad-xilitla): entrada $100 por persona y cabañas de $700 a $2,500.",
    },
    {
      from: "en cabaña dentro del predio por <strong>$500 MXN por persona</strong>",
      to: "en cabaña dentro del predio (de <strong>$700 a $2,500 MXN</strong> según el tamaño)",
      porque: "`destinos.ts` (la-trinidad-xilitla): cabañas para parejas y grupos de $700 a $2,500.",
    },
  ],
  "cascada-de-tamul-la-guia-definitiva-para-visitarla": [
    {
      from: "Según datos de operadores locales de la Huasteca Potosina, <strong>más de 9,000 visitantes</strong> recorren la ruta en lancha hacia la cascada durante el mes de agosto de 2026, lo que convierte julio y agosto en los meses de mayor demanda.",
      to: "Julio y agosto son los meses de mayor demanda en la ruta en lancha hacia la cascada.",
      porque: "Cifra de visitantes sin respaldo (9,000 en agosto): se quita el número y queda la idea.",
    },
    {
      from: "se ubica a aproximadamente <strong>una hora en coche</strong> desde Ciudad Valles.",
      to: "se ubica a unos <strong>45 minutos en coche</strong> desde Ciudad Valles hasta el embarcadero de Tanchachín.",
      porque: "La tabla del propio artículo y `destinos.ts` (cascada-de-tamul): 45 min desde Valles hasta Tanchachín, no «una hora».",
    },
    {
      from: "¿Quieres vivir cascada de tamul con guía experto?",
      to: "¿Quieres conocer la Cascada de Tamul con guía experto?",
      porque: "Frase rota de plantilla (palabra clave pegada sin artículo ni mayúsculas).",
    },
  ],
  "cafe-de-altura-xilitla": [
    {
      from: "presentaciones musicales que incluyen el <strong>papan huasteco</strong>, ritmo ancestral que acompaña las celebraciones de la sierra.",
      to: "presentaciones musicales de <strong>son huasteco</strong>, el ritmo que acompaña las celebraciones de la sierra.",
      porque: "El papán huasteco es un ave (y el nombre de un restaurante de Xilitla), no un ritmo musical; la música de las fiestas de la sierra es el son huasteco (huapango).",
    },
    {
      from: "El huapango y el <strong>papan huasteco</strong> son el fondo sonoro perfecto",
      to: "El huapango es el fondo sonoro perfecto",
      porque: "El papán huasteco es un ave, no una música.",
    },
    {
      from: "Desde Ciudad Valles hay aproximadamente 110 km por carretera.",
      to: "Desde Ciudad Valles hay {{vallesXilitla}} por carretera.",
      porque: "Ciudad Valles–Xilitla es hora y media en auto (Manolo, `MINUTOS_VALLES_XILITLA`); los 110 km no tienen fuente.",
    },
    {
      from: "las pozas de Tamasopo, las cascadas de Tamul o el Cañón del Río Blanco.",
      to: "las pozas de Tamasopo o las cascadas de Tamul.",
      porque: "El Cañón del Río Blanco está en Veracruz (Orizaba), no en la Huasteca Potosina.",
    },
    {
      from: "¿Quieres vivir café de altura con guía experto?",
      to: "¿Quieres conocer los cafetales de Xilitla con guía experto?",
      porque: "Frase rota de plantilla («¿Quieres vivir café de altura…?»).",
    },
    {
      from: "<p>Nuestro planificador con IA arma tu recorrido en minutos.</p>",
      to: "<p>Nosotros armamos el recorrido: hotel en Xilitla, tours y traslados en un solo paquete, con fechas y precio en firme.</p>",
      porque: "Prometía un planificador con IA que está apagado y el botón ya lleva a /paquetes (lo reescribe la plantilla); esta variante corta de la frase se le escapaba a la plantilla.",
    },
    {
      from: "música de <strong>papan huasteco</strong>",
      to: "música de <strong>son huasteco</strong>",
      porque: "El papán huasteco es un ave (y un restaurante de Xilitla), no un género musical.",
    },
  ],
  "itinerario-huasteca-potosina-3-dias-3-dias-en-la-huasteca-po": [
    {
      from: "van desde <strong>$30 MXN</strong> en el Sótano de las Golondrinas hasta <strong>$150 MXN</strong> en las Cascadas de Tamasopo,",
      to: "van desde <strong>{{entrada:cascadas-de-tamasopo}}</strong> en las Cascadas de Tamasopo hasta <strong>{{entrada:cascada-de-tamul}}</strong> en la Cascada de Tamul,",
      porque: "`destinos.ts`: Golondrinas cuesta $100 (no $30), Tamasopo $60 (los $150 son del Puente de Dios) y lo más caro es Tamul, $220 + $300 de panga.",
    },
    {
      from: "La entrada cuesta <strong>$50 MXN</strong> por persona y el acceso se hace en lancha",
      to: "La entrada cuesta <strong>{{entrada:cascada-de-tamul}}</strong> y el acceso se hace en lancha",
      porque: "`destinos.ts` (cascada-de-tamul): $220 de entrada + $300 de panga por persona, no $50.",
    },
    {
      from: "la entrada es de solo <strong>$30 MXN</strong>",
      to: "la entrada es de <strong>{{entrada:sotano-de-las-golondrinas}}</strong>",
      porque: "`destinos.ts` (sotano-de-las-golondrinas): la entrada cuesta $100.",
    },
    {
      from: "¿Quieres vivir itinerario huasteca potosina 3 dias con guía experto?",
      to: "¿Quieres recorrer la Huasteca Potosina con guía experto?",
      porque: "Frase rota de plantilla («¿Quieres vivir itinerario huasteca potosina 3 dias…?»).",
    },
    {
      from: "Solo en entradas, calcula entre <strong>$400 y $500 MXN</strong> por persona para los seis sitios principales.",
      to: "Solo en entradas, calcula alrededor de <strong>$1,000 MXN</strong> por persona para los seis sitios principales (la panga de Tamul es la mayor parte).",
      porque: "Con los precios de `destinos.ts` las entradas suman más de $900 antes de la Cueva del Agua: Tamul $220 + $300 de panga, Golondrinas $100, Micos $100, Tamasopo $60 y Puente de Dios $150.",
    },
  ],
  "itinerario-xilitla-itinerario-perfecto-de-3-dias-en-xilitla": [
    {
      from: "entre las <strong>9:00 y 9:30 am</strong>, con regreso aproximado",
      to: "entre las <strong>8:00 y 9:00 am</strong>, con regreso aproximado",
      porque: "`tours.ts`: la Ruta Surrealista y la Expedición Tamul recogen de 8:00 a 9:00 AM, no de 9:00 a 9:30.",
    },
    {
      from: ">Reserva el tour a itinerario xilitla</a> con traslado incluido desde Ciudad Valles.",
      to: ">Reserva tu tour en Xilitla</a>, con traslado desde tu hospedaje.",
      porque: "Frase rota de plantilla («Reserva el tour a itinerario xilitla»); y el traslado desde Ciudad Valles a la Ruta Surrealista no va incluido: cuesta $400 más por reserva (`tours.ts`, cargoValles).",
    },
    {
      from: "el avistamiento de guacamayas en el <strong>Sótano de las Huahuas</strong>",
      to: "el avistamiento de vencejos y pericos en el <strong>Sótano de las Huahuas</strong>",
      porque: "En el Sótano de las Huahuas no hay guacamayas: las aves son vencejos y pericos (`tours.ts`, expedicion-tamul: «loros y vencejos»).",
    },
    {
      from: "La salida recomendada es al amanecer para no perderse el vuelo masivo de las aves.</p>\n<p>Después del mediodía, el tiempo libre en Xilitla permite visitar la zona arqueológica cercana.</p>",
      to: "Las aves salen del sótano en la mañana y regresan en la tarde: la Expedición Tamul llega a tiempo para verlas volver.</p>",
      porque: "Se contradecía: el Sótano va «al atardecer» en la Expedición Tamul y a la vez «al amanecer». Manolo confirma que las aves salen en la mañana y regresan en la tarde. Y no hay «tiempo libre después del mediodía» (el tour dura 12–13 h) ni zona arqueológica cerca de Xilitla (Tamtoc y Tamohi están en Tamuín).",
    },
    {
      from: "alt=\"qué hacer en 3 días guía viaje Huasteca Potosina\"",
      to: "alt=\"Arcos y columnas de concreto junto a una poza de agua verde en Las Pozas de Edward James, Xilitla\"",
      porque: "La foto es de Las Pozas de Edward James (arcos y columnas de concreto sobre una poza), no un paisaje genérico.",
    },
    {
      from: "<figcaption>Itinerario Xilitla: manantiales y selva exuberante en la sierra de la Huasteca Potosina, uno de los paisajes que enmarcan cada jornada del recorrido.</figcaption>",
      to: "<figcaption>Itinerario Xilitla: arcos y columnas de concreto junto a una poza en Las Pozas de Edward James, la visita del primer día.</figcaption>",
      porque: "El pie hablaba de «manantiales y selva»; la foto es de las estructuras de Las Pozas.",
    },
    {
      from: "¿Quieres vivir itinerario xilitla con guía experto?",
      to: "¿Quieres conocer Xilitla con guía experto?",
      porque: "Frase rota de plantilla («¿Quieres vivir itinerario xilitla…?»).",
    },
    {
      from: "Los tours salen de Ciudad Valles entre las <strong>9:00 y 9:30 am</strong> con transporte incluido desde el hotel. El recorrido de ida toma aproximadamente <strong>2 horas</strong> por carretera serrana.",
      to: "Los tours salen de Ciudad Valles entre las <strong>8:00 y 9:00 am</strong> con transporte desde el hotel. El recorrido de ida toma aproximadamente <strong>{{vallesXilitla}}</strong> por carretera serrana.",
      porque: "`tours.ts`: recogida de 8:00 a 9:00 AM. Ciudad Valles–Xilitla es hora y media (Manolo, `MINUTOS_VALLES_XILITLA`), no 2 horas.",
    },
  ],
  "rafting-rio-tampaon-rafting-en-el-rio-tampaon-la-experiencia-definitiv": [
    {
      campo: "coverImageAlt",
      from: "rafting rio tampaon Rafting de aventura en el Río Tampaón, la experiencia más emocionante de la Huasteca Huasteca Potosina 2026",
      to: "Grupo con cascos y chalecos remando en una balsa entre los rápidos del Río Tampaón, en la Huasteca Potosina",
      porque: "El alt traía la palabra clave pegada y «Huasteca Huasteca» repetido; ahora describe la foto (una balsa con su grupo en los rápidos).",
    },
    {
      from: "Según operadores locales de la región, el Tampaón recibe más de <strong>8,000 visitantes</strong> por temporada alta entre octubre y marzo de 2026, lo que lo convierte en uno de los ríos",
      to: "El Tampaón es uno de los ríos",
      porque: "Cifra de visitantes sin respaldo (8,000 por temporada): se quita el número y queda la idea.",
    },
    {
      from: "la <strong>carretera 70</strong> durante aproximadamente <strong>30 km</strong> hasta llegar a la comunidad de Tanchachín,",
      to: "la <strong>carretera 70</strong> hasta el desvío al Ejido Tanchachín (los últimos 18 km son de terracería transitable),",
      porque: "`destinos.ts` (rio-tampaon-rafting): «Carretera 70 → desvío Ejido Tanchachín · Últimos 18 km terracería transitable»; los 30 km no tienen fuente.",
    },
    {
      from: "El trayecto en auto tarda alrededor de <strong>40 minutos</strong>. Las operadoras con servicio de transporte salen desde Ciudad Valles a las <strong>9:00 am</strong> y llegan al río cerca de las <strong>10:30 am</strong>.",
      to: "El trayecto en auto tarda alrededor de <strong>45 minutos</strong>. Nuestro rafting pasa por ti a tu hospedaje entre las <strong>8:00 y las 9:00 am</strong> y llega al embarcadero hacia las <strong>9:30 am</strong>.",
      porque: "`destinos.ts` (rio-tampaon-rafting): 45 min desde Valles; salir a las 9:00 y llegar a las 10:30 no cuadraba con 40 min de camino. `tours.ts` (rafting-rio-tampaon): recogida de 8:00 a 9:00 y embarcadero a las 9:30.",
    },
    {
      from: "con un mínimo de <strong>4 personas</strong> por grupo. El descenso finaliza alrededor de las <strong>3:00 pm</strong>, con comida incluida en la mayoría de los paquetes, y el regreso a Ciudad Valles se completa hacia las <strong>5:30 pm</strong>.",
      to: "con un mínimo de <strong>5 personas</strong> por grupo. El descenso y la comida (incluida) terminan hacia las <strong>3:00 pm</strong>, y de ahí se regresa a tu hospedaje.",
      porque: "`tours.ts` (rafting-rio-tampaon): grupo mínimo de 5, la comida va incluida y el regreso al hospedaje empieza a las 3:00 PM (el tour dura unas 7 horas, no hasta las 5:30).",
    },
    {
      from: "pueden contratar lanchas locales desde <strong>$700 hasta $1,000 MXN por embarcación</strong>, con capacidad para hasta <strong>8 personas</strong>.",
      to: "pueden contratar el paseo en panga a la Cascada de Tamul (<strong>{{entrada:cascada-de-tamul}}</strong>), que es un recorrido en canoa, no de rafting.",
      porque: "En Tanchachín las pangas son las del paseo a Tamul y `destinos.ts` (cascada-de-tamul) las cobra $220 de entrada + $300 por persona; los «$700–$1,000 por lancha» no tienen fuente y no son rafting.",
    },
    {
      from: "<tr><td>Lancha local (Tanchachín)</td><td><strong>$700–$1,000 MXN/embarcación</strong></td><td>Embarcación para hasta 8 personas</td></tr>",
      to: "<tr><td>Panga a Tamul (Tanchachín)</td><td><strong>{{entrada:cascada-de-tamul}}</strong></td><td>Paseo en canoa a la cascada; no es rafting</td></tr>",
      porque: "`destinos.ts` (cascada-de-tamul): $220 de entrada + $300 de panga por persona; la «lancha local de $700–$1,000» no tiene fuente.",
    },
    {
      from: "¿Quieres vivir rafting rio tampaon con guía experto?",
      to: "¿Quieres hacer rafting en el Río Tampaón con guía experto?",
      porque: "Frase rota de plantilla («¿Quieres vivir rafting rio tampaon…?»).",
    },
    {
      from: "Ir por cuenta propia y contratar lancha local en Tanchachín cuesta entre <strong>$700 y $1,000 MXN por embarcación</strong>.",
      to: "Por tu cuenta, en Tanchachín se contrata el paseo en panga a Tamul (<strong>{{entrada:cascada-de-tamul}}</strong>), que es en canoa, no de rafting.",
      porque: "`destinos.ts` (cascada-de-tamul): $220 de entrada + $300 de panga por persona; los $700–$1,000 por lancha no tienen fuente.",
    },
    {
      from: "El trayecto desde Ciudad Valles es de aproximadamente <strong>30 km</strong> por carretera 70, unos <strong>40 minutos</strong> en auto.",
      to: "El trayecto desde Ciudad Valles es de unos <strong>45 minutos</strong> en auto por la carretera 70.",
      porque: "`destinos.ts` (rio-tampaon-rafting): 45 min desde Valles; los 30 km no tienen fuente.",
    },
    {
      from: "familias con menores desde los 10 años, dependiendo de la operadora.",
      to: "familias con menores desde los 8 años (la edad mínima de nuestro rafting).",
      porque: "`tourRequisitos.ts` (tour-rafting-tampaon, Manolo 2 oct 2026): la edad mínima del rafting es de 8 años.",
    },
  ],
};
