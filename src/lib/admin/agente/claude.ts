// Solo servidor: la única puerta a Claude (Fase 4, 4 nov 2026). Antes de cada
// llamada revisa que el agente esté encendido y que quepa en el tope del mes;
// después anota lo que costó. Si algo falla, la operación del panel sigue.
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { cabeEnTope, costoDe, mesMX, TOPE_USD_POR_OMISION, usd, type TareaAgente, type Uso } from "./costos";

export class ErrorAgente extends Error {}

export interface ConfigAgente { encendido: boolean; topeUsd: number }
const CLAVE_CONFIG = "agente:config";

export async function configAgente(): Promise<ConfigAgente> {
  const fila = await prisma.config.findUnique({ where: { key: CLAVE_CONFIG } }).catch(() => null);
  try {
    const v = JSON.parse(fila?.value ?? "{}") as Partial<ConfigAgente>;
    return { encendido: v.encendido !== false, topeUsd: typeof v.topeUsd === "number" && v.topeUsd >= 0 ? v.topeUsd : TOPE_USD_POR_OMISION };
  } catch {
    return { encendido: true, topeUsd: TOPE_USD_POR_OMISION };
  }
}

export async function guardarConfigAgente(c: Partial<ConfigAgente>): Promise<ConfigAgente> {
  const actual = await configAgente();
  const nuevo: ConfigAgente = {
    encendido: typeof c.encendido === "boolean" ? c.encendido : actual.encendido,
    topeUsd: typeof c.topeUsd === "number" && Number.isFinite(c.topeUsd) ? Math.max(0, Math.min(200, Math.round(c.topeUsd * 100) / 100)) : actual.topeUsd,
  };
  const value = JSON.stringify(nuevo);
  await prisma.config.upsert({ where: { key: CLAVE_CONFIG }, update: { value }, create: { key: CLAVE_CONFIG, value } });
  return nuevo;
}

export async function gastoDelMes(mes: string = mesMX()): Promise<number> {
  const r = await prisma.usoClaude.aggregate({ where: { mes }, _sum: { costoUsd: true } });
  return r._sum.costoUsd ?? 0;
}

let cliente: Anthropic | null = null;
function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new ErrorAgente("Falta la llave de Claude (ANTHROPIC_API_KEY) en el servidor.");
  // Reintenta solo los errores pasajeros (429, 5xx, red); 60 s por intento.
  return (cliente ??= new Anthropic({ maxRetries: 2, timeout: 60_000 }));
}

async function anotar(tarea: string, modelo: string, u: Uso | null, ok: boolean, error?: string) {
  await prisma.usoClaude.create({
    data: {
      mes: mesMX(), tarea, modelo, ok, error: error?.slice(0, 300) ?? null,
      entrada: u?.input_tokens ?? 0, salida: u?.output_tokens ?? 0,
      cacheLectura: u?.cache_read_input_tokens ?? 0, cacheEscrita: u?.cache_creation_input_tokens ?? 0,
      costoUsd: u ? costoDe(modelo, u) : 0,
    },
  }).catch(e => console.error("agente: no se anotó el uso:", (e as Error)?.message));
}

export interface PedidoJson {
  tarea: TareaAgente;
  modelo: string;
  system: string;
  mensaje: string;
  /** JSON Schema de la respuesta (con `additionalProperties: false` y todo en `required`). */
  schema: Record<string, unknown>;
  maxTokens: number;
  effort: "low" | "medium" | "high";
  /** Opus 5.5 puede declinar por sus filtros de seguridad: con esto otro modelo lo atiende (decisión por omisión de la guía de la API). */
  conRespaldo?: boolean;
}

/** Pide a Claude una respuesta en JSON con el formato dado, dentro del tope. Lanza ErrorAgente con un mensaje para el panel. */
export async function pedirJson<T>(p: PedidoJson): Promise<T> {
  const cfg = await configAgente();
  if (!cfg.encendido) throw new ErrorAgente("El agente está apagado (se enciende en Agente).");
  const gastado = await gastoDelMes();
  if (!cabeEnTope(gastado, cfg.topeUsd, p.tarea)) throw new ErrorAgente(`Se llegó al tope del mes: ${usd(gastado)} de ${usd(cfg.topeUsd)}. Se reinicia el día 1 o se sube en Agente.`);

  const base = {
    model: p.modelo,
    max_tokens: p.maxTokens,
    system: p.system,
    messages: [{ role: "user" as const, content: p.mensaje }],
    output_config: { effort: p.effort, format: { type: "json_schema" as const, schema: p.schema } },
  };
  let modeloUsado = p.modelo;
  try {
    const r = p.conRespaldo
      ? await claude().beta.messages.create({ ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await claude().messages.create(base);
    modeloUsado = r.model || p.modelo;
    await anotar(p.tarea, modeloUsado, r.usage as Uso, r.stop_reason !== "refusal");
    if (r.stop_reason === "refusal") throw new ErrorAgente("Claude no quiso contestar este chat: que lo atienda una persona.");
    if (r.stop_reason === "max_tokens") throw new ErrorAgente("La respuesta del agente salió incompleta; inténtalo otra vez.");
    let texto = "";
    for (const b of r.content) if (b.type === "text") texto += b.text;
    try { return JSON.parse(texto) as T; }
    catch { throw new ErrorAgente("El agente contestó algo que no se pudo leer."); }
  } catch (e) {
    if (e instanceof ErrorAgente) throw e;
    if (e instanceof Anthropic.APIError) {
      await anotar(p.tarea, modeloUsado, null, false, `${e.status ?? ""} ${e.message}`);
      if (e instanceof Anthropic.AuthenticationError) throw new ErrorAgente("La llave de Claude no es válida.");
      if (e instanceof Anthropic.RateLimitError) throw new ErrorAgente("Claude está saturado: inténtalo en un minuto.");
      if (e instanceof Anthropic.BadRequestError) throw new ErrorAgente("Claude rechazó la petición (revisar el registro del servidor).");
      throw new ErrorAgente("Claude no contestó; inténtalo otra vez.");
    }
    throw e;
  }
}
