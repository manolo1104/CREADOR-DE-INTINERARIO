// Las reglas que crean seguimientos SOLAS (Fase 3 del rediseño, 4 nov 2026).
// Puro: lo usan el reloj del servidor y las pruebas. Cada regla devuelve
// tareas con una `claveRegla` única: la base no deja crear dos veces la misma
// (aunque el reloj y el cron de respaldo coincidan), y una ya hecha no renace.
//
// Lo que manda mensajes al CLIENTE (confirmaciones de 48/24 h por WhatsApp,
// plantillas de seguimiento) espera la conexión con Meta (Fase 2.3). Mientras,
// estas reglas le dejan la tarea a una persona.
import { addDaysYMD, diffDiasYMD } from "@/lib/dates";
import { esLigaAutomatica } from "./ligasReglas";

/** Quién recibe lo que no tiene dueño: el operador. */
export const RESPONSABLE_OPERACION = "Erick";
/** Quién registra el dinero: los saldos vencidos son suyos. */
export const RESPONSABLE_COBROS = "Manolo";

export type ReglaClave = "cotizado-24h" | "saldo-vencido" | "liga-24h" | "salida-48h" | "agrupar-salidas" | "minimo-7d" | "salida-cancelada" | "lectura-google" | "corte-lunes" | "consulta-nueva" | "revision-jueves" | "tours-sin-costos";

/** Quién cierra el corte semanal (el socio que captura los costos). */
export const RESPONSABLE_CORTE = "Martín";
/** Quién hace la revisión del jueves (el dueño: el score del operador). */
export const RESPONSABLE_REVISION = "Manolo";

export const REGLAS: { clave: ReglaClave; etiqueta: string; detalle: string }[] = [
  { clave: "cotizado-24h", etiqueta: "Cotizado sin respuesta 24 h", detalle: "Su cotización salió hace 24 h, el lead sigue en Cotizado y no tiene ningún seguimiento pendiente (un borrador sin mandar no cuenta)." },
  { clave: "saldo-vencido", etiqueta: "Saldo vencido", detalle: "El tour ya pasó y la reserva tiene saldo sin registrar." },
  { clave: "liga-24h", etiqueta: "Liga de pago sin pagar 24 h", detalle: "Se mandó una liga de pago hace 24 h y no se ha pagado (no si su lead está Perdido: la liga sigue cobrando, pero no se le insiste; ni la que salió sola con la cotización mientras su lead sigue en Cotizado: ahí ya va «¿la vio?»)." },
  { clave: "salida-48h", etiqueta: "Confirmar salida (48 h)", detalle: "Pasado mañana sale un tour: confirmar a los clientes punto de encuentro, hora y qué llevar." },
  { clave: "agrupar-salidas", etiqueta: "Juntar salidas", detalle: "El mismo tour a 3 días o menos, una salida bajo el mínimo (el del tour si es mayor: rafting 5, rappel 4) y juntas caben: proponerle al grupo más chico cambiarse de fecha (un guía y una camioneta menos)." },
  // Lote 6 (10 nov 2026): el mínimo del tour y las salidas canceladas.
  { clave: "minimo-7d", etiqueta: "No llega al mínimo (7 días)", detalle: "Falta una semana o menos y la salida va por debajo del mínimo del tour (rafting 5, rappel 4): confirmar que corre, juntarla con otra fecha o reembolsar." },
  { clave: "salida-cancelada", etiqueta: "Salida cancelada con reservas", detalle: "Se marcó «Cancelada» una salida que todavía tiene reservas activas: avisar a cada cliente y reprogramar o reembolsar desde Reservas." },
  // Indicadores (4 nov 2026): los datos que se capturan a mano y sin los que un KPI sale «Sin dato».
  { clave: "lectura-google", etiqueta: "Lectura semanal de Google", detalle: "Si la última lectura de reseñas de Google tiene más de 6 días: anotar la calificación y el número de reseñas (KPI «Reseñas»)." },
  { clave: "corte-lunes", etiqueta: "Corte del lunes", detalle: "La semana terminó y su corte no está cerrado: cerrarlo (KPIs «Margen del corte» y «Cortes cerrados a tiempo»)." },
  // 5 nov 2026: un «¡gracias!» después del viaje ya no abre un lead nuevo.
  { clave: "consulta-nueva", etiqueta: "¿Consulta nueva?", detalle: "Escribe por WhatsApp alguien cuyo lead se cerró (Operado o Perdido) hace menos de 14 días: en vez de abrirle otro lead, se le pregunta a Operación si es un viaje nuevo." },
  // Lote 9 (10 nov 2026): los otros dos datos que se capturan a mano.
  { clave: "revision-jueves", etiqueta: "Revisión del jueves", detalle: "Llegó el jueves y la revisión de la semana no se ha guardado: capturarla en Inicio (KPIs «Score del operador» y, de respaldo, leads y respuesta en 5 min)." },
  { clave: "tours-sin-costos", etiqueta: "Tours sin costos", detalle: "Hay tours del catálogo sin costos en el Cotizador: capturarlos (KPI «Tours con margen medido»; sin ellos no se sabe cuánto deja cada tour). Uno al mes mientras falten." },
];

