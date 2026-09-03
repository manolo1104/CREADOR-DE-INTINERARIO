import { prisma } from "@/lib/prisma";
import {
  FECHAS, PRECIOS, TALLER_NOCHES, precioVigente, inscripcionesAbiertas, ofertaAbierta,
} from "@/lib/curso";

/**
 * Los datos de la campaña del curso "Turismo con IA" para el panel.
 *
 * Existe porque hasta ahora un registro sólo dejaba rastro en `console.log`, es
 * decir en los logs de Railway: durante una campaña de cinco días eso es no
 * enterarse. Aquí está todo lo que hay que mirar en una pantalla.
 */

export type LeadCurso = {
  id: string;
  nombre: string | null;
  email: string;
  whatsapp: string | null;
  tipoNegocio: string | null;
  ciudad: string | null;
  origen: string;
  webinar: boolean;
  compro: boolean;
  montoMxn: number | null;
  checkoutIniciado: boolean;
  status: string;
  correos: string[];
  creadoIso: string;
};

export type ResumenCurso = {
  leads: LeadCurso[];
  /** Registrados al taller, activos. */
  registrados: number;
  /** Pidieron el programa y NO se registraron al taller. */
  soloPrograma: number;
  pagados: number;
  /** Empezaron el pago y no lo terminaron: la lista más caliente que hay. */
  checkoutSinPagar: number;
  bajas: number;
  hoy: number;
  /** Registros de las últimas 24 h. */
  ayer: number;
  lugaresLibres: number;
  precio: number;
  esFundador: boolean;
  ofertaAbierta: boolean;
  inscripcionesAbiertas: boolean;
  noche1Iso: string;
  finFundadorIso: string;
  cierreIso: string;
  /** Cuántos negocios de cada tipo, para saber a quién le estás hablando. */
  porNegocio: Array<{ tipo: string; n: number }>;
};

export async function getResumenCurso(): Promise<ResumenCurso> {
  const ahora = new Date();
  const filas = await prisma.cursoLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const leads: LeadCurso[] = filas.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    email: l.email,
    whatsapp: l.whatsapp,
    tipoNegocio: l.tipoNegocio,
    ciudad: l.ciudad,
    origen: l.origen,
    webinar: l.webinar,
    compro: l.compro,
    montoMxn: l.montoMxn,
    checkoutIniciado: !!l.checkoutIniciadoAt,
    status: l.status,
    correos: l.correosEnviados,
    creadoIso: l.createdAt.toISOString(),
  }));

  const activos = leads.filter((l) => l.status === "activo");
  const pagados = leads.filter((l) => l.compro).length;
  const pv = precioVigente(ahora, pagados);

  const desde = (h: number) => Date.now() - h * 3600_000;
  const cuenta = new Map<string, number>();
  for (const l of activos) {
    const t = l.tipoNegocio?.trim() || "Sin decir";
    cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  }

  return {
    leads,
    registrados: activos.filter((l) => l.webinar).length,
    soloPrograma: activos.filter((l) => !l.webinar).length,
    pagados,
    checkoutSinPagar: activos.filter((l) => l.checkoutIniciado && !l.compro).length,
    bajas: leads.filter((l) => l.status !== "activo").length,
    hoy: leads.filter((l) => new Date(l.creadoIso).getTime() >= desde(24)).length,
    ayer: leads.filter((l) => {
      const t = new Date(l.creadoIso).getTime();
      return t < desde(24) && t >= desde(48);
    }).length,
    lugaresLibres: PRECIOS.cupoTotal - pagados,
    precio: pv.precio,
    esFundador: pv.esFundador,
    ofertaAbierta: ofertaAbierta(ahora),
    inscripcionesAbiertas: inscripcionesAbiertas(ahora, pagados),
    noche1Iso: TALLER_NOCHES[0].fecha.toISOString(),
    finFundadorIso: FECHAS.finFundador.toISOString(),
    cierreIso: FECHAS.cierreInscripciones.toISOString(),
    porNegocio: Array.from(cuenta, ([tipo, n]) => ({ tipo, n })).sort(
      (a, b) => b.n - a.n
    ),
  };
}
