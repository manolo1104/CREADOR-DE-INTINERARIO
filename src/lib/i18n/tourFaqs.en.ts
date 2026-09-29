import type { Locale } from "./config";
import { TOUR_FAQS, type FAQ } from "../tourFaqs";

/**
 * Las FAQ por tour en inglés.
 *
 * Hasta el 14 ago 2026 la ficha de tour en inglés emitía `[]` en lugar de estas
 * preguntas (`locale === "en" ? [] : TOUR_FAQS[...]`), así que el JSON-LD
 * FAQPage inglés salía corto: se perdía la búsqueda por voz y la citación por
 * IA, que es justo donde un americano pregunta en frases completas.
 *
 * ⚠️ Van por **tour.id**, igual que `TOUR_FAQS` — NO por slug, al contrario de
 * `TOURS_EN` en `tours.en.ts`. Es la trampa de este archivo.
 *
 * ⚠️ No son traducciones literales: se reescribieron en inglés americano. Las
 * cifras (precios, temperaturas, horas, duraciones) se copian TAL CUAL del
 * español — ninguna es nueva.
 */
export const TOUR_FAQS_EN: Record<string, FAQ[]> = {
  "tour-eden-jardin": [
    {
      q: "What do I see here that I wouldn't see on the regular visit to Las Pozas?",
      a: "Three things. You go in an hour before it opens to the public, so the garden is empty. Areas that aren't part of the general route are opened for you, including the Studio House, where a poem written in Edward James's own hand is still on the wall. And you climb to the upper levels of the Bamboo Palace, which are closed on the regular visit.",
    },
    {
      q: "What time does it start?",
      a: "8:00 AM on Monday, Wednesday, Thursday and Friday; 7:00 AM on Saturday and Sunday. There is also a 5:00 PM departure from Wednesday through Monday. We confirm the exact time when you book the date, since it depends on the day.",
    },
    {
      q: "How many of us can go?",
      a: "Anywhere from 1 to 7 people. The cap comes from the garden itself: no more than 7 per experience, and on some structures you go up one at a time because of their load limits.",
    },
    {
      q: "What language is the tour in?",
      a: "English or Spanish, whichever you prefer. French and Italian can be requested in advance, subject to guide availability.",
    },
    {
      q: "Can I swim in the pools?",
      a: "No. Water activities aren't allowed on this experience — the garden is an Artistic Monument and National Heritage site, and the rules of the grounds prohibit it.",
    },
    {
      q: "Can I bring a drone or a tripod?",
      a: "No. The garden doesn't allow pets, drones or tripods, and management can turn away any object it considers a risk to the site or an obstruction on the paths. Photos with your camera or phone are fine.",
    },
    {
      q: "What if I need to change the date?",
      a: "You can, as long as you tell us 5 or more days ahead: the full amount is honored and you can use it on any available date within the next 6 months. With less than 5 days' notice, or if you don't show up, there is no change and no refund. If the weather forces a cancellation, we reschedule at no cost.",
    },
  ],
  "tour-rzr-xilitla": [
    {
      q: "Do I need a license or any experience to drive the RZR?",
      a: "No experience needed. We run you through a driving briefing first, and the RZR is easy to handle. An instructor guide leads the route ahead of you the whole way. The driver has to be 18 or older — and if you'd rather not drive, you can ride shotgun.",
    },
    {
      q: "Is the price per person or per vehicle?",
      a: "Per vehicle. Each unit is priced by route: from $1,600 MXN for the RZR 500 (2 adults + 1 child) on the Nanacatli route, up to the family Defender (6 adults + 2 children) or the premium Polaris Pro S. All of them include fuel, safety gear and a guide.",
    },
    {
      q: "Can kids come along?",
      a: "Yes, depending on the vehicle. The RZR 500 seats 2 adults and 1 child; the family Defender seats 6 adults and 2 children. Tell us everyone's ages when you book so we assign you the right unit.",
    },
    {
      q: "Are transport and food included?",
      a: "No. The price covers the vehicle with fuel, the safety gear and the guide. You meet us at our base in Xilitla — getting there and any meals are on you.",
    },
    {
      q: "What should I bring?",
      a: "Clothes you don't mind ruining, closed-toe shoes, sunscreen and a full change of clothes. You will finish this covered in mud. That's the point.",
    },
    {
      q: "How long does the ride take?",
      a: "Depends on the route: Nanacatli is 2 hours (the most popular, and the right call for first-timers), Miradores 3 hours, and Nacimiento or Trinidad 5 hours each. On the Nacimiento route we lend you a kayak and life jacket for the spring.",
    },
  ],
  "tour-rafting-tampaon": [
    {
      q: "Is rafting safe if I can't swim?",
      a: "Yes. You wear a life jacket and helmet for the entire descent, and your certified guide rides in the raft with you. Just tell them before you get in so they can put you in the best spot in the boat.",
    },
    {
      q: "Do I need previous experience?",
      a: "No. Class III rapids are the sweet spot between a real thrill and beginner-friendly. Before you touch the water you get a full safety and paddling briefing.",
    },
    {
      q: "What happens if the river is too high to run?",
      a: "Your safety comes first. If the river isn't in shape — most likely in the rainy season, July through September — we tell you in advance and either reschedule or offer you a different activity.",
    },
    {
      q: "Can I bring my GoPro?",
      a: "Yes, but only on a chest or helmet mount. Handheld isn't allowed: both hands need to be free to paddle and to hold the safety lines.",
    },
    {
      q: "What should I bring?",
      a: "A swimsuit or clothes you don't mind soaking, water shoes or sneakers you can get wet (wear socks to avoid blisters), biodegradable sunscreen, and a full change of dry clothes for the ride back.",
    },
    {
      q: "Where does the tour start? Is transport included?",
      a: "Included — we pick you up at your hotel in Ciudad Valles or Xilitla, round trip. You just show up ready to paddle.",
    },
    {
      q: "Are meals included?",
      a: "Yes, your booking includes one meal — before or after the descent, whichever you prefer.",
    },
  ],
  "tour-rappel-tamul": [
    {
      q: "Do I need rappelling experience?",
      a: "No. The first descent is fully guided, and most of our visitors have never rappelled before. Our high-mountain guides walk you through the technique before you go over the edge.",
    },
    {
      q: "Is transport included?",
      a: "Yes — the transfer from Ciudad Valles is included, and from there we head to the river landing. Meals are the one thing the price doesn't cover.",
    },
    {
      q: "Do photos and video cost extra?",
      a: "No, they're included. We document the whole descent with photography and drone video at no additional cost.",
    },
    {
      q: "What gear do I need to bring?",
      a: "We supply all the safety equipment — harness, helmet, gloves and ropes. You bring comfortable athletic clothes you can get wet, closed-toe shoes with a solid sole, and sunscreen.",
    },
    {
      q: "How long does it take?",
      a: "Between 3 and 5 hours, depending on group size and weather conditions.",
    },
  ],
  "tour-tamul": [
    {
      q: "Can I do this if I can't swim?",
      a: "Yes. Everyone wears a life jacket for the entire trip. Swimming isn't a requirement.",
    },
    {
      q: "What time do we leave?",
      a: "Between 8:00 and 9:00 AM. We confirm your exact pickup time when you book.",
    },
    {
      q: "What happens if it rains?",
      a: "We run in light rain. If there's an electrical storm, we reschedule at no cost.",
    },
  ],
  "tour-edward-james": [
    {
      q: "Is there an age limit at Las Pozas?",
      a: "No, but the ground is uneven throughout. For children under 5 we'd keep a close hand on them.",
    },
    {
      q: "Does the guide speak English?",
      a: "Our guides are NOM-09 certified and fully bilingual guides are available — just ask when you book and we'll assign one.",
    },
    {
      q: "How long do we spend at each stop?",
      a: "About 2 hours at Las Pozas, 1 hour at Huichihuayán, and 45 minutes at each additional stop.",
    },
  ],
  "tour-meco": [
    {
      q: "Can I swim at every waterfall?",
      a: "Yes. Every pool on this tour is swimmable, and a life jacket is included.",
    },
    {
      q: "Is lunch included?",
      a: "Breakfast is included; midday lunch isn't — there are places to eat along the route.",
    },
    {
      q: "Is this suitable for older travelers?",
      a: "Yes, the difficulty is low. Reaching the lookouts is a short, flat walk.",
    },
  ],
  "tour-minas-micos": [
    {
      q: "Is it safe to bring small children?",
      a: "Yes — this is one of our most family-friendly tours. Life jackets for everyone.",
    },
    {
      q: "Are Minas Viejas and Micos close together?",
      a: "They're on the same route, about 40 minutes apart by car. We cover both in one day.",
    },
    {
      q: "Is the water very cold?",
      a: "Between 18 and 22°C (64–72°F). Refreshing, not freezing. Most people love it.",
    },
  ],
  "tour-puente-dios": [
    {
      q: "Can children go into Puente de Dios?",
      a: "Yes, with a mandatory life jacket. Because of the stairs, we recommend it for children over 5.",
    },
    {
      q: "How cold is the water?",
      a: "Between 18 and 22°C (64–72°F) — refreshing, not freezing. Most people love it.",
    },
    {
      q: "Does Hacienda Los Gómez cost extra?",
      a: "No, it's included in the tour price.",
    },
  ],
  // Los tres recorridos nuevos: mismas preguntas y mismo orden que en
  // `tourFaqs.ts`, y la misma regla — sin horas, precios, cupos ni edad mínima.
  "tour-gruta-xilo": [
    {
      q: "Why is Xilo Cave done at night?",
      a: "Because that's half the experience. Without the noise or the heat of the day, the 15 to 20 minute walk through the jungle is already done by headlamp, and inside the cave all that exists is the circle of light from your lamp. At the end, at the natural jacuzzis, lamps go off for a few minutes so you can listen to the cave in silence.",
    },
    {
      q: "How hard is the Xilo Cave tour?",
      a: "Moderate. First you walk 15 to 20 minutes through the jungle to the mouth of the cave; inside you cover about 900 metres over wet rock, with wide stretches where you walk upright and stretches where you have to crouch. You move slowly, in a small group, and before going in the guide explains where to step.",
    },
    {
      q: "Is it OK if I'm claustrophobic?",
      a: "We wouldn't recommend it. There are wide stretches where you walk upright, but also stretches where you have to crouch, and all of it is by the light of your headlamp. If you suffer from claustrophobia, this isn't the tour for you.",
    },
    {
      q: "Will I get wet?",
      a: "Plan on it. Some passages have water, you walk on wet rock inside the cave, and the route ends at natural jacuzzis: pools of crystal-clear water formed inside the cave itself. Wear closed shoes with grip that can get wet, and bring a full change of dry clothes for the ride back.",
    },
    {
      q: "When do I get my helmet and headlamp?",
      a: "At the start, when we pick you up at your lodging — not at the cave entrance — so you do the jungle walk with your lamp already on. A helmet and headlamp are included for each person, and wearing them is mandatory.",
    },
  ],
  "tour-amanecer-nubes": [
    {
      q: "Where is Cerro del Pilón?",
      a: "In the mountains of Xilitla. First you go up a mountain road to La Trinidad, a Nahua community about 14 km from Xilitla, in a cloud forest at nearly 2,000 metres, and from there you hike through pines and oaks to the summit of Cerro del Pilón. On a sea-of-clouds morning, what you see at sunrise is a layer of cloud covering the valleys from one end of the horizon to the other.",
    },
    {
      q: "What if there's no sea of clouds that day?",
      a: "It can happen: the sea of clouds depends on the weather. It's frequent, but nobody can guarantee it, and we don't promise it either. The climb is still timed to reach the summit before dawn, and the way down is in daylight, which is when you see the cloud forest you climbed through in the dark.",
    },
    {
      q: "How hard is the climb?",
      a: "Moderate. It's several hours of steady uphill walking, much of it in the dark by headlamp, on a trail through pines and oaks; the last stretch before the summit is rock. You don't need mountaineering experience, but you do need to be fit enough to walk uphill.",
    },
    {
      q: "Is it cold at the top?",
      a: "Yes, genuinely, even when Xilitla is hot. You're walking through a cloud forest at nearly 2,000 metres before dawn: bring a windproof jacket, hiking shoes with good grip and a headlamp.",
    },
    {
      q: "Do we have breakfast at the summit?",
      a: "Yes, but breakfast isn't included. Since you leave in the middle of the night, bring water and something to eat: at the summit, after the sunrise, everything stops for photos and a bite.",
    },
  ],
  "tour-olla-de-la-luz": [
    {
      q: "What is Olla de la Luz?",
      a: "A vertical sinkhole 193 metres deep and 233 across, high in the mountains of Xilitla, ringed by cloud forest and crowned by Cerro de la Luz, the highest point in the municipality. It's so wide that another forest grew at the bottom. You'll also see it spelled Hoya de la Luz: same place.",
    },
    {
      q: "Can I visit Olla de la Luz without a guide?",
      a: "No. The only way in is with a guide from the La Trinidad community; you can't get there on your own. That's why the walk on this tour is led by a guide from the community itself.",
    },
    {
      q: "How hard is the hike?",
      a: "Moderate: about 2 hours of guided walking to get there, through dense forest, open clearings and lookouts, and the same trail back, all at altitude. The route runs between 1,950 and 2,300 metres above sea level, so wear hiking shoes.",
    },
    {
      q: "How close to the edge can I get?",
      a: "As close as your guide says. It's a 193-metre drop with exposed edges: don't go near the rim without your guide, who shows you where to stand and where not to.",
    },
    {
      q: "Is it cold in La Trinidad?",
      a: "Yes, even when you're sweating down in Xilitla. La Trinidad sits in one of the best-preserved cloud forests in the Huasteca, cool and damp all year, with mist tangled in the pines. Bring a jacket or rain shell.",
    },
  ],
};

/**
 * Las FAQ del tour en el idioma pedido.
 *
 * Si un tour tiene preguntas en español pero todavía no en inglés, devuelve
 * `[]` a propósito: es mejor una ficha inglesa con menos FAQ que una con
 * párrafos en español dentro del JSON-LD.
 */
export function getTourFaqs(tourId: string, locale: Locale): FAQ[] {
  if (locale === "es") return TOUR_FAQS[tourId] ?? [];
  return TOUR_FAQS_EN[tourId] ?? [];
}

/**
 * Los tours cuyas FAQ existen en español pero no en inglés. Vacío hoy; si
 * alguien agrega preguntas nuevas a `TOUR_FAQS` sin traducirlas, aquí es donde
 * se ven. Se usa en el test de paridad.
 */
export function faltanFaqsEn(): string[] {
  return Object.keys(TOUR_FAQS).filter(
    (id) => (TOUR_FAQS_EN[id]?.length ?? 0) !== TOUR_FAQS[id].length,
  );
}
