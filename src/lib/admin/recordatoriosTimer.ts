// El reloj de los recordatorios dentro del servidor de Railway (que corre
// siempre, no es «serverless»): cada 5 minutos revisa qué seguimientos ya
// tocan. El cron de GitHub es solo respaldo: se atrasa horas.
import { enviarRecordatorios } from "./recordatorios";
import { aplicarReglas, enviarResumenDiario } from "./automatizacionesDatos";
import { operarViajesPasados } from "./crmDatos";
import { enmascararTexto } from "@/lib/logger";

/**
 * Una vuelta del reloj (Fase 3, 4 nov 2026). PRIMERO pasan a Operado los leads
 * cuyo último tour ya pasó (19 nov 2026, Manolo: «si se operó el sábado, el
 * domingo a las 12am ya tiene que aparecer en operado»): con el reloj cada
 * 5 minutos, un tour del sábado queda en Operado hacia las 00:05 del domingo
 * (hora de México) aunque nadie abra Leads, y las reglas de esa misma vuelta ya
 * lo ven así. Después las reglas crean los seguimientos que tocan, sale el
 * resumen de las 7:30 y al final los recordatorios de lo que ya venció. Cada
 * paso falla solo, sin tumbar al otro (lote 9, 10 nov 2026: el último sí
 * tumbaba la vuelta y el cron daba error).
 */
export async function vueltaDeAvisos() {
  const operados = await operarViajesPasados().catch(e => { console.error("operados:", (e as Error)?.message); return 0; });
  const reglas = await aplicarReglas().catch(e => { console.error("reglas:", (e as Error)?.message); return null; });
  const resumen = await enviarResumenDiario().catch(e => { console.error("resumen diario:", (e as Error)?.message); return null; });
  const avisos = await enviarRecordatorios().catch(e => { console.error("recordatorios:", (e as Error)?.message); return { tareas: 0, enviados: 0, errores: [String((e as Error)?.message ?? e)] }; });
  return { operados, reglas, resumen, avisos };
}

const CADA_MS = 5 * 60_000;
const g = globalThis as unknown as { __recordatoriosHuasteca?: NodeJS.Timeout };

export function iniciarRecordatorios() {
  if (g.__recordatoriosHuasteca) return;
  const correr = () => {
    vueltaDeAvisos()
      .then(({ operados, reglas, resumen, avisos: r }) => {
        if (operados) console.log(`🏁 Operados: ${operados} lead(s) pasaron a Operado (su último tour ya pasó)`);
        if (reglas?.creadas) console.log(`⚙️  Reglas: ${reglas.creadas} seguimiento(s) nuevo(s) ${JSON.stringify(reglas.porRegla)}`);
        if (reglas?.cerradas) console.log(`⚙️  Reglas: ${reglas.cerradas} seguimiento(s) cerrados porque ya no aplicaban`);
        if (resumen?.enviados || resumen?.errores.length) console.log(`☀️  Resumen diario: ${resumen.enviados} correo(s)${resumen.errores.length ? ` · errores: ${enmascararTexto(resumen.errores.join("; "))}` : ""}`);
        if (r.tareas || r.errores.length) console.log(`🔔 Recordatorios: ${r.tareas} seguimiento(s) en ${r.enviados} correo(s)${r.errores.length ? ` · errores: ${enmascararTexto(r.errores.join("; "))}` : ""}`);
      })
      .catch(e => console.error("recordatorios:", (e as Error)?.message));
  };
  setTimeout(correr, 60_000).unref?.();
  // El agente (Fase 4) cada minuto: lee los chats con mensajes nuevos y llena el lead. Respeta el tope y el apagado.
  const agente = () => {
    import("./agente/calidad").then(m => m.reporteDelJueves()).then(r => { if (r) console.log(`📋 Reporte de los jueves: ${r.hallazgos} hallazgos`); })
      .catch(e => console.error("reporte del jueves:", (e as Error)?.message));
    import("./agente/copiloto").then(m => m.vueltaAgente())
      .then(r => { if (r.leidos || r.detenido) console.log(`🤖 Agente: ${r.leidos} chat(s) leídos, ${r.llenados} lead(s) con datos nuevos${r.detenido ? ` · detenido: ${r.detenido}` : ""}`); })
      .catch(e => console.error("agente:", (e as Error)?.message));
  };
  setInterval(agente, 60_000).unref?.();
  g.__recordatoriosHuasteca = setInterval(correr, CADA_MS);
  g.__recordatoriosHuasteca.unref?.();
}
