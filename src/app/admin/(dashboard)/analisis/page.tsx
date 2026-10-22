import { analisis } from "@/lib/admin/analisis";
import AnalisisClient from "./AnalisisClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análisis — Admin" };

const RANGOS: Record<string, number | null> = { "90": 90, "365": 365, todo: null };

/**
 * Quién compra y de dónde llega (21 oct 2026). Lee el check-in de cada reserva
 * y, aparte, lo que vio GA4. Solo Manolo de entrada (cruza datos personales con
 * el dinero); él la puede abrir a otros desde Inicio.
 */
export default async function AnalisisPage({ searchParams }: { searchParams: { rango?: string } }) {
  // `hasOwnProperty`, no `in`: con `in`, «?rango=toString» pasaba y tumbaba la página.
  const rango = searchParams.rango && Object.prototype.hasOwnProperty.call(RANGOS, searchParams.rango) ? searchParams.rango : "365";
  const datos = await analisis(RANGOS[rango]);
  return <AnalisisClient datos={datos} rango={rango} />;
}
