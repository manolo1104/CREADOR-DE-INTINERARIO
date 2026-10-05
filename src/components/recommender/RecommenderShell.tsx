"use client";

import { useState, useEffect, useRef } from "react";
import { resenasTexto } from "@/lib/resenas";
import { trackTourEvent } from "@/lib/tourTracker";
import Link from "next/link";
import {
  Users, User, UserRound, Baby,
  Camera, Waves, Zap, Leaf, Sunset,
  Star, Clock, MapPin, Shield, ChevronRight,
  MessageCircle, ArrowRight,
  CalendarDays, Moon,
} from "lucide-react";
import { TOURS_DB, tourDurTexto, type Tour, precioTachado, promoDe, etiquetaUnidad, PROMO_TEMPORADA } from "@/lib/tours";
import { PAQUETES_DB, precioVisible, precioVisibleTachado, type Paquete } from "@/lib/paquetes";
// El "Ideal para" de cada tour vive en `lib/idealPara.ts` (2 oct 2026): el
// comparador también lo pinta, en un Server Component, y una constante de este
// archivo "use client" le llegaría como `[object Object]`.
import { IDEAL_PARA } from "@/lib/idealPara";
import { urlComparar } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";

// ── Testimonios, por tour ─────────────────────────────────────────────────────
//
// 🔴 28 sep 2026 — Aquí vivían «127 reservas este mes», «23 reservas esta
// semana», «⚠️ Solo 4 lugares disponibles este fin de semana» y un «🔥 Trending»,
// todos escritos a mano: no leían ni la base (57 reservas en TOTAL) ni la
// ocupación. Los de «este mes» eran los reviewCount inventados, reciclados. Se
// quitaron los conteos, la escasez y el sello; quedan los testimonios y la
// calificación del NEGOCIO (resenas.ts). Si algún día hay escasez de verdad,
// sale de la disponibilidad real, nunca de una constante.

