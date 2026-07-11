import Link from "next/link";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export const metadata = {
  title: "Página no encontrada — Huasteca Potosina",
};

export default function NotFound() {
  return (
    <main
      className="min-h-[75vh] flex items-center justify-center px-6 py-24"
      style={{ background: "#0e1710" }}
    >
      <div className="max-w-lg text-center">
        <p className="text-[11px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
          Error 404
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(34px,6vw,54px)" }}
        >
          Esta página se fue <em className="text-dorado">de tour</em>
        </h1>
        <p className="font-dm text-crema/50 text-base mb-10 leading-relaxed">
          No encontramos lo que buscabas — puede que el enlace haya cambiado.
          Pero la Huasteca sigue aquí, esperándote.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tours"
            className="bg-dorado text-negro px-7 py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors"
          >
            Ver todos los tours
          </Link>
          <Link
            href="/"
            className="border border-crema/20 text-crema/70 px-7 py-4 text-[12px] tracking-[3px] uppercase font-dm hover:border-crema/40 hover:text-crema transition-all"
          >
            Ir al inicio
          </Link>
        </div>

        <a
          href={waLink(WA_MESSAGES.flotante)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-8 text-verde-vivo hover:text-lima text-sm font-dm underline underline-offset-4 transition-colors"
        >
          ¿Buscas algo en específico? Escríbenos por WhatsApp
        </a>
      </div>
    </main>
  );
}
