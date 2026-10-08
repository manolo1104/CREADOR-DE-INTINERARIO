/**
 * Escapa texto libre antes de meterlo en un HTML armado a mano (el PDF del
 * panel, que se escribe con `document.write`, y los correos).
 *
 * 🔴 Por qué existe: el nombre, las notas o el hotel que escribe un cliente
 * —o que el bot copia tal cual de un WhatsApp— llegan a la base sin filtro. Si
 * alguien escribe `<img src=x onerror=…>` como nombre, abrir su PDF en el panel
 * ejecutaría ese código con la sesión del administrador. Escapado, se imprime
 * como texto y ya.
 *
 * Solo para texto: lo que trae HTML a propósito (plantillas, el catálogo) no
 * pasa por aquí, y nada debe pasar dos veces (saldría `&amp;amp;`).
 * Sin "use client": lo usan igual el panel (navegador) y los correos (servidor).
 */
export function escapeHtml(texto: unknown): string {
  if (texto === null || texto === undefined) return "";
  return String(texto).replace(/[&<>"']/g, c => ESCAPES[c]);
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
