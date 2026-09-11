const WA_NUMBER = "524891251458";

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

  faq: (tour: string, pregunta: string) =>
    `Hola, tengo una pregunta sobre el tour "${tour}": ${pregunta}`,
};
