import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Agente — Admin" };
export default function AgentePage() {
  return (
    <PaginaProxima titulo="Agente de operaciones" subtitulo="Propuestas para aprobar y el reporte de oportunidades de los jueves" fase="Fase 4 (agente)"
      queTendra={["cola de propuestas: aprobar, editar o rechazar en un clic", "tareas repetitivas, errores e incidencias con evidencia e impacto", "horas ahorradas y propuestas aprobadas sin cambios", "gasto por día"]}
      mientras={{ href: "/admin/bitacora", etiqueta: "Mientras: Bitácora" }} />
  );
}
