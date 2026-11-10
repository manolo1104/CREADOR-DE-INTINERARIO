// Lo que un guardado de «Salidas del día» le hace al registro de la salida
// (`Salida`): guía, vehículo, estado, tipo, notas, checklist e incidencias.
// Puro: el servidor lo aplica sobre lo GUARDADO en ese momento y, si alguien
// guardó en medio, lo vuelve a aplicar sobre lo nuevo (`registroSalidaDatos.ts`).
// Lo prueba `__tests__/salidasOperacion.test.ts`.
import { checklistDe, limpiarChecklist, paraGuardar } from "./checklistSalida";
import { limpiarIncidencias, nuevaIncidencia } from "./incidencias";

export const ESTADOS_SALIDA = ["programada", "confirmada", "operada", "cancelada"] as const;
export const TIPOS_SALIDA = ["fija", "privada"] as const;

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Lo guardado antes (o null si la salida no tiene registro todavía). */
export interface RegistroPrevio { checklist?: unknown; incidencias?: unknown }

export interface ContextoGuardado {
  tourSlug: string;
  quien: string;
  rol: string | null | undefined;
  ahora: Date;
  /** Para los renglones nuevos (checklist propio, incidencia): único aunque dos se guarden en el mismo milisegundo. */
  idNuevo: string;
}

export type ResultadoGuardado =
  | { data: Record<string, unknown>; checklist: boolean; incidencia: "anotada" | "quitada" | null }
  | { error: string; status: number };

/**
 * Los campos a escribir. Un renglón del checklist o una incidencia se aplican
 * sobre `previo` (lo guardado AHORA), nunca sobre lo que tenía el navegador:
 * así dos personas marcando a la vez no se pisan.
 */
export function aplicarAlRegistro(previo: RegistroPrevio | null, body: Record<string, unknown>, c: ContextoGuardado): ResultadoGuardado {
  // El guía marca el checklist, escribe notas y anota incidencias; asignar
  // guía, vehículo, estado o tipo es de Operación.
  if (c.rol === "guia" && ["guia", "vehiculo", "estado", "tipo"].some(k => body[k] !== undefined)) {
    return { error: "Eso lo asigna Operación.", status: 403 };
  }
  const data: Record<string, unknown> = {};
  if (body.guia !== undefined) data.guia = texto(body.guia, 80) || null;
  if (body.vehiculo !== undefined) data.vehiculo = texto(body.vehiculo, 80) || null;
  if (body.notas !== undefined) data.notas = texto(body.notas, 1000) || null;
  if (body.estado !== undefined) {
    if (!(ESTADOS_SALIDA as readonly string[]).includes(String(body.estado))) return { error: "Estado no válido.", status: 400 };
    data.estado = body.estado;
  }
  if (body.tipo !== undefined) {
    if (!(TIPOS_SALIDA as readonly string[]).includes(String(body.tipo))) return { error: "Tipo no válido.", status: 400 };
    data.tipo = body.tipo;
  }

  let checklist = false;
  // Un renglón a la vez: { marcar: { clave, hecho } } o { agregar: "texto" }.
  if (body.marcar !== undefined || body.agregar !== undefined) {
    let lista = checklistDe(c.tourSlug, previo?.checklist);
    const m = body.marcar as { clave?: unknown; hecho?: unknown } | undefined;
    if (m) {
      if (!lista.some(i => i.clave === m.clave)) return { error: "Ese punto ya no está en la lista.", status: 400 };
      const en = c.ahora.toISOString();
      lista = lista.map(i => i.clave !== m.clave ? i : m.hecho ? { ...i, hecho: true, por: c.quien, en } : { ...i, hecho: false, por: undefined, en: undefined });
    }
    if (body.agregar !== undefined) {
      const nuevoTexto = texto(body.agregar, 120);
      if (!nuevoTexto) return { error: "Escribe el punto.", status: 400 };
      lista = [...lista, { clave: `x-${c.idNuevo}`, texto: nuevoTexto, hecho: false, propio: true }];
    }
    data.checklist = paraGuardar(lista);
    checklist = true;
  } else if (body.checklist !== undefined) {
    // La lista entera (formato de antes): se respeta quién y cuándo de lo ya marcado.
    const en = c.ahora.toISOString();
    const antes = checklistDe(c.tourSlug, previo?.checklist);
    const nuevo = limpiarChecklist(body.checklist).map(i => {
      const a = antes.find(x => x.clave === i.clave);
      return i.hecho && !a?.hecho ? { ...i, por: c.quien, en } : i.hecho ? { ...i, por: a?.por ?? i.por, en: a?.en ?? i.en } : { ...i, por: undefined, en: undefined };
    });
    data.checklist = paraGuardar(nuevo);
    checklist = true;
  }

  // Incidencias: { incidencia: { tipo, gravedad, causa, accion } } la anota con
  // quién y cuándo (el guía también); { quitarIncidencia: id } la quita (solo Operación).
  let incidencia: "anotada" | "quitada" | null = null;
  if (body.incidencia !== undefined || body.quitarIncidencia !== undefined) {
    if (body.quitarIncidencia !== undefined && c.rol === "guia") return { error: "Eso lo quita Operación.", status: 403 };
    let lista = limpiarIncidencias(previo?.incidencias);
    if (body.incidencia !== undefined) {
      const nueva = nuevaIncidencia(body.incidencia, c.quien, c.ahora, `i-${c.idNuevo}`);
      if ("error" in nueva) return { error: nueva.error, status: 400 };
      lista = [...lista, nueva];
      incidencia = "anotada";
    }
    if (body.quitarIncidencia !== undefined) {
      lista = lista.filter(i => i.id !== String(body.quitarIncidencia));
      incidencia = incidencia ?? "quitada";
    }
    data.incidencias = lista;
  }
  return { data, checklist, incidencia };
}
