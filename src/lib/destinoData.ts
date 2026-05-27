/**
 * destinoData.ts
 * Datos complementarios por destino: narrativa emocional, combinaciones sugeridas
 * y reseñas mapeadas. Se importa en la página de destino individual.
 */

// ── Narrativas emocionales (3-4 líneas antes de Datos prácticos) ─────────────

export const NARRATIVA_DESTINO: Record<string, string> = {
  "las-pozas-jardin-surrealista":
    "Hay lugares que parecen el producto de un sueño particularmente vívido. Las Pozas de Edward James es uno de ellos: columnas de concreto que suben hacia ningún lado, escaleras que desafían la gravedad, flores de piedra de cuatro metros entre cascadas reales y helechos gigantes. El poeta excéntrico que las construyó nunca pretendió que tuvieran sentido. Ese es exactamente su poder.",

  "cascada-de-tamul":
    "La Cascada de Tamul no te avisa cuándo aparece. Remas por el Cañón del Tampaón durante 30 minutos, con paredes de roca a cada lado y el silencio amplificado por el agua, y de repente el río dobla y ahí está: 105 metros de caída libre, tan ancha que no cabe en ninguna foto que hayas tomado antes. Es el tipo de lugar que te hace entender por qué la gente llora de emoción en los viajes.",

  "sotano-de-las-golondrinas":
    "Las 5:45 AM en el borde del Sótano de las Golondrinas es una de las experiencias más extrañas que puede vivir un ser humano. Abajo: oscuridad absoluta a 333 metros. Luego empieza el sonido, antes de que veas nada. Después salen ellos: miles de vencejos en espiral ascendente, como un tornado de alas que dura veinte minutos. No es naturaleza. Es un ritual.",

  "cascadas-de-micos":
    "Las Cascadas de Micos son la respuesta perfecta a la pregunta '¿qué hacemos hoy?' en la Huasteca. Siete cascadas en circuito, tirolesa, kayak, bicicleta aérea y saltos a pozas de agua cristalina —todo en un solo lugar. Es el parque de aventuras más hermoso que hayas pisado, con la diferencia de que fue diseñado por la naturaleza hace millones de años.",

  "puente-de-dios-tamasopo":
    "Existe un arco de roca natural en Tamasopo por donde fluye un río, y entre las 11 y las 13 horas el sol entra perpendicular y convierte el agua en cristal líquido de color azul cobalto. Ese efecto de luz dura dos horas. Nuestros guías conocen exactamente cuándo llegarte para que lo veas. Puente de Dios no es un destino de paso — es una cita que hay que llegar a tiempo.",

  "zona-arqueologica-tamtoc":
    "En Tamtoc, el tiempo se mide diferente. Aquí vivió, construyó y gobernó la cultura Huasteca durante más de 2,000 años antes de que existiera cualquier ciudad que hoy conoces. El Monumento 32 —una figura femenina de 30 toneladas— sigue mirando el horizonte desde el mismo punto donde la colocaron hace siglos. Visitarla al amanecer, cuando la niebla cubre el río Tampaón al fondo, es entender qué significa la antigüedad.",

  "cascadas-de-tamasopo":
    "Las Cascadas de Tamasopo tienen el agua más azul de la región. No el turquesa brillante de Tamul, sino un azul profundo, casi irreal, que surge de la piedra caliza y el mineral. El parque natural que las rodea permite nadar directamente en las pozas, bajo la caída del agua. Es el lugar donde más fotos toma la gente en toda la Huasteca —y por razones muy justificadas.",

  "balneario-taninul":
    "Las aguas termales de Taninul brotan a 38°C de la tierra de manera natural, rodeadas de palmas y jacarandas. Es el antídoto perfecto para un día de cascadas y caminatas: sumergirte en agua caliente mineral mientras el sol baja y la sierra se tiñe de naranja. Los locales lo llaman 'el spa de la Huasteca' y llevan décadas teniendo razón.",

  "cascadas-minas-viejas":
    "El agua de Minas Viejas tiene un color que no existe en ninguna paleta de colores que hayas visto: entre el jade y el turquesa, con reflejos blancos donde se rompe sobre las terrazas de travertino. Las cascadas caen en 5 niveles distintos, cada uno con una poza diferente. Es uno de esos lugares que produces en fotografía pero que no te crees del todo hasta que estás dentro.",

  "laguna-media-luna":
    "La Laguna de la Media Luna tiene una característica única en el mundo: el agua nace directamente del fondo de la laguna a temperatura constante de 27°C, todo el año, todos los días. La visibilidad llega a 18 metros bajo el agua. Los buzos la conocen como uno de los mejores spots de buceo en agua dulce de toda Latinoamérica. Sin escafandra, simplemente nadas sobre un cristal azul que nunca cambia de color.",

  "cascada-el-aguacate":
    "La Cascada El Aguacate es el secreto mejor guardado de la ruta de cascadas. Menos visitada que sus vecinas, llega al final de un sendero entre helechos gigantes que huele a tierra húmeda y selva fresca. La poza que forma es perfecta para nadar: profunda, azul y a temperatura ideal. Para quienes prefieren el descubrimiento sobre el Instagram, esta es la cascada.",

  "cascada-el-salto":
    "La Cascada El Salto no tiene la fama de Tamul, pero tiene algo que pocas cascadas pueden ofrecer: se puede nadar directamente en su base, con el agua cayendo a metros de ti. El sonido que hace al golpear la roca es físico, lo sientes en el pecho. Combinada con El Meco, forma el dúo de cascadas turquesas más fotogénico de la región.",

  "cascada-el-meco":
    "El Meco tiene la reputación de ser la cascada con el agua más turquesa de la Huasteca. No es marketing: el mineral de calcio que disuelve la roca crea un color que los fotógrafos buscan específicamente. La clave es la hora: llegar entre las 9 y las 11 de la mañana, cuando la luz solar entra perpendicular al cañón. Nuestros guías saben exactamente cuándo posicionarse.",

  "sotano-de-las-huahuas":
    "El Sótano de las Huahuas es el hermano menor del Sótano de las Golondrinas —y tiene algo que su famoso vecino no tiene: accesibilidad y una experiencia más íntima. Los pericos salen en espiral al amanecer mientras la luz del sol apenas toca el borde del abismo. El ruido que hacen juntos, amplificado por las paredes de roca, es uno de los sonidos más extraños y hermosos que existen en la naturaleza.",

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
};

