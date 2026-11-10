// Solo servidor: leer y guardar una semana del corte (lote 7, 10 nov 2026). Vive
// fuera de la ruta para poderlo probar contra una base de prueba; la ruta solo
// pone la sesión y la bitácora.
import { prisma } from "@/lib/prisma";
import { salidasDeLaSemana, cobrosRegistrados, sinTabla } from "./corteSalidas";
import {
  domingoDe, limpiarCaptura, capturaDe, calcularCorte, diaCorto,
  limpiarCobros, limpiarTarjetas, armarTarjetasDelCorte, normalizarCuentas, juntarCambios, puedeHacerCorte,
  type SalidaCorte, type Captura, type EstadoCorte, type CambiosCorte, type ResumenCorte, type CobroSemana,
} from "./corteSemanal";

const estadoDe = (e: string | null | undefined): EstadoCorte => (e === "borrador" ? "borrador" : "cerrado");

/**
 * Las tarjetas con que se calcula la semana y su captura ya ordenada: un corte
 * hecho con lo que había al hacerlo (`armarTarjetasDelCorte`), y las cuentas
 * juntas sin principal reacomodadas (`normalizarCuentas`). La misma cuenta para
 * la pantalla y para guardar.
 */
function tarjetasDeLaSemana(vivas: SalidaCorte[], g: { estado: string; tarjetas: unknown; captura: unknown } | null) {
  const estado = g ? estadoDe(g.estado) : null;
  const congeladas = g ? limpiarTarjetas(g.tarjetas) : null;
  const { salidas, nuevas } = armarTarjetasDelCorte(vivas, congeladas, estado);
  const { captura, heredadas } = normalizarCuentas(salidas, limpiarCaptura(g?.captura));
  return { salidas, nuevas, captura, heredadas, congelado: estado === "cerrado" && !!congeladas };
}

/** Lo que necesita la pantalla del corte para una semana (lunes). */
export async function leerSemana(semana: string) {
  const hasta = domingoDe(semana);
  const [{ salidas: vivas, catalogo }, cobrosPanel, g] = await Promise.all([
    salidasDeLaSemana(semana, hasta),
    cobrosRegistrados(semana, hasta),
    // La tabla la crea Railway al desplegar: sin ella, se ve pero no se guarda.
    prisma.corteSemanal.findUnique({ where: { semana } }).catch((e: any) => {
      if (sinTabla(e)) return null;
      throw e;
    }),
  ]);
  const t = tarjetasDeLaSemana(vivas, g);
  const guardado = g ? {
    captura: t.captura, cobros: limpiarCobros(g.cobros),
    resumen: g.resumen, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt,
    estado: estadoDe(g.estado), congelado: t.congelado,
  } : null;
  return {
    semana, hasta, salidas: t.salidas, catalogo, guardado,
    // Solo en un corte hecho: lo que llegó después y las reservas de hoy (para
    // decir qué cambiaría si se rehace).
    nuevas: t.nuevas, vivas: t.congelado ? vivas : null,
    heredadas: t.heredadas, cobrosPanel,
  };
}

export type ResultadoGuardar =
  | {
      ok: true; nuevo: boolean; juntado: boolean; otroGuardo: string | null; estado: EstadoCorte; resumen: ResumenCorte;
      guardado: { captura: Captura; cobros: CobroSemana[]; resumen: ResumenCorte; estado: EstadoCorte; guardadoPor: string; updatedAt: Date; congelado: boolean };
    }
  | { ok: false; status: number; error: string; conflicto?: boolean; conflictos?: string[] };

const CHOQUE_AL_MISMO_TIEMPO = "Alguien guardó esta semana en este mismo momento. Recarga para ver lo suyo y vuelve a guardar.";

/**
 * Guarda una semana (una fila por semana). Las cifras se recalculan aquí; no se
 * confía en los totales del navegador.
 *
 * `cambios`: solo lo que se tocó desde que se abrió la pantalla, con cómo
 * estaba (`cambiosDe`). Se junta con lo guardado; si alguien más cambió ESA
 * tarjeta o los cobros, 409 y no se guarda nada. `version` es el `updatedAt`
 * que se abrió: si no es el de ahora, otro guardó y se avisa que se juntó.
 * Entre leer y escribir, la escritura exige que nadie haya guardado (`updatedAt`).
 *
 * `cerrar: false` es «Guardar costos» (20 oct 2026, Manolo). `cerrar: true` hace
 * (o rehace) el corte: solo con la semana terminada, y congela cada tarjeta con
 * sus ventas y su hotel (`tarjetas`).
 */
