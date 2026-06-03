// ════════════════════════════════════════════════════════════════════
// CONOCIMIENTO DEL SITIO — Tours Huasteca Potosina
// Paquetes (tours + hotel) y destinos. Copia curada de:
//   src/app/paquetes/page.tsx (PAQUETES), src/lib/destinos.ts (DESTINOS_DB),
//   src/lib/tourMapping.ts (DESTINO_EN_TOURS).
// Mantener en sync con el sitio. Precios en MXN.
// ════════════════════════════════════════════════════════════════════

const PAQUETES = [
  {
    id: "esencial",
    nombre: "Paquete Esencial",
    subtitulo: "Tu primera noche en la Huasteca",
    duracion: "2 días / 1 noche",
    precio: 5000,
    precioLabel: "por pareja",
    tours: ["Ruta Surrealista — Edward James (Día 1)"],
    incluye: ["1 noche en Hotel Paraíso Encantado Xilitla", "Desayuno (Día 2)", "Tour Ruta Surrealista completo", "Transporte al tour", "Guía certificado NOM-09", "Entradas a todas las atracciones"],
    perfiles: ["Parejas", "Primera visita", "Fin de semana"],
  },
  {
    id: "aventura",
    nombre: "Paquete Aventura",
    subtitulo: "El mejor dúo de la región",
    duracion: "3 días / 2 noches",
    precio: 9000,
    precioLabel: "por pareja",
    badge: "Más popular",
    tours: ["Expedición Tamul (Día 2)", "Cascadas del Meco (Día 3)"],
    incluye: ["2 noches en Hotel Paraíso Encantado Xilitla", "Desayunos ambos días", "Tour Expedición Tamul completo", "Tour Cascadas del Meco completo", "Transporte a cada tour", "Guías certificados NOM-09", "Entradas a todas las atracciones"],
    perfiles: ["Amigos aventureros", "Parejas activas", "El clásico"],
  },
  {
    id: "completo",
    nombre: "Paquete Completo Huasteca",
    subtitulo: "La experiencia definitiva",
    duracion: "4 días / 3 noches",
    precio: 12200,
    precioLabel: "por pareja",
    tours: ["Ruta Surrealista (Día 1)", "Expedición Tamul (Día 2)", "Paraíso Escalonado o Ruta Acuática (Día 3)"],
    incluye: ["3 noches en Hotel Paraíso Encantado Xilitla", "Desayunos los 3 días", "3 tours completos a elegir", "Transporte a cada tour", "Guías certificados NOM-09", "Entradas a todas las atracciones", "Fotos y video de cada recorrido"],
    perfiles: ["Familias", "Grupos", "Experiencia total"],
  },
];

// destino slug → tour(s) vendible(s) del catálogo (de DESTINO_EN_TOURS)
const DESTINO_TOUR = {
  "cascada-de-tamul": ["expedicion-tamul", "rappel-tamul"],
  "sotano-de-las-huahuas": ["expedicion-tamul"],
  "sotano-de-las-golondrinas": ["expedicion-tamul"],
  "las-pozas-jardin-surrealista": ["ruta-surrealista-edward-james"],
  "nacimiento-huichihuayan": ["ruta-surrealista-edward-james"],
  "xilitla-pueblo-magico": ["ruta-surrealista-edward-james"],
  "cascada-el-salto": ["cascadas-del-meco"],
  "cascadas-de-micos": ["paraiso-escalonado-minas-micos"],
  "cascadas-minas-viejas": ["paraiso-escalonado-minas-micos"],
  "puente-de-dios-tamasopo": ["ruta-acuatica-puente-de-dios"],
  "cascadas-de-tamasopo": ["ruta-acuatica-puente-de-dios"],
};