const TOUR_PROOF: Record<string, {
  reviews:       { name: string; city: string; text: string }[];
}> = {
  "tour-rzr-xilitla": {
    reviews: [
      { name: "Andrés P.", city: "Querétaro", text: "Manejar el RZR cruzando los ríos fue lo mejor del viaje. Salimos llenos de lodo y muertos de risa. ¡Repetiría mil veces!" },
      { name: "Karla M.",  city: "Monterrey", text: "Nunca había manejado un todoterreno y el guía me dio toda la confianza. La Aldea Nanacatli, con sus casitas de hongos, al final es un premiazo." },
    ],
  },
  "tour-rappel-tamul": {
    reviews: [
      { name: "Diego S.",   city: "Querétaro", text: "Nunca había hecho rappel y bajar frente a la Cascada de Tamul fue una locura. Los guías te aseguran súper bien y te explican todo." },
      { name: "Mariana C.", city: "CDMX",      text: "La experiencia más adrenalínica de mi vida. El video con dron que te dan al final lo he visto como veinte veces." },
    ],
  },
  "tour-rafting-tampaon": {
    reviews: [
      { name: "Fernando R.", city: "Monterrey", text: "Los rápidos del Tampaón son otra cosa: agua turquesa de verdad y adrenalina sin parar. El guía dentro de la balsa te da toda la confianza." },
      { name: "Alejandra M.", city: "CDMX",     text: "No sé nadar y aun así lo disfruté muchísimo. El chaleco y el briefing te dan mucha seguridad. El rápido de La Tumba es impresionante." },
    ],
  },
  "tour-tamul": {
    reviews: [
      { name: "Carlos M.", city: "CDMX",         text: "La Cascada de Tamul me dejó sin palabras. El mejor día de mi vida." },
      { name: "Sofía R.",  city: "Monterrey",     text: "El Sótano de las Huahuas al atardecer es indescriptible. ¡Vuelvo el año que viene!" },
    ],
  },
  "tour-edward-james": {
    reviews: [
      { name: "Ana L.",    city: "Guadalajara",   text: "Las Pozas de Edward James son otro mundo. Imposible de describir con palabras." },
      { name: "Miguel T.", city: "CDMX",          text: "El tour más único que he hecho en México. Los guías conocen cada rincón." },
    ],
  },
  "tour-meco": {
    reviews: [
      { name: "Laura G.",  city: "Querétaro",     text: "Las fotos que saqué son las mejores de mi vida. El agua realmente es turquesa." },
      { name: "Javier S.", city: "San Luis Potosí", text: "Llegamos a la hora perfecta de luz. Los guías saben exactamente cuándo ir." },
    ],
  },
  "tour-minas-micos": {
    reviews: [
      { name: "Patricia H.", city: "Monterrey",   text: "Mis hijos no querían salirse del agua. Perfectamente organizado para familias." },
      { name: "Roberto V.",  city: "CDMX",        text: "El color del agua de Minas Viejas es imposible. Lo tienes que ver con tus propios ojos." },
    ],
  },
  "tour-puente-dios": {
    reviews: [
      { name: "Diego F.",  city: "Guadalajara",   text: "El Puente de Dios con la luz entrando por el arco es algo de otro mundo." },
      { name: "Valeria C.", city: "CDMX",         text: "Las Siete Cascadas en secuencia son increíbles. ¡Fuimos cinco amigos y quedamos todos maravillados!" },
    ],
  },
  "tour-buceo-media-luna": {
    reviews: [
      { name: "Mariana E.", city: "San Luis Potosí", text: "Nunca había buceado y el instructor me dio toda la confianza. El agua de la Media Luna es tan clara que parece una alberca gigante. ¡Repetiría sin pensarlo!" },
      // Antes firmaba «Diego F.» igual que el de Puente de Dios pero desde otra
      // ciudad: la misma persona en dos lugares delata el copiado.
      { name: "Emilio R.",  city: "Querétaro",        text: "Mi primera inmersión y no pudo ser mejor lugar. Agua fresca y cristalina, visibilidad brutal y en cuatro horas pasas de no saber nada a respirar bajo el agua." },
    ],
  },
  // Los 5 recorridos nuevos (sep 2026): con su «ideal para» real; sin reseñas
  // todavía —el render lo tolera— porque no hay ninguna que citar.
  "tour-eden-jardin": {
    reviews: [],
  },
  "tour-travesia-cafe": {
    reviews: [],
  },
  "tour-gruta-xilo": {
    reviews: [],
  },
  "tour-amanecer-nubes": {
    reviews: [],
  },
  "tour-olla-de-la-luz": {
    reviews: [],
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

/** Solo la calificación del negocio en Google; sin conteos de reservas. */
function SocialProofBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 mb-4 border-y border-negro/8 text-xs font-dm text-negro/55">
      <span className="flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 fill-dorado text-dorado" />
        {resenasTexto(false)}
      </span>
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
  const savings = (precioTachado(tour) ?? tour.precio) - tour.precio;
  const promo = promoDe(tour);
  const esVehiculo = tour.precioUnidad === "vehiculo";
  // «desde» siempre que la cifra sea la MÁS BAJA de un rango: el RZR (por
  // vehículo, según ruta/unidad) y el Edén (tarifa por grupo por escalones).
  const esDesde = esVehiculo || !!tour.tarifaGrupo?.length;
  const bookHref = `/reservar/carrito?agregar=${tour.slug}`;
  const fichaHref = `/tours/${tour.slug}`;

  return (
    <div className={`bg-white border ${isPrimary ? "border-verde-selva shadow-lg shadow-verde-selva/10" : "border-negro/10"} overflow-hidden`}>
      {/* Imagen y nombre clicables a la ficha: antes no había NINGUNA liga a
          /tours/[slug] y el botón del secundario decía «Ver tour» pero metía
          el tour al carrito. */}
      <Link href={fichaHref} className="relative block h-52 sm:h-64 overflow-hidden bg-negro/5">
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
        {savings > 0 && (
          <div className="absolute bottom-3 right-3 bg-red-500 text-white text-[10px] font-dm font-bold px-2.5 py-1">
            Ahorras ${savings.toLocaleString()} MXN
          </div>
        )}
      </Link>

      <div className="p-5">
        {/* Tour meta */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] font-dm text-negro/45 uppercase tracking-wide">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tourDurTexto(tour)}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tour.tipo}</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Guía incluido</span>
        </div>

        <h3 className="font-cormorant text-verde-profundo text-xl font-light mb-1">
          <Link href={fichaHref} className="hover:text-verde-selva transition-colors">{tour.nombre}</Link>
        </h3>
        <p className="font-dm text-[11px] text-negro/50 italic mb-3">{highlight}</p>

        {isPrimary && IDEAL_PARA[tour.id] && (
          <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-verde-selva mb-2">
            Ideal para: {IDEAL_PARA[tour.id].es}
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

        {isPrimary && proof && <SocialProofBar />}

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-4 mt-4">
          <div>
            {precioTachado(tour) && (
              <p className="font-dm text-[11px] text-negro/30 line-through">${precioTachado(tour)!.toLocaleString()} MXN</p>
            )}
            <p className="font-cormorant text-verde-profundo font-light" style={{ fontSize: "28px", lineHeight: 1 }}>
              {esDesde && <span className="text-base text-negro/40">desde </span>}
              ${tour.precio.toLocaleString()} <span className="text-base text-negro/40">MXN</span>
            </p>
            {/* 🔴 Antes un ternario fijo de 4 IDs mandaba al Edén (tarifa POR
                GRUPO) como «por persona» y le colgaba «todo incluido» a tours
                sin alimentos. La unidad sale del catálogo, como en el resto
                del sitio. */}
            <p className="font-dm text-[10px] text-negro/40 mt-0.5">{etiquetaUnidad(tour)}</p>
            {promo && (
              <p className="font-dm text-[10px] text-dorado mt-0.5 font-medium">
                Temporada baja · −${promo.monto} en fechas hasta el {promo.hastaTexto.es}
              </p>
            )}
          </div>
          <Link
            href={isPrimary ? bookHref : fichaHref}
            className={`flex-shrink-0 flex items-center gap-2 px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-all ${
              isPrimary
                ? "bg-verde-selva hover:bg-verde-vivo text-white"
                : "border border-verde-selva/50 hover:bg-verde-selva/8 text-verde-selva"
            }`}
          >
            {isPrimary ? (esVehiculo ? "Ver rutas y reservar" : "Reservar ahora") : "Ver tour completo"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* WhatsApp for primary */}
        {isPrimary && (
          <a
            href={`https://wa.me/524891090388?text=${encodeURIComponent(
              `Hola, el recomendador me sugirió "${tour.nombre}" (viaje: ${grupo.toLowerCase()}, desde ${origen}). ¿Tienen disponibilidad?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            data-wa-manual="1"
            onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "recomendador_resultado", tour: tour.slug })}
            className="mt-3 flex items-center justify-center gap-2 w-full border border-[#25D366]/40 hover:bg-[#25D366]/8 text-[#25D366] py-2.5 text-[10px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Preguntar por WhatsApp
          </a>
        )}

        {/* Reviews for primary */}
        {isPrimary && proof && proof.reviews.length > 0 && (
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
            {precioVisibleTachado(paquete) && (
              <p className="font-dm text-[11px] text-negro/30 line-through">${precioVisibleTachado(paquete)!.toLocaleString()} MXN</p>
            )}
            <p className="font-cormorant text-verde-profundo font-light" style={{ fontSize: "28px", lineHeight: 1 }}>
              ${precioVisible(paquete).toLocaleString()} <span className="text-base text-negro/40">MXN</span>
            </p>
            <p className="font-dm text-[10px] text-negro/40 mt-0.5">
              {paquete.precioLabel} · tours + hotel + transporte local
            </p>
            {precioVisibleTachado(paquete) && (
              <p className="font-dm text-[10px] text-dorado mt-0.5 font-medium">
                Temporada baja · para viajes hasta el {PROMO_TEMPORADA.hastaTexto.es}
              </p>
            )}
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
          href={`https://wa.me/524891090388?text=${encodeURIComponent(
            `Hola, el recomendador me sugirió el ${paquete.nombre} (${paquete.duracion}); viaje: ${grupo.toLowerCase()}, desde ${origen}, ${dias}. ¿Tienen disponibilidad?`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-manual="1"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "recomendador_paquete", tour: paquete.slug })}
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
  "Laguna de la Media Luna (buceo)",
  // Los recorridos nuevos (sep 2026): sin estas opciones, sus bonos del
  // respaldo por destino no se podían alcanzar desde la interfaz.
  "Gruta de Xilo (recorrido nocturno)",
  "Amanecer de Nubes (Cerro del Pilón)",
  "Olla de la Luz (bosque de niebla)",
  "Finca de café de Xilitla",
  "Sin preferencia — sorpréndeme",
];

type WizardStep = "origen" | "dias" | "grupo" | "intereses" | "actividad" | "destino" | "detalles" | "correo" | "loading" | "result" | "error";

interface WizardState {
  origen:    string;
  dias:      string;
  grupo:     string;
  intereses: string[];
  actividad: string;
  destino:   string;
  /** Lo que la persona escribe con sus palabras (paso 7, opcional). */
  notas:     string;
}

interface AIResult {
  primary:   { tourId: string; reason: string; highlight: string };
  secondary: { tourId: string; reason: string };
  paquete?:  { slug: string; reason: string } | null;
}

const ESTADO_INICIAL: WizardState = { origen: "", dias: "", grupo: "", intereses: [], actividad: "", destino: "", notas: "" };

export function RecommenderShell() {
  const [step,   setStep]   = useState<WizardStep>("origen");
  const [state,  setState]  = useState<WizardState>(ESTADO_INICIAL);
  const [result, setResult] = useState<AIResult | null>(null);
  const [origenInput, setOrigenInput] = useState("");
  const [showInput, setShowInput]     = useState(false);
  const [email,      setEmail]      = useState("");
  const [emailError, setEmailError] = useState("");
  // 🔴 Aquí vivía un contador FALSO («12-19 personas están buscando tours»)
  // animado con un setInterval de números al azar. Fuera: es la misma clase de
  // escasez inventada que ya se limpió del resto del sitio.

  /**
   * «Empezó el recomendador» se marca al PRIMER clic del paso 1, una sola vez.
   * Antes se disparaba al final —junto con el correo—, así que la métrica no
   * distinguía a quien probó y se fue de quien nunca entró, y encima guardaba
   * el correo dentro del evento.
   */
  // Al cambiar de paso, el foco visual vuelve arriba: en móvil el botón
  // «Continuar» queda abajo y el paso nuevo abría a media pantalla.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const inicioMarcado = useRef(false);
  function marcarInicio() {
    if (inicioMarcado.current) return;
    inicioMarcado.current = true;
    trackTourEvent("RECOMMENDER_STARTED", {});
  }

  function toggleInteres(key: string) {
    setState((s) => ({
      ...s,
      intereses: s.intereses.includes(key)
        ? s.intereses.filter((i) => i !== key)
        : [...s.intereses, key],
    }));
  }

  // Compuerta de correo: se pide el email ANTES de correr el agente y se manda
  // en la misma petición que genera el plan.
  //
  // Aquí había además una llamada suelta a `/api/guardar-email` con la fuente
  // "Recomendador". Parecía inofensiva —solo anotaba el correo en la hoja— pero
  // de paso creaba la fila del lead, y como salía primero, `/api/recomendar-tour`
  // ya no veía a la persona como nueva y NO le mandaba su propuesta al instante:
  // le llegaba en la siguiente corrida del cron, hasta una hora después. La hoja
  // la escribe ahora la propia ruta del recomendador, que es la única que sabe
  // qué se le recomendó.
  function submitCorreo() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailError("Escribe un correo válido para ver tu recomendación.");
      return;
    }
    setEmailError("");
    setEmail(e);
    void submit(e);
  }

  /**
   * 🔴 La versión anterior no revisaba `res.ok`: un 429 metía `{error}` en
   * `setResult` y React tronaba al pintar; un fallo de red dejaba `result` en
   * null y la página quedaba EN BLANCO, sin botones ni mensaje. Ahora todo
   * fallo cae al paso `error`, con reintento y salida por WhatsApp. El propio
   * paso `loading` es el candado contra el doble envío.
   */
  async function submit(correo: string) {
    if (step === "loading") return;
    setStep("loading");
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
          notas:     state.notas,
          email:     correo,
        }),
      });
      const data = (await res.json().catch(() => null)) as AIResult | null;
      if (!res.ok || !data?.primary?.tourId || !data?.secondary?.tourId) {
        setStep("error");
        return;
      }
      setResult(data);
      setStep("result");
      // El puente de `trackTourEvent` convierte LEAD_* en `generate_lead` de GA4.
      trackTourEvent("LEAD_RECOMENDADOR", { fuente: "Recomendador" });
      trackTourEvent("RECOMMENDER_COMPLETED", {
        primary_tour:   data.primary.tourId,
        secondary_tour: data.secondary.tourId,
        paquete:        data.paquete?.slug ?? null,
        dias:           state.dias,
        conNotas:       state.notas.length > 0,
        origen:         state.origen,
        grupo:          state.grupo,
        intereses:      state.intereses,
      });
    } catch {
      setStep("error");
    }
  }

  const primaryTour   = result ? TOURS_DB.find((t) => t.id === result.primary.tourId)   : null;
  const secondaryTour = result ? TOURS_DB.find((t) => t.id === result.secondary.tourId) : null;
  const paqueteRec    = result?.paquete ? PAQUETES_DB.find((p) => p.slug === result.paquete!.slug) : null;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "#0e1710" }}>
        <div className="text-center px-6" role="status" aria-live="polite">
          <div className="w-16 h-16 mx-auto mb-6 relative" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border-2 border-verde-selva/20 motion-safe:animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-verde-selva motion-safe:animate-spin border-t-transparent" />
          </div>
          <p className="font-cormorant text-crema text-2xl mb-2">Analizando tu perfil…</p>
          <p className="font-dm text-crema/40 text-sm">{`Buscando el tour perfecto para ti entre ${TOURS_DB.length} experiencias únicas`}</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  // También ataja `result` incompleto: mejor esta pantalla que una en blanco.
  if (step === "error" || (step === "result" && (!result || !primaryTour || !secondaryTour))) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: "#0e1710" }}>
        <div className="text-center px-6 max-w-md">
          <p className="font-cormorant text-crema text-3xl mb-3">Se nos atoró la canoa</p>
          <p className="font-dm text-crema/55 text-sm mb-8 leading-relaxed">
            No pudimos generar tu recomendación en este momento. Tus respuestas
            siguen aquí: inténtalo de nuevo, o escríbenos y una persona te
            recomienda en minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => void submit(email)}
              className="bg-dorado text-negro px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium hover:bg-lima transition-colors"
            >
              Intentar de nuevo
            </button>
            <a
              href={`https://wa.me/524891090388?text=${encodeURIComponent("Hola, estaba usando el recomendador de tours y no cargó. ¿Me ayudan a elegir?")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#25D366]/50 text-[#25D366] px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-[#25D366]/10 transition-colors"
            >
              Elegir por WhatsApp
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (step === "result" && result && primaryTour) {
    return (
      <main className="min-h-screen bg-crema pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-5">

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-2">Tu recomendación personalizada</p>
            <h1 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(28px,5vw,42px)" }}>
              {paqueteRec
                ? <>Encontramos tu plan <em className="text-dorado">perfecto</em></>
                : <>Encontramos tu tour <em className="text-dorado">perfecto</em></>}
            </h1>
            {/* Como fichas, no como frase: «perfil de en pareja» era gramática
                rota con cualquier opción del wizard. */}
            <ul className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto" aria-label="Tu perfil">
              {[state.grupo, `Desde ${state.origen}`, state.dias].filter(Boolean).map((chip) => (
                <li key={chip} className="border border-verde-selva/30 bg-verde-selva/5 text-verde-selva font-dm text-[11px] px-2.5 py-1">
                  {chip}
                </li>
              ))}
            </ul>
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
              {/* Solo con "1 día": ahí son dos opciones para UN día y compararlas
                  ayuda a elegir. Con "2 días" el segundo es otro día del viaje
                  (no compite con el primero), y con 3+ manda el paquete. */}
              {state.dias === "1 día" && (
                <Link
                  href={urlComparar("recorridos", [primaryTour.slug, secondaryTour.slug], { origen: "recomendador" })}
                  className="mt-4 inline-flex items-center min-h-[44px] font-dm text-[11px] tracking-[1.5px] uppercase text-verde-selva hover:text-negro underline decoration-verde-selva/40 underline-offset-4 transition-colors"
                >
                  {comparadorUI("es").entradas.recomendador}
                </Link>
              )}
            </div>
          )}

          {/* Guarantees — van justo debajo del tour recomendado, y el
              recomendador puede elegir el Edén, que NO reembolsa: si el tour
              trae `cancelacion` propia, no se le promete la de 48 h. */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              primaryTour?.cancelacion
                ? { label: "Cancelación", sub: "Con política propia" }
                : { label: "Cancela gratis",   sub: "Hasta 48h antes" },
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
            onClick={() => { setResult(null); setStep("origen"); setState(ESTADO_INICIAL); setEmail(""); setEmailError(""); setOrigenInput(""); setShowInput(false); }}
            className="text-xs font-dm text-negro/35 hover:text-negro/60 underline text-center block mx-auto transition-colors"
          >
            ← Volver a empezar con otro perfil
          </button>
        </div>
      </main>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────

  const TOTAL_PASOS = 7;
  const STEP_NUMS: Partial<Record<WizardStep, number>> = { origen: 1, dias: 2, grupo: 3, intereses: 4, actividad: 5, destino: 6, detalles: 7, correo: 7 };
  const stepNum = STEP_NUMS[step] ?? 1;
  const progress = (stepNum / TOTAL_PASOS) * 100;

  return (
    // pt-16: la barra fija del sitio (h-16) tapaba esta barra del wizard.
    <div className="min-h-[100dvh] flex flex-col pt-16" style={{ background: "#0e1710" }}>

      {/* Top bar — aquí iba «{n} personas buscando ahora», otro contador falso. */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
        <span className="font-cormorant text-crema text-lg">
          Huasteca <em className="text-dorado">IA</em>
        </span>
        <span className="text-[10px] font-dm text-crema/35 tracking-wide">Gratis · 2 minutos</span>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-white/6" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_PASOS} aria-valuenow={stepNum} aria-label={`Paso ${stepNum} de ${TOTAL_PASOS}`}>
        <div
          className="h-full bg-gradient-to-r from-verde-selva to-lima transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main */}
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12">

        {/* Los pasos del cuestionario solo tenían h2, así que la página no
            tenía H1 en ninguno de los seis. Va oculto a la vista para no
            romper el diseño, pero lo leen buscadores y lectores de pantalla. */}
        <h1 className="sr-only">¿Qué tour de la Huasteca Potosina es para mí? Recomendador personalizado</h1>

        {/* STEP 1: ORIGEN */}
        {step === "origen" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 01 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿De dónde nos <em className="text-dorado">visitas?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Te ayuda a personalizar tu experiencia</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {CIUDADES_POPULARES.filter((c) => c !== "Otra ciudad").map((ciudad) => (
                <button
                  key={ciudad}
                  aria-pressed={state.origen === ciudad}
                  onClick={() => { marcarInicio(); setOrigenInput(""); setShowInput(false); setState((s) => ({ ...s, origen: ciudad })); }}
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
              <>
                <label htmlFor="ciudad-origen" className="sr-only">Tu ciudad</label>
                <input
                  id="ciudad-origen"
                  autoFocus
                  type="text"
                  maxLength={60}
                  placeholder="Escribe tu ciudad…"
                  value={origenInput}
                  onChange={(e) => {
                    marcarInicio();
                    setOrigenInput(e.target.value);
                    setState((s) => ({ ...s, origen: e.target.value.trim() }));
                  }}
                  className="w-full border border-crema/20 bg-transparent text-crema placeholder:text-crema/25 px-4 py-3 text-sm font-dm outline-none focus:border-verde-vivo mb-4"
                />
              </>
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
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 02 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cuántos <em className="text-dorado">días</em> tienen para<br />visitar la Huasteca?
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Con 3 o más días tu recomendación incluye un paquete con hospedaje</p>

            <div className="space-y-3 mb-10">
              {DIAS_OPCIONES.map(({ key, sub }) => (
                <button
                  key={key}
                  aria-pressed={state.dias === key}
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
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 03 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cómo <em className="text-dorado">viajas?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Elegimos el recorrido pensando en quién viaja contigo</p>

            <div className="grid grid-cols-2 gap-3 mb-10">
              {GRUPOS.map(({ key, Icon, desc }) => (
                <button
                  key={key}
                  aria-pressed={state.grupo === key}
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
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 04 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Qué te <em className="text-dorado">emociona?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Selecciona uno o varios</p>

            <div className="space-y-2.5 mb-10">
              {INTERESES.map(({ key, Icon, desc }) => (
                <button
                  key={key}
                  aria-pressed={state.intereses.includes(key)}
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
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 05 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Cuánta <em className="text-dorado">energía</em> tienes?
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Para recomendarte el ritmo ideal</p>

            <div className="space-y-3 mb-10">
              {ACTIVIDADES.map(({ key, label, sub }) => (
                <button
                  key={key}
                  aria-pressed={state.actividad === key}
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
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 06 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              ¿Hay un lugar que no te<br />
              puedes <em className="text-dorado">perder?</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">Si tienes un destino en mente, lo incluimos en la recomendación</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-10">
              {DESTINOS_BUCKET.map((d) => (
                <button
                  key={d}
                  aria-pressed={state.destino === d}
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

            {/* Trust signal — sin prometer aquí la cancelación de 48 h: el
                recomendador puede elegir el Edén, que no reembolsa. */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/8 px-4 py-3 mb-6">
              <Shield className="w-4 h-4 text-verde-selva flex-shrink-0" />
              <p className="text-[11px] font-dm text-crema/50 leading-snug">
                Recomendación gratuita · Sin compromisos
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("actividad")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("detalles")}
                disabled={!state.destino}
                className="flex-1 bg-dorado text-negro py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: CON TUS PALABRAS — el paso que pidió Manolo (29 sep 2026):
            texto libre que la IA usa para ELEGIR y para redactar la reason. */}
        {step === "detalles" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 07 · 07</p>
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              Cuéntanos con <em className="text-dorado">tus palabras</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">
              Opcional, pero es lo que más personaliza tu plan: ¿celebran algo?,
              ¿algo que te preocupe?, ¿alguien del grupo con condición especial?
            </p>

            <label htmlFor="notas-viaje" className="sr-only">Cuéntanos de tu viaje</label>
            <textarea
              id="notas-viaje"
              value={state.notas}
              maxLength={280}
              rows={4}
              placeholder={"Por ejemplo: «es nuestro aniversario», «le tengo miedo al agua», «viajo con mi mamá de 70 y camina poco»…"}
              onChange={(e) => setState((s) => ({ ...s, notas: e.target.value }))}
              className="w-full border border-crema/20 bg-transparent text-crema placeholder:text-crema/25 px-4 py-3.5 text-sm font-dm leading-relaxed outline-none focus:border-verde-vivo resize-none"
            />
            <p className="mt-1.5 mb-8 text-right text-[10px] font-dm text-crema/30">{state.notas.length}/280</p>

            <div className="flex gap-3">
              <button onClick={() => setStep("destino")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={() => setStep("correo")}
                className="flex-1 bg-dorado text-negro py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors"
              >
                {state.notas.trim() ? "✦ Ver mi plan perfecto" : "Saltar y ver mi plan →"}
              </button>
            </div>
          </div>
        )}

        {/* GATE: CORREO — se pide antes de mostrar la recomendación */}
        {step === "correo" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Último paso</p>
            {/* «Tu plan ya está listo» era mentira: la IA corre DESPUÉS. */}
            <h2 className="font-cormorant font-light text-crema mb-2" style={{ fontSize: "clamp(30px,5vw,46px)" }}>
              Tu plan está a <em className="text-dorado">un paso</em>
            </h2>
            <p className="font-dm text-crema/40 text-sm mb-8">
              Déjanos tu correo: te mostramos tu recomendación aquí mismo y te la enviamos por escrito, con consejos para tu viaje.
            </p>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitCorreo(); }}
              placeholder="tucorreo@ejemplo.com"
              aria-label="Tu correo electrónico"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "correo-error" : undefined}
              className="w-full bg-white/5 border border-crema/20 text-crema placeholder:text-crema/30 px-4 py-4 font-dm text-sm focus:border-verde-vivo focus:outline-none transition-colors"
            />
            {emailError && <p id="correo-error" role="alert" className="text-terracota text-xs font-dm mt-2">{emailError}</p>}

            {/* «Solo lo usamos para enviarte tu plan. Sin spam» era mentira:
                arranca una secuencia de consejos. Se dice tal cual es. */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/8 px-4 py-3 mb-6 mt-5">
              <Shield className="w-4 h-4 text-verde-selva flex-shrink-0" />
              <p className="text-[11px] font-dm text-crema/50 leading-snug">
                Te mandamos tu plan y algunos consejos para tu viaje · Te das de baja con un clic ·{" "}
                <Link href="/aviso-de-privacidad" className="underline hover:text-crema">Aviso de privacidad</Link>
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("detalles")} className="border border-white/15 text-crema/50 px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={submitCorreo}
                disabled={!email.trim()}
                className="flex-1 bg-dorado text-negro py-4 text-[12px] tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✦ Ver mi recomendación
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
