import type { Locale } from "./config";

/**
 * Traducción de /nosotros.
 *
 * A diferencia de las reseñas de clientes, casi todo lo de esta página es copy
 * PROPIO de la empresa (historia, valores, biografías del equipo), así que sí se
 * traduce. Las únicas excepciones son los testimonios de viajeros, que llevan
 * etiqueta de idioma como en el resto del sitio.
 *
 * ⚠️ Las cifras (años, reseñas, hectáreas, porcentajes, precios) se copian tal
 * cual del español. Ninguna es nueva.
 *
 * ⚠️ Las citas del equipo (Carlos, Miguel Ángel, José) sí están traducidas: son
 * personas de la casa y la empresa controla ese texto. Conviene que Manolo se lo
 * enseñe a cada uno antes de publicar.
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

  equipoEyebrow: string;
  equipoH2a: string;
  equipoH2b: string;
  guiasEstrellas: (rating: string, n: string) => string;
  guias: { rol: string; historia: string; cita: string; badge: string }[];
  resenasLabel: string;

  testimoniosEyebrow: string;
  testimoniosH2a: string;
  testimoniosH2b: string;
  /** Vacío en español; en inglés avisa del idioma original. */
  resenasEnEspanol: string;
  verResenas: string;

  garantiasEyebrow: string;
  cuatroNueveEstrellas: string;
  garantiasH2a: string;
  garantiasH2b: string;
  certificaciones: { titulo: string; sub: string }[];
  googleLink: string;
  nom09Titulo: string;
  hazClicBadges: string;
  hablarConEquipo: string;
  mxnVehiculo: string;
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

  personas: { jobTitle: string; description: string; credential?: string; credentialCategory?: string }[];
  /** Los hitos, en el MISMO orden que el año; el año no se traduce. */
  historia: { hito: string; ctaLabel?: string }[];
}