const DESTINOS = [
  { slug: "las-pozas-jardin-surrealista", nombre: "Las Pozas (Jardín Surrealista de Edward James)", zona: "Xilitla", tipo: "Arte & Naturaleza", descripcion: "Jardín surrealista de Edward James: esculturas de concreto entre cascadas y selva.", precioEntrada: "$180 MXN", dificultad: "media", duracionHrs: 4, mejorHora: "09:00–11:00", temporadaIdeal: "Nov–Mar", comoLlegar: "1h 45min desde Ciudad Valles", queLlevar: ["calzado antiderrapante", "repelente biodegradable"], advertencias: "Comprar ticket digital antes. CERRADO los martes.", datosCuriosos: ["Edward James nunca vivió en las estructuras; eran su jardín de fantasía."] },
  { slug: "cascada-de-tamul", nombre: "Cascada de Tamul", zona: "Aquismón", tipo: "Aventura", descripcion: "La cascada más alta de SLP (105 m), se llega remando por el río Tampaón. Caída turquesa.", precioEntrada: "$220 MXN + $300 panga p/p", dificultad: "alta", duracionHrs: 5, mejorHora: "08:00", temporadaIdeal: "Ene–Abr", comoLlegar: "45 min desde Valles → Tanchachín + lancha", queLlevar: ["chaleco salvavidas", "aqua shoes", "agua 2L"], advertencias: "Los lancheros dejan de salir a las 2 PM. SOLO EFECTIVO.", datosCuriosos: ["En octubre: agua turquesa + follaje naranja."] },
  { slug: "sotano-de-las-golondrinas", nombre: "Sótano de las Golondrinas", zona: "Aquismón", tipo: "Extrema", descripcion: "Abismo kárstico de 333 m. Santuario de vencejos con vuelo en espiral al amanecer.", precioEntrada: "$100 MXN", dificultad: "media", duracionHrs: 3, mejorHora: "05:45 AM", temporadaIdeal: "Nov–Mar", comoLlegar: "1h 15min desde Valles por sierra", queLlevar: ["chamarra", "lámpara", "tenis"], advertencias: "568 escalones para bajar; la subida es AGOTADORA.", datosCuriosos: ["Las aves son VENCEJOS, no golondrinas; el fondo cabe 3 campos de fútbol."] },
  { slug: "cascadas-de-micos", nombre: "Cascadas de Micos", zona: "Ciudad Valles", tipo: "Aventura", descripcion: "Serie de 7 cascadas con circuito de saltos, tirolesa, kayak y skybike.", precioEntrada: "$100 MXN", dificultad: "media", duracionHrs: 4, mejorHora: "09:00 AM", temporadaIdeal: "Todo el año", comoLlegar: "20 min desde Valles · combis $35", queLlevar: ["aqua shoes", "ropa dry-fit"], advertencias: "Chaleco y casco OBLIGATORIO.", datosCuriosos: ["El río más versátil de la zona para deportes de agua."] },
  { slug: "puente-de-dios-tamasopo", nombre: "Puente de Dios (Tamasopo)", zona: "Tamasopo", tipo: "Naturaleza", descripcion: "Poza azul cobalto bajo un puente natural; la luz entra a la cueva entre 11:00–13:00.", precioEntrada: "$150 MXN", dificultad: "media", duracionHrs: 3.5, mejorHora: "11:00–13:00", temporadaIdeal: "Ene–May", comoLlegar: "1h desde Valles por autopista a SLP", queLlevar: ["aqua shoes OBLIGATORIOS", "chaleco"], advertencias: "Corrientes fuertes; seguir la cuerda de seguridad.", datosCuriosos: ["El efecto de luz en la cueva es único en México."] },
  { slug: "zona-arqueologica-tamtoc", nombre: "Zona Arqueológica Tamtoc", zona: "Tamuín", tipo: "Arqueología", descripcion: "El asentamiento prehispánico más importante de la cultura Huasteca.", precioEntrada: "$95 MXN", dificultad: "baja", duracionHrs: 3, mejorHora: "09:00 AM", temporadaIdeal: "Dic–Feb", comoLlegar: "45 min desde Valles", queLlevar: ["sombrero", "agua abundante", "protector solar"], advertencias: "POCA sombra; puede superar 45 °C en mayo. Cerrado lunes.", datosCuriosos: ["El Monumento 32 pesa 30 toneladas."] },
  { slug: "cascadas-de-tamasopo", nombre: "Cascadas de Tamasopo", zona: "Tamasopo", tipo: "Naturaleza", descripcion: "Paraíso de agua azul turquesa con pozas para nadar, ideal para familias.", precioEntrada: "$60 MXN", dificultad: "baja", duracionHrs: 4, mejorHora: "10:00–14:00", temporadaIdeal: "Nov–May", comoLlegar: "45 min desde Valles por autopista", queLlevar: ["traje de baño", "bloqueador biodegradable"], advertencias: "SOLO bloqueador biodegradable.", datosCuriosos: ["Las pozas cambian de color según la estación."] },
  { slug: "balneario-taninul", nombre: "Balneario Taninul", zona: "Ciudad Valles", tipo: "Bienestar", descripcion: "Aguas termales sulfurosas (36 °C constante) y lodo terapéutico.", precioEntrada: "$150 MXN", dificultad: "baja", duracionHrs: 4, mejorHora: "08:00 o 18:00", temporadaIdeal: "Dic–Ene", comoLlegar: "15 min desde Valles", queLlevar: ["traje de baño", "sandalias", "toalla"], advertencias: "NO llevar joyería de plata (el azufre la oscurece).", datosCuriosos: ["El agua mantiene 36 °C constante todo el año."] },
  { slug: "cascadas-minas-viejas", nombre: "Cascadas de Minas Viejas", zona: "El Naranjo", tipo: "Aventura", descripcion: "Dos caídas gemelas de 50 m con pozas turquesa rodeadas de selva preservada.", precioEntrada: "$100 MXN", dificultad: "baja", duracionHrs: 4, mejorHora: "08:00–10:00", temporadaIdeal: "Oct–May", comoLlegar: "105 min desde Valles (desvío El Naranjo)", queLlevar: ["calzado acuático", "bloqueador biodegradable", "cambio de ropa", "efectivo"], advertencias: "Respetar zonas de nado; corrientes fuertes en el canal central. Solo efectivo.", datosCuriosos: ["De las cascadas con el agua más azul de la región."] },
  { slug: "laguna-media-luna", nombre: "Manantial de la Media Luna", zona: "Rioverde", tipo: "Bienestar", descripcion: "Manantial termal cristalino con visibilidad de 30 m y vestigios prehispánicos sumergidos.", precioEntrada: "$150 MXN", dificultad: "baja", duracionHrs: 6, mejorHora: "09:00–11:00", temporadaIdeal: "Todo el año", comoLlegar: "120 min desde Valles (hacia Rioverde)", queLlevar: ["equipo de snorkel", "traje de baño", "efectivo"], advertencias: "Chaleco obligatorio para no-buceadores. Bloqueador químico prohibido.", datosCuriosos: ["Se han hallado ofrendas prehispánicas y posibles restos de mamut en el fondo."] },
  { slug: "cascada-el-aguacate", nombre: "Cascada El Aguacate", zona: "Aquismón", tipo: "Aventura", descripcion: "Caída de 70 m entre cañones de selva densa — un secreto bien guardado de Aquismón.", precioEntrada: "$50 MXN", dificultad: "media", duracionHrs: 3, mejorHora: "15:00–16:30", temporadaIdeal: "Dic–Abr", comoLlegar: "70 min desde Valles (Ejido El Aguacate)", queLlevar: ["calzado de montaña", "agua para 4 h", "repelente"], advertencias: "Senderos resbaladizos, sin señal de celular. Guía local obligatorio.", datosCuriosos: ["Los guías la llaman 'la cascada que los turistas aún no descubrieron'."] },
  { slug: "cascada-el-salto", nombre: "Cascada El Salto", zona: "El Naranjo", tipo: "Naturaleza", descripcion: "Pared kárstica de 70 m con pozas turquesa permanentes (con o sin caída es espectacular).", precioEntrada: "$50 MXN", dificultad: "baja", duracionHrs: 3, mejorHora: "Mañana temprana", temporadaIdeal: "Sep–Oct (cascada activa) · pozas todo el año", comoLlegar: "110 min desde Valles (desde El Naranjo)", queLlevar: ["calzado acuático", "traje de baño", "comida", "efectivo"], advertencias: "Piso muy resbaladizo; la caída principal puede estar seca gran parte del año.", datosCuriosos: ["El flujo se desvía a una hidroeléctrica; por eso 'desaparece' en secas."] },
  { slug: "cascada-el-meco", nombre: "Cascada El Meco", zona: "El Naranjo", tipo: "Aventura", descripcion: "Cascada constante de 35 m — la única de El Naranjo que cae todo el año.", precioEntrada: "$60 MXN", dificultad: "baja", duracionHrs: 2, mejorHora: "17:00–18:00", temporadaIdeal: "Nov–May", comoLlegar: "105 min desde Valles (5 km desde El Naranjo)", queLlevar: ["funda impermeable para el teléfono", "repelente", "efectivo para panga"], advertencias: "Corrientes fuertes en el centro; la panga no opera con río crecido.", datosCuriosos: ["Su nombre viene de los monos 'mecos' (araña) que habitaban la zona."] },
  { slug: "sotano-de-las-huahuas", nombre: "Sótano de las Huahuas", zona: "Aquismón", tipo: "Extrema", descripcion: "Abismo de 478 m donde miles de loros y vencejos dibujan espirales al amanecer y atardecer.", precioEntrada: "$60 MXN", dificultad: "media", duracionHrs: 3, mejorHora: "17:30–18:30 (o amanecer)", temporadaIdeal: "Mar–Oct", comoLlegar: "75 min desde Valles (San Pedro de las Anonas)", queLlevar: ["lámpara", "calzado de montaña", "binoculares", "agua"], advertencias: "Subida intensa; no acercarse al borde sin guía. Sin señal de celular.", datosCuriosos: ["478 m de profundidad; 'huahuas' = loros verdes en lengua Tének."] },
  { slug: "cuevas-de-mantetzulel", nombre: "Cuevas de Mantetzulel", zona: "Aquismón", tipo: "Naturaleza", descripcion: "Cuatro cuevas sagradas con techos colapsados; la luz entra como columnas sólidas.", precioEntrada: "$70 MXN", dificultad: "media", duracionHrs: 4, mejorHora: "11:00–13:00", temporadaIdeal: "Oct–May", comoLlegar: "70 min desde Valles (comunidad Mantetzulel)", queLlevar: ["calzado antideslizante", "linterna", "agua para 4 h"], advertencias: "Senderos muy resbaladizos tras lluvia. Guía comunitario obligatorio.", datosCuriosos: ["Los Tének las consideran portales de curación; aún hay ceremonias."] },
  { slug: "nacimiento-huichihuayan", nombre: "Nacimiento de Huichihuayán", zona: "Huehuetlán", tipo: "Naturaleza", descripcion: "Río cristalino que nace de una cueva; tan claro que se ven los peces desde la orilla.", precioEntrada: "$30 MXN", dificultad: "baja", duracionHrs: 3, mejorHora: "15:00–17:00", temporadaIdeal: "Todo el año", comoLlegar: "80 min desde Valles (hacia Tamazunchale)", queLlevar: ["traje de baño", "sandalias acuáticas", "googles"], advertencias: "Hay zonas profundas cerca del nacimiento; precaución con niños.", datosCuriosos: ["El agua es tan pura que la comunidad la usa para consumo humano."] },
  { slug: "nacimiento-tambaque", nombre: "Nacimiento de Tambaque", zona: "Aquismón", tipo: "Naturaleza", descripcion: "Oasis donde el río Coy brota en pozas azul cristalino con corriente casi nula.", precioEntrada: "$10 MXN", dificultad: "baja", duracionHrs: 3, mejorHora: "09:00–11:00", temporadaIdeal: "Oct–May", comoLlegar: "55 min desde Valles (San Pedro de las Anonas)", queLlevar: ["calzado acuático", "efectivo en cambio", "comida propia"], advertencias: "Agua muy fría (acuífero); entra despacio. Estacionamiento $30 MXN aparte.", datosCuriosos: ["'Tambaque' = 'lugar de agua bajita' en Tének; ideal para niños."] },
  { slug: "voladores-tamaleton", nombre: "Voladores de Tamaletón", zona: "Tancanhuitz", tipo: "Arte & Cultura", descripcion: "Ritual prehispánico Tének: 5 hombres vuelan desde un mástil de 30 m en honor al sol.", precioEntrada: "$100 MXN", dificultad: "baja", duracionHrs: 4, mejorHora: "11:30–13:30", temporadaIdeal: "Dic–Feb", comoLlegar: "52 min desde Valles (Tancanhuitz)", queLlevar: ["efectivo", "ropa para calor", "cámara"], advertencias: "El vuelo se cancela con lluvia/viento y no está garantizado para visitantes individuales.", datosCuriosos: ["El ritual suma 52 vueltas (13×4): el ciclo del Fuego Nuevo mesoamericano."] },
  { slug: "rio-tampaon-rafting", nombre: "Río Tampaón — Rafting Clase III", zona: "Aquismón", tipo: "Aventura", descripcion: "14 km de rápidos Clase III en aguas turquesa por un cañón de 500 m.", precioEntrada: "$1,670 MXN (tour completo)", dificultad: "media", duracionHrs: 7, mejorHora: "11:00–13:00", temporadaIdeal: "Nov–Mar", comoLlegar: "45 min desde Valles (Ejido Tanchachín)", queLlevar: ["calzado acuático con calcetín", "muda seca", "bloqueador biodegradable"], advertencias: "Nunca navegar por cuenta propia en jul–ago (crecidas repentinas). Reservación requerida.", datosCuriosos: ["Considerado uno de los 10 ríos más escénicos de Norteamérica."] },
  { slug: "xilitla-pueblo-magico", nombre: "Xilitla — Pueblo Mágico Surrealista", zona: "Xilitla", tipo: "Arte & Cultura", descripcion: "Las Pozas de Edward James + 3 museos de clase mundial en un Pueblo Mágico.", precioEntrada: "$180 MXN (Las Pozas adulto)", dificultad: "media", duracionHrs: 8, mejorHora: "08:30–10:00", temporadaIdeal: "Nov–Mar", comoLlegar: "90 min desde Valles (Carr. 120)", queLlevar: ["calzado con tracción", "ropa de colores tierra (el musgo mancha)", "efectivo"], advertencias: "No manejar hacia Xilitla después de las 18:00 (sin iluminación, neblina). Las Pozas CIERRA martes.", datosCuriosos: ["Tras la helada de 1962, Edward James construyó flores de concreto que 'nunca morirían'."] },
];

