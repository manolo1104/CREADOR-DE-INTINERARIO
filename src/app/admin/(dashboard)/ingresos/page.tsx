import { redirect } from "next/navigation";

// "Ventas" vivía aquí. Lo suyo (tours más vendidos, origen de la reserva y los
// clics de WhatsApp) está ahora dentro de /admin/dinero, en "Ver más"; sus
// tarjetas de KPI se quitaron porque repetían cifras de Finanzas con otro motor.
export default function IngresosPage() {
  redirect("/admin/dinero");
}