/** Quién «hace» un seguimiento automático que se cerró solo porque su motivo desapareció. */
export const HECHA_POR_REGLA = "Regla (ya no aplica)";

/**
 * Quién «hace» un seguimiento vencido que puso una persona y se cerró solo
 * porque el lead pagó (revisión del 20 nov 2026, `seguimientosQueCierraElPago`
 * en `crm.ts`). Nadie lo hizo: los KPIs no lo cuentan como seguimiento hecho.
 * El reloj nunca lo reabre: solo reabre los `HECHA_POR_REGLA` de sus reglas.
 */
export const HECHA_POR_PAGO = "Regla (ya pagó)";

/** Lo que se sabe hoy del motivo de un seguimiento automático. `undefined` = no se pudo leer. */
export interface HechosSeguimiento {
  /** cotizado-24h, consulta-nueva y liga-24h: la etapa de su lead. */
  etapaLead?: string | null;
  /** consulta-nueva: el contacto ya tiene un lead abierto (el mismo revivido u otro nuevo). */
  contactoConLeadAbierto?: boolean;
  /** liga-24h: activo | pagado | cancelado; null si la liga ya no existe. */
  ligaEstado?: string | null;
  /** liga-24h: la liga salió sola con la cotización (`esLigaAutomatica`). */
  ligaAutomatica?: boolean;
  /** saldo-vencido: lo que falta cobrar; null si la reserva ya no existe o se canceló. */
  saldo?: number | null;
  /** salida-48h, agrupar-salidas y minimo-7d: el día de la salida. */
  fechaSalida?: string | null;
  /** salida-48h, agrupar-salidas y minimo-7d: la salida se marcó «Cancelada». */
  salidaCancelada?: boolean;
  /** minimo-7d: ya llegó al mínimo, o Operación ya la confirmó (o la operó). */
  minimoResuelto?: boolean;
  /** corte-lunes: ¿ya se cerró ese corte? */
  corteCerrado?: boolean;
  /** lectura-google: ¿ya hay una lectura de los últimos 6 días? */
  lecturaReciente?: boolean;
  /** revision-jueves: ¿ya se guardó la revisión de esa semana? */
  revisionGuardada?: boolean;
  /** tours-sin-costos: cuántos tours activos siguen sin costos, y si la tarea es de un mes que ya pasó. */
  toursSinCostos?: number;
  deOtroMes?: boolean;
}

/**
 * ¿El motivo de este seguimiento automático ya desapareció? (5 nov 2026: antes
 * se quedaban pendientes para siempre, salían como «Vencidos» en el resumen de
 * las 7:30 y Erick perseguía cosas resueltas). Con un dato que no se pudo leer
 * (`undefined`) nunca se cierra. Las tareas que piden que una persona decida
 * (p. ej. «pagó la liga pero no se pudo pasar a reserva») no se cierran solas.
 */