export async function guardarSemana(p: {
  semana: string; cerrar: boolean; version: string | null; cambios: CambiosCorte; guardadoPor: string; hoy: string;
}): Promise<ResultadoGuardar> {
  const { semana, cerrar, version, cambios, guardadoPor } = p;
  const hasta = domingoDe(semana);
  if (cerrar && !puedeHacerCorte(semana, p.hoy)) {
    return { ok: false, status: 409, error: `La semana termina el ${diaCorto(hasta)}: el corte se hace a partir del lunes. Mientras, usa «Guardar costos».` };
  }

  const { salidas: vivas } = await salidasDeLaSemana(semana, hasta);
  const previo = await prisma.corteSemanal.findUnique({ where: { semana } });
  const t = tarjetasDeLaSemana(vivas, previo);
  // Lo guardado, visto igual que en la pantalla: contra eso se compara «cómo estaba al abrir».
  const junta = juntarCambios({ captura: t.captura, cobros: limpiarCobros(previo?.cobros) }, cambios);
  if (!junta.ok) {
    const tarjetas = junta.conflictos.filter(k => k !== "cobros").length;
    const que = [
      tarjetas ? `${tarjetas} tour${tarjetas === 1 ? "" : "s"} que tú también cambiaste` : "",
      junta.conflictos.includes("cobros") ? "lo cobrado de la semana" : "",
    ].filter(Boolean).join(" y ");
    return {
      ok: false, status: 409, conflicto: true, conflictos: junta.conflictos,
      error: `${previo?.guardadoPor ?? "Alguien más"} guardó cambios en ${que} después de que abriste la semana. No se guardó nada para no pisarlo: recarga para ver lo suyo y vuelve a escribir lo tuyo.`,
    };
  }
  const juntado = !!previo && version !== previo.updatedAt.toISOString();

  // Un corte hecho no se «deshace» guardando costos.
  const estado: EstadoCorte = cerrar || previo?.estado === "cerrado" ? "cerrado" : "borrador";
  // Hacer (o rehacer) el corte toma las reservas de hoy y las congela; guardar
  // costos sobre un corte hecho conserva lo congelado. Un corte de antes, sin
  // tarjetas guardadas, se congela la primera vez que se guarda.
  const congelar = estado === "cerrado" && (cerrar || !t.congelado);
  const salidas = congelar ? vivas : t.salidas;
  const pedida = normalizarCuentas(salidas, junta.captura).captura;
  const captura: Captura = estado === "cerrado"
    // Una entrada por cada tarjeta —también las que no se tocaron—, para que lo
    // propuesto por el Cotizador quede fijo.
    ? Object.fromEntries(salidas.map(s => [s.clave, capturaDe(s, pedida)]))
    // En borrador solo lo que se tocó: lo demás sigue tomando lo del Cotizador.
    : Object.fromEntries(salidas.filter(s => pedida[s.clave]).map(s => [s.clave, pedida[s.clave]]));
  const cobros = junta.cobros;
  const resumen = calcularCorte(salidas, captura, cobros);
  const datos = {
    hasta, captura: captura as any, resumen: resumen as any,
    ventas: resumen.ventas, costos: resumen.costos, utilidad: resumen.utilidad, guardadoPor, estado,
    cobros: cobros as any,
    ...(congelar ? { tarjetas: salidas as any } : {}),
  };

  let g;
  if (previo) {
    // Solo si nadie guardó entre la lectura y esta escritura.
    const r = await prisma.corteSemanal.updateMany({ where: { id: previo.id, updatedAt: previo.updatedAt }, data: datos });
    if (r.count === 0) return { ok: false, status: 409, conflicto: true, error: CHOQUE_AL_MISMO_TIEMPO };
    g = await prisma.corteSemanal.findUniqueOrThrow({ where: { semana } });
  } else {
    try {
      g = await prisma.corteSemanal.create({ data: { semana, ...datos } });
    } catch (e: any) {
      if (e?.code === "P2002") return { ok: false, status: 409, conflicto: true, error: CHOQUE_AL_MISMO_TIEMPO };
      throw e;
    }
  }
  return {
    ok: true, nuevo: !previo, juntado, otroGuardo: juntado ? previo?.guardadoPor ?? null : null, estado, resumen,
    guardado: {
      captura, cobros: limpiarCobros(g.cobros), resumen, estado, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt,
      congelado: estado === "cerrado" && !!limpiarTarjetas(g.tarjetas),
    },
  };
}
