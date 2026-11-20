/**
 * destinoData.ts
 * Datos complementarios por destino: narrativa emocional, combinaciones sugeridas
 * y reseñas mapeadas. Se importa en la página de destino individual.
 */

import type { Locale } from "./i18n/config";
import { NARRATIVA_DESTINO_EN } from "./i18n/narrativasDestino.en";

// ── Narrativas emocionales (3-4 líneas antes de Datos prácticos) ─────────────
// 🔴 Su traducción vive en `i18n/narrativasDestino.en.ts` con las MISMAS llaves.
// Si agregas o cambias una aquí, haz lo mismo allá: `narrativasSinPareja()`
// (más abajo) lista las que no cuadran.

export const NARRATIVA_DESTINO: Record<string, string> = {
  "las-pozas-jardin-surrealista":
    "Hay lugares que parecen el producto de un sueño particularmente vívido. Las Pozas de Edward James es uno de ellos: columnas de concreto que suben hacia ningún lado, escaleras que desafían la gravedad, flores de piedra de cuatro metros entre cascadas reales y helechos gigantes. El poeta excéntrico que las construyó nunca pretendió que tuvieran sentido. Ese es exactamente su poder.",

  "cascada-de-tamul":
    "La Cascada de Tamul no te avisa cuándo aparece. Remas por el Cañón del Tampaón entre una y dos horas, con paredes de roca a cada lado y el silencio amplificado por el agua, y de repente el río dobla y ahí está: 105 metros de caída libre, tan ancha que no cabe en ninguna foto que hayas tomado antes. Es el tipo de lugar que te hace entender por qué la gente llora de emoción en los viajes.",

  "sotano-de-las-golondrinas":
    "Las 5:45 AM en el borde del Sótano de las Golondrinas es una de las experiencias más extrañas que puede vivir un ser humano. Abajo: oscuridad absoluta a más de 370 metros. Luego empieza el sonido, antes de que veas nada. Después salen ellos: miles de vencejos en espiral ascendente, como un tornado de alas que dura veinte minutos. Y al atardecer, la segunda función: regresan al sótano. No es naturaleza. Es un ritual.",

  "cascadas-de-micos":
    "Las Cascadas de Micos son la respuesta perfecta a la pregunta '¿qué hacemos hoy?' en la Huasteca. Siete cascadas en circuito, tirolesa, kayak, bicicleta aérea y saltos a pozas de agua cristalina —todo en un solo lugar. Es el parque de aventuras más hermoso que hayas pisado, con la diferencia de que fue diseñado por la naturaleza hace millones de años.",

  "puente-de-dios-tamasopo":
    "Existe un arco de roca natural en Tamasopo por donde fluye un río, y entre las 11 y las 13 horas el sol entra perpendicular y convierte el agua en cristal líquido de color azul cobalto. Ese efecto de luz dura dos horas. Nuestros guías conocen exactamente cuándo llegarte para que lo veas. Puente de Dios no es un destino de paso — es una cita que hay que llegar a tiempo.",

  "siete-cascadas-tamasopo":
    "Son siete caídas de agua turquesa una tras otra, como una escalera que la roca fue tallando durante siglos. Se recorren saltando de poza en poza —con chaleco, casco y guía— y cada salto es distinto: hay uno para quien nunca ha saltado y hay otro para quien ya se está retando. Y si no quieres saltar ninguno, no pasa nada: el agua está igual de clara para quien solo quiere nadar y mirar hacia arriba.",

  "hacienda-los-gomez-tamasopo":
    "Después de un día de saltos y adrenalina, Hacienda Los Gómez es donde el cuerpo pide quedarse. Pequeñas cascadas cayendo sobre pozas turquesa, sabinos enormes que crecen dentro del agua y una sombra que baja la temperatura varios grados. No hay fila, no hay prisa, no hay nada que conquistar. Solo un río bonito y tiempo para no hacer nada — que en un viaje a la Huasteca es más raro de lo que parece.",

  "zona-arqueologica-tamtoc":
    "En Tamtoc, el tiempo se mide diferente. Aquí vivió, construyó y gobernó la cultura Huasteca durante más de 2,000 años antes de que existiera cualquier ciudad que hoy conoces. El Monumento 32 —una figura femenina de 30 toneladas— sigue mirando el horizonte desde el mismo punto donde la colocaron hace siglos. Visitarla al amanecer, cuando la niebla cubre el río Tampaón al fondo, es entender qué significa la antigüedad.",

  "cascadas-de-tamasopo":
    "Las Cascadas de Tamasopo tienen el agua más azul de la región. No el turquesa brillante de Tamul, sino un azul profundo, casi irreal, que surge de la piedra caliza y el mineral. El parque natural que las rodea permite nadar directamente en las pozas, bajo la caída del agua. Es el lugar donde más fotos toma la gente en toda la Huasteca —y por razones muy justificadas.",

  "balneario-taninul":
    "Las aguas termales de Taninul brotan a 38°C de la tierra de manera natural, rodeadas de palmas y jacarandas. Es el antídoto perfecto para un día de cascadas y caminatas: sumergirte en agua caliente mineral mientras el sol baja y la sierra se tiñe de naranja. Los locales lo llaman 'el spa de la Huasteca' y llevan décadas teniendo razón.",

  "cascadas-minas-viejas":
    "El agua de Minas Viejas tiene un color que no existe en ninguna paleta de colores que hayas visto: entre el jade y el turquesa, con reflejos blancos donde se rompe sobre las terrazas de travertino. Las cascadas caen en 5 niveles distintos, cada uno con una poza diferente. Es uno de esos lugares que produces en fotografía pero que no te crees del todo hasta que estás dentro.",

  "laguna-media-luna":
    "La Laguna de la Media Luna tiene una característica única: el agua nace directamente del fondo de la laguna, fresca y de un azul cristalino que se mantiene igual todo el año. Los buzos la conocen como uno de los mejores spots de buceo en agua dulce de toda Latinoamérica. Sin escafandra, simplemente nadas sobre un cristal azul que nunca cambia de color.",

  "cascada-el-aguacate":
    "La Cascada El Aguacate es el secreto mejor guardado de la ruta de cascadas. Menos visitada que sus vecinas, llega al final de un sendero entre helechos gigantes que huele a tierra húmeda y selva fresca. La poza que forma es perfecta para nadar: profunda, azul y a temperatura ideal. Para quienes prefieren el descubrimiento sobre el Instagram, esta es la cascada.",

  "cascada-el-salto":
    "La Cascada El Salto no tiene la fama de Tamul, pero tiene algo que pocas cascadas pueden ofrecer: se puede nadar directamente en su base, con el agua cayendo a metros de ti. El sonido que hace al golpear la roca es físico, lo sientes en el pecho. Combinada con El Meco, forma el dúo de cascadas turquesas más fotogénico de la región.",

  "cascada-el-meco":
    "El Meco tiene la reputación de ser la cascada con el agua más turquesa de la Huasteca. No es marketing: el mineral de calcio que disuelve la roca crea un color que los fotógrafos buscan específicamente. La clave es la hora: llegar entre las 9 y las 11 de la mañana, cuando la luz solar entra perpendicular al cañón. Nuestros guías saben exactamente cuándo posicionarse.",

  "sotano-de-las-huahuas":
    "El Sótano de las Huahuas es el hermano menor del Sótano de las Golondrinas —y tiene algo que su famoso vecino no tiene: accesibilidad y una experiencia más íntima. Las aves salen en espiral al amanecer, mientras la luz del sol apenas toca el borde del abismo, y regresan al atardecer. El ruido que hacen juntos, amplificado por las paredes de roca, es uno de los sonidos más extraños y hermosos que existen en la naturaleza.",

  "cuevas-de-mantetzulel":
    "Las Cuevas de Mantetzulel guardan un ecosistema subterráneo que muy pocos viajeros conocen: estalactitas de millones de años, murciélagos que navegan en la oscuridad y el eco de tu propia voz amplificado por cavernas de 30 metros de altura. La temperatura al interior es constante: 18°C, sin importar que afuera haga 38°C de calor.",

  "nacimiento-huichihuayan":
    "El agua del Nacimiento de Huichihuayán sale directamente de la tierra a exactamente 22°C, todo el año. No es un río, no es un lago: es un manantial que aflora rodeado de palmas, helechos y el silencio característico de los lugares que todavía no aparecen en las guías de turismo masivo. Esa temperatura perfecta —ni fría ni caliente— hace que te quieras quedar nadando para siempre.",

  "nacimiento-tambaque":
    "Tambaque es el nacimiento de agua más escondido de la zona, y eso es exactamente lo que lo hace especial. Para llegar hay que caminar por un sendero entre árboles de tamarindo salvaje. Al llegar: una poza de agua cristalina con árboles de sauce llorón colgando sobre el agua. Es el tipo de lugar donde la gente propone matrimonio y donde los fotógrafos gastan toda la tarjeta de memoria.",

  "voladores-tamaleton":
    "El ritual de los Voladores de Tamaletón tiene 2,000 años y ningún videojuego o película de acción lo ha igualado todavía: cuatro hombres atados por los tobillos a 30 metros de altura, girando en espiral descendente hacia la tierra mientras uno toca una flauta en la punta del mástil. Es un ritual prehispánico vivo, practicado por la misma comunidad indígena desde generaciones. Verlo en persona es entender que hay formas de arte que no caben en ningún museo.",

  "rio-tampaon-rafting":
    "El Río Tampaón es la arteria de toda la Huasteca. Sus aguas color jade corren por un cañón que los geólogos calculan en 200 millones de años de antigüedad. Hacer rafting por sus rápidos Clase III es navegar por la misma ruta que usaban los Huastecos para moverse entre comunidades hace siglos. La diferencia es que ahora también hay kayak, canoa y la certeza de que al final del recorrido hay una cascada de 105 metros esperándote.",

  "xilitla-pueblo-magico":
    "Xilitla no es solo el municipio donde viven Las Pozas de Edward James. Es un pueblo donde la sierra Huasteca cae hacia la selva en cascada de vegetación, donde el café de altura se tuesta en fogones de leña y donde los artesanos indígenas trabajan con técnicas de 800 años de antigüedad. El centro tiene una tranquilidad que las ciudades perdieron hace décadas. Quedarte una noche aquí cambia la perspectiva del viaje entero.",

  "aquismon-pueblo-magico":
    "Casi nadie viene a Aquismón a quedarse en Aquismón, y ahí está parte de su encanto: es la puerta de entrada tének a la Cascada de Tamul, a los sótanos y al río Tampaón. Pero antes de salir a la aventura vale la pena mirar su Parroquia de San Miguel Arcángel, levantada sobre un antiguo basamento huasteco. Nombrado Pueblo Mágico en 2018, su nombre en tének significa 'árbol al pie de un pozo': un buen resumen de un lugar donde la sierra y el agua se encuentran.",

  "rio-axtla-el-chalan":
    "El Río Axtla guarda un personaje: 'el chalán', una vieja balsa de fierro que desde hace más de medio siglo cruza el río jalada a mano, sin motor ni prisa. Alrededor, aguas cristalinas y pozas para nadar donde la vida del pueblo y el río se confunden. Es la Huasteca cotidiana, la que sucede lejos de las filas y los torniquetes.",

  "castillo-de-la-salud":
    "Si Xilitla tiene su jardín surrealista, Axtla tiene el suyo en clave de medicina tradicional. El Castillo de la Salud lo levantó en 1974 el herbolario náhuatl Don Beto Ramón, mezclando símbolos prehispánicos con pasajes bíblicos —la Torre de Babel, el Arca de Noé— alrededor de un jardín con cientos de plantas medicinales. Don Beto murió en 2004, pero dejó más de 150 fórmulas de herbolaria que aquí se siguen usando.",

  "cascada-los-comales":
    "A apenas unos pasos de la entrada de Las Pozas, Los Comales es el chapuzón perfecto para cerrar el día surrealista. Sus aguas semicálidas caen entre la selva en pozas donde nadar sin multitudes, y un temazcal de uso medicinal recibe grupos pequeños para quien quiera algo más que un baño. Está tan cerca de Edward James que sería un error no combinarlos.",

  "cascada-el-trampolin-tamasopo":
    "El Trampolín es el secreto a voces de Tamasopo: un tramo gratuito y público del río Agua Buena —no el parque de pago— donde el agua turquesa forma pozas, mini cascadas y, sí, cuerdas colgadas de los árboles para lanzarse de clavado. Se extiende unos dos kilómetros de río, así que siempre hay una poza para ti. La entrada cuesta cero y el recuerdo, mucho.",

  "zona-arqueologica-tamohi-el-consuelo":
    "Tamohí —'lugar de la efervescencia' en tének— es el otro gran sitio huasteco de Tamuín, distinto y a veces confundido con Tamtoc. En sus cerca de 210 hectáreas a orillas del Tampaón se levantan plataformas y basamentos de una ciudad prehispánica, y aquí, en 1917, se descubrió 'El Adolescente Huasteco', hoy una joya del Museo Nacional de Antropología. Caminarlo es pisar una de las cunas de la cultura huasteca.",

  "templo-san-juan-bautista-coxcatlan":
    "Frente a la plaza de Coxcatlán se alza uno de los templos más antiguos de la Huasteca Potosina: San Juan Bautista, templo y ex convento del siglo XVI. La tradición constructiva lo hace aún más memorable: sus muros se habrían levantado con piedra unida con una mezcla que incluía conchas marinas molidas. Es historia colonial en estado puro, lejos del circuito turístico.",

  "cascada-rancho-el-zapote-poza-azul-coxcatlan":
    "Los locales la llaman simplemente 'la poza azul', y el nombre le hace justicia: una cascada y poza de un turquesa vibrante a solo unos once minutos de la cabecera de Coxcatlán. Es de los rincones menos masificados de la Huasteca, justo el tipo de lugar que buscas cuando quieres el agua turquesa para ti solo. Un secreto que el estado apenas empieza a presumir.",

  "ruinas-de-el-jopoy-coxcatlan":
    "El Jopoy es ruina y memoria a la vez: los restos de una de las primeras ermitas españolas de la Huasteca, con muros de piedra y grandes arcos que el tiempo dejó a cielo abierto. Hoy la comunidad la usa como panteón, así que el silencio entre sus arcos tiene algo más íntimo. El INAH hizo aquí exploraciones preliminares hacia 2009, pero el lugar sigue siendo, sobre todo, de su gente.",

  "tancanhuitz":
    "Tancanhuitz se gana el corazón a pie: su parroquia de San Miguel Arcángel, encaramada al final de una larga escalinata, es famosa como la 'Iglesia de los 149 Escalones'. Pero lo que de verdad late aquí es la tradición tének-nahua —el huapango, las danzas y un Xantolo intenso que la vuelve parada obligada de la Ruta de Día de Muertos de la Huasteca. Subir esos escalones es solo el principio.",

  "san-martin-chalchicuautla":
    "A San Martín Chalchicuautla lo llaman la 'Cuna del Xantolo', y no es exageración: entre el 31 de octubre y el 2 de noviembre sus calles se llenan de comparsas de 'viejos' enmascarados que bailan huapango con una devoción que pone la piel de gallina. Si vas en temporada, el zacahuil, los bocoles y el queso de bola completan la fiesta; y cerca espera la Cascada del Manantial para el día siguiente. Es la Huasteca más ritual y viva.",

  "san-vicente-tancuayalab":
    "San Vicente Tancuayalab carga un título grande: el de 'cuna del Día de Muertos' en San Luis Potosí. Fundado por franciscanos en el siglo XVI cerca del río Moctezuma —y reubicado en 1767—, su nombre huasteco significa 'lugar del bastón de mando', y su Xantolo conserva esa autoridad ancestral. Es un destino para entender de dónde viene la tradición que el resto de México celebra.",

  "tanlajas":
    "Tanlajás —'lugar de lajas' en tének— guarda uno de los rituales más impactantes de la Huasteca: la 'Toreada de los Diablos', donde hombres enmascarados con cuernos, pieles y chirrión recrean la eterna lucha entre el bien y el mal. Las máscaras, talladas a mano en madera, valen el viaje por sí solas. Y entre danza y danza, la cocina tének —zacahuiles, bocoles, cecina— hace el resto.",

  "texquitote":
    "Si alguna vez has bailado un huapango, parte de su sonido nació aquí. Texquitote es la cuna de la laudería del son huasteco: cerca de cuarenta lauderos construyen a mano jaranas, quintas huapangueras, violines y arpas, y fue aquí donde nació la 'quinta huapanguera', la guitarra de cinco cuerdas del género. Entrar a un taller, con respeto y aviso previo, es ver nacer la música con las manos.",

  "laguna-de-los-suspiros":
    "El alma de la Laguna de los Suspiros no es el agua sino un árbol: un higuerón de unos doscientos años cuyas raíces gigantes se abren en dos 'puertas' naturales, el rincón más fotografiado del lugar. Es un paseo sencillo y tranquilo en el ejido de Plan de Iguala, de esos que premian al viajero curioso que se sale del mapa de siempre. Naturaleza sin prisa, en la Huasteca más callada.",

  "la-trinidad-xilitla":
    "Subir a La Trinidad es cambiar de mundo en una hora: del calor de Xilitla al frío y la neblina de uno de los bosques mejor conservados de la Huasteca, a casi dos mil metros. Es una comunidad náhuatl de apenas un centenar de habitantes donde puedes dormir en cabaña, acampar, encender una fogata, asar tu comida y caminar entre madroños enormes hasta miradores, pozas y sótanos. Lo mejor no es un atractivo en particular, sino la sensación de estar muy lejos de todo.",

  "olla-de-la-luz":
    "Coronando el punto más alto del municipio de Xilitla, la Olla de la Luz es un abismo que impone: un sótano de 233 metros de diámetro y 193 de caída vertical, escondido en lo alto del bosque de niebla. Llegar es parte del premio —una caminata guiada desde La Trinidad, entre pinos y madroños— y asomarse a su boca es una de esas vistas que recalibran la escala de las cosas. No es para ir solo: aquí el guía es tu seguro de vida.",

  "cueva-del-salitre":
    "A pocos minutos del centro surrealista de Xilitla, la Cueva del Salitre es el lado de adrenalina del Pueblo Mágico: cien metros de boca por trescientos de fondo, con paredes que los escaladores han convertido en cinco rutas y un interior hecho para la espeleología y el rappel. Su nombre viene del salitre que escurre por la roca húmeda. Es la prueba de que en Xilitla la aventura empieza casi en la plaza.",

  "museo-leonora-carrington-xilitla":
    "Xilitla no se entiende solo con Edward James: su amiga, la pintora surrealista Leonora Carrington, tiene aquí su propio museo en pleno centro. Entre escultura, litografía y dibujo, sus criaturas oníricas dialogan a la perfección con el jardín de Las Pozas que está a unos minutos; de hecho, verlos el mismo día es la ruta surrealista perfecta. Un remanso de arte para equilibrar tanta naturaleza.",
};

