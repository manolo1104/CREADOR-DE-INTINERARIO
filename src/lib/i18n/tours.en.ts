// Traducciones al inglés de los tours, indexadas por slug.
// Solo los campos de cara al usuario; lo no traducido cae al español (ver localize.ts).
// gallery = textos alt en el MISMO orden que el array gallery de tours.ts.
//
// 🔴 Precios: NUNCA escritos a mano en una descripción. Se pone `{precio}` y
// `localizeTour` lo resuelve con `conPrecio(…, "en")` → "$900 MXN". Con la
// cifra a mano, el día que cambie el precio el inglés se queda con el viejo.
//
// 🔴 Una traducción que se queda vieja miente en inglés aunque el español esté
// bien. El 28 sep 2026 seis recorridos (rappel, Tamul, Surrealista, Meco,
// Escalonado, Acuática) y el rafting seguían con la versión de hace meses: el
// rappel decía "no incluye transporte" encima de su propio "Transport is
// included", y la Ruta Acuática prometía todas las paradas cuando el día da
// para una de dos. Al cambiar `descripcion`, `destinos` o `incluye` en
// tours.ts, se retraduce aquí en el mismo cambio.

export interface TourTranslation {
  nombre?: string;
  /** El nombre sin el detalle tras el guion (ver `nombreCorto` en tours.ts). */
  nombreCorto?: string;
  tagline?: string;
  descripcion?: string;
  descripcionLarga?: string;
  tipo?: string;
  urgencia?: string;
  destinos?: string[];
  incluye?: string[];
  gallery?: string[];
  /** Textos de rutas/flota en el MISMO orden que tours.ts; duración y precios NO se traducen. */
  rutas?: { nombre?: string; descripcion?: string; destinos?: string[]; incluye?: string[] }[];
  flota?: { nombre?: string; capacidad?: string; descripcion?: string }[];
  /**
   * Elección obligatoria del recorrido, en el MISMO orden de opciones que
   * tours.ts. Los `id` NO se traducen: son los que viajan al servidor.
   * Sin esto, la única decisión que el carrito EXIGE para poder cobrar salía en
   * español en medio de un checkout en inglés.
   */
  eleccion?: { titulo?: string; opciones?: { nombre?: string; nota?: string }[] };
  /** Actividades opcionales, en el MISMO orden que tours.ts; el precio no se traduce. */
  addOns?: { nombre?: string; descripcion?: string }[];
  /**
   * El día hora por hora, en el MISMO orden que tours.ts. La HORA no se
   * traduce —es un dato, no un texto—, solo el titular y la descripción.
   */
  itinerario?: { momento?: string; texto?: string }[];
}

