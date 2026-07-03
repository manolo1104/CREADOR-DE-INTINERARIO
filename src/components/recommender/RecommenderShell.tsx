"use client";

import { useState, useEffect } from "react";
import { trackTourEvent } from "@/lib/tourTracker";
import Link from "next/link";
import {
  Users, User, UserRound, Baby,
  Camera, Waves, Zap, Leaf, Sunset,
  Star, Clock, MapPin, Shield, ChevronRight,
  MessageCircle, ArrowRight, Flame, TrendingUp,
  CalendarDays, Moon,
} from "lucide-react";
import { TOURS_DB, type Tour } from "@/lib/tours";
import { PAQUETES_DB, type Paquete } from "@/lib/paquetes";

// ── Social proof & urgency data per tour ──────────────────────────────────────

const TOUR_PROOF: Record<string, {
  bookingsMonth: number;
  bookingsWeek:  number;
  spotsLeft:     number;
  trending:      boolean;
  bestFor:       string;
  reviews:       { name: string; city: string; text: string }[];
}> = {
  "tour-rzr-xilitla": {
    bookingsMonth: 94,
    bookingsWeek:  21,
    spotsLeft:     4,
    trending:      true,
    bestFor:       "Amigos, familias y primerizos",
    reviews: [
      { name: "Andrés P.", city: "Querétaro", text: "Manejar el RZR cruzando los ríos fue lo mejor del viaje. Salimos llenos de lodo y muertos de risa. ¡Repetiría mil veces!" },
      { name: "Karla M.",  city: "Monterrey", text: "Nunca había manejado un todoterreno y el guía me dio toda la confianza. La cascada Nanacatli al final es un premiazo." },
    ],
  },
  "tour-rappel-tamul": {
    bookingsMonth: 58,
    bookingsWeek:  12,
    spotsLeft:     3,
    trending:      true,
    bestFor:       "Aventureros y grupos de amigos",
    reviews: [
      { name: "Diego S.",   city: "Querétaro", text: "Nunca había hecho rappel y bajar frente a la Cascada de Tamul fue una locura. Los guías te aseguran súper bien y te explican todo." },
      { name: "Mariana C.", city: "CDMX",      text: "La experiencia más adrenalínica de mi vida. El video con dron que te dan al final lo he visto como veinte veces." },
    ],
  },
  "tour-rafting-tampaon": {
    bookingsMonth: 47,
    bookingsWeek:  9,
    spotsLeft:     6,
    trending:      true,
    bestFor:       "Grupos de amigos y amantes de la adrenalina",
    reviews: [
      { name: "Fernando R.", city: "Monterrey", text: "Los rápidos del Tampaón son otra cosa: agua turquesa de verdad y adrenalina sin parar. El guía dentro de la balsa te da toda la confianza." },
      { name: "Alejandra M.", city: "CDMX",     text: "No sé nadar y aun así lo disfruté muchísimo. El chaleco y el briefing te dan mucha seguridad. El rápido de La Tumba es impresionante." },
    ],
  },
  "tour-tamul": {
    bookingsMonth: 127,
    bookingsWeek:  23,
    spotsLeft:     4,
    trending:      true,
    bestFor:       "Amigos y aventureros",
    reviews: [
      { name: "Carlos M.", city: "CDMX",         text: "La Cascada de Tamul me dejó sin palabras. El mejor día de mi vida." },
      { name: "Sofía R.",  city: "Monterrey",     text: "El sótano de las huahuas al amanecer es indescriptible. ¡Vuelvo el año que viene!" },
    ],
  },
  "tour-edward-james": {
    bookingsMonth: 84,
    bookingsWeek:  11,
    spotsLeft:     7,
    trending:      false,
    bestFor:       "Parejas y amantes del arte",
    reviews: [
      { name: "Ana L.",    city: "Guadalajara",   text: "Las Pozas de Edward James son otro mundo. Imposible de describir con palabras." },
      { name: "Miguel T.", city: "CDMX",          text: "El tour más único que he hecho en México. Los guías conocen cada rincón." },
    ],
  },
  "tour-meco": {
    bookingsMonth: 96,
    bookingsWeek:  18,
    spotsLeft:     5,
    trending:      true,
    bestFor:       "Fotógrafos y parejas",
    reviews: [
      { name: "Laura G.",  city: "Querétaro",     text: "Las fotos que saqué son las mejores de mi vida. El agua realmente es turquesa." },
      { name: "Javier S.", city: "San Luis Potosí", text: "Llegamos a la hora perfecta de luz. Los guías saben exactamente cuándo ir." },
    ],
  },
  "tour-minas-micos": {
    bookingsMonth: 112,
    bookingsWeek:  15,
    spotsLeft:     6,
    trending:      false,
    bestFor:       "Familias con niños",
    reviews: [
      { name: "Patricia H.", city: "Monterrey",   text: "Mis hijos no querían salirse del agua. Perfectamente organizado para familias." },
      { name: "Roberto V.",  city: "CDMX",        text: "El color del agua de Minas Viejas es imposible. Lo tienes que ver con tus propios ojos." },
    ],
  },
  "tour-puente-dios": {
    bookingsMonth: 73,
    bookingsWeek:  9,
    spotsLeft:     8,
    trending:      false,
    bestFor:       "Grupos de amigos",
    reviews: [
      { name: "Diego F.",  city: "Guadalajara",   text: "El Puente de Dios con la luz entrando por el arco es algo de otro mundo." },
      { name: "Valeria C.", city: "CDMX",         text: "Las Siete Cascadas en secuencia son increíbles. ¡Fuimos cinco amigos y quedamos todos maravillados!" },
    ],
  },
};