/**
 * La narrativa de un destino en el idioma de la página.
 *
 * 🔴 En inglés NUNCA cae al español: si falta la traducción, la ficha EN sale
 * sin narrativa. Hasta el 10 nov 2026 la ficha EN la escondía entera; un
 * párrafo en español sin `lang="es"` en una página en inglés es peor que nada
 * (lo lee mal el lector de pantalla y Google ve una página mezclada).
 */
export function narrativaDestino(slug: string, locale: Locale): string | undefined {
  return locale === "en" ? NARRATIVA_DESTINO_EN[slug] : NARRATIVA_DESTINO[slug];
}

/**
 * Llaves que están en un idioma y no en el otro (vacío = todo cuadra). Existe
 * para que una prueba lo vigile: un destino nuevo con narrativa solo en
 * español no rompe nada, pero se queda sin ella en /en sin que nadie lo note.
 */
export function narrativasSinPareja(): string[] {
  const es = Object.keys(NARRATIVA_DESTINO);
  const en = Object.keys(NARRATIVA_DESTINO_EN);
  return [
    ...es.filter((k) => !(k in NARRATIVA_DESTINO_EN)).map((k) => `falta en inglés: ${k}`),
    ...en.filter((k) => !(k in NARRATIVA_DESTINO)).map((k) => `sobra en inglés: ${k}`),
  ];
}

