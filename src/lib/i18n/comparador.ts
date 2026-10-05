/**
 * Textos del comparador (/comparar y /en/comparar), en los dos idiomas.
 *
 * El inglés tiene que tener EXACTAMENTE las mismas claves que el español
 * (`ComparadorUI = typeof ES`): si falta una, no compila, en vez de salir en
 * blanco en producción.
 *
 * 🔴 Cero guiones largos en todo lo que se pinta (regla de Manolo para lo
 * nuevo). Lo que viene del catálogo ya trae los suyos y pasa por `sinRaya`.
 *
 * Es un módulo puro: lo leen el servidor (la tabla) y el navegador (el
 * contador de gente, los totales, el cierre), cada uno con su `locale`.
 */
import type { Locale } from "./config";
import type { Grupo } from "../comparador";

const lista = (items: string[], locale: Locale) =>
  new Intl.ListFormat(locale === "en" ? "en" : "es-MX", { type: "conjunction" }).format(items);

const ES = {
  meta: {
    title: "Compara tours de la Huasteca Potosina: precio y duración",
    description:
      "Pon lado a lado los recorridos y paquetes de la Huasteca Potosina: precio para tu grupo, duración, qué incluye, a qué hora sales y qué visitas.",
    breadcrumb: "Comparar recorridos",
  },
  hero: {
    recorridos: { antes: "Compara los recorridos ", em: "lado a lado" },
    paquetes:   { antes: "Compara los paquetes ", em: "lado a lado" },
    sub: "Precio para tu grupo, duración, qué incluye y qué visitas. Cambia cualquier columna y el total se recalcula.",
  },
  pestanas: { recorridos: "Recorridos", paquetes: "Paquetes", aria: "Qué quieres comparar" },
  atajos: {
    titulo: "Comparaciones rápidas",
    masReservados: "Los más reservados",
    aventura: "Aventura",
    extremo: "Actividades extremas",
  },
  grupo: {
    titulo: "¿Cuántos viajan?",
    cambiar: "Cambiar",
    listo: "Listo",
    adultos: "Adultos",
    de6a10: "De 6 a 10 años",
    menoresDe6: "Menores de 6",
    menos: (etiqueta: string) => `Uno menos: ${etiqueta.toLowerCase()}`,
    mas: (etiqueta: string) => `Uno más: ${etiqueta.toLowerCase()}`,
    resumen: (g: Grupo) => {
      const partes = [`${g.adultos} ${g.adultos === 1 ? "adulto" : "adultos"}`];
      if (g.ninosMid) partes.push(`${g.ninosMid} de 6 a 10 años`);
      if (g.ninosSmall) partes.push(`${g.ninosSmall} ${g.ninosSmall === 1 ? "menor" : "menores"} de 6`);
      return `Para ${lista(partes, "es")}`;
    },
    tope: (n: number) => `¿Son más de ${n}? Escríbenos y lo armamos.`,
    notaPaquetes: "Los paquetes se arman desde 2 adultos.",
  },
  columnas: {
    comparando: "Comparando",
    cambiar: (nombre: string) => `Cambiar ${nombre}`,
    quitar: (nombre: string) => `Quitar ${nombre}`,
    agregarRecorrido: "Agregar otro recorrido",
    agregarPaquete: "Agregar otro paquete",
    enEstaComparacion: "En esta comparación",
    paquetes: "Paquetes",
    ocultasEnCelular: (nombres: string[]) =>
      `En el celular se ven dos a la vez. Para ver ${lista(nombres, "es")}, elígelo en uno de los selectores.`,
  },
  secciones: {
    esencial: "Lo esencial",
    dia: "Tu día",
    viaje: "El viaje",
    incluye: "Qué incluye",
    antes: "Antes de reservar",
  },
  filas: {
    enUnaFrase: "En una frase",
    precio: "Precio",
    total: "Total para tu grupo",
    duracion: "Duración",
    dificultad: "Dificultad",
    salida: "Sales",
    regreso: "Regresas aprox.",
    recogida: "Cómo llegas",
    visitas: "Lo que visitas",
    grupo: "Tamaño del grupo",
    edad: "Edad",
    privado: "Formato privado",
    incluidoEnTodos: "Incluido en todos",
    ademas: "Además incluye",
    opcionales: "Opcionales con costo aparte",
    noIncluye: "No incluye",
    cancelacion: "Cancelación",
    apartar: "Para apartar",
    idealPara: "Ideal para",
    ahorro: "Ahorro para 2 frente a reservar por separado",
    diaPorDia: "Día por día",
  },
  valores: {
    enTodos: "En todos",
    nadaMas: "Nada más",
    ninguno: "Ninguno",
    preguntanos: "Pregúntanos",
    nuevo: "Recorrido nuevo",
    desde: "Desde",
    porPersona: "por persona",
    porPareja: "por pareja",
    promo: (hasta: string) => `Precio de temporada baja hasta el ${hasta}`,
    duracionIgual: (h: string) => `${h} h aprox.`,
    duracionRango: (a: string, b: string) => `${a} a ${b} h`,
    duracionRuta: (a: string, b: string) => `${a} a ${b} h según la ruta`,
    actividadHoras: (h: string) => `Unas ${h} h de actividad`,
    horarioFijo: (h: string) => `Horario fijo: ${h}`,
    grupoVehiculo: "Según el vehículo que elijas",
    grupoRango: (a: number, b: number) => `De ${a} a ${b} personas`,
    grupoHasta: (n: number) => `Hasta ${n} personas`,
    privadoGrupo: "Ya es privado: la tarifa es del grupo completo",
    privadoSi: (extra: string) => `Disponible: precio del recorrido + ${extra} por persona`,
    privadoNo: "No disponible",
    edadMinima: (n: number) => `Desde ${n} años`,
    edadSoloAdultos: (n: number) => `Desde ${n} años, sin tarifa de niño`,
    edadVehiculo: "Niños según el vehículo; el conductor, mayor de edad",
    edadGrupo: "Todas las edades; cada niño cuenta en la tarifa del grupo",
    edadNinos: "Niños con tarifa especial",
    edadRecomendada: (n: number) => `Recomendado desde ${n} años`,
    apartar: "Con el 30 % de anticipo",
    ahorro: (monto: string, pct: number) => `Ahorras ${monto} (${pct} %)`,
    sinAhorro: "Sin ahorro que destacar",
    dia: (n: number, titulo: string) => `Día ${n}: ${titulo}`,
    opcional: (nombre: string, precio: string) => `${nombre}: +${precio} MXN por persona`,
  },
  recogida: {
    hospedaje: "Pasamos por ti a tu hospedaje en Xilitla o Ciudad Valles",
    hospedajeCiudad: (ciudad: string) => `Pasamos por ti a tu hospedaje en ${ciudad}`,
    hospedajeXilitla: "Pasamos por ti a tu hospedaje en Xilitla",
    baseXilitla: "Nos vemos en nuestra base en Xilitla",
    enSitio: (lugar: string) => `Nos vemos en ${lugar}`,
    conVehiculo: (texto: string, vehiculo: string) => `${texto}, en ${vehiculo}`,
    sinTraslado: "El transporte hasta Xilitla no está incluido.",
    porTuCuenta: "Llegas por tu cuenta.",
  },
  total: {
    paraTuGrupo: "para tu grupo",
    porGrupo: "Tarifa del grupo completo",
    habitaciones: (n: number) => (n === 1 ? "Incluye 1 habitación" : `Incluye ${n} habitaciones`),
    vehiculo: (desde: string) => `Desde ${desde} por vehículo. Eliges ruta y vehículo al reservar.`,
    edadMinima: (n: number) => `Es desde ${n} años: no va con menores de 6.`,
    maximo: (n: number) => `Máximo ${n} personas por salida.`,
    minimo: (n: number) => `Sale a partir de ${n} personas.`,
    escribenos: "Escríbenos",
    waGrande: (n: number, tour: string) => `Hola, somos ${n} y nos interesa ${tour}. ¿Cómo lo armamos para todo el grupo?`,
    noDisponible: "Este grupo no se puede cotizar en línea.",
  },
  cta: {
    reservar: "Reservar",
    verFicha: "Ver ficha",
    verPaquete: "Ver día por día",
  },
  cierre: {
    titulo: "¿Sigues entre dos?",
    texto: "Mándanos tu comparación por WhatsApp y te decimos cuál le va mejor a tu grupo.",
    whatsapp: "Preguntar por WhatsApp",
    mensajeWa: (nombres: string[], grupo: string) =>
      `Hola, estoy comparando ${lista(nombres, "es")} (${grupo.charAt(0).toLowerCase()}${grupo.slice(1)}). ¿Cuál me recomiendan?`,
    compartirTitulo: { recorridos: "Comparación de recorridos", paquetes: "Comparación de paquetes" },
    compartirTexto: (nombres: string[]) => `Mira esta comparación: ${lista(nombres, "es")}`,
    moneda: "Todos los importes están en pesos mexicanos (MXN).",
  },
  entradas: {
    favoritos: "Compara estos 3 lado a lado",
    parecidos: "Comparar con parecidos",
    ficha: "Compáralos lado a lado",
    paquetes: "Comparar paquetes lado a lado",
    pie: "Comparar tours y paquetes",
    recomendador: "Compara tus dos opciones lado a lado",
  },
};

