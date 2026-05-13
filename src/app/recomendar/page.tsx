import type { Metadata } from "next";
import { RecommenderShell } from "@/components/recommender/RecommenderShell";

export const metadata: Metadata = {
  title: "¿Qué tour es para ti? — Recomendador IA | Huasteca Potosina",
  description:
    "Responde 4 preguntas y nuestra IA encuentra el tour perfecto para tu grupo, intereses y nivel de actividad. Recomendación personalizada gratuita.",
};

export default function RecomendarPage() {
  return <RecommenderShell />;
}
