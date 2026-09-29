import Link from "next/link";
import { GuiaHeroMockup } from "@/components/GuiaHeroMockup";
import { GuiaGratisForm } from "@/components/GuiaGratisForm";
import { resenasTexto } from "@/lib/resenas";
import type { LucideIcon } from "lucide-react";
import { MapPin, Calendar, DollarSign, Car, ClipboardList, Utensils, Zap, BedDouble } from "lucide-react";

/**
 * /guia — la guía en PDF, GRATIS a cambio del correo (decisión de Manolo,
 * 28 sep 2026). Antes se cobraba $49 con Stripe mientras la portada la
 * regalaba; ahora las dos usan `GuiaGratisForm` y entregan el mismo archivo.
 *
 * 🔴 Lo que se entrega es `public/guia-huasteca-potosina.pdf` (13 páginas, UN
 * itinerario de 5 días). La lista de abajo describe ESE archivo, no la guía de
 * pago (`/api/pdf/guia`: 8 destinos, 3 itinerarios de 3/5/7 días, contactos por
 * municipio), que era lo que prometía esta página. Si cambia el PDF, cambia
 * esta lista.
 *
 * 🔴 NO anunciar «lo que cuesta cada parada» ni «precios actualizados»: las
 * entradas del PDF son de mayo y no cuadran con `DESTINOS_DB` en 7 de 8 paradas
 * (Las Pozas $100 vs $180, Puente de Dios $100 vs $150…). Mientras el PDF no se
 * regenere con el catálogo, se promete solo el gasto aproximado por día, que el
 * propio PDF marca con «~».
 */
const INCLUIDO: { Icon: LucideIcon; text: string }[] = [
  { Icon: Calendar,      text: "Itinerario de 5 días: Tamul y el Sótano, Xilitla y Las Pozas, el Meco, Minas Viejas y Micos, Puente de Dios y Tamasopo" },
  { Icon: MapPin,        text: "Por cada día: la hora de mejor luz, la duración de puerta a puerta y la dificultad" },
  { Icon: DollarSign,    text: "Cuánto gastas al día si vas por tu cuenta (aproximado)" },
  { Icon: Car,           text: "Cómo llegar a cada lugar sin tour, y a Ciudad Valles desde CDMX en avión, autobús o auto" },
  { Icon: BedDouble,     text: "Mejor temporada del año y dónde dormir en tres niveles de precio" },
  { Icon: ClipboardList, text: "Checklist de empaque: ropa, equipo y botiquín" },
  { Icon: Utensils,      text: "Vocabulario huasteco y los platillos que hay que probar" },
  { Icon: Zap,           text: "Notas del guía y lo que NO hacer en cada lugar" },
];

const TESTIMONIOS = [
  { nombre: "Ana R.", ciudad: "CDMX", texto: "Viajé sin haber planeado nada antes. La guía me ahorró 3 días de investigación y no cometí ningún error clásico.", estrellas: 5 },
  { nombre: "Carlos M.", ciudad: "Monterrey", texto: "Los tips de la hora exacta para Tamul y el Sótano de Golondrinas hicieron la diferencia. Fotos que no hubiera conseguido por mi cuenta.", estrellas: 5 },
  { nombre: "Familia Soto", ciudad: "Guadalajara", texto: "Viajamos con tres niños. El itinerario de 5 días fue perfecto — ritmo ideal, sin agotarnos.", estrellas: 5 },
];

// Las MISMAS que el FAQPage de layout.tsx (Google exige que el schema se vea).
const FAQS = [
  { q: "¿Cuánto cuesta?", a: "Nada. Es gratis: solo te pedimos tu correo. Sin pago y sin tarjeta." },
  { q: "¿Cómo me llega?", a: "Al instante: escribes tu correo y la descarga empieza sola en tu celular o computadora." },
  { q: "¿En qué formato la recibo?", a: "En PDF, de 13 páginas. Lo abres en cualquier celular o computadora y lo guardas para consultarlo durante el viaje." },
  { q: "Nunca he ido a la Huasteca, ¿me sirve?", a: "Está hecha justo para eso. Te lleva de la mano desde cómo llegar y cuánto gastar hasta qué hacer cada día, con horarios y errores que debes evitar." },
];

export default function GuiaPage() {
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
            <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-5">✦ PDF gratis · 13 páginas · Edición 2026</p>
            <h1 className="font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(38px,5.5vw,68px)" }}>
              Guía Huasteca Potosina<br />
              <em className="text-dorado">La guía que sí funciona</em>
            </h1>
            <p className="font-cormorant italic text-crema/55 max-w-xl mx-auto md:mx-0 mb-7 text-lg leading-relaxed">
              No es un folleto turístico. Es la guía que un amigo local te daría: con la hora de mejor luz de cada lugar,
              cómo llegar sin tour y los errores que cometen casi todos los turistas.
            </p>

            {/* Oferta: gratis a cambio del correo. Aquí había un «$199» tachado
                y «Precio de lanzamiento · sube pronto» sin fecha: un precio
                anterior que nunca existió y una urgencia inventada. */}
            <div className="flex flex-col items-center md:items-start gap-3 mb-6 w-full max-w-md mx-auto md:mx-0 text-left">
              <p className="font-cormorant font-light text-dorado leading-none" style={{ fontSize: "clamp(40px,5.5vw,60px)" }}>Gratis</p>
              <p className="text-[11px] tracking-[2px] uppercase text-crema/50 font-dm">A cambio de tu correo · descarga inmediata</p>
              <div className="w-full">
                <GuiaGratisForm origen="/guia" />
              </div>
            </div>

            {/* Preview badges */}
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
              {["Itinerario de 5 días", "Cómo llegar sin tour", "Horarios de luz", "Checklist empaque", "Comida y cultura"].map((tag) => (
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
            <span className="text-[11px] text-crema/65 font-dm">{resenasTexto(false)}</span>
          </span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">+10,000 viajeros guiados</span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">Guías NOM-09 SECTUR</span>
          <span className="text-crema/15 hidden sm:inline">·</span>
          <span className="text-[11px] text-crema/55 font-dm">Operando desde 2019</span>
        </div>
        <p className="text-center text-[11px] text-crema/35 font-dm mt-3">
          {/* Sin «los tours #1»: es un superlativo que nada respalda (mismo caso
              que «la operadora mejor calificada» de /nosotros). */}
          Escrita por los guías de Tours Huasteca Potosina.
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
          {FAQS.map((faq) => (
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
        <div className="max-w-md mx-auto text-left">
          <GuiaGratisForm origen="/guia" />
        </div>
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
