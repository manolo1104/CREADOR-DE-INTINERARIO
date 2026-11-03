import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Seguimientos — Admin" };
export default function SeguimientosPage() {
  return (
    <PaginaProxima titulo="Seguimientos" subtitulo="Las tareas de hoy, las vencidas y las próximas, por responsable" fase="Fase 2 (CRM y WhatsApp)"
      queTendra={["tareas de hoy y vencidas", "agrupadas por responsable", "hecho o posponer en un clic", "las que crean las reglas solas (cotizado sin respuesta, anticipo sin pagar)"]}
      mientras={{ href: "/admin/cotizaciones", etiqueta: "Mientras: cotizaciones por vencer" }} />
  );
}
