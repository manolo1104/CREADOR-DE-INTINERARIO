import { Metadata } from "next";
import { PlannerShell } from "@/components/planner/PlannerShell";

export const metadata: Metadata = {
  title: "Planea tu viaje — Huasteca IA",
  description: "Diseña tu itinerario personalizado para la Huasteca Potosina.",
};

export default function PlanearPage() {
  return <PlannerShell />;
}
