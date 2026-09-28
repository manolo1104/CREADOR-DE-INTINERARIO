"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { trackPackageInquiry, trackWhatsapp } from "@/lib/analytics";
import { useLocale } from "@/lib/i18n/useLocale";
import { getPaqueteFormUI } from "@/lib/i18n/paquetes.en";

const WA_NUMBER = "524891090388";

interface Props {
  packageName: string;
  price:       number;
  destacado?:  boolean;
  /**
   * En el catálogo la tarjeta vive en una fila que se desliza y no puede medir
   * mil píxeles de alto: el formulario nace cerrado detrás del botón y se abre
   * al tocarlo. En la ficha del paquete hay sitio de sobra y va abierto.
   */
  compacto?:   boolean;
}

/**
 * El único camino para reservar un paquete: tres datos y WhatsApp.
 *
 * 🔴 Antes había DOS botones compitiendo: "Reservar en línea" con tarjeta
 * (grande, arriba) y la consulta por WhatsApp (gris, debajo de un separador
 * "o"). Decisión de Manolo el 23 sep 2026: el pago con tarjeta sale de esta
 * página. Un paquete de $12,000 no se cierra con un clic a ciegas; se cierra
 * hablando, y la conversación empieza con el nombre, la fecha y cuántos son.
 *
 * El checkout con tarjeta sigue existiendo en `/reservar-paquete/[slug]` para
 * quien llegue por un enlace directo: lo que se quitó es el botón, no la ruta.
 */
export function PaqueteFormCta({ packageName, price, destacado, compacto }: Props) {
  const { locale } = useLocale();
  const t = getPaqueteFormUI(locale);
  const [abierto,  setAbierto]  = useState(!compacto);
  const [nombre,   setNombre]   = useState("");
  const [fecha,    setFecha]    = useState("");
  const [personas, setPersonas] = useState("");
  const [sent,     setSent]     = useState(false);

  const inputCls =
    "w-full rounded-lg border border-negro/20 bg-white/70 text-negro placeholder:text-negro/45 " +
    "px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-selva focus:ring-2 focus:ring-verde-selva/25 transition-colors";

  const botonCls =
    "flex items-center justify-center gap-2.5 w-full py-4 rounded-lg text-[11px] tracking-[2px] uppercase " +
    "font-dm font-medium whitespace-nowrap transition-[background-color,transform] duration-200 active:scale-[0.98]";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    trackPackageInquiry(packageName, price);
    trackWhatsapp("package_form", price);

    const msg = encodeURIComponent(
      t.waMsg(packageName, nombre, fecha || t.porDefinir, personas || t.porConfirmar),
    );

    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  // Estado cerrado: un solo botón que abre los tres campos.
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${botonCls} ${
          destacado
            ? "bg-dorado hover:bg-terracota text-negro hover:text-crema"
            : "bg-[#25D366] hover:bg-[#1da851] text-white"
        }`}
      >
        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
        {t.reservarEstePaquete}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <p className="text-[9px] tracking-[2px] uppercase text-negro/60 font-dm flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" aria-hidden="true" /> {t.consultaRapida}
      </p>

      <input
        type="text"
        placeholder={t.tuNombre}
        aria-label={t.tuNombre}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className={inputCls}
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder={t.fechaTentativa}
          aria-label={t.fechaTentativa}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={inputCls}
        />
        <input
          type="number"
          placeholder={t.numPersonas}
          aria-label={t.numPersonas}
          min={1}
          max={30}
          value={personas}
          onChange={(e) => setPersonas(e.target.value)}
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        className={`${botonCls} ${
          sent
            ? "bg-verde-selva text-crema"
            : destacado
              ? "bg-dorado hover:bg-terracota text-negro hover:text-crema"
              : "bg-[#25D366] hover:bg-[#1da851] text-white"
        }`}
      >
        {sent ? (
          <>{t.abriendoWhatsapp}</>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            {t.consultarDisponibilidad}
          </>
        )}
      </button>
    </form>
  );
}
