"use client";

import { useSeleccionFicha } from "@/lib/seleccionFicha";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * El botón de WhatsApp del cuadro lateral de la ficha, con lo que la persona
 * ya eligió en el módulo (fecha, personas y total). Antes era un `<a>` del
 * Server Component con un mensaje fijo («2 adultos», sin fecha).
 *
 * `mensajeFijo` es el de antes: se usa mientras el módulo no ha publicado
 * nada (recorridos por vehículo o por grupo, o antes de hidratar).
 */
export function WhatsAppFicha({
  slug, nombre, mensajeFijo, etiqueta, className, children,
}: {
  slug: string;
  nombre: string;
  mensajeFijo: string;
  etiqueta: string;
  className: string;
  children?: React.ReactNode;
}) {
  const { locale } = useLocale();
  const sel = useSeleccionFicha(slug);
  const mensaje = sel
    ? WA_MESSAGES.tourConFecha(locale === "en" ? "en" : "es", nombre, sel.fecha, sel.adultos, sel.ninos, sel.total)
    : mensajeFijo;
  return (
    <a
      href={waLink(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      data-seccion="ficha_cuadro"
      data-fecha={sel?.fecha || undefined}
      data-personas={sel ? sel.adultos + sel.ninos : undefined}
      className={className}
    >
      {children}
      {etiqueta}
    </a>
  );
}