// ── Wizard data ──────────────────────────────────────────────────────────────

const CIUDADES_POPULARES = [
  "Ciudad de México", "Monterrey", "Guadalajara", "San Luis Potosí",
  "Querétaro", "Puebla", "Tampico", "Otra ciudad",
];

const GRUPOS = [
  { key: "Solo/Sola",        Icon: User,      desc: "A tu ritmo, total libertad" },
  { key: "En pareja",        Icon: UserRound,  desc: "Romántico y memorable" },
  { key: "Familia con niños",Icon: Baby,       desc: "Seguro y divertido para todos" },
  { key: "Con amigos",       Icon: Users,      desc: "Aventura en grupo" },
];

const INTERESES = [
  { key: "Cascadas turquesas", Icon: Waves,   desc: "Pozas y cascadas" },
  { key: "Aventura extrema",   Icon: Zap,     desc: "Adrenalina y retos" },
  { key: "Arte y cultura",     Icon: Leaf,    desc: "Historia y arte" },
  { key: "Fotografía perfecta",Icon: Camera,  desc: "Las mejores fotos" },
  { key: "Relax total",        Icon: Sunset,  desc: "Desconexión y paz" },
];

const ACTIVIDADES = [
  { key: "Tranquilo", label: "Tranquilo", sub: "Caminar poco, disfrutar mucho" },
  { key: "Moderado",  label: "Moderado",  sub: "Algo de caminata, sin exigir" },
  { key: "Intenso",   label: "Intenso",   sub: "Quiero moverme y sentir la aventura" },
];

// Con 3+ días la recomendación incluye el paquete con hospedaje (la API lo decide).
const DIAS_OPCIONES = [
  { key: "1 día",         sub: "Un tour de día completo" },
  { key: "2 días",        sub: "Dos tours, dos aventuras" },
  { key: "3 días",        sub: "Lo esencial con hospedaje" },
  { key: "4 días",        sub: "La Huasteca con calma" },
  { key: "5 o más días",  sub: "La experiencia completa" },
];

// ── Result components ────────────────────────────────────────────────────────

function SocialProofBar({ tourId, reviewCount }: { tourId: string; reviewCount: number }) {
  const proof = TOUR_PROOF[tourId];
  if (!proof) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 border-y border-negro/8 text-xs font-dm text-negro/55">
      <span className="flex items-center gap-1.5 text-amber-600 font-medium">
        <Flame className="w-3.5 h-3.5" />
        {proof.bookingsMonth} reservas este mes
      </span>
      <span className="flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 fill-dorado text-dorado" />
        4.9 · {reviewCount} reseñas verificadas
      </span>
      <span className="flex items-center gap-1.5 text-verde-selva font-medium">
        <TrendingUp className="w-3.5 h-3.5" />
        {proof.bookingsWeek} reservas esta semana
      </span>
    </div>
  );
}