// ── Las páginas dueñas de las OTRAS búsquedas del lugar (Fase 3 SEO) ─────────

/** Un enlace de la ficha a otra página nuestra que es dueña de otra búsqueda del mismo lugar. */
export interface GuiaDeDestino {
  /** Ruta interna: un artículo del blog (sin sufijo de año) o una página. */
  href: string;
  /** Rótulo pequeño encima del ancla. */
  rotulo: string;
  /** El ancla dice la intención de la página a la que lleva. */
  ancla: string;
}

/**
 * 🔴 10 nov 2026 (Fase 3 SEO). La ficha enlazaba al artículo del lugar con el
 * ancla «Guía completa de {lugar}» (`blogDeDestino`). Donde la DUEÑA del
 * nombre del lugar es la ficha (Xilitla, Golondrinas, Minas Viejas,
 * Huichihuayán, Tamtoc), esa ancla le decía a Google lo contrario: que la guía
 * del lugar era el artículo. Aquí cada enlace lleva el ancla de la intención
 * que ese artículo sí conserva (la experiencia, la historia, el clima…).
 * Las Pozas enlaza a sus DOS artículos: boletos (precio y horario) y la guía
 * de la visita. Donde el dueño es el artículo (Tamul, Micos, Puente de Dios)
 * se queda el enlace de siempre, que sí dice «Guía completa».
 *
 * Solo en español: los artículos del blog todavía no tienen versión en inglés
 * (en /en la ficha sigue con su comportamiento de antes).
 */
