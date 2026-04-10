export interface Review {
  nombre:    string;
  ciudad:    string;
  texto:     string;
  rating:    number;
  iniciales: string;
  fecha:     string; // "Marzo 2025"
}

export const GOOGLE_MAPS_REVIEWS_URL =
  "https://maps.app.goo.gl/SWGyihBFTiykTFFM6";

/** Keyed by tour.id */
export const TOUR_REVIEWS: Record<string, Review[]> = {
  "tour-tamul": [
    {
      nombre:    "Sandra Morales",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "SM",
      fecha:     "Febrero 2025",
      texto:
        "Salimos a las 5:30 AM y valió cada minuto de sueño perdido. Ver a los pericos salir del sótano al amanecer es algo que no te puedo describir con palabras. El guía conocía cada rincón y nos llevó al mirador perfecto para la foto. 10/10.",
    },
    {
      nombre:    "Andrés Villanueva",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "AV",
      fecha:     "Enero 2025",
      texto:
        "La canoa por el Cañón del Tampaón es surrealista. Las paredes de roca a los lados, el silencio, y de repente la cascada. Fui con mi pareja y fue el mejor día del viaje por mucho. El desayuno que incluyeron estaba delicioso también.",
    },
    {
      nombre:    "Fernanda Ortiz",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "FO",
      fecha:     "Marzo 2025",
      texto:
        "La Cueva del Agua es de otro planeta. El agua turquesa, la luz entrando por la cueva… las fotos que nos mandaron al día siguiente eran increíbles. Ya convencí a mis amigas para venir el próximo año.",
    },
  ],

  "tour-edward-james": [
    {
      nombre:    "Mariana Castro",
      ciudad:    "Querétaro, QRO",
      rating:    5,
      iniciales: "MC",
      fecha:     "Diciembre 2024",
      texto:
        "Las Pozas de Edward James son lo más extraño y hermoso que he visto en México. El guía nos contó toda la historia del poeta inglés y el contexto lo hace todo más impresionante. El Nacimiento de Huichihuayán después es el contraste perfecto.",
    },
    {
      nombre:    "Tomás Herrera",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "TH",
      fecha:     "Enero 2025",
      texto:
        "Vine solo y valió muchísimo. El grupo era pequeño, el guía bilingüe y el ritmo del tour fue perfecto —ni apresurado ni aburrido. La Cueva de las Quilas es un plus que no esperaba y fue lo que más me sorprendió.",
    },
    {
      nombre:    "Lucía Ramírez",
      ciudad:    "San Luis Potosí",
      rating:    5,
      iniciales: "LR",
      fecha:     "Febrero 2025",
      texto:
        "Vivo en SLP y no conocía las Pozas. Vergüenza me da. El tour estuvo perfectamente organizado, sin esperas, con todo incluido. El desayuno buffet en el camino estaba buenísimo. Regresé al siguiente mes con mis papás.",
    },
  ],

  "tour-meco": [
    {
      nombre:    "Carlos Reyes",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "CR",
      fecha:     "Enero 2025",
      texto:
        "El color del agua del Meco a las 10 AM es imposible. Nunca había visto algo así en México. El guía nos posicionó en el ángulo exacto para las fotos y el resultado fue espectacular. Tour muy bien organizado.",
    },
    {
      nombre:    "Paola Jiménez",
      ciudad:    "CDMX",
      rating:    5,
      iniciales: "PJ",
      fecha:     "Marzo 2025",
      texto:
        "El mirador panorámico vale el esfuerzo de la subida —que tampoco es tan difícil. Ver la cascada desde arriba y luego bajar a nadar en ella es una experiencia completa. Lo recomiendo especialmente para quienes llevan cámara.",
    },
    {
      nombre:    "Roberto Sánchez",
      ciudad:    "Puebla, PUE",
      rating:    5,
      iniciales: "RS",
      fecha:     "Febrero 2025",
      texto:
        "Fui en familia con mis hijos de 8 y 11 años. Dificultad perfecta para ellos, el guía fue muy paciente y las explicaciones de por qué el agua es de ese color les encantó. Definitivamente el tour más accesible y más bonito.",
    },
  ],

  "tour-minas-micos": [
    {
      nombre:    "Valeria Guzmán",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "VG",
      fecha:     "Diciembre 2024",
      texto:
        "Minas Viejas me dejó literalmente sin palabras. Ese color jade del agua no existe en ningún otro lado. Flotar en las terrazas de travertino con la selva encima es una experiencia que no te imaginas hasta que la vives.",
    },
    {
      nombre:    "Rodrigo Sánchez",
      ciudad:    "Querétaro, QRO",
      rating:    5,
      iniciales: "RS",
      fecha:     "Enero 2025",
      texto:
        "Fui con mis hijos de 6 y 9 años. El tour es perfecto para familias: fácil, seguro, con chalecos para todos y un guía super paciente. Las Cascadas de Micos las disfrutaron muchísimo. Precio que incluye más de lo que esperaba.",
    },
    {
      nombre:    "Isabel Torres",
      ciudad:    "León, GTO",
      rating:    5,
      iniciales: "IT",
      fecha:     "Febrero 2025",
      texto:
        "Vine a la Huasteca sin expectativas y Minas Viejas me voló la cabeza. El agua es irreal. El tour estuvo perfectamente organizado, el transporte puntual y el guía muy conocedor. Ya reservé para volver el próximo año.",
    },
  ],

  "tour-puente-dios": [
    {
      nombre:    "Diego Medina",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "DM",
      fecha:     "Enero 2025",
      texto:
        "Entrar al Puente de Dios con el río fluyendo bajo los pies y la luz entrando por el arco de piedra es una de las experiencias más cinematográficas que he vivido. El guía sabía exactamente a qué hora para la luz perfecta. Genial.",
    },
    {
      nombre:    "Ana Gutiérrez",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "AG",
      fecha:     "Marzo 2025",
      texto:
        "El tour más completo que hicimos en la Huasteca. Las Siete Cascadas en secuencia ya son impresionantes solas, pero combinadas con el Puente de Dios y la Hacienda es un día brutal. Regresé agotada y feliz.",
    },
    {
      nombre:    "Javier Mora",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "JM",
      fecha:     "Febrero 2025",
      texto:
        "El agua a 20°C es perfecta para nadar incluso en diciembre. Todo incluido como prometieron, sin costos extra en el camino. El desayuno buffet estaba delicioso. Mejor tour de los 3 que hicimos en la región.",
    },
  ],
};
