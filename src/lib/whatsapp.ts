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

  faq: (tour: string, pregunta: string) =>
    `Hola, tengo una pregunta sobre el tour "${tour}": ${pregunta}`,
};
