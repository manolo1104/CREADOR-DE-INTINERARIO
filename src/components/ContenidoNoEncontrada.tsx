"use client";

import Link from "next/link";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { useLocale } from "@/lib/i18n/useLocale";

export function ContenidoNoEncontrada() {
  // 🔴 13 nov 2026 (ISR): el idioma sale de la dirección, no de la petición.
  // Con headers() aquí, un slug inexistente en una página guardada en caché
  // tronaba con 500 en vez de dar este 404.
  const { en, lp } = useLocale();

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
          {en ? (
            <>
              This page went <em className="text-dorado">exploring</em>
            </>
          ) : (
            <>
              Esta página se fue <em className="text-dorado">de tour</em>
            </>
          )}
        </h1>
        <p className="font-dm text-crema/50 text-base mb-10 leading-relaxed">
          {en
            ? "We couldn't find what you were looking for — the link may have changed. The Huasteca is still here, though."
            : "No encontramos lo que buscabas — puede que el enlace haya cambiado. Pero la Huasteca sigue aquí, esperándote."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={lp("/tours")}
            className="bg-dorado text-negro px-7 py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors"
          >
            {en ? "Browse all tours" : "Ver todos los tours"}
          </Link>
          <Link
            href={lp("/")}
            className="border border-crema/20 text-crema/70 px-7 py-4 text-[12px] tracking-[3px] uppercase font-dm hover:border-crema/40 hover:text-crema transition-all"
          >
            {en ? "Go to homepage" : "Ir al inicio"}
          </Link>
        </div>

        <a
          href={waLink(
            en
              ? "Hi! I'd like information about your Huasteca Potosina tours."
              : WA_MESSAGES.flotante,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-8 text-verde-vivo hover:text-lima text-sm font-dm underline underline-offset-4 transition-colors"
        >
          {en
            ? "Looking for something specific? Message us on WhatsApp"
            : "¿Buscas algo en específico? Escríbenos por WhatsApp"}
        </a>
      </div>
    </main>
  );
}