const INFO = {
  empresa: "Tours Huasteca Potosina",
  sitio: "https://www.huasteca-potosina.com",
  zonas: ["Xilitla", "Aquismón", "Ciudad Valles", "Tamasopo", "El Naranjo", "Tamuín", "Rioverde", "Huehuetlán", "Tancanhuitz"],
  mejorTemporada: "La temporada seca (noviembre a abril) suele tener el agua más turquesa y caminos en mejores condiciones.",
  salida: "Salida estándar de los tours: 8:30–9:00 AM.",
  ninos: "Niños 6–10 años pagan 70 % del precio adulto; menores de 6 pagan 50 %.",
  cancelacion: "Cancelación gratis hasta 48 h antes.",
  pagoTours: "Los tours se pagan por tarjeta en línea o por transferencia (cotización con folio).",
  pagoEntradas: "Las entradas a los destinos por tu cuenta suelen ser SOLO EFECTIVO y muchos sitios no tienen cajero.",
  paquetes: "Los paquetes combinan tours + hospedaje en el Hotel Paraíso Encantado (Xilitla) y se confirman por WhatsApp según disponibilidad del hotel (sin pago automático).",
};

function findPaquete(q) {
  const s = String(q || "").toLowerCase().trim();
  return PAQUETES.find((p) => p.id === s || p.nombre.toLowerCase().includes(s)) || null;
}
function findDestino(q) {
  const s = String(q || "").toLowerCase().trim();
  return (
    DESTINOS.find((d) => d.slug === s) ||
    DESTINOS.find((d) => d.nombre.toLowerCase().includes(s)) ||
    DESTINOS.find((d) => s && (d.nombre.toLowerCase().split(/[ (—-]/).some((w) => w.length > 3 && s.includes(w)))) ||
    null
  );
}

module.exports = { PAQUETES, DESTINOS, DESTINO_TOUR, INFO, findPaquete, findDestino };
