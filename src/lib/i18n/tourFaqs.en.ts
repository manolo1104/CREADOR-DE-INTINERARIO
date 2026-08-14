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
