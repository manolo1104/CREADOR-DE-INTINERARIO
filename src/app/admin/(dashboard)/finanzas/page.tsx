import { redirect } from "next/navigation";

// Finanzas y Ventas se fundieron en una sola pantalla: /admin/dinero.
// La dirección vieja se queda como redirección porque estaba en marcadores y
// en los atajos del Inicio.
export default function FinanzasPage() {
  redirect("/admin/dinero");
}