export function yaNoAplica(regla: string | null, h: HechosSeguimiento, hoy: string): boolean {
  switch (regla) {
    case "cotizado-24h": return h.etapaLead !== undefined && h.etapaLead !== "cotizado";
    case "consulta-nueva": return h.contactoConLeadAbierto === true;
    // Lead Perdido (19 nov 2026): ya no se le insiste con la liga. La liga no
    // se apaga: si paga tarde, el pago revive el lead solo. La que salió sola
    // con la cotización y su lead sigue en Cotizado: la cubre «¿la vio?» (20 nov 2026).
    case "liga-24h": return (h.ligaEstado !== undefined && h.ligaEstado !== "activo") || h.etapaLead === "perdido" || ligaCubiertaPorCotizado(h.ligaAutomatica, h.etapaLead);
    case "saldo-vencido": return h.saldo !== undefined && !(h.saldo !== null && h.saldo > 0);
    case "salida-48h":
    case "agrupar-salidas":
    case "minimo-7d":
      // Una salida cancelada ya no se confirma, ni se junta, ni se discute su mínimo (lote 6).
      if (h.salidaCancelada === true || (regla === "minimo-7d" && h.minimoResuelto === true)) return true;
      return typeof h.fechaSalida === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.fechaSalida) && h.fechaSalida < hoy;
    case "corte-lunes": return h.corteCerrado === true;
    case "lectura-google": return h.lecturaReciente === true;
    case "revision-jueves": return h.revisionGuardada === true;
    // La del mes pasado cede su lugar a la de este mes (si todavía faltan).
    case "tours-sin-costos": return h.deOtroMes === true || h.toursSinCostos === 0;
    default: return false;
  }
}

/**
 * El seguimiento de «¿es consulta nueva?» (`consulta-nueva`). `por: "web"`: volvió
 * al sitio y dejó sus datos (carrito, pago o recomendador) con su lead Perdido
 * hace poco (revisión del 5 nov 2026): si paga en línea, ese lead vuelve solo.
 */
export function tituloConsultaNueva(cliente: string, etapa: string, por: "whatsapp" | "web" = "whatsapp"): string {
  if (por === "web") return `¿Consulta nueva? ${cliente} volvió al sitio y dejó sus datos, y su lead está ${etapa}. Escríbele; si paga en línea, su lead vuelve solo.`.slice(0, 200);
  return `¿Consulta nueva? ${cliente} volvió a escribir por WhatsApp y su lead está ${etapa}. Si quiere otro viaje, «Nueva cotización» le abre un lead nuevo; si no, márcalo hecho.`.slice(0, 200);
}

export interface TareaPorRegla {
  claveRegla: string;
  regla: ReglaClave;
  titulo: string;
  responsable: string;
  vence: string;
  oportunidadId?: string | null;
  salidaClave?: string | null;
}

/**
 * Desde cuándo espera respuesta un lead en Cotizado (19 nov 2026): desde que su
 * cotización SALIÓ, no desde que entró a la etapa. Desde ese día el lead pasa a
 * Cotizado al CREAR la cotización, y a un borrador que nadie ha mandado no se
 * le pregunta «¿la vio?».
 *  - `entro`: cuándo pasó a Cotizado (ms).
 *  - `envios`: cuándo salió cada cotización del lead (ms); 0 = salió antes de
 *    que producción guardara esa fecha (las de antes del 19 nov, ver
 *    `ENVIO_SE_GUARDA_DESDE` en `crm.ts`).
 * El primer envío desde que entró; si todas salieron antes (alguien lo regresó
 * a Cotizado a mano), desde que entró; sin ningún envío, null.
 */
export function esperaRespuestaDesde(entro: number, envios: number[]): number | null {
  if (!envios.length) return null;
  const despues = envios.filter(t => t >= entro).sort((a, b) => a - b)[0];
  return despues ?? entro;
}

export interface LeadCotizado {
  id: string;
  responsable: string | null;
  /** El cambio a Cotizado más reciente (su id va en la clave de la tarea). */
  cotizadoId: string;
  /** Desde cuándo espera respuesta: el primer envío de su cotización (ver `esperaRespuestaDesde`). */
  cotizadoEn: Date;
  /** Seguimientos pendientes del lead. */
  pendientes: number;
  cliente: string;
  folio: string | null;
  fechaViaje: string | null;
}

