export interface Review {
  nombre:    string;
  ciudad:    string;
  texto:     string;
  rating:    number;
  iniciales: string;
  fecha:     string; // "Marzo 2025"
  foto:      string; // ruta a imagen local
}

export const GOOGLE_MAPS_REVIEWS_URL =
  "https://share.google/YS3dbxN4wrnHZ8lO9";

/** Keyed by tour.id */
export const TOUR_REVIEWS: Record<string, Review[]> = {
  "tour-rzr-xilitla": [
    {
      nombre:    "Andrés Patiño",
      ciudad:    "Querétaro, QRO",
      rating:    5,
      iniciales: "AP",
      fecha:     "Marzo 2025",
      foto:      "/imagenes/reviews/reviewer-2.jpg",
      texto:
        "Manejar el RZR cruzando los ríos fue lo mejor del viaje. Salimos llenos de lodo y muertos de risa. El guía nos abrió la ruta todo el tiempo y nunca sentimos inseguridad. La cascada Nanacatli al final es un premiazo. ¡Repetiría mil veces!",
    },
    {
      nombre:    "Karla Méndez",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "KM",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-8.jpg",
      texto:
        "Nunca había manejado un todoterreno y me daba nervios, pero el briefing y el guía me dieron toda la confianza. Terminé manejando los cruces de río como si nada. Súper divertido y muy bien organizado. Lleven ropa de cambio porque salen empapados de lodo.",
    },
    {
      nombre:    "Luis Carranza",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "LC",
      fecha:     "Abril 2025",
      foto:      "/imagenes/reviews/reviewer-15.jpg",
      texto:
        "Fuimos cuatro amigos y la pasamos increíble. La ruta por la selva es preciosa y los tramos de barro le ponen la adrenalina perfecta. Llegar a una cascada escondida a la que no llegas de otra forma vale totalmente la pena. Muy recomendable.",
    },
  ],
  "tour-rafting-tampaon": [
    {
      nombre:    "Fernando Rueda",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "FR",
      fecha:     "Abril 2026",
      foto:      "/imagenes/reviews/reviewer-11.jpg",
      texto:
        "El agua turquesa del Tampaón no parece real hasta que estás remando encima de ella. Los rápidos te sacan gritos y risas por igual, y el guía dentro de la balsa te da toda la confianza. La Tumba es impresionante — ese silencio antes del rápido no se olvida.",
    },
    {
      nombre:    "Alejandra Mora",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "AM",
      fecha:     "Marzo 2026",
      foto:      "/imagenes/reviews/reviewer-21.jpg",
      texto:
        "No sé nadar y aun así fue de lo mejor del viaje. El chaleco, el casco y el briefing te dan mucha seguridad, y en los tramos tranquilos hasta me animé a flotar en el río. Salimos empapados y felices. 100% recomendado aunque sea tu primera vez.",
    },
    {
      nombre:    "Ricardo Peña",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "RP",
      fecha:     "Febrero 2026",
      foto:      "/imagenes/reviews/reviewer-30.jpg",
      texto:
        "Fuimos seis amigos y fue el mejor plan de todo el fin de semana. 14 kilómetros dan para muchos rápidos y todavía tiempo de nadar en el cañón. El equipo es profesional y se nota la experiencia del guía en cada instrucción. Volvemos seguro.",
    },
  ],
  "tour-rappel-tamul": [
    {
      nombre:    "Diego Salas",
      ciudad:    "Querétaro, QRO",
      rating:    5,
      iniciales: "DS",
      fecha:     "Marzo 2025",
      foto:      "/imagenes/reviews/reviewer-7.jpg",
      texto:
        "Nunca había hecho rappel en mi vida y bajar frente a la Cascada de Tamul fue una locura. Los guías te aseguran súper bien y te explican todo paso a paso. El rocío de la cascada pegándote mientras bajas es algo que no se me va a olvidar. Las fotos con dron quedaron de revista.",
    },
    {
      nombre:    "Mariana Cabrera",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "MC",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-12.jpg",
      texto:
        "La experiencia más adrenalínica que he hecho. Me daba pánico al principio pero el guía me dio toda la confianza. Estar colgada con el río turquesa abajo y la cascada al lado es indescriptible. El video que te dan al final lo he visto como veinte veces.",
    },
    {
      nombre:    "Roberto Fuentes",
      ciudad:    "Tampico, TAMPS",
      rating:    5,
      iniciales: "RF",
      fecha:     "Abril 2025",
      foto:      "/imagenes/reviews/reviewer-19.jpg",
      texto:
        "Equipo en excelente estado y guías muy profesionales. Llegamos por nuestra cuenta al embarcadero, súper fácil de encontrar. Vale cada peso. Si vienes a la Huasteca y te gusta la aventura, este rappel es obligatorio.",
    },
  ],
  "tour-tamul": [
    {
      nombre:    "Sandra Morales",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "SM",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-1.jpg",
      texto:
        "La canoa por el Cañón del Tampaón hasta la Cascada de Tamul es algo que no te puedo describir con palabras. El guía conocía cada rincón y nos llevó al mirador perfecto para la foto. Asomarse al abismo del Sótano de las Huahuas también impresiona muchísimo. 10/10.",
    },
    {
      nombre:    "Andrés Villanueva",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "AV",
      fecha:     "Enero 2025",
      foto:      "/imagenes/reviews/reviewer-2.jpg",
      texto:
        "La canoa por el Cañón del Tampaón es surrealista. Las paredes de roca a los lados, el silencio, y de repente la cascada. Fui con mi pareja y fue el mejor día del viaje por mucho. El desayuno que incluyeron estaba delicioso también.",
    },
    {
      nombre:    "Fernanda Ortiz",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "FO",
      fecha:     "Marzo 2025",
      foto:      "/imagenes/reviews/reviewer-4.jpg",
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
      foto:      "/imagenes/reviews/reviewer-16.jpg",
      texto:
        "Las Pozas de Edward James son lo más extraño y hermoso que he visto en México. El guía nos contó toda la historia del poeta inglés y el contexto lo hace todo más impresionante. El Nacimiento de Huichihuayán después es el contraste perfecto.",
    },
    {
      nombre:    "Tomás Herrera",
      ciudad:    "Ciudad de México",
      rating:    5,
      iniciales: "TH",
      fecha:     "Enero 2025",
      foto:      "/imagenes/reviews/reviewer-6.jpg",
      texto:
        "Vine solo y valió muchísimo. El grupo era pequeño, el guía bilingüe y el ritmo del tour fue perfecto —ni apresurado ni aburrido. La Cueva de las Quilas es un plus que no esperaba y fue lo que más me sorprendió.",
    },
    {
      nombre:    "Lucía Ramírez",
      ciudad:    "San Luis Potosí",
      rating:    5,
      iniciales: "LR",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-7.jpg",
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
      foto:      "/imagenes/reviews/reviewer-27.jpg",
      texto:
        "El color del agua del Meco a las 10 AM es imposible. Nunca había visto algo así en México. El guía nos posicionó en el ángulo exacto para las fotos y el resultado fue espectacular. Tour muy bien organizado.",
    },
    {
      nombre:    "Paola Jiménez",
      ciudad:    "CDMX",
      rating:    5,
      iniciales: "PJ",
      fecha:     "Marzo 2025",
      foto:      "/imagenes/reviews/reviewer-8.jpg",
      texto:
        "El mirador panorámico vale el esfuerzo de la subida —que tampoco es tan difícil. Ver la cascada desde arriba y luego bajar a nadar en ella es una experiencia completa. Lo recomiendo especialmente para quienes llevan cámara.",
    },
    {
      nombre:    "Roberto Sánchez",
      ciudad:    "Puebla, PUE",
      rating:    5,
      iniciales: "RS",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-25.jpg",
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
      foto:      "/imagenes/reviews/reviewer-20.jpg",
      texto:
        "Minas Viejas me dejó literalmente sin palabras. Ese color jade del agua no existe en ningún otro lado. Flotar en las terrazas de travertino con la selva encima es una experiencia que no te imaginas hasta que la vives.",
    },
    {
      nombre:    "Rodrigo Sánchez",
      ciudad:    "Querétaro, QRO",
      rating:    5,
      iniciales: "RS",
      fecha:     "Enero 2025",
      foto:      "/imagenes/reviews/reviewer-26.jpg",
      texto:
        "Fui con mis hijos de 6 y 9 años. El tour es perfecto para familias: fácil, seguro, con chalecos para todos y un guía super paciente. Las Cascadas de Micos las disfrutaron muchísimo. Precio que incluye más de lo que esperaba.",
    },
    {
      nombre:    "Isabel Torres",
      ciudad:    "León, GTO",
      rating:    5,
      iniciales: "IT",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-9.jpg",
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
      foto:      "/imagenes/reviews/reviewer-28.jpg",
      texto:
        "Entrar al Puente de Dios con el río fluyendo bajo los pies y la luz entrando por el arco de piedra es una de las experiencias más cinematográficas que he vivido. El guía sabía exactamente a qué hora para la luz perfecta. Genial.",
    },
    {
      nombre:    "Ana Gutiérrez",
      ciudad:    "Monterrey, NL",
      rating:    5,
      iniciales: "AG",
      fecha:     "Marzo 2025",
      foto:      "/imagenes/reviews/reviewer-12.jpg",
      texto:
        "El tour más completo que hicimos en la Huasteca. Las Siete Cascadas en secuencia ya son impresionantes solas, pero combinadas con el Puente de Dios y la Hacienda es un día brutal. Regresé agotada y feliz.",
    },
    {
      nombre:    "Javier Mora",
      ciudad:    "Guadalajara, JAL",
      rating:    5,
      iniciales: "JM",
      fecha:     "Febrero 2025",
      foto:      "/imagenes/reviews/reviewer-15.jpg",
      texto:
        "El agua a 20°C es perfecta para nadar incluso en diciembre. Todo incluido como prometieron, sin costos extra en el camino. El desayuno buffet estaba delicioso. Mejor tour de los 3 que hicimos en la región.",
    },
  ],
};
