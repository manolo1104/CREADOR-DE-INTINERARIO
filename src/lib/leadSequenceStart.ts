/**
 * Arranque de la secuencia de leads: registrar a la persona y mandarle su
 * propuesta EN EL MOMENTO, no en la siguiente corrida del cron.
 *
 * ── Por qué vive aquí y no dentro de la ruta ───────────────────────────────
 *
 * Estaba dentro de `/api/recomendar-tour`. Para ejercitarla había que provocar
 * una llamada a la IA y un envío real por Brevo, así que en la práctica nadie
 * la probaba nunca — y ahí llevaba semanas un fallo que dejaba a casi todo el
 * mundo sin su propuesta al instante. Es la misma señal que ya obligó a sacar
 * dos correos de sus rutas: si para ver algo funcionar hay que provocar un pago
 * o una llamada a un modelo, ese código está en el sitio equivocado.
 *
 * ── El fallo que arregla el "apartado" de abajo ────────────────────────────
 *
 * El recomendador mandaba su primer correo solo si `registrarLead` decía que la
 * fila era NUEVA. Pero el propio formulario llamaba antes a `/api/guardar-email`
 * con la misma fuente ("Recomendador"), que creaba la fila primero. Resultado:
 * `esNuevo` era `false`, la propuesta NO salía, y la persona la recibía hasta
 * la siguiente corrida del cron — hasta una hora después de pedirla.
 *
 * La condición correcta no es "acabo de crear la fila" sino **"a esta persona
 * todavía no le hemos mandado nada"**, y hay que resolverla de forma atómica:
 * el cron horario mira exactamente el mismo `emailsSent: 0`, así que preguntar
 * y después escribir deja una ventana para mandar la propuesta dos veces.
 */

import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildLeadSequenceEmail, PASOS_SECUENCIA } from "@/lib/leadSequenceEmail";
import { registrarLead, esEmailValido, type ContextoLead } from "@/lib/leads";
import { actividad, logger } from "@/lib/logger";

export const FUENTE_RECOMENDADOR = "Recomendador";

export interface ArranqueResultado {
  /** `true` solo si Brevo aceptó el envío en esta llamada. */
  enviado: boolean;
  /**
   * Por qué no se mandó, cuando no se mandó. Sirve para los logs y para que las
   * pruebas puedan afirmar algo más útil que "no pasó nada".
   */
  motivo?: "email-invalido" | "sin-registro" | "sin-tour" | "ya-enviado" | "brevo-falló";
}

/**
 * Registra al lead del recomendador con SU recomendación y le manda el paso 1.
 *
 * Nunca lanza: quien la llama está a mitad de responderle a una persona y un
 * problema nuestro de correo no puede convertirse en un error en su pantalla.
 */
export async function arrancarSecuenciaRecomendador(
  email: unknown,
  ctx: ContextoLead,
): Promise<ArranqueResultado> {
  if (!esEmailValido(email)) return { enviado: false, motivo: "email-invalido" };

  try {
    const registro = await registrarLead(email, FUENTE_RECOMENDADOR, ctx);
    // Sin fila no hay a quién apuntarle el envío ni de dónde reintentarlo.
    if (!registro) return { enviado: false, motivo: "sin-registro" };

    // Van TODAS las respuestas del formulario, no solo dos. Con `dias` de 2 o
    // más, este correo deja de ser "aquí tienes un tour" y arma el viaje día
    // por día; sin `intereses` y sin `origen` no podría decir por qué cada día
    // le toca a él ni dónde le conviene dormir.
    const contenido = buildLeadSequenceEmail({
      paso:           1,
      email,
      grupo:          ctx.grupo          ?? null,
      dias:           ctx.dias           ?? null,
      origen:         ctx.origen         ?? null,
      intereses:      ctx.intereses      ?? [],
      tourPrincipal:  ctx.tourPrincipal  ?? null,
      tourSecundario: ctx.tourSecundario ?? null,
    });
    // Sin tour recomendado no hay nada personalizado que decir. Mejor silencio
    // que un correo genérico: el cron cerrará la secuencia por la misma razón.
    if (!contenido) return { enviado: false, motivo: "sin-tour" };

    // ── El apartado ────────────────────────────────────────────────────────
    // Se sube el contador a 1 ANTES de mandar, y solo si todavía estaba en 0.
    // `updateMany` con la condición dentro del `where` es una sola sentencia:
    // si el cron horario o una segunda pestaña llegan a la vez, uno de los dos
    // se lleva `count: 0` y se calla. Preguntar primero y escribir después
    // dejaría una ventana para mandar la propuesta dos veces.
    const apartado = await prisma.lead.updateMany({
      where: { email, fuente: FUENTE_RECOMENDADOR, emailsSent: 0 },
      data:  { emailsSent: 1, lastEmailAt: new Date() },
    });
    if (apartado.count === 0) return { enviado: false, motivo: "ya-enviado" };

    try {
      await sendBrevoEmail({ to: [{ email }], subject: contenido.subject, htmlContent: contenido.html });
    } catch (e) {
      // Se devuelve el contador a 0 para que el cron lo reintente en la
      // siguiente corrida. Si se quedara en 1, la persona no recibiría nunca su
      // propuesta y la secuencia seguiría en el paso 2 como si sí la tuviera:
      // un registro vivo en un estado del que ningún proceso lo saca.
      await prisma.lead.updateMany({
        where: { email, fuente: FUENTE_RECOMENDADOR },
        data:  { emailsSent: 0, lastEmailAt: null },
      });
      throw e;
    }

    actividad(`📧  SECUENCIA 1/${PASOS_SECUENCIA}`, email, ctx.tourPrincipal ?? "");
    return { enviado: true };
  } catch (e) {
    logger.error("secuencia_lead_paso1_failed", {
      reason: e instanceof Error ? e.message : "desconocido",
    });
    return { enviado: false, motivo: "brevo-falló" };
  }
}
