"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, CreditCard } from "lucide-react";
import { trackPackageInquiry, trackWhatsapp } from "@/lib/analytics";
import { useLocale } from "@/lib/i18n/useLocale";
import { getPaqueteFormUI } from "@/lib/i18n/paquetes.en";

const WA_NUMBER = "524891251458";

interface Props {
  packageName: string;
  price:       number;
  destacado?:  boolean;
  /** slug del paquete para el flujo de pago con tarjeta (/reservar-paquete/[slug]) */
  slug?:       string;
}

export function PaqueteFormCta({ packageName, price, destacado, slug }: Props) {
  const { locale, lp } = useLocale();
  const t = getPaqueteFormUI(locale);
  const [nombre,   setNombre]   = useState("");
  const [fecha,    setFecha]    = useState("");
  const [personas, setPersonas] = useState("");
  const [sent,     setSent]     = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {/* ── CTA PRINCIPAL: reservar en línea ──────────────────────────────────
          Antes el botón fuerte era la consulta por WhatsApp y el pago con
          tarjeta iba debajo, en gris y detrás de un separador "o". El pago en
          línea es el único camino que cierra la venta sin que alguien conteste
          un chat, así que es el que se lleva el peso visual. */}
      {slug && (
        <div className="mb-4">
          <Link
            href={lp(`/reservar-paquete/${slug}`)}
            onClick={() => trackPackageInquiry(packageName, price)}
            className={`flex items-center justify-center gap-2.5 w-full py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors duration-200 ${
              destacado
                ? "bg-dorado hover:bg-terracota text-negro hover:text-crema"
                : "bg-verde-selva hover:bg-verde-vivo text-crema"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {t.reservarEnLinea}
          </Link>
          <p className="text-center text-[9px] font-dm text-crema/35 mt-2">{t.reservaSegura}</p>

          <div className="flex items-center gap-2 pt-4 pb-1">
            <span className="h-px flex-1 bg-crema/15" />
            <span className="text-[9px] tracking-[1.5px] uppercase text-crema/30 font-dm">{t.oConsultaAntes}</span>
            <span className="h-px flex-1 bg-crema/15" />
          </div>
        </div>
      )}

      <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-3 flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" /> {t.consultaRapida}
      </p>

      <input
        type="text"
        placeholder={t.tuNombre}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="w-full border border-crema/20 bg-white/5 text-crema placeholder:text-crema/30 px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-vivo transition-colors"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder={t.fechaTentativa}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border border-crema/20 bg-white/5 text-crema placeholder:text-crema/30 px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-vivo transition-colors"
        />
        <input
          type="number"
          placeholder={t.numPersonas}
          min={1}
          max={30}
          value={personas}
          onChange={(e) => setPersonas(e.target.value)}
          className="w-full border border-crema/20 bg-white/5 text-crema placeholder:text-crema/30 px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-vivo transition-colors"
        />
      </div>

      <button
        type="submit"
        className={`flex items-center justify-center gap-2.5 w-full py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors duration-200 ${
          sent
            ? "bg-verde-selva text-crema"
            : slug
              // Ya hay un CTA principal arriba: este queda como salida secundaria.
              ? "border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10"
              : destacado
                ? "bg-dorado hover:bg-terracota text-negro hover:text-crema"
                : "bg-[#25D366] hover:bg-[#20ba59] text-white"
        }`}
      >
        {sent ? (
          <>{t.abriendoWhatsapp}</>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            {t.consultarDisponibilidad}
          </>
        )}
      </button>

    </form>
  );
}