function UrgencyBadge({ spotsLeft }: { spotsLeft: number }) {
  const isHot = spotsLeft <= 5;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-xs font-dm font-medium ${
      isHot
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-amber-50 border border-amber-200 text-amber-700"
    }`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${isHot ? "bg-red-500" : "bg-amber-400"}`} />
      {isHot
        ? `⚠️ Solo ${spotsLeft} lugares disponibles este fin de semana — se llena rápido`
        : `${spotsLeft} lugares disponibles · Reserva con anticipación para asegurar tu fecha`}
    </div>
  );
}

function ReviewCard({ review }: { review: { name: string; city: string; text: string } }) {
  return (
    <div className="bg-crema border border-negro/6 p-4">
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-dorado text-dorado" />
        ))}
      </div>
      <p className="font-dm text-xs text-negro/70 leading-relaxed italic mb-2">&ldquo;{review.text}&rdquo;</p>
      <p className="font-dm text-[10px] text-negro/40 font-medium">{review.name} · {review.city}</p>
    </div>
  );
}

function TourResultCard({
  tour,
  reason,
  highlight,
  isPrimary,
  grupo,
  origen,
}: {
  tour:      Tour;
  reason:    string;
  highlight: string;
  isPrimary: boolean;
  grupo:     string;
  origen:    string;
}) {
  const proof = TOUR_PROOF[tour.id];
  const savings = (tour.precioOriginal ?? tour.precio) - tour.precio;
  const esVehiculo = tour.precioUnidad === "vehiculo";
  const bookHref = esVehiculo ? `/tours/${tour.slug}` : `/reservar-tour/${tour.slug}`;

  return (
    <div className={`bg-white border ${isPrimary ? "border-verde-selva shadow-lg shadow-verde-selva/10" : "border-negro/10"} overflow-hidden`}>
      {/* Image */}
      <div className="relative h-52 sm:h-64 overflow-hidden bg-negro/5">
        <img
          src={tour.imagen_hero}
          alt={tour.nombre}
          className="w-full h-full object-cover"
        />
        {isPrimary && (
          <div className="absolute top-3 left-3 bg-verde-selva text-white text-[9px] tracking-[2px] uppercase font-dm px-3 py-1.5 font-medium">
            ✦ Tu match perfecto
          </div>
        )}
        {proof?.trending && (
          <div className="absolute top-3 right-3 bg-amber-400 text-negro text-[9px] tracking-[1px] uppercase font-dm px-2.5 py-1.5 font-bold">
            🔥 Trending
          </div>
        )}
        {savings > 0 && (
          <div className="absolute bottom-3 right-3 bg-red-500 text-white text-[10px] font-dm font-bold px-2.5 py-1">
            Ahorras ${savings.toLocaleString()} MXN
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Tour meta */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] font-dm text-negro/45 uppercase tracking-wide">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tour.duracion_hrs}h</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tour.tipo}</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Guía certificado</span>
        </div>

        <h3 className="font-cormorant text-verde-profundo text-xl font-light mb-1">{tour.nombre}</h3>
        <p className="font-dm text-[11px] text-negro/50 italic mb-3">{highlight}</p>

        {isPrimary && proof && (
          <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-verde-selva mb-2">
            Ideal para: {proof.bestFor}
          </p>
        )}

        {/* Destinos del tour */}
        <div className="mb-4">
          <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-2">Destinos que visitarás</p>
          <ul className="space-y-1">
            {tour.destinos.slice(0, 4).map((d) => (
              <li key={d} className="flex items-start gap-1.5 text-[11px] font-dm text-negro/65">
                <span className="text-verde-selva flex-shrink-0 mt-0.5">→</span>
                {d}
              </li>
            ))}
            {tour.destinos.length > 4 && (
              <li className="text-[11px] text-negro/35 font-dm pl-3.5">+{tour.destinos.length - 4} más incluidos</li>
            )}
          </ul>
        </div>

        {/* Personalized reason */}
        <div className="bg-verde-selva/5 border-l-2 border-verde-selva px-4 py-3 mb-4">
          <p className="font-dm text-sm text-negro/75 leading-relaxed">{reason}</p>
        </div>

        {isPrimary && proof && <SocialProofBar tourId={tour.id} reviewCount={tour.reviewCount} />}

        {isPrimary && proof && (
          <div className="mt-3 mb-4">
            <UrgencyBadge spotsLeft={proof.spotsLeft} />
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-4 mt-4">
          <div>
            {tour.precioOriginal && tour.precioOriginal > tour.precio && (
              <p className="font-dm text-[11px] text-negro/30 line-through">${tour.precioOriginal.toLocaleString()} MXN</p>
            )}
            <p className="font-cormorant text-verde-profundo font-light" style={{ fontSize: "28px", lineHeight: 1 }}>
              {esVehiculo && <span className="text-base text-negro/40">desde </span>}
              ${tour.precio.toLocaleString()} <span className="text-base text-negro/40">MXN</span>
            </p>
            <p className="font-dm text-[10px] text-negro/40 mt-0.5">
              {tour.id === "tour-rappel-tamul"
                ? "por persona · equipo y fotos con dron incluidos"
                : tour.id === "tour-rzr-xilitla"
                  ? "por vehículo · gasolina, equipo y guía incluidos"
                  : tour.id === "tour-rafting-tampaon"
                    ? "por persona · traslado, equipo, guía y comida incluidos"
                    : "por persona · todo incluido"}
            </p>
          </div>
          <Link
            href={bookHref}
            className={`flex-shrink-0 flex items-center gap-2 px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-all ${
              isPrimary
                ? "bg-verde-selva hover:bg-verde-vivo text-white"
                : "border border-verde-selva/50 hover:bg-verde-selva/8 text-verde-selva"
            }`}
          >
            {isPrimary ? (esVehiculo ? "Ver rutas y reservar" : "Reservar ahora") : "Ver tour"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* WhatsApp for primary */}
        {isPrimary && (
          <a
            href={`https://wa.me/524891251458?text=${encodeURIComponent(
              `Hola, el recomendador IA me sugirió el tour "${tour.nombre}" para ${grupo} desde ${origen}. ¿Tienen disponibilidad?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full border border-[#25D366]/40 hover:bg-[#25D366]/8 text-[#25D366] py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Preguntar por WhatsApp
          </a>
        )}

        {/* Reviews for primary */}
        {isPrimary && proof?.reviews && (
          <div className="mt-5">
            <p className="text-[9px] tracking-[2px] uppercase font-dm text-negro/35 mb-3">Lo que dicen quienes lo hicieron</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {proof.reviews.map((r, i) => <ReviewCard key={i} review={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaqueteResultCard({
  paquete,
  reason,
  dias,
  grupo,
  origen,
}: {
  paquete: Paquete;
  reason:  string;
  dias:    string;
  grupo:   string;
  origen:  string;
}) {
  return (
    <div className="bg-white border border-dorado shadow-lg shadow-dorado/10 overflow-hidden">
      {/* Image */}
      <div className="relative h-52 sm:h-64 overflow-hidden bg-negro/5">
        <img src={paquete.imagen} alt={paquete.nombre} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 bg-dorado text-negro text-[9px] tracking-[2px] uppercase font-dm px-3 py-1.5 font-bold">
          ✦ Tu plan completo para {dias}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] font-dm text-negro/45 uppercase tracking-wide">
          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{paquete.duracion}</span>
          <span className="flex items-center gap-1"><Moon className="w-3 h-3" />Hotel Paraíso Encantado, Xilitla</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Todo coordinado</span>
        </div>

        <h3 className="font-cormorant text-verde-profundo text-xl font-light mb-1">{paquete.nombre}</h3>
        <p className="font-dm text-[11px] text-negro/50 italic mb-3">{paquete.subtitulo}</p>

        {/* Tours del paquete */}
        <div className="mb-4">
          <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-2">Lo que vivirás</p>
          <ul className="space-y-1">
            {paquete.tours.slice(0, 4).map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[11px] font-dm text-negro/65">
                <span className="text-dorado flex-shrink-0 mt-0.5">→</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Personalized reason */}
        <div className="bg-dorado/8 border-l-2 border-dorado px-4 py-3 mb-4">
          <p className="font-dm text-sm text-negro/75 leading-relaxed">{reason}</p>
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-4 mt-4">
          <div>
            <p className="font-cormorant text-verde-profundo font-light" style={{ fontSize: "28px", lineHeight: 1 }}>
              ${paquete.precio.toLocaleString()} <span className="text-base text-negro/40">MXN</span>
            </p>
            <p className="font-dm text-[10px] text-negro/40 mt-0.5">
              {paquete.precioLabel} (2 personas) · tours + hotel + transporte local
            </p>
          </div>
          <Link
            href={`/paquetes/${paquete.slug}`}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium bg-dorado hover:bg-verde-selva text-negro hover:text-white transition-all"
          >
            Ver día por día
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <a
          href={`https://wa.me/524891251458?text=${encodeURIComponent(
            `Hola, el recomendador IA me sugirió el ${paquete.nombre} (${paquete.duracion}) para ${grupo} desde ${origen}, con ${dias} disponibles. ¿Tienen disponibilidad?`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full border border-[#25D366]/40 hover:bg-[#25D366]/8 text-[#25D366] py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Cotizar este plan por WhatsApp
        </a>
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

const DESTINOS_BUCKET = [
  "Recorrido en RZR por Xilitla (off-road)",
  "Cascada de Tamul",
  "Las Pozas de Xilitla (Edward James)",
  "Cascadas del Meco",
  "Minas Viejas",
  "Puente de Dios",
  "Sótano de las Huahuas",
  "Cascadas de Micos",
  "Sin preferencia — sorpréndeme",
];

type WizardStep = "origen" | "dias" | "grupo" | "intereses" | "actividad" | "destino" | "loading" | "result";

interface WizardState {
  origen:    string;
  dias:      string;
  grupo:     string;
  intereses: string[];
  actividad: string;
  destino:   string;
}

interface AIResult {
  primary:   { tourId: string; reason: string; highlight: string };
  secondary: { tourId: string; reason: string };
  paquete?:  { slug: string; reason: string } | null;
}

export function RecommenderShell() {
  const [step,   setStep]   = useState<WizardStep>("origen");
  const [state,  setState]  = useState<WizardState>({ origen: "", dias: "", grupo: "", intereses: [], actividad: "", destino: "" });
  const [result, setResult] = useState<AIResult | null>(null);
  const [origenInput, setOrigenInput] = useState("");
  const [showInput, setShowInput]     = useState(false);
  const [viewers, setViewers]         = useState(12);

  useEffect(() => {
    const t = setInterval(() => {
      setViewers(Math.floor(Math.random() * 10) + 10);
    }, 45_000);
    return () => clearInterval(t);
  }, []);

  function toggleInteres(key: string) {
    setState((s) => ({
      ...s,
      intereses: s.intereses.includes(key)
        ? s.intereses.filter((i) => i !== key)
        : [...s.intereses, key],
    }));
  }

  async function submit() {
    setStep("loading");
    trackTourEvent("RECOMMENDER_STARTED", {
      origen:    state.origen,
      dias:      state.dias,
      grupo:     state.grupo,
      intereses: state.intereses,
      actividad: state.actividad,
      destino:   state.destino,
    });
    try {
      const res = await fetch("/api/recomendar-tour", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen:    state.origen,
          dias:      state.dias,
          grupo:     state.grupo,
          intereses: state.intereses,
          actividad: state.actividad,
          destino:   state.destino,
        }),
      });
      const data: AIResult = await res.json();
      setResult(data);
      setStep("result");
      trackTourEvent("RECOMMENDER_COMPLETED", {
        primary_tour:   data.primary.tourId,
        secondary_tour: data.secondary.tourId,
        origen:         state.origen,
        grupo:          state.grupo,
        intereses:      state.intereses,
      });
    } catch {
      setStep("result");
    }
  }

  const primaryTour   = result ? TOURS_DB.find((t) => t.id === result.primary.tourId)   : null;
  const secondaryTour = result ? TOURS_DB.find((t) => t.id === result.secondary.tourId) : null;
  const paqueteRec    = result?.paquete ? PAQUETES_DB.find((p) => p.slug === result.paquete!.slug) : null;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0e1710" }}>
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-2 border-verde-selva/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-verde-selva animate-spin border-t-transparent" />
          </div>
          <p className="font-cormorant text-crema text-2xl mb-2">Analizando tu perfil…</p>
          <p className="font-dm text-crema/40 text-sm">Buscando el tour perfecto para ti entre 8 experiencias únicas</p>
        </div>
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (step === "result" && result && primaryTour) {
    return (
      <main className="min-h-screen bg-crema pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-5">

          {/* Live viewers */}
          <div className="flex items-center justify-center gap-2 mb-6 text-xs font-dm text-amber-700 bg-amber-50 border border-amber-200 py-2 px-4">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <strong>{viewers} personas</strong> están buscando tours en este momento
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-2">Tu recomendación personalizada</p>
            <h1 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(28px,5vw,42px)" }}>
              {paqueteRec
                ? <>Encontramos tu plan <em className="text-dorado">perfecto</em></>
                : <>Encontramos tu tour <em className="text-dorado">perfecto</em></>}
            </h1>
            <p className="font-dm text-sm text-negro/50 max-w-sm mx-auto">
              Basado en tu perfil de {state.grupo.toLowerCase()} desde {state.origen}
              {state.dias ? ` · ${state.dias}` : ""}
            </p>
          </div>

          {/* Paquete recomendado (3+ días): el plan completo con hospedaje */}
          {paqueteRec && result.paquete && (
            <div className="mb-8">
              <PaqueteResultCard
                paquete={paqueteRec}
                reason={result.paquete.reason}
                dias={state.dias}
                grupo={state.grupo}
                origen={state.origen}
              />
            </div>
          )}

          {/* Primary tour */}
          <div className="mb-6">
            {paqueteRec && (
              <p className="text-[9px] tracking-[3px] uppercase font-dm text-negro/35 mb-3">
                ¿Prefieres armar tu viaje por día? Tu tour ideal:
              </p>
            )}
            <TourResultCard
              tour={primaryTour}
              reason={result.primary.reason}
              highlight={result.primary.highlight}
              isPrimary={true}
              grupo={state.grupo}
              origen={state.origen}
            />
          </div>

          {/* Secondary tour */}
          {secondaryTour && (
            <div className="mb-8">
              <p className="text-[9px] tracking-[3px] uppercase font-dm text-negro/35 mb-3">
                {state.dias === "2 días" ? "Tu segundo día perfecto" : "También podría gustarte"}
              </p>
              <TourResultCard
                tour={secondaryTour}
                reason={result.secondary.reason}
                highlight={secondaryTour.tagline}
                isPrimary={false}
                grupo={state.grupo}
                origen={state.origen}
              />
            </div>
          )}

          {/* Guarantees */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Cancela gratis",   sub: "Hasta 48h antes" },
              { label: "Pago seguro",       sub: "Stripe + cifrado" },
              { label: "Guía certificado", sub: "NOM-09 oficial" },
            ].map((g) => (
              <div key={g.label} className="bg-white border border-negro/8 p-3 text-center">
                <p className="font-dm text-[11px] font-medium text-negro/70 mb-0.5">{g.label}</p>
                <p className="font-dm text-[9px] text-negro/35">{g.sub}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setResult(null); setStep("origen"); setState({ origen: "", dias: "", grupo: "", intereses: [], actividad: "", destino: "" }); }}
            className="text-xs font-dm text-negro/35 hover:text-negro/60 underline text-center block mx-auto transition-colors"
          >
            ← Volver a empezar con otro perfil
          </button>
        </div>
      </main>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────

  const STEP_NUMS: Partial<Record<WizardStep, number>> = { origen: 1, dias: 2, grupo: 3, intereses: 4, actividad: 5, destino: 6 };
  const stepNum = STEP_NUMS[step] ?? 1;
  const progress = (stepNum / 6) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0e1710" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
        <span className="font-cormorant text-crema text-lg">
          Huasteca <em className="text-dorado">IA</em>
        </span>
        <div className="flex items-center gap-2 text-[10px] font-dm text-crema/35">
          <span className="w-1.5 h-1.5 bg-verde-vivo rounded-full animate-pulse" />
          {viewers} personas buscando ahora
        </div>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-white/6">
        <div
          className="h-full bg-gradient-to-r from-verde-selva to-lima transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main */}
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12">

        {/* STEP 1: ORIGEN */}
        {step === "origen" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 01 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿De dónde nos <em className="text-dorado">visitas?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Te ayuda a personalizar tu experiencia</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {CIUDADES_POPULARES.filter((c) => c !== "Otra ciudad").map((ciudad) => (
                <button
                  key={ciudad}
                  onClick={() => setState((s) => ({ ...s, origen: ciudad }))}
                  className={`border py-3 px-3 text-xs font-dm transition-all text-center ${
                    state.origen === ciudad
                      ? "border-verde-vivo bg-verde-vivo/15 text-crema font-medium"
                      : "border-crema/20 text-crema/60 hover:border-verde-selva/50 hover:text-crema"
                  }`}
                >
                  {ciudad}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowInput((v) => !v)}
              className="text-[11px] font-dm text-crema/35 hover:text-crema/60 underline mb-4 block transition-colors"
            >
              {showInput ? "Ocultar" : "Mi ciudad no está en la lista"}
            </button>

            {showInput && (
              <input
                autoFocus
                type="text"
                placeholder="Escribe tu ciudad…"
                value={origenInput}
                onChange={(e) => {
                  setOrigenInput(e.target.value);
                  setState((s) => ({ ...s, origen: e.target.value }));
                }}
                className="w-full border border-crema/20 bg-transparent text-crema placeholder:text-crema/25 px-4 py-3 text-sm font-dm outline-none focus:border-verde-vivo mb-4"
              />
            )}

            <button
              onClick={() => setStep("dias")}
              disabled={!state.origen}
              className="mt-4 bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: DÍAS DISPONIBLES */}
        {step === "dias" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 02 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cuántos <em className="text-dorado">días</em> tienen para<br />visitar la Huasteca?
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Con 3 o más días te armamos un plan completo con hospedaje</p>

            <div className="space-y-3 mb-10">
              {DIAS_OPCIONES.map(({ key, sub }) => (
                <button
                  key={key}
                  onClick={() => setState((s) => ({ ...s, dias: key }))}
                  className={`w-full flex items-center justify-between border px-6 py-4 text-left transition-all ${
                    state.dias === key
                      ? "border-verde-vivo bg-verde-vivo/10"
                      : "border-crema/20 hover:border-verde-selva/40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <CalendarDays className="w-5 h-5 text-verde-selva flex-shrink-0" />
                    <div>
                      <div className="text-sm font-dm text-crema font-medium">{key}</div>
                      <div className="text-[11px] text-crema/40 mt-0.5">{sub}</div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 transition-all flex-shrink-0 ${
                    state.dias === key ? "bg-verde-vivo border-verde-vivo" : "border-crema/25"
                  }`} />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("origen")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("grupo")}
                disabled={!state.dias}
                className="flex-1 bg-verde-selva text-crema py-3.5 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GRUPO */}
        {step === "grupo" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 03 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cómo <em className="text-dorado">viajas?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Personalizamos el tour según tu grupo</p>

            <div className="grid grid-cols-2 gap-3 mb-10">
              {GRUPOS.map(({ key, Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setState((s) => ({ ...s, grupo: key }))}
                  className={`border p-6 text-center transition-all ${
                    state.grupo === key
                      ? "border-dorado bg-dorado/10"
                      : "border-crema/20 hover:border-dorado/40"
                  }`}
                >
                  <Icon className="w-7 h-7 text-verde-selva mx-auto mb-2" />
                  <div className="text-sm font-dm text-crema mb-1">{key}</div>
                  <div className="text-[10px] text-crema/35 leading-tight">{desc}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("dias")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("intereses")}
                disabled={!state.grupo}
                className="flex-1 bg-verde-selva text-crema py-3.5 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: INTERESES */}
        {step === "intereses" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 04 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Qué te <em className="text-dorado">emociona?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Selecciona uno o varios</p>

            <div className="space-y-2.5 mb-10">
              {INTERESES.map(({ key, Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => toggleInteres(key)}
                  className={`w-full flex items-center gap-4 border px-5 py-4 text-left transition-all ${
                    state.intereses.includes(key)
                      ? "border-verde-vivo bg-verde-vivo/10"
                      : "border-crema/20 hover:border-verde-selva/40"
                  }`}
                >
                  <div className={`w-5 h-5 border rounded flex items-center justify-center flex-shrink-0 text-[9px] transition-all ${
                    state.intereses.includes(key) ? "bg-verde-vivo border-verde-vivo text-negro" : "border-crema/30"
                  }`}>
                    {state.intereses.includes(key) ? "✓" : ""}
                  </div>
                  <Icon className="w-5 h-5 text-verde-selva flex-shrink-0" />
                  <div>
                    <div className="text-sm font-dm text-crema">{key}</div>
                    <div className="text-[11px] text-crema/35">{desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("grupo")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("actividad")}
                disabled={state.intereses.length === 0}
                className="flex-1 bg-verde-selva text-crema py-3.5 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: ACTIVIDAD */}
        {step === "actividad" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 05 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cuánta <em className="text-dorado">energía</em> tienes?
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Para recomendarte el ritmo ideal</p>

            <div className="space-y-3 mb-10">
              {ACTIVIDADES.map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setState((s) => ({ ...s, actividad: key }))}
                  className={`w-full flex items-center justify-between border px-6 py-5 text-left transition-all ${
                    state.actividad === key
                      ? "border-verde-vivo bg-verde-vivo/10"
                      : "border-crema/20 hover:border-verde-selva/40"
                  }`}
                >
                  <div>
                    <div className="text-sm font-dm text-crema font-medium">{label}</div>
                    <div className="text-[11px] text-crema/40 mt-0.5">{sub}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 transition-all flex-shrink-0 ${
                    state.actividad === key ? "bg-verde-vivo border-verde-vivo" : "border-crema/25"
                  }`} />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("intereses")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("destino")}
                disabled={!state.actividad}
                className="flex-1 bg-verde-selva text-crema py-3.5 text-[11px] tracking-[4px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: DESTINO SOÑADO */}
        {step === "destino" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 06 · 06</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Hay un lugar que no te<br />
              puedes <em className="text-dorado">perder?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Si tienes un destino en mente, lo incluimos en la recomendación</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-10">
              {DESTINOS_BUCKET.map((d) => (
                <button
                  key={d}
                  onClick={() => setState((s) => ({ ...s, destino: d }))}
                  className={`border px-4 py-3.5 text-left text-sm font-dm transition-all ${
                    state.destino === d
                      ? "border-verde-vivo bg-verde-vivo/10 text-crema font-medium"
                      : "border-crema/20 text-crema/60 hover:border-verde-selva/40 hover:text-crema"
                  }`}
                >
                  {d === "Sin preferencia — sorpréndeme" ? (
                    <span className="text-dorado/80">{d}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="text-verde-vivo text-xs">→</span>
                      {d}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Trust signal */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/8 px-4 py-3 mb-6">
              <Shield className="w-4 h-4 text-verde-selva flex-shrink-0" />
              <p className="text-[11px] font-dm text-crema/50 leading-snug">
                Recomendación gratuita · Sin compromisos · Cancela gratis hasta 48h antes
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("actividad")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={submit}
                disabled={!state.destino}
                className="flex-1 bg-dorado text-negro py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✦ Ver mi plan perfecto
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
