// Solo servidor: «Pregúntale al panel» (Fase 4, 4 nov 2026). El agente
// contesta preguntas sobre la operación consultando el panel con herramientas
// de SOLO LECTURA (salidas, reservas, leads, cotizaciones, scorecard). No
// escribe nada. Cada vuelta del ciclo pasa por el tope y anota su costo.
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { salidasEntre } from "../salidasDia";
import { bajoMinimoRentable } from "../salidas";
import { montoCobrado, saldoPendiente } from "../dinero";
import { datosScorecard } from "../scorecardDatos";
import { lunesDe } from "../corteSemanal";
import { fechaLimite } from "../../vencimientoCotizacion";
import { etiquetaEtapa } from "../crm";
import { abrirLlamada, anotarUso, ErrorAgente } from "./claude";
import { MODELO_RESPONDER, type Uso } from "./costos";

const ymd = (v: unknown, porOmision: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : porOmision);
/** Un rango de fechas con tope de 92 días (para no leer toda la base). */
function rango(i: Record<string, unknown>) {
  const desde = ymd(i.desde, hoyMX());
  const hasta = ymd(i.hasta, addDaysYMD(desde, 30));
  return { desde, hasta: hasta > addDaysYMD(desde, 92) ? addDaysYMD(desde, 92) : hasta < desde ? desde : hasta };
}

const obj = (props: Record<string, unknown>, required: string[]) => ({ type: "object" as const, additionalProperties: false, properties: props, required });
const fecha = { type: "string", description: "YYYY-MM-DD" };

const HERRAMIENTAS: Anthropic.Tool[] = [
  { name: "salidas", strict: true, description: "Salidas (tour + día) entre dos fechas: personas, reservas, guía y si van bajo el mínimo de 3. Máximo 92 días.", input_schema: obj({ desde: fecha, hasta: fecha }, ["desde", "hasta"]) },
  { name: "reservas", strict: true, description: "Reservas por fecha de tour entre dos fechas: cliente, tour, personas, total, cobrado, saldo, canal y estado. Máximo 92 días, 60 renglones.", input_schema: obj({ desde: fecha, hasta: fecha }, ["desde", "hasta"]) },
  { name: "leads", strict: true, description: "Leads del CRM. etapa: nuevo, calificado, cotizado, seguimiento, anticipo, confirmado, operado, perdido o «abiertos». buscar: parte del nombre o vacío.", input_schema: obj({ etapa: { type: "string" }, buscar: { type: "string" } }, ["etapa", "buscar"]) },
  { name: "cotizaciones", strict: true, description: "Cotizaciones por estado (borrador, enviada, aceptada, expirada o «todas») con total, fecha del viaje y vencimiento. 40 renglones, las más recientes.", input_schema: obj({ estado: { type: "string" } }, ["estado"]) },
  { name: "scorecard", strict: true, description: "Los KPI de la semana (lunes YYYY-MM-DD de esa semana): embudo, ventas, personas por salida, margen, score y reseñas contra su meta.", input_schema: obj({ semana: fecha }, ["semana"]) },
];

