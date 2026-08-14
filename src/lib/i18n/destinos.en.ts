// Traducciones al inglés de los destinos, indexadas por slug.
// Solo los campos de cara al usuario; lo no traducido cae al español (ver localize.ts).
// La `zona` (municipio) NO se traduce: es un nombre de lugar.

export interface FaqTranslation { pregunta: string; respuesta: string }

export interface DestinoTranslation {
  nombre?: string;
  descripcion?: string;
  tipo?: string;
  precio_entrada?: string;
  dias_abierto?: string;
  mejor_hora?: string;
  temporada_ideal?: string;
  advertencias?: string;
  como_llegar?: string;
  que_llevar?: string[];
  datos_curiosos?: string[];
  errores_comunes?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    faqPrincipales?: FaqTranslation[];
  };
}

/**
 * El horario, traducido por VOCABULARIO y no destino a destino.
 *
 * De los 23 horarios distintos que hay en el catálogo, 12 son rangos de reloj
 * ("09:00–18:00") que no se traducen y el resto son una docena de frases que se
 * repiten entre destinos. Una tabla de frases los cubre todos y sigue
 * cubriéndolos cuando se agregue un destino que reuse alguna. Lo que no esté en
 * la tabla cae al español: es preferible a inventar un horario.
 *
 * ⚠️ Este campo NO estaba en `DestinoTranslation`, así que `localizeDestino`
 * nunca lo tocaba: los 41 destinos enseñaban su horario en español dentro de la
 * ficha en inglés.
 */
const HORARIOS_EN: Record<string, string> = {
  "Abierto todo el día": "Open all day",
  "Abierto todo el día (templo en uso)": "Open all day (a working church)",
  "Acceso libre (sin horario formal)": "Free access (no set hours)",
  "Horario diurno (consultar en el acceso)": "Daylight hours (check at the entrance)",
  "Martes a domingo, 11:00–17:00 (último acceso 16:30)": "Tuesday to Sunday, 11:00–17:00 (last entry 16:30)",
  "Recorridos durante el día (con guía de La Trinidad)": "Daytime tours (with a guide from La Trinidad)",
  "Talleres particulares (sin horario formal)": "Private workshops (no set hours)",
  "Visita de día": "Daytime visit",
  "Visita de día (sin horario formal)": "Daytime visit (no set hours)",
  "Visita de día con guía": "Daytime visit with a guide",
  "Visita y recorridos durante el día (reservar con la comunidad)": "Daytime visits and tours (book with the community)",
  "08:00–18:00 (limpias y masajes hasta las 16:00)": "08:00–18:00 (cleansing rituals and massages until 16:00)",
  "09:00–18:00 (último acceso 17:00)": "09:00–18:00 (last entry 17:00)",
};

/** El horario de un destino en el idioma pedido; los rangos de reloj pasan tal cual. */
export function horarioDestino(horario: string, locale: "es" | "en" = "es"): string {
  if (locale === "es") return horario;
  return HORARIOS_EN[horario] ?? horario;
}

