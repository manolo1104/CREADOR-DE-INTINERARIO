import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Leads — Admin" };
export default function LeadsPage() {
  return (
    <PaginaProxima titulo="Leads" subtitulo="El pipeline: de Nuevo a Confirmado" fase="Fase 2 (CRM y WhatsApp)"
      queTendra={["columnas por etapa que se arrastran", "tarjeta con tour, fecha, pax, monto y próximo paso", "ficha con historial unificado", "motivo de pérdida obligatorio", "gráfica de motivos del mes"]}
      mientras={{ href: "/admin/cotizaciones", etiqueta: "Mientras: Cotizaciones" }} />
  );
}
