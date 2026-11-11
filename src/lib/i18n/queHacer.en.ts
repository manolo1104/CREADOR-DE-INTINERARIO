import type { Locale } from "./config";
import { TOURS_DB, esPorPersona, etiquetaUnidad, type Tour } from "@/lib/tours";
import { incluyeDesayuno, rangoPorPersona } from "@/lib/catalogoResumen";
import { DESTINOS_DB } from "@/lib/destinos";
import { PAQUETES_DB } from "@/lib/paquetes";
import { localizeTour } from "./localize";
import { fmtMoney } from "./format";

/**
 * Textos de /que-hacer-en-la-huasteca-potosina y su gemela /en (10 nov 2026).
 *
 * 🔴 Esta página y /destinos se peleaban la misma búsqueda: en Search Console
 * «qué hacer en la huasteca potosina» la rankeaba en el puesto 14 mientras
 * /destinos estaba en el 6.7. Se separan por intención: esta es la de las
 * ACTIVIDADES (navegar, rafting, rappel, nadar, saltar, una gruta de noche…) y
 * /destinos la de los LUGARES. Por eso el título y el H1 dicen «actividades» y
 * el hero manda a /destinos a quien busca la lista de lugares. El resto del
 * texto no se tocó: rankea.
 *
 * Las cifras de esta guía salen del catálogo. 🔴 La FAQ decía "de $1,300 a
 * $1,850 por persona, con transporte y desayuno": el rafting ya costaba $1,950,
 * la Gruta de Xilo y la Travesía del Café cuestan $900 y ni esos dos ni los
 * recorridos de montaña llevan desayuno.
 *
 * ⚠️ En inglés las alturas van en pies con los metros entre paréntesis (un
 * lector de EE. UU. no piensa en metros), con la MISMA cifra métrica que el
 * español, y todo precio lleva «MXN».
 */

const NO_POR_PERSONA = TOURS_DB.filter((t) => !esPorPersona(t));
const CON_DESAYUNO = TOURS_DB.filter(incluyeDesayuno);
const EDEN = TOURS_DB.find((t) => t.slug === "eden-en-el-jardin");
const DIAS_MIN = Math.min(...PAQUETES_DB.map((p) => p.dias));
const DIAS_MAX = Math.max(...PAQUETES_DB.map((p) => p.dias));

const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
const listaEs = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const listaEn = (xs: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(xs);
const nombreEn = (t: Tour) => localizeTour(t, "en").nombreCorto;

// Guía pilar: cada experiencia enlaza al tour o destino que ya existe en el sitio.
// Datos verificados con el contenido ya publicado (alturas, clases de rápidos, municipios).
// `href` va SIN prefijo de idioma: la página lo pasa por `localePath` (todas
// estas rutas existen también en /en).
export type Experiencia = {
  titulo: string;
  descripcion: string;
  href: string;
  cta: string;
};

export interface QueHacerContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;

  breadcrumb: string;
  schemaListName: string;

  heroAlt: string;
  heroEyebrow: string;
  heroH1a: string;
  heroH1em: string;
  heroH1b: string;
  heroIntro: string;
  /** Lugares ≠ actividades: el puente a /destinos. */
  destinosPre: string;
  destinosLink: string;

  experiencias: Experiencia[];

  organizarTitulo: string;
  organizarTexto: string;
  btnPaquetes: string;
  btnPrecios: string;

  tarjetaTitulo: string;

  faqTitulo: string;
  faqs: { q: string; a: string }[];

  ctaTitulo: string;
  ctaTexto: string;
  waTexto: string;
  waBoton: string;
}

