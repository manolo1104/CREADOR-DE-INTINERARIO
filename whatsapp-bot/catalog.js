// ════════════════════════════════════════════════════════════════════
// CATÁLOGO — Tours Huasteca Potosina (huasteca-potosina.com)
// La "educación" del bot. Derivado de src/lib/tours.ts del sitio.
// Precios POR PERSONA (MXN). Niños 6–10 = 70 %, menores de 6 = 50 %.
// Salida estándar: 8:30–9:00 AM.  Mantener en sync con el sitio.
// ════════════════════════════════════════════════════════════════════

const SALIDA = "8:30–9:00 AM";

const TOURS = [
  {
    id: "tour-rzr-xilitla",
    slug: "rzr-xilitla",
    nombre: "Recorrido en RZR por Xilitla — Ruta Nanacatli",
    tipo: "Aventura Off-Road",
    dificultad: "media",
    duracionHrs: 2,
    precio: 800,
    groupMin: 2,
    groupMax: 6,
    tagline: "Maneja tu propio todoterreno entre selva, ríos y barro hasta una cascada escondida",
    pitch: "Tú al volante de un RZR cruzando ríos cristalinos y terracería de selva hasta la Cascada Nanacatli. Apto para principiantes — un guía abre la ruta.",
    destinos: ["Selva y terracería de Xilitla", "Cruces de ríos cristalinos", "Cascada Nanacatli"],
    incluye: ["Vehículo RZR con gasolina", "Casco y goggles", "Guía instructor que abre la ruta", "Briefing de manejo (no necesitas experiencia)"],
    noIncluye: ["Transporte hasta Xilitla", "Alimentos"],
    puntoEncuentro: "Nuestra base en Xilitla",
    idealPara: ["amigos", "familias", "primerizos", "aventura"],
  },
  {
    id: "tour-rappel-tamul",
    slug: "rappel-tamul",
    nombre: "Rappel en la Cascada de Tamul",
    tipo: "Aventura Extrema",
    dificultad: "alta",
    duracionHrs: 5,
    precio: 1700,
    groupMin: 2,
    groupMax: 8,
    tagline: "Adrenalina pura colgado de la pared, frente a 105 metros de agua",
    pitch: "Desciende en rappel por la pared del cañón del Tampaón frente a la cascada más alta de México. Guías certificados y video con dron incluido. No necesitas experiencia previa.",
    destinos: ["Embarcadero del Río Tampaón", "Pared de rappel frente a la Cascada de Tamul"],
    incluye: ["Equipo completo de rappel y seguridad", "Guías de alta montaña certificados", "Briefing — apto para principiantes", "Fotos y video con dron"],
    noIncluye: ["Transporte (se coordina con costo adicional)", "Alimentos"],
    puntoEncuentro: "Embarcadero del Río Tampaón",
    idealPara: ["aventura extrema", "amigos", "adrenalina"],
  },
  {
    id: "tour-tamul",
    slug: "expedicion-tamul",
    nombre: "Expedición Tamul — Cañón, Cascada & Cueva del Agua",
    tipo: "Aventura & Naturaleza",
    dificultad: "media",
    duracionHrs: 9,
    precio: 1450,
    groupMin: 2,
    groupMax: 12,
    tagline: "El tour más completo de la Huasteca en un solo día",
    pitch: "Canoa por el Cañón del Tampaón hasta la Cascada de Tamul (la más alta de México), mirador al abismo del Sótano de las Huahuas y la Cueva del Agua turquesa. Todo en un día.",
    destinos: ["Cañón del Tampaón (canoa) y Cascada de Tamul", "Sótano de las Huahuas (mirador)", "Cenote Cueva del Agua"],
    incluye: ["Transporte desde tu hospedaje", "Desayuno", "Entradas a los parques", "Paseo en canoa", "Guía certificado NOM-09", "Equipo de seguridad", "Fotos y video"],
    noIncluye: ["Comida de mediodía"],
    puntoEncuentro: "Recogida en tu hospedaje (zona Ciudad Valles)",
    idealPara: ["el más completo", "parejas", "primera vez", "naturaleza"],
  },
  {
    id: "tour-edward-james",
    slug: "ruta-surrealista-edward-james",
    nombre: "Ruta Surrealista — Edward James, Manantiales & Selva",
    tipo: "Cultura & Naturaleza",
    dificultad: "baja",
    duracionHrs: 8,
    precio: 1300,
    groupMin: 2,
    groupMax: 10,
    tagline: "Arte, agua y misterio en un recorrido de contrastes únicos",
    pitch: "El jardín surrealista de Edward James (Las Pozas de Xilitla), el Nacimiento de Huichihuayán a 22°C y la Cueva de las Quilas. Arte y selva en un solo día.",
    destinos: ["Jardín Surrealista Edward James (Las Pozas)", "Nacimiento de Huichihuayán", "Cueva de las Quilas", "Castillo de la Salud"],
    incluye: ["Transporte desde tu hotel", "Desayuno buffet", "Entradas a todas las atracciones", "Guías especializados en historia y cultura", "Equipo de seguridad", "Fotos del tour"],
    noIncluye: ["Comida de mediodía"],
    puntoEncuentro: "Recogida en tu hotel",
    idealPara: ["arte y cultura", "parejas", "fotografía", "tranquilo"],
  },
  {
    id: "tour-meco",
    slug: "cascadas-del-meco",
    nombre: "Cascadas del Meco — Turquesas, Mirador & El Gran Salto",
    tipo: "Cascadas & Fotografía",
    dificultad: "baja",
    duracionHrs: 7,
    precio: 1600,
    groupMin: 2,
    groupMax: 8,
    tagline: "Tres caídas de agua, tres emociones distintas",
    pitch: "Las pozas turquesa neón del Meco, el mirador panorámico y la Cascada del Salto (40 m). El tour más fotogénico y accesible de la región.",
    destinos: ["Cascada del Meco", "Mirador Panorámico", "Cascada del Salto"],
    incluye: ["Transporte desde tu hotel", "Desayuno buffet", "Entradas", "Guías especializados", "Equipo de seguridad", "Fotos del tour"],
    noIncluye: ["Comida de mediodía"],
    puntoEncuentro: "Recogida en tu hotel",
    idealPara: ["fotografía", "cascadas turquesas", "parejas", "familias"],
  },
  {
    id: "tour-minas-micos",
    slug: "paraiso-escalonado-minas-micos",
    nombre: "Paraíso Escalonado — Minas Viejas & Cascadas de Micos",
    tipo: "Cascadas & Bienestar",
    dificultad: "baja",
    duracionHrs: 8,
    precio: 1500,
    groupMin: 2,
    groupMax: 12,
    tagline: "Dos joyas naturales, un día perfecto para desconectar",
    pitch: "Las terrazas color jade de Minas Viejas y las siete pozas turquesa de Micos. El favorito de las familias: dificultad baja, chalecos para todos.",
    destinos: ["Cascadas de Minas Viejas", "Cascadas de Micos"],
    incluye: ["Transporte desde tu hotel", "Desayuno buffet", "Entradas", "Guías especializados", "Equipo de seguridad", "Fotos del tour"],
    noIncluye: ["Comida de mediodía"],
    puntoEncuentro: "Recogida en tu hotel",
    idealPara: ["familias con niños", "relax", "cascadas turquesas", "tranquilo"],
  },
  {
    id: "tour-puente-dios",
    slug: "ruta-acuatica-puente-de-dios",
    nombre: "Ruta Acuática — Puente de Dios, Hacienda & Siete Cascadas",
    tipo: "Aventura Acuática",
    dificultad: "media",
    duracionHrs: 10,
    precio: 1500,
    groupMin: 2,
    groupMax: 10,
    tagline: "El recorrido más refrescante y completo de la región",
    pitch: "Entra al Puente de Dios con el río a tus pies, recorre la Hacienda Los Gómez y baja las Siete Cascadas de Tamasopo. El tour más inmersivo y refrescante.",
    destinos: ["Puente de Dios", "Hacienda Los Gómez", "Siete Cascadas", "Cascadas de Tamasopo (opcional)"],
    incluye: ["Transporte desde tu hotel", "Desayuno buffet", "Entradas", "Guías especializados", "Equipo de seguridad", "Fotos del tour"],
    noIncluye: ["Comida de mediodía"],
    puntoEncuentro: "Recogida en tu hotel",
    idealPara: ["aventura", "amigos", "nadar", "cascadas"],
  },
];

const EMPRESA = {
  nombre: "Tours Huasteca Potosina",
  sitio: "https://www.huasteca-potosina.com",
  zona: "Huasteca Potosina, San Luis Potosí, México (Xilitla, Ciudad Valles, Tamasopo)",
  salida: SALIDA,
  cancelacion: "Cancela gratis hasta 48 h antes.",
  ninos: "Niños 6–10 años: 70 % del precio adulto. Menores de 6: 50 %.",
};

function findTour(slugOrId) {
  const q = String(slugOrId || "").toLowerCase().trim();
  return TOURS.find((t) => t.slug === q || t.id === q) || null;
}

/** Precio total (misma lógica de dos niveles que el sitio). */
function calcPrecio(precioAdulto, adultos, ninosMid = 0, ninosSmall = 0) {
  const mid = Math.round(precioAdulto * 0.7);
  const small = Math.round(precioAdulto * 0.5);
  const total = precioAdulto * adultos + mid * ninosMid + small * ninosSmall;
  return { total, precioMid: mid, precioSmall: small };
}

module.exports = { TOURS, EMPRESA, SALIDA, findTour, calcPrecio };
