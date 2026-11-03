import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Score WhatsApp — Admin" };
export default function ScorePage() {
  return (
    <PaginaProxima titulo="Score WhatsApp" subtitulo="La revisión de los jueves: 14 reglas, 100 puntos, meta 85" fase="Fase 3 (automatizaciones y calidad)"
      queTendra={["score de la semana con tendencia de 8 semanas", "puntaje por regla y conversaciones revisadas", "recomendaciones para la próxima semana", "reseñas pedidas, recibidas y a quién pedir hoy"]}
      mientras={{ href: "/admin/resenas", etiqueta: "Mientras: Reseñas" }} />
  );
}