// ── Combinaciones sugeridas ("los viajeros también visitan") ─────────────────

export const COMBINACION_DESTINO: Record<string, { nombre: string; slug: string }[]> = {
  "cascada-de-tamul":             [{ nombre: "Sótano de las Huahuas",      slug: "sotano-de-las-huahuas"      }, { nombre: "Sótano de las Golondrinas",  slug: "sotano-de-las-golondrinas"  }],
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
};

// ── Reseñas mapeadas por destino ─────────────────────────────────────────────
// Extraídas de TOUR_REVIEWS y asignadas al destino principal que mencionan.

export interface DestinoReview {
  nombre:    string;
  ciudad:    string;
  texto:     string;
  rating:    number;
  iniciales: string;
  foto:      string;
}

export const REVIEWS_POR_DESTINO: Record<string, DestinoReview[]> = {
  "cascada-de-tamul": [
    { nombre: "Sandra Morales", ciudad: "Ciudad de México", rating: 5, iniciales: "SM", foto: "/imagenes/reviews/reviewer-1.jpg", texto: "Salimos muy temprano y valió cada minuto de sueño perdido. Ver a los pericos salir del sótano al amanecer es algo que no te puedo describir con palabras. El guía conocía cada rincón y nos llevó al mirador perfecto para la foto." },
    { nombre: "Andrés Villanueva", ciudad: "Monterrey, NL", rating: 5, iniciales: "AV", foto: "/imagenes/reviews/reviewer-2.jpg", texto: "La canoa por el Cañón del Tampaón es surrealista. Las paredes de roca a los lados, el silencio, y de repente la cascada. Fui con mi pareja y fue el mejor día del viaje por mucho." },
    { nombre: "Fernanda Ortiz", ciudad: "Guadalajara, JAL", rating: 5, iniciales: "FO", foto: "/imagenes/reviews/reviewer-4.jpg", texto: "La Cueva del Agua es de otro planeta. El agua turquesa, la luz entrando por la cueva… las fotos que nos mandaron al día siguiente eran increíbles. Ya convencí a mis amigas para venir el próximo año." },
  ],
  "sotano-de-las-golondrinas": [
    { nombre: "Sandra Morales", ciudad: "Ciudad de México", rating: 5, iniciales: "SM", foto: "/imagenes/reviews/reviewer-1.jpg", texto: "Ver a los pericos salir del sótano al amanecer es algo que no te puedo describir con palabras. El guía conocía exactamente el ángulo perfecto para la foto. 10/10." },
    { nombre: "Sofía R.", ciudad: "Monterrey", rating: 5, iniciales: "SR", foto: "/imagenes/reviews/reviewer-3.jpg", texto: "El sótano de las huahuas al amanecer es indescriptible. Miles de aves saliendo en espiral con el cielo anaranjado de fondo. ¡Vuelvo el año que viene!" },
  ],
  "sotano-de-las-huahuas": [
    { nombre: "Carlos M.", ciudad: "CDMX", rating: 5, iniciales: "CM", foto: "/imagenes/reviews/reviewer-5.jpg", texto: "La Cascada de Tamul me dejó sin palabras. El mejor día de mi vida." },
    { nombre: "Sofía R.", ciudad: "Monterrey", rating: 5, iniciales: "SR", foto: "/imagenes/reviews/reviewer-3.jpg", texto: "El sótano de las huahuas al amanecer es indescriptible. Miles de aves saliendo en espiral con el cielo anaranjado de fondo." },
  ],
  "las-pozas-jardin-surrealista": [
    { nombre: "Ana L.", ciudad: "Guadalajara", rating: 5, iniciales: "AL", foto: "/imagenes/reviews/reviewer-17.jpg", texto: "Las Pozas de Edward James son otro mundo. Imposible de describir con palabras. Las esculturas entre la selva real crean algo que no existe en ningún otro lugar del planeta." },
    { nombre: "Miguel T.", ciudad: "CDMX", rating: 5, iniciales: "MT", foto: "/imagenes/reviews/reviewer-22.jpg", texto: "El tour más único que he hecho en México. Los guías conocen cada rincón y te explican la historia de Edward James con un nivel de detalle que hace todo más mágico." },
    { nombre: "Mariana Castro", ciudad: "Querétaro, QRO", rating: 5, iniciales: "MC", foto: "/imagenes/reviews/reviewer-16.jpg", texto: "Las Pozas de Edward James son lo más extraño y hermoso que he visto en México. Regresé al mes siguiente con mis papás. Los dos quedaron igual de impresionados." },
  ],
  "cascada-el-meco": [
    { nombre: "Laura G.", ciudad: "Querétaro", rating: 5, iniciales: "LG", foto: "/imagenes/reviews/reviewer-18.jpg", texto: "Las fotos que saqué son las mejores de mi vida. El agua realmente es turquesa. Los guías saben exactamente cuándo ir para tener la luz perfecta." },
    { nombre: "Javier S.", ciudad: "San Luis Potosí", rating: 5, iniciales: "JS", foto: "/imagenes/reviews/reviewer-23.jpg", texto: "Llegamos a la hora perfecta de luz. Los guías saben exactamente cuándo ir y el color del agua no necesita filtros. Es literalmente así." },
  ],
  "cascadas-minas-viejas": [
    { nombre: "Patricia H.", ciudad: "Monterrey", rating: 5, iniciales: "PH", foto: "/imagenes/reviews/reviewer-11.jpg", texto: "El color del agua de Minas Viejas es imposible. Lo tienes que ver con tus propios ojos. Mis hijos no querían salirse." },
    { nombre: "Roberto V.", ciudad: "CDMX", rating: 5, iniciales: "RV", foto: "/imagenes/reviews/reviewer-13.jpg", texto: "Todo perfectamente organizado para familias. Las terrazas de agua azul en cascada son algo que no olvidas fácilmente." },
  ],
  "puente-de-dios-tamasopo": [
    { nombre: "Diego F.", ciudad: "Guadalajara", rating: 5, iniciales: "DF", foto: "/imagenes/reviews/reviewer-24.jpg", texto: "El Puente de Dios con la luz entrando por el arco es algo de otro mundo. Llegamos justo a las 11 AM como recomendaron los guías y el efecto de luz es real." },
    { nombre: "Valeria C.", ciudad: "CDMX", rating: 5, iniciales: "VC", foto: "/imagenes/reviews/reviewer-19.jpg", texto: "Las Siete Cascadas en secuencia son increíbles. Fuimos cinco amigos y quedamos todos maravillados. El guía sabía exactamente el orden para aprovechar la luz." },
  ],
  "nacimiento-huichihuayan": [
    { nombre: "Ana L.", ciudad: "Guadalajara", rating: 5, iniciales: "AL", foto: "/imagenes/reviews/reviewer-17.jpg", texto: "El Nacimiento de Huichihuayán es uno de los lugares más serenos que he visitado en México. El agua a 22°C todo el año y esa transparencia increíble. Lo combinamos con Las Pozas y fue el día perfecto." },
  ],
  "cascada-el-salto": [
    { nombre: "Paola Mendoza", ciudad: "San Luis Potosí", rating: 5, iniciales: "PM", foto: "/imagenes/reviews/reviewer-6.jpg", texto: "La Cascada El Salto combinada con El Meco fue el mejor día del viaje. El agua es realmente turquesa — sin filtros. Los guías saben exactamente a qué hora llegar para la mejor luz." },
    { nombre: "Tomás Ríos", ciudad: "Querétaro", rating: 5, iniciales: "TR", foto: "/imagenes/reviews/reviewer-8.jpg", texto: "Nadar en la base de la cascada es una experiencia que no se olvida. El sonido del agua golpeando la roca lo sientes en el pecho. Las pozas son cristalinas. Volveremos en septiembre para verla con más agua." },
  ],
  "nacimiento-tambaque": [
    { nombre: "Claudia Espinoza", ciudad: "CDMX", rating: 5, iniciales: "CE", foto: "/imagenes/reviews/reviewer-9.jpg", texto: "Tambaque es exactamente lo que necesitaba. Sin ruido, sin multitudes, solo agua cristalina y árboles. La temperatura del agua sorprende un poco al principio pero te acostumbras rápido. El lugar más tranquilo de toda la Huasteca." },
    { nombre: "Emilio V.", ciudad: "Monterrey", rating: 5, iniciales: "EV", foto: "/imagenes/reviews/reviewer-14.jpg", texto: "Un nacimiento de agua escondido entre tamarindos. El sendero de acceso ya es parte de la experiencia. Mi novia propuso matrimonio aquí — el lugar lo inspiró. 10/10." },
  ],
  "voladores-tamaleton": [
    { nombre: "Beatriz Cruz", ciudad: "Guadalajara", rating: 5, iniciales: "BC", foto: "/imagenes/reviews/reviewer-20.jpg", texto: "Ver a los Voladores de Tamaletón en persona es algo completamente diferente a verlos en video. La combinación del ritual, la música y el mástil a 30 metros te deja sin palabras. El guía explicó cada detalle del significado sagrado. Emocionante." },
    { nombre: "Ignacio Soto", ciudad: "CDMX", rating: 5, iniciales: "IS", foto: "/imagenes/reviews/reviewer-21.jpg", texto: "Un ritual de 2,000 años perfectamente preservado. Los danzantes bajan gigrando exactamente 52 vueltas. No esperaba que me impactara tanto — terminé con los ojos llorosos. Cultura viva que no se puede perder." },
  ],
  "xilitla-pueblo-magico": [
    { nombre: "Renata Fuentes", ciudad: "Monterrey", rating: 5, iniciales: "RF", foto: "/imagenes/reviews/reviewer-25.jpg", texto: "Xilitla es mucho más que Las Pozas. El pueblo en sí tiene una magia especial: el café tostado en fogón, los artesanos Tének, la neblina por las mañanas. Nos quedamos 2 noches y regresamos convencidos de que se necesitan al menos 3." },
    { nombre: "Héctor Ibarra", ciudad: "San Luis Potosí", rating: 5, iniciales: "HI", foto: "/imagenes/reviews/reviewer-26.jpg", texto: "Combinar Las Pozas con el centro de Xilitla es la experiencia completa. El museo Leonora Carrington vale el desvío solo. Los guías locales conocen rincones que no aparecen en ninguna guía de viaje." },
  ],
  "zona-arqueologica-tamtoc": [
    { nombre: "Alejandro Mora", ciudad: "CDMX", rating: 5, iniciales: "AM", foto: "/imagenes/reviews/reviewer-27.jpg", texto: "Llegar a Tamtoc al amanecer, cuando la niebla cubre el río Tampaón al fondo, es una imagen que no olvidarás. El Monumento 32 te hace entender la escala de lo que aquí se construyó hace 2,000 años. Fue la visita más inesperadamente poderosa del viaje." },
    { nombre: "Lucía Torres", ciudad: "Guadalajara", rating: 5, iniciales: "LT", foto: "/imagenes/reviews/reviewer-28.jpg", texto: "El guía de Tamtoc sabe hacer la historia arqueológica fascinante. No es solo ver piedras — es entender toda una civilización. La figura del Monumento 32 frente al horizonte es de las imágenes más impresionantes que he fotografiado." },
  ],
  "balneario-taninul": [
    { nombre: "Sofía Peñaloza", ciudad: "Monterrey", rating: 5, iniciales: "SP", foto: "/imagenes/reviews/reviewer-29.jpg", texto: "Taninul es el cierre perfecto para un día de cascadas. Te sumerges en el agua caliente sulfurosa y el cansancio desaparece. A las 6 PM, con el sol bajando y casi sin gente, es el spa más hermoso que he visitado en mi vida." },
    { nombre: "Marco Leal", ciudad: "Querétaro", rating: 5, iniciales: "ML", foto: "/imagenes/reviews/reviewer-30.jpg", texto: "Las aguas termales a 36°C son tan relajantes que casi no queremos salir. El lodo terapéutico es una experiencia única. Solo hay que recordar no llevar plata — el azufre la oscurece instantáneamente. El personal muy amable y las instalaciones bien cuidadas." },
  ],
};

