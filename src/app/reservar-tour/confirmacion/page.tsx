"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Calendar, Users, Clock, MessageCircle, Share2, CalendarPlus, Copy } from "lucide-react";
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
  chargeAmount?:      number;
  paymentMode?:       string;
  promoCode?:         string;
  customerName:       string;
  customerEmail:      string;
}

const NEXT_STEPS = [
  {
    num: "01",
    title: "Revisa tu correo",
    text: "Recibirás la confirmación completa en tu bandeja de entrada en los próximos 5 minutos. Revisa también el spam.",
  },
  {
    num: "02",
    title: "Confirma por WhatsApp",
    text: "Envíanos tu número de confirmación al +52 489 125 1458. Te responderemos para coordinar tu punto de recogida exacto.",
  },
  {
    num: "03",
    title: "Un día antes de tu tour",
    text: "Te contactaremos por WhatsApp con los detalles finales: hora exacta de recogida, clima esperado y cualquier recomendación especial.",
  },
  {
    num: "04",
    title: "Prepara tu equipo",
    text: "Ropa cómoda, calzado cerrado, traje de baño, protector solar biodegradable y mucha energía. Todo lo demás lo incluye tu tour.",
  },
  {
    num: "05",
    title: "El día del tour",
    text: "Preséntate en el punto acordado con tu guía y muestra tu número de confirmación. ¡El resto lo hacemos nosotros!",
  },
];

