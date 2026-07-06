"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, CreditCard } from "lucide-react";
import { trackPackageInquiry, trackWhatsapp } from "@/lib/analytics";

const WA_NUMBER = "524891251458";

interface Props {
  packageName: string;
  price:       number;
  destacado?:  boolean;
  /** slug del paquete para el flujo de pago con tarjeta (/reservar-paquete/[slug]) */
  slug?:       string;
}

export function PaqueteFormCta({ packageName, price, destacado, slug }: Props) {
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
      `Hola, me interesa el ${packageName}.\n` +
      `• Nombre: ${nombre}\n` +
      `• Fecha tentativa: ${fecha || "por definir"}\n` +
      `• Número de personas: ${personas || "por confirmar"}\n` +
      `¿Cuál es la disponibilidad y cómo procedo para reservar?`
    );

    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm mb-3 flex items-center gap-1.5">
        <MessageCircle className="w-3 h-3" /> Consulta rápida — respuesta en &lt;1 hora
      </p>

      <input
        type="text"
        placeholder="Tu nombre *"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        className="w-full border border-crema/20 bg-white/5 text-crema placeholder:text-crema/30 px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-vivo transition-colors"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Fecha tentativa"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border border-crema/20 bg-white/5 text-crema placeholder:text-crema/30 px-3 py-2.5 text-xs font-dm outline-none focus:border-verde-vivo transition-colors"
        />
        <input
          type="number"
          placeholder="# personas"
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
            : destacado
              ? "bg-dorado hover:bg-terracota text-negro hover:text-crema"
              : "bg-[#25D366] hover:bg-[#20ba59] text-white"
        }`}
      >
        {sent ? (
          <>✓ Abriendo WhatsApp…</>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            Consultar disponibilidad →
          </>
        )}
      </button>

      {slug && (
        <>
          <div className="flex items-center gap-2 py-0.5">
            <span className="h-px flex-1 bg-crema/15" />
            <span className="text-[9px] tracking-[1.5px] uppercase text-crema/30 font-dm">o</span>
            <span className="h-px flex-1 bg-crema/15" />
          </div>
          <Link
            href={`/reservar-paquete/${slug}`}
            onClick={() => trackPackageInquiry(packageName, price)}
            className="flex items-center justify-center gap-2.5 w-full py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium border border-crema/25 text-crema hover:border-verde-vivo hover:text-verde-vivo transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Reservar con tarjeta (10/50/100%)
          </Link>
        </>
      )}
    </form>
  );
}
