const WA_NUMBER = "524891090388";

export function waLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WA_MESSAGES = {
  tourGeneral:
    "Hola, quiero información sobre los tours de la Huasteca. ¿Qué opciones tienen disponibles?",

  tour: (tourName: string, adultos: number, ninos: number, total: number) =>
    `Hola, me interesa el tour "${tourName}" para ${adultos} adulto${adultos > 1 ? "s" : ""}${
      ninos > 0 ? ` y ${ninos} niño${ninos > 1 ? "s" : ""}` : ""
    }. Total estimado: $${total.toLocaleString("es-MX")} MXN. ¿Tienen disponibilidad?`,

  /**
   * El mensaje de la ficha con lo que la persona YA eligió en el módulo:
   * fecha, adultos y niños, y el total que vio. Clarity (11–28 oct 2026): el
   * mensaje fijo decía siempre «2 adultos» y sin fecha, y el equipo tenía que
   * volver a preguntar lo que el sitio ya sabía. Sin fecha elegida, pregunta
   * por fechas; «me hospedo en» va vacío para que lo llene quien escribe.
   */
  tourConFecha: (
    locale: "es" | "en",
    tourName: string,
    fecha: string,
    adultos: number,
    ninos: number,
    total: number,
  ) => {
    const en = locale === "en";
    const dia = fecha ? fechaParaMensaje(fecha, locale) : "";
    const gente = en
      ? `${adultos} adult${adultos === 1 ? "" : "s"}${ninos > 0 ? ` and ${ninos} child${ninos === 1 ? "" : "ren"}` : ""}`
      : `${adultos} adulto${adultos === 1 ? "" : "s"}${ninos > 0 ? ` y ${ninos} niño${ninos === 1 ? "" : "s"}` : ""}`;
    const monto = `$${total.toLocaleString(en ? "en-US" : "es-MX")} MXN`;
    if (en) {
      return dia
        ? `Hi, I'd like to book "${tourName}" on ${dia} for ${gente} (total shown: ${monto}). Is it available? I'm staying at: `
        : `Hi, I'm interested in "${tourName}" for ${gente} (total shown: ${monto}). Which dates are available? I'm staying at: `;
    }
    return dia
      ? `Hola, quiero reservar "${tourName}" el ${dia} para ${gente} (total que vi: ${monto}). ¿Hay lugar? Me hospedo en: `
      : `Hola, me interesa "${tourName}" para ${gente} (total que vi: ${monto}). ¿Qué fechas tienen? Me hospedo en: `;
  },

  destino: (destinoName: string) =>
    `Hola, me interesa visitar ${destinoName}. ¿En qué tour puedo incluirlo y cuánto cuesta?`,

  itinerario:
    "Hola, acabo de crear mi itinerario personalizado en la página y me gustaría cotizarlo con ustedes.",

  flotante:
    "Hola, quiero información sobre los tours de la Huasteca Potosina.",

  // Alias para compatibilidad con nuevos componentes
  general:
    "Hola, quiero información sobre los tours de la Huasteca. ¿Qué opciones tienen disponibles?",

  /**
   * Grupos (escuelas, empresas, agencias). Pide de entrada los tres datos sin
   * los que no se puede cotizar: fechas, cuántos son y de dónde salen. Las dos
   * organizadoras reales del 11 sep tardaron varios mensajes en darlos, y una
   * de ellas escribió primero para preguntar por cortesías. Que el primer
   * mensaje ya los traiga ahorra tres idas y vueltas.
   */
  grupos:
    "Hola, quiero cotizar un viaje de grupo a la Huasteca Potosina.\n\n" +
    "· Fechas aproximadas:\n" +
    "· Número de personas (aprox.):\n" +
    "· Ciudad de salida:\n" +
    "· Tipo de grupo (escuela, empresa, familia, agencia):\n" +
    "· Días que tenemos:",

  /**
   * Quien llega por la guía de Xantolo (la página más visitada del sitio). Como
   * el de grupos, pide de entrada lo que hace falta para armarle el viaje: con
   * eso el equipo contesta con un plan y no con tres preguntas.
   */
  xantolo:
    "Hola, quiero ir al Xantolo 2026 (31 oct – 2 nov). ¿Me ayudan a armar el viaje?\n\n" +
    "· Cuántos somos:\n" +
    "· Noches que tenemos:\n" +
    "· Ciudad de salida:\n" +
    "· ¿Ya tenemos hospedaje? (sí/no):",

  faq: (tour: string, pregunta: string) =>
    `Hola, tengo una pregunta sobre el tour "${tour}": ${pregunta}`,
};

/** «sábado 14 de noviembre» / «Saturday, November 14» a partir de YYYY-MM-DD, sin zona horaria de por medio. */
export function fechaParaMensaje(ymd: string, locale: "es" | "en"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const f = new Date(y, m - 1, d, 12);
  return f.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long" });
}
