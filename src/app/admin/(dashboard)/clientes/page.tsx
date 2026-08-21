import ClientesClient from "./ClientesClient";
import { getClientes } from "@/lib/admin/clientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient clientes={clientes} />;
}
