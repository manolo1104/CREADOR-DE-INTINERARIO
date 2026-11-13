// Simulador del puente: prueba la Bandeja SIN tocar WhatsApp (ni el número del
// negocio). Habla con el panel igual que `index.js`.
//
//   PANEL_URL=http://localhost:3399 WHATSAPP_PUENTE_TOKEN=… node simulador.js entra 4891234567 "Hola, me interesa el tour…" [nombre]
//   … node simulador.js celular 4891234567 "Te mando la info"     (lo que Erick escribe desde su celular)
//   … node simulador.js puente                                      (manda lo que espera en cola y lo marca leído)
//   … node simulador.js qr | conectado | desconectado
const PANEL = (process.env.PANEL_URL || "http://localhost:3399").replace(/\/$/, "");
const TOKEN = process.env.WHATSAPP_PUENTE_TOKEN || "";
const [, , accion, tel, texto, nombre] = process.argv;

async function panel(method, body) {
  const r = await fetch(`${PANEL}/api/whatsapp/puente`, { method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  return { status: r.status, j };
}
const chatDe = (t) => `52${String(t).replace(/\D/g, "").slice(-10)}@c.us`;
const id = () => `SIM_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
// Un PNG de 1×1: basta para ver el recuadro del QR en el panel.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

(async () => {
  let r;
  if (accion === "entra" || accion === "celular") {
    r = await panel("POST", { eventos: [{ tipo: "mensaje", waId: id(), chatId: chatDe(tel), telefono: null, nombre: nombre || null, deNosotros: accion === "celular", tipoMensaje: "chat", texto, fecha: Date.now() }] });
  } else if (accion === "puente") {
    const p = await panel("GET");
    const pendientes = (p.j && p.j.pendientes) || [];
    const hechos = pendientes.map((x) => ({ id: x.id, ok: true, waId: id() }));
    r = await panel("POST", { confirmar: hechos });
    if (hechos.length) await panel("POST", { eventos: hechos.map((h) => ({ tipo: "ack", waId: h.waId, estado: "leido" })) });
    r.j = { ...r.j, enviados: pendientes.map((x) => `${x.chatId}: ${x.texto.slice(0, 60)}`) };
  } else if (["qr", "conectado", "desconectado"].includes(accion)) {
    r = await panel("POST", { eventos: [{ tipo: "conexion", estado: accion, qr: accion === "qr" ? PNG : null, numero: accion === "conectado" ? "524891090388" : null }] });
  } else {
    console.log("Uso: node simulador.js entra|celular <tel> <texto> [nombre] · puente · qr · conectado · desconectado");
    process.exit(1);
  }
  console.log(r.status, JSON.stringify(r.j));
})();
