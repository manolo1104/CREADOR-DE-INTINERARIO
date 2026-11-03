import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Proveedores — Admin" };
export default function ProveedoresPage() {
  return (
    <PaginaProxima titulo="Proveedores" subtitulo="Canoas, desayunos, transporte: quién, a cuánto y en qué tours" fase="Fase 1 (salidas)"
      queTendra={["nombre, servicio y contacto", "precio pactado por temporada", "tours en los que participa"]}
      mientras={{ href: "/admin/cotizador", etiqueta: "Mientras: tarifas en el Cotizador" }} />
  );
}