function experienciasEs(): Experiencia[] {
  return [
    {
      titulo: "Navega en canoa hasta la Cascada de Tamul",
      descripcion:
        "La postal más famosa de la Huasteca: remas río arriba por el Cañón del Tampaón, entre paredes de roca que se cierran sobre el río, hasta quedar frente a la cascada más alta de San Luis Potosí (105 m). En temporada seca el agua es de un turquesa irreal.",
      href: "/tours/expedicion-tamul",
      cta: "Ver la Expedición Tamul",
    },
    {
      titulo: "Piérdete en Las Pozas, el jardín surrealista de Edward James",
      descripcion:
        "Un excéntrico millonario inglés construyó en plena selva de Xilitla un jardín de esculturas y escaleras que no llevan a ningún lado. Es una de las obras surrealistas más grandes del mundo y el lugar más fotografiado de la región.",
      href: "/tours/ruta-surrealista-edward-james",
      cta: "Ver la Ruta Surrealista",
    },
    // ── Los cuatro recorridos nuevos (28 sep 2026). Cada dato sale de su ficha en
    // tours.ts, de tourFaqs.ts o de destinos.ts; sin horas ni precios escritos
    // a mano (la hora y el precio viven en la ficha a la que enlazan).
    // 🔴 El título va al ItemList del JSON-LD: nada de "antes de que abra" ahí.
    // También hay salida a las 5 PM, y a esa hora no se entra antes de la
    // apertura (el mismo aviso está en el `seo` del Edén en tours.ts).
    {
      titulo: "Entra a Las Pozas en privado, solo con tu grupo",
      descripcion: `El Edén en el Jardín es la visita privada al jardín de Edward James: en las salidas de la mañana entras una hora antes de que abra al público, vas con guía propio y subes a los niveles altos del Palacio de Bambú y a la Casa Estudio, que en la visita general están cerrados. Se cobra por grupo${EDEN ? `, de hasta ${EDEN.groupMax} personas` : ""}.`,
      href: "/tours/eden-en-el-jardin",
      cta: "Ver El Edén en el Jardín",
    },
    {
      titulo: "Haz rafting en los rápidos del Río Tampaón",
      descripcion:
        "Rápidos clase III sobre agua turquesa, rodeado de selva. No necesitas experiencia: el equipo y los guías certificados van contigo en todo momento. La descarga de adrenalina más grande de la Huasteca.",
      href: "/tours/rafting-rio-tampaon",
      cta: "Ver el tour de rafting",
    },
    {
      titulo: "Asómate al abismo del Sótano de las Golondrinas",
      descripcion:
        "Un tiro vertical de 376 metros de caída libre (512 m de profundidad total) en Aquismón. Al amanecer, miles de aves —vencejos y loros— salen volando en espiral — uno de los espectáculos naturales más impresionantes de México.",
      href: "/destinos/sotano-de-las-golondrinas",
      cta: "Conocer el Sótano de las Golondrinas",
    },
    {
      titulo: "Asómate a la Olla de la Luz, el sótano del bosque de niebla",
      descripcion:
        "A unos 14 km de Xilitla, en lo alto de la comunidad de La Trinidad, se abre un sótano vertical de 193 metros de profundidad y 233 de diámetro, tan grande que en su fondo creció otro bosque. Se llega tras unas 2 horas de caminata con guía de la propia comunidad. También lo verás escrito Hoya de la Luz.",
      href: "/tours/olla-de-la-luz",
      cta: "Ver la Olla de la Luz",
    },
    {
      titulo: "Salta las cascadas de Micos",
      descripcion:
        "Una escalera natural de siete cascadas turquesas donde puedes saltar de poza en poza con chaleco, casco y guía. Hay saltos para todos los niveles — y quien no quiere saltar, disfruta nadando.",
      href: "/tours/paraiso-escalonado-minas-micos",
      cta: "Ver el tour Paraíso Escalonado",
    },
    {
      titulo: "Nada en el Puente de Dios de Tamasopo",
      descripcion:
        "Una poza turquesa dentro de una cueva a la que entras nadando por un túnel de luz. El agua cristalina, las raíces colgantes y los rayos de sol crean uno de los rincones más mágicos de la Huasteca.",
      href: "/tours/ruta-acuatica-puente-de-dios",
      cta: "Ver la Ruta Acuática",
    },
    {
      titulo: "Haz rappel frente a la Cascada de Tamul",
      descripcion:
        "Desciende en cuerda con la caída de agua más alta de San Luis Potosí de frente. Una perspectiva de Tamul que muy poca gente conoce, con equipo certificado y guías especializados en cañonismo.",
      href: "/tours/rappel-tamul",
      cta: "Ver el tour de rappel",
    },
    {
      titulo: "Maneja un RZR todoterreno por la selva de Xilitla",
      descripcion:
        "Al volante de tu propio vehículo off-road cruzas ríos, barro y selva húmeda hasta cascadas escondidas, miradores de la sierra o el pueblo indígena de La Trinidad. 4 rutas distintas, desde 2 horas.",
      href: "/tours/rzr-xilitla",
      cta: "Ver rutas y precios del RZR",
    },
    {
      titulo: "Recorre de noche la Gruta de Xilo",
      descripcion:
        "Una caminata de 15 a 20 minutos por la selva de Xilitla te deja en la boca de la gruta, ya de noche. Adentro son unos 900 metros entre estalactitas y estalagmitas, y al final unos jacuzzis naturales de agua cristalina dentro de la propia cueva. Vas con casco, lámpara frontal y guía. También la encontrarás como Grutas de Xilo.",
      href: "/tours/gruta-de-xilo",
      cta: "Ver la Gruta de Xilo",
    },
    {
      titulo: "Ve amanecer sobre el mar de nubes en el Cerro del Pilón",
      descripcion:
        "Senderismo de madrugada por el bosque de niebla de La Trinidad hasta la cima del Cerro del Pilón, para estar arriba cuando el sol sale sobre las nubes que cubren la sierra. El mar de nubes depende del clima: es frecuente, pero nadie lo puede garantizar.",
      href: "/tours/amanecer-de-nubes",
      cta: "Ver el Amanecer de Nubes",
    },
    {
      titulo: "Fotografía las cascadas gemelas de Minas Viejas",
      descripcion:
        "Dos cortinas de agua turquesa de unos 50 metros que caen juntas en una poza perfecta para nadar. De los rincones más fotogénicos de El Naranjo y mucho menos concurrido que Tamul.",
      href: "/destinos/cascadas-minas-viejas",
      cta: "Conocer Minas Viejas",
    },
    {
      titulo: "Contempla El Meco desde su mirador",
      descripcion:
        "Una cascada de 35 metros en un cañón de paredes escalonadas que parece diseñado a mano. El mirador te deja verla completa — y el tour te lleva también al Gran Salto del río El Naranjo.",
      href: "/tours/cascadas-del-meco",
      cta: "Ver el tour Cascadas del Meco",
    },
    {
      titulo: "Refréscate en el nacimiento de Huichihuayán",
      descripcion:
        "Un manantial de agua azul cristalina que brota directo de la montaña, rodeado de árboles enormes. Ideal para un chapuzón tranquilo, lejos de las multitudes.",
      href: "/destinos/nacimiento-huichihuayan",
      cta: "Conocer Huichihuayán",
    },
    {
      titulo: "Viaja al pasado en la zona arqueológica de Tamtoc",
      descripcion:
        "El sitio arqueológico más importante de la cultura huasteca, a orillas del río Tampaón: plazas, monolitos y una historia de más de 2,000 años que casi nadie conoce.",
      href: "/destinos/zona-arqueologica-tamtoc",
      cta: "Conocer Tamtoc",
    },
    {
      titulo: "Recorre Xilitla, Pueblo Mágico entre neblina y café",
      descripcion:
        "Callejones empinados, neblina que sube de la selva, café de altura y el misticismo que enamoró a Edward James. Xilitla es la base perfecta para explorar el sur de la Huasteca.",
      href: "/destinos/xilitla-pueblo-magico",
      cta: "Conocer Xilitla",
    },
    {
      titulo: "Presencia el rito de los Voladores de Tamaletón",
      descripcion:
        "El ritual prehispánico más antiguo de la Huasteca: cinco danzantes vuelan girando desde un mástil de 30 metros en honor al sol, en una ceremonia viva reconocida como Patrimonio Cultural Inmaterial. Cultura huasteca en su forma más pura.",
      href: "/destinos/voladores-tamaleton",
      cta: "Conocer a los Voladores",
    },
    {
      titulo: "Prueba la gastronomía huasteca: zacahuil, enchiladas y café de olla",
      descripcion: `El zacahuil es un tamal gigante horneado en hoja de plátano que se comparte entre toda la mesa; se acompaña de enchiladas huastecas, cecina y café de la sierra. El desayuno buffet de platillos típicos va incluido en ${listaEs(CON_DESAYUNO.map((t) => t.nombreCorto))}.`,
      href: "/info-practica",
      cta: "Ver dónde comer en la guía práctica",
    },
  ];
}