// ── Rating promedio por destino (para tarjetas del índice) ───────────────────

export const RATING_DESTINO: Record<string, { rating: string; count: number }> = {
  "cascada-de-tamul":             { rating: "4.9", count: 127 },
  "sotano-de-las-golondrinas":    { rating: "4.9", count: 98  },
  "sotano-de-las-huahuas":        { rating: "4.9", count: 86  },
  "las-pozas-jardin-surrealista": { rating: "4.8", count: 84  },
  "cascadas-de-micos":            { rating: "4.7", count: 112 },
  "puente-de-dios-tamasopo":      { rating: "4.8", count: 73  },
  "cascadas-de-tamasopo":         { rating: "4.7", count: 65  },
  "cascadas-minas-viejas":        { rating: "4.8", count: 96  },
  "cascada-el-meco":              { rating: "4.9", count: 61  },
  "cascada-el-salto":             { rating: "4.6", count: 42  },
  "laguna-media-luna":            { rating: "4.8", count: 58  },
  "nacimiento-huichihuayan":      { rating: "4.7", count: 39  },
  "xilitla-pueblo-magico":        { rating: "4.8", count: 51  },
  "zona-arqueologica-tamtoc":     { rating: "4.6", count: 34  },
  "balneario-taninul":            { rating: "4.5", count: 47  },
  "rio-tampaon-rafting":          { rating: "4.9", count: 29  },
  "cuevas-de-mantetzulel":        { rating: "4.6", count: 22  },
  "voladores-tamaleton":          { rating: "4.8", count: 18  },
  "cascada-el-aguacate":          { rating: "4.7", count: 31  },
  "nacimiento-tambaque":          { rating: "4.6", count: 15  },
};
