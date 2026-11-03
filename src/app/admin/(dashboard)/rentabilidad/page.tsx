import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Rentabilidad — Admin" };
export default function RentabilidadPage() {
  return (
    <PaginaProxima titulo="Rentabilidad" subtitulo="Margen por tour y por canal; reemplazará a Ventas y Análisis" fase="Fase 1 (scorecard)"
      queTendra={["margen del mes y personas por salida", "tabla por tour con «Capturar costos» donde falten", "distribución de salidas por tamaño", "tabla por canal con comisión e ingreso neto"]}
      mientras={{ href: "/admin/ingresos", etiqueta: "Mientras: Ventas" }} />
  );
}
