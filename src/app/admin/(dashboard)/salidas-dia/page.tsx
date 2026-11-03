import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Salidas del día — Admin" };
export default function SalidasDiaPage() {
  return (
    <PaginaProxima titulo="Salidas del día" subtitulo="Cada salida con su lista de pasajeros, su checklist y sus números" fase="Fase 1 (salidas)"
      queTendra={["pasajeros con canal y estado de pago", "checklist antes de salir, editable por tour", "protocolo de la ruta", "ingreso, costos y margen de la salida", "simulador de 1 a 6 personas", "mandar la lista al guía"]}
      mientras={{ href: "/admin/calendario", etiqueta: "Mientras: Calendario" }} />
  );
}