export default function ConfirmacionTourPage() {
  const [data, setData]       = useState<ConfirmationData | null>(null);
  const [copied, setCopied]   = useState(false);
  const [shareOk, setShareOk] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("hp_tour_confirmation");
    if (raw) {
      setData(JSON.parse(raw));
      sessionStorage.removeItem("hp_tour_confirmation");
    }
  }, []);

  const waMessage = data
    ? encodeURIComponent(
        `Hola, confirmo mi tour:\n• ${data.tourName}\n• Fecha: ${formatTourDate(data.tourDate)}\n• Participantes: ${data.adults + data.children}\n• Confirmación: ${data.confirmationNumber}`
      )
    : "";

  function copyConfirmation() {
    if (!data) return;
    navigator.clipboard.writeText(data.confirmationNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function downloadIcs() {
    if (!data) return;
    // Evento de día completo en la fecha del tour (la hora exacta se coordina por WhatsApp).
    const start = data.tourDate.replace(/-/g, "");
    const [y, m, d] = data.tourDate.split("-").map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tours Huasteca Potosina//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${data.confirmationNumber}@huasteca-potosina.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:Tour ${data.tourName} — Huasteca Potosina`,
      `DESCRIPTION:Confirmación ${data.confirmationNumber}. ${data.adults + data.children} participante(s). Te contactaremos por WhatsApp (+52 489 125 1458) un día antes para coordinar la hora exacta de recogida.`,
      "LOCATION:Huasteca Potosina, San Luis Potosí, México",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tour-huasteca-${data.confirmationNumber}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!data) return;
    const text = `¡Acabo de reservar "${data.tourName}" en la Huasteca Potosina! 🌊 ¿Quién se apunta al próximo? 👉 https://www.huasteca-potosina.com/tours/${data.tourSlug}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, title: "Mi tour en la Huasteca Potosina" });
        setShareOk(true);
      } catch { /* usuario canceló */ }
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShareOk(true);
        setTimeout(() => setShareOk(false), 2500);
      });
    }
  }

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

  const chargeAmt = data.chargeAmount ?? data.total;
  const isDeposit = data.paymentMode === "deposit" && !!data.chargeAmount && data.chargeAmount < data.total;
  const remaining = isDeposit ? data.total - chargeAmt : 0;

  return (
    <main className="min-h-screen bg-crema pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">

        {/* ── HEADER ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-verde-selva rounded-full mb-5 shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(32px,5vw,52px)" }}>
            ¡Tour Confirmado!
          </h1>
          <p className="font-dm text-negro/60 text-sm max-w-sm mx-auto leading-relaxed">
            Hola <strong>{data.customerName}</strong>, tu reserva está lista. Confirmación enviada a <strong>{data.customerEmail}</strong>.
          </p>
        </div>

        {/* ── NÚMERO DE CONFIRMACIÓN ── */}
        <div className="bg-white border border-negro/8 p-6 mb-6 text-center">
          <p className="text-[10px] tracking-[3px] uppercase text-negro/40 font-dm mb-2">Número de Confirmación</p>
          <p className="font-cormorant text-dorado mb-3" style={{ fontSize: "clamp(28px,5vw,40px)" }}>
            {data.confirmationNumber}
          </p>
          <button
            onClick={copyConfirmation}
            className="inline-flex items-center gap-2 text-xs font-dm text-verde-selva hover:text-verde-vivo transition-colors border border-verde-selva/30 hover:border-verde-vivo px-4 py-2"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "¡Copiado! ✓" : "Copiar número"}
          </button>
          <p className="font-dm text-xs text-negro/40 mt-3">Presenta este número al guía el día del tour</p>
        </div>

        {/* ── RESUMEN COMPLETO ── */}
        <div className="bg-white border border-negro/8 p-6 mb-6">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-5">Resumen de tu reserva</h2>
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
                <p className="text-negro/40 text-xs mt-0.5">Hora: por acordar con el guía</p>
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
                <p className="text-negro/80 text-sm">{data.tourDuration} horas aprox.</p>
              </div>
              <div className="font-dm">
                <p className="text-[9px] tracking-[2px] uppercase text-negro/40 mb-1">
                  {isDeposit ? "Depósito pagado" : "Total pagado"}
                </p>
                <p className="font-cormorant text-dorado text-lg">{formatMXN(chargeAmt)} MXN</p>
              </div>
            </div>
            {isDeposit && (
              <div className="bg-verde-selva/8 border border-verde-selva/20 px-4 py-3">
                <p className="text-xs text-verde-selva font-dm font-medium">
                  ✓ Anticipo de {Math.round((chargeAmt / data.total) * 100)}% pagado · Saldo de{" "}
                  {formatMXN(remaining)} MXN el día del tour, en efectivo o con tarjeta
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── PRÓXIMOS PASOS ── */}
        <div className="bg-verde-profundo text-crema p-6 mb-6">
          <h2 className="font-cormorant text-crema text-xl mb-6">¿Qué sigue?</h2>
          <ol className="space-y-5">
            {NEXT_STEPS.map((step) => (
              <li key={step.num} className="flex gap-4">
                <span className="font-cormorant text-dorado text-2xl font-light flex-shrink-0 leading-none mt-0.5">
                  {step.num}
                </span>
                <div className="flex-1">
                  <p className="font-dm text-sm font-medium text-crema mb-1">{step.title}</p>
                  <p className="font-dm text-xs text-crema/60 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── ACCIONES ── */}
        <div className="space-y-3 mb-6">
          <a
            href={`https://wa.me/524891251458?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white w-full py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Confirmar por WhatsApp · +52 489 125 1458
          </a>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full border border-negro/20 hover:border-verde-selva/50 hover:bg-verde-selva/5 text-negro/70 hover:text-verde-selva py-4 text-[11px] tracking-[2px] uppercase font-dm transition-all"
          >
            <Share2 className="w-4 h-4" />
            {shareOk ? "¡Enlace copiado! Compártelo 🎉" : "Compartir mi reserva"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadIcs}
              className="flex items-center justify-center gap-2 border border-negro/15 hover:border-verde-selva/40 text-negro/55 hover:text-verde-selva py-3.5 text-[10px] tracking-[2px] uppercase font-dm transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Agregar al calendario
            </button>
            <Link
              href="/tours"
              className="flex items-center justify-center border border-negro/15 hover:border-verde-selva/40 text-negro/55 hover:text-verde-selva py-3.5 text-[10px] tracking-[2px] uppercase font-dm transition-all"
            >
              Ver más tours
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-negro/40 font-dm">
          ¿Problemas? Escríbenos a{" "}
          <a href="mailto:hola@huasteca-potosina.com" className="text-verde-selva underline">
            hola@huasteca-potosina.com
          </a>
          {" "}o al{" "}
          <a href="https://wa.me/524891251458" target="_blank" rel="noopener noreferrer" className="text-verde-selva underline">
            +52 489 125 1458
          </a>
        </p>

      </div>
    </main>
  );
}
