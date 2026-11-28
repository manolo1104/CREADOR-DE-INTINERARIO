import type { Locale } from "./config";

import { GRUPO_MAX } from "@/lib/tours";
import { GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { HOTEL_PROPIO as H, horarioRestaurante } from "@/lib/hotelPropio";
import { GUIAS } from "@/lib/guias";

/** Los guías reales, para nombrarlos en la historia sin escribir sus años a mano. */
const [ALEX, ANGEL, ERICK] = GUIAS;
/**
 * Traducción de /nosotros.
 *
 * A diferencia de las reseñas de clientes, casi todo lo de esta página es copy
 * PROPIO de la empresa (historia, valores, biografías del equipo), así que sí se
 * traduce. Las únicas excepciones son los testimonios de viajeros, que llevan
 * etiqueta de idioma como en el resto del sitio.
 *
 * ⚠️ Las cifras (años, hectáreas, porcentajes, precios) se copian tal cual del
 * español. Ninguna es nueva. La calificación y el número de reseñas de Google
 * NO se escriben: salen de `resenas.ts` (GOOGLE_RATING, GOOGLE_RESENAS), para
 * que el texto no se quede atrás del JSON-LD cuando suba el conteo.
 *
 * 🔴 26 oct 2026 (Manolo): fuera Carlos, Miguel Ángel y José, que no son los
 * guías reales: su sección, su historia (los hitos de 2010 a 2015 eran de
 * ellos) y su firma en la cita. En su lugar van Alex y Ángel con lo que dice
 * `guias.ts` (desde qué año guían, de dónde son); la cita de la historia es la
 * frase de Ángel que Manolo autorizó el 29 sep.
 */

export interface NosotrosContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterDescription: string;
  orgDescription: string;
  waMsg: string;

  heroEyebrow: string;
  heroH1a: string;
  heroH1b: string;
  heroIntro: string;

  numeros: { num: string; label: string }[];

  fundadorEyebrow: string;
  fundadorNombre: string;
  fundadorRol: string;
  fundadorP1: string;
  fundadorP2: string;
  fundadorP3a: string;
  fundadorP3bStrong: string;
  fundadorP3b: string;
  fundadorBadges: string[];
  fundadorCita: string;
  fundadorCitaAutor: string;

  historiaEyebrow: string;
  historiaH2a: string;
  historiaH2b: string;
  historiaP1: string;
  historiaP2: string;
  historiaCita: string;
  historiaCitaAutor: string;
  historiaP3: string;

  /**
   * «El hotel y el restaurante también son nuestros» (7 oct 2026): la página
   * no decía «hotel» ni una vez. Los metros, los minutos y el horario salen de
   * `hotelPropio.ts`; aquí no se escribe ninguna cifra a mano.
   */
  casa: {
    eyebrow: string;
    h2a: string;
    h2b: string;
    texto: string;
    puntos: string[];
    ctaPapan: string;
    ctaPaquetes: string;
    fotoHotelAlt: string;
    fotoFogonAlt: string;
    fotoPlatillosAlt: string;
  };

  valoresEyebrow: string;
  valoresH2: string;
  valoresH2Em: string;
  valores: { titulo: string; texto: string; fotoAlt: string }[];

  impactoEyebrow: string;
  impactoH2a: string;
  impactoH2b: string;
  impactoIntro: string;
  impactoDatos: string[];
  impactoDestacado: string;
  impactoTexto: string;
  impactoCta: string;

  testimoniosEyebrow: string;
  testimoniosH2a: string;
  testimoniosH2b: string;
  /** Vacío en español; en inglés avisa del idioma original. */
  resenasEnEspanol: string;
  verResenas: string;
  /** Pie de cada reseña: «Reseña en Google · Agosto 2026». */
  resenaEnGoogle: (fecha: string) => string;
  estrellasAria: (n: number) => string;

  /** La ficha JSON-LD de cada guía real (`guias.ts`): lo comprobable, nada más. */
  guiaJobTitle: string;
  guiaDescripcion: (desde: number, origen: string | undefined, certificaciones: string[]) => string;
  guiaCredencial: string;
  guiaCredencialCategoria: string;

  garantiasEyebrow: string;
  cuatroNueveEstrellas: string;
  garantiasH2a: string;
  garantiasH2b: string;
  certificaciones: { titulo: string; sub: string }[];
  googleLink: string;
  nom09Titulo: string;
  hazClicBadges: string;
  /** Bloque de insignias: salía en español literal también en /en (F7). */
  reconocimientosTitulo: string;
  verEnTripadvisorAria: string;
  verResenasGoogleAria: string;
  secturAria: string;
  negocioVerificado: string;
  negocioVerificadoAria: string;
  hablarConEquipo: string;
  mxnVehiculo: string;
  /** Tarifa del grupo completo (`precioUnidad: "grupo"`). */
  mxnGrupo: string;
  guiasOficiales: string;

  garantiasH2Full: string;
  hablemos: string;
  disponiblesAhora: string;
  reservaConNosotros: string;
  ctaH2: string;
  ctaTexto: string;
  ctaTours: string;
  ctaReservar: string;
  ctaWhatsapp: string;

  /** Solo el fundador; las fichas de los guías se arman con `guias.ts`. */
  personas: { jobTitle: string; description: string }[];
  /** Los hitos, en el MISMO orden que el año; el año no se traduce. */
  historia: { hito: string; ctaLabel?: string }[];
}

