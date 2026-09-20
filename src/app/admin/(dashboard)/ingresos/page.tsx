import { calcKPIs } from "@/lib/admin/kpis";
import { contarClicsWhatsapp } from "@/lib/admin/clicsWhatsapp";
import IngresosClient from "./IngresosClient";

export const dynamic = "force-dynamic";

export default async function IngresosPage() {
  const [kpis, clics] = await Promise.all([calcKPIs(), contarClicsWhatsapp()]);
  return <IngresosClient kpis={kpis} clics={clics} />;
}
