"use client";
import { useState } from "react";
import Link from "next/link";
import { GuiaHeroMockup } from "@/components/GuiaHeroMockup";
import type { LucideIcon } from "lucide-react";
import { MapPin, Calendar, DollarSign, Car, ClipboardList, Utensils, Zap, Phone } from "lucide-react";

const INCLUIDO: { Icon: LucideIcon; text: string }[] = [
  { Icon: MapPin,        text: "Los 8 destinos esenciales con fichas completas — precios 2026, horarios reales, GPS" },
  { Icon: Calendar,      text: "3 itinerarios probados: 3, 5 y 7 días con horarios y tiempos de traslado" },
  { Icon: DollarSign,    text: "Presupuesto real por tipo de viajero — mochilero, viajero medio, con comodidad" },
  { Icon: Car,           text: "Rutas desde CDMX, Monterrey, Guadalajara y Tampico con precios actualizados" },
  { Icon: ClipboardList, text: "Checklist de empaque completo con lo que SÍ y lo que NO llevar" },
  { Icon: Utensils,      text: "Gastronomía huasteca, frases útiles y cultura local" },
  { Icon: Zap,           text: "Tips insider que no encuentras en blogs de viaje — ángulos de foto, horarios secretos" },
  { Icon: Phone,         text: "Contactos de emergencia y guías certificados por municipio" },
];

const TESTIMONIOS = [
  { nombre: "Ana R.", ciudad: "CDMX", texto: "Viajé sin haber planeado nada antes. La guía me ahorró 3 días de investigación y no cometí ningún error clásico.", estrellas: 5 },
  { nombre: "Carlos M.", ciudad: "Monterrey", texto: "Los tips de la hora exacta para Tamul y el Sótano de Golondrinas hicieron la diferencia. Fotos que no hubiera conseguido por mi cuenta.", estrellas: 5 },
  { nombre: "Familia Soto", ciudad: "Guadalajara", texto: "Viajamos con tres niños. El itinerario de 5 días fue perfecto — ritmo ideal, sin agotarnos.", estrellas: 5 },
];