async function ejecutar(nombre: string, i: Record<string, unknown>): Promise<unknown> {
  if (nombre === "salidas") {
    const { desde, hasta } = rango(i);
    return (await salidasEntre(desde, hasta)).map(s => ({ fecha: s.fecha, tour: s.tourNombre, personas: s.personas, reservas: s.pasajeros.length, guia: s.registro.guia || null, bajoMinimo: bajoMinimoRentable(s), noLlegaAlMinimo: s.estadoPax === "no-llega", aMedida: s.aMedida }));
  }
  if (nombre === "reservas") {
    const { desde, hasta } = rango(i);
    const rs = await prisma.tourBooking.findMany({ where: { tourDate: { gte: desde, lte: hasta } }, orderBy: { tourDate: "asc" }, take: 60 });
    return rs.map(r => ({ folio: r.confirmationNumber, cliente: r.customerName, tour: r.tourName, fecha: r.tourDate, personas: r.adults + r.children, total: r.totalAmount, cobrado: montoCobrado(r), saldo: saldoPendiente(r), canal: r.origen, estado: r.status }));
  }
  if (nombre === "leads") {
    const etapa = String(i.etapa ?? "abiertos");
    const buscar = String(i.buscar ?? "").trim();
    const ls = await prisma.oportunidad.findMany({
      where: {
        ...(etapa === "abiertos" ? { etapa: { in: ["nuevo", "calificado", "cotizado", "seguimiento", "anticipo", "confirmado"] } } : { etapa }),
        ...(buscar ? { contacto: { nombre: { contains: buscar, mode: "insensitive" as const } } } : {}),
      },
      include: { contacto: { select: { nombre: true } } }, orderBy: { updatedAt: "desc" }, take: 40,
    });
    return ls.map(l => ({ nombre: l.contacto.nombre, etapa: etiquetaEtapa(l.etapa), tours: l.tours, fechaViaje: l.fechaViaje, personas: l.pax, monto: l.monto, responsable: l.responsable, proximoPaso: l.proximoPaso, proximoPasoEn: l.proximoPasoEn, motivoPerdida: l.motivoPerdida }));
  }
  if (nombre === "cotizaciones") {
    const estado = String(i.estado ?? "todas");
    const qs = await prisma.tourQuote.findMany({ where: estado === "todas" ? {} : { status: estado }, orderBy: { createdAt: "desc" }, take: 40 });
    return qs.map(q => ({ folio: q.quoteNumber, cliente: q.customerName, tour: q.tourName, fechaViaje: q.tourDate, total: q.totalAmount, estado: q.status, vence: fechaLimite(q), creada: q.createdAt.toISOString().slice(0, 10) }));
  }
  if (nombre === "scorecard") {
    const d = await datosScorecard(lunesDe(ymd(i.semana, hoyMX())));
    return { semana: d.semana.etiqueta, kpis: d.scorecard.kpis.map(k => ({ kpi: k.etiqueta, valor: k.valor, contexto: k.contexto, estado: k.estado.texto })), mayorCaida: d.scorecard.mayorCaida };
  }
  return { error: `Herramienta desconocida: ${nombre}` };
}

const SYSTEM = [
  "Eres el asistente de operaciones del panel de Huasteca Potosina Tours. Contestas preguntas de Manolo sobre la operación consultando el panel con tus herramientas (solo lectura).",
  "Usa SOLO lo que devuelven las herramientas; si no alcanza para contestar, dilo y di qué faltaría. No inventes cifras.",
  "Contesta en español, corto y directo: primero la respuesta, luego el detalle en viñetas si hace falta. Cantidades en pesos con $ y comas.",
].join("\n");

/** Contesta una pregunta (con el historial corto de la plática). Máximo 6 vueltas de herramientas. */
export async function preguntarAlPanel(pregunta: string, historial: { rol: "user" | "assistant"; texto: string }[] = []): Promise<{ respuesta: string; consultas: string[]; costoUsd: number }> {
  const q = pregunta.trim().slice(0, 1000);
  if (!q) throw new ErrorAgente("Escribe la pregunta.");
  const messages: Anthropic.MessageParam[] = [
    ...historial.slice(-6).map(h => ({ role: h.rol, content: h.texto.slice(0, 2000) })),
    { role: "user", content: `Hoy es ${hoyMX()} (hora de México).\n\n${q}` },
  ];
  const consultas: string[] = [];
  let costo = 0;
  const { costoDe } = await import("./costos");
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const claude = await abrirLlamada("preguntar");
    let r: Anthropic.Message;
    try {
      r = await claude.messages.create({ model: MODELO_RESPONDER, max_tokens: 8000, system: SYSTEM, tools: HERRAMIENTAS, messages, output_config: { effort: "low" } });
    } catch (e) {
      await anotarUso("preguntar", MODELO_RESPONDER, null, false, (e as Error)?.message);
      throw new ErrorAgente("Claude no contestó; inténtalo otra vez.");
    }
    await anotarUso("preguntar", r.model, r.usage as Uso, r.stop_reason !== "refusal");
    costo += costoDe(r.model, r.usage as Uso);
    if (r.stop_reason === "refusal") throw new ErrorAgente("Claude no quiso contestar esa pregunta.");
    // Todo el contenido de vuelta, sin tocarlo (el razonamiento se conserva entre vueltas).
    messages.push({ role: "assistant", content: r.content });
    if (r.stop_reason === "pause_turn") continue;
    const usos = r.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (r.stop_reason !== "tool_use" || !usos.length) {
      const respuesta = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n").trim();
      return { respuesta: respuesta || "No encontré cómo contestar eso con los datos del panel.", consultas, costoUsd: costo };
    }
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const u of usos) {
      consultas.push(`${u.name}(${Object.values(u.input as Record<string, unknown>).filter(Boolean).join(", ")})`);
      try {
        const datos = await ejecutar(u.name, u.input as Record<string, unknown>);
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(datos).slice(0, 40_000) });
      } catch (e) {
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: `Error al consultar: ${(e as Error)?.message}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: resultados });
  }
  throw new ErrorAgente("La pregunta necesitó demasiadas consultas; hazla más concreta.");
}
