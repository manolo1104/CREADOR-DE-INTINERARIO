import CursoClient from "./CursoClient";
import { getResumenCurso } from "@/lib/admin/curso";

export const dynamic = "force-dynamic";
export const metadata = { title: "Curso IA — Admin" };

export default async function CursoAdminPage() {
  const resumen = await getResumenCurso();
  return <CursoClient r={resumen} />;
}
