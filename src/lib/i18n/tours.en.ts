// Traducciones al inglés de los tours, indexadas por slug.
// Solo los campos de cara al usuario; lo no traducido cae al español (ver localize.ts).
// gallery = textos alt en el MISMO orden que el array gallery de tours.ts.

export interface TourTranslation {
  nombre?: string;
  tagline?: string;
  descripcion?: string;
  descripcionLarga?: string;
  tipo?: string;
  urgencia?: string;
  destinos?: string[];
  incluye?: string[];
  gallery?: string[];
}

export const TOURS_EN: Record<string, TourTranslation> = {
  "rzr-xilitla": {
    nombre: "RZR Off-Road Ride in Xilitla — The Nanacatli Route",
    tagline: "Drive your own off-road buggy through jungle, rivers and mud to a hidden waterfall",
    tipo: "Off-Road Adventure",
    urgencia: "Limited fleet — weekends book up in advance",
    descripcion:
      "Drive your own RZR through the humid jungle of Xilitla: cross crystal-clear rivers, plow through the mud and reach the hidden Nanacatli Waterfall. The favorite off-road adventure for first-time visitors to the Huasteca — pure adrenaline, no experience needed.",
    descripcionLarga:
      "Few ways of seeing the Huasteca are as much fun as taking the wheel of your own off-road vehicle. The Nanacatli Route is our most popular ride and a favorite among first-timers: two hours of humid jungle, crystal-clear rivers and mud, with guaranteed adrenaline from start to finish.\n\nWe meet at our base in Xilitla, where we hand you a helmet and goggles and give you a driving briefing. No experience required: the RZR is easy to control and an instructor-guide leads the route ahead of you the whole time, marking the way and clearing any obstacle. All you have to do is enjoy the ride.\n\nFrom the very first meters you head into the jungle: the green closes in on both sides, the track turns to dirt and mud, and the river crossings begin — clear water splashing everywhere. The ride ends at Nanacatli Waterfall, a spot that's nearly impossible to reach without these vehicles — the perfect reward after the journey.\n\nThe activity lasts about 2 hours and includes the vehicle with fuel, safety gear and the guide. It does not include transportation to Xilitla or meals. We recommend clothes that can get dirty and wet, closed-toe shoes and a change of clothes: you'll come out covered in mud and with a smile that's hard to wipe off.",
    destinos: [
      "Base in Xilitla (meeting point)",
      "Humid jungle and dirt tracks of Xilitla",
      "Crystal-clear river crossings",
      "Nanacatli Waterfall",
    ],
    incluye: [
      "Off-road RZR vehicle with fuel included",
      "Safety helmet and goggles for every rider",
      "Instructor-guide who leads and marks the route",
      "Driving briefing — beginner-friendly",
      "Ride through jungle, river crossings and arrival at Nanacatli Waterfall",
    ],
    gallery: [
      "Off-road RZR vehicle driving down a dirt track through the jungle, kicking up dust during the off-road ride in Xilitla",
      "RZR drifting and throwing up dirt across a green field during the off-road adventure in the Huasteca Potosina",
      "Front view of an off-road RZR vehicle on a dirt road surrounded by nature",
      "Tall waterfall dropping between the green walls of a jungle canyon in the Huasteca Potosina",
      "Hidden waterfall in the jungle with its pool below, the final reward of the RZR ride",
    ],
  },

  "rappel-tamul": {
    nombre: "Rappelling at Tamul Waterfall — Descend Beside Mexico's Tallest Falls",
    tagline: "Pure adrenaline hanging off the wall, facing 105 meters of falling water",
    tipo: "Extreme Adventure",
    urgencia: "Very limited spots — maximum 8 people per day",
    descripcion:
      "Rappel down the wall of the Tampaón canyon with Tamul Waterfall roaring beside you. Professional gear, certified guides and aerial drone photography to prove you did it. The most extreme experience in the Huasteca Potosina — beginner-friendly too.",
    descripcionLarga:
      "There are few places in the world where you can hang from a rope facing one of your country's tallest waterfalls. Tamul Waterfall — 105 meters of water plunging into the Tampaón River — is the backdrop of this experience, and the moment you peer over the canyon edge you understand why everyone who does it can't stop talking about it.\n\nWe start at the river dock, our meeting point, where we hand you the full gear and our high-mountain guides give you a technique briefing. No prior experience needed: the first descent is guided step by step and most of our visitors had never touched a rope before. All you need is the will to do it.\n\nOnce secured to the harness, you begin to descend the limestone wall draped in vegetation, with the waterfall beside you spraying cool mist over you and the river's turquoise water waiting below. The sound is deafening, the scenery unreal, and for those minutes nothing else in the world exists. Our photographer follows you from the air with a drone and from the ground, so every second is captured in photo and video — included in your booking at no extra cost.\n\nThe activity lasts 3 to 5 hours depending on the group and the weather. The price includes all safety gear and professional documentation, but does not include transportation or meals: transport to the dock can be arranged separately for an additional cost, or you can make your own way there. If you're after the story you'll tell for the rest of your life, it starts here.",
    destinos: [
      "Tampaón River dock (meeting point)",
      "Rappel wall facing Tamul Waterfall",
      "Tampaón River canyon",
    ],
    incluye: [
      "Full rappel and safety gear (harness, helmet, gloves and professional ropes)",
      "Certified high-mountain guides",
      "Briefing and descent technique — beginner-friendly",
      "Drone photos and video of the descent",
      "Meeting point at the river dock",
    ],
    gallery: [
      "Rappeller with a helmet camera smiling mid-wall in the canyon, with Tamul Waterfall plunging in the background — Huasteca Potosina",
      "Rappeller leaning on the vegetation-covered wall beside the curtain of Tamul Waterfall with the turquoise canyon behind",
      "Adventurer leaning back in the harness looking up during the rappel descent facing Tamul Waterfall",
      "Woman in a white helmet stretching out her arms while rappelling over the turquoise Tampaón River with the waterfall behind",
      "Wide view of the rappel descent over the imposing Tamul Waterfall — the tallest falls in Mexico",
      "Rappeller seen from behind descending the Tampaón canyon wall beside the curtain of Tamul",
      "Woman in a helmet smiling and giving a thumbs up while rappelling, with birds flying in front of Tamul Waterfall",
    ],
  },

  "expedicion-tamul": {
    nombre: "Tamul Expedition — Sinkhole, Canyon & Water Cave",
    tagline: "The most complete tour of the Huasteca in a single day",
    tipo: "Adventure & Nature",
    urgencia: "Our most booked tour — fills up on weekends",
    descripcion:
      "Paddle by canoe through the Tampaón Canyon to Tamul Waterfall — the tallest in Mexico — peer into the immense abyss of the Sótano de las Huahuas, and finish by diving into the underground magic of the Water Cave. A day that redefines what nature can offer you.",
    descripcionLarga:
      "The Tamul Expedition is the most complete tour of the Huasteca in a single day: we set out in the morning — no extreme early starts — to link three otherworldly natural settings one after another, with the best light on the turquoise water.\n\nThe canoe carries you through the Tampaón Canyon, a corridor of limestone rock 80 meters high where the silence is broken only by the sound of the paddle on the water. At the far end of the canyon, Tamul Waterfall — the tallest in Mexico at 105 meters — crashes into the river with a force you feel in your chest before you even see it. Along the way you also peer over the edge of the Sótano de las Huahuas, a 512-meter abyss that takes your breath away. Our guides know the exact angle and the precise time for the perfect photo.\n\nWe close at the Water Cave, an underground cenote where the light enters in perfect beams and the water turns an impossible shade of turquoise. People who take this tour always come back. And they always bring someone with them.",
    destinos: [
      "Tamul Waterfall (canoe ride)",
      "Sótano de las Huahuas (lookout over the 512 m abyss)",
      "Water Cave cenote",
    ],
    incluye: [
      "Breakfast with typical regional dishes",
      "Entrance to all parks",
      "Canoe ride through the Tampaón Canyon",
      "NOM-09 certified guide",
      "Transportation from your accommodation",
      "Full safety equipment",
      "Photos and video of the tour",
      "First-aid kit",
    ],
    gallery: [
      "View of Tamul Waterfall from the canyon — tourists wearing life vests",
      "Water Cave — beams of light over the underground turquoise cenote",
      "Jumping off the rocks into the Tampaón Canyon",
      "Happy canoe in the Tampaón Canyon — Tamul Waterfall in the background",
      "Water fight between canoes on the Tampaón River",
      "Peering over the edge of the Sótano de las Huahuas — 512 meters deep",
      "Traveler sitting on the rocks of the Tampaón Canyon pointing at Tamul Waterfall",
      "Turquoise waters of the Tampaón River with hanging vegetation — Tamul Expedition",
      "Group of tourists paddling canoes on the Tampaón River with a water battle",
    ],
  },

  "ruta-surrealista-edward-james": {
    nombre: "Surrealist Route — Edward James, Springs & Jungle",
    tagline: "Art, water and mystery in a journey of unique contrasts",
    tipo: "Culture & Nature",
    urgencia: "High demand in the Nov–Mar season",
    descripcion:
      "The world's most enigmatic sculpture garden, the crystal-clear waters of the Huichihuayán Spring, the living shadows of the Quilas Cave and the colonial architecture of the Castillo de la Salud. Culture and nature fused into one extraordinary day.",
    descripcionLarga:
      "Imagine walking through a garden designed by an eccentric English poet in the middle of the Mexican tropical jungle. Edward James's concrete sculptures — endless colonnades, staircases that climb to the sky and lead nowhere, four-meter stone flowers — emerge from the vegetation like a dream someone forgot to erase. Las Pozas of Xilitla has no equal anywhere on the planet.\n\nThe Huichihuayán Spring then welcomes you with waters that rise straight from the earth at the perfect temperature — neither cold nor warm, exactly 22°C — framed by palms and ferns in a silence that contrasts completely with the visual chaos of Las Pozas.\n\nThe Quilas Cave closes the route with an underground experience few people know: stalactites, bats and an echo that amplifies every sound into something mystical. This tour isn't just sightseeing. It's a different way of seeing the world.",
    destinos: [
      "Edward James Surrealist Garden (Las Pozas)",
      "Huichihuayán Spring",
      "Quilas Cave",
      "Castillo de la Salud",
    ],
    incluye: [
      "Transportation from your hotel",
      "Entrance to all attractions",
      "Buffet breakfast",
      "Guides specialized in history and culture",
      "Safety equipment",
      "Tour photos",
    ],
    gallery: [
      "Edward James surrealist sculpture — color and moss at Las Pozas in Xilitla",
      "Concrete towers of Las Pozas emerging from the jungle against a blue sky",
      "Couple at the Castillo de la Salud — colorful architecture of Tamul",
      "Turquoise pool of the Huichihuayán Spring with natural rays of light",
      "Circular portal at Las Pozas — cobblestone path among ferns and jungle",
      "Inside the Quilas Cave — a man admiring the rock formation",
      "Castillo de la Salud — aerial view of colorful towers amid the Huastec jungle",
      "Main structure of Las Pozas surrounded by lush vegetation",
      "Dark canyon with light coming from above — Quilas Cave",
      "Turquoise river of the Huichihuayán Spring among rocks and green jungle",
    ],
  },

  "cascadas-del-meco": {
    nombre: "El Meco Waterfalls — Turquoise Pools, Lookout & The Great Falls",
    tagline: "Three waterfalls, three different thrills",
    tipo: "Waterfalls & Photography",
    urgencia: "A photographers' favorite — limited spots",
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
      "Transportation from your hotel",
      "Entrance to all attractions",
      "Buffet breakfast",
      "Specialized guides",
      "Safety equipment",
      "Tour photos",
    ],
    gallery: [
      "Two tourists paddleboarding in front of El Meco Waterfall — turquoise waters of the Huasteca Potosina",
      "El Salto Waterfall in 4K — a double drop with stepped turquoise pools in the Huasteca",
      "Young man diving off the rocks at El Meco Waterfall — turquoise water",
      "El Salto Waterfall, cinematic view — main drop with mist and jungle",
      "Two people waving at the foot of El Meco Waterfall — turquoise water",
      "Tourist at El Meco's panoramic lookout — view of the stepped waterfalls",
      "El Salto Waterfall with a full rainbow — the most photogenic spectacle in the Huasteca",
      "Family enjoying the pools above El Meco Waterfall — great for all ages",
      "Canoe approaching El Meco Waterfall across turquoise waters",
      "El Salto Waterfall — cinematic long-exposure shot",
      "A second canoe approaching El Meco Waterfall — turquoise river ride",
      "Woman paddleboarding at El Meco Waterfall — water activity in the Huasteca",
      "Father and daughter enjoying the turquoise river in the Huasteca Potosina",
      "Flotilla of canoes in front of El Meco Waterfall — group tour with life vests",
    ],
  },

  "paraiso-escalonado-minas-micos": {
    nombre: "Stepped Paradise — Minas Viejas & Micos Waterfalls",
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
      "Transportation from your hotel",
      "Entrance to all attractions",
      "Buffet breakfast",
      "Specialized guides",
      "Safety equipment",
      "Tour photos",
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
    nombre: "Water Route — Puente de Dios, Hacienda & Seven Waterfalls",
    tagline: "The most refreshing and complete journey in the region",
    tipo: "Water Adventure",
    urgencia: "Our most complete tour — last spots available",
    descripcion:
      "Pass through the natural cave of Puente de Dios with the river flowing at your feet, explore the Los Gómez Hacienda and descend the Seven Waterfalls in sequence. The crystal-clear pools of Tamasopo await anyone who wants to extend the adventure.",
    descripcionLarga:
      "Puente de Dios (\"God's Bridge\") is a natural rock arch 15 meters high through which the river flows, and there's a moment each day — between 11 AM and 1 PM — when the sunlight enters perpendicular and turns the water into liquid crystal. We arrive at that hour. Always.\n\nEntering Puente de Dios is a full sensory experience: the sound of the water amplified by the cave, the chill of the interior, the light pouring through the arch like a natural beacon, the texture of the stone underfoot. It's not just a photo. It's a moment that etches itself into memory.\n\nThe Los Gómez Hacienda, the Seven Waterfalls in sequence and the optional stop in Tamasopo complete the most immersive tour in the region. For anyone who wants to see it all, move a lot and take home as many memories as possible — with the assurance that every step was led by someone who knows these rivers by heart — this is the tour.",
    destinos: [
      "Puente de Dios",
      "Los Gómez Hacienda",
      "Seven Waterfalls",
      "Tamasopo Waterfalls (optional)",
    ],
    incluye: [
      "Transportation from your hotel",
      "Entrance to all attractions",
      "Buffet breakfast",
      "Specialized guides",
      "Safety equipment",
      "Tour photos",
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
};