const ES: NosotrosContent = {
  metaTitle: "Quiénes Somos — Guías Locales Certificados | Tours Huasteca Potosina",
  metaDescription:
    "Empresa familiar de guías nacidos en la Huasteca Potosina. 6+ años desde 2019, certificación NOM-09 SECTUR y el compromiso de mostrarte la región como ningún otro puede hacerlo.",
  ogTitle: "Quiénes Somos — Tours Huasteca Potosina",
  ogDescription:
    "Guías locales certificados NOM-09 SECTUR. 6+ años desde 2019, 4.9 estrellas en Google, cero incidentes.",
  twitterDescription: "Guías locales certificados NOM-09 con 6+ años desde 2019. 4.9★ · 492 reseñas.",
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
    { num: "4.9 ★", label: "Calificación Google" },
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
    "Tours Huasteca Potosina nació formalmente en 2019, cuando Manolo Covarrubias la fundó. Pero las raíces de nuestro equipo vienen de mucho antes: de 2010, cuando Carlos Rodríguez — hoy nuestro guía principal — tenía 19 años y ya llevaba turistas a la Cascada de Tamul a pie, porque no había carretera asfaltada y él era el único que sabía cómo llegar.",
  historiaP2:
    "Lo que siguió fueron años de aprendizaje en el campo — pescando en el Tampaón, haciendo rappel en los cañones, conociendo a los ejidatarios que custodian el acceso a los sitios más espectaculares. Cuando los tres guías se unieron en 2015, tenían lo que ninguna agencia puede comprar: quince años de conocimiento local acumulado. En 2019, Manolo — nacido en Xilitla y convencido de que la Huasteca merece ser conocida por el mundo — unió todo ese talento local bajo una misma empresa y una misma misión.",
  historiaCita:
    "Un grupo de Guadalajara llegó al primer tour en 2020. Escépticos, con sueño, preguntando si valía la pena madrugar. Eran las 5:15 AM cuando llegamos al borde del Sótano. Empezaron a salir los pericos — miles, en espiral, con ese sonido que no existe en ningún otro lugar del mundo. Un señor de unos 55 años se quedó llorando. No podía explicar por qué. Solo decía 'gracias, gracias'. Ese momento fue cuando entendimos que esto no era un negocio de turismo. Era algo más grande.",
  historiaCitaAutor: "Carlos Rodríguez · Guía Principal · 2020",
  historiaP3:
    "Hoy, más de quince años después de aquel primer viaje improvisado al Tamul, somos la operadora turística mejor calificada de la región en Google Maps: 492 reseñas verificadas, 4.9 estrellas. Pero seguimos siendo las mismas personas que crecieron aquí.",

  valoresEyebrow: "Lo que nos define",
  valoresH2: "Nuestros",
  valoresH2Em: "valores",
  valores: [
    { titulo: "Pasión local", texto: "Nacimos aquí. La Huasteca no es un trabajo para nosotros — es nuestra casa, nuestra familia y nuestro orgullo.", fotoAlt: "Guías locales en la Cascada de Tamul" },
    { titulo: "Seguridad primero", texto: "Todos nuestros guías tienen certificación en primeros auxilios, rescate acuático y manejo de grupos en entornos naturales.", fotoAlt: "Carlos Rodríguez — guía certificado con equipo de seguridad" },
    { titulo: "Turismo responsable", texto: "Aforos limitados, cero plásticos y $30 MXN de cada tour van al Fondo de Conservación Huasteca.", fotoAlt: "Grupo en canoa en el Cañón del Tampaón — bajo impacto" },
    { titulo: "Experiencia auténtica", texto: "No seguimos guiones. Cada recorrido se adapta al ritmo y los intereses de tu grupo para vivir la Huasteca de verdad.", fotoAlt: "Cueva del Agua — destinos inaccesibles solo con guía local" },
    { titulo: "Grupos pequeños", texto: "Máximo 12 personas por grupo. Atención personalizada y acceso a rincones que los autobuses turísticos nunca verán.", fotoAlt: "Grupo pequeño en el río — experiencia personalizada" },
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

  equipoEyebrow: "Quienes te guiarán",
  equipoH2a: "Nuestro",
  equipoH2b: "equipo",
  guiasEstrellas: (rating, n) => `${rating} · ${n} reseñas`,
  guias: [
    {
      rol: "Guía Principal · Tamul & Sótano",
      historia: "Creció en Tamuín, a 15 minutos de la Cascada de Tamul. A los 14 años ya llevaba a sus primos al río a pie porque no había carretera hasta allá. Fue el primer guía de la región en certificarse con SECTUR en la norma NOM-09 y hoy conoce cada piedra del Cañón del Tampaón, cada corriente del Sótano y cada sendero oculto que ningún autobús turístico verá jamás. Ha guiado más de 800 grupos sin un solo incidente.",
      cita: "El momento que más me emociona es cuando llegamos al recodo del Tampaón y de repente aparece la cascada completa. Llevo seis años viéndola y todavía me quedo sin palabras — igual que mis viajeros.",
      badge: "NOM-09 SECTUR",
    },
    {
      rol: "Guía Acuático · Río Tampaón",
      historia: "Creció pescando en el río Tampaón con su padre cada amanecer. Aprendió a leer las corrientes antes de aprender a leer en la escuela. Hoy es el especialista acuático del equipo: tiene certificación de rescate en aguas rápidas de Cruz Roja Mexicana y ha guiado más de 600 grupos en el río sin un solo incidente. Si el río está difícil ese día, Miguel Ángel lo sabe antes de llegar. Habla inglés avanzado: si reservas en inglés, pídelo y te acompaña él.",
      cita: "El Tampaón no es el mismo río dos días seguidos. Eso es lo que me apasiona: cada amanecer leo el agua y decido la ruta. No hay guión — hay conocimiento del río.",
      badge: "Rescate Acuático Cruz Roja",
    },
    {
      rol: "Guía de Aventura · Rappel & Cañones",
      historia: "Empezó a hacer rappel a los 18 años en los cañones de Ciudad Valles. A los 22 fue uno de los primeros en descender al fondo del Sótano de las Golondrinas en modo técnico. Hoy entrena a otros guías y diseña los protocolos de seguridad de todos nuestros tours de aventura. Su principio: la adrenalina real viene del conocimiento, no de la imprudencia.",
      cita: "Mi trabajo es que la persona con más miedo al vacío llegue al borde del Sótano y se sienta más viva que nunca. Cuando lo logro — y casi siempre lo logro — ese momento no tiene precio.",
      badge: "Aventura · SECTUR",
    },
  ],
  resenasLabel: "reseñas",

  testimoniosEyebrow: "Lo que dicen de nuestro equipo",
  testimoniosH2a: "Mencionan a nuestros guías ",
  testimoniosH2b: "por nombre",
  resenasEnEspanol: "",
  verResenas: "Ver las 492 reseñas verificadas en Google →",

  garantiasEyebrow: "Respaldo oficial",
  cuatroNueveEstrellas: "4.9 Estrellas",
  garantiasH2a: "Nuestras ",
  garantiasH2b: "garantías",
  certificaciones: [
    { titulo: "NOM-09 SECTUR", sub: "Guías de turismo de aventura certificados por la Secretaría de Turismo de México" },
    { titulo: "Primeros Auxilios", sub: "Cruz Roja Mexicana — renovación anual obligatoria" },
    { titulo: "Guías bilingües", sub: "Español nativo · Guías completamente bilingües disponibles, pídelo al reservar" },
    { titulo: "Seguro de viajero", sub: "Responsabilidad civil y asistencia médica incluida en todos los tours" },
    { titulo: "Rescate acuático", sub: "Certificación especializada para tours en cascadas y ríos" },
    { titulo: "Guiando desde 2010", sub: "15 años de experiencia local · Empresa formal fundada en 2019" },
  ],
  googleLink: "492 reseñas en Google ↗",
  nom09Titulo: "Certificado NOM-09",
  hazClicBadges: "Haz clic en cada badge para comprobar",
  hablarConEquipo: "Hablar con el equipo →",
  mxnVehiculo: "MXN/vehículo",
  guiasOficiales: "Guías oficiales ↗",

  garantiasH2Full: "Certificaciones y ",
  hablemos: "Hablemos",
  disponiblesAhora: "Disponibles ahora",
  reservaConNosotros: "Reserva con nosotros",
  ctaH2: "¿Preguntas para nuestro equipo?",
  ctaTexto:
    "Carlos, Miguel Ángel o José responden en menos de una hora, todos los días. Sin bots, sin esperas.",
  ctaTours: "Ver nuestros tours",
  ctaReservar: "Reservar",
  ctaWhatsapp: "Preguntar vía WhatsApp",

  historia: [
    { hito: "Carlos Rodríguez, con 19 años, empieza a guiar informalmente a los primeros turistas que llegan a Tamuín preguntando por la Cascada de Tamul. Sin carretera asfaltada. Sin tarifa fija. Solo el conocimiento de cada vereda que nadie más tenía." },
    { hito: "Miguel Ángel Hernández se une como guía acuático. Lleva años pescando en el Tampaón con su padre y conoce cada corriente, cada roca y cada momento del día donde la luz entra diferente al cañón." },
    { hito: "José Laredo completa su primera bajada técnica al fondo del Sótano de las Golondrinas — uno de los primeros habitantes de la región en hacerlo con equipo certificado.", ctaLabel: "El Sótano es parte de nuestro Tour Tamul →" },
    { hito: "Los tres guías se conocen en una excursión espontánea a Las Pozas de Edward James. La química es inmediata: experiencia local, seguridad técnica, pasión genuina. Deciden que hay algo que construir juntos.", ctaLabel: "Visita Las Pozas con nosotros →" },
    { hito: "Primera temporada operando como equipo informal. Una camioneta rentada, tres destinos y solo boca a boca. Sin publicidad, sin página web. El 80% de los clientes venían por recomendación de otros viajeros." },
    { hito: "Primer curso de primeros auxilios y rescate en agua rápida con Cruz Roja Mexicana. Queríamos que cada familia que subiera a nuestra camioneta supiera que estaban en las mejores manos posibles. — Carlos" },
    { hito: "Primer tour privado con acceso nocturno al ejido de Tamul. Los ejidatarios — que conocen a Carlos desde niño — les abren la puerta antes del amanecer. Ese fue el origen del acceso exclusivo que ofrecemos hoy.", ctaLabel: "Conoce el acceso exclusivo al Sótano →" },
    { hito: "Manolo Covarrubias funda formalmente Tours Huasteca Potosina y une al equipo de guías bajo una misma empresa. Primera camioneta propia, primera página en WhatsApp Business y primeras reservas en línea. Tres destinos se convierten en cinco." },
    { hito: "Pandemia. Cero turistas. En vez de cerrar, usamos el tiempo para certificarnos con SECTUR, capacitar al equipo y apoyar a comunidades locales con distribución de despensas." },
    { hito: "Certificación NOM-09 SECTUR completa del equipo. Expansión a Xilitla y Las Pozas. Alianza oficial con ejido Tamul para acceso exclusivo al amanecer al Sótano de las Huahuas.", ctaLabel: "Este acceso exclusivo es parte de nuestro Tour Tamul →" },
    { hito: "Eliminación total de plásticos de un solo uso. Lanzamiento del kit de bienvenida con cantimplora reutilizable incluida en todos los tours.", ctaLabel: "Conoce nuestro compromiso ambiental →" },
    { hito: "492 reseñas verificadas en Google Maps con 4.9 estrellas de calificación. Primera temporada en que la demanda superó nuestra capacidad máxima." },
    { hito: "Creación del Fondo de Conservación Huasteca con 3 ejidos socios. Reforestación de 2.4 hectáreas de galería riparia en el Río Tampaón.", ctaLabel: "Conoce el impacto de tu reserva →" },
    { hito: "Lanzamiento de la plataforma digital con planificador de viajes con inteligencia artificial — el primero entre operadores turísticos de la región.", ctaLabel: "Prueba el recomendador IA →" },
  ],

  personas: [
    {
      jobTitle: "Fundador & CEO — Tours Huasteca Potosina",
      description: "Nacido en Xilitla, SLP. Licenciado en Estrategia y Transformación de Negocios por el Tecnológico de Monterrey. Fundó Tours Huasteca Potosina a los 22 años con la misión de difundir la hermosura de la Huasteca Potosina y ofrecer la mejor experiencia posible a cada viajero.",
    },
    {
      jobTitle: "Guía de Turismo de Aventura — Principal",
      description: "Creció en Tamuín y a los 14 años ya llevaba a sus primos a la Cascada de Tamul a pie. Primer guía certificado NOM-09 SECTUR de la región. 15+ años guiando en la Huasteca Potosina.",
      credential: "Guía de Turismo NOM-09 SECTUR",
      credentialCategory: "Certificación federal",
    },
    {
      jobTitle: "Guía Acuático — Especialista Río Tampaón",
      description: "Creció pescando en el Río Tampaón. Certificación de rescate en aguas rápidas Cruz Roja Mexicana. Especialista en los recorridos en canoa y las rutas fluviales de la Huasteca.",
      credential: "Rescate en Aguas Rápidas — Cruz Roja Mexicana",
      credentialCategory: "Certificación de rescate",
    },
    {
      jobTitle: "Guía de Aventura Extrema — Rappel y Montaña",
      description: "Uno de los primeros en descender al fondo del Sótano de las Golondrinas en modo técnico. Diseña los protocolos de seguridad de los tours de aventura extrema.",
      credential: "Guía de Turismo de Aventura NOM-09 SECTUR",
      credentialCategory: "Certificación federal",
    },
  ],
};

const EN: NosotrosContent = {
  metaTitle: "About Us — Certified Local Guides | Huasteca Potosina Tours",
  metaDescription:
    "A family business of guides born in the Huasteca Potosina. 6+ years since 2019, NOM-09 SECTUR certification and a commitment to show you the region the way no one else can.",
  ogTitle: "About Us — Huasteca Potosina Tours",
  ogDescription:
    "NOM-09 SECTUR certified local guides. 6+ years since 2019, 4.9 stars on Google, zero incidents.",
  twitterDescription: "NOM-09 certified local guides with 6+ years since 2019. 4.9★ · 492 reviews.",
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
    { num: "4.9 ★", label: "Google rating" },
    { num: "0", label: "Safety incidents" },
  ],

  fundadorEyebrow: "Founder & CEO",
  fundadorNombre: "Manolo Covarrubias",
  fundadorRol: "Founder & CEO · Huasteca Potosina Tours",
  fundadorP1:
    "Born in Xilitla, San Luis Potosí — the same Pueblo Mágico where Edward James's Las Pozas stands, at the heart of the Huasteca. He grew up surrounded by turquoise waterfalls, canyons and a landscape very few people in the world have the privilege of calling home.",
  fundadorP2:
    "He studied Business Strategy and Transformation at the Tecnológico de Monterrey. On an academic exchange in Australia he travelled its coasts, the islands of Indonesia and the landscapes of New Zealand — and that's where everything changed: comparing those destinations with the Huasteca Potosina, he realised Mexico has places just as striking or more beautiful, but the world doesn't know it yet. That conviction was the spark for everything.",
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
    "Huasteca Potosina Tours was formally founded in 2019 by Manolo Covarrubias. But our team's roots go back much further: to 2010, when Carlos Rodríguez — today our head guide — was 19 and already walking tourists to Tamul Waterfall on foot, because there was no paved road and he was the only one who knew the way.",
  historiaP2:
    "What followed were years of learning in the field — fishing on the Tampaón, rappelling the canyons, getting to know the ejidatarios who guard access to the most spectacular sites. When the three guides came together in 2015, they had something no agency can buy: fifteen years of accumulated local knowledge. In 2019 Manolo — born in Xilitla and convinced the Huasteca deserves to be known worldwide — brought all that local talent under one company and one mission.",
  historiaCita:
    "A group from Guadalajara turned up for our first tour in 2020. Sceptical, half asleep, asking whether getting up that early was worth it. It was 5:15 AM when we reached the rim of the Sótano. The parakeets began to pour out — thousands of them, spiralling, with a sound that exists nowhere else on earth. A man of about 55 stood there crying. He couldn't explain why. He just kept saying 'thank you, thank you'. That was the moment we understood this wasn't a tourism business. It was something bigger.",
  historiaCitaAutor: "Carlos Rodríguez · Head Guide · 2020",
  historiaP3:
    "Today, more than fifteen years after that first improvised trip to Tamul, we're the highest-rated tour operator in the region on Google Maps: 492 verified reviews, 4.9 stars. But we're still the same people who grew up here.",

  valoresEyebrow: "What defines us",
  valoresH2: "Our",
  valoresH2Em: "values",
  valores: [
    { titulo: "Local passion", texto: "We were born here. The Huasteca isn't a job to us — it's our home, our family and our pride.", fotoAlt: "Local guides at Tamul Waterfall" },
    { titulo: "Safety first", texto: "Every one of our guides is certified in first aid, water rescue and leading groups in natural settings.", fotoAlt: "Carlos Rodríguez — certified guide with safety gear" },
    { titulo: "Responsible tourism", texto: "Limited group sizes, zero plastics, and $30 MXN from every tour goes to the Huasteca Conservation Fund.", fotoAlt: "Group canoeing through the Tampaón Canyon — low impact" },
    { titulo: "An authentic experience", texto: "We don't follow scripts. Each tour adapts to your group's pace and interests so you experience the real Huasteca.", fotoAlt: "Water Cave — places you can only reach with a local guide" },
    { titulo: "Small groups", texto: "A maximum of 12 people per group. Personal attention and access to corners the tour buses will never see.", fotoAlt: "A small group on the river — a personal experience" },
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

  equipoEyebrow: "Who'll be guiding you",
  equipoH2a: "Our",
  equipoH2b: "team",
  guiasEstrellas: (rating, n) => `${rating} · ${n} reviews`,
  guias: [
    {
      rol: "Head Guide · Tamul & the Sinkhole",
      historia: "He grew up in Tamuín, 15 minutes from Tamul Waterfall. At 14 he was already walking his cousins to the river because there was no road out there. He was the first guide in the region to certify with SECTUR under the NOM-09 standard, and today he knows every rock in the Tampaón Canyon, every current in the sinkhole and every hidden trail no tour bus will ever see. He has guided more than 800 groups without a single incident.",
      cita: "The moment that still moves me most is when we round the bend on the Tampaón and the whole waterfall suddenly appears. I've been looking at it for six years and it still leaves me speechless — same as my travellers.",
      badge: "NOM-09 SECTUR",
    },
    {
      rol: "Water Guide · Tampaón River",
      historia: "He grew up fishing the Tampaón river with his father at first light. He learned to read the currents before he learned to read at school. Today he's the team's water specialist: he holds a swift-water rescue certification from the Mexican Red Cross and has guided more than 600 groups on the river without a single incident. If the river is difficult that day, Miguel Ángel knows before he gets there. He speaks fluent English — ask for him when you book and he'll be your guide.",
      cita: "The Tampaón isn't the same river two days running. That's what I love about it: every morning I read the water and choose the route. There's no script — there's knowing the river.",
      badge: "Red Cross Water Rescue",
    },
    {
      rol: "Adventure Guide · Rappelling & Canyons",
      historia: "He started rappelling at 18 in the canyons around Ciudad Valles. At 22 he was one of the first to descend to the floor of the Sótano de las Golondrinas on technical gear. Today he trains other guides and designs the safety protocols for all our adventure tours. His principle: real adrenaline comes from knowledge, not recklessness.",
      cita: "My job is to get the person who's most afraid of heights to the rim of the sinkhole and have them feel more alive than ever. When I manage it — and I nearly always do — that moment is priceless.",
      badge: "Adventure · SECTUR",
    },
  ],
  resenasLabel: "reviews",

  testimoniosEyebrow: "What people say about our team",
  testimoniosH2a: "They mention our guides ",
  testimoniosH2b: "by name",
  resenasEnEspanol: "In their own words (Spanish).",
  verResenas: "See all 492 verified reviews on Google →",

  garantiasEyebrow: "Official backing",
  cuatroNueveEstrellas: "4.9 Stars",
  garantiasH2a: "Our ",
  garantiasH2b: "guarantees",
  certificaciones: [
    { titulo: "NOM-09 SECTUR", sub: "Adventure tourism guides certified by Mexico's Ministry of Tourism" },
    { titulo: "First aid", sub: "Mexican Red Cross — mandatory annual renewal" },
    { titulo: "Bilingual guides", sub: "Native Spanish · Fully bilingual guides available — just ask when you book" },
    { titulo: "Traveller insurance", sub: "Public liability and medical assistance included on every tour" },
    { titulo: "Water rescue", sub: "Specialist certification for waterfall and river tours" },
    { titulo: "Guiding since 2010", sub: "15 years of local experience · Company formally founded in 2019" },
  ],
  googleLink: "492 reviews on Google ↗",
  nom09Titulo: "NOM-09 certified",
  hazClicBadges: "Click each badge to verify it",
  hablarConEquipo: "Talk to the team →",
  mxnVehiculo: "MXN/vehicle",
  guiasOficiales: "Official guides ↗",

  garantiasH2Full: "Certifications and ",
  hablemos: "Let's talk",
  disponiblesAhora: "Available now",
  reservaConNosotros: "Book with us",
  ctaH2: "Questions for our team?",
  ctaTexto:
    "Carlos, Miguel Ángel or José reply in under an hour, every day. No bots, no waiting.",
  ctaTours: "See our tours",
  ctaReservar: "Book",
  ctaWhatsapp: "Ask on WhatsApp",

  historia: [
    { hito: "Carlos Rodríguez, aged 19, starts informally guiding the first tourists who turn up in Tamuín asking about Tamul Waterfall. No paved road. No fixed rate. Just knowledge of every path that nobody else had." },
    { hito: "Miguel Ángel Hernández joins as a water guide. He has spent years fishing the Tampaón with his father and knows every current, every rock and every hour of the day when the light falls differently into the canyon." },
    { hito: "José Laredo completes his first technical descent to the floor of the Sótano de las Golondrinas — one of the first people from the region to do it with certified gear.", ctaLabel: "The sinkhole is part of our Tamul Tour →" },
    { hito: "The three guides meet on a spur-of-the-moment trip to Edward James's Las Pozas. The chemistry is instant: local experience, technical safety, genuine passion. They decide there's something to build together.", ctaLabel: "Visit Las Pozas with us →" },
    { hito: "Their first season operating as an informal team. One rented van, three destinations and word of mouth alone. No advertising, no website. 80% of customers came on another traveller's recommendation." },
    { hito: "First first-aid and swift-water rescue course with the Mexican Red Cross. We wanted every family who climbed into our van to know they were in the best possible hands. — Carlos" },
    { hito: "First private tour with night access to the Tamul ejido. The ejidatarios — who have known Carlos since he was a boy — open the gate before dawn. That was the origin of the exclusive access we offer today.", ctaLabel: "See the exclusive sinkhole access →" },
    { hito: "Manolo Covarrubias formally founds Huasteca Potosina Tours and brings the guides together under one company. Their first own van, first WhatsApp Business page and first online bookings. Three destinations become five." },
    { hito: "The pandemic. Zero tourists. Instead of closing, we used the time to certify with SECTUR, train the team and support local communities with food-parcel deliveries." },
    { hito: "Full NOM-09 SECTUR certification for the team. Expansion to Xilitla and Las Pozas. Official partnership with the Tamul ejido for exclusive dawn access to the Sótano de las Huahuas.", ctaLabel: "This exclusive access is part of our Tamul Tour →" },
    { hito: "Single-use plastics eliminated entirely. Launch of the welcome kit with a reusable water bottle included on every tour.", ctaLabel: "See our environmental commitment →" },
    { hito: "492 verified reviews on Google Maps with a 4.9-star rating. The first season where demand outstripped our maximum capacity." },
    { hito: "Creation of the Huasteca Conservation Fund with 3 partner ejidos. Replanting of 2.4 hectares of riparian woodland along the Tampaón River.", ctaLabel: "See the impact of your booking →" },
    { hito: "Launch of the digital platform with an AI trip planner — the first among tour operators in the region.", ctaLabel: "Try the AI recommender →" },
  ],

  personas: [
    {
      jobTitle: "Founder & CEO — Huasteca Potosina Tours",
      description: "Born in Xilitla, SLP. Degree in Business Strategy and Transformation from the Tecnológico de Monterrey. He founded Huasteca Potosina Tours at 22 with the mission of sharing the beauty of the Huasteca Potosina and giving every traveller the best possible experience.",
    },
    {
      jobTitle: "Adventure Tourism Guide — Head Guide",
      description: "He grew up in Tamuín and by 14 was already walking his cousins to Tamul Waterfall. The region's first NOM-09 SECTUR certified guide. 15+ years guiding in the Huasteca Potosina.",
      credential: "NOM-09 SECTUR Tourism Guide",
      credentialCategory: "Federal certification",
    },
    {
      jobTitle: "Water Guide — Tampaón River Specialist",
      description: "He grew up fishing the Tampaón River. Swift-water rescue certification from the Mexican Red Cross. Specialist in the canoe trips and river routes of the Huasteca.",
      credential: "Swift-Water Rescue — Mexican Red Cross",
      credentialCategory: "Rescue certification",
    },
    {
      jobTitle: "Extreme Adventure Guide — Rappelling and Mountain",
      description: "One of the first to descend to the floor of the Sótano de las Golondrinas on technical gear. He designs the safety protocols for the extreme adventure tours.",
      credential: "NOM-09 SECTUR Adventure Tourism Guide",
      credentialCategory: "Federal certification",
    },
  ],
};

export function getNosotros(locale: Locale): NosotrosContent {
  return locale === "en" ? EN : ES;
}