export const TOURS_EN: Record<string, TourTranslation> = {
  "rzr-xilitla": {
    nombre: "RZR Off-Road Ride in Xilitla — Pick Your Route",
    nombreCorto: "RZR Off-Road Ride in Xilitla",
    tagline: "Drive your own off-road buggy through jungle, rivers and mud — 4 routes, 2 to 5 hours",
    tipo: "Off-Road Adventure",
    urgencia: "Priced per vehicle, not per person — 4 routes to choose from",
    descripcion:
      "Drive your own off-road vehicle through the humid jungle of Xilitla: cross crystal-clear rivers, plow through the mud and pick from 4 routes — the Nanacatli Village (a hamlet of giant mushroom houses), the mountain lookouts, a hidden jungle spring (with kayak) or the cloud forest of La Trinidad. Pricing is per vehicle (from {precio}), not per person.",
    descripcionLarga:
      "Few ways of seeing the Huasteca are as much fun as taking the wheel of your own off-road vehicle. We offer 4 different routes: Nanacatli (2 h, our most popular, reaching the Nanacatli Village, a hamlet of giant mushroom houses known as 'the smurf village'), Miradores (3 h, panoramic mountain lookouts), Nacimiento (5 h, a crystal-clear spring deep in the jungle where we lend you a kayak and life vest) and Trinidad (5 h, climbing to the cloud forest of La Trinidad, a mountain village preserved in time).\n\nWe meet at our base in Xilitla, where we hand you a helmet and goggles and give you a driving briefing. No experience required: the vehicles are easy to control and an instructor-guide leads the route ahead of you the whole time, marking the way and clearing any obstacle. All you have to do is enjoy the ride.\n\nPricing is PER VEHICLE, not per person, and depends on the route and the unit you choose: from the two-seater RZR 500 ({precio} for the Nanacatli Route) up to the Family Defender for 6 adults and 2 kids, or the premium Polaris Pro S. Every unit includes fuel, safety gear and the guide. Transportation to Xilitla and meals are not included.\n\nWe recommend clothes that can get dirty and wet, closed-toe shoes and a change of clothes: you'll come out covered in mud and with a smile that's hard to wipe off.",
    destinos: [
      "Base in Xilitla (meeting point)",
      "Nanacatli Village — mushroom houses (Nanacatli Route · 2 h)",
      "Mountain lookouts (Miradores Route · 3 h)",
      "Hidden jungle spring with kayak (Nacimiento Route · 5 h)",
      "Cloud forest of La Trinidad (Trinidad Route · 5 h)",
    ],
    incluye: [
      "Off-road vehicle with fuel included",
      "Safety helmet and goggles for every rider",
      "Instructor-guide who leads and marks the route",
      "Driving briefing — beginner-friendly",
      "4 routes to choose from: Nanacatli, Miradores, Nacimiento or Trinidad",
    ],
    rutas: [
      { nombre: "Nanacatli Route",  descripcion: "Xilitla's most popular ride and perfect for first-timers. You head into the humid jungle, cross crystal-clear rivers and reach Nanacatli Village, a charming hamlet of giant mushroom houses — the famous 'smurf village' — perfect for photos. Mud, nature and adrenaline in two hours.",
        destinos: ["Nanacatli Village (the smurf village)", "Xilitla Lookout", "Tlahuilapa Tunnel", "Old Road to Las Pozas", "Xilitla Magic Town", "Surrealist Garden (from outside)"] },
      { nombre: "Miradores Route",  descripcion: "Climb to the highest points of the sierra and take in panoramic views that will leave you breathless. The Huasteca Potosina from above, with the jungle stretching as far as the eye can see, also passing through Nanacatli Village. Perfect for epic photos.",
        destinos: ["Nanacatli Village (the smurf village)", "Xilitla Lookout", "Cerro Quebrado Lookout", "Tlahuilapa Tunnel", "Old Road to Las Pozas", "Xilitla Magic Town", "Surrealist Garden (from outside)"] },
      { nombre: "Nacimiento Route", descripcion: "Our most complete adventure. You reach a crystal-clear spring hidden deep in the jungle — the Xilitla-Huichihuayán Spring — and there we lend you a kayak and life vest to enjoy the water. Along the way you visit the Cueva de las Quilas and several lookouts. A secret paradise impossible to reach without these vehicles.",
        incluye: ["Kayak and life vest provided for the activity at the spring"],
        destinos: ["Xilitla-Huichihuayán Spring", "Cueva de las Quilas", "Xilitla Lookout", "Tlahuilapa Tunnel", "Old Road to Las Pozas", "Xilitla Magic Town", "Surrealist Garden (from outside)"] },
      { nombre: "Trinidad Route",   descripcion: "History, culture and nature in a single ride. Mountain trails climbing up to the cloud forest of La Trinidad, a mountain village preserved in time, with a stop at Nanacatli Village (the smurf village) and several lookouts. The highest and greenest ride in Xilitla.",
        destinos: ["La Trinidad Cloud Forest", "Nanacatli Village (the smurf village)", "Xilitla Lookout", "Tlahuilapa Tunnel", "Old Road to Las Pozas", "Xilitla Magic Town", "Surrealist Garden (from outside)"] },
    ],
    flota: [
      { nombre: "RZR 500",         capacidad: "2 adults + 1 child",  descripcion: "Agile, sporty and full of character. Ideal for couples or a small family." },
      { nombre: "Can-Am 800",      capacidad: "2 adults",            descripcion: "The Canadian beast. Brutal power for two adventurers chasing extreme thrills." },
      { nombre: "RZR 900",         capacidad: "4 adults",            descripcion: "Twice the power, twice the excitement. For groups of 4 who fear nothing." },
      { nombre: "Defender",        capacidad: "6 adults",            descripcion: "Sturdy, reliable and roomy. Comfort without giving up the adventure." },
      { nombre: "Family Defender", capacidad: "6 adults + 2 kids",   descripcion: "The biggest in our fleet. Built for whole families or groups." },
      { nombre: "Maverick X3",     capacidad: "4 adults",            descripcion: "The fastest, most adrenaline-fueled unit. Competition suspension for speed lovers." },
      { nombre: "Polaris Pro S",   capacidad: "4 adults",            descripcion: "The premium experience. Cutting-edge tech, extraordinary power and luxury finishes." },
    ],
    gallery: [
      "Xilitla sierra — a road through the tall forest",
      "Xilitla sierra — a Defender with its lights on in the fog",
      "Xilitla jungle — an RZR with a kayak on the roof, coming down a dirt track",
      "Sierra lookout — a family standing on the Maverick, with the mountains behind",
      "Sierra lookout — a group posing with their Maverick at the edge of the sierra",
      "Sierra lookout — a family in their Defender under a blue sky",
      "Xilitla sierra — a couple next to their Defender, with the mountain in the clouds",
      "Sierra lookout — a group of friends with the Huasteca valley behind",
      "Xilitla jungle — a Defender splashing through the mud",
      "Lookout over Xilitla — arms wide open above the town lights at dusk",
      "Xilitla jungle — a couple with their Defender under a rock tunnel",
      "Jungle spring — kayaking on turquoise water",
      "Group of friends posing on an RZR Pro at a mountain lookout during the off-road ride in Xilitla",
      "Side view of an RZR Pro off-road vehicle with the green mountains of Xilitla in the background",
      "Polaris off-road vehicle at the starting point of the ride, with guides and flags at the Xilitla base",
      "Can-Am Maverick X3 with mud tires ready at the meeting point of the off-road tour",
    ],
  },

  "rafting-rio-tampaon": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Ciudad Valles or Xilitla." },
      { momento: "Río Tampaón landing", texto: "You drop off your things and meet the certified guide who rides INSIDE your raft the whole way down, not in another one." },
      { momento: "Briefing and practice paddle", texto: "Helmet, life vest and paddle. The paddling commands are practised in calm water before you hit the rapids. You don't need to know how to swim." },
      { momento: "First rapids", texto: "The 14-kilometre descent begins. The first rapids are the ones that teach you how to read the river." },
      { momento: "\"La Tumba\"", texto: "The most technical rapid of the run. This is where the guide stops suggesting and starts giving orders." },
      { momento: "Calm stretch: swim time", texto: "The canyon opens up, the water settles and the guide lets you slide off the raft and swim between the rock walls." },
      { momento: "Lunch", texto: "It's included and you choose whether to take it before or after the descent. If you saved it for the end, this is it." },
      { momento: "Return", texto: "Back to your lodging." },
    ],
    nombre: "Rafting on the Tampaón River — Class III Rapids on Turquoise Water",
    nombreCorto: "Rafting on the Tampaón River",
    tagline: "14 km of rapids between canyon walls, on one of North America's most scenic rivers",
    tipo: "Rafting & Adrenaline",
    urgencia: "Subject to river level — departure is confirmed when you book",
    descripcion:
      "Paddle 14 kilometers of Class III rapids on the turquoise water of the Tampaón River, flanked by towering canyon walls. We pick you up at your lodging in Ciudad Valles or Xilitla (round-trip transport), with full gear, a certified guide and a meal included that you take before or after the activity. No experience or swimming skills needed — there are routes for beginners and advanced paddlers.",
    descripcionLarga:
      "The Tampaón River is considered one of the 10 most scenic rivers in North America, and the first rapid is all it takes to understand why: turquoise water — colored by the same karstic minerals that paint Tamul Waterfall —, canyon walls closing in over the river and jungle peeking over the top of the rock.\n\nThe day starts at your door: we pick you up at your lodging in Ciudad Valles or Xilitla, round-trip transport included. At the river dock we hand you the full gear — professional raft, paddle, helmet and life jacket — and your guide runs the safety and paddling briefing. You don't need experience or even to know how to swim: there are routes for different levels, Class III rapids are the sweet spot between real excitement and beginner-friendly safety, and the guide rides in the raft with you for the whole descent.\n\nIt's a 14-kilometer run alternating rapids with calm stretches where you can swim and take in the canyon. The most anticipated moment is 'La Tumba' rapid, where the walls close in so tightly that the echo disappears — absolute silence right before the river's most technical stretch. You'll come out soaked, with tired arms and wanting to get right back on. Your booking includes the meal, and you decide when: you can have it before setting out, to start with energy, or save it for after the descent.\n\nThe best season is November through March, when the water reaches its most intense color. During the rainy season (July–September) departure depends on the river level: if it's not safe to navigate, we let you know in advance and reschedule or offer an alternative activity. Your safety always comes first.",
    destinos: [
      "Round-trip transport from your lodging (Ciudad Valles or Xilitla)",
      "Tampaón River dock",
      "14 km of Class III rapids on the Tampaón River",
      "Tampaón Canyon — rock walls and turquoise water",
      "'La Tumba' rapid — the most technical of the descent",
      "Calm stretches for swimming in the river",
    ],
    // Mismo orden y mismos renglones que tours.ts. Se había quedado en 7 de 10:
    // sin entradas, botiquín ni seguro de actividad (ver cabecera del archivo).
    incluye: [
      "Round-trip transport from your lodging in Ciudad Valles or Xilitla",
      "Meal included — you choose to have it before or after the activity",
      "Admission to all attractions",
      "Professional raft, paddle, helmet and life jacket",
      "Whitewater-certified guide riding in your raft",
      "Safety and paddling briefing — routes for beginners and advanced paddlers",
      "First-aid kit",
      "Activity insurance",
      "14 km descent down the Tampaón rapids",
      "Swimming stops in the calm stretches of the canyon",
    ],
    gallery: [
      "Raft crew celebrating with a raised fist while their red raft crosses a Tampaón River rapid",
      "Red raft with its crew posing under a waterfall curtain on the Tampaón River",
      "Group raising their paddles to celebrate after clearing a Tampaón River rapid",
      "Blue raft covered by the splash of a Class III rapid on the Tampaón River",
      "Red rafts descending the turquoise rapids of the Tampaón River between the canyon walls",
      "Family paddling a yellow raft on the turquoise water of the Tampaón River",
      "Fleet of rafts navigating the turquoise water of the Tampaón Canyon under the rock walls",
      "Rafting boat entering a turquoise rapid seen from above — Tampaón River",
    ],
  },

  "rappel-tamul": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging and head out to the Río Tampaón landing." },
      { momento: "Río Tampaón landing", texto: "You reach the river and meet the mountain guides who will rappel down with you. Whatever doesn't go down the wall stays here." },
      { momento: "Gear and briefing", texto: "Harness, helmet and gloves, and the descent technique practised on dry ground before you look over the edge. No experience needed: your first rappel is fully guided." },
      { momento: "The descent", texto: "You come down the canyon wall with Tamul Waterfall in front of you, the tallest in San Luis Potosí. The drone films from the air and the action cameras from your helmet." },
      { momento: "Facing the curtain of water", texto: "The stretch where the wall turns into a carpet of vegetation and the sound of the water drowns out everything else." },
      { momento: "The canyon from below", texto: "Back on solid ground, the turquoise river and the wall you just came down look like a different place." },
      { momento: "Return", texto: "Back to your lodging." },
    ],
    nombre: "Rappelling at Tamul Waterfall — Descend Beside San Luis Potosí's Tallest Falls",
    nombreCorto: "Rappelling at Tamul Waterfall",
    tagline: "Pure adrenaline hanging off the wall, facing a 344-foot curtain of falling water",
    tipo: "Extreme Adventure",
    urgencia: "Small group for safety — book ahead",
    descripcion:
      "Rappel down the wall of the Tampaón canyon with Tamul Waterfall roaring beside you. Professional gear, certified guides and the aerial drone photography that proves you really did it. The most extreme experience in the Huasteca Potosina, and suitable too for people who have never rappelled before.",
    descripcionLarga:
      "There are few places in the world where you can hang from a rope facing a 344-foot (105 m) waterfall. Tamul Waterfall — 344 feet (105 m) of water plunging into the Tampaón River — is the backdrop of this experience, and the moment you peer over the canyon edge you understand why everyone who does it can't stop talking about it.\n\nWe pick you up in Ciudad Valles and start at the river dock, where we hand you the full gear and our high-mountain guides give you a technique briefing. No prior experience needed: the first descent is guided step by step and most of our visitors had never touched a rope before. All you need is the will to do it.\n\nOnce secured to the harness, you begin to descend the limestone wall draped in vegetation, with the waterfall beside you spraying cool mist over you and the river's turquoise water waiting below. The sound is deafening, the scenery unreal, and for those minutes nothing else in the world exists. Our photographer follows you from the air with a drone and from the ground, so every second is captured in photo and video — included in your booking at no extra cost.\n\nThe activity lasts 3 to 5 hours depending on the group and the weather. The price includes the transfer from Ciudad Valles, all the safety gear, the drone video and the action-camera photos; meals are not included. If you're after the story you'll tell for the rest of your life, it starts here.",
    destinos: [
      "Tampaón River dock (start of the descent)",
      "Rappel wall facing Tamul Waterfall",
      "Tampaón River canyon",
    ],
    incluye: [
      "Transfer from Ciudad Valles",
      "Full rappel and safety gear (harness, helmet, gloves and professional ropes)",
      "Certified high-mountain guides",
      "Briefing and descent technique — beginner-friendly",
      "Drone video of the descent",
      "Action-camera photos",
    ],
    gallery: [
      "Rappeller with a helmet camera smiling mid-wall in the canyon, with Tamul Waterfall plunging in the background — Huasteca Potosina",
      "Rappeller leaning on the vegetation-covered wall beside the curtain of Tamul Waterfall with the turquoise canyon behind",
      "Adventurer leaning back in the harness looking up during the rappel descent facing Tamul Waterfall",
      "Woman in a white helmet stretching out her arms while rappelling over the turquoise Tampaón River with the waterfall behind",
      "Wide view of the rappel descent over the imposing Tamul Waterfall — the tallest in San Luis Potosí",
      "Rappeller seen from behind descending the Tampaón canyon wall beside the curtain of Tamul",
      "Woman in a helmet smiling and giving a thumbs up while rappelling, with birds flying in front of Tamul Waterfall",
    ],
  },

  "expedicion-tamul": {
    nombre: "Tamul Expedition — Tamul, Water Cave and Sinkhole",
    nombreCorto: "Tamul Expedition",
    tagline: "Three wonders in one day: Tamul by canoe, the Water Cave cenote and the Huahuas abyss at sunset",
    tipo: "Adventure & Nature",
    urgencia: "Our most booked tour — fills up on weekends",
    descripcion:
      "Paddle by canoe through the Tampaón Canyon to Tamul Waterfall — the tallest in San Luis Potosí —, swim and dive in at the Water Cave cenote on the way back, and end the day peering into the abyss of the Sótano de las Huahuas at sunset, when thousands of birds return and plunge headlong to the bottom.",
    descripcionLarga:
      "The Tamul Expedition is the most complete tour of the Huasteca in a single day: we set out in the morning — no extreme early starts — and the day is planned to end right at the hour of the best show.\n\nThe canoe carries you through the Tampaón Canyon, a corridor of limestone rock 80 meters high where the silence is broken only by the sound of the paddle on the water. At the far end of the canyon, Tamul Waterfall — the tallest in San Luis Potosí at 344 feet (105 m) — crashes into the river with a force you feel in your chest before you even see it.\n\nOn the way back you get out of the canoe and climb up to the Water Cave: a cenote where the light enters in perfect beams and the water turns an impossible shade of turquoise. Here you do get in — you can swim and dive from the rocks — and it's the favorite moment of almost everyone who takes this tour. Up top there are stalls with snacks and cold drinks if you want a bite; lunch comes later, on the way out of Tamul, and is not included.\n\nWe close at the Sótano de las Huahuas, a 478-meter abyss, and we arrive at sunset on purpose: it's the hour when thousands of birds — parrots and swifts — come home and drop into the abyss in a spiral until they disappear. It's one of those things a photo can't explain. People who take this tour always come back, and they always bring someone with them.",
    destinos: [
      "Tamul Waterfall (canoe ride)",
      "Water Cave cenote (on the way back — swimming and diving)",
      "Sótano de las Huahuas at sunset (the birds' return)",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla or Ciudad Valles, in a comfortable air-conditioned vehicle",
      "Buffet breakfast on the way to the sites, at El Taco Loco: typical regional dishes and stews",
      "Admission to all attractions",
      "NOM-09 SECTUR certified guide",
      "Safety gear (life vests, helmets and whatever each activity requires)",
      "Photos and video of the tour",
      "First-aid kit",
      "Travel insurance for everyone in the group",
      "Canoe ride through the Tampaón Canyon",
    ],
    gallery: [
      "Sótano de las Huahuas — the mouth of the abyss seen from below, through moss and light",
      "Huasteca jungle — stone steps toward the edge of the sinkhole",
      "Sótano de las Huahuas — a swift, one of the birds that return to the abyss every evening",
      "Water Cave — the blue pool under the rock vault, with people swimming",
      "Sótano de las Huahuas — a traveler peering over the edge of the abyss, roped in",
      "La Morena, Tamul — the colorful letters at the boat landing, by the Tampaón River",
      "Water Cave — swimming in turquoise water under the rock",
      "Water Cave — the hanging bridge over the river, at the cave exit",
      "Tamul boat landing — colorful canoes ready to head up the Tampaón River",
      "Tampaón Canyon — a group paddling a canoe between rock walls",
      "Sótano de las Huahuas — a green parakeet, one of the birds that return at sunset",
      "Sótano de las Huahuas — thousands of birds return to the abyss at sunset",
      "Tamul Waterfall — standing on a river rock with the waterfall behind",
      "Tamul Waterfall — the 105-meter drop with a rainbow over the turquoise water",
      "Tamul Waterfall — a tour group selfie in front of the waterfall",
      "Tampaón Canyon — a water fight between canoes",
      "Tampaón River — a selfie with the tour group on the riverbank",
    ],
    itinerario: [
      { momento: "Pickup",
        texto: "We pick you up at your hotel, cabin or Airbnb in Xilitla or Ciudad Valles. You don't need to stay with us." },
      { momento: "Breakfast",
        texto: "Huastec buffet breakfast at El Taco Loco, on the way to the river. Included." },
      { momento: "Canoe to Tamul",
        texto: "You enter the Tampaón Canyon by canoe: silence, the paddle on the water and, at the far end, a 344-foot (105 m) waterfall you feel in your chest before you see it." },
      { momento: "Photos in front of the waterfall",
        texto: "You climb down to the rocks of the canyon, right in front of the falls, and that's where the photo everyone shows off back home gets taken. No rush: it's the moment of the day that fills the most cameras." },
      { momento: "The Water Cave",
        texto: "On the way back you get out of the canoe and climb up to the Water Cave cenote: shafts of light, turquoise water, and here you do get in — you can swim and jump from the rocks. Up top there are stalls with snacks and cold drinks if you want a bite. Almost everyone's favourite moment." },
      { momento: "Lunch and the drive",
        texto: "Lunch for the day, on the way out of Tamul. Not included, so you pick where and how much to spend. Then the drive to the Sótano de las Huahuas." },
      { momento: "Sótano de las Huahuas",
        texto: "About a 20-minute walk to the edge of a 478-metre (1,568 ft) abyss. There you wait for sunset." },
      { momento: "The show",
        texto: "Thousands of birds — parrots and swifts — come back and drop into the abyss in a spiral until they disappear. It's how the day ends, and what everyone ends up filming." },
      { momento: "Back to your lodging",
        texto: "We drop you off where you're staying, tired and happy." },
    ],
  },

  "eden-en-el-jardin": {
    itinerario: [
      { momento: "Pickup in Xilitla", texto: "We pick you up at your lodging. The exact time is set by the garden and we confirm it when you hold the date." },
      { momento: "The empty garden", texto: "You walk in an hour before it opens to the public. It's the only part of the day when Las Pozas has nobody else inside it." },
      { momento: "Bamboo Palace", texto: "You climb to the upper levels, which are closed on the general visit. From up there you finally grasp the scale of what Edward James built." },
      { momento: "Studio House", texto: "The room where a poem in his own handwriting is still kept. The general public does not go in." },
      { momento: "Hiking trail", texto: "You close on the garden's own trail, with the light already high among the ferns." },
      { momento: "Return", texto: "We drop you back at your lodging in Xilitla." },
    ],
    nombre: "Eden in the Garden — A Private Experience at Las Pozas",
    nombreCorto: "Eden in the Garden",
    tagline: "Edward James's garden all to yourselves, before it opens to the public",
    tipo: "Private Experience",
    urgencia: "One experience a day — book it ahead",
    descripcion:
      "Las Pozas with nobody else in it: you walk in an hour before it opens, with your own guide and access to areas closed to the public. Three hours in Edward James's garden at your own pace, including the upper levels of the Bamboo Palace and the Studio House, where a poem in his own handwriting still hangs on the wall. Groups of up to 7, one flat rate for everyone.",
    descripcionLarga:
      "There is an hour at Las Pozas that almost nobody has seen. Between seven and eight in the morning the garden is still closed to the public: the mist hasn't finished rising off the river, birds are the only sound, and the staircases that lead nowhere stand perfectly still, with not a single line of people waiting for a photo. Eden in the Garden is that hour, and the two that follow.\n\nThis is not the usual tour, earlier. It is a private experience inside the Edward James Sculpture Garden — an Artistic Monument declared National Heritage by Mexico's INBAL — for your group and nobody else, with a guide from the garden itself who walks at your pace. Areas that aren't part of the general visit are opened for you, and you climb to the upper levels of the Bamboo Palace, where the garden stops being something you look up at and suddenly makes sense: an entire jungle with surrealist architecture growing inside it.\n\nThe moment people remember is a different one. In the Studio House, the cabin where Edward James stayed to rest, a poem written in his own hand is still on the wall. Nobody has taken it down or put it behind glass. It's the kind of detail that appears in no guidebook, because almost nobody gets that far.\n\nThe three hours include the hiking trail, admission to the garden and round-trip transport from your lodging in Xilitla. Only one experience runs per day and the maximum is seven people. The rate covers the whole group, not each head: the more of you there are, the less each one pays.",
    destinos: [
      "Edward James Sculpture Garden (Las Pozas)",
      "Bamboo Palace — upper levels",
      "Edward James's Studio House",
      "The garden's hiking trail",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla",
      "Admission to the Edward James Sculpture Garden",
      "Entry one hour before the general opening, with the garden empty",
      "Your own garden guide, in English or Spanish (French and Italian on request)",
      "Access to areas closed to the general public, such as the Studio House",
      "Access to the upper levels of the Bamboo Palace",
      "Admission to the hiking trail",
    ],
    gallery: [
      "Las Pozas in Xilitla, empty in the warm morning light, before it opens to the public",
      "A visitor crossing the circular portal at Las Pozas alone, on the cobbled path",
      "Under the Bamboo Palace: concrete columns and a figure framed in the archway",
      "Edward James's Studio House, covered in vegetation, where his poem is still kept",
      "Surrealist stairs and arches at Las Pozas, with a visitor climbing through the ferns",
      "Two visitors sitting high on one of the garden's structures, with nobody else around",
      "A visitor in a hat in front of the colonnades of the Bamboo Palace at Las Pozas",
      "Colorful sculptures at Las Pozas surrounded by the jungle in Xilitla",
      "Towers and spiral staircases at Las Pozas against a blue sky",
      "Wide view of the Edward James Sculpture Garden in the jungle of Xilitla",
    ],
  },
  "ruta-surrealista-edward-james": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla or Ciudad Valles, in an air-conditioned vehicle." },
      { momento: "Breakfast", texto: "A buffet of regional Huasteca dishes and stews at El Taco Loco, on the way to the sites. It's included." },
      { momento: "Las Pozas", texto: "Edward James's surrealist garden: staircases that lead nowhere, concrete columns rising out of the jungle and about two hours to walk it with your guide." },
      { momento: "Huichihuayán Spring", texto: "Turquoise water coming straight out of the rock, with shafts of light falling through the jungle. This one you get into." },
      { momento: "Cueva de las Quilas", texto: "You enter the cave through a narrow canyon where the light drops in from above. You feel the temperature change the moment you cross the mouth." },
      { momento: "Castillo de la Salud", texto: "Colourful towers rising out of the Huasteca jungle, the last stop of the day and the most photogenic in late light." },
      { momento: "Return", texto: "We drop you back at your lodging." },
    ],
    nombre: "Surrealist Route — Edward James, Springs, Caves and Castle",
    nombreCorto: "Surrealist Route",
    tagline: "Art, water and mystery in a journey of unique contrasts",
    tipo: "Culture & Nature",
    urgencia: "Four stops with entrance fees included — book ahead",
    descripcion:
      "The world's most enigmatic sculpture garden, the crystal-clear waters of the Huichihuayán Spring, the living shadows of the Quilas Cave and Don Beto Ramón's Castillo de la Salud, the Huasteca's other surrealism. Culture and nature fused into one extraordinary day.",
    descripcionLarga:
      "Imagine walking through a garden designed by an eccentric English poet in the middle of the Mexican tropical jungle. Edward James's concrete sculptures — endless colonnades, staircases that climb to the sky and lead nowhere, four-meter stone flowers — emerge from the vegetation like a dream someone forgot to erase. Las Pozas of Xilitla has no equal anywhere on the planet.\n\nThe Huichihuayán Spring then welcomes you with waters that rise straight from the earth at the perfect temperature — neither cold nor warm, exactly 22°C — framed by palms and ferns in a silence that contrasts completely with the visual chaos of Las Pozas.\n\nThe Quilas Cave adds an underground experience few people know: stalactites, bats and an echo that amplifies every sound into something mystical.\n\nAnd we close at the Castillo de la Salud, in Axtla: a compound the Nahua herbalist Don Beto Ramón built in 1974, with architecture that mixes Nahua symbolism and biblical passages, and a garden of hundreds of medicinal plants. It's the Huasteca's other surrealism — the one that didn't come from Europe but from right here — and seeing it on the same day as Las Pozas is what gives the whole route its meaning. This tour isn't just sightseeing. It's a different way of seeing the world.",
    destinos: [
      "Edward James Surrealist Garden (Las Pozas)",
      "Huichihuayán Spring",
      "Quilas Cave",
      "Castillo de la Salud",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla or Ciudad Valles, in a comfortable air-conditioned vehicle",
      "Buffet breakfast on the way to the sites, at El Taco Loco: typical regional dishes and stews",
      "Admission to all attractions",
      "NOM-09 SECTUR certified guide, specialized in history and culture",
      "Safety gear (life vests, helmets and whatever each activity requires)",
      "First-aid kit",
      "Travel insurance for everyone in the group",
    ],
    gallery: [
      "Las Pozas — the stairway to heaven, with the mountains behind",
      "Las Pozas — the waterfall behind Edward James's structures",
      "Las Pozas — a cobblestone path toward the arch, among sculptures",
      "Huichihuayán Spring — the turquoise pool seen through the trees",
      "Las Pozas — blue column sculptures in the jungle",
      "Las Pozas — a two-tower gateway over the path",
      "Castillo de la Salud — the colorful towers",
      "Las Pozas — the giant concrete hands",
      "Las Pozas — a pool and structures at the foot of the waterfall",
      "Quilas Cave — sunlight streaming between the rock walls",
      "Las Pozas — the cobblestone path lined with sculptures",
      "Las Pozas — a traveler facing one of Edward James's towers",
      "Huichihuayán Spring — swimming in the crystal-clear water",
      "Las Pozas — the concrete columns under the jungle canopy",
      "Las Pozas — a sculpture of concrete arches among the vegetation",
      "Castillo de la Salud — a couple among the colorful walls",
      "Las Pozas — one of the waterfalls, beside the columns",
      "Las Pozas — an Edward James structure among the ferns",
      "Huichihuayán Spring — the pool seen from the air",
      "Las Pozas — a moss-covered stairway",
      "Castillo de la Salud — a traveler at the foot of the colorful tower",
      "Quilas Cave — a dark canyon with light pouring in from above",
      "Huichihuayán Spring — the turquoise pool full of swimmers",
      "Castillo de la Salud — aerial view with the mountains behind",
      "Huichihuayán Spring — the stairway down to the pool",
    ],
  },

  "cascadas-del-meco": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla or Ciudad Valles, in an air-conditioned vehicle." },
      { momento: "Breakfast", texto: "A buffet of regional Huasteca dishes and stews at El Taco Loco, on the way to the sites. It's included." },
      { momento: "Cascada del Meco", texto: "You arrive when the sun hits the pools at the right angle and the water turns turquoise. The canoe ride in front of the waterfall is included, and you swim with a life vest. There are food and drink stands, plus optional activities at extra cost: paddleboard rental, tubing and kayak." },
      { momento: "Panoramic lookout", texto: "A short, flat walk up to the lookout: from there you see the whole run of stepped waterfalls. Easy enough for older travellers." },
      { momento: "Lunch", texto: "The midday meal. It isn't included, so you choose where and how much to spend." },
      { momento: "Cascada El Salto", texto: "The finale: a double drop over stepped pools. At this hour a rainbow usually appears in the mist of the fall." },
      { momento: "Return", texto: "We drop you back at your lodging." },
    ],
    nombre: "El Meco Waterfalls — El Meco, Panoramic Lookout and The Great Falls",
    nombreCorto: "El Meco Waterfalls",
    tagline: "Three waterfalls, three different thrills",
    tipo: "Waterfalls & Photography",
    urgencia: "A photographers' favorite — three stops in a single day",
    descripcion:
      "Explore the turquoise pools of El Meco Waterfall, climb to the panoramic lookout for a breathtaking perspective, and close the day before the imposing El Salto Waterfall. The most photogenic and accessible tour in the whole region.",
    descripcionLarga:
      "There's a specific moment, around 10 AM, when the sunlight hits the pools of El Meco Waterfall at the perfect angle and the water turns literally neon turquoise. Professional photographers know about that moment. So do we — and we arrive at exactly that hour.\n\nEl Meco is perhaps the most photogenic tour in the entire region. Three different waterfalls — three textures, three heights, three kinds of pool — and a panoramic lookout from which the jungle stretches as far as the eye can see. No plastic slides, no booming speakers. Just authentic nature, perfect water and a guide who knows exactly where to position you for the best photo of your life.\n\nEl Salto Waterfall closes the day with 40 meters of free fall you hear before you see. If you're looking for the perfect tour for someone who has never seen a real waterfall — or for someone who has seen them all and wants something different — this is the one.",
    destinos: [
      "El Meco Waterfall",
      "El Meco Panoramic Lookout",
      "El Salto Waterfall",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla or Ciudad Valles, in a comfortable air-conditioned vehicle",
      "Buffet breakfast on the way to the sites, at El Taco Loco: typical regional dishes and stews",
      "Admission to all attractions",
      "NOM-09 SECTUR certified guide",
      "Safety gear (life vests, helmets and whatever each activity requires)",
      "First-aid kit",
      "Travel insurance for everyone in the group",
      "Canoe ride in front of El Meco Waterfall",
    ],
    gallery: [
      "El Meco Waterfall — aerial view of the turquoise river through the jungle",
      "El Salto Waterfall — the falls at sunset, with wooden walkways by the pools",
      "El Meco Waterfall — the stepped falls seen from above",
      "El Salto Waterfall — standing on the turquoise pools in front of the falls",
      "El Salto Waterfall — the drop over turquoise pools",
      "El Meco Waterfall — a canoe approaching the falls into the sun",
      "El Salto Waterfall — the falls and their stepped pools",
      "Huasteca Potosina — turquoise river under century-old cypress trees",
      "El Meco Waterfall — colorful canoes in front of the falls",
      "El Meco lookout — sitting in front of the stepped waterfalls",
      "El Meco Waterfall — paddleboarding on turquoise water",
      "El Meco Waterfall — a group selfie with helmets in the pools",
      "River tubing — optional activity at extra cost, with a guide and safety rope",
      "El Meco Waterfall — a canoe with travelers arriving on the turquoise river",
      "El Meco lookout — the stepped waterfalls seen from the edge",
      "El Meco Waterfall — resting on the rocks of the pools",
      "El Meco Waterfall — a traveler in front of the stepped falls",
      "River tubing — optional activity at extra cost",
      "El Meco Waterfall — by canoe toward the falls",
    ],
  },

  "paraiso-escalonado-minas-micos": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla or Ciudad Valles, in an air-conditioned vehicle." },
      { momento: "Breakfast", texto: "A buffet of regional Huasteca dishes and stews at El Taco Loco, on the way to the sites. It's included." },
      { momento: "Minas Viejas Waterfalls", texto: "A triple drop over jade-coloured pools, with a wooden bridge to cross them. There are life vests for everyone and the water sits between 18 and 22 °C: refreshing, not freezing." },
      { momento: "Lunch", texto: "The midday meal. It isn't included, so you choose where and how much to spend." },
      { momento: "Micos Waterfalls", texto: "The stepped pools of Micos, one after another. This is the stretch of the day where most people end up in the water." },
      { momento: "Return", texto: "We drop you back at your lodging." },
    ],
    addOns: [
      {
        nombre: "The 7 Waterfalls Jump",
        descripcion: "Guided cliff jumping at the Micos Waterfalls, with insurance and a guide certified in extreme sports and rescue.",
      },
    ],
    nombre: "Stepped Paradise — Minas Viejas & Micos Waterfalls",
    nombreCorto: "Stepped Paradise",
    tagline: "Two natural gems, one perfect day to unwind",
    tipo: "Waterfalls & Wellness",
    urgencia: "Great for families — book in advance",
    descripcion:
      "Minas Viejas unfolds its jade-colored travertine terraces that look hand-painted; the Micos Waterfalls chain turquoise pools through the tropical jungle. The ideal tour for those seeking authentic beauty, crystal-clear waters and moments of peace far from the noise.",
    descripcionLarga:
      "The color of the water at Minas Viejas doesn't exist in any graphic-design color palette. It's a green-turquoise-jade that geologists explain through minerals dissolved in the water over centuries, but that photographers simply call impossible. The natural travertine terraces form drop by drop over thousands of years, creating perfect steps where the water flows in a gentle cascade and you can swim at every level.\n\nFloat in crystal-clear water with the jungle closing in above you — no noise, no crowds, no gimmicks. Just nature working exactly as it always has.\n\nThe Micos Waterfalls round out the day with seven falls in sequence, each one different. It's the favorite tour of families with kids — low difficulty, life vests for everyone, a patient guide — and of anyone seeking a day of total disconnection that doesn't require being in shape. Two unique destinations, one single day, memories for a lifetime.",
    destinos: [
      "Minas Viejas Waterfalls",
      "Micos Waterfalls",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla or Ciudad Valles, in a comfortable air-conditioned vehicle",
      "Buffet breakfast on the way to the sites, at El Taco Loco: typical regional dishes and stews",
      "Admission to all attractions",
      "NOM-09 SECTUR certified guide",
      "Safety gear (life vests, helmets and whatever each activity requires)",
      "First-aid kit",
      "Travel insurance for everyone in the group",
    ],
    gallery: [
      "Aerial view of Minas Viejas Waterfalls — a triple drop over turquoise pools in the Huasteca Potosina",
      "Cinematic Minas Viejas Waterfalls with a wooden bridge and jade-colored pools",
      "Girl posing in front of the main Minas Viejas waterfall — turquoise water",
      "Tourist smiling in a life vest at Minas Viejas — Huasteca Potosina",
      "Romantic couple kissing in front of the Minas Viejas waterfall — couples tour",
      "Diving off the Micos waterfalls — extreme adventure in the Huasteca Potosina",
      "Family jumping together off the Micos waterfalls — fun for everyone",
      "Two friends posing with helmets and life vests at Minas Viejas — adventure tourism",
      "Skybike at the Micos Waterfalls — aerial cycling over turquoise pools",
      "Aerial view of the Micos Waterfalls — stepped turquoise pools from a drone",
      "Couple embracing and pointing at the Minas Viejas waterfall — a romantic moment in the Huasteca",
      "Tourist watching the waterfall from the rocks of the Puente de Dios canyon",
    ],
  },

  "ruta-acuatica-puente-de-dios": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla or Ciudad Valles, in an air-conditioned vehicle." },
      { momento: "Breakfast", texto: "A buffet of regional Huasteca dishes and stews at El Taco Loco, on the way to the sites. It's included." },
      { momento: "Puente de Dios", texto: "You go down into the canyon by steps. Inside, the life vest is mandatory and the water sits between 18 and 22 °C. Factor in the climb back if stairs are hard for you." },
      { momento: "Lunch", texto: "The midday meal. It isn't included, so you choose where and how much to spend." },
      { momento: "Whatever you picked when you booked", texto: "Either Hacienda Los Gómez with the Siete Cascadas, which are on the same grounds, or the Tamasopo Waterfalls with their natural travertine slide. You visit one of the two, the one you chose." },
      { momento: "Return", texto: "We drop you back at your lodging." },
    ],
    eleccion: {
      titulo: "There isn't time for both in one day. Which do you prefer?",
      opciones: [
        { nombre: "Los Gómez Hacienda + Seven Waterfalls", nota: "They're in the same spot, so you see both. What most people choose." },
        { nombre: "Tamasopo Waterfalls", nota: "Wider, more open pools for a relaxed swim." },
      ],
    },
    nombre: "Water Route — Puente de Dios & Tamasopo Waterfalls",
    nombreCorto: "Water Route",
    tagline: "The most refreshing and complete journey in the region",
    tipo: "Water Adventure",
    urgencia: "Our most complete tour — book ahead",
    descripcion:
      "Pass through the natural cave of Puente de Dios with the river flowing at your feet. Then you choose: Los Gómez Hacienda with the Seven Waterfalls — they're in the same spot, so you see both — or the crystal-clear pools of the Tamasopo Waterfalls. One day is enough for one of the two, not for both.",
    descripcionLarga:
      "Puente de Dios (\"God's Bridge\") is a natural rock arch 15 meters high through which the river flows, and there's a moment each day — between 11 AM and 1 PM — when the sunlight enters perpendicular and turns the water into liquid crystal. We arrive at that hour. Always.\n\nEntering Puente de Dios is a full sensory experience: the sound of the water amplified by the cave, the chill of the interior, the light pouring through the arch like a natural beacon, the texture of the stone underfoot. It's not just a photo. It's a moment that etches itself into memory.\n\nYou choose the second half of the day, and we tell you plainly because there isn't time for both: either Los Gómez Hacienda with the Seven Waterfalls — they're on the same grounds, so you see both there — or the Tamasopo Waterfalls. If it's your first time in the Huasteca, most people go for the Seven Waterfalls; Tamasopo is the choice for those looking for more open pools to swim in at a relaxed pace.\n\nWhichever it is, you decide when you book and we plan the day around that choice, with the assurance that every step is led by someone who knows these rivers by heart.",
    destinos: [
      "Puente de Dios",
      "Your choice: Los Gómez Hacienda + Seven Waterfalls (same spot)",
      "Your choice: Tamasopo Waterfalls",
    ],
    incluye: [
      "Round-trip transport from your lodging in Xilitla or Ciudad Valles, in a comfortable air-conditioned vehicle",
      "Buffet breakfast on the way to the sites, at El Taco Loco: typical regional dishes and stews",
      "Admission to all attractions",
      "NOM-09 SECTUR certified guide",
      "Safety gear (life vests, helmets and whatever each activity requires)",
      "First-aid kit",
      "Travel insurance for everyone in the group",
    ],
    gallery: [
      "Girl with open arms in front of the Puente de Dios waterfall — Water Route, Huasteca Potosina",
      "Tourist sitting in a yellow life vest on the rocks of the Tampaón River with a waterfall behind",
      "Girl with open arms in front of a turquoise waterfall — Los Gómez Hacienda",
      "Woman seen from behind facing a large white waterfall — Water Route, Huasteca",
      "Group of tourists on a ropes activity over the river — Seven Waterfalls, Tamasopo",
      "Tourist standing and watching the Puente de Dios waterfall from the canyon rocks",
      "International family swimming in the Water Cave — Water Route Expedition",
      "Woman smiling in a life vest at Los Gómez Hacienda with a waterfall behind",
      "Group of friends inside a cave with turquoise water — Water Route, Huasteca",
      "Tourist posing at the Tamasopo sign with a waterfall behind",
      "Two women smiling in the water in front of the Seven Waterfalls of Tamasopo",
      "Group of four people hugging in front of the Tamasopo Waterfalls",
      "Family of five swimming in the turquoise pools of Tamasopo",
      "International couple waving at the Puente de Dios lookout",
      "Woman jumping from a rope into the turquoise water of Puente de Dios",
      "Tourist on the natural travertine waterslide of Tamasopo",
      "Two girls in the circular pool of Tamasopo — stepped pools with jungle",
      "Man leaping into the blue pool of Puente de Dios — extreme adventure",
    ],
  },
  "buceo-media-luna": {
    itinerario: [
      { momento: "Meeting point", texto: "We meet at the entrance to the Media Luna Lagoon, in Rioverde. You make your own way there and the park admission is paid on site, in cash." },
      { momento: "Orientation", texto: "Your PADI-certified instructor walks you through the SCUBA gear piece by piece and how to breathe underwater. Nobody is in a hurry here." },
      { momento: "Shallow-water practice", texto: "The basic skills where you can still stand: clearing your mask, recovering the regulator, controlling your buoyancy." },
      { momento: "The dive", texto: "You go down 5 to 10 metres with your instructor beside you, among the submerged cypress trees and the clear water of the lagoon. Photos are included." },
      { momento: "Wrap-up", texto: "You hand back the gear and keep the digital photos of your first dive." },
    ],
    nombre: "Discover Scuba Diving at the Media Luna Lagoon — Your First Dive with a PADI Instructor",
    nombreCorto: "Scuba Diving at Media Luna",
    tagline: "Breathe underwater for the first time in the fresh, crystal-clear water of Media Luna — no experience needed",
    tipo: "Scuba Diving & Nature",
    urgencia: "Your first dive with a PADI instructor — book ahead",
    descripcion:
      "Take your first SCUBA dive at the Media Luna Lagoon in Rioverde, with its fresh, crystal-clear water. Breathing underwater has never been this easy: no previous experience needed, just the desire to try. A PADI-certified instructor guides you every step of the way — first you practice in shallow water and, when you're ready, you descend between 5 and 10 meters. It's 4 hours of training and includes the diving gear and digital photos of your dive. {precio} per person.",
    descripcionLarga:
      "Breathing underwater has never been this easy or accessible: the most important requirement is your desire to do it — we take care of the rest. This is a 'Discover Scuba Diving' program designed so you can live your dream of trying scuba even if you've never worn a tank before.\n\nWe do it at the Media Luna Lagoon in Rioverde, San Luis Potosí, with its fresh, crystal-clear water — an ideal place to make your first dive calmly and safely.\n\nAll it takes is 4 hours of training. During that time you learn the basics of diving with SCUBA gear, including the equipment and diving techniques. First you get a short briefing from a PADI-certified instructor; then you practice your skills in shallow water, building confidence and comfort, and when you're ready you descend between 5 and 10 meters below the surface, always accompanied.\n\nYour day includes the PADI instructor, the diving gear and digital photos to remember it by. You only need to bring a swimsuit, a towel and cash for the park entrance. It's an activity for ages 10 and up in good health; it's not suitable for people with respiratory, cardiovascular or ear conditions, nor for pregnant women, and you can't dive under the influence of alcohol or drugs.\n\nFun and adventure underwater! If you've always wondered what it feels like to breathe underwater, this is your moment.",
    destinos: [
      "Media Luna Lagoon (Rioverde, San Luis Potosí)",
      "Briefing with a PADI-certified instructor",
      "Skills practice in shallow water",
      "5-to-10-meter dive below the surface",
    ],
    incluye: [
      "PADI-certified instructor",
      "Full scuba diving gear (SCUBA)",
      "4 hours of training and practice",
      "Digital photos of your dive",
      "Guided dive 5 to 10 meters deep",
    ],
    gallery: [
      "Group of scuba divers with SCUBA gear next to a submerged statue in the crystal-clear water of the Media Luna Lagoon, one giving the OK sign",
      "Three divers posing next to a submerged figure among the aquatic plants of the Media Luna Lagoon in Rioverde",
      "Two divers giving a thumbs up as they float over the crystal-clear bottom of the Media Luna Lagoon",
      "Divers at the surface of the Media Luna Lagoon surrounded by cypress trees and open sky after their dive",
    ],
  },

  "travesia-del-cafe": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla. The ride up to the farm is by RZR, so you leave town already in the vehicle." },
      { momento: "Up to the farm", texto: "Dirt roads through the humid jungle to the shade-grown coffee grove. The ride is part of the experience." },
      { momento: "The coffee grove", texto: "You walk among the plants with the coffee-growing family and learn to tell a ripe cherry from one that isn't." },
      { momento: "The drying patio", texto: "Where the beans are spread in the sun and turned for days. This is where you see why coffee takes so long to reach the cup." },
      { momento: "The roastery", texto: "The drum turning and the smell filling everything. This is the moment the farm smells like what you're about to drink." },
      { momento: "The tasting", texto: "In front of plates of green, roasted and ground coffee, you learn to smell and taste the way cuppers do. Plenty of people leave with a bag under their arm." },
      { momento: "Return", texto: "Back to your lodging in Xilitla." },
    ],
    nombre: "Coffee Trail — Xilitla Coffee Farm by RZR",
    nombreCorto: "Coffee Trail",
    tagline: "The taste of Xilitla, from the branch to the cup",
    tipo: "Culture & Flavor",
    urgencia: "Small groups at the farm — book ahead",
    descripcion:
      "Hop on an RZR and ride up to the coffee groves of Xilitla. Walk among the plants with the people who pick them, watch the beans get pulped, dried and roasted, and finish with a tasting of freshly roasted coffee. A relaxed experience of flavor and tradition, good for the whole family. {precio} per person.",
    descripcionLarga:
      "Xilitla smells of coffee long before you reach the farm. The mountains around town are planted with shade-grown coffee, and this trail takes you right there: to the place where your morning cup begins.\n\nThe ride is part of the experience. We pick you up at your lodging in Xilitla and head up to the farm by RZR, along the dirt roads that cut through the rainforest — the same vehicles as our off-road tours, only here the destination is a coffee grove.\n\nAt the farm, the coffee-growing family welcomes you. You walk among the plants, learn to tell a ripe cherry from one that isn't, and follow the whole process: the hand picking, the pulping, the drying patio where the beans are spread in the sun and turned for days, and finally the roasting drum, when the smell fills everything.\n\nIt ends with the tasting. In front of plates of green, roasted and ground coffee, you learn to smell and taste the way cuppers do, and they pour you the coffee from that same farm. Plenty of people leave with a bag under their arm.\n\nIt's an easy outing with no physical demands, ideal for couples, friends or family. It runs two and a half to three hours and departs with a minimum of 2 people.",
    destinos: [
      "Shade-grown coffee grove in the Xilitla highlands",
      "Bean drying patio",
      "Artisanal roastery",
      "Cupping bar",
    ],
    incluye: [
      "Round-trip transfer from your lodging in Xilitla — the ride to the farm is by RZR",
      "Farm entrance and access",
      "Guided walk through the grove and the full coffee process",
      "Freshly roasted coffee tasting",
    ],
    gallery: [
      "Coffee grower hand-picking ripe red cherries from a coffee plant in the mountains of Xilitla",
      "Group of visitors tasting freshly poured coffee next to the roaster at the Xilitla coffee farm",
      "Host in a yellow poncho showing a scoop of freshly roasted beans over the cooling drum",
      "Four visitors in ponchos and straw hats posing under a huge tree in the middle of the coffee grove",
      "The coffee grower crouching by the drying patio, explaining how the beans are dried to the group",
      "Visitors listening to the coffee family's story inside the roastery, with old photographs hanging from the ceiling",
      "Toasting with cups of coffee during the tasting, with plates of green, roasted and ground beans on the bar",
      "Two visitors sorting coffee beans by hand on the farm's drying patio",
    ],
  },

  "gruta-de-xilo": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla, in the RZR itself, and hand you your helmet and headlamp right there. It's already getting dark." },
      { momento: "Walk through the jungle", texto: "Fifteen to twenty minutes on foot, headlamp already on, to the mouth of the cave." },
      { momento: "Into the cave", texto: "The guide explains where to step, and in you go. From here on, all that exists is the circle of light from your headlamp." },
      { momento: "The formations", texto: "Some 900 metres among stalactites, stalagmites and columns where the two finally met after millions of years of drip by drip." },
      { momento: "The jacuzzis and the silence", texto: "The route ends at pools of crystal-clear water formed inside the cave. Lamps go off for a few minutes so you can listen to it. That's the part people remember." },
      { momento: "Return", texto: "Back to your lodging in Xilitla." },
    ],
    nombre: "Xilo Cave — A Night Walk Through Xilitla's Cavern",
    nombreCorto: "Xilo Cave",
    tagline: "Nine hundred metres under the mountain, at night",
    tipo: "Cave & Night",
    urgencia: "Night departure — book ahead",
    descripcion:
      "A 15 to 20 minute walk through the jungle drops you at the mouth of the cave, already after dark. Inside you cover some 900 metres among stalactites and stalagmites that took millions of years to form, and the walk ends at natural jacuzzis of crystal-clear water inside the cave. You go with a helmet, a headlamp and a certified guide. {precio} per person.",
    descripcionLarga:
      "Almost every tour in the Huasteca happens in daylight. This one doesn't. Xilo Cave — Gruta de Xilo in Spanish, sometimes written Grutas de Xilo — is walked at night, and that is half the experience: without the noise or the heat of the day, all that exists is the circle of light from your headlamp and whatever it reaches.\n\nYour helmet and headlamp are handed to you at the start, when we pick you up. Then comes a 15 to 20 minute walk through the jungle to the mouth of the cave, where the guide explains where to step, and you go in.\n\nInside it's about 900 metres of walking. The walls are a catalogue of formations: stalactites hanging from the vault, stalagmites rising from the floor, columns where the two finally met after millions of years of drip by drip. There are wide stretches where you walk upright and stretches where you have to crouch; you move slowly, in a small group.\n\nAt the end of the route are the jacuzzis: pools of crystal-clear water formed inside the cave itself. That's where the introspection exercise happens — lamps off, a few minutes of silence, listening to the cave. It's the part people remember.\n\nIt runs about 3 hours in total, at night. We pick you up at your lodging in Xilitla in an RZR; if you're staying in Ciudad Valles we can also come and get you at an additional cost we'll quote on WhatsApp. Bring closed shoes that can get wet and a change of clothes.",
    destinos: [
      "Xilitla jungle (approach walk)",
      "Xilo Cave",
      "The cave's natural jacuzzis",
    ],
    incluye: [
      "Round-trip RZR transfer from your lodging in Xilitla",
      "Tickets and cave access",
      "Helmet and headlamp for each person",
      "NOM-09 SECTUR certified guide",
      "First-aid kit",
    ],
    gallery: [
      "Xilo Cave — a group in helmets on a flowstone, next to a trickle of falling water",
      "Xilo Cave — rock formations hanging overhead, lit by a headlamp",
      "Xilo Cave — a helmet lamp lights up the rocks and the water running between them",
      "Xilo Cave — crouching between two columns, ankle-deep in water",
      "Xilo Cave — arms up in front of a flowstone with water running down it",
      "Xilo Cave — sitting next to a waterfall inside the cave",
      "Group moving with headlamps through a flooded passage of Xilo Cave, with the reflections on the water",
      "Visitor sitting on a rock formation looking up at the cave vault, lit only by his headlamp",
      "Visitor with arms wide open in front of the columns of Xilo Cave, several times taller than he is",
      "Couple in helmets crouching between two stone columns formed drip by drip inside the cave",
      "Guide and visitor standing on a flowstone in the water, at the far end of Xilo Cave",
      "Couple on a rock in one of the natural crystal-clear jacuzzis at the end of the route",
    ],
  },

  "amanecer-de-nubes": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla, in full darkness. Bring a jacket: the weather up there is a different one." },
      { momento: "Up to La Trinidad", texto: "A mountain road to the cloud forest, at nearly 2,000 metres. You climb in the dark with the windows fogging up." },
      { momento: "The hike begins", texto: "A trail through pines and oaks, headlamp on, climbing steadily. You don't need mountaineering experience, but you do need to be fit enough." },
      { momento: "The summit", texto: "You reach Cerro del Pilón while it's still dark. The last stretch is rock, and there's time to settle in before the sun comes up." },
      { momento: "Sunrise", texto: "First it goes blue, then orange, and when the sun breaks the horizon the sea of clouds lights up from below. It lasts a few minutes and everything stops." },
      { momento: "The way down, in daylight", texto: "This is when you finally see the forest you climbed through blind: the madroños, the ferns, the mist hanging between the trees." },
      { momento: "Return", texto: "We drop you back at your lodging. You still have the whole day ahead of you." },
    ],
    nombre: "Sea of Clouds Sunrise — Hiking Cerro del Pilón",
    nombreCorto: "Sea of Clouds Sunrise",
    tagline: "Reaching the summit before the sun does",
    tipo: "Hiking & Sunrise",
    urgencia: "Pre-dawn departure — book a day ahead",
    descripcion:
      "While the rest of the Huasteca sleeps, you're already climbing. A pre-dawn hike through the Trinidad cloud forest up to the summit of Cerro del Pilón, timed to arrive just as the sun comes up, often over a sea of clouds covering the mountains. Seven to eight hours, with a certified guide and transfer from your lodging. {precio} per person.",
    descripcionLarga:
      "There is a moment, up on Cerro del Pilón, when the sky turns orange and you can't see the ground at all: just a layer of cloud covering the valleys from one end of the horizon to the other. It lasts a few minutes. To see it you have to already be up there before dawn, which is why this hike starts in the dark.\n\nWe leave at night from your lodging in Xilitla and drive up to the Trinidad cloud forest, the forest that crowns the range at nearly 2,000 metres. The walk begins there: a trail through pines and oaks, headlamp on, climbing steadily in the dark. You don't need mountaineering experience, but you do need to be able to walk uphill for several hours.\n\nThe arrival at the summit is timed to the sunrise. First it goes blue, then orange, and when the sun breaks the horizon the sea of clouds lights up from below. Everything stops there: photos, something to eat, and time to let it happen.\n\nThe way down is in daylight, which is when you finally see the forest you climbed through blind: the madroños, the ferns, the mist hanging between the trees.\n\nIt runs 7 to 8 hours including transfers. It gets genuinely cold up there even when Xilitla is hot: bring a jacket, hiking shoes with grip and a headlamp. We provide the safety gear and the certified guide.",
    destinos: [
      "La Trinidad cloud forest",
      "Cerro del Pilón",
      "Sea of clouds lookout",
    ],
    incluye: [
      "Round-trip transfer from your lodging in Xilitla",
      "Tickets and admissions",
      "Safety equipment",
      "NOM-09 SECTUR certified guide",
      "First-aid kit",
    ],
    gallery: [
      "Guide on the summit of Cerro del Pilón watching the sun rise over the sea of clouds covering the range",
      "Hiker sitting on a summit rock, seen from behind, facing the sunrise above the clouds",
      "Two silhouettes standing on the highest rock of Cerro del Pilón against the rising sun",
      "Couple in helmets and headlamps at the summit, with the sea of clouds and a purple sky behind them",
      "Sunbeams opening over the sea of clouds and the mountains of the Huasteca Potosina",
      "Couple resting on the summit rocks with the orange band of the sunrise behind them",
      "Hiker with a backpack, seen from behind, watching the day break from the summit trail",
      "Pines of the Trinidad cloud forest silhouetted against the first orange light of the day",
    ],
  },

  "olla-de-la-luz": {
    itinerario: [
      { momento: "Pickup", texto: "We pick you up at your lodging in Xilitla. Bring hiking shoes and a jacket or rain shell." },
      { momento: "Up to La Trinidad", texto: "About 14 km of mountain road to the Nahua community that lives high in the cloud forest. By the time you arrive the weather is a different one: cool and damp." },
      { momento: "The hike begins", texto: "With a guide from the community itself, which is the only way in. The trail crosses dense forest and open clearings." },
      { momento: "The lookouts", texto: "The path runs among pines, cedars and orchids, with several lookout stops. With luck you'll cross coatis or hear the guans." },
      { momento: "Olla de la Luz", texto: "The forest opens all at once: 233 metres across, a 193-metre drop, and another forest growing at the bottom of it. Your guide shows you where to stand and where not to." },
      { momento: "The way back", texto: "You retrace the trail with the light high, which is when the cloud forest shows you just how green it is." },
      { momento: "Return", texto: "We drop you back at your lodging in Xilitla." },
    ],
    nombre: "Olla de la Luz — The Sinkhole in Xilitla's Cloud Forest",
    nombreCorto: "Olla de la Luz",
    tagline: "An abyss where the light pours in like a waterfall",
    tipo: "Sinkhole & Cloud Forest",
    urgencia: "Entry only with a community guide — book ahead",
    descripcion:
      "Fourteen kilometres from Xilitla, at the top of the community of La Trinidad, a vertical sinkhole opens up 193 metres deep and 233 across, ringed by cloud forest, pines, cedars and orchids. You reach it after a guided walk of about 2 hours through forest, clearings and lookouts. Eight to nine hours. {precio} per person.",
    descripcionLarga:
      "Olla de la Luz — you'll also see it spelled Hoya de la Luz — is one of those places a photograph can't explain. It is a vertical sinkhole 193 metres deep and 233 across, opened high in the mountains of Xilitla: a hole in the forest so wide that another forest grew at the bottom of it, and so deep that sunlight only reaches all the way in for a few hours a day.\n\nGetting there means first climbing up to La Trinidad, the Nahua community that lives some 14 km from Xilitla, in one of the best-preserved cloud forests in the Huasteca. The road climbs to nearly 2,000 metres along a mountain track, and by the time you arrive the weather is a different one: cool, damp, with mist tangled in the pines.\n\nThe walk starts there — about 2 hours, with a guide from the community itself, which is the only way in. You cross stretches of dense forest, open clearings and several lookouts. The path runs among pines, cedars and orchids, and with luck you'll cross coatis or hear the guans.\n\nAnd then the forest opens. Leaning over the edge of Olla de la Luz is the kind of view that recalibrates the scale of things: the rock wall dropping straight down, the tree canopy far below like broccoli, and the silence. Your guide shows you where to stand and where not to.\n\nIt runs 8 to 9 hours including transfers. Bring hiking shoes, a jacket or rain shell, water and something to eat. It's cold up there even when you're sweating down in Xilitla.",
    destinos: [
      "La Trinidad — Xilitla's Cloud Forest",
      "Cerro de la Luz lookouts",
      "Olla de la Luz",
    ],
    incluye: [
      "Round-trip transfer from your lodging in Xilitla",
      "Guided walk of about 2 hours through forest, clearings and lookouts",
      "NOM-09 SECTUR certified guide",
      "Safety equipment",
    ],
    gallery: [
      "The vertical wall of Olla de la Luz dropping straight down to the forest that grew at its bottom",
      "The mouth of Olla de la Luz from the lookout, with the mountains and the sea of clouds behind",
      "View from the rim down to the floor of the sinkhole, where the treetops look like moss",
      "Guide standing on the karst rocks at the rim of Olla de la Luz, in the mist of the cloud forest",
      "Group walking in single file along the Trinidad cloud forest trail toward the sinkhole",
      "The whole group posing on the rocks at the rim of Olla de la Luz at the end of the walk",
    ],
  },
};