/**
 * Las mismas diecinueve, en el MISMO orden y con el MISMO destino de cada
 * enlace (la página localiza la ruta). Nombres de lugar en español, con la
 * explicación la primera vez que ayuda.
 */
function experienciasEn(): Experiencia[] {
  return [
    {
      titulo: "Canoe up to Tamul Waterfall (Cascada de Tamul)",
      descripcion:
        "The Huasteca's most famous postcard: you paddle upriver through the Tampaón Canyon, between rock walls that close in over the river, until you're facing the tallest waterfall in San Luis Potosí (344 ft / 105 m). In the dry season the water turns an unreal turquoise.",
      href: "/tours/expedicion-tamul",
      cta: "See the Tamul Expedition",
    },
    {
      titulo: "Get lost in Las Pozas, Edward James' surrealist garden",
      descripcion:
        "An eccentric English millionaire built a garden of sculptures and staircases that lead nowhere, deep in the Xilitla jungle. It's one of the largest surrealist works in the world and the most photographed place in the region.",
      href: "/tours/ruta-surrealista-edward-james",
      cta: "See the Surrealist Route",
    },
    {
      titulo: "Visit Las Pozas privately, just your group",
      descripcion: `Eden in the Garden is the private visit to Edward James' garden: on morning departures you go in an hour before it opens to the public, with your own guide, and climb to the upper levels of the Bamboo Palace and the Studio House, which are closed on the general visit. It's priced per group${EDEN ? `, of up to ${EDEN.groupMax} people` : ""}.`,
      href: "/tours/eden-en-el-jardin",
      cta: "See Eden in the Garden",
    },
    {
      titulo: "Go rafting on the Tampaón River rapids",
      descripcion:
        "Class III rapids over turquoise water, surrounded by jungle. No experience needed: the gear and the certified guides are with you the whole time. The biggest adrenaline rush in the Huasteca.",
      href: "/tours/rafting-rio-tampaon",
      cta: "See the rafting tour",
    },
    {
      titulo: "Peer into the Sótano de las Golondrinas (Cave of Swallows)",
      descripcion:
        "A vertical shaft with 1,234 ft (376 m) of free fall and 1,680 ft (512 m) of total depth, in Aquismón. At dawn thousands of birds — swifts and parakeets — spiral out of it: one of the most impressive natural spectacles in Mexico.",
      href: "/destinos/sotano-de-las-golondrinas",
      cta: "Discover the Sótano de las Golondrinas",
    },
    {
      titulo: "Look into Olla de la Luz, the cloud-forest sinkhole",
      descripcion:
        "About 9 miles (14 km) from Xilitla, high up in the community of La Trinidad, a vertical sinkhole opens up 633 ft (193 m) deep and 764 ft (233 m) across — so big that another forest grew at its bottom. You reach it after a walk of about 2 hours with a guide from the community itself. You'll also see it written Hoya de la Luz.",
      href: "/tours/olla-de-la-luz",
      cta: "See Olla de la Luz",
    },
    {
      titulo: "Jump the Micos waterfalls",
      descripcion:
        "A natural staircase of seven turquoise waterfalls where you jump from pool to pool with a life jacket, a helmet and a guide. There are jumps for every level — and if you'd rather not jump, you can just swim.",
      href: "/tours/paraiso-escalonado-minas-micos",
      cta: "See the Stepped Paradise tour",
    },
    {
      titulo: "Swim into Puente de Dios, in Tamasopo",
      descripcion:
        "A turquoise pool inside a cave that you swim into through a tunnel of light. The crystal-clear water, the hanging roots and the sunbeams make it one of the most magical corners of the Huasteca.",
      href: "/tours/ruta-acuatica-puente-de-dios",
      cta: "See the Water Route",
    },
    {
      titulo: "Rappel facing Tamul Waterfall",
      descripcion:
        "Descend on a rope with the tallest waterfall in San Luis Potosí right in front of you. A view of Tamul very few people ever get, with certified gear and guides who specialize in canyoneering.",
      href: "/tours/rappel-tamul",
      cta: "See the rappel tour",
    },
    {
      titulo: "Drive an off-road RZR through the Xilitla jungle",
      descripcion:
        "Behind the wheel of your own off-road vehicle you cross rivers, mud and humid jungle to hidden waterfalls, mountain viewpoints or the Indigenous village of La Trinidad. 4 different routes, from 2 hours.",
      href: "/tours/rzr-xilitla",
      cta: "See RZR routes and prices",
    },
    {
      titulo: "Explore Xilo Cave (Gruta de Xilo) at night",
      descripcion:
        "A 15- to 20-minute walk through the Xilitla jungle takes you to the mouth of the cave, after dark. Inside are about 900 meters (nearly 3,000 ft) of stalactites and stalagmites, and at the end, natural jacuzzis of crystal-clear water inside the cave itself. You go with a helmet, a headlamp and a guide. You'll also find it as Grutas de Xilo.",
      href: "/tours/gruta-de-xilo",
      cta: "See Xilo Cave",
    },
    {
      titulo: "Watch the sunrise over a sea of clouds from Cerro del Pilón",
      descripcion:
        "A predawn hike through the cloud forest of La Trinidad to the top of Cerro del Pilón, to be up there when the sun rises over the clouds that blanket the mountains. The sea of clouds depends on the weather: it's common, but no one can guarantee it.",
      href: "/tours/amanecer-de-nubes",
      cta: "See the Sea of Clouds Sunrise",
    },
    {
      titulo: "Photograph the twin waterfalls of Minas Viejas",
      descripcion:
        "Two curtains of turquoise water about 165 ft (50 m) high, falling side by side into a pool that's perfect for swimming. One of the most photogenic spots in El Naranjo, and far less crowded than Tamul.",
      href: "/destinos/cascadas-minas-viejas",
      cta: "Discover Minas Viejas",
    },
    {
      titulo: "Take in El Meco from its viewpoint",
      descripcion:
        "A 115-ft (35 m) waterfall in a canyon with stepped walls that look hand-carved. The viewpoint lets you see the whole thing — and the tour also takes you to the Gran Salto on the El Naranjo river.",
      href: "/tours/cascadas-del-meco",
      cta: "See the El Meco Waterfalls tour",
    },
    {
      titulo: "Cool off at the Huichihuayán spring",
      descripcion:
        "A spring of crystal-clear blue water that flows straight out of the mountain, surrounded by enormous trees. Ideal for a quiet dip, away from the crowds.",
      href: "/destinos/nacimiento-huichihuayan",
      cta: "Discover Huichihuayán",
    },
    {
      titulo: "Step back in time at the Tamtoc archaeological site",
      descripcion:
        "The most important archaeological site of the Huastec culture, on the banks of the Tampaón River: plazas, monoliths and more than 2,000 years of history that almost nobody knows.",
      href: "/destinos/zona-arqueologica-tamtoc",
      cta: "Discover Tamtoc",
    },
    {
      titulo: "Wander Xilitla, a Pueblo Mágico of mist and coffee",
      descripcion:
        "Steep alleys, mist rising from the jungle, mountain-grown coffee and the mystique that won Edward James over. Xilitla is the perfect base for exploring the southern Huasteca.",
      href: "/destinos/xilitla-pueblo-magico",
      cta: "Discover Xilitla",
    },
    {
      titulo: "Witness the Voladores ritual at Tamaletón",
      descripcion:
        "The oldest pre-Hispanic ritual in the Huasteca: five dancers climb a nearly 100-ft (30 m) pole and spin down through the air in honor of the sun, in a living ceremony recognized as Intangible Cultural Heritage. Huastec culture in its purest form.",
      href: "/destinos/voladores-tamaleton",
      cta: "Discover the Voladores",
    },
    {
      titulo: "Taste Huastec food: zacahuil, enchiladas and café de olla",
      descripcion: `Zacahuil is a giant tamale baked in banana leaves and shared by the whole table; it comes with enchiladas huastecas, cecina (salt-dried beef) and coffee from the sierra. The buffet breakfast of traditional dishes is included on ${listaEn(CON_DESAYUNO.map(nombreEn))}.`,
      href: "/info-practica",
      cta: "See where to eat in the travel guide",
    },
  ];
}