export type ComparadorUI = typeof ES;

const EN: ComparadorUI = {
  meta: {
    title: "Compare Huasteca Potosina tours: price and length",
    description:
      "Put Huasteca Potosina tours and packages side by side: price for your group, length, what's included, start time and the places you visit.",
    breadcrumb: "Compare tours",
  },
  hero: {
    recorridos: { antes: "Compare tours ", em: "side by side" },
    paquetes:   { antes: "Compare packages ", em: "side by side" },
    sub: "Price for your group, length, inclusions and stops. Swap any column and the total updates.",
  },
  pestanas: { recorridos: "Tours", paquetes: "Packages", aria: "What do you want to compare" },
  atajos: {
    titulo: "Quick comparisons",
    masReservados: "Most booked",
    aventura: "Adventure",
    extremo: "Extreme activities",
  },
  grupo: {
    titulo: "How many are traveling?",
    cambiar: "Change",
    listo: "Done",
    adultos: "Adults",
    de6a10: "Ages 6 to 10",
    menoresDe6: "Under 6",
    menos: (etiqueta: string) => `One less: ${etiqueta.toLowerCase()}`,
    mas: (etiqueta: string) => `One more: ${etiqueta.toLowerCase()}`,
    resumen: (g: Grupo) => {
      const partes = [`${g.adultos} ${g.adultos === 1 ? "adult" : "adults"}`];
      if (g.ninosMid) partes.push(`${g.ninosMid} aged 6 to 10`);
      if (g.ninosSmall) partes.push(`${g.ninosSmall} under 6`);
      return `For ${lista(partes, "en")}`;
    },
    tope: (n: number) => `More than ${n}? Message us and we'll set it up.`,
    notaPaquetes: "Packages start at 2 adults.",
  },
  columnas: {
    comparando: "Comparing",
    cambiar: (nombre: string) => `Change ${nombre}`,
    quitar: (nombre: string) => `Remove ${nombre}`,
    agregarRecorrido: "Add another tour",
    agregarPaquete: "Add another package",
    enEstaComparacion: "In this comparison",
    paquetes: "Packages",
    ocultasEnCelular: (nombres: string[]) =>
      `Phones show two at a time. To see ${lista(nombres, "en")}, pick it in one of the selectors.`,
  },
  secciones: {
    esencial: "The essentials",
    dia: "Your day",
    viaje: "The trip",
    incluye: "What's included",
    antes: "Before you book",
  },
  filas: {
    enUnaFrase: "In a nutshell",
    precio: "Price",
    total: "Total for your group",
    duracion: "Duration",
    dificultad: "Difficulty",
    salida: "Departure",
    regreso: "Back around",
    recogida: "Getting there",
    visitas: "What you'll see",
    grupo: "Group size",
    edad: "Ages",
    privado: "Private option",
    incluidoEnTodos: "Included in all",
    ademas: "Also includes",
    opcionales: "Optional extras",
    noIncluye: "Not included",
    cancelacion: "Cancellation",
    apartar: "To book",
    idealPara: "Best for",
    ahorro: "Savings for 2 vs. booking separately",
    diaPorDia: "Day by day",
  },
  valores: {
    enTodos: "Same for all",
    nadaMas: "Nothing else",
    ninguno: "None",
    preguntanos: "Ask us",
    nuevo: "New tour",
    desde: "From",
    porPersona: "per person",
    porPareja: "per couple",
    promo: (hasta: string) => `Low-season price until ${hasta}`,
    duracionIgual: (h: string) => `About ${h} h`,
    duracionRango: (a: string, b: string) => `${a} to ${b} h`,
    duracionRuta: (a: string, b: string) => `${a} to ${b} h depending on the route`,
    actividadHoras: (h: string) => `About ${h} h of activity`,
    horarioFijo: (h: string) => `Fixed schedule: ${h}`,
    grupoVehiculo: "Depends on the vehicle you choose",
    grupoRango: (a: number, b: number) => `${a} to ${b} people`,
    grupoHasta: (n: number) => `Up to ${n} people`,
    privadoGrupo: "Already private: the rate covers the whole group",
    privadoSi: (extra: string) => `Available: tour price + ${extra} per person`,
    privadoNo: "Not available",
    edadMinima: (n: number) => `Ages ${n}+`,
    edadSoloAdultos: (n: number) => `Ages ${n}+, no child rate`,
    edadVehiculo: "Kids depending on the vehicle; the driver must be an adult",
    edadGrupo: "All ages; each child counts toward the group rate",
    edadNinos: "Kids at a reduced rate",
    edadRecomendada: (n: number) => `Recommended from age ${n}`,
    apartar: "With a 30% deposit",
    ahorro: (monto: string, pct: number) => `You save ${monto} (${pct}%)`,
    sinAhorro: "No notable savings",
    dia: (n: number, titulo: string) => `Day ${n}: ${titulo}`,
    opcional: (nombre: string, precio: string) => `${nombre}: +${precio} MXN per person`,
  },
  recogida: {
    hospedaje: "We pick you up at your lodging in Xilitla or Ciudad Valles",
    hospedajeCiudad: (ciudad: string) => `We pick you up at your lodging in ${ciudad}`,
    hospedajeXilitla: "We pick you up at your lodging in Xilitla",
    baseXilitla: "We meet at our base in Xilitla",
    enSitio: (lugar: string) => `We meet at ${lugar}`,
    conVehiculo: (texto: string, vehiculo: string) => `${texto}, in an ${vehiculo}`,
    sinTraslado: "Transport to Xilitla isn't included.",
    porTuCuenta: "You make your own way there.",
  },
  total: {
    paraTuGrupo: "for your group",
    porGrupo: "Rate for the whole group",
    habitaciones: (n: number) => (n === 1 ? "Includes 1 room" : `Includes ${n} rooms`),
    vehiculo: (desde: string) => `From ${desde} per vehicle. You pick the route and vehicle when you book.`,
    edadMinima: (n: number) => `Ages ${n}+: not for children under 6.`,
    maximo: (n: number) => `Up to ${n} people per departure.`,
    minimo: (n: number) => `Runs from ${n} people.`,
    escribenos: "Message us",
    waGrande: (n: number, tour: string) => `Hi, there are ${n} of us and we're interested in ${tour}. How can we set it up for the whole group?`,
    noDisponible: "This group can't be priced online.",
  },
  cta: {
    reservar: "Book",
    verFicha: "See details",
    verPaquete: "See day by day",
  },
  cierre: {
    titulo: "Still torn between two?",
    texto: "Send us your comparison on WhatsApp and we'll tell you which one suits your group best.",
    whatsapp: "Ask on WhatsApp",
    mensajeWa: (nombres: string[], grupo: string) =>
      `Hi, I'm comparing ${lista(nombres, "en")} (${grupo.charAt(0).toLowerCase()}${grupo.slice(1)}). Which one would you recommend?`,
    compartirTitulo: { recorridos: "Tour comparison", paquetes: "Package comparison" },
    compartirTexto: (nombres: string[]) => `Take a look at this comparison: ${lista(nombres, "en")}`,
    moneda: "All amounts are in Mexican pesos (MXN).",
  },
  entradas: {
    favoritos: "Compare these 3 side by side",
    parecidos: "Compare with similar tours",
    ficha: "Compare them side by side",
    paquetes: "Compare packages side by side",
    pie: "Compare tours and packages",
    recomendador: "Compare your two options side by side",
  },
};

export function comparadorUI(locale: Locale): ComparadorUI {
  return locale === "en" ? EN : ES;
}
