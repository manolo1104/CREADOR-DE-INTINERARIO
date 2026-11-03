import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Rutas y protocolos — Admin" };
export default function RutasPage() {
  return (
    <PaginaProxima titulo="Rutas y protocolos" subtitulo="Una ficha por tour: la base de la escuela de guías" fase="Fase 1 (salidas)"
      queTendra={["paradas y horarios", "guion del guía y puntos de seguridad", "plan B", "qué llevar", "proveedores y costos fijos y por persona"]}
      mientras={{ href: "/admin/cotizador", etiqueta: "Mientras: costos en el Cotizador" }} />
  );
}
