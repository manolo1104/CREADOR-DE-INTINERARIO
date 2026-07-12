// Presencia en vivo REAL: cuenta las sesiones que dieron "latido" en los últimos
// minutos (visitantes navegando ahora). En memoria del proceso Node — persiste
// entre requests en el server de Railway. NO es un contador inventado: si nadie
// está navegando, el conteo es 0.
const activos = new Map<string, number>(); // sid → última vez visto (ms)
const VENTANA_MS = 4 * 60 * 1000; // 4 min sin latido = ya no está "ahora"

export function marcarActivo(sid: string): void {
  if (!sid || sid === "anonymous" || sid === "ssr") return;
  activos.set(sid, Date.now());
  // poda oportunista para que el Map no crezca indefinidamente
  if (activos.size > 500) contarActivos();
}

export function contarActivos(): number {
  const corte = Date.now() - VENTANA_MS;
  let n = 0;
  activos.forEach((t, sid) => {
    if (t < corte) activos.delete(sid);
    else n++;
  });
  return n;
}