export const DESTINOS_EN: Record<string, DestinoTranslation> = {
  "las-pozas-jardin-surrealista": {
    nombre: "Las Pozas (Surrealist Garden)",
    descripcion: "Edward James's iconic surrealist garden: concrete sculptures among waterfalls and tropical jungle.",
    tipo: "Art & Nature",
    precio_entrada: "$180 MXN",
    dias_abierto: "Wednesday to Monday (closed Tuesdays)",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Nov–Mar",
    advertencias: "Buy your digital ticket in advance. Closed Tuesdays.",
    como_llegar: "1h 45min from Ciudad Valles · Taxi $1,200 · Bus $110",
    que_llevar: ["non-slip footwear", "biodegradable insect repellent"],
    datos_curiosos: ["It was once an orchid plantation", "Edward James never lived in the structures"],
    errores_comunes: ["Arriving without a reservation", "Smooth-soled shoes"],
      seo: {
        faqPrincipales: [
          {
            pregunta: "What days is Las Pozas open and how much does it cost?",
            respuesta: "It's open Wednesday to Monday from 09:00 to 18:00 and closed on Tuesdays. Admission is $180 MXN. It's worth buying your digital ticket before you arrive.",
          },
          {
            pregunta: "How long do you need to tour Las Pozas?",
            respuesta: "About 4 hours to take it in at a relaxed pace. The best time to go in is between 09:00 and 11:00, when there are fewer people and better light for photos.",
          },
          {
            pregunta: "Who built Las Pozas?",
            respuesta: "The British poet Edward James, who raised the concrete structures among the waterfalls and jungle. The land used to be an orchid plantation, and he never lived inside the structures.",
          },
        ],
      metaTitle: "Las Pozas Xilitla 2026 | Hours, Tickets & How to Get There",
      metaDescription: "Edward James's surrealist garden in Xilitla: $180 MXN entry, open Wednesday to Monday 09:00-18:00 (closed Tuesdays). How to get there, the best hour to go and what to bring.",
      keywords: ["las pozas xilitla", "edward james surrealist garden", "las pozas tickets", "xilitla mexico", "surrealist garden san luis potosi"],
    },
  },
  "cascada-de-tamul": {
    nombre: "Tamul Waterfall",
    descripcion: "The tallest waterfall in San Luis Potosí (105m), reached by paddling up the Tampaón River. A spectacular turquoise drop.",
    tipo: "Adventure",
    precio_entrada: "$220 MXN + $300 boat p/p",
    dias_abierto: "Mon–Sun",
    mejor_hora: "08:00",
    temporada_ideal: "Jan–Apr",
    advertencias: "Boatmen stop departing at 2 PM. CASH ONLY.",
    como_llegar: "45 min from Ciudad Valles → Tanchachín + boat",
    que_llevar: ["life jacket", "water shoes", "2L of water"],
    datos_curiosos: ["105m drop", "In October: turquoise water + orange foliage"],
    errores_comunes: ["Arriving late", "Not bringing cash"],
      seo: {
        faqPrincipales: [
          {
            pregunta: "How much does it cost to visit Tamul Waterfall?",
            respuesta: "Admission is $220 MXN plus $300 MXN per person for the panga (boat). CASH only: there is no ATM at the dock.",
          },
          {
            pregunta: "What time should you get to Tamul?",
            respuesta: "Ideally by 08:00. The boatmen stop heading out at 2 PM, so arriving late means missing the trip altogether.",
          },
          {
            pregunta: "How tall is Tamul Waterfall?",
            respuesta: "It drops 105 metres, the tallest in San Luis Potosí. In October the turquoise water contrasts with the orange foliage of the canyon.",
          },
        ],
      metaTitle: "Tamul Waterfall 2026 | Price, Hours and the Boat Trip",
      metaDescription: "The tallest waterfall in San Luis Potosi (105 m), reached by paddling up the Tampaon river. $220 MXN entry plus $300 per person for the boat, cash only. Last departures at 2 PM.",
      keywords: ["tamul waterfall", "cascada de tamul", "tamul boat trip", "how to get to tamul", "huasteca potosina waterfalls"],
    },
  },
  "sotano-de-las-golondrinas": {
    nombre: "Sótano de las Golondrinas (Cave of Swallows)",
    descripcion: "A 376m-freefall karst abyss (up to 512m deep). A sanctuary of swifts that spiral out at dawn.",
    tipo: "Extreme",
    precio_entrada: "$100 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "05:45 AM",
    temporada_ideal: "Nov–Mar",
    advertencias: "568 steps down; the climb back up is EXHAUSTING.",
    como_llegar: "1h 15min from Ciudad Valles through the mountains",
    que_llevar: ["jacket", "flashlight", "sneakers"],
    datos_curiosos: ["The birds are SWIFTS, not swallows", "The bottom = 3 soccer fields"],
    errores_comunes: ["Arriving at 9 AM after the birds have already left"],
      seo: {
        faqPrincipales: [
          {
            pregunta: "What time do the birds fly out of the Sótano de las Golondrinas?",
            respuesta: "The spiral flight happens at dawn: you need to be at the rim around 5:45 AM. If you arrive at 9 AM the birds have already left and you miss the spectacle.",
          },
          {
            pregunta: "How deep is the Sótano de las Golondrinas?",
            respuesta: "It has a 376-metre free fall and a total depth of up to 512 metres. The floor measures about three football pitches across.",
          },
          {
            pregunta: "How hard is the descent?",
            respuesta: "It's 568 steps down to the lookout, and the climb back up is exhausting. Bring trainers, a jacket and a torch for the dawn hour.",
          },
        ],
      metaTitle: "Cave of Swallows 2026 | What Time the Birds Fly Out",
      metaDescription: "A 376 m free-fall abyss (up to 512 m deep) in Aquismon. $100 MXN entry. Arrive by 5:45 AM to watch the swifts spiral out. 568 steps down to the viewpoint.",
      keywords: ["cave of swallows", "sotano de las golondrinas", "golondrinas bird flight time", "aquismon san luis potosi", "deepest cave in mexico"],
    },
  },
  "cascadas-de-micos": {
    nombre: "Micos Waterfalls",
    descripcion: "A series of 7 waterfalls with a jumping circuit, zip line, kayaking and skybike.",
    tipo: "Adventure",
    precio_entrada: "$100 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "09:00 AM",
    temporada_ideal: "Year-round",
    advertencias: "Life vest and helmet REQUIRED.",
    como_llegar: "20 min from Ciudad Valles · Shared vans $35 MXN every 30 min",
    que_llevar: ["water shoes", "dry-fit clothing"],
    datos_curiosos: ["The most versatile river in the area"],
    errores_comunes: ["Not adjusting your life vest properly"],
      seo: {
        faqPrincipales: [
          {
            pregunta: "How much does it cost to enter the Micos Waterfalls?",
            respuesta: "Admission is $100 MXN and it's open every day from 08:00 to 18:00. The activities (jumps, zip line, kayak, skybike) are booked separately on site.",
          },
          {
            pregunta: "Are the jumps at Micos safe?",
            respuesta: "Yes, as long as you do them with the gear on: a life vest and helmet are MANDATORY. The most common mistake is not fastening the vest properly before jumping.",
          },
          {
            pregunta: "How do you get to Micos from Ciudad Valles?",
            respuesta: "It's 20 minutes from Ciudad Valles. There are shared vans leaving every 30 minutes for around $35 MXN.",
          },
        ],
      metaTitle: "Micos Waterfalls 2026 | Price, Cliff Jumps and How to Get There",
      metaDescription: "Seven waterfalls with a jumping circuit, zipline, kayak and skybike, 20 min from Ciudad Valles. $100 MXN entry, open daily 08:00-18:00. Life jacket and helmet are required.",
      keywords: ["micos waterfalls", "cascadas de micos", "micos cliff jumping", "things to do in ciudad valles", "huasteca potosina"],
    },
  },
  "puente-de-dios-tamasopo": {
    nombre: "Puente de Dios (Tamasopo)",
    descripcion: "A cobalt-blue pool beneath a natural bridge. Light enters the cave between 11:00–13:00.",
    tipo: "Nature",
    precio_entrada: "$150 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Jan–May",
    advertencias: "Strong currents; follow the safety rope.",
    como_llegar: "1h from Ciudad Valles via the SLP highway",
    que_llevar: ["water shoes REQUIRED", "life jacket"],
    datos_curiosos: ["A light effect in the cave that is unique in Mexico"],
    errores_comunes: ["Not wearing water shoes (the rocks are VERY slippery)"],
    seo: {
      metaTitle: "Puente de Dios Tamasopo 2026 | Guide: Hours, $150 Price & How to Get There",
      metaDescription: "Visit the cobalt-blue pool of Puente de Dios in Tamasopo, SLP. The sun enters through the natural arch between 11 AM–1 PM. Entry $150 MXN, 1h from Ciudad Valles. 2026 guide.",
      keywords: ["puente de dios tamasopo", "tamasopo blue pool", "tamasopo san luis potosi", "natural bridge huasteca potosina", "how to get to puente de dios from ciudad valles"],
      faqPrincipales: [
        { pregunta: "What time does sunlight enter Puente de Dios?", respuesta: "The cobalt-blue light effect happens between 11:00 AM and 1:00 PM, when the sun enters perpendicular to the natural arch. Outside that window the pool is still beautiful, just without the light effect." },
        { pregunta: "How much is admission to Puente de Dios Tamasopo?", respuesta: "Entry to Puente de Dios is $150 MXN per person (2026). Cash only — bring small change." },
        { pregunta: "How do I get to Puente de Dios from Ciudad Valles?", respuesta: "Take the Ciudad Valles–San Luis Potosí highway for about 1 hour. The turnoff to Tamasopo is well signposted. The park is reached via a short dirt road from town." },
      ],
    },
  },
  "zona-arqueologica-tamtoc": {
    nombre: "Tamtoc Archaeological Site",
    descripcion: "The most important pre-Hispanic settlement of the Huastec culture.",
    tipo: "Archaeology",
    precio_entrada: "Free on Sundays (Mexican nationals)",
    dias_abierto: "Sundays only (09:00–18:00)",
    mejor_hora: "09:00 AM",
    temporada_ideal: "Dec–Feb",
    advertencias: "LITTLE shade. Can exceed 45°C in May.",
    como_llegar: "45 min from Ciudad Valles",
    que_llevar: ["hat", "plenty of water", "sunscreen"],
    datos_curiosos: ["Monument 32 weighs 30 tons"],
    errores_comunes: ["Not bringing water", "Going without a guide"],
    seo: {
      metaTitle: "Tamtoc Archaeological Site 2026 | Sundays Only, How to Get There & Guide",
      metaDescription: "Discover Tamtoc, the most important archaeological site of the Huastec culture in San Luis Potosí. The 30-ton Monument 32 awaits. After the 2024 floods it now opens only on Sundays; 45 min from Ciudad Valles.",
      keywords: ["tamtoc archaeological site", "tamtoc tamuín san luis potosi", "huastec culture archaeology", "what to visit in tamuín", "huastec monuments mexico"],
      faqPrincipales: [
        { pregunta: "What is Monument 32 of Tamtoc?", respuesta: "Monument 32 is a 30-ton female figure carved in stone, considered the most important representation of the Huastec culture. It stands over 4 meters tall and has remained in the same spot for centuries." },
        { pregunta: "When is the Tamtoc Archaeological Site open?", respuesta: "After damage from the 2024 floods, Tamtoc reopened and currently opens ONLY on Sundays, 9:00 AM–6:00 PM (last entry 5:00 PM). Admission is free for Mexican nationals on Sundays. Confirm the current fee and days with the INAH San Luis Potosí office before traveling." },
        { pregunta: "How long do you need to tour Tamtoc?", respuesta: "The full visit takes 2.5 to 3 hours. We recommend arriving at 9 AM before the sun is at its highest, since there is little shade and summer temperatures exceed 40°C." },
      ],
    },
  },
  "cascadas-de-tamasopo": {
    nombre: "Tamasopo Waterfalls",
    descripcion: "A paradise of turquoise-blue water with pools for swimming, ideal for families.",
    tipo: "Nature",
    precio_entrada: "$60 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "10:00–14:00",
    temporada_ideal: "Nov–May",
    advertencias: "Biodegradable sunscreen ONLY.",
    como_llegar: "45 min from Ciudad Valles via highway",
    que_llevar: ["swimsuit", "biodegradable sunscreen"],
    datos_curiosos: ["The pools change color with the season"],
    errores_comunes: ["Using chemical sunscreen"],
      seo: {
        faqPrincipales: [
          {
            pregunta: "How much is admission to the Tamasopo Waterfalls?",
            respuesta: "Admission is $60 MXN and the park is open every day from 08:00 to 17:00. It's one of the cheapest entries in the Huasteca Potosina.",
          },
          {
            pregunta: "Can you swim at the Tamasopo Waterfalls?",
            respuesta: "Yes, the pools are good for swimming and it's a quiet spot for a family day out. The best time is between 10:00 and 14:00, when the water looks bluest.",
          },
          {
            pregunta: "Why is only biodegradable sunscreen allowed?",
            respuesta: "Chemical sunscreen pollutes the pools and damages the river ecosystem. Only biodegradable sunscreen is allowed at Tamasopo; it's the most common mistake visitors make.",
          },
        ],
      metaTitle: "Tamasopo Waterfalls 2026 | Price, Hours and Swimming Pools",
      metaDescription: "Turquoise pools for swimming in Tamasopo, ideal for families. $60 MXN entry, open daily 08:00-17:00, 45 min from Ciudad Valles. Biodegradable sunscreen only.",
      keywords: ["tamasopo waterfalls", "cascadas de tamasopo", "tamasopo price", "swimming in huasteca potosina", "tamasopo opening hours"],
    },
  },
  "siete-cascadas-tamasopo": {
    nombre: "Seven Waterfalls of Tamasopo",
    descripcion:
      "A natural staircase of seven turquoise waterfalls where you jump from pool to pool with a life jacket, helmet and guide. There are jumps for every level — and anyone who would rather not jump can simply swim in the crystal-clear pools.",
    tipo: "Nature & Adventure",
    precio_entrada: "Visited with a guide and gear (life jacket/helmet) — ask for the rate",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Mid-morning",
    temporada_ideal: "Year-round; highest flow during the rainy season",
    advertencias:
      "Jumps are ALWAYS done with a life jacket, helmet and guide. Slippery rocks: water shoes are required. If you'd rather not jump, you can still swim. Coordinates are approximate — check GPS before going.",
    como_llegar:
      "In Tamasopo, alongside the Puente de Dios route (about 1 h from Ciudad Valles via the San Luis Potosí highway)",
    que_llevar: ["water shoes (required)", "swimsuit", "a dry change of clothes", "cash", "biodegradable sunscreen"],
    datos_curiosos: [
      "Seven drops in a row that you cover by jumping from pool to pool.",
      "Usually combined with Puente de Dios and Hacienda Los Gómez on the Tamasopo Water Route.",
    ],
    errores_comunes: ["Attempting the jumps without a guide or gear", "Wearing smooth-soled shoes"],
    seo: {
      metaTitle: "Seven Waterfalls of Tamasopo 2026 | Jumps & Turquoise Pools",
      metaDescription:
        "A natural staircase of seven turquoise waterfalls in Tamasopo where you jump from pool to pool with a life jacket, helmet and guide. Jumps for every level and clear pools for swimming.",
      keywords: ["seven waterfalls tamasopo", "7 cascadas tamasopo", "cliff jumping huasteca potosina", "what to do in tamasopo"],
      faqPrincipales: [
        { pregunta: "What are the Seven Waterfalls of Tamasopo?", respuesta: "A natural staircase of seven turquoise waterfalls in a row, where you jump from pool to pool with a life jacket, helmet and guide. There are jumps for every level and clear pools for anyone who prefers to just swim." },
        { pregunta: "Do I have to jump?", respuesta: "No. The jumps are optional and always done with gear (life jacket and helmet) and a guide; if you'd rather not jump you can swim and walk between the pools." },
      ],
    },
  },
  "hacienda-los-gomez-tamasopo": {
    nombre: "Hacienda Los Gómez",
    descripcion:
      "A natural spot on the riverbank in Tamasopo, with small waterfalls, turquoise pools and huge cypress trees for shade; a quiet corner to swim and rest, part of the Puente de Dios Water Route.",
    tipo: "Nature",
    precio_entrada: "Ask locally about access",
    dias_abierto: "Ask locally",
    mejor_hora: "Afternoon (golden light through the trees)",
    temporada_ideal: "Year-round; highest flow during the rainy season",
    advertencias:
      "It is a natural spot with simple facilities; access and rates are confirmed locally. Slippery rocks near the water. Coordinates are approximate — check GPS before going.",
    como_llegar:
      "In Tamasopo, on the Puente de Dios Water Route (about 1 h from Ciudad Valles via the San Luis Potosí highway)",
    que_llevar: ["swimsuit", "water shoes", "towel", "cash", "biodegradable sunscreen"],
    datos_curiosos: [
      "Huge ahuehuete cypress trees shade the pools and grow right in the water.",
      "Usually visited together with Puente de Dios and the Seven Waterfalls on the Tamasopo Water Route.",
    ],
    errores_comunes: ["Going without confirming access and hours locally", "Forgetting water shoes"],
    seo: {
      metaTitle: "Hacienda Los Gómez, Tamasopo 2026 | Waterfalls & Turquoise Pools",
      metaDescription:
        "A natural spot in Tamasopo with small waterfalls, turquoise pools and huge cypress trees, part of the Puente de Dios Water Route. What it is and how to visit.",
      keywords: ["hacienda los gomez tamasopo", "tamasopo water route", "turquoise pools tamasopo", "what to do in tamasopo"],
      faqPrincipales: [
        { pregunta: "What is Hacienda Los Gómez?", respuesta: "A natural spot on the riverbank in Tamasopo, with small waterfalls, turquoise pools and big shade-giving cypress trees — ideal for swimming and resting." },
        { pregunta: "Where is it and how do you visit?", respuesta: "It is in Tamasopo, on the Puente de Dios Water Route (about 1 h from Ciudad Valles). It is usually visited on the same outing as Puente de Dios and the Seven Waterfalls." },
      ],
    },
  },
  "balneario-taninul": {
    nombre: "Taninul Hot Springs",
    descripcion: "Sulfurous hot springs (a constant 36°C) and therapeutic mud.",
    tipo: "Nature",
    precio_entrada: "$150 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "08:00 or 18:00",
    temporada_ideal: "Dec–Jan",
    advertencias: "Do NOT wear silver jewelry (sulfur darkens it).",
    como_llegar: "15 min from Ciudad Valles",
    que_llevar: ["swimsuit", "sandals", "towel"],
    datos_curiosos: ["The water stays a constant 36°C all year"],
    errores_comunes: ["Wearing silver jewelry"],
    seo: {
      metaTitle: "Taninul Hot Springs Ciudad Valles 2026 | 36°C Thermal Waters — Full Guide",
      metaDescription: "Soak in the sulfurous thermal waters of Taninul at a constant 36°C, just 15 minutes from Ciudad Valles. Entry $150 MXN, open daily 7 AM–8 PM.",
      keywords: ["taninul hot springs", "thermal waters ciudad valles", "taninul san luis potosi", "sulfur spa huasteca", "ciudad valles hot springs 2026"],
      faqPrincipales: [
        { pregunta: "What temperature is the water at Taninul?", respuesta: "The thermal waters of Taninul stay a constant 36–38°C all year, thanks to their natural sulfurous origin. They're ideal for muscle relaxation and therapeutic mud treatments." },
        { pregunta: "Why can't you wear silver jewelry at Taninul?", respuesta: "Taninul's water contains natural sulfur that reacts with silver and permanently darkens it within minutes. We recommend leaving any silver jewelry at your hotel before visiting." },
        { pregunta: "How do I get to Taninul from Ciudad Valles?", respuesta: "Taninul is just 15 minutes from Ciudad Valles. Take Highway 85 toward Tampico — the entrance is signposted. You can also arrive by taxi or moto-taxi from downtown Valles." },
      ],
    },
  },
  "cascadas-minas-viejas": {
    nombre: "Minas Viejas Waterfalls",
    descripcion: "Two 50m twin falls with turquoise pools surrounded by preserved jungle.",
    tipo: "Adventure",
    precio_entrada: "$100 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "08:00–10:00",
    temporada_ideal: "Oct–May",
    advertencias: "Respect the marked swimming zones — there are strong currents in the central channel. The access road can be muddy in the rainy season. Cash only.",
    como_llegar: "105 min from Ciudad Valles · Highway 70 north → El Naranjo turnoff via Hwy 80",
    que_llevar: ["water shoes or sneakers that can get wet", "biodegradable sunscreen (required)", "a dry change of clothes", "cash (no ATM in the area)", "natural repellent"],
    datos_curiosos: [
      "Considered to have some of the bluest water in the whole region, due to a high concentration of karst minerals.",
      "The name comes from a 19th-century mining operation in the ejido.",
    ],
    errores_comunes: ["Arriving without cash", "Going in the rainy season without checking access"],
    seo: {
      metaTitle: "Minas Viejas Waterfalls Guide 2026 | El Naranjo SLP",
      metaDescription: "Discover the Minas Viejas Waterfalls in 2026: prices, hours, how to get there and tips for seeing the most intense turquoise in the Huasteca Potosina. Plan now!",
      keywords: ["minas viejas waterfalls", "el naranjo san luis potosi", "huasteca potosina waterfalls", "minas viejas 2026", "turquoise pools slp"],
      faqPrincipales: [
        { pregunta: "How much is admission to Minas Viejas in 2026?", respuesta: "It's about $100 MXN per person. Cash only — there is no ATM in the area." },
        { pregunta: "Can you swim at the Minas Viejas Waterfalls?", respuesta: "Yes, there are designated pools with calm water for swimming. Biodegradable sunscreen is mandatory." },
        { pregunta: "How do I get to Minas Viejas from Ciudad Valles?", respuesta: "Take Highway 70 north and turn off toward El Naranjo on Hwy 80. It's about 95 km and 1 hour 45 minutes by car." },
      ],
    },
  },
  "laguna-media-luna": {
    nombre: "Media Luna Spring",
    descripcion: "A spring of fresh, crystal-clear deep-blue water — one of Mexico's best freshwater diving and snorkeling spots.",
    tipo: "Wellness",
    precio_entrada: "$150 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Year-round",
    advertencias: "Don't touch the bottom so you don't stir up sediment. Life jacket required for non-divers. Non-biodegradable sunscreen strictly prohibited.",
    como_llegar: "120 min from Ciudad Valles · Highway 70 west to Rioverde → signs to Ejido El Jabalí",
    que_llevar: ["snorkel gear (or rent on site)", "swimsuit", "towel", "swim goggles", "cash"],
    datos_curiosos: [
      "The name 'Media Luna' (Half Moon) comes from the perfect semicircular shape of the water.",
      "It's one of the few places in Mexico where you can do your first scuba dive in crystal-clear freshwater.",
    ],
    errores_comunes: ["Not booking in high season (limited capacity)", "Bringing chemical sunscreen"],
    seo: {
      metaTitle: "Media Luna Lagoon Rioverde 2026 | Travel Guide",
      metaDescription: "Visit the Media Luna Spring in 2026: diving, snorkeling and fresh, crystal-clear waters in Rioverde, San Luis Potosí. Prices, reservations and how to get there from Ciudad Valles.",
      keywords: ["media luna lagoon rioverde", "spring san luis potosi", "media luna diving", "things to do in rioverde", "media luna 2026"],
      faqPrincipales: [
        { pregunta: "Is the water at Media Luna cold or warm?", respuesta: "It's a spring of fresh, crystal-clear water — not a hot thermal bath. For longer dives we recommend a wetsuit." },
        { pregunta: "Do you need to know how to scuba dive to enjoy Media Luna?", respuesta: "No — you can snorkel or swim with goggles and see the crystal-clear bottom from the surface." },
        { pregunta: "Is there a visitor limit at Media Luna?", respuesta: "Yes, access is controlled to preserve the ecosystem. Booking is recommended in high season." },
      ],
    },
  },
  "cascada-el-aguacate": {
    nombre: "El Aguacate Waterfall",
    descripcion: "A ~75m drop among dense jungle canyons — the second-tallest waterfall in the Huasteca and one of Tamasopo's best-kept secrets.",
    tipo: "Adventure",
    precio_entrada: "$50 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "15:00–16:30",
    temporada_ideal: "Dec–Apr",
    advertencias: "Slippery trails — especially on the descent to the pool. No cell signal along the entire route. Local guide required. Approximate coordinates — check GPS before going.",
    como_llegar: "75 min from Ciudad Valles · Highway to SLP → Tamasopo → Ejido El Aguacate (~3 km north of town)",
    que_llevar: ["hiking shoes with grippy soles (required)", "trekking poles (recommended)", "enough water for 4 hours", "natural repellent", "biodegradable sunscreen"],
    datos_curiosos: [
      "It's the second-tallest waterfall in the Huasteca (~75 m), after Tamul, and one of the least-documented in the Tamasopo area.",
      "Local guides call it 'the waterfall the tourists haven't discovered yet.'",
    ],
    errores_comunes: ["Not hiring a local guide", "Going with inadequate footwear"],
    seo: {
      metaTitle: "El Aguacate Waterfall Tamasopo 2026 | Huasteca Guide",
      metaDescription: "El Aguacate Waterfall in Tamasopo: a ~75-meter drop, jungle trail and natural pools. 2026 guide with prices, how to get there and what no one tells you. Discover it!",
      keywords: ["el aguacate waterfall tamasopo", "secret waterfalls huasteca potosina", "hiking tamasopo", "waterfalls slp 2026", "adventure tourism san luis potosi"],
      faqPrincipales: [
        { pregunta: "Is it hard to reach El Aguacate Waterfall?", respuesta: "The hike is moderate — about 45 minutes along a jungle trail. Hiking shoes and a local guide are required." },
        { pregunta: "Are there restrooms at El Aguacate Waterfall?", respuesta: "Facilities are minimal. There are basic restrooms in the ejido community at the entrance." },
        { pregunta: "Is El Aguacate Waterfall suitable for kids?", respuesta: "It's recommended for children over 10 with hiking experience. The terrain is uneven and there are steep sections." },
      ],
    },
  },
  "cascada-el-salto": {
    nombre: "El Salto Waterfall",
    descripcion: "A 70m karst rock wall with permanent turquoise pools — spectacular with or without the falls flowing.",
    tipo: "Nature",
    precio_entrada: "$50 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Early morning",
    temporada_ideal: "Sep–Oct (falls active) · pools year-round",
    advertencias: "Extremely slippery ground at the pools — accidents are common without proper footwear. The main falls can be completely dry most of the year.",
    como_llegar: "110 min from Ciudad Valles · From El Naranjo, road toward Ciudad del Maíz · 8 km paved",
    que_llevar: ["water shoes — very slippery ground", "light clothing and swimsuit", "sun protection", "food (no restaurants on site)", "cash"],
    datos_curiosos: [
      "The flow is artificially diverted to a hydroelectric plant — that's why the falls 'disappear' in the dry season.",
      "In September 2024, exceptional rains kept it flowing for 3 straight weeks.",
    ],
    errores_comunes: ["Going expecting to see the falls without checking first", "Not bringing non-slip footwear"],
    seo: {
      metaTitle: "El Salto Waterfall El Naranjo 2026 | Complete Guide",
      metaDescription: "Everything about El Salto Waterfall in El Naranjo, SLP: when it really flows, 2026 prices, turquoise pools and how to combine it with El Meco in one day. Read on!",
      keywords: ["el salto waterfall el naranjo", "blue pools el naranjo slp", "huasteca potosina waterfalls 2026", "el naranjo tourism san luis potosi", "el salto waterfall slp"],
      faqPrincipales: [
        { pregunta: "Why doesn't El Salto Waterfall have water?", respuesta: "The flow is diverted to a hydroelectric plant. It only falls during exceptional rains, mainly in September and October." },
        { pregunta: "Can you swim if El Salto Waterfall has no water?", respuesta: "Yes — the natural pools keep crystal-clear turquoise water all year, with or without the falls flowing." },
        { pregunta: "Are there restaurants near El Salto Waterfall?", respuesta: "Not on site, but in El Naranjo (8 km away) there are several restaurants serving typical Huastec food." },
      ],
    },
  },
  "cascada-el-meco": {
    nombre: "El Meco Waterfall",
    descripcion: "A constant 35m waterfall over limestone — the only one in El Naranjo that flows all year.",
    tipo: "Adventure",
    precio_entrada: "$60 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "17:00–18:00",
    temporada_ideal: "Nov–May",
    advertencias: "Strong currents in the middle of the river — don't swim outside the permitted areas. The boat doesn't operate if the river is high.",
    como_llegar: "105 min from Ciudad Valles · From El Naranjo, 5 km signposted to the dock",
    que_llevar: ["camera or phone with a waterproof case", "natural repellent", "comfortable clothing", "cash for the boat and restaurants"],
    datos_curiosos: [
      "Its name comes from the 'meco' monkeys (spider monkeys) that lived in the area before 20th-century deforestation.",
      "It's the only permanent waterfall in the El Naranjo municipality — it flows all year regardless of season.",
    ],
    errores_comunes: ["Going without cash for the boat (~$150 MXN)", "Not asking whether the boat operates that day"],
    seo: {
      metaTitle: "El Meco Waterfall El Naranjo 2026 | Lookout & Boats",
      metaDescription: "El Meco Waterfall in El Naranjo: the only permanent waterfall in the area. 2026 guide with boat prices, rappelling, restaurants with a view and how to get there. Discover it!",
      keywords: ["el meco waterfall el naranjo", "boat ride huasteca", "el meco san luis potosi 2026", "permanent waterfalls huasteca", "things to do in el naranjo slp"],
      faqPrincipales: [
        { pregunta: "Is the El Meco Waterfall lookout free?", respuesta: "Yes, the lookout from the road is completely free. Access to the river and the boats has an extra cost (~$60 MXN entry, ~$150 MXN boat)." },
        { pregunta: "Can you go rappelling at El Meco Waterfall?", respuesta: "Yes, there are certified local operators offering rappelling at the falls. Ask directly on site." },
        { pregunta: "Are there restaurants overlooking El Meco Waterfall?", respuesta: "Yes, several restaurants have terraces over the river with a direct view of the falls — one of the best experiences in El Naranjo." },
      ],
    },
  },
  "sotano-de-las-huahuas": {
    nombre: "Sótano de las Huahuas",
    descripcion: "A 478m abyss where thousands of parrots and swifts trace spirals at dawn and dusk.",
    tipo: "Extreme",
    precio_entrada: "$60 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "17:30–18:30",
    temporada_ideal: "Mar–Oct",
    advertencias: "Intense uphill hike — not suitable for people with knee problems. Don't approach the edge without a guide. No cell signal the whole way.",
    como_llegar: "75 min from Ciudad Valles · Highway 85 south → San Pedro de las Anonas turnoff · Final stretch is dirt road",
    que_llevar: ["hand or head flashlight", "hiking shoes with grip", "binoculars", "camera with a telephoto lens", "water and snacks", "warm clothing for dawn"],
    datos_curiosos: [
      "At 478 meters deep, it's one of the deepest karst abysses in Mexico.",
      "Locals call the green parrots 'huahuas' in the Tének language — hence the name.",
    ],
    errores_comunes: ["Arriving late without time to see the flight", "Going without a guide — the edge has no railing"],
    seo: {
      metaTitle: "Sótano de las Huahuas 2026 | Bird Spectacle",
      metaDescription: "Sótano de las Huahuas in Aquismón: 478 m deep and thousands of parrots spiraling at dusk. 2026 guide with hours, the hike and how it differs from Las Golondrinas.",
      keywords: ["sótano de las huahuas aquismón", "parrot abyss huasteca potosina", "hiking aquismón slp", "huahuas 2026", "sotanos huasteca potosina"],
      faqPrincipales: [
        { pregunta: "What time do the birds leave Sótano de las Huahuas?", respuesta: "The parrots leave at dawn (6:00–7:00 AM) and return at dusk (6:00–7:00 PM). Dusk is usually more spectacular because of the light." },
        { pregunta: "How is Sótano de las Huahuas different from Sótano de las Golondrinas?", respuesta: "Las Golondrinas (376 m free fall) has swifts and the iconic flight is at dawn. Las Huahuas (478 m) is home to green parrots and the best show is at dusk. They're different experiences." },
        { pregunta: "Is the hike to Sótano de las Huahuas difficult?", respuesta: "The uphill hike is 30–40 minutes of moderate intensity. It requires hiking shoes and is not suitable for people with serious mobility issues." },
      ],
    },
  },
  "cuevas-de-mantetzulel": {
    nombre: "Mantetzulel Caves",
    descripcion: "Four sacred caves with collapsed ceilings — light pours in from above like solid columns.",
    tipo: "Nature",
    precio_entrada: "$70 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Oct–May",
    advertencias: "Very slippery trails after rain — postpone if it rained recently. No cell signal. Community guide required. Approximate coordinates — check GPS before going.",
    como_llegar: "70 min from Ciudad Valles · From Aquismón, 12 km to the Mantetzulel community · Last 5 km dirt road",
    que_llevar: ["footwear with non-slip soles (required)", "flashlight or headlamp", "natural repellent", "clothes you don't mind getting dirty", "water for 4 hours"],
    datos_curiosos: [
      "The Tének people consider these caves healing portals — traditional ceremonies are still held here.",
      "The Holy Spirit Cave isn't a tunnel: it's a vault open to the sky, 30 meters high.",
    ],
    errores_comunes: ["Going without a community guide", "Visiting after recent rain (dangerous trails)"],
    seo: {
      metaTitle: "Mantetzulel Caves Aquismón 2026 | Complete Guide",
      metaDescription: "Mantetzulel Caves in Aquismón: sacred vaults with overhead light and Tének community tourism. 2026 guide with prices, the hike and the best time for the perfect photo.",
      keywords: ["mantetzulel caves aquismón", "caving huasteca potosina", "tének community tourism slp", "mantetzulel 2026", "sacred caves san luis potosi"],
      faqPrincipales: [
        { pregunta: "How many caves do you visit at Mantetzulel?", respuesta: "The standard tour visits 2 large caves. With time and fitness, you can explore all 4 cavities of the complex." },
        { pregunta: "Are there bats in the Mantetzulel Caves?", respuesta: "Yes, they live in the high parts of the vaults, but they pose no risk to visitors with a guide." },
        { pregunta: "Do you need special gear to visit Mantetzulel?", respuesta: "No advanced caving gear. Just non-slip footwear, a flashlight and clothes that can get dirty." },
      ],
    },
  },
  "nacimiento-huichihuayan": {
    nombre: "Huichihuayán Spring",
    descripcion: "A crystal-clear river born from a cave — so clear you can see the fish on the bottom from the shore.",
    tipo: "Nature",
    precio_entrada: "$30 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "15:00–17:00",
    temporada_ideal: "Year-round",
    advertencias: "There are deep areas near the spring — be careful with children. A little-documented destination — check conditions before going.",
    como_llegar: "80 min from Ciudad Valles · Highway 85 south toward Tamazunchale · Turnoff to Huehuetlán",
    que_llevar: ["swimsuit", "water sandals", "food (limited options on site)", "swim goggles"],
    datos_curiosos: [
      "Huichihuayán is one of the towns most active in preserving the Palo Volador dance.",
      "The water is so clear the local community uses it directly for drinking.",
    ],
    errores_comunes: ["Not asking in town about the Voladores dance", "Not bringing goggles to see the fish"],
    seo: {
      metaTitle: "Huichihuayán Spring 2026 | Huehuetlán SLP",
      metaDescription: "Huichihuayán Spring in Huehuetlán: a crystal-clear river with visible fish and the Voladores dance. The most authentic destination in the southern Huasteca. Full 2026 guide.",
      keywords: ["huichihuayán spring huehuetlán", "crystal-clear river huasteca potosina", "voladores huichihuayan", "huehuetlán tourism slp 2026", "southern huasteca potosina destinations"],
      faqPrincipales: [
        { pregunta: "Is the water at Huichihuayán cold?", respuesta: "It's fresh and pleasant, not as cold as Tambaque. The area's warm climate keeps it at an ideal temperature for swimming." },
        { pregunta: "Can you rent a life vest at Huichihuayán?", respuesta: "Yes, local stalls rent life vests and inner tubes at affordable prices." },
        { pregunta: "What are the Voladores of Huichihuayán?", respuesta: "It's a pre-Hispanic ritual dance declared a UNESCO World Heritage tradition. In Huichihuayán it's actively practiced — ask in town if there's a performance." },
      ],
    },
  },
  "nacimiento-tambaque": {
    nombre: "Tambaque Spring",
    descripcion: "An oasis where the Coy River rises from the Sierra de Tanchanaco into crystal-blue pools with almost no current.",
    tipo: "Nature",
    precio_entrada: "$10 MXN",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "09:00–11:00",
    temporada_ideal: "Oct–May",
    advertencias: "The water is very cold (it rises from an underground aquifer) — thermal shock if you get in too fast. Slippery underwater ground — water shoes required. Parking is an extra $30 MXN.",
    como_llegar: "55 min from Ciudad Valles · Highway 85 south → San Pedro de las Anonas junction · 100% paved",
    que_llevar: ["water shoes", "cash in small denominations (no ATM or card terminal)", "your own food (options only on weekends)", "biodegradable sunscreen", "natural repellent"],
    datos_curiosos: [
      "In 1950 the spring dried up completely. On May 10, 1951, after a huge storm, it burst forth so powerfully it filled the pools in a single night — locals remember it as 'the miracle of Tambaque.'",
      "Tambaque means 'place of shallow water' in the Tének language, a reference to the shallowness of its pools.",
    ],
    errores_comunes: ["Not bringing water shoes (algae-covered, very slippery ground)", "Getting into the water too fast without acclimating (thermal shock)"],
    seo: {
      metaTitle: "Tambaque Spring Aquismón 2026 | Guide, Prices & How to Get There",
      metaDescription: "Discover Tambaque Spring in Aquismón, SLP. A crystal-clear-water paradise ideal for families. 2026 prices, exact location and the best travel tips.",
      keywords: ["tambaque spring slp", "nacimiento de tambaque aquismón", "what to do in aquismón huasteca", "crystal-clear waters san luis potosi", "aquismón tourism 2026"],
      faqPrincipales: [
        { pregunta: "What does Tambaque mean?", respuesta: "In the Tének (Huastec) language it means 'place of shallow water,' a reference to the shallowness of its pools — ideal for children and non-swimmers." },
        { pregunta: "Can small children get into Tambaque?", respuesta: "It's the most recommended spot in the Huasteca for small children: almost no current, shallow water and safe stone walkways." },
        { pregunta: "Is there food at Tambaque?", respuesta: "On weekends and in high season there's typical food for sale: Huastec enchiladas, bowls and tamales. On weekdays, bring your own food." },
      ],
    },
  },
  "voladores-tamaleton": {
    nombre: "Voladores of Tamaletón",
    descripcion: "The oldest pre-Hispanic ritual in the Huasteca — 5 men fly from a 30m pole in honor of the sun.",
    tipo: "Art & Culture",
    precio_entrada: "$100 MXN",
    dias_abierto: "Thursday to Sunday (most activity) · Mon–Wed less activity",
    mejor_hora: "11:30–13:30",
    temporada_ideal: "Dec–Feb",
    advertencias: "The flight is canceled in rain or wind — not guaranteed for individual visitors without a group of 30+. No phone signal in the upper part of Tamaletón. Don't drive to Tancanhuitz at night.",
    como_llegar: "52 min from Ciudad Valles · Highway 85 south → Aquismón junction → Tancanhuitz → Ceremonial Center",
    que_llevar: ["cash (no ATMs in Tamaletón)", "comfortable clothing for heat", "camera", "plenty of water", "respect and a willingness to be silent during the prayers"],
    datos_curiosos: [
      "The ritual adds up to exactly 52 turns (13 × 4 dancers) — the number of the Mesoamerican 'Indigenous Century' or New Fire cycle.",
      "Bajudh (Jacinta) became the first woman to be an official volador of Tamaletón, breaking centuries of prohibition.",
    ],
    errores_comunes: ["Arriving expecting a guaranteed flight without a prior group", "Not bringing cash"],
    seo: {
      metaTitle: "Voladores of Tamaletón 2026 | Guide to the Sacred Tének Ritual",
      metaDescription: "Discover the Tamaletón Ceremonial Center in Tancanhuitz. 2026 price guide, logistics from Ciudad Valles and the mystery of the Tének Hawk Dance. Visit now!",
      keywords: ["voladores of tamaletón", "huasteca potosina cultural tourism 2026", "hawk dance tancanhuitz", "tancanhuitz san luis potosi", "tének culture huasteca"],
      faqPrincipales: [
        { pregunta: "Are the Voladores of Tamaletón the same as the ones in Papantla?", respuesta: "No. Although they share the concept of the flight, Tamaletón belongs to the Tének people, uses white cotton garments with natural feathers, and has an independent history tied to the sacred hawk, not the quetzal." },
        { pregunta: "Can women fly at Tamaletón?", respuesta: "Yes. Tamaletón made history with Bajudh (Jacinta), the first woman to break the patriarchal ban and become an official volador." },
        { pregunta: "Is seeing the flight guaranteed if I go on my own?", respuesta: "No. The ritual is scheduled only for groups of 30+ or on festival dates. Individual visitors can see the pole and the museum but aren't guaranteed to witness the flight." },
      ],
    },
  },
  "rio-tampaon-rafting": {
    nombre: "Tampaón River — Class III Rafting",
    descripcion: "14 km of Class III rapids in turquoise water through a 500m canyon — one of the 10 most scenic rivers in North America.",
    tipo: "Adventure",
    precio_entrada: "$1,850 MXN (full tour, transport & meal included)",
    dias_abierto: "Monday to Sunday (reservation required)",
    mejor_hora: "11:00–13:00",
    temporada_ideal: "Nov–Mar",
    advertencias: "Never paddle on your own in Jul–Aug — sudden surges of several meters in minutes. Guides CANNOT provide medication — bring your own. Cash only in Tanchachín.",
    como_llegar: "45 min from Ciudad Valles · Highway 70 → Ejido Tanchachín turnoff · Last 18 km passable dirt road",
    que_llevar: ["cotton socks inside your water shoes (prevent blisters)", "a double change of dry clothes in the vehicle", "100% biodegradable sunscreen (required)", "GoPro with a chest or helmet mount only", "your own medication"],
    datos_curiosos: [
      "The turquoise water comes from the high concentration of karst minerals in the riverbed — the same mechanism that colors the Tamul falls.",
      "The 'La Tumba' rapid happens where the canyon walls close in so tightly the echo disappears — total silence before the most technical rapid of the descent.",
    ],
    errores_comunes: ["Going without a reservation in high season", "Bringing conventional sunscreen (prohibited and fined)"],
    seo: {
      metaTitle: "Tampaón River Rafting 2026 | Expert Huasteca Potosina Guide",
      metaDescription: "Experience the best rafting in Mexico on the Tampaón River. 2026 prices ($1,450–$1,890 MXN), logistics from Ciudad Valles and safety tips. Book your turquoise adventure today!",
      keywords: ["rafting huasteca potosina 2026", "tampaón river class III rapids", "ciudad valles rafting tours", "tampaón river rafting price", "best time rafting san luis potosi"],
      faqPrincipales: [
        { pregunta: "Is it safe to raft the Tampaón River if I can't swim?", respuesta: "Yes, as long as you use the high-quality flotation gear from certified operators. Tell your guide before boarding so they can position you strategically in the raft." },
        { pregunta: "What if my rafting tour is canceled due to the river level?", respuesta: "Most operators offer a switch to a calmer river (like Micos) or a reschedule. Full refunds depend on how far in advance the descent is confirmed unviable." },
        { pregunta: "Can I bring my GoPro rafting on the Tampaón?", respuesta: "Yes, with a chest or helmet mount only. Holding it in your hand is prohibited — both hands must be free to paddle and hold the safety ropes." },
      ],
    },
  },
  "xilitla-pueblo-magico": {
    nombre: "Xilitla — Surrealist Magic Town",
    descripcion: "Where concrete comes alive and the jungle turns geometric — Edward James's Las Pozas and 3 world-class museums.",
    tipo: "Art & Culture",
    precio_entrada: "$180 MXN (Las Pozas, adult)",
    dias_abierto: "Wednesday to Monday — Las Pozas is CLOSED on Tuesdays",
    mejor_hora: "08:30–10:00",
    temporada_ideal: "Nov–Mar",
    advertencias: "Don't drive to Xilitla after 6 PM — unlit roads and dense fog. ATMs can run out of cash on holidays. Reserve up to 60 days ahead in high season. A guide is required at Las Pozas (+$30 MXN).",
    como_llegar: "90 min from Ciudad Valles · Highway 85 south → Hwy 120 turnoff to Xilitla · 100% paved",
    que_llevar: ["rubber-soled shoes with deep traction (trail running)", "dark or earth-tone clothing (moss stains permanently)", "enough cash (ATMs can run dry)", "an advance reservation for Las Pozas", "umbrella or light rain jacket"],
    datos_curiosos: [
      "The 1962 frost killed thousands of Edward James's orchids — so he decided to build concrete flowers that 'would never die.' That's how Las Pozas was born.",
      "Edward James funded Salvador Dalí and René Magritte and corresponded with Frank Lloyd Wright — influences visible in the scale and fantasy of Las Pozas.",
    ],
    errores_comunes: ["Arriving on Tuesday (Las Pozas CLOSED — a very common mistake)", "Not booking ahead in high season"],
    seo: {
      metaTitle: "Xilitla Huasteca Potosina 2026 | Complete Travel Guide",
      metaDescription: "Plan your visit to Xilitla, the surrealist town of the Huasteca Potosina. 2026 hours, Las Pozas prices ($180 MXN), museums and safety tips. Experience the magic!",
      keywords: ["xilitla san luis potosi 2026", "edward james sculpture garden tickets", "leonora carrington museum xilitla prices", "how to get to xilitla from ciudad valles", "magic towns huasteca potosina"],
      faqPrincipales: [
        { pregunta: "How much time do you need to tour Xilitla?", respuesta: "At least 2 days: the first for all of Las Pozas and the Los Comales Waterfall, the second for the downtown museums and the Sunday Huapango in the plaza." },
        { pregunta: "Is it safe to travel to Xilitla in 2026?", respuesta: "Yes, it's safe as long as you travel by day. The main risk isn't violence but the mountain road conditions: dense fog, sharp curves and no nighttime lighting." },
        { pregunta: "How much is admission to Las Pozas in Xilitla in 2026?", respuesta: "Adults: $180 MXN. Children 6–12 and seniors with INAPAM: $120 MXN. Under 6: free. Required guide: an extra $30 MXN in Spanish." },
      ],
    },
  },

  // ─── Traducciones EN de los destinos de la expansión (jun 2026) ───

  "aquismon-pueblo-magico": {
    nombre: "Aquismón — Magic Town",
    descripcion: "A mostly Tének Magic Town and the gateway to Tamul, the sótanos and the Tampaón River. Its San Miguel Arcángel parish church sits on a Huastec platform.",
    tipo: "Art & Culture",
    precio_entrada: "Free admission",
    dias_abierto: "Monday to Sunday (street market on Saturdays)",
    mejor_hora: "Morning",
    temporada_ideal: "Oct–Mar",
    advertencias: "The town is your base; the big attractions (Tamul, Sótano de las Golondrinas and de las Huahuas, Cueva del Agua) are several km away and need separate transport, a guide or a boat.",
    como_llegar: "~1 h from Ciudad Valles (~55 km south) via Hwy 85",
    que_llevar: ["cash", "hat", "comfortable shoes", "camera"],
    datos_curiosos: ["Named a Magic Town on October 11, 2018 — the third in San Luis Potosí.", "Its Tének name means 'tree at the foot of a well'."],
    errores_comunes: ["Thinking Tamul or the caves are in the town (they're several km away)", "Not checking the market day"],
    seo: {
      metaTitle: "Aquismón Magic Town 2026 | What to See & How to Get There",
      metaDescription: "Aquismón, the Tének Magic Town of the Huasteca Potosina and gateway to Tamul and the sótanos. What to see, its San Miguel Arcángel church and how to get there from Ciudad Valles.",
      keywords: ["aquismón magic town", "what to see in aquismón", "aquismón san luis potosi", "gateway to tamul", "huasteca potosina magic towns"],
      faqPrincipales: [
        { pregunta: "Why is Aquismón a Magic Town?", respuesta: "It received the designation on October 11, 2018 for its living Tének culture, its architecture, and being the gateway to natural wonders like Tamul Waterfall and the Sótano de las Golondrinas." },
        { pregunta: "Are Tamul and the sótanos in the town of Aquismón?", respuesta: "No. The town is the base, but the natural attractions are several kilometers away and require transport and, for Tamul, a paddle-boat trip with a guide." },
      ],
    },
  },

  "castillo-de-la-salud": {
    nombre: "Castillo de la Salud 'Beto Ramón'",
    descripcion: "A surrealist temple of traditional medicine built in 1974 by Náhuatl herbalist Don Beto Ramón, with a garden of hundreds of medicinal plants and spaces for cleansings and consultations.",
    tipo: "Wellness",
    precio_entrada: "$20 general / $10 kids & seniors (guided $30/$20)",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Year-round",
    advertencias: "This is traditional herbal medicine, NOT a certified clinic: it does not replace professional medical care. Confirm prices and hours before going. The final stretch is on rural roads.",
    como_llegar: "~1h 30 from Ciudad Valles (~83 km); the castle is ~4 km from Axtla's main square, in Aguacatitla. ~25 km from Xilitla",
    que_llevar: ["cash", "comfortable shoes", "camera", "water"],
    datos_curiosos: ["Its architecture blends Náhuatl symbolism with biblical references (Tower of Babel, Noah's Ark, Eye of God).", "Don Beto Ramón died in 2004 and left over 150 herbal formulas still in use."],
    errores_comunes: ["Treating it as a substitute for a doctor", "Not checking the hours for cleansings and massages"],
    seo: {
      metaTitle: "Castillo de la Salud 'Beto Ramón' Axtla 2026 | Guide",
      metaDescription: "Don Beto Ramón's Castillo de la Salud in Axtla de Terrazas: surrealist architecture, a medicinal garden and Tének herbalism. Prices, hours and how to get there in 2026.",
      keywords: ["castillo de la salud beto ramón", "axtla de terrazas tourism", "huasteca potosina herbalism", "beto ramón healer", "what to do in axtla"],
      faqPrincipales: [
        { pregunta: "How much is admission to the Castillo de la Salud?", respuesta: "General admission is ~$20 MXN ($10 for kids and seniors). A guided tour is ~$30 ($20 reduced). Open daily 8:00 AM–6:00 PM." },
        { pregunta: "Does the Castillo de la Salud offer consultations?", respuesta: "Yes, it keeps Don Beto Ramón's herbalism tradition with cleansings, massages and consultations. It is traditional medicine and does not replace professional medical care." },
      ],
    },
  },

  "cascada-los-comales": {
    nombre: "Los Comales Waterfall",
    descripcion: "A semi-warm waterfall in tropical jungle, steps from the entrance to Las Pozas, with pools for swimming and a medicinal temazcal.",
    tipo: "Nature",
    precio_entrada: "Local fee (~$20 MXN, confirm on site)",
    dias_abierto: "Closed Tuesdays (like Las Pozas)",
    mejor_hora: "Morning",
    temporada_ideal: "Nov–May",
    advertencias: "It's usually visited the same day as Las Pozas (~50 m from its entrance). Trails are slippery in the rain. The temazcal requires a reservation. Price and hours aren't officially published: confirm by phone.",
    como_llegar: "~1h 45min from Ciudad Valles via Hwy 120 to Xilitla; the waterfall is right by the Las Pozas entrance",
    que_llevar: ["swimsuit", "non-slip footwear", "biodegradable repellent", "cash"],
    datos_curiosos: ["It's about 50 m from the Las Pozas entrance: many visit both the same day.", "Its medicinal temazcal takes small groups (limited capacity)."],
    errores_comunes: ["Going on a Tuesday (Las Pozas area closures)", "Not bringing cash"],
    seo: {
      metaTitle: "Los Comales Waterfall Xilitla 2026 | Next to Las Pozas",
      metaDescription: "Los Comales Waterfall, steps from Edward James's Las Pozas in Xilitla: swimming pools, a medicinal temazcal and tropical jungle. How to get there and tips for 2026.",
      keywords: ["los comales waterfall xilitla", "what to do in xilitla", "las pozas xilitla waterfall", "temazcal xilitla", "huasteca potosina waterfalls"],
      faqPrincipales: [
        { pregunta: "Where is Los Comales Waterfall?", respuesta: "It's in Xilitla, about 50 meters from the entrance to Las Pozas (Edward James's garden), so it's usually visited the same day." },
        { pregunta: "Can you swim at Los Comales?", respuesta: "Yes, it forms semi-warm pools good for swimming. Bring non-slip footwear because the rocks are slippery." },
      ],
    },
  },

  "zona-arqueologica-tamohi-el-consuelo": {
    nombre: "Tamohí (El Consuelo) Archaeological Site",
    descripcion: "A ~210-hectare pre-Hispanic Huastec center on the banks of the Tampaón River, with platforms and mounds. 'The Huastec Adolescent' was found here in 1917.",
    tipo: "Archaeology",
    precio_entrada: "Free admission (video camera use $45)",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "09:00 AM",
    temporada_ideal: "Nov–Mar",
    advertencias: "The original 'Huastec Adolescent' is NOT on site: it's displayed at the National Museum of Anthropology (Mexico City). Hot, humid climate; less equipped than Tamtoc.",
    como_llegar: "~40–50 min from Ciudad Valles via federal Hwy 70 toward El Consuelo (site ~5.75 km off the road)",
    que_llevar: ["hat", "plenty of water", "sunscreen", "comfortable shoes"],
    datos_curiosos: ["'Tamohí' means 'place of effervescence' in Tének; it's a DIFFERENT site from Tamtoc.", "'The Huastec Adolescent' was discovered here in 1917, now at the National Museum of Anthropology."],
    errores_comunes: ["Confusing it with Tamtoc", "Expecting to see the original 'Adolescent' on site"],
    seo: {
      metaTitle: "Tamohí / El Consuelo Archaeological Site 2026 | Tamuín SLP",
      metaDescription: "Tamohí (El Consuelo), a Huastec city on the banks of the Tampaón River in Tamuín, where 'The Huastec Adolescent' was found. Hours, free admission and how to get there. 2026 guide.",
      keywords: ["tamohí el consuelo tamuín", "huastec adolescent", "tamuín archaeological site", "huasteca archaeology slp", "inah tamohí"],
      faqPrincipales: [
        { pregunta: "How much is admission to Tamohí / El Consuelo?", respuesta: "Admission is free according to INAH; only a video-camera fee applies (~$45 MXN). Open 9:00 AM–6:00 PM, last entry 5:00 PM." },
        { pregunta: "Is Tamohí the same as Tamtoc?", respuesta: "No. They are two different Huastec archaeological sites in Tamuín. 'The Huastec Adolescent' was found at Tamohí (El Consuelo) in 1917." },
      ],
    },
  },

  // Fichas ligeras (descripción + tipo; el resto cae al español por ahora)
  "rio-axtla-el-chalan": {
    nombre: "Río Axtla and 'el Chalán'",
    precio_entrada: "Free access (ferry crossing: token fee)",
    dias_abierto: "Monday to Sunday (Sunday street markets along the bank)",
    mejor_hora: "Mid-morning",
    temporada_ideal: "Mar–Jun (clear water)",
    advertencias: "In the rainy season (~Jun–Oct) the river rises and becomes dangerous: don't swim when it's running high. No official hours or prices; check with the municipal tourism office.",
    como_llegar: "~1 h 30 from Ciudad Valles (~82 km) on federal highway 85 south; ~15 min from downtown Axtla to the river",
    que_llevar: [
      "swimsuit",
      "water sandals",
      "cash",
      "biodegradable sunscreen",
    ],
    datos_curiosos: [
      "The iron 'chalán' ferry has been running for more than 50 years and is a symbol of Axtla.",
      "The river is formed where the Huichihuayán and Tancuilín rivers meet.",
    ],
    errores_comunes: [
      "Swimming when the river is running high",
      "Not bringing cash for the ferry",
    ],
    descripcion: "A crystal-clear river with pools for swimming, whose emblem is 'el chalán': an old iron raft pulled across the river by hand for over 50 years.",
    tipo: "Nature",
      seo: {
      metaTitle: "Rio Axtla and 'el Chalan' | Free Swimming Spots in Axtla",
      metaDescription: "Free access. A clear-water river in Axtla de Terrazas with pools for swimming and 'el chalan', the hand-pulled iron raft that has been crossing the river for over 50 years.",
      keywords: ["rio axtla", "el chalan axtla", "things to do in axtla de terrazas", "free swimming huasteca potosina"],
    },
  },
  "cascada-el-trampolin-tamasopo": {
    nombre: "El Trampolín (Tamasopo)",
    precio_entrada: "Free access (parking fee possible)",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Mid-morning",
    temporada_ideal: "Nov–May",
    advertencias: "This is NOT the paid 'Cascadas de Tamasopo' park. There are no formal lifeguards: check the depth before jumping. Muddy, slippery ground. Wear a life vest.",
    como_llegar: "~1 h–1 h 15 from Ciudad Valles; ~4–5 km from downtown Tamasopo on the road to Agua Buena",
    que_llevar: [
      "swimsuit",
      "water shoes",
      "life vest",
      "cash",
    ],
    datos_curiosos: [
      "It's a free stretch of the Agua Buena river, not the paid Cascadas de Tamasopo park.",
      "The spot runs about 2 km along the river.",
    ],
    errores_comunes: [
      "Mistaking it for the paid Tamasopo park",
      "Jumping without checking the depth",
    ],
    descripcion: "A free, public stretch of the Agua Buena River with turquoise water, mini waterfalls, pools and ropes in the trees to jump into the water.",
    tipo: "Nature",
      seo: {
        faqPrincipales: [
          {
            pregunta: "Is El Trampolín the same as the Tamasopo Waterfalls?",
            respuesta: "No. El Trampolín is a free, public stretch of the Agua Buena river; the Cascadas de Tamasopo are a separate paid park. It's the most common mix-up visitors make.",
          },
        ],
      metaTitle: "El Trampolin, Tamasopo | Free River with Turquoise Pools",
      metaDescription: "A free, public stretch of the Agua Buena river in Tamasopo: turquoise water, small waterfalls, pools and rope swings. It is NOT the paid Cascadas de Tamasopo park.",
      keywords: ["el trampolin tamasopo", "agua buena river", "free waterfalls huasteca potosina", "things to do in tamasopo"],
    },
  },
  "templo-san-juan-bautista-coxcatlan": {
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Year-round (liveliest during Xantolo, 1–2 Nov)",
    advertencias: "The construction dates (1522–1523) come from local tradition and press reports, not a verified INAH plaque. Visiting hours are not published: check locally.",
    como_llegar: "~1.5–2 h south of Ciudad Valles; in the centre of the town of Coxcatlán, facing the square",
    que_llevar: [
      "comfortable shoes",
      "camera",
      "cash",
    ],
    datos_curiosos: [
      "It's considered one of the oldest religious buildings in the Huasteca Potosina.",
      "It is said to have been built with stone bound by a mortar that included ground seashells.",
    ],
    errores_comunes: [
      "Assuming there are set visiting hours",
      "Expecting a museum (it's a working church)",
    ],
    nombre: "Church of San Juan Bautista (Coxcatlán)",
    descripcion: "A 16th-century church and former convent, considered one of the oldest in the Huasteca Potosina, facing Coxcatlán's main square.",
    tipo: "Art & Culture",
      seo: {
      metaTitle: "San Juan Bautista Church, Coxcatlan | 16th-Century Convent",
      metaDescription: "A 16th-century church and former convent facing the main square of Coxcatlan, considered one of the oldest in the Huasteca Potosina. Free entry; it is a working church, not a museum.",
      keywords: ["san juan bautista coxcatlan", "coxcatlan convent", "oldest churches huasteca potosina", "coxcatlan san luis potosi"],
    },
  },
  "cascada-rancho-el-zapote-poza-azul-coxcatlan": {
    nombre: "Rancho El Zapote Waterfall (Poza Azul)",
    precio_entrada: "No official fee published (check on site)",
    dias_abierto: "Check locally",
    mejor_hora: "Mid-morning",
    temporada_ideal: "Dry season (the water clouds up with the rains)",
    advertencias: "Poorly documented site: price, hours and exact location are not officially verified. Access may be through a private ranch; check locally.",
    como_llegar: "~11 min from the town of Coxcatlán, which is ~1.5–2 h south of Ciudad Valles",
    que_llevar: [
      "swimsuit",
      "water shoes",
      "cash",
      "water",
    ],
    datos_curiosos: [
      "The state promotes it for its 'vibrant turquoise colour' and for being only ~11 min from the town centre.",
    ],
    errores_comunes: [
      "Confusing it with Poza de Rosendo (a different spot)",
      "Going in the rainy season (murky water)",
    ],
    descripcion: "A turquoise waterfall and pool known locally as the 'blue pool', one of the least crowded natural spots in the Huasteca Potosina.",
    tipo: "Nature",
      seo: {
      metaTitle: "Rancho El Zapote Waterfall (Poza Azul), Coxcatlan",
      metaDescription: "A waterfall and turquoise pool in Coxcatlan known as 'poza azul', one of the least crowded corners of the Huasteca Potosina. Little documented: confirm access and fees locally.",
      keywords: ["poza azul coxcatlan", "rancho el zapote waterfall", "coxcatlan san luis potosi", "off the beaten path huasteca potosina"],
    },
  },
  "ruinas-de-el-jopoy-coxcatlan": {
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "It comes alive on 1–2 November (Day of the Dead)",
    advertencias: "An abandoned, roofless and deteriorating site that serves as a cemetery: treat it with respect. Its authorship and dates (attributed to Cortés, 1522–23) come from press reports and tradition, not an INAH plaque. Rural track; a local guide is advisable.",
    como_llegar: "~8.4 km from the town of Coxcatlán (El Jopoy locality); Coxcatlán is ~1.5–2 h south of Ciudad Valles",
    que_llevar: [
      "outdoor shoes",
      "water",
      "cash",
      "respect (it's a graveyard)",
    ],
    datos_curiosos: [
      "It's cited as one of the first hermitages in the Huasteca Potosina.",
      "INAH carried out preliminary surveys around 2009.",
    ],
    errores_comunes: [
      "Being disrespectful (it's an active cemetery)",
      "Going without a local guide",
    ],
    nombre: "El Jopoy Ruins",
    descripcion: "Remains of a colonial hermitage with stone walls and large arches, noted as one of the first Spanish religious buildings in the Huasteca Potosina; now in ruins and used as a community cemetery.",
    tipo: "Archaeology",
      seo: {
      metaTitle: "El Jopoy Ruins, Coxcatlan | Colonial Chapel in Ruins",
      metaDescription: "The remains of a colonial chapel with stone walls and wide arches in Coxcatlan, today used as a community cemetery. Free access; it comes alive on November 1 and 2.",
      keywords: ["el jopoy ruins", "el jopoy coxcatlan", "colonial ruins huasteca potosina", "things to do in coxcatlan"],
    },
  },
  "tancanhuitz": {
    nombre: "Tancanhuitz (Ciudad Santos)",
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Xantolo (late Oct–early Nov) and the San Miguel festival (25–29 Sep)",
    advertencias: "The cultural experience peaks on specific dates; outside them the town is quiet. The '149' is the traditional name of the stairway, not a measured count. Mountain roads.",
    como_llegar: "~50–55 min south of Ciudad Valles (~54–56 km)",
    que_llevar: [
      "comfortable shoes",
      "water",
      "camera",
      "cash",
    ],
    datos_curiosos: [
      "Its parish church became known as the 'Church of the 149 Steps'.",
      "It's part of the Huasteca Potosina's Xantolo Route.",
    ],
    errores_comunes: [
      "Going out of season expecting the dances",
      "Underestimating the stairway",
    ],
    descripcion: "A Tének-Nahua county seat famous for its San Miguel Arcángel church reached by a long stairway (the 'Church of the 149 Steps'), and for its strong Xantolo, huapango and indigenous dance traditions.",
    tipo: "Art & Culture",
      seo: {
      metaTitle: "Tancanhuitz | The 149-Step Church and Xantolo",
      metaDescription: "A Tenek-Nahua town whose San Miguel Arcangel parish sits at the top of a long stairway, home to some of the strongest Xantolo, huapango and dance traditions in the Huasteca.",
      keywords: ["tancanhuitz", "149 steps church", "xantolo tancanhuitz", "ciudad santos san luis potosi"],
    },
  },
  "san-martin-chalchicuautla": {
    nombre: "San Martín Chalchicuautla",
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Xantolo: 31 Oct–2 Nov",
    advertencias: "The experience peaks during Xantolo; outside those dates the town is quiet. Details for the Cascada del Manantial (cost, hours, access) are unverified. Mountain road.",
    como_llegar: "~26 km (30–35 min) from Tamazunchale; ~1.5–2 h from Ciudad Valles via Tamazunchale",
    que_llevar: [
      "comfortable shoes",
      "camera",
      "cash",
      "water",
    ],
    datos_curiosos: [
      "Recognised as the birthplace of Xantolo in San Luis Potosí: troupes of masked 'viejos' dance huapango.",
      "Its seasonal food includes zacahuil, bocoles and queso de bola.",
    ],
    errores_comunes: [
      "Visiting outside Xantolo expecting the troupes",
      "Assuming the waterfall will be open",
    ],
    descripcion: "A town known as the 'Cradle of Xantolo', where the Day of the Dead is lived with deep Nahua roots from October 31 to November 2. The Cascada del Manantial waterfall is nearby.",
    tipo: "Art & Culture",
      seo: {
      metaTitle: "San Martin Chalchicuautla | The Birthplace of Xantolo",
      metaDescription: "The municipality known as the 'cradle of Xantolo': from October 31 to November 2, Day of the Dead is lived with deep Nahua roots. Cascada del Manantial is nearby.",
      keywords: ["san martin chalchicuautla", "birthplace of xantolo", "xantolo huasteca potosina", "day of the dead san luis potosi"],
    },
  },
  "san-vicente-tancuayalab": {
    nombre: "San Vicente Tancuayalab",
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Xantolo / Day of the Dead (late Oct–2 Nov)",
    advertencias: "The cultural experience peaks during Xantolo; outside those dates the town is quiet.",
    como_llegar: "~1 h 12 by car from Ciudad Valles (~70 km)",
    que_llevar: [
      "comfortable shoes",
      "camera",
      "cash",
      "water",
    ],
    datos_curiosos: [
      "'Tancuayalab' means 'place of the staff of command' in Huastec.",
      "It was founded as 'San Francisco Tancuayalab' in the 16th century and moved to its present site in 1767.",
    ],
    errores_comunes: [
      "Going outside Xantolo expecting the festivities",
      "Underestimating the heat",
    ],
    descripcion: "A Huastec town recognized as the 'cradle of the Day of the Dead' in San Luis Potosí, founded by Franciscan missionaries in the 16th century near the Moctezuma River.",
    tipo: "Art & Culture",
      seo: {
      metaTitle: "San Vicente Tancuayalab | Cradle of Day of the Dead in SLP",
      metaDescription: "Free access. A Huastec town recognised as the 'cradle of Day of the Dead' in San Luis Potosi, founded by Franciscans in the 16th century near the Moctezuma river.",
      keywords: ["san vicente tancuayalab", "day of the dead san luis potosi", "xantolo huasteca potosina", "huastec towns mexico"],
    },
  },
  "tanlajas": {
    nombre: "Tanlajás",
    precio_entrada: "Free access",
    dias_abierto: "Monday to Sunday",
    mejor_hora: "Morning",
    temporada_ideal: "Holy Week (Toreada de los Diablos) and the Santa Ana festival (25–26 Jul)",
    advertencias: "The 'Toreada de los Diablos' is held during HOLY WEEK (not Day of the Dead). To see the ritual you have to go on those dates; it involves real rawhide whip strikes.",
    como_llegar: "~49–50 km (50–60 min) southeast of Ciudad Valles",
    que_llevar: [
      "comfortable shoes",
      "cash",
      "camera",
      "an appetite (local food)",
    ],
    datos_curiosos: [
      "Its Tének name means 'place of flat stones'.",
      "In the Toreada the 'devils' wear hand-carved wooden masks and carry a chirrión (leather whip).",
    ],
    errores_comunes: [
      "Going expecting the Toreada on Day of the Dead (it's Holy Week)",
    ],
    descripcion: "A town of Tének roots known for its regional cuisine (zacahuiles, bocoles, cecina) and for the 'Toreada de los Diablos', an ancestral ritual where masked figures recreate the struggle between good and evil.",
    tipo: "Art & Culture",
      seo: {
        faqPrincipales: [
          {
            pregunta: "When is the Toreada de los Diablos in Tanlajás?",
            respuesta: "It's held during Holy Week, not on the Day of the Dead. It's the most common mistake people make when planning a visit.",
          },
        ],
      metaTitle: "Tanlajas | The Devils' Bullfight and Tenek Cooking",
      metaDescription: "A town with Tenek roots known for its zacahuiles, bocoles and cecina, and for the 'Toreada de los Diablos', a masked ritual held during Holy Week (not Day of the Dead).",
      keywords: ["tanlajas", "toreada de los diablos", "zacahuil huasteca potosina", "tenek culture"],
    },
  },
  "texquitote": {
    precio_entrada: "Free access (visiting workshops may need to be arranged with the luthier)",
    dias_abierto: "Contact a luthier in advance",
    mejor_hora: "Morning",
    temporada_ideal: "Dry season (Nov–Apr) for the rural roads",
    advertencias: "This is a living Indigenous community, not a staged attraction: come with respect and contact a luthier in advance. The final stretches are dirt road. There are two localities with the same name (Primero and Segundo): confirm which one you're going to.",
    como_llegar: "~20–30 min from Tamazunchale (the nearest hub); ~2.5–3 h south of Ciudad Valles on federal highway 85 to Matlapa",
    que_llevar: [
      "cash",
      "outdoor shoes",
      "camera",
      "respect for the community",
    ],
    datos_curiosos: [
      "The 'quinta huapanguera', the five-string guitar of huapango huasteco, originated in Texquitote.",
      "The conchas used for son are still made from armadillo shell.",
    ],
    errores_comunes: [
      "Turning up without contacting a luthier",
      "Mixing up Texquitote Primero and Segundo",
    ],
    nombre: "Texquitote — cradle of son huasteco",
    descripcion: "A Nahua community recognized as the cradle of son huasteco lutherie, where around 40 luthiers hand-build jaranas, huapanguera guitars, violins, armadillo-shell instruments and harps.",
    tipo: "Art & Culture",
      seo: {
        faqPrincipales: [
          {
            pregunta: "Can you visit a luthier's workshop in Texquitote?",
            respuesta: "Yes, but the workshops are private and have no set hours: you need to contact a luthier beforehand to arrange the visit.",
          },
        ],
      metaTitle: "Texquitote, Matlapa | Home of the Son Huasteco Luthiers",
      metaDescription: "A Nahua community where around 40 luthiers hand-build the jaranas, quinta huapangueras, violins and harps of son huasteco. The workshops are private: get in touch before visiting.",
      keywords: ["texquitote", "son huasteco luthiers", "jarana huasteca", "quinta huapanguera", "mexican crafts huasteca potosina"],
    },
  },
  "laguna-de-los-suspiros": {
    nombre: "Laguna de los Suspiros",
    precio_entrada: "No official fee published",
    dias_abierto: "Check locally",
    mejor_hora: "Morning or sunset",
    temporada_ideal: "Check ahead (the water level varies with drought)",
    advertencias: "A rustic, emerging tourism site with no verified formal services. The water level of the Ébano lagoons drops during drought. Not to be confused with Laguna Marland (another Ébano lagoon).",
    como_llegar: "~1 h 20–1 h 45 from Ciudad Valles via Tamuín and Ébano (~70–75 km); in the Plan de Iguala ejido",
    que_llevar: [
      "insect repellent",
      "water",
      "camera",
      "cash",
    ],
    datos_curiosos: [
      "Its strangler fig is around 200 years old and its roots form two large natural 'doorways', its most photographed feature.",
      "The SLP tourism ministry has promoted the lagoon as a day-trip option.",
    ],
    errores_comunes: [
      "Expecting formal tourist services",
      "Confusing it with Laguna Marland",
    ],
    descripcion: "A lagoon in the Plan de Iguala ejido whose emblem is a majestic ~200-year-old fig tree (higuerón) whose huge roots form two natural 'doorways'.",
    tipo: "Nature",
      seo: {
      metaTitle: "Laguna de los Suspiros, Ebano | The 200-Year-Old Fig Tree",
      metaDescription: "A lagoon in the Plan de Iguala ejido (Ebano) whose emblem is a roughly 200-year-old fig tree, its huge roots forming two natural 'doorways'. No formal tourist services.",
      keywords: ["laguna de los suspiros", "ebano san luis potosi", "fig tree laguna de los suspiros", "things to do in ebano"],
    },
  },
  "la-trinidad-xilitla": {
    mejor_hora: "Sunrise (for the fog)",
    que_llevar: [
      "a jacket (it's cold up there)",
      "hiking shoes",
      "food to grill (there are fire pits and grills)",
      "camera",
      "cash",
    ],
    datos_curiosos: [
      "It's a Nahua community of around 96 people high in the Sierra Gorda.",
      "There are wooden cabins for couples and groups (roughly $700 to $2,500), a camping area, fire pits and grills where you can cook your own food.",
      "The forest is home to tamanduas, coatis, crested guans and huge madroño trees.",
    ],
    errores_comunes: [
      "Driving up in a very low car (the broken dirt road and the gradient will scrape it)",
      "Underestimating the cold and damp of the cloud forest",
      "Turning up without booking the cabin or campsite",
    ],
    nombre: "La Trinidad — Xilitla Cloud Forest",
    descripcion: "A Nahua community about 14 km from Xilitla, set in one of the best-preserved cloud forests in the Huasteca (pine-oak, ~1,950 m). It has wooden cabins for couples and groups, a camping area, campfires and grills, plus trails to lookouts, pools, caves and sinkholes.",
    tipo: "Nature & Forest",
    precio_entrada: "$100 MXN per person (entrance); wooden cabins for couples and groups from $700 to $2,500 separate",
    dias_abierto: "Year-round (book in advance)",
    temporada_ideal: "Year-round; the fog is densest in the rainy season (Jun–Oct)",
    advertencias: "The climb is very steep with rough dirt-road sections, so a vehicle that isn't too low is recommended so it doesn't scrape. It's cold up there (cloud forest): bring a jacket even if it's warm down in Xilitla. It's an inhabited community — come with respect and book ahead.",
    como_llegar: "~14 km west of Xilitla; 45 min to 1 h on a mountain road climbing to ~1,950 m. The final stretch is very steep and rough dirt road, so a vehicle with good ground clearance (not too low) is recommended.",
    seo: {
      faqPrincipales: [
        {
          pregunta: "How do you get to La Trinidad from Xilitla?",
          respuesta: "La Trinidad is about 14 km west of Xilitla on a mountain road that climbs to around 1,950 m. The drive takes between 45 minutes and 1 hour. The final stretch is a very steep, broken dirt road, so it's best to drive in daylight and in a car that isn't too low, so it doesn't scrape.",
        },
        {
          pregunta: "What can you do in La Trinidad and how much does it cost?",
          respuesta: "Admission is $100 per person. You can walk trails to lookouts, pools, caves and sinkholes (such as the Olla de la Luz), stay in wooden cabins for couples or groups (roughly $700 to $2,500 depending on size), camp, build fires and grill your own food. It's cold up there, so bring a jacket.",
        },
        {
          pregunta: "When is the best time to visit the La Trinidad cloud forest?",
          respuesta: "You can visit year-round. The signature fog is densest in the rainy season (June to October). Because of the altitude the weather is cool and damp, so bring a jacket even if it's hot down in Xilitla.",
        },
      ],
      metaTitle: "La Trinidad Xilitla 2026 | Cloud Forest in the Sierra",
      metaDescription: "La Trinidad, the cloud forest hidden 14 km from Xilitla: trails, lookouts, pools and cabins in a Nahua community at 1,950 m. How to get there, costs and what to do.",
      keywords: ["la trinidad xilitla", "cloud forest huasteca potosina", "what to do in xilitla", "ecotourism xilitla", "xilitla cabins sierra gorda"],
    },
  },
  "olla-de-la-luz": {
    mejor_hora: "Mid-morning",
    que_llevar: [
      "hiking shoes",
      "a jacket or rain shell",
      "water and snacks",
      "camera",
      "cash",
    ],
    datos_curiosos: [
      "The Cerro de la Luz above it is the highest point in the municipality of Xilitla, reaching ~2,300 m.",
      "The sinkhole is about 800 m across and its vertical drop is over 120 m.",
    ],
    errores_comunes: [
      "Trying to get there without a local guide",
      "Not allowing for the altitude and the cold of the cloud forest",
    ],
    nombre: "Olla de la Luz — Cerro de la Luz",
    descripcion: "A huge sinkhole about 800 m across with a vertical shaft over 120 m deep, crowned by Cerro de la Luz, the highest point in the Xilitla municipality. Reached after a hike through the cloud forest from La Trinidad.",
    tipo: "Nature & Sinkhole",
    precio_entrada: "Guided route from La Trinidad (~$150–$250 MXN per group)",
    dias_abierto: "Year-round (book in advance)",
    temporada_ideal: "Dry season (Nov–May) for the forest trails",
    advertencias: "A local guide from La Trinidad is required — you can't reach it on your own. It involves a cloud-forest hike at altitude (1,950–2,300 m), and it's a deep abyss: don't approach the edge without a guide.",
    como_llegar: "About 5 km from La Trinidad (which is ~14 km from Xilitla), climbing toward Cerro de la Luz; reached on foot and only with a community guide",
    seo: {
      faqPrincipales: [
        {
          pregunta: "What is the Olla de la Luz?",
          respuesta: "It's a large sinkhole (doline) roughly 800 metres across with a vertical drop of more than 120 metres, set high in the Xilitla cloud forest and crowned by the Cerro de la Luz.",
        },
        {
          pregunta: "How do you get to the Olla de la Luz?",
          respuesta: "Only with a local guide from La Trinidad: the visit must be guided, you can't get there on your own. Access is on foot, about 5 km from La Trinidad, climbing towards the Cerro de la Luz. La Trinidad is about 14 km from Xilitla.",
        },
        {
          pregunta: "How high up is it?",
          respuesta: "The route runs between 1,950 and 2,300 metres above sea level, so the weather is cool and damp; bring a jacket and hiking shoes.",
        },
      ],
      metaTitle: "Olla de la Luz Xilitla | Cerro de la Luz Sinkhole",
      metaDescription: "The Olla de la Luz: a sinkhole ~800 m across and over 120 m deep crowned by Cerro de la Luz, the highest point in Xilitla. Reached from La Trinidad.",
      keywords: ["olla de la luz xilitla", "hoya de la luz", "cerro de la luz xilitla", "sinkhole xilitla", "la trinidad cloud forest"],
    },
  },
  "cueva-del-salitre": {
    mejor_hora: "Morning",
    advertencias: "In the rainy season the cave can flood from seepage. Caving, rappelling and climbing require gear and a guide; don't enter the technical sections without experience.",
    que_llevar: [
      "torch or headlamp",
      "closed shoes with grip",
      "clothes you don't mind getting dirty",
      "cash",
      "water",
    ],
    datos_curiosos: [
      "Its name comes from the damp ('salitre', saltpetre) that seeps down its walls.",
      "It has five bolted climbing routes, a favourite with climbers in the region.",
    ],
    errores_comunes: [
      "Visiting at the height of the rainy season (flood risk)",
      "Entering the technical sections without gear or a guide",
    ],
    nombre: "Cueva del Salitre — Xilitla",
    descripcion: "A cavern hidden in the Xilitla jungle, about 100 m wide at the mouth and 300 m deep. Its walls are a popular spot for caving, rappelling and rock climbing (five bolted routes), minutes from the Magic Town center.",
    tipo: "Cave & Adventure",
    precio_entrada: "$50 MXN per person (the site now has its own entrance)",
    dias_abierto: "Year-round (may flood in the rainy season)",
    temporada_ideal: "Dry season (Nov–May); it tends to seep water and flood during the rains",
    como_llegar: "From downtown Xilitla along federal highway 120 toward Huichihuayán, a few minutes from town. The site now has its own dedicated entrance, with a short ~10 min trail to the cave.",
    seo: {
      faqPrincipales: [
        {
          pregunta: "How much does it cost to enter the Cueva del Salitre?",
          respuesta: "Admission is $50 pesos per person. The site now has its own entrance (special access) on federal highway 120 towards Huichihuayán, a few minutes from downtown Xilitla, with a short trail to the cave.",
        },
        {
          pregunta: "What can you do at the Cueva del Salitre?",
          respuesta: "It's a popular spot for caving, rappelling and rock climbing: its walls have five bolted routes. You can also walk it after a short trail of about 10 minutes.",
        },
        {
          pregunta: "When is the best time to visit?",
          respuesta: "The dry season (November to May). In the rainy season water tends to seep in and it can even flood, so it's best avoided.",
        },
      ],
      metaTitle: "Cueva del Salitre Xilitla 2026 | Caving & Rappel",
      metaDescription: "Cueva del Salitre, a hidden gem of Xilitla: ~100 m wide and 300 m deep, with caving, rappelling and five climbing routes. How to get there, $50 fee and tips.",
      keywords: ["cueva del salitre xilitla", "caving xilitla", "rappel xilitla", "rock climbing huasteca potosina", "what to do in xilitla"],
    },
  },
  "museo-leonora-carrington-xilitla": {
    mejor_hora: "Morning",
    advertencias: "Not to be confused with the Leonora Carrington Museum in the city of San Luis Potosí (Centro de las Artes): they are two different museums. It pairs very well with Edward James's Las Pozas on the same day.",
    que_llevar: [
      "camera",
      "cash",
      "comfortable shoes",
    ],
    datos_curiosos: [
      "Leonora Carrington (1917–2011) was one of the great figures of surrealism and a friend of Edward James, creator of Las Pozas.",
      "Visiting the museum and Las Pozas on the same day is the classic surrealist pairing in Xilitla.",
    ],
    errores_comunes: [
      "Confusing it with the Leonora Carrington Museum in the city of San Luis Potosí",
      "Arriving on a Monday, when it's usually closed",
    ],
    nombre: "Leonora Carrington Museum — Xilitla",
    descripcion: "A museum dedicated to the surrealist artist Leonora Carrington, a friend of Edward James, in the heart of Xilitla. It shows her sculpture, lithography and drawing, plus a space devoted to surrealism.",
    tipo: "Art & Culture",
    precio_entrada: "General $50 MXN · students, teachers and seniors (with valid ID) $25 · under 12 free",
    dias_abierto: "Tuesday to Sunday (closed Mondays)",
    temporada_ideal: "Year-round",
    como_llegar: "In downtown Xilitla, Corregidora #103, steps from the main square; walkable from anywhere in the Magic Town",
    seo: {
      faqPrincipales: [
        {
          pregunta: "What are the opening hours of the Leonora Carrington Museum in Xilitla?",
          respuesta: "It's open Tuesday to Sunday, from 11:00 to 17:00 (last entry at 16:30); it closes on Mondays.",
        },
        {
          pregunta: "How much is admission to the museum?",
          respuesta: "General admission is $50 pesos; students, teachers and seniors with ID pay $25, and children under 12 go free.",
        },
        {
          pregunta: "Is it connected to Edward James's Las Pozas?",
          respuesta: "Yes. Leonora Carrington was a friend of Edward James, the creator of Las Pozas. Visiting the museum and Las Pozas on the same day is the classic surrealist pairing in Xilitla.",
        },
      ],
      metaTitle: "Leonora Carrington Museum Xilitla | Hours & Prices 2026",
      metaDescription: "Leonora Carrington Museum in downtown Xilitla: sculpture, lithography and drawing by the surrealist artist and friend of Edward James. Hours, prices and how to get there.",
      keywords: ["leonora carrington museum xilitla", "leonora carrington xilitla", "what to do in xilitla", "surrealism xilitla", "huasteca potosina museums"],
    },
  },
};