export const GUIAS_BLOG_DESTINO: Record<string, GuiaDeDestino[]> = {
  "xilitla-pueblo-magico": [
    { rotulo: "Qué hacer", href: "/blog/hacer-guia-definitiva-para-visitar-xilitla-todo-lo-que-necesitas-saber", ancla: "Qué hacer en Xilitla: atracciones, precios y tours" },
    { rotulo: "Clima", href: "/blog/mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par", ancla: "Clima en Xilitla mes a mes y mejor época para ir" },
    { rotulo: "Las Pozas", href: "/blog/boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james", ancla: "Boletos de Las Pozas: precio, horario y cómo reservar" },
    // La página la crea otra tarea de la misma fase (Fase 4).
    { rotulo: "Dónde dormir", href: "/donde-hospedarse-en-la-huasteca-potosina", ancla: "Dónde hospedarse en la Huasteca Potosina, por zonas" },
  ],
  "las-pozas-jardin-surrealista": [
    { rotulo: "Precio y horario", href: "/blog/boletos-las-pozas-preguntas-frecuentes-sobre-el-jardin-de-edward-james", ancla: "Boletos de Las Pozas: precio, horario y cómo reservar" },
    { rotulo: "La visita", href: "/blog/las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece", ancla: "Cómo visitar Las Pozas: qué ver y cuánto tiempo" },
  ],
  "sotano-de-las-golondrinas": [
    { rotulo: "La experiencia", href: "/blog/sotano-de-las-golondrinas-la-cueva-mas-profunda-de-mexico", ancla: "Así se vive el vuelo de las aves en Golondrinas" },
  ],
  "cascadas-minas-viejas": [
    { rotulo: "La experiencia", href: "/blog/cascadas-de-minas-viejas-guia-completa", ancla: "Minas Viejas: rappel, pozas turquesa y consejos reales" },
  ],
  "nacimiento-huichihuayan": [
    { rotulo: "La experiencia", href: "/blog/nacimiento-de-huichihuayan-la-joya-escondida-de-la-huasteca", ancla: "Cómo es nadar en el Nacimiento de Huichihuayán" },
  ],
  "zona-arqueologica-tamtoc": [
    { rotulo: "La historia", href: "/blog/zona-arqueologica-tamtoc-zona-arqueologica-de-tamtoc-histori", ancla: "La historia de Tamtoc y qué ver en el sitio" },
  ],
};