/**
 * Cotizado 24 h sin seguimiento → tarea para hoy (regla del prompt: «Cotizado
 * sin respuesta 24 h → tarea de seguimiento», y «ninguna cotización pasa del día
 * 3 sin seguimiento»). Las 24 h cuentan desde que la cotización salió (19 nov
 * 2026, `esperaRespuestaDesde`). Si el viaje ya pasó, no hay nada que seguir.
 */
export function reglaCotizado(leads: LeadCotizado[], ahora: Date, hoy: string, responsables: string[]): TareaPorRegla[] {
  return leads
    .filter(l => l.pendientes === 0 && ahora.getTime() - l.cotizadoEn.getTime() >= 24 * 3600_000)
    .filter(l => !l.fechaViaje || l.fechaViaje >= hoy)
    .map(l => ({
      claveRegla: `cotizado-24h:${l.cotizadoId}`,
      regla: "cotizado-24h" as const,
      titulo: `Seguimiento a la cotización${l.folio ? ` ${l.folio}` : ""}: ¿la vio? ¿qué le falta para reservar?`,
      responsable: l.responsable && responsables.includes(l.responsable) ? l.responsable : RESPONSABLE_OPERACION,
      vence: hoy,
      oportunidadId: l.id,
    }));
}

export interface ReservaConSaldo {
  id: string;
  folio: string;
  cliente: string;
  ultimoDia: string;
  saldo: number;
  oportunidadId: string | null;
}

/** Tour ya pasado con saldo → tarea de cobrarlo o registrarlo («no hay saldos vencidos sin tarea»). */
export function reglaSaldo(reservas: ReservaConSaldo[], hoy: string): TareaPorRegla[] {
  return reservas
    .filter(r => r.saldo > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.ultimoDia) && r.ultimoDia < hoy)
    .map(r => ({
      claveRegla: `saldo-vencido:${r.id}`,
      regla: "saldo-vencido" as const,
      titulo: `Saldo de $${Math.round(r.saldo).toLocaleString("es-MX")} de ${r.folio} (${r.cliente}): cobrarlo o registrarlo en Reservas`,
      responsable: RESPONSABLE_COBROS,
      vence: hoy,
      oportunidadId: r.oportunidadId,
    }));
}

export interface LigaActiva {
  id: string;
  titulo: string;
  cliente: string | null;
  monto: number;
  creadaEn: Date;
  creadoPor: string | null;
  oportunidadId: string | null;
  /** La etapa de su lead (ya normalizada: «anticipo» llega como «confirmado»), o null si no tiene lead. */
  etapaLead?: string | null;
}

/**
 * ¿El recordatorio de esta liga ya lo cubre el «¿la vio?» de su cotización?
 * (revisión del 20 nov 2026). Desde el 19 nov la liga que sale sola con la
 * cotización deja el lead en Cotizado, y a las 24 h tocaban DOS tareas por la
 * misma cotización: «¿la vio?» y «la liga no se ha pagado». Mientras el lead
 * siga en Cotizado manda la primera; la de una persona (Cobros, la ficha) sigue igual.
 */
export function ligaCubiertaPorCotizado(automatica: boolean | null | undefined, etapaLead: string | null | undefined): boolean {
  return automatica === true && etapaLead === "cotizado";
}

/**
 * Liga sin pagar 24 h → tarea de recordarle al cliente con fecha límite. No si
 * su lead está Perdido (19 nov 2026: la liga sigue cobrando, pero no se le
 * insiste) ni si la cubre el «¿la vio?» (`ligaCubiertaPorCotizado`).
 */
