import type { Metadata } from "next";
import { metadataRaiz } from "@/lib/metadataRaiz";

// El respaldo de metadata en inglés para todo /en (13 nov 2026): el layout raíz
// ya no lee la petición, así que el idioma lo dice la ruta.
export const metadata: Metadata = metadataRaiz("en");

export default function LayoutIngles({ children }: { children: React.ReactNode }) {
  return children;
}
