"use client";
import { useState } from "react";
import Link from "next/link";

const INCLUIDO = [
  { icon: "📍", text: "Los 8 destinos esenciales con fichas completas — precios 2026, horarios reales, GPS" },
  { icon: "🗓️", text: "3 itinerarios probados: 3, 5 y 7 días con horarios y tiempos de traslado" },
  { icon: "💰", text: "Presupuesto real por tipo de viajero — mochilero, viajero medio, con comodidad" },
  { icon: "🚗", text: "Rutas desde CDMX, Monterrey, Guadalajara y Tampico con precios actualizados" },
  { icon: "📋", text: "Checklist de empaque completo con lo que SÍ y lo que NO llevar" },
  { icon: "🍽️", text: "Gastronomía huasteca, frases útiles y cultura local" },
  { icon: "⚡", text: "Tips insider que no encuentras en blogs de viaje — ángulos de foto, horarios secretos" },
  { icon: "📞", text: "Contactos de emergencia y guías certificados por municipio" },
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
          monto: "50",
          descripcion: "Guía Huasteca Potosina 2026 — PDF completo",
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
      <section className="relative bg-gradient-to-br from-verde-profundo via-negro to-negro px-6 py-24 text-center overflow-hidden border-b border-white/6">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-verde-selva/10 rounded-full blur-3xl" />
        </div>
        <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-6">✦ PDF · 15–20 páginas · Actualizada 2026</p>
        <h1 className="font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(40px,7vw,80px)" }}>
          Guía Huasteca Potosina<br />
          <em className="text-dorado">La guía que sí funciona</em>
        </h1>
        <p className="font-cormorant italic text-crema/55 max-w-xl mx-auto mb-10 text-xl leading-relaxed">
          No es un folleto turístico. Es la guía que un amigo local te daría: con los horarios reales,
          los precios actualizados y los errores que cometen casi todos los turistas.
        </p>

        {/* Price + CTA */}
        <div className="inline-flex flex-col items-center gap-4 mb-8">
          <div className="flex items-baseline gap-3">
            <span className="font-cormorant font-light text-crema/40 line-through text-2xl">$150 MXN</span>
            <span className="font-cormorant font-light text-dorado" style={{ fontSize: "clamp(48px,6vw,72px)" }}>$50 MXN</span>
          </div>
          <p className="text-[10px] tracking-[3px] uppercase text-crema/30">Precio de lanzamiento · Descarga inmediata</p>
          <button
            onClick={handleComprar}
            disabled={loading}
            className="bg-dorado text-negro px-16 py-5 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Redirigiendo..." : "Descargar Guía — $50 MXN"}
          </button>
          {error && <p className="text-terracota text-sm">{error}</p>}
          <p className="text-[10px] text-crema/25 tracking-wide">Pago seguro con Stripe · PDF en tu correo al instante</p>
        </div>

        {/* Preview badges */}
        <div className="flex flex-wrap gap-3 justify-center max-w-lg mx-auto">
          {["8 destinos", "3 itinerarios", "Precios 2026", "Tips insider", "Checklist empaque"].map((tag) => (
            <span key={tag} className="text-[10px] tracking-[2px] uppercase border border-verde-vivo/30 text-verde-vivo px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
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
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
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
          {loading ? "Redirigiendo..." : "✦ Descargar Guía — $50 MXN"}
        </button>
        <p className="mt-4 text-[11px] text-crema/25 tracking-wide">
          Pago seguro · Descarga inmediata · PDF en tu correo
        </p>
        <p className="mt-6 text-[11px] text-crema/20">
          ¿Prefieres un itinerario personalizado?{" "}
          <Link href="/planear" className="text-verde-vivo hover:text-lima underline underline-offset-2">
            Usa el planificador IA →
          </Link>
        </p>
      </section>
    </main>
  );
}
