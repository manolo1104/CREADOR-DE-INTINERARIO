"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Calendar, Users, Clock, MessageCircle } from "lucide-react";
import { formatTourDate, formatMXN } from "@/lib/tourBooking";

interface ConfirmationData {
  confirmationNumber: string;
  tourName:           string;
  tourSlug:           string;
  tourDate:           string;
  tourDuration:       number;
  adults:             number;
  children:           number;
  total:              number;
  promoCode?:         string;
  customerName:       string;
  customerEmail:      string;
}

export default function ConfirmacionTourPage() {
  const [data, setData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("hp_tour_confirmation");
    if (raw) {
      setData(JSON.parse(raw));
      sessionStorage.removeItem("hp_tour_confirmation");
    }
  }, []);

  const waMessage = data
    ? encodeURIComponent(`Hola, confirmo mi tour:\n• ${data.tourName}\n• Fecha: ${formatTourDate(data.tourDate)}\n• Participantes: ${data.adults + data.children}\n• Confirmación: ${data.confirmationNumber}`)
    : "";

  if (!data) {
    return (
      <main className="min-h-screen bg-crema flex items-center justify-center px-6 pt-24">
        <div className="text-center max-w-sm">
          <p className="font-cormorant text-verde-profundo text-2xl mb-4">Cargando confirmación...</p>
          <p className="font-dm text-sm text-negro/50 mb-6">Si ya realizaste tu pago, revisa tu correo electrónico.</p>
          <Link href="/tours" className="text-verde-selva underline font-dm text-sm">Ver todos los tours</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">

        {/* Header de éxito */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-verde-selva rounded-full mb-5">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(32px,5vw,52px)" }}>
            ¡Tour Confirmado!
          </h1>
          <p className="font-dm text-negro/60 text-sm max-w-sm mx-auto leading-relaxed">
            Hola <strong>{data.customerName}</strong>, tu reserva está lista. Hemos enviado la confirmación a <strong>{data.customerEmail}</strong>.
          </p>
        </div>

        {/* Número de confirmación */}
        <div className="bg-white border border-negro/8 p-6 mb-6 text-center">
          <p className="text-[10px] tracking-[3px] uppercase text-negro/40 font-dm mb-2">Número de Confirmación</p>
          <p className="font-cormorant text-dorado" style={{ fontSize: "clamp(28px,5vw,40px)" }}>
            {data.confirmationNumber}
          </p>
          <p className="font-dm text-xs text-negro/40 mt-2">Presenta este número al guía el día del tour</p>
        </div>

        {/* Detalles del tour */}
        <div className="bg-white border border-negro/8 p-6 mb-6">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Detalles de tu tour</h2>
          <div className="space-y-4">
            <div className="font-dm">
              <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1">Tour</p>
              <p className="text-negro/80 font-medium">{data.tourName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="font-dm">
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fecha
                </p>
                <p className="text-negro/80 text-sm">{formatTourDate(data.tourDate)}</p>
                <p className="text-negro/40 text-xs mt-0.5">Salida: 5:30 AM</p>
              </div>
              <div className="font-dm">
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Participantes
                </p>
                <p className="text-negro/80 text-sm">
                  {data.adults} adulto{data.adults !== 1 ? "s" : ""}
                  {data.children > 0 ? ` · ${data.children} niño${data.children !== 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <div className="font-dm">
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Duración
                </p>
                <p className="text-negro/80 text-sm">{data.tourDuration} horas</p>
              </div>
              <div className="font-dm">
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1">Total pagado</p>
                <p className="font-cormorant text-dorado text-lg">{formatMXN(data.total)} MXN</p>
              </div>
            </div>
          </div>
        </div>

        {/* Próximos pasos */}
        <div className="bg-verde-profundo text-crema p-6 mb-6">
          <h2 className="font-cormorant text-crema text-xl mb-5">Próximos pasos</h2>
          <ol className="space-y-4">
            {[
              {
                num: "01",
                title: "Confirma por WhatsApp",
                text: "Envíanos tu número de confirmación al +52 489 125 1458 para coordinar tu punto exacto de recogida.",
              },
              {
                num: "02",
                title: "Prepara tu equipo",
                text: "Ropa cómoda, calzado cerrado, traje de baño, protector solar biodegradable y mucha energía.",
              },
              {
                num: "03",
                title: "Día del tour",
                text: "Preséntate en el punto acordado a las 5:30 AM con tu número de confirmación. El resto lo hacemos nosotros.",
              },
            ].map((step) => (
              <li key={step.num} className="flex gap-4">
                <span className="font-cormorant text-dorado text-2xl font-light flex-shrink-0 leading-none mt-0.5">{step.num}</span>
                <div>
                  <p className="font-dm text-sm font-medium text-crema mb-1">{step.title}</p>
                  <p className="font-dm text-xs text-crema/60 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={`https://wa.me/524891251458?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Confirmar por WhatsApp
          </a>
          <Link
            href="/tours"
            className="flex-1 flex items-center justify-center border border-negro/20 hover:border-verde-selva text-negro/60 hover:text-verde-selva py-4 text-[11px] tracking-[2px] uppercase font-dm transition-all"
          >
            Ver más tours
          </Link>
        </div>

        <p className="text-center text-xs text-negro/40 font-dm mt-6">
          ¿Problemas? Escríbenos a{" "}
          <a href="mailto:hola@huasteca-potosina.com" className="text-verde-selva underline">
            hola@huasteca-potosina.com
          </a>
        </p>

      </div>
    </main>
  );
}