export function reglaLiga(ligas: LigaActiva[], ahora: Date, hoy: string, responsables: string[]): TareaPorRegla[] {
  return ligas
    .filter(l => l.etapaLead !== "perdido" && !ligaCubiertaPorCotizado(esLigaAutomatica(l.creadoPor), l.etapaLead))
    .filter(l => ahora.getTime() - l.creadaEn.getTime() >= 24 * 3600_000)
    .map(l => ({
      claveRegla: `liga-24h:${l.id}`,
      regla: "liga-24h" as const,
      titulo: `La liga de pago de $${Math.round(l.monto).toLocaleString("es-MX")}${l.cliente ? ` (${l.cliente})` : ""} no se ha pagado: recordarle con fecha límite`,
      responsable: l.creadoPor && responsables.includes(l.creadoPor) ? l.creadoPor : RESPONSABLE_OPERACION,
      vence: hoy,
      oportunidadId: l.oportunidadId,
    }));
}

export interface SalidaProxima { clave: string; fecha: string; tour: string; personas: number; reservas: number }

/** Pasado mañana (o mañana) sale un tour con gente → tarea de confirmarles, mientras no haya plantillas de WhatsApp. */
export function reglaSalida(salidas: SalidaProxima[], hoy: string): TareaPorRegla[] {
  return salidas
    .filter(s => s.personas > 0 && diffDiasYMD(hoy, s.fecha) >= 1 && diffDiasYMD(hoy, s.fecha) <= 2)
    .map(s => ({
      claveRegla: `salida-48h:${s.clave}`,
      regla: "salida-48h" as const,
      titulo: `Confirmar ${s.tour} del ${s.fecha} (${s.reservas} ${s.reservas === 1 ? "reserva" : "reservas"}, ${s.personas} pax): punto de encuentro, hora y qué llevar`,
      responsable: RESPONSABLE_OPERACION,
      vence: addDaysYMD(s.fecha, -2) < hoy ? hoy : addDaysYMD(s.fecha, -2),
      salidaClave: s.clave,
    }));
}

export interface SalidaConMinimo { clave: string; fecha: string; tour: string; personas: number; minimo: number | null; estado?: string | null }

/** Cuántos días antes se avisa que una salida no llega al mínimo de su tour. */
export const DIAS_AVISO_MINIMO = 7;

/**
 * «No llega al mínimo» a 7 días (lote 6, 10 nov 2026): una salida por debajo
 * del mínimo de su tour (rafting 5, rappel 4) a una semana o menos → tarea a
 * Operación para decidir a tiempo: confirmar que corre, juntarla o reembolsar.
 * Una que Operación ya marcó Confirmada, Operada o Cancelada no la pide.
 */
export function reglaMinimo(salidas: SalidaConMinimo[], hoy: string): TareaPorRegla[] {
  return salidas
    .filter(s => s.minimo !== null && s.personas > 0 && s.personas < s.minimo)
    .filter(s => !["confirmada", "operada", "cancelada"].includes(s.estado ?? ""))
    .filter(s => diffDiasYMD(hoy, s.fecha) >= 1 && diffDiasYMD(hoy, s.fecha) <= DIAS_AVISO_MINIMO)
    .map(s => ({
      claveRegla: `minimo-7d:${s.clave}`,
      regla: "minimo-7d" as const,
      titulo: `${s.tour} del ${s.fecha} va con ${s.personas} de ${s.minimo} mínimo: confirmar que corre, juntarla con otra fecha o reembolsar`,
      responsable: RESPONSABLE_OPERACION,
      vence: hoy,
      salidaClave: s.clave,
    }));
}

/**
 * La `claveRegla` de un seguimiento cuando su salida cambia de clave
 * (revisión del lote 6, 10 nov 2026). La regla vuelve a crear la tarea por
 * `salida-48h:<clave nueva>`; si solo se movía `salidaClave`, la de la clave
 * vieja seguía viva y salían DOS «Confirmar salida» (o dos «No llega al
 * mínimo»). Sin la clave vieja dentro, se queda igual.
 */
export function claveReglaConSalidaNueva(claveRegla: string | null, vieja: string, nueva: string): string | null {
  if (!claveRegla || !vieja || !claveRegla.includes(vieja)) return claveRegla;
  return claveRegla.split(vieja).join(nueva);
}

