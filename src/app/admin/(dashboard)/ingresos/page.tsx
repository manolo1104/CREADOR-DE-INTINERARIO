import { calcKPIs } from "@/lib/admin/kpis";
import IngresosClient from "./IngresosClient";

export const dynamic = "force-dynamic";

export default async function IngresosPage() {
  const kpis = await calcKPIs();
  return <IngresosClient kpis={kpis} />;
}
