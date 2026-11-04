// El reloj de los recordatorios dentro del servidor de Railway (que corre
// siempre, no es «serverless»): cada 5 minutos revisa qué seguimientos ya
// tocan. El cron de GitHub es solo respaldo: se atrasa horas.
import { enviarRecordatorios } from "./recordatorios";
import { aplicarReglas, enviarResumenDiario } from "./automatizacionesDatos";

/**
 * Una vuelta del reloj (Fase 3, 4 nov 2026): primero las reglas crean los
 * seguimientos que tocan, después sale el resumen de las 7:30 y al final los
 * recordatorios de lo que ya venció. Cada paso falla solo, sin tumbar al otro.
 */
export async function vueltaDeAvisos() {
  const reglas = await aplicarReglas().catch(e => { console.error("reglas:", (e as Error)?.message); return null; });
  const resumen = await enviarResumenDiario().catch(e => { console.error("resumen diario:", (e as Error)?.message); return null; });
  const avisos = await enviarRecordatorios();
  return { reglas, resumen, avisos };
}

const CADA_MS = 5 * 60_000;
const g = globalThis as unknown as { __recordatoriosHuasteca?: NodeJS.Timeout };

export function iniciarRecordatorios() {
  if (g.__recordatoriosHuasteca) return;
  const correr = () => {
    vueltaDeAvisos()
      .then(({ reglas, resumen, avisos: r }) => {
        if (reglas?.creadas) console.log(`⚙️  Reglas: ${reglas.creadas} seguimiento(s) nuevo(s) ${JSON.stringify(reglas.porRegla)}`);
        if (resumen?.enviados || resumen?.errores.length) console.log(`☀️  Resumen diario: ${resumen.enviados} correo(s)${resumen.errores.length ? ` · errores: ${resumen.errores.join("; ")}` : ""}`);
        if (r.tareas || r.errores.length) console.log(`🔔 Recordatorios: ${r.tareas} seguimiento(s) en ${r.enviados} correo(s)${r.errores.length ? ` · errores: ${r.errores.join("; ")}` : ""}`);
      })
      .catch(e => console.error("recordatorios:", (e as Error)?.message));
  };
  setTimeout(correr, 60_000).unref?.();
  g.__recordatoriosHuasteca = setInterval(correr, CADA_MS);
  g.__recordatoriosHuasteca.unref?.();
}