/** La tarea que deja una salida marcada «Cancelada» que todavía tiene reservas activas (no bloquea: avisa). */
export function tareaSalidaCancelada(s: { clave: string; fecha: string; tour: string; folios: string[] }, hoy: string): TareaPorRegla | null {
  if (!s.folios.length) return null;
  return {
    claveRegla: `salida-cancelada:${s.clave}`,
    regla: "salida-cancelada",
    titulo: `Se canceló la salida de ${s.tour} del ${s.fecha} y tiene ${s.folios.length === 1 ? "1 reserva activa" : `${s.folios.length} reservas activas`} (${s.folios.join(", ")}): avisar al cliente y reprogramar o reembolsar desde Reservas`,
    responsable: RESPONSABLE_OPERACION,
    vence: hoy,
    salidaClave: s.clave,
  };
}

/**
 * La lectura de Google de la semana (4 nov 2026): las reseñas se anotan a mano
 * (decisión de Manolo, 21 oct) y sin lectura el KPI «Reseñas» no se mide. Una
 * tarea por semana (`lectura-google:<lunes>`), solo si la última tiene más de 6 días.
 */
export function reglaLecturaGoogle(ultimaLectura: string | null, hoy: string, lunes: string): TareaPorRegla[] {
  if (ultimaLectura && diffDiasYMD(ultimaLectura, hoy) <= 6) return [];
  return [{
    claveRegla: `lectura-google:${lunes}`, regla: "lectura-google",
    titulo: "Anotar la lectura de Google en Reseñas: calificación y número de reseñas de hoy",
    responsable: RESPONSABLE_COBROS, vence: hoy,
  }];
}

/**
 * El corte de la semana que terminó (4 nov 2026): plan As Is / To Be, «corte
 * cerrado cada lunes». Una tarea por semana (`corte-lunes:<lunes de esa semana>`),
 * con vencimiento el lunes siguiente: si se cierra después, ya cuenta tarde.
 */
export function reglaCorteLunes(cerrado: boolean, semanaTerminada: string, primeraSemana: string): TareaPorRegla[] {
  if (cerrado || semanaTerminada < primeraSemana) return [];
  return [{
    claveRegla: `corte-lunes:${semanaTerminada}`, regla: "corte-lunes",
    titulo: `Cerrar el corte de la semana del ${semanaTerminada} (Corte semanal → Hacer corte)`,
    responsable: RESPONSABLE_CORTE, vence: addDaysYMD(semanaTerminada, 7),
  }];
}

/**
 * La revisión del jueves (lote 9, 10 nov 2026): desde el jueves, si la de la
 * semana no se ha guardado, una tarea a quien la hace (`revision-jueves:<lunes>`),
 * con vencimiento ese jueves. Sin ella el «Score del operador» sale «Sin dato».
 */
export function reglaRevisionJueves(guardada: boolean, hoy: string, lunes: string): TareaPorRegla[] {
  const jueves = addDaysYMD(lunes, 3);
  if (guardada || hoy < jueves || hoy > addDaysYMD(lunes, 6)) return [];
  return [{
    claveRegla: `revision-jueves:${lunes}`, regla: "revision-jueves",
    titulo: `Hacer la revisión del jueves de la semana del ${lunes} (Inicio → Revisión del jueves): score del operador, leads y respuesta en 5 min`,
    responsable: RESPONSABLE_REVISION, vence: jueves,
  }];
}

/**
 * Tours del catálogo sin costos en el Cotizador (lote 9): una tarea al mes
 * (`tours-sin-costos:<AAAA-MM>`) a quien captura los costos, con los códigos
 * de los que faltan. Sin costos, «Tours con margen medido» no avanza.
 */
export function reglaToursSinCostos(sinCostos: { codigo: string }[], hoy: string): TareaPorRegla[] {
  if (!sinCostos.length) return [];
  const codigos = Array.from(new Set(sinCostos.map(t => t.codigo)));
  return [{
    claveRegla: `tours-sin-costos:${hoy.slice(0, 7)}`, regla: "tours-sin-costos",
    titulo: `Capturar en el Cotizador los costos de ${sinCostos.length === 1 ? "1 tour" : `${sinCostos.length} tours`} (${codigos.join(", ")}): sin ellos no se sabe cuánto deja cada uno`,
    responsable: RESPONSABLE_CORTE, vence: hoy,
  }];
}

