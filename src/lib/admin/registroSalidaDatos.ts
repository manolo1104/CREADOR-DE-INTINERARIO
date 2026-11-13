// Solo servidor: guarda lo operativo de una salida (lote 6, 10 nov 2026). Lo
// llama el PATCH de «Salidas del día»; vive aquí para poder probarlo contra la
// base local sin pasar por Next.
import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { registrarEnBitacora } from "./bitacora";
import { checklistDe, type ItemChecklist } from "./checklistSalida";
import { limpiarIncidencias, type Incidencia } from "./incidencias";
import { esPrivadaDeCatalogo, guiaDeSalida, reservasQueTomanElGuia, salidaCancelada } from "./salidas";
import { reservasDeSalida, type RegistroSalida } from "./salidasDia";
import { aplicarAlRegistro } from "./registroSalida";
import { tareaSalidaCancelada } from "./automatizaciones";
import { TOURS_LISTA } from "@/lib/tours";

/** Cuántas veces se reintenta si otra persona guardó la misma salida en medio (con una espera corta y al azar entre una y otra). */
const INTENTOS = 12;
const esperar = (intento: number) => new Promise(r => setTimeout(r, 10 + Math.random() * 30 * Math.min(intento, 5)));

export type GuardadoSalida =
  | { ok: true; registro: RegistroSalida; guiaDeReservas: boolean; avisoGuia: string | null; checklist: ItemChecklist[]; incidencias: Incidencia[] }
  | { ok: false; error: string; status: number };

const idUnico = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Guarda lo operativo de una salida; el registro nace al primer toque.
 *
 * 🔴 Sin pisarse (lote 6): antes se leía el checklist, se le aplicaba el cambio
 * y se escribía todo; si dos personas marcaban a la vez, la segunda borraba lo
 * de la primera (lo mismo con las incidencias). Ahora se escribe solo si la
 * `version` sigue siendo la que se leyó; si no, se vuelve a leer y se aplica
 * encima.
 *
 * Un solo guía (lote 6): el que se asigna aquí se escribe también en sus
 * reservas. Marcarla «Cancelada» con reservas activas no frena nada: deja un
 * seguimiento a Operación para avisar y reprogramar o reembolsar.
 */
