// El reloj de los recordatorios dentro del servidor de Railway (que corre
// siempre, no es «serverless»): cada 5 minutos revisa qué seguimientos ya
// tocan. El cron de GitHub es solo respaldo: se atrasa horas.
import { enviarRecordatorios } from "./recordatorios";

const CADA_MS = 5 * 60_000;
const g = globalThis as unknown as { __recordatoriosHuasteca?: NodeJS.Timeout };

export function iniciarRecordatorios() {
  if (g.__recordatoriosHuasteca) return;
  const correr = () => {
    enviarRecordatorios()
      .then(r => { if (r.tareas || r.errores.length) console.log(`🔔 Recordatorios: ${r.tareas} seguimiento(s) en ${r.enviados} correo(s)${r.errores.length ? ` · errores: ${r.errores.join("; ")}` : ""}`); })
      .catch(e => console.error("recordatorios:", (e as Error)?.message));
  };
  setTimeout(correr, 60_000).unref?.();
  g.__recordatoriosHuasteca = setInterval(correr, CADA_MS);
  g.__recordatoriosHuasteca.unref?.();
}
