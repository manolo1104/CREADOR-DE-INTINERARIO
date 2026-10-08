/**
 * "Ideal para" de cada recorrido, en los dos idiomas. Clave: `tour.id`.
 *
 * El español nació dentro del recomendador (`TOUR_PROOF.bestFor` en
 * `RecommenderShell.tsx`). Se mudó aquí el 2 oct 2026 para que el comparador
 * lo use, por dos razones:
 *
 * 1. 🔴 `RecommenderShell` es "use client": una constante importada de ahí a un
 *    Server Component llega como `[object Object]` (ya pasó con el ancla del
 *    módulo de reserva; ver `anclas.ts`).
 * 2. Solo existía en español y el comparador es bilingüe.
 *
 * El español es el MISMO texto que el recomendador ya publicaba; el inglés es
 * traducción nueva (2 oct), no una promesa nueva. Si cambia uno, se cambia el
 * otro.
 */
export const IDEAL_PARA: Record<string, { es: string; en: string }> = {
  "tour-rzr-xilitla": {
    es: "Amigos, familias y primerizos",
    en: "Friends, families and first-timers",
  },
  "tour-rappel-tamul": {
    es: "Aventureros y grupos de amigos",
    en: "Adventurers and groups of friends",
  },
  "tour-rafting-tampaon": {
    es: "Grupos de amigos y amantes de la adrenalina",
    en: "Groups of friends and adrenaline lovers",
  },
  "tour-tamul": {
    es: "Amigos y aventureros",
    en: "Friends and adventurers",
  },
  "tour-edward-james": {
    es: "Parejas y amantes del arte",
    en: "Couples and art lovers",
  },
  "tour-meco": {
    es: "Fotógrafos y parejas",
    en: "Photographers and couples",
  },
  "tour-minas-micos": {
    es: "Familias con niños",
    en: "Families with kids",
  },
  "tour-puente-dios": {
    es: "Grupos de amigos",
    en: "Groups of friends",
  },
  "tour-buceo-media-luna": {
    es: "Primerizos, parejas y curiosos del buceo",
    en: "First-timers, couples and anyone curious about diving",
  },
  "tour-eden-jardin": {
    es: "Parejas y amantes del arte que quieren el jardín para ellos",
    en: "Couples and art lovers who want the garden to themselves",
  },
  "tour-travesia-cafe": {
    es: "Familias, ritmo tranquilo y curiosos del café",
    en: "Families, an easy pace and coffee lovers",
  },
  "tour-gruta-xilo": {
    es: "Aventureros que quieren una noche distinta",
    en: "Adventurers who want a different kind of night",
  },
  "tour-amanecer-nubes": {
    es: "Fotógrafos y madrugadores",
    en: "Photographers and early risers",
  },
  "tour-olla-de-la-luz": {
    es: "Senderistas y amantes del bosque de niebla",
    en: "Hikers and cloud-forest lovers",
  },
  "tour-huasteca-instagrameable": {
    es: "Creadores de contenido y parejas",
    en: "Content creators and couples",
  },
};