// ── El correo del resumen diario de las 7:30 (puro: lo prueba Vitest) ─────────

export const BASE_URL = "https://www.huasteca-potosina.com";
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export interface LineaResumen { titulo: string; cuando: string; cliente: string | null; href: string; rojo?: boolean }

/**
 * El correo del resumen: vencidos, lo de hoy y las salidas de hoy y mañana.
 * `avisos` (lote 9, 10 nov 2026): lo que el panel no pudo hacer solo (p. ej. el
 * reporte de los jueves que no salió); van primero.
 */
export function correoResumen(nombre: string, hoy: string, vencidos: LineaResumen[], deHoy: LineaResumen[], salidas: LineaResumen[], avisos: string[] = []) {
  const total = vencidos.length + deHoy.length;
  const subject = `Tu día · ${total} seguimiento${total === 1 ? "" : "s"}${vencidos.length ? ` (${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"})` : ""}${salidas.length ? ` · ${salidas.length} salida${salidas.length === 1 ? "" : "s"}` : ""}${avisos.length ? ` · ${avisos.length} aviso${avisos.length === 1 ? "" : "s"}` : ""}`;
  const bloqueAvisos = !avisos.length ? "" : `
    <div style="font-size:12px;letter-spacing:1.5px;color:#A33A26;margin:18px 0 4px">AVISOS</div>
    ${avisos.map(a => `<div style="padding:9px 12px;margin:6px 0;background:#FBEDEA;border-radius:8px;font-size:14px;color:#1C1C1A">${esc(a)}</div>`).join("")}`;
  const bloque = (titulo: string, ls: LineaResumen[]) => !ls.length ? "" : `
    <div style="font-size:12px;letter-spacing:1.5px;color:#66655F;margin:18px 0 4px">${esc(titulo.toUpperCase())}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ls.map(l => `<tr><td style="padding:9px 0;border-bottom:1px solid #E6E4DF">
      <a href="${l.href}" style="color:#1C1C1A;text-decoration:none;font-size:15px;font-weight:600">${esc(l.titulo)}</a>
      <div style="font-size:13px;color:${l.rojo ? "#A33A26" : "#66655F"}">${esc(l.cuando)}${l.cliente ? ` · ${esc(l.cliente)}` : ""}</div></td></tr>`).join("")}</table>`;
  const htmlContent = `<!doctype html><html lang="es"><body bgcolor="#F5F5F3" style="margin:0;background:#F5F5F3;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" bgcolor="#F5F5F3" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E4DF;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
  <div style="font-size:11px;letter-spacing:2px;color:#66655F">PANEL HUASTECA · TU DÍA</div>
  <div style="font-size:22px;color:#1C1C1A;margin:6px 0 4px">Buenos días, ${esc(nombre)}</div>
  ${bloqueAvisos}${bloque("Vencidos", vencidos)}${bloque("Para hoy", deHoy)}${bloque("Salidas de hoy y mañana", salidas)}
  <div style="margin-top:20px"><a href="${BASE_URL}/admin/seguimientos" style="display:inline-block;background:#1F3B2D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600">Abrir Seguimientos</a></div>
  </td></tr></table></td></tr></table></body></html>`;
  const linea = (l: LineaResumen) => `- ${l.cuando}: ${l.titulo}${l.cliente ? ` (${l.cliente})` : ""}`;
  const textContent = [`Buenos días, ${nombre}`, avisos.length ? `\nAvisos:\n${avisos.map(a => `- ${a}`).join("\n")}` : "", vencidos.length ? `\nVencidos:\n${vencidos.map(linea).join("\n")}` : "", deHoy.length ? `\nPara hoy:\n${deHoy.map(linea).join("\n")}` : "", salidas.length ? `\nSalidas:\n${salidas.map(linea).join("\n")}` : "", `\n${BASE_URL}/admin/seguimientos`].join("\n");
  return { subject: subject.slice(0, 140), htmlContent, textContent };
}