export async function guardarRegistroSalida(
  clave: string,
  body: Record<string, unknown>,
  sesion: { nombre: string; rol: string } | null,
  ahora: Date = new Date(),
): Promise<GuardadoSalida> {
  const fecha = clave.slice(0, 10);
  const tourSlug = clave.split("|")[1] ?? "";
  const quien = sesion?.nombre ?? "Desconocido";
  const reservas = await reservasDeSalida(clave).catch(() => []);
  const folios = reservas.map(r => r.folio);

  let s: Awaited<ReturnType<typeof prisma.salida.findUnique>> = null;
  let previoEstado: string | null = null;
  let previoGuia: string | null = null;
  let aplicado: Exclude<ReturnType<typeof aplicarAlRegistro>, { error: string }> | null = null;
  for (let intento = 0; intento < INTENTOS && !s; intento++) {
    if (intento > 0) await esperar(intento);
    const previo = await prisma.salida.findUnique({ where: { clave } });
    const r = aplicarAlRegistro(previo, body, { tourSlug, quien, rol: sesion?.rol, ahora, idNuevo: idUnico() });
    if ("error" in r) return { ok: false, error: r.error, status: r.status };
    aplicado = r;
    previoEstado = previo?.estado ?? null;
    previoGuia = previo?.guia ?? null;
    // Las reservas de hoy, para reconocer el registro si mañana cambia su clave.
    const data: Record<string, unknown> = { ...r.data, ...(folios.length ? { folios } : {}) };
    if (!previo) {
      try {
        s = await prisma.salida.create({
          // El Edén nace «privada» aunque no se haya tocado el tipo.
          data: { clave, tourSlug, fecha, ...(esPrivadaDeCatalogo(tourSlug) && data.tipo === undefined ? { tipo: "privada" } : {}), ...data, version: 1 },
        });
      } catch (e) {
        // Otra persona lo creó en ese mismo instante: se vuelve a leer y se aplica encima.
        if ((e as { code?: string })?.code !== "P2002") throw e;
      }
      continue;
    }
    const n = await prisma.salida.updateMany({
      where: { id: previo.id, version: previo.version },
      data: { ...data, version: (previo.version ?? 0) + 1 },
    });
    if (n.count === 1) s = await prisma.salida.findUnique({ where: { id: previo.id } });
  }
  if (!s || !aplicado) return { ok: false, error: "Alguien más guardó esta salida al mismo tiempo. Vuelve a intentarlo.", status: 409 };

  // Un solo guía: lo asignado aquí queda también en sus reservas (Calendario, Reservas, PDF).
  // Las de un viaje de varios días que traen otro guía no se tocan: es el de
  // sus otros días (revisión 10 nov 2026, `reservasQueTomanElGuia`).
  const guiaNueva = aplicado.data.guia;
  const toman = guiaNueva !== undefined ? reservasQueTomanElGuia(reservas, previoGuia) : [];
  if (toman.length) {
    await prisma.tourBooking.updateMany({ where: { id: { in: toman.map(r => r.id) } }, data: { guia: (guiaNueva as string | null) ?? null } })
      .catch(e => console.error("guía en las reservas:", (e as Error)?.message));
  }
  const guiasReservas = reservas.map(r => ({ folio: r.folio, guia: toman.includes(r) ? (guiaNueva as string | null) : r.guia, otrosDias: r.otrosDias }));

  // Cancelada con reservas vivas: no se bloquea nada, se deja el seguimiento (regla 8 del plan).
  if (aplicado.data.estado !== undefined && salidaCancelada(String(aplicado.data.estado)) && !salidaCancelada(previoEstado)) {
    const tour = TOURS_LISTA.find(t => t.slug === tourSlug)?.nombreCorto || tourSlug;
    const t = tareaSalidaCancelada({ clave, fecha, tour, folios }, hoyMX());
    if (t) {
      await prisma.tarea.create({
        data: { titulo: t.titulo.slice(0, 200), responsable: t.responsable, vence: t.vence, salidaClave: clave, origen: "regla", regla: t.regla, claveRegla: t.claveRegla, creadaPor: quien },
      }).catch(e => { if ((e as { code?: string })?.code !== "P2002") console.error("tarea de salida cancelada:", (e as Error)?.message); });
    }
  }

  const cambios = Object.keys(aplicado.data).filter(k => k !== "checklist" && k !== "incidencias");
  await registrarEnBitacora({
    accion: "modificó", entidad: "salida", referencia: clave,
    resumen: `Salida ${tourSlug} del ${fecha}: ${[
      ...cambios,
      ...(toman.length ? [`guía también en ${toman.map(r => r.folio).join(", ")}`] : []),
      ...(aplicado.checklist ? ["checklist"] : []),
      ...(aplicado.incidencia ? [`incidencia ${aplicado.incidencia}`] : []),
    ].join(", ") || "sin cambios"}`,
  });

  const guia = guiaDeSalida(s.guia, guiasReservas);
  return {
    ok: true,
    registro: { tipo: s.tipo, guia: guia.guia, vehiculo: s.vehiculo ?? "", estado: s.estado, notas: s.notas ?? "" },
    guiaDeReservas: guia.deReservas,
    avisoGuia: guia.aviso,
    checklist: checklistDe(tourSlug, s.checklist),
    incidencias: limpiarIncidencias(s.incidencias),
  };
}

/**
 * El guía que se asigna en una reserva se refleja en sus salidas (lote 6, 10
 * nov 2026): Salidas del día, Inicio y el correo de las 7:30 dicen el mismo que
 * Reservas y el Calendario. Solo las salidas que ya tienen registro; las demás
 * lo toman solas de la reserva. Solo de hoy en adelante (lo de días pasados es
 * historia) y sin pisar el guía propio de una salida. No lanza.
 */
export async function reflejarGuiaEnSalidas(claves: string[], guia: string | null, anterior: string | null = null): Promise<void> {
  if (!claves.length) return;
  // 🔴 Solo las salidas sin guía o con el que tenía la reserva (revisión 10 nov
  // 2026): una salida con guía propio (otro día del viaje, u otra reserva que
  // comparte la camioneta) no se pisa; si no coincide, la salida lo avisa.
  const ant = (anterior ?? "").trim();
  await prisma.salida.updateMany({
    where: { clave: { in: claves }, OR: [{ guia: null }, { guia: "" }, ...(ant ? [{ guia: { equals: ant, mode: "insensitive" as const } }] : [])] },
    data: { guia: (guia ?? "").trim() || null },
  }).catch(e => console.error("guía en las salidas:", (e as Error)?.message));
}