/**
 * Función y no constante: el rango de precios lee `t.precio`, que vale la
 * promo mientras esté viva; como constante de módulo se congelaba al arrancar.
 */
export function getQueHacer(locale: Locale): QueHacerContent {
  const rango = rangoPorPersona();
  const nDestinos = DESTINOS_DB.length;

  if (locale === "en") {
    const experiencias = experienciasEn();
    const n = experiencias.length;
    return {
      metaTitle: `Things to Do in Huasteca Potosina: ${n} Activities 2026`,
      metaDescription:
        "Things to do in Huasteca Potosina, from locals: canoe to Tamul, rafting, rappelling, swimming into Puente de Dios, waterfall jumps and a cave at night.",
      keywords: [
        "things to do in huasteca potosina",
        "huasteca potosina activities",
        "huasteca potosina tours",
        "tamul waterfall canoe",
        "huasteca potosina rafting",
      ],
      ogTitle: `Things to Do in Huasteca Potosina — ${n} Activities`,
      ogDescription:
        "The locals' guide: turquoise waterfalls, a surrealist garden, rafting, giant sinkholes and living Huastec culture.",
      ogImageAlt: "Things to do in Huasteca Potosina",

      breadcrumb: "Things to do in Huasteca Potosina",
      schemaListName: "Things to do in Huasteca Potosina",

      heroAlt:
        "Tamul Waterfall, a 344-ft (105 m) drop, seen from the Tampaón River between the canyon walls, in Aquismón, San Luis Potosí",
      heroEyebrow: "✦ A guide written by locals",
      heroH1a: "Things to do in ",
      heroH1em: "Huasteca Potosina",
      heroH1b: `: ${n} activities`,
      heroIntro: `${n} must-do activities, according to those of us who were born here: turquoise waterfalls, a surrealist garden in the middle of the jungle, rafting, sinkholes hundreds of feet deep, a cave you explore at night and living Huastec culture. Each one links straight to how to do it.`,
      destinosPre: "Looking for the places themselves, with entrance fees and how to get there? They're in our",
      destinosLink: `${nDestinos} Huasteca Potosina destinations`,

      experiencias,

      organizarTitulo: "How do you fit all this in?",
      organizarTexto: `Destinations are 1 to 2 hours apart on mountain roads, so the key is to group them by area: Tamul and the sinkholes one day, the turquoise waterfalls another, and Xilitla with Las Pozas another. Our ${DIAS_MIN}- to ${DIAS_MAX}-day packages are already put together that way, with hotel and transport sorted — or message us and we'll build a plan around you.`,
      btnPaquetes: `See ${DIAS_MIN}- to ${DIAS_MAX}-day packages`,
      btnPrecios: "See all prices",

      tarjetaTitulo: "Coming from Mexico City? The monthly trip fits two tours into one weekend",

      faqTitulo: "Frequently asked questions",
      faqs: [
        {
          q: "How many days do I need to see the Huasteca Potosina?",
          a: "With 3 days you cover the essentials (Tamul Waterfall, Las Pozas in Xilitla and a day of turquoise waterfalls). With 4 or 5 days you go at a calmer pace and add rafting, sinkholes or Puente de Dios. Less than 3 days feels rushed, because destinations are 1 to 2 hours apart.",
        },
        {
          q: "What's the one thing not to miss if I only have one day?",
          a: "The Tamul Expedition: in a single day you canoe up to Tamul Waterfall, look into the Sótano de las Huahuas and swim in the Cueva del Agua cenote. It's the most complete tour in the region.",
        },
        {
          q: "Is the Huasteca Potosina good for kids?",
          a: "Yes. There are low-difficulty activities that work very well for families: the Micos waterfalls, Minas Viejas, the Edward James Surrealist Route and the spring-fed swimming spots. Kids pay less on our tours: 70% of the adult price for ages 6 to 10, and 50% under 6.",
        },
        {
          q: "How much do these activities cost?",
          a: `Guided day tours range from ${fmtMoney(rango.min, "en")} to ${fmtMoney(rango.max, "en")} per person.${NO_POR_PERSONA.length ? ` Some aren't priced per head: ${listaEn(NO_POR_PERSONA.map((t) => `${nombreEn(t)} (${etiquetaUnidad(t, true)})`))}.` : ""} All include travel insurance plus the photos and video your guide takes; each tour's page details what else is included. Our pricing page has the full list.`,
        },
        {
          q: "Can I visit the Huasteca on my own, without a tour?",
          a: "Yes, especially if you're traveling by car. Keep in mind that several accesses (like the Tamul boat landing or the Tampaón boats) are hired on site, the mountain roads should be driven in daylight, and in high season spots sell out. A tour takes care of transport, entrance fees, safety and logistics for one set price.",
        },
      ],

      ctaTitulo: "Want help planning your trip?",
      ctaTexto:
        "Tell us your dates and how many of you are coming, and we'll suggest the ideal plan — we're certified local guides and we run tours every day of the year.",
      waTexto: "Hi! I read your guide to things to do in the Huasteca and I'd like to plan my trip. Can you help?",
      waBoton: "Plan on WhatsApp",
    };
  }

  const experiencias = experienciasEs();
  const n = experiencias.length;
  return {
    // Antes: «Qué Hacer en la Huasteca Potosina — N Imperdibles 2026». Ahora dice
    // «Actividades» para no pelear con /destinos (ver la nota de arriba).
    metaTitle: `Qué Hacer en la Huasteca Potosina: ${n} Actividades 2026`,
    metaDescription:
      "Qué hacer en la Huasteca Potosina según gente local: navegar a Tamul, rafting, rappel, nadar en Puente de Dios, saltar cascadas y una gruta de noche.",
    keywords: [
      "qué hacer en la huasteca potosina",
      "actividades en la huasteca potosina",
      "lugares para visitar huasteca potosina",
      "atracciones huasteca potosina",
      "cascadas huasteca potosina",
      "huasteca potosina itinerario",
    ],
    ogTitle: `Qué Hacer en la Huasteca Potosina — ${n} Actividades`,
    ogDescription:
      "La guía de gente local: cascadas turquesas, jardín surrealista, rafting, sótanos gigantes y cultura huasteca.",
    ogImageAlt: "Qué hacer en la Huasteca Potosina",

    breadcrumb: "Qué hacer en la Huasteca Potosina",
    schemaListName: "Qué hacer en la Huasteca Potosina",

    // El alt decía sólo el nombre y un superlativo. Ahora describe lo que se ve
    // y dónde está: los datos (105 m, río Tampaón, Aquismón) salen de DESTINOS_DB.
    heroAlt:
      "Cascada de Tamul, de 105 metros de caída, vista desde el río Tampaón entre los paredones del cañón, en Aquismón, San Luis Potosí",
    heroEyebrow: "✦ Guía escrita por gente local",
    heroH1a: "Qué hacer en la ",
    heroH1em: "Huasteca Potosina",
    heroH1b: `: ${n} actividades`,
    heroIntro: `${n} actividades imperdibles según quienes nacimos aquí: cascadas turquesas, un jardín surrealista en medio de la selva, rafting, abismos de cientos de metros, una gruta que se recorre de noche y la cultura huasteca viva. Todas con enlace directo para visitarlas.`,
    destinosPre: "¿Buscas los lugares, con su precio de entrada y cómo llegar? Están en los",
    destinosLink: `${nDestinos} destinos de la Huasteca Potosina`,

    experiencias,

    organizarTitulo: "¿Cómo organizar todo esto?",
    organizarTexto: `Las distancias entre destinos son de 1 a 2 horas por carreteras de sierra, así que la clave es agrupar por zona: Tamul y los sótanos un día, las cascadas turquesas otro, y Xilitla con Las Pozas otro. Nuestros paquetes de ${DIAS_MIN} a ${DIAS_MAX} días ya vienen armados así, con hotel y transporte resueltos — o escríbenos y armamos un plan a tu medida.`,
    btnPaquetes: `Ver paquetes de ${DIAS_MIN} a ${DIAS_MAX} días`,
    btnPrecios: "Ver todos los precios",

    tarjetaTitulo: "¿Sales de la CDMX? El viaje del mes hace dos recorridos en un fin de semana",

    faqTitulo: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Cuántos días necesito para conocer la Huasteca Potosina?",
        a: "Con 3 días cubres lo esencial (Cascada de Tamul, Las Pozas de Xilitla y un día de cascadas turquesas). Con 4 o 5 días recorres con calma e incluyes rafting, sótanos o el Puente de Dios. Menos de 3 días se siente apresurado porque las distancias entre destinos son de 1 a 2 horas.",
      },
      {
        q: "¿Qué es lo más imperdible si solo tengo un día?",
        a: "La Expedición Tamul: en un solo día navegas en canoa hasta la Cascada de Tamul, te asomas al Sótano de las Huahuas y nadas en el cenote de la Cueva del Agua. Es el tour más completo de la región.",
      },
      {
        q: "¿La Huasteca Potosina es para ir con niños?",
        a: "Sí. Hay actividades de dificultad baja muy aptas para familias: las cascadas de Micos, Minas Viejas, la Ruta Surrealista de Edward James y los balnearios de nacimientos. Los niños pagan con descuento en nuestros tours (70 % de 6 a 10 años, 50 % menores de 6).",
      },
      {
        q: "¿Cuánto cuesta hacer estas actividades?",
        a: `Los recorridos guiados de un día van de ${money(rango.min)} a ${money(rango.max)} MXN por persona.${NO_POR_PERSONA.length ? ` Algunos no se cobran por cabeza: ${listaEs(NO_POR_PERSONA.map((t) => `${t.nombreCorto} (${etiquetaUnidad(t)})`))}.` : ""} Todos incluyen seguro de viaje y las fotos y el video que toma tu guía; la ficha de cada uno detalla qué más incluye. En nuestra página de precios está la lista completa.`,
      },
      {
        q: "¿Puedo visitar la Huasteca por mi cuenta, sin tour?",
        a: "Sí se puede, sobre todo si viajas en auto. Considera que varios accesos (como el embarcadero de Tamul o las lanchas del Tampaón) se contratan en sitio, las carreteras de la sierra requieren manejar de día y en temporada alta los cupos se agotan. Un tour resuelve transporte, entradas, seguridad y logística por un precio cerrado.",
      },
    ],

    ctaTitulo: "¿Te ayudamos a armar tu viaje?",
    ctaTexto:
      "Dinos tus fechas y cuántos vienen, y te proponemos el plan ideal — somos guías locales certificados y salimos todos los días del año.",
    waTexto: "Hola, leí la guía de qué hacer en la Huasteca y quiero armar mi viaje. ¿Me ayudan?",
    waBoton: "Planear por WhatsApp",
  };
}