const ES: NosotrosContent = {
  metaTitle: "Quiénes Somos — Guías Locales Certificados | Tours Huasteca Potosina",
  metaDescription:
    "Empresa familiar de guías nacidos en la Huasteca Potosina. 6+ años desde 2019, certificación NOM-09 SECTUR y el compromiso de mostrarte la región como ningún otro puede hacerlo.",
  ogTitle: "Quiénes Somos — Tours Huasteca Potosina",
  ogDescription:
    `Guías locales certificados NOM-09 SECTUR. 6+ años desde 2019, ${GOOGLE_RATING} estrellas en Google, cero incidentes.`,
  twitterDescription: `Guías locales certificados NOM-09 con 6+ años desde 2019. ${GOOGLE_RATING}★ · ${GOOGLE_RESENAS} reseñas.`,
  orgDescription:
    "Operadora turística familiar con raíces en la Huasteca Potosina desde 2010. Guías locales certificados NOM-09 SECTUR que llevan a los viajeros a los rincones que ningún autobús turístico alcanza.",
  waMsg: "Hola, quisiera saber más sobre el equipo.",

  heroEyebrow: "✦ Quiénes somos",
  heroH1a: "Una empresa familiar",
  heroH1b: " nacida en la Huasteca",
  heroIntro:
    "No somos una agencia de escritorio. Somos guías locales que crecimos explorando cada sendero, cascada y comunidad de la región.",

  numeros: [
    { num: "+10,000", label: "Viajeros guiados" },
    { num: "15+", label: "Años de experiencia local" },
    { num: `${GOOGLE_RATING} ★`, label: "Calificación Google" },
    { num: "0", label: "Incidentes de seguridad" },
  ],

  fundadorEyebrow: "Fundador & CEO",
  fundadorNombre: "Manolo Covarrubias",
  fundadorRol: "Fundador & CEO · Tours Huasteca Potosina",
  fundadorP1:
    "Nació en Xilitla, San Luis Potosí — el mismo pueblo mágico donde se encuentran Las Pozas de Edward James y el corazón de la Huasteca. Creció rodeado de cascadas turquesas, cañones y una naturaleza que muy pocas personas en el mundo tienen el privilegio de llamar hogar.",
  fundadorP2:
    "Estudió Estrategia y Transformación de Negocios en el Tecnológico de Monterrey. Durante un intercambio académico en Australia recorrió sus costas, las islas de Indonesia y los paisajes de Nueva Zelanda — y fue ahí donde todo cambió: comparando esos destinos con la Huasteca Potosina se dio cuenta de que México tiene lugares igual de impresionantes o más hermosos, pero el mundo todavía no lo sabe. Esa convicción fue la chispa que encendió todo.",
  fundadorP3a: "A sus 22 años fundó Tours Huasteca Potosina con un objetivo simple y poderoso: ",
  fundadorP3bStrong: "difundir la hermosura de la Huasteca Potosina y asegurarse de que cada viajero se lleve la mejor experiencia posible",
  fundadorP3b: " de la región más extraordinaria de México.",
  fundadorBadges: ["📍 Xilitla, SLP", "🎓 Tec de Monterrey", "📐 Estrategia & Transformación de Negocios", "22 años"],
  fundadorCita: "La Huasteca merece ser conocida por el mundo. Y el mundo merece conocer la Huasteca. Cada tour es una oportunidad de hacer eso realidad.",
  fundadorCitaAutor: "Manolo Covarrubias · Fundador & CEO",

  historiaEyebrow: "Nuestra historia",
  historiaH2a: "De guías locales a ",
  historiaH2b: "referentes de la región",
  historiaP1:
    `Tours Huasteca Potosina nació formalmente en 2019, cuando Manolo Covarrubias la fundó. En el río te acompañan guías que crecieron aquí: ${ALEX.apodo} (${ALEX.nombre}), que guía desde ${ALEX.desde}, y ${ANGEL.nombre}, desde ${ANGEL.desde}; en la montaña y en la cueva, ${ERICK.nombre}, desde ${ERICK.desde}. Los tres son de ${ALEX.origen} y están certificados por SECTUR en la norma NOM-09.`,
  historiaP2:
    "Eso es lo que ninguna agencia puede comprar: conocer los ríos porque se creció junto a ellos, y a los ejidatarios que custodian el acceso a los sitios más espectaculares. En 2019, Manolo — nacido en Xilitla y convencido de que la Huasteca merece ser conocida por el mundo — juntó ese talento local bajo una misma empresa y una misma misión.",
  historiaCita: ANGEL.frase.es,
  historiaCitaAutor: `${ANGEL.nombre} · Guía desde ${ANGEL.desde}`,
  // 🔴 F2 (28 sep 2026): decía «somos la operadora turística mejor calificada
  // de la región en Google Maps: 161 reseñas verificadas». Ni hay comparación
  // que lo respalde ni Google «verifica» reseñas. Queda el dato comprobable.
  historiaP3:
    `Hoy tenemos ${GOOGLE_RATING} estrellas en Google con ${GOOGLE_RESENAS} reseñas. Pero seguimos siendo las mismas personas que crecieron aquí.`,

  // Sin la recogida (pasamos gratis por cualquier hospedaje, no es ventaja del
  // hotel) ni el desayuno de los tours (es en El Taco Loco): ver `hotelPropio.ts`.
  casa: {
    eyebrow: "Nuestra casa en Xilitla",
    h2a: "El hotel y el restaurante ",
    h2b: "también son nuestros",
    texto: `En Xilitla está nuestro hotel, el ${H.nombre}, y dentro de él ${H.restaurante}, nuestro restaurante de cocina huasteca. Así, quien viaja con nosotros puede dormir, comer y salir al tour con la misma familia.`,
    puntos: [
      `En ${H.zona}, a ${H.metrosALasPozas} m de Las Pozas: ${H.minutosCaminando} minutos caminando.`,
      `Cocina huasteca en ${H.restaurante}, ${horarioRestaurante(false)}: zacahuil, bocoles y café de olla.`,
      "Alberca al aire libre para los huéspedes.",
      "¿Llegas en el autobús de la mañana? Si tu cuarto ya está libre, es tuyo al llegar; si no, tus maletas se quedan en recepción mientras sales al tour.",
    ],
    ctaPapan: "Conoce El Papán →",
    ctaPaquetes: "Ver paquetes con hotel →",
    fotoHotelAlt: `Alberca y jardines del ${H.nombre}, en Xilitla`,
    fotoFogonAlt: `El fogón de leña encendido en ${H.restaurante}`,
    fotoPlatillosAlt: `Chilaquiles con arrachera, frijoles y aguacate en ${H.restaurante}`,
  },

  valoresEyebrow: "Lo que nos define",
  valoresH2: "Nuestros",
  valoresH2Em: "valores",
  valores: [
    { titulo: "Pasión local", texto: "Nacimos aquí. La Huasteca no es un trabajo para nosotros — es nuestra casa, nuestra familia y nuestro orgullo.", fotoAlt: "Guías locales en la Cascada de Tamul" },
    { titulo: "Seguridad primero", texto: "Todos nuestros guías tienen certificación en primeros auxilios, rescate acuático y manejo de grupos en entornos naturales.", fotoAlt: ALEX.fotoAlt.es },
    { titulo: "Turismo responsable", texto: "Aforos limitados, cero plásticos y $30 MXN de cada tour van al Fondo de Conservación Huasteca.", fotoAlt: "Grupo en canoa en el Cañón del Tampaón — bajo impacto" },
    { titulo: "Experiencia auténtica", texto: "No seguimos guiones. Cada recorrido se adapta al ritmo y los intereses de tu grupo para vivir la Huasteca de verdad.", fotoAlt: "Cueva del Agua — destinos inaccesibles solo con guía local" },
    { titulo: "Grupos pequeños", texto: `Máximo ${GRUPO_MAX} personas por grupo. Si son más, habla con el equipo y armamos una salida privada. Atención personalizada y acceso a rincones que los autobuses turísticos nunca verán.`, fotoAlt: "Grupo pequeño en el río — experiencia personalizada" },
    { titulo: "Mejora constante", texto: "Cada temporada actualizamos protocolos, rutas y equipamiento. Capacitación continua con SECTUR.", fotoAlt: "Sótano de las Huahuas al amanecer — acceso exclusivo" },
  ],

  impactoEyebrow: "Más que turismo",
  impactoH2a: "Impacto ",
  impactoH2b: "comunitario",
  impactoIntro:
    "Cuando reservas con nosotros, tu dinero no va a una corporación. Va directamente a familias de la región y a la conservación de los ecosistemas que hicieron posible tu experiencia.",
  impactoDatos: [
    "De cada tour al Fondo de Conservación Huasteca",
    "Ejidos locales socios en el fondo de conservación",
    "De galería riparia reforestada en el Río Tampaón",
    "De cada pago se queda en comunidades huastecas",
  ],
  impactoDestacado: "✦ Al reservar cualquier tour, $30 MXN van al Fondo de Conservación Huasteca",
  impactoTexto:
    "El fondo financia reforestación con especies nativas, limpieza de ríos y capacitación ambiental en comunidades ejidales. Cada reserva es un voto por la Huasteca del futuro.",
  impactoCta: "Conoce el proyecto completo →",

  testimoniosEyebrow: "Reseñas reales de Google",
  testimoniosH2a: "Lo que dicen de ",
  testimoniosH2b: "nuestros guías",
  resenasEnEspanol: "",
  verResenas: `Ver las ${GOOGLE_RESENAS} reseñas en Google →`,
  resenaEnGoogle: (fecha) => `Reseña en Google · ${fecha}`,
  estrellasAria: (n) => `${n} de 5 estrellas`,

  guiaJobTitle: "Guía de turismo — Tours Huasteca Potosina",
  guiaDescripcion: (desde, origen, certs) => [`Guía en la Huasteca Potosina desde ${desde}.`, origen && `De ${origen.replace(/\.$/, "")}.`, certs.length > 0 && `${certs.join(" · ")}.`].filter(Boolean).join(" "),
  guiaCredencial: "Guía de Turismo NOM-09 SECTUR",
  guiaCredencialCategoria: "Certificación federal",

  garantiasEyebrow: "Respaldo oficial",
  cuatroNueveEstrellas: `${GOOGLE_RATING} Estrellas`,
  garantiasH2a: "Nuestras ",
  garantiasH2b: "garantías",
  certificaciones: [
    { titulo: "NOM-09 SECTUR", sub: "Guías de turismo de aventura certificados por la Secretaría de Turismo de México" },
    { titulo: "Primeros Auxilios", sub: "Cruz Roja Mexicana — renovación anual obligatoria" },
    { titulo: "Guía en inglés", sub: "Español nativo · Pídelo al reservar, sin costo, y te lo conseguimos" },
    { titulo: "Seguro de viajero", sub: "Incluido en rafting y RZR; en los demás tours, opcional: $80 por persona" },
    { titulo: "Rescate acuático", sub: "Certificación especializada para tours en cascadas y ríos" },
    { titulo: "Guiando desde 2010", sub: "15 años de experiencia local · Empresa formal fundada en 2019" },
  ],
  googleLink: `${GOOGLE_RESENAS} reseñas en Google ↗`,
  nom09Titulo: "Certificado NOM-09",
  hazClicBadges: "Haz clic en cada badge para comprobar",
  reconocimientosTitulo: "Reconocimientos verificables",
  verEnTripadvisorAria: "Ver en TripAdvisor",
  verResenasGoogleAria: `Ver ${GOOGLE_RESENAS} reseñas en Google Maps`,
  secturAria: "Secretaría de Turismo de México",
  negocioVerificado: "Negocio Verificado",
  negocioVerificadoAria: "Negocio verificado en Google",
  hablarConEquipo: "Hablar con el equipo →",
  mxnVehiculo: "MXN/vehículo",
  mxnGrupo: "MXN/grupo",
  guiasOficiales: "Guías oficiales ↗",

  garantiasH2Full: "Certificaciones y ",
  hablemos: "Hablemos",
  disponiblesAhora: "Disponibles ahora",
  reservaConNosotros: "Reserva con nosotros",
  ctaH2: "¿Preguntas para nuestro equipo?",
  // Antes: «Carlos, Miguel Ángel o José responden en menos de una hora».
  ctaTexto:
    "Escríbenos por WhatsApp y te contesta una persona del equipo.",
  ctaTours: "Ver nuestros tours",
  ctaReservar: "Reservar",
  ctaWhatsapp: "Preguntar vía WhatsApp",

  historia: [
    { hito: "Primera temporada operando como equipo informal. Una camioneta rentada, tres destinos y solo boca a boca. Sin publicidad, sin página web. El 80% de los clientes venían por recomendación de otros viajeros." },
    { hito: `${ALEX.apodo} empieza a guiar en los ríos de la Huasteca. Hoy es guía certificado NOM-09 SECTUR, con rescate acuático y primeros auxilios.` },
    { hito: "Primer tour privado con acceso al ejido de Tamul antes del amanecer. Ese fue el origen del acceso exclusivo que ofrecemos hoy.", ctaLabel: "Conoce el acceso exclusivo al Sótano →" },
    { hito: "Manolo Covarrubias funda formalmente Tours Huasteca Potosina y une al equipo de guías bajo una misma empresa. Primera camioneta propia, primera página en WhatsApp Business y primeras reservas en línea. Tres destinos se convierten en cinco." },
    { hito: `Pandemia. Cero turistas. En vez de cerrar, usamos el tiempo para certificarnos con SECTUR, capacitar al equipo y apoyar a comunidades locales con distribución de despensas. Ese año empieza a guiar ${ERICK.nombre}.` },
    { hito: `Certificación NOM-09 SECTUR completa del equipo. Expansión a Xilitla y Las Pozas. Alianza oficial con ejido Tamul para acceso exclusivo al amanecer al Sótano de las Huahuas. Ese mismo año se suma ${ANGEL.nombre} como guía.`, ctaLabel: "Este acceso exclusivo es parte de nuestro Tour Tamul →" },
    { hito: "Eliminación total de plásticos de un solo uso. Lanzamiento del kit de bienvenida con cantimplora reutilizable incluida en todos los tours.", ctaLabel: "Conoce nuestro compromiso ambiental →" },
    // 🔴 Hito 2023: decía «161 reseñas verificadas en Google Maps con 4.7
    // estrellas», que es la cifra de HOY fechada en 2023 (salió del reemplazo
    // masivo 492→161). Sin la cifra real de aquel año, se deja solo el hecho.
    { hito: "Primera temporada en que la demanda superó nuestra capacidad máxima." },
    { hito: "Creación del Fondo de Conservación Huasteca con 3 ejidos socios. Reforestación de 2.4 hectáreas de galería riparia en el Río Tampaón.", ctaLabel: "Conoce el impacto de tu reserva →" },
    { hito: "Lanzamiento de la plataforma digital con planificador de viajes con inteligencia artificial — el primero entre operadores turísticos de la región.", ctaLabel: "Prueba el recomendador IA →" },
  ],

  personas: [
    {
      jobTitle: "Fundador & CEO — Tours Huasteca Potosina",
      description: "Nacido en Xilitla, SLP. Licenciado en Estrategia y Transformación de Negocios por el Tecnológico de Monterrey. Fundó Tours Huasteca Potosina a los 22 años con la misión de difundir la hermosura de la Huasteca Potosina y ofrecer la mejor experiencia posible a cada viajero.",
    },
  ],
};