// ── Combinaciones sugeridas ("los viajeros también visitan") ─────────────────

export const COMBINACION_DESTINO: Record<string, { nombre: string; slug: string }[]> = {
  "cascada-de-tamul":             [{ nombre: "Sótano de las Huahuas",      slug: "sotano-de-las-huahuas"      }, { nombre: "Sótano de las Golondrinas",  slug: "sotano-de-las-golondrinas"  }],
  "cueva-del-agua":               [{ nombre: "Cascada de Tamul",           slug: "cascada-de-tamul"           }, { nombre: "Sótano de las Huahuas",      slug: "sotano-de-las-huahuas"      }],
  "sotano-de-las-golondrinas":    [{ nombre: "Cascada de Tamul",           slug: "cascada-de-tamul"           }, { nombre: "Sótano de las Huahuas",      slug: "sotano-de-las-huahuas"      }],
  "sotano-de-las-huahuas":        [{ nombre: "Cascada de Tamul",           slug: "cascada-de-tamul"           }, { nombre: "Sótano de las Golondrinas",  slug: "sotano-de-las-golondrinas"  }],
  "las-pozas-jardin-surrealista": [{ nombre: "Nacimiento de Huichihuayán", slug: "nacimiento-huichihuayan"    }, { nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"       }],
  "nacimiento-huichihuayan":      [{ nombre: "Las Pozas (Edward James)",   slug: "las-pozas-jardin-surrealista" }, { nombre: "Xilitla — Pueblo Mágico", slug: "xilitla-pueblo-magico"       }],
  "xilitla-pueblo-magico":        [{ nombre: "Las Pozas (Edward James)",   slug: "las-pozas-jardin-surrealista" }, { nombre: "Nacimiento de Huichihuayán", slug: "nacimiento-huichihuayan"   }],
  "cascadas-de-micos":            [{ nombre: "Cascadas de Minas Viejas",   slug: "cascadas-minas-viejas"      }, { nombre: "Puente de Dios",            slug: "puente-de-dios-tamasopo"     }],
  "cascadas-minas-viejas":        [{ nombre: "Cascadas de Micos",          slug: "cascadas-de-micos"          }, { nombre: "Puente de Dios",            slug: "puente-de-dios-tamasopo"     }],
  "puente-de-dios-tamasopo":      [{ nombre: "Cascadas de Tamasopo",       slug: "cascadas-de-tamasopo"       }, { nombre: "Cascadas de Micos",         slug: "cascadas-de-micos"           }],
  "cascadas-de-tamasopo":         [{ nombre: "Puente de Dios",             slug: "puente-de-dios-tamasopo"    }, { nombre: "Cascadas de Minas Viejas",  slug: "cascadas-minas-viejas"       }],
  "cascada-el-meco":              [{ nombre: "Cascada El Salto",           slug: "cascada-el-salto"           }, { nombre: "Cascadas de Micos",         slug: "cascadas-de-micos"           }],
  "cascada-el-salto":             [{ nombre: "Cascada El Meco",            slug: "cascada-el-meco"            }, { nombre: "Cascadas de Micos",         slug: "cascadas-de-micos"           }],
  "cascada-el-aguacate":          [{ nombre: "Cascada El Meco",            slug: "cascada-el-meco"            }, { nombre: "Cascadas de Micos",         slug: "cascadas-de-micos"           }],
  "zona-arqueologica-tamtoc":     [{ nombre: "Voladores de Tamaletón",     slug: "voladores-tamaleton"        }, { nombre: "Río Tampaón — Rafting",     slug: "rio-tampaon-rafting"         }],
  "voladores-tamaleton":          [{ nombre: "Zona Arqueológica Tamtoc",   slug: "zona-arqueologica-tamtoc"   }, { nombre: "Balneario Taninul",         slug: "balneario-taninul"           }],
  "rio-tampaon-rafting":          [{ nombre: "Cascada de Tamul",           slug: "cascada-de-tamul"           }, { nombre: "Sótano de las Huahuas",     slug: "sotano-de-las-huahuas"       }],
  "laguna-media-luna":            [{ nombre: "Balneario Taninul",          slug: "balneario-taninul"          }, { nombre: "Zona Arqueológica Tamtoc",  slug: "zona-arqueologica-tamtoc"    }],
  "balneario-taninul":            [{ nombre: "Cascadas de Micos",          slug: "cascadas-de-micos"          }, { nombre: "Laguna Media Luna",         slug: "laguna-media-luna"           }],
  "cuevas-de-mantetzulel":        [{ nombre: "Cascadas de Micos",          slug: "cascadas-de-micos"          }, { nombre: "Puente de Dios",            slug: "puente-de-dios-tamasopo"     }],
  "nacimiento-tambaque":          [{ nombre: "Nacimiento de Huichihuayán", slug: "nacimiento-huichihuayan"    }, { nombre: "Las Pozas (Edward James)",  slug: "las-pozas-jardin-surrealista" }],

  // ── Lote de la expansión por municipio ──────────────────────────────────────
  // Se combinan por cercanía real (mismo municipio o ruta natural del día), para
  // que cada ficha enlace con otras dos y ninguna quede aislada.

  // Tamasopo — Ruta Acuática
  "siete-cascadas-tamasopo":      [{ nombre: "Puente de Dios",             slug: "puente-de-dios-tamasopo"    }, { nombre: "Hacienda Los Gómez",        slug: "hacienda-los-gomez-tamasopo" }],
  "hacienda-los-gomez-tamasopo":  [{ nombre: "Puente de Dios",             slug: "puente-de-dios-tamasopo"    }, { nombre: "Siete Cascadas de Tamasopo", slug: "siete-cascadas-tamasopo"    }],
  "cascada-el-trampolin-tamasopo":[{ nombre: "Cascadas de Tamasopo",       slug: "cascadas-de-tamasopo"       }, { nombre: "Puente de Dios",            slug: "puente-de-dios-tamasopo"     }],

  // Xilitla
  "la-trinidad-xilitla":          [{ nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"      }, { nombre: "Las Pozas (Edward James)",  slug: "las-pozas-jardin-surrealista" }],
  "olla-de-la-luz":               [{ nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"      }, { nombre: "Cueva del Salitre",         slug: "cueva-del-salitre"           }],
  "cueva-del-salitre":            [{ nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"      }, { nombre: "Olla de la Luz",            slug: "olla-de-la-luz"              }],
  "museo-leonora-carrington-xilitla": [{ nombre: "Las Pozas (Edward James)", slug: "las-pozas-jardin-surrealista" }, { nombre: "Xilitla — Pueblo Mágico", slug: "xilitla-pueblo-magico"    }],
  "cascada-los-comales":          [{ nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"      }, { nombre: "Nacimiento de Huichihuayán", slug: "nacimiento-huichihuayan"   }],

  // Aquismón
  "aquismon-pueblo-magico":       [{ nombre: "Sótano de las Golondrinas",  slug: "sotano-de-las-golondrinas"  }, { nombre: "Cascada de Tamul",          slug: "cascada-de-tamul"            }],

  // Axtla de Terrazas
  "castillo-de-la-salud":         [{ nombre: "Río Axtla y 'el Chalán'",    slug: "rio-axtla-el-chalan"        }, { nombre: "Xilitla — Pueblo Mágico",   slug: "xilitla-pueblo-magico"       }],
  "rio-axtla-el-chalan":          [{ nombre: "Castillo de la Salud",       slug: "castillo-de-la-salud"       }, { nombre: "Xilitla — Pueblo Mágico",   slug: "xilitla-pueblo-magico"       }],

  // Tamuín
  "zona-arqueologica-tamohi-el-consuelo": [{ nombre: "Zona Arqueológica Tamtoc", slug: "zona-arqueologica-tamtoc" }, { nombre: "Balneario Taninul",   slug: "balneario-taninul"           }],

  // Coxcatlán
  "templo-san-juan-bautista-coxcatlan": [{ nombre: "Ruinas de El Jopoy",   slug: "ruinas-de-el-jopoy-coxcatlan" }, { nombre: "Cascada del Rancho El Zapote", slug: "cascada-rancho-el-zapote-poza-azul-coxcatlan" }],
  "cascada-rancho-el-zapote-poza-azul-coxcatlan": [{ nombre: "Templo de San Juan Bautista", slug: "templo-san-juan-bautista-coxcatlan" }, { nombre: "Ruinas de El Jopoy", slug: "ruinas-de-el-jopoy-coxcatlan" }],
  "ruinas-de-el-jopoy-coxcatlan": [{ nombre: "Templo de San Juan Bautista", slug: "templo-san-juan-bautista-coxcatlan" }, { nombre: "Cascada del Rancho El Zapote", slug: "cascada-rancho-el-zapote-poza-azul-coxcatlan" }],

  // Zona Teenek (Tancanhuitz, Tanlajás, Aquismón)
  "tancanhuitz":                  [{ nombre: "Voladores de Tamaletón",     slug: "voladores-tamaleton"        }, { nombre: "Tanlajás",                  slug: "tanlajas"                    }],
  "tanlajas":                     [{ nombre: "Tancanhuitz (Ciudad Santos)", slug: "tancanhuitz"               }, { nombre: "Voladores de Tamaletón",    slug: "voladores-tamaleton"         }],

  // Sur de la Huasteca
  "san-martin-chalchicuautla":    [{ nombre: "Tancanhuitz (Ciudad Santos)", slug: "tancanhuitz"               }, { nombre: "Xilitla — Pueblo Mágico",   slug: "xilitla-pueblo-magico"       }],
  "texquitote":                   [{ nombre: "Xilitla — Pueblo Mágico",    slug: "xilitla-pueblo-magico"      }, { nombre: "Tancanhuitz (Ciudad Santos)", slug: "tancanhuitz"               }],

  // Planicie huasteca (Ébano, San Vicente Tancuayalab)
  "san-vicente-tancuayalab":      [{ nombre: "Zona Arqueológica Tamtoc",   slug: "zona-arqueologica-tamtoc"   }, { nombre: "Laguna de los Suspiros",    slug: "laguna-de-los-suspiros"      }],
  "laguna-de-los-suspiros":       [{ nombre: "Zona Arqueológica Tamtoc",   slug: "zona-arqueologica-tamtoc"   }, { nombre: "Balneario Taninul",         slug: "balneario-taninul"           }],
};

// ── Reseñas REALES que mencionan el destino ──────────────────────────────────
// 🔴 20 nov 2026 (auditoría de Destinos): aquí vivía `REVIEWS_POR_DESTINO`, 27
// testimonios INVENTADOS («Sandra Morales, CDMX», con fotos de archivo
// /imagenes/reviews/reviewer-N.jpg) que ni siquiera hablaban del lugar: la ficha
// de Tamul citaba pericos del sótano y la Cueva del Agua. Google trata los
// perfiles fabricados como engaño. Se borraron.
//
// Ahora la ficha solo cita reseñas REALES de Google (`resenasReales.ts`) cuyo
// texto nombra el lugar, según estas expresiones. Sin coincidencia, la ficha no
// enseña citas: solo la calificación real del negocio y el enlace al perfil.
export const PALABRAS_RESENA_DESTINO: Record<string, RegExp> = {
  "las-pozas-jardin-surrealista": /las pozas|jard[ií]n surrealista|edward james/i,
  "olla-de-la-luz": /(olla|hoya) de la luz/i,
  "cascada-de-tamul": /tamul/i,
  "cueva-del-agua": /cueva del agua/i,
  "sotano-de-las-golondrinas": /golondrinas/i,
  "sotano-de-las-huahuas": /huahuas/i,
  "puente-de-dios-tamasopo": /puente de dios/i,
  "cascadas-de-micos": /micos/i,
  "cascadas-minas-viejas": /minas viejas/i,
  "cascada-el-meco": /\bmeco\b/i,
  "laguna-media-luna": /media luna/i,
  "zona-arqueologica-tamtoc": /tamtoc/i,
  "rio-tampaon-rafting": /rafting|tampa[oó]n/i,
  "xilitla-pueblo-magico": /xilitla/i,
  "la-trinidad-xilitla": /la trinidad/i,
};

// 🔴 28 sep 2026 — aquí vivía `RATING_DESTINO`: 1,188 reseñas repartidas entre
// 20 destinos, con notas de 4.5 a 4.9, todas inventadas, que se emitían como
// `aggregateRating`. Ya no se pintaba en ninguna parte, pero seguía exportado
// (y importado sin usar en `jsonld.ts`), listo para que alguien lo volviera a
// encender. Se borró. La única calificación es la del negocio en Google:
// `src/lib/resenas.ts`. Un destino es un lugar público, no algo que vendamos, y
// no tiene reseñas propias que declarar.