export default function GuiaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleComprar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: "49",
          descripcion: "Guía Definitiva Huasteca Potosina 2026 — PDF completo",
          producto: "guia_pdf",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No se pudo iniciar el pago. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-verde-profundo via-negro to-negro px-6 py-20 md:py-24 overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-verde-selva/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Columna texto */}
          <div className="text-center md:text-left">
            <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-5">✦ PDF · 15–20 páginas · Actualizada 2026</p>
            <h1 className="font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(38px,5.5vw,68px)" }}>
              Guía Huasteca Potosina<br />
              <em className="text-dorado">La guía que sí funciona</em>
            </h1>
            <p className="font-cormorant italic text-crema/55 max-w-xl mx-auto md:mx-0 mb-7 text-lg leading-relaxed">
              No es un folleto turístico. Es la guía que un amigo local te daría: con los horarios reales,
              los precios actualizados y los errores que cometen casi todos los turistas.
            </p>

            {/* Urgencia (precio de lanzamiento) */}
            <div className="inline-flex items-center gap-2.5 bg-dorado/10 border border-dorado/30 px-4 py-2 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dorado/70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-dorado" />
              </span>
              <p className="text-[10px] tracking-[2px] uppercase text-dorado font-dm">Precio de lanzamiento · sube pronto</p>
            </div>

            {/* Price + CTA */}
            <div className="flex flex-col items-center md:items-start gap-4 mb-6">
              <div className="flex items-baseline gap-3">
                <span className="font-cormorant font-light text-crema/40 line-through text-2xl">$199 MXN</span>
                <span className="font-cormorant font-light text-dorado" style={{ fontSize: "clamp(44px,6vw,68px)" }}>$49 MXN</span>
              </div>
              <button
                onClick={handleComprar}
                disabled={loading}
                className="w-full sm:w-auto bg-dorado text-negro px-14 py-5 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Redirigiendo..." : "Descargar Guía — $49 MXN"}
              </button>
              {error && <p className="text-terracota text-sm">{error}</p>}
              <div className="space-y-1">
                <p className="text-[10px] text-crema/30 tracking-wide">Pago seguro con Stripe · PDF en tu correo al instante</p>
                <p className="text-[11px] text-verde-vivo/90 tracking-wide">🛡️ Garantía de 7 días — si no te sirve, te devolvemos tu dinero</p>
              </div>
            </div>

            {/* Preview badges */}
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
              {["8 destinos", "3 itinerarios", "Precios 2026", "Tips insider", "Checklist empaque"].map((tag) => (
                <span key={tag} className="text-[10px] tracking-[2px] uppercase border border-verde-vivo/30 text-verde-vivo px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Columna mockup */}
          <div className="flex justify-center md:justify-end">
            <GuiaHeroMockup />
          </div>
        </div>
      </section>

      {/* Social proof bar — credenciales reales */}
      <section aria-label="Reseñas y credenciales" className="bg-negro border-b border-white/6 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-center">
          <span className="flex items-center gap-2">
            <span className="text-dorado text-sm tracking-tight">★★★★★</span>
            <span className="text-[11px] text-crema/65 font-dm">4.9 · 492 reseñas Google</span>
          </span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">+10,000 viajeros guiados</span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">Premio Arival 2023</span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">Guías NOM-09 SECTUR</span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">Operando desde 2019</span>
        </div>
        <p className="text-center text-[11px] text-crema/35 font-dm mt-3">
          Escrita por el equipo detrás de los tours #1 de la Huasteca Potosina.
        </p>
      </section>

      {/* Qué incluye */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Contenido</p>
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            Todo lo que necesitas para <em className="text-dorado">no improvisar</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INCLUIDO.map((item) => (
            <div key={item.text} className="flex gap-4 p-5 border border-white/6 bg-white/2 hover:border-verde-vivo/20 transition-colors">
              <item.Icon className="w-5 h-5 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-crema/70 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién es */}
      <section className="bg-verde-profundo/30 border-y border-white/6 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-center mb-12" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
            Esta guía es para ti si...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Es tu primera vez en la Huasteca y no sabes por dónde empezar",
              "Ya fuiste pero sientes que te perdiste los mejores momentos",
              "Viajas con familia y necesitas un ritmo que funcione para todos",
              "Quieres las fotos que nadie más tiene — con la luz correcta",
              "Tienes solo 3–5 días y quieres aprovechar cada hora",
              "No quieres gastar de más ni cometer los errores de novato",
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start">
                <span className="text-verde-vivo mt-1 flex-shrink-0">✓</span>
                <p className="text-sm text-crema/65 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="font-cormorant font-light text-crema text-center mb-12" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
          Viajeros que ya la usaron
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIOS.map((t) => (
            <div key={t.nombre} className="border border-white/6 p-6 bg-white/2">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.estrellas }).map((_, i) => (
                  <span key={i} className="text-dorado text-sm">★</span>
                ))}
              </div>
              <p className="text-sm text-crema/65 leading-relaxed mb-4 italic">"{t.texto}"</p>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/35">{t.nombre} · {t.ciudad}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ del producto */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-cormorant font-light text-crema text-center mb-10" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
          Preguntas <em className="text-dorado">frecuentes</em>
        </h2>
        <div className="space-y-4">
          {[
            { q: "¿En qué formato la recibo?", a: "Es un documento digital que abres en cualquier celular o computadora. Para guardarlo como PDF usa Ctrl/Cmd + P → Guardar como PDF." },
            { q: "¿Cómo me llega después de pagar?", a: "Al instante: la descargas en la pantalla de confirmación y además te enviamos el enlace de descarga a tu correo para que la tengas siempre." },
            { q: "Nunca he ido a la Huasteca, ¿me sirve?", a: "Está hecha justo para eso. Te lleva de la mano desde cómo llegar y cuánto gastar hasta qué hacer cada día, con horarios y errores que debes evitar." },
            { q: "¿Tiene garantía?", a: "Sí, 7 días. Si no te sirve, escríbenos y te devolvemos tu dinero, sin preguntas." },
            { q: "¿Está actualizada?", a: "Es la edición 2026, con precios, horarios y contactos vigentes." },
          ].map((faq) => (
            <details key={faq.q} className="border border-white/10 bg-negro/40">
              <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-verde-vivo flex-shrink-0 text-lg leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 border-t border-white/8 pt-4">
                <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-verde-profundo/40 border-t border-white/6 px-6 py-20 text-center">
        <h2 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
          Tu viaje empieza <em className="text-dorado">antes de salir</em>
        </h2>
        <p className="text-crema/50 text-sm max-w-md mx-auto mb-10 leading-relaxed">
          Con la guía en tu celular, llegas a cada destino en el momento correcto, con lo que necesitas y sin sorpresas desagradables.
        </p>
        <button
          onClick={handleComprar}
          disabled={loading}
          className="inline-block bg-dorado text-negro px-16 py-5 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Redirigiendo..." : "✦ Descargar Guía — $49 MXN"}
        </button>
        <p className="mt-4 text-[11px] text-crema/25 tracking-wide">
          Pago seguro · Descarga inmediata · PDF en tu correo
        </p>
        <p className="mt-2 text-[11px] text-verde-vivo/90 tracking-wide">
          🛡️ Garantía de 7 días — si no te sirve, te devolvemos tu dinero
        </p>
        <p className="mt-6 text-[11px] text-crema/20">
          ¿Prefieres un itinerario personalizado?{" "}
          <Link href="/recomendar" className="text-verde-vivo hover:text-lima underline underline-offset-2">
            Encuentra tu tour ideal →
          </Link>
        </p>
      </section>
    </main>
  );
}