const EN: NosotrosContent = {
  metaTitle: "About Us — Certified Local Guides | Huasteca Potosina Tours",
  metaDescription:
    "A family business of guides born in the Huasteca Potosina. 6+ years since 2019, NOM-09 SECTUR certification and a commitment to show you the region the way no one else can.",
  ogTitle: "About Us — Huasteca Potosina Tours",
  ogDescription:
    `NOM-09 SECTUR certified local guides. 6+ years since 2019, ${GOOGLE_RATING} stars on Google, zero incidents.`,
  twitterDescription: `NOM-09 certified local guides with 6+ years since 2019. ${GOOGLE_RATING}★ · ${GOOGLE_RESENAS} reviews.`,
  orgDescription:
    "A family-run tour operator with roots in the Huasteca Potosina since 2010. NOM-09 SECTUR certified local guides who take travellers to the corners no tour bus ever reaches.",
  waMsg: "Hi, I'd like to know more about the team.",

  heroEyebrow: "✦ About us",
  heroH1a: "A family business",
  heroH1b: " born in the Huasteca",
  heroIntro:
    "We're not a desk-bound agency. We're local guides who grew up exploring every trail, waterfall and village in the region.",

  numeros: [
    { num: "+10,000", label: "Travellers guided" },
    { num: "15+", label: "Years of local experience" },
    { num: `${GOOGLE_RATING} ★`, label: "Google rating" },
    { num: "0", label: "Safety incidents" },
  ],

  fundadorEyebrow: "Founder & CEO",
  fundadorNombre: "Manolo Covarrubias",
  fundadorRol: "Founder & CEO · Huasteca Potosina Tours",
  fundadorP1:
    "Born in Xilitla, San Luis Potosí — the same Pueblo Mágico where Edward James's Las Pozas stands, at the heart of the Huasteca. He grew up surrounded by turquoise waterfalls, canyons and a landscape very few people in the world have the privilege of calling home.",
  fundadorP2:
    "He studied Business Strategy and Transformation at the Tecnológico de Monterrey. On an academic exchange in Australia he traveled its coasts, the islands of Indonesia and the landscapes of New Zealand — and that's where everything changed: comparing those destinations with the Huasteca Potosina, he realized Mexico has places just as striking or more beautiful, but the world doesn't know it yet. That conviction was the spark for everything.",
  fundadorP3a: "At 22 he founded Huasteca Potosina Tours with one simple, powerful aim: ",
  fundadorP3bStrong: "to share the beauty of the Huasteca Potosina and make sure every traveller leaves with the best possible experience",
  fundadorP3b: " of the most extraordinary region in Mexico.",
  fundadorBadges: ["📍 Xilitla, SLP", "🎓 Tec de Monterrey", "📐 Business Strategy & Transformation", "Aged 22"],
  fundadorCita: "The Huasteca deserves to be known by the world. And the world deserves to know the Huasteca. Every tour is a chance to make that happen.",
  fundadorCitaAutor: "Manolo Covarrubias · Founder & CEO",

  historiaEyebrow: "Our story",
  historiaH2a: "From local guides to ",
  historiaH2b: "a name in the region",
  historiaP1:
    `Huasteca Potosina Tours was formally founded in 2019 by Manolo Covarrubias. On the river you're guided by people who grew up here: ${ALEX.apodo} (${ALEX.nombre}), guiding since ${ALEX.desde}, and ${ANGEL.nombre}, since ${ANGEL.desde}; in the mountains and the cave, ${ERICK.nombre}, since ${ERICK.desde}. All three are from ${ALEX.origen} and certified by SECTUR under the NOM-09 standard.`,
  historiaP2:
    "That's something no agency can buy: knowing the rivers because you grew up beside them, and knowing the ejidatarios who guard access to the most spectacular sites. In 2019 Manolo — born in Xilitla and convinced the Huasteca deserves to be known worldwide — brought that local talent under one company and one mission.",
  historiaCita: ANGEL.frase.en,
  historiaCitaAutor: `${ANGEL.nombre} · Guide since ${ANGEL.desde}`,
  historiaP3:
    `Today we're rated ${GOOGLE_RATING} stars on Google across ${GOOGLE_RESENAS} reviews. But we're still the same people who grew up here.`,

  casa: {
    eyebrow: "Our home base in Xilitla",
    h2a: "The hotel and the restaurant ",
    h2b: "are ours too",
    texto: `In Xilitla we have our own hotel, ${H.nombre}, and inside it ${H.restaurante}, our Huasteca-food restaurant. So when you travel with us, you can sleep, eat and head out on your tour with the same family.`,
    puntos: [
      `In ${H.zona}, ${H.metrosALasPozas} m from Las Pozas: a ${H.minutosCaminando}-minute walk.`,
      `Huasteca cooking at ${H.restaurante}, ${horarioRestaurante(true)}: zacahuil, bocoles and café de olla.`,
      "Outdoor pool for guests.",
      "Arriving on the morning bus? If your room is ready, it's yours when you arrive; if not, your bags stay at reception while you head out on your tour.",
    ],
    ctaPapan: "About El Papán →",
    ctaPaquetes: "See packages with hotel →",
    fotoHotelAlt: `Pool and gardens at ${H.nombre}, in Xilitla`,
    fotoFogonAlt: `The wood fire burning in the hearth at ${H.restaurante}`,
    fotoPlatillosAlt: `Chilaquiles with arrachera, beans and avocado at ${H.restaurante}`,
  },

  valoresEyebrow: "What defines us",
  valoresH2: "Our",
  valoresH2Em: "values",
  valores: [
    { titulo: "Local passion", texto: "We were born here. The Huasteca isn't a job to us — it's our home, our family and our pride.", fotoAlt: "Local guides at Tamul Waterfall" },
    { titulo: "Safety first", texto: "Every one of our guides is certified in first aid, water rescue and leading groups in natural settings.", fotoAlt: ALEX.fotoAlt.en },
    { titulo: "Responsible tourism", texto: "Limited group sizes, zero plastics, and $30 MXN from every tour goes to the Huasteca Conservation Fund.", fotoAlt: "Group canoeing through the Tampaón Canyon — low impact" },
    { titulo: "An authentic experience", texto: "We don't follow scripts. Each tour adapts to your group's pace and interests so you experience the real Huasteca.", fotoAlt: "Water Cave — places you can only reach with a local guide" },
    { titulo: "Small groups", texto: `A maximum of ${GRUPO_MAX} people per group. Traveling with more? Talk to the team and we'll arrange a private departure. Personal attention and access to corners the tour buses will never see.`, fotoAlt: "A small group on the river — a personal experience" },
    { titulo: "Constant improvement", texto: "Every season we update protocols, routes and equipment. Ongoing training with SECTUR.", fotoAlt: "Sótano de las Huahuas at dawn — exclusive access" },
  ],

  impactoEyebrow: "More than tourism",
  impactoH2a: "Community ",
  impactoH2b: "impact",
  impactoIntro:
    "When you book with us, your money doesn't go to a corporation. It goes straight to families in the region and to conserving the ecosystems that made your experience possible.",
  impactoDatos: [
    "From every tour to the Huasteca Conservation Fund",
    "Local ejidos partnered in the conservation fund",
    "Of riparian woodland replanted along the Tampaón River",
    "Of every payment stays in Huastec communities",
  ],
  impactoDestacado: "✦ Book any tour and $30 MXN goes to the Huasteca Conservation Fund",
  impactoTexto:
    "The fund pays for replanting with native species, river clean-ups and environmental training in ejido communities. Every booking is a vote for the Huasteca of the future.",
  impactoCta: "See the full project →",

  testimoniosEyebrow: "Real Google reviews",
  testimoniosH2a: "What travellers say about ",
  testimoniosH2b: "our guides",
  resenasEnEspanol: "In their own words (Spanish).",
  verResenas: `See all ${GOOGLE_RESENAS} reviews on Google →`,
  // La fecha de la reseña va tal cual se copió («Agosto 2026»), como el texto.
  resenaEnGoogle: (fecha) => `Google review · ${fecha}`,
  estrellasAria: (n) => `${n} out of 5 stars`,

  guiaJobTitle: "Tour guide — Huasteca Potosina Tours",
  guiaDescripcion: (desde, origen, certs) => [`Guiding in the Huasteca Potosina since ${desde}.`, origen && `From ${origen.replace(/\.$/, "")}.`, certs.length > 0 && `${certs.join(" · ")}.`].filter(Boolean).join(" "),
  guiaCredencial: "NOM-09 SECTUR Tourism Guide",
  guiaCredencialCategoria: "Federal certification",

  garantiasEyebrow: "Official backing",
  cuatroNueveEstrellas: `${GOOGLE_RATING} Stars`,
  garantiasH2a: "Our ",
  garantiasH2b: "guarantees",
  certificaciones: [
    { titulo: "NOM-09 SECTUR", sub: "Adventure tourism guides certified by Mexico's Ministry of Tourism" },
    { titulo: "First aid", sub: "Mexican Red Cross — mandatory annual renewal" },
    { titulo: "English-speaking guide", sub: "Native Spanish · Ask when you book, at no cost, and we'll arrange it" },
    { titulo: "Traveller insurance", sub: "Included on rafting and RZR; optional on the other tours: MXN $80 per person" },
    { titulo: "Water rescue", sub: "Specialist certification for waterfall and river tours" },
    { titulo: "Guiding since 2010", sub: "15 years of local experience · Company formally founded in 2019" },
  ],
  googleLink: `${GOOGLE_RESENAS} reviews on Google ↗`,
  nom09Titulo: "NOM-09 certified",
  hazClicBadges: "Click each badge to verify it",
  reconocimientosTitulo: "Verifiable recognition",
  verEnTripadvisorAria: "See us on TripAdvisor",
  verResenasGoogleAria: `See ${GOOGLE_RESENAS} reviews on Google Maps`,
  secturAria: "Mexico's Ministry of Tourism (SECTUR)",
  negocioVerificado: "Verified Business",
  negocioVerificadoAria: "Verified business on Google",
  hablarConEquipo: "Talk to the team →",
  mxnVehiculo: "MXN/vehicle",
  mxnGrupo: "MXN/group",
  guiasOficiales: "Official guides ↗",

  garantiasH2Full: "Certifications and ",
  hablemos: "Let's talk",
  disponiblesAhora: "Available now",
  reservaConNosotros: "Book with us",
  ctaH2: "Questions for our team?",
  ctaTexto:
    "Message us on WhatsApp and a real person from the team will reply.",
  ctaTours: "See our tours",
  ctaReservar: "Book",
  ctaWhatsapp: "Ask on WhatsApp",

  historia: [
    { hito: "First season operating as an informal team. One rented van, three destinations and word of mouth alone. No advertising, no website. 80% of customers came on another traveller's recommendation." },
    { hito: `${ALEX.apodo} starts guiding on the rivers of the Huasteca. Today he's a NOM-09 SECTUR certified guide, trained in water rescue and first aid.` },
    { hito: "First private tour with access to the Tamul ejido before dawn. That was the origin of the exclusive access we offer today.", ctaLabel: "See the exclusive sinkhole access →" },
    { hito: "Manolo Covarrubias formally founds Huasteca Potosina Tours and brings the guides together under one company. Their first own van, first WhatsApp Business page and first online bookings. Three destinations become five." },
    { hito: `The pandemic. Zero tourists. Instead of closing, we used the time to certify with SECTUR, train the team and support local communities with food-parcel deliveries. That year ${ERICK.nombre} starts guiding.` },
    { hito: `Full NOM-09 SECTUR certification for the team. Expansion to Xilitla and Las Pozas. Official partnership with the Tamul ejido for exclusive dawn access to the Sótano de las Huahuas. That same year ${ANGEL.nombre} joins as a guide.`, ctaLabel: "This exclusive access is part of our Tamul Tour →" },
    { hito: "Single-use plastics eliminated entirely. Launch of the welcome kit with a reusable water bottle included on every tour.", ctaLabel: "See our environmental commitment →" },
    { hito: "The first season where demand outstripped our maximum capacity." },
    { hito: "Creation of the Huasteca Conservation Fund with 3 partner ejidos. Replanting of 2.4 hectares of riparian woodland along the Tampaón River.", ctaLabel: "See the impact of your booking →" },
    { hito: "Launch of the digital platform with an AI trip planner — the first among tour operators in the region.", ctaLabel: "Try the AI recommender →" },
  ],

  personas: [
    {
      jobTitle: "Founder & CEO — Huasteca Potosina Tours",
      description: "Born in Xilitla, SLP. Degree in Business Strategy and Transformation from the Tecnológico de Monterrey. He founded Huasteca Potosina Tours at 22 with the mission of sharing the beauty of the Huasteca Potosina and giving every traveller the best possible experience.",
    },
  ],
};

export function getNosotros(locale: Locale): NosotrosContent {
  return locale === "en" ? EN : ES;
}
