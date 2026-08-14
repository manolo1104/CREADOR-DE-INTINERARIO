import Link from "next/link";
import { headers } from "next/headers";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { asLocale, localePath } from "@/lib/i18n/config";

// El título no puede depender del locale: `metadata` es estático y no ve el
// header de la petición. Se deja bilingüe para que la pestaña sirva en los dos
// idiomas sin forzar un `generateMetadata` dinámico en una página de error.
//
// La DESCRIPCIÓN sí sale en el idioma correcto: la hereda del `generateMetadata`
// del layout, que sí lee el locale. Hasta el 14 ago ese respaldo estaba escrito
// en español fijo, así que un 404 bajo /en se describía en español.
export const metadata = {
  title: "Page not found — Página no encontrada | Huasteca Potosina",
};

export default function NotFound() {
  // El middleware inyecta `x-locale` en TODA ruta que no sea un asset estático
  // (ver el matcher en `src/middleware.ts`), así que un 404 bajo `/en/…` llega
  // aquí marcado como inglés. Leer headers() vuelve dinámica esta página, que
  // es justo lo que queremos en un 404.
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);

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
