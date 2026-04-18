import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { FAQAccordion } from "@/components/FAQAccordion";
import type { FAQCategory } from "@/components/FAQAccordion";
import type { LucideIcon } from "lucide-react";
import {
  Bus, Plane, Car, Bike,
  Calendar, BedDouble, DollarSign, CreditCard,
  Backpack, Shield, AlertTriangle, Waves, Hospital,
  HelpCircle, Lightbulb, MapPin,
  CheckCircle2, XCircle,
  Footprints, Shirt, FlaskConical, ClipboardList, Smartphone, Phone,
  Hotel, UtensilsCrossed, Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Guía Práctica — Cómo llegar, Dónde quedarse & Más | Huasteca Potosina",
  description:
    "Todo lo que necesitas para planear tu viaje a la Huasteca Potosina: cómo llegar, cuándo ir, dónde hospedarte, presupuesto, qué llevar y seguridad.",
};

function Section({
  id,
  Icon,
  title,
  children,
}: {
  id: string;
  Icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-16 border-b border-white/6">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <Icon className="w-7 h-7 text-verde-selva flex-shrink-0" aria-hidden="true" />
          <h2
            className="font-cormorant font-light text-crema"
            style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({
  title,
  children,
  accent = "verde",
}: {
  title: string;
  children: React.ReactNode;
  accent?: "verde" | "dorado" | "agua" | "terracota";
}) {
  const colors = {
    verde: "border-l-verde-vivo bg-verde-selva/8",
    dorado: "border-l-dorado bg-dorado/8",
    agua: "border-l-agua bg-agua/8",
    terracota: "border-l-terracota bg-terracota/8",
  };
  return (
    <div className={`border-l-2 ${colors[accent]} p-5`}>
      <h3 className="font-dm text-[11px] tracking-[2px] uppercase text-crema/60 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-crema/65 font-dm">
          <span className="text-verde-vivo mt-0.5 flex-shrink-0">·</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

const FAQ_DATA: FAQCategory[] = [
  {
    titulo: "Sobre los tours",
    items: [
      {
        q: "¿Los tours se realizan aunque llueva?",
        a: "Sí, salvo condiciones de alerta meteorológica. La lluvia en la Huasteca es parte de la experiencia y las cascadas lucen más espectaculares. En caso de cancelación por clima extremo, reagendamos sin costo.",
      },
      {
        q: "¿Qué nivel físico se requiere?",
        a: "Depende del tour. Cada ficha indica el nivel (Fácil / Moderado). Los tours Fácil son aptos para toda la familia. Los Moderado requieren poder caminar 3–5 km en terreno irregular.",
      },
      {
        q: "¿Pueden participar niños?",
        a: "Sí. Los menores de 4 años no pagan entrada. De 4 a 12 años tienen precio preferencial (60% del precio adulto). Consulta la ficha de cada tour para los detalles.",
      },
      {
        q: "¿Pueden participar personas mayores?",
        a: "Sí, en los tours nivel Fácil. Recomendamos consultarnos si hay condiciones de salud específicas para orientarte al mejor recorrido.",
      },
      {
        q: "¿El guía habla inglés?",
        a: "Nuestros guías tienen inglés básico–intermedio. Si requieres guía completamente bilingüe, consúltanos con anticipación.",
      },
      {
        q: "¿Cuántas personas hay en cada tour?",
        a: "Nuestros grupos son pequeños, máximo 12 personas, para garantizar una experiencia personalizada. También ofrecemos tours privados para tu grupo.",
      },
    ],
  },
  {
    titulo: "Reservas y pagos",
    items: [
      {
        q: "¿Cómo reservo mi lugar?",
        a: "Por WhatsApp o con tarjeta de crédito/débito a través de Stripe (pago seguro en línea). Al reservar se confirma tu lugar de inmediato.",
      },
      {
        q: "¿Cuál es la política de cancelación?",
        a: "— Cancelación con 48h o más de anticipación: reembolso completo.\n— Cancelación con menos de 24h: sin reembolso, pero puedes reagendar una vez sin costo adicional.\n— No-show (no presentarse): sin reembolso.\n— Cancelación por parte nuestra (clima extremo u operativo): reembolso completo o reagendamiento sin costo, a tu elección.",
      },
      {
        q: "¿Necesito pagar el total al reservar?",
        a: "No. Puedes pagar el 50% como anticipo para confirmar tu lugar y el resto el día del tour. Consúltanos por WhatsApp para coordinar.",
      },
    ],
  },
  {
    titulo: "Logística",
    items: [
      {
        q: "¿Desde dónde salen los tours?",
        a: "Todos nuestros tours salen del Hotel Paraíso Encantado Xilitla, nuestro hotel sede. Si no te hospedas ahí, coordina tu recogida con nosotros por WhatsApp.",
      },
      {
        q: "¿A qué hora es la salida?",
        a: "La mayoría de tours salen a las 5:30 AM para aprovechar la luz del amanecer y los momentos más mágicos (como el vuelo de los pericos en el Sótano). Regreso aproximado entre 6:00 y 7:00 PM.",
      },
      {
        q: "¿Qué debo llevar?",
        a: "Ropa cómoda y que puedas mojar, zapatos con agarre (no sandalias de playa), bloqueador solar biodegradable, agua, identificación oficial y ganas de aventura. Todo lo demás lo ponemos nosotros.",
      },
    ],
  },
];

export default function InfoPracticaPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          Todo lo que necesitas saber
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(40px,7vw,76px)" }}
        >
          Guía Práctica de <em className="text-dorado">Viaje</em>
        </h1>
        <p className="text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-8">
          Todo lo que necesitas para llegar, moverte, hospedarte y disfrutar la Huasteca Potosina
          sin sorpresas desagradables.
        </p>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: "Cómo llegar", href: "#como-llegar" },
            { label: "Cuándo viajar", href: "#cuando-viajar" },
            { label: "Dónde quedarse", href: "#donde-quedarse" },
            { label: "Hotel Paraíso", href: "#hotel-paraiso" },
            { label: "Dónde comer", href: "#papan-huasteco" },
            { label: "Presupuesto", href: "#presupuesto" },
            { label: "Qué llevar", href: "#que-llevar" },
            { label: "Seguridad", href: "#seguridad" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="border border-white/20 px-4 py-1.5 text-[10px] tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema hover:border-verde-vivo/50 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <Section id="como-llegar" Icon={Bus} title="Cómo llegar">
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          <strong className="text-crema">Ciudad Valles (SLP)</strong> es la puerta de entrada a la
          Huasteca Potosina. Desde aquí, todos los destinos principales están a menos de 2 horas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <InfoCard title="En avión" accent="agua">
            <BulletList
              items={[
                "Aeropuerto más cercano: San Luis Potosí (SLP) — 3.5h en coche",
                "Alternativa: Tampico (TAM) — 2h en coche, más conexiones",
                "Desde CDMX: ~1h de vuelo + renta de auto recomendada",
                "Aeroméxico y VivaAerobus operan rutas directas",
              ]}
            />
          </InfoCard>

          <InfoCard title="En autobús" accent="verde">
            <BulletList
              items={[
                "ADO GL desde CDMX (Terminal Norte) → Ciudad Valles: ~8 horas",
                "Precio aprox: $600–900 MXN por persona (clase ejecutiva)",
                "Salidas frecuentes: 10pm, 11:30pm, 12am (llegada madrugada)",
                "También desde Monterrey: ~4.5h, desde Tampico: ~2h",
              ]}
            />
          </InfoCard>

          <InfoCard title="En coche" accent="dorado">
            <BulletList
              items={[
                "Desde CDMX: 430km por autopista Mex-85 / MEX-70 — ~5.5h",
                "Desde Monterrey: 340km por MEX-85 — ~4h",
                "Desde San Luis Potosí capital: 260km — ~3h",
                "Autopista de cuota recomendada: segura y rápida",
                "Gasolina disponible en Valles. Llenar tanque antes de excursiones",
              ]}
            />
          </InfoCard>

          <InfoCard title="Transporte local" accent="agua">
            <BulletList
              items={[
                "Combis (minivanes) conectan Valles con Micos, Tamasopo, Tamuín",
                "Precio combi: $35–80 MXN dependiendo la ruta",
                "Taxis colectivos a destinos populares: $50–120 MXN p/p",
                "Renta de auto recomendada para mayor flexibilidad",
                "Moto taxi disponible en zonas rurales (~$30–50 MXN)",
              ]}
            />
          </InfoCard>
        </div>

        <div className="bg-dorado/8 border border-dorado/25 p-5">
          <p className="text-[10px] tracking-[2px] uppercase text-dorado font-dm mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> Consejo del viajero
          </p>
          <p className="text-crema/70 text-sm font-dm">
            Si vas en grupo de 4 o más personas, rentar un coche en Valles suele salir más barato
            que taxis y te da total libertad de horarios. Muchos destinos no tienen transporte
            regular antes de las 8am.
          </p>
        </div>
      </Section>

      {/* ── CUÁNDO VIAJAR ── */}
      <Section id="cuando-viajar" Icon={Calendar} title="Cuándo viajar">
        <p className="text-crema/60 font-dm text-sm mb-8">
          La Huasteca recibe visitantes todo el año, pero cada temporada tiene su carácter.
        </p>

        <div className="space-y-4 mb-8">
          {[
            {
              meses: "Noviembre — Marzo",
              etiqueta: "Temporada ideal",
              color: "verde" as const,
              puntos: [
                "Cascadas en su nivel óptimo de caudal y color turquesa",
                "Clima fresco (18–26°C), menos humedad",
                "Sótano de Golondrinas: vencejos activos en sus mejores vuelos",
                "Tamtoc: visitable sin calor extremo",
                "Temporada alta de turismo: reservar hospedaje con anticipación",
              ],
            },
            {
              meses: "Abril — Mayo",
              etiqueta: "Primavera — Transición",
              color: "dorado" as const,
              puntos: [
                "Temperaturas suben (28–38°C), especialmente en Tamuín",
                "Cascadas aún con buen caudal, color intenso",
                "Semana Santa: muy concurrido, precios al alza",
                "Ideal para Tamul y Las Pozas (follaje exuberante)",
              ],
            },
            {
              meses: "Junio — Octubre",
              etiqueta: "Temporada de lluvia",
              color: "agua" as const,
              puntos: [
                "Lluvias frecuentes (especialmente julio–septiembre)",
                "Vegetación explosivamente verde y fotogénica",
                "Ríos crecidos: algunas actividades acuáticas se suspenden",
                "Menos turistas, precios más bajos",
                "Consultar condiciones antes de ir a Tamul (corrientes peligrosas)",
              ],
            },
          ].map((t) => (
            <InfoCard key={t.meses} title={`${t.meses} · ${t.etiqueta}`} accent={t.color}>
              <BulletList items={t.puntos} />
            </InfoCard>
          ))}
        </div>

        {/* Month table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-dm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal w-24">Mes</th>
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal">Temperatura</th>
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal">Lluvia</th>
                <th className="text-left py-2 text-crema/40 tracking-[1px] uppercase font-normal">Cascadas</th>
              </tr>
            </thead>
            <tbody>
              {[
                { mes: "Ene–Feb", temp: "18–26°C", lluvia: "Poca", cascadas: "Excelente" },
                { mes: "Mar–May", temp: "24–36°C", lluvia: "Moderada", cascadas: "Muy buena" },
                { mes: "Jun–Sep", temp: "26–34°C", lluvia: "Alta", cascadas: "Variable" },
                { mes: "Oct–Nov", temp: "22–30°C", lluvia: "Bajando", cascadas: "Buena" },
                { mes: "Dic", temp: "16–24°C", lluvia: "Poca", cascadas: "Muy buena" },
              ].map((row) => (
                <tr key={row.mes} className="border-b border-white/6 hover:bg-verde-profundo/20 transition-colors">
                  <td className="py-2.5 pr-4 text-crema/70">{row.mes}</td>
                  <td className="py-2.5 pr-4 text-crema/60">{row.temp}</td>
                  <td className="py-2.5 pr-4 text-crema/60">{row.lluvia}</td>
                  <td className="py-2.5 text-crema/60">{row.cascadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── DÓNDE QUEDARSE ── */}
      <Section id="donde-quedarse" Icon={BedDouble} title="Dónde quedarse">
        <p className="text-crema/60 font-dm text-sm mb-8">
          Elige tu base según el estilo de viaje. Ciudad Valles tiene la mejor logística;
          Xilitla y Tamasopo ofrecen inmersión total en la naturaleza.
        </p>

        <div className="space-y-5">
          {/* Ciudad Valles */}
          <InfoCard title="Ciudad Valles · Base logística ideal" accent="verde">
            <p className="text-crema/60 text-sm mb-3">
              El hub perfecto. Acceso a todos los destinos en menos de 2 horas, con la mayor variedad
              de hospedaje, restaurantes y servicios. Aeropuerto pequeño y terminal ADO.
            </p>
            <BulletList
              items={[
                "Hotel Valles: tradicional, alberca, desde $900 MXN/noche",
                "Hotel Casa Real: boutique, céntrico, desde $1,100 MXN/noche",
                "Hostal La Huasteca: viajeros solo/mochilero, desde $280 MXN/cama",
                "Airbnb: casas completas desde $600 MXN/noche",
              ]}
            />
          </InfoCard>

          {/* Xilitla — con Hotel Paraíso Encantado destacado */}
          <InfoCard title="Xilitla · Experiencia boutique" accent="dorado">
            <p className="text-crema/60 text-sm mb-4">
              El pueblo mágico más cercano a Las Pozas. Opciones boutique en casas coloniales con
              vistas al cañón. Perfecto para 1–2 noches de inmersión cultural.
            </p>

            {/* Recomendación destacada */}
            <div className="border border-dorado/40 bg-dorado/8 p-4 mb-4">
              <p className="text-[9px] tracking-[2px] uppercase text-dorado font-dm mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-dorado" aria-hidden="true" /> Recomendación de nuestro equipo
              </p>
              <p className="text-crema font-dm text-sm font-medium mb-1">
                Hotel Paraíso Encantado Xilitla
              </p>
              <p className="text-crema/65 font-dm text-xs leading-relaxed mb-3">
                Nuestra base de operaciones y la mejor opción en Xilitla. A 50 metros del Jardín
                Surrealista, con piscina, restaurante de cocina huasteca y punto de salida de todos
                nuestros tours. Hospedarte aquí elimina cualquier traslado de madrugada.
              </p>
              <ul className="space-y-1 mb-3">
                {[
                  "Punto de salida oficial de los tours — salida a las 5:30 AM sin traslados",
                  "Piscina con vista al cañón · Restaurante propio · AC y WiFi",
                  "Tarifa especial para viajeros que reservan tours con nosotros",
                  "Desde $1,200 MXN/noche (habitación doble)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-crema/65 font-dm">
                    <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://wa.me/524891251458?text=Hola%2C%20me%20interesa%20hospedarme%20en%20el%20Hotel%20Para%C3%ADso%20Encantado%20Xilitla"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/50 hover:border-dorado hover:bg-dorado/10 px-4 py-1.5 transition-all"
              >
                Consultar disponibilidad →
              </a>
            </div>

            <p className="text-[10px] tracking-[1px] uppercase text-crema/35 font-dm mb-2">Otras opciones</p>
            <BulletList
              items={[
                "Castillo El Buen Café: histórico, vista panorámica, desde $1,500 MXN",
                "Posada El Castillo: en la propiedad de Edward James, desde $2,200 MXN",
                "Posada Xilitla: familiar, económica, desde $600 MXN",
              ]}
            />
          </InfoCard>

          {/* Tamasopo */}
          <InfoCard title="Tamasopo · Inmersión en la naturaleza" accent="agua">
            <p className="text-crema/60 text-sm mb-3">
              Pequeño pueblo a 10 min de las Cascadas de Tamasopo y Puente de Dios. Opciones
              rurales y eco-campamentos. Ideal para amantes de la naturaleza.
            </p>
            <BulletList
              items={[
                "Cabañas Tamasopo: piscina, naturaleza, desde $800 MXN/noche",
                "Eco-camping junto a las cascadas: desde $150 MXN/persona",
                "Posadas familiares: básicas, auténticas, desde $350 MXN/noche",
              ]}
            />
          </InfoCard>
        </div>
      </Section>

      {/* ── HOTEL PARAÍSO ENCANTADO ── */}
      <Section id="hotel-paraiso" Icon={Hotel} title="Nuestra base: Hotel Paraíso Encantado">
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          Todos nuestros tours salen desde el{" "}
          <strong className="text-crema">Hotel Paraíso Encantado Xilitla</strong>,
          a pasos del Jardín Surrealista de Edward James. Hospedarte aquí simplifica la
          logística y garantiza la salida puntual a las 5:30 AM.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Galería */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative aspect-[4/3] col-span-2 overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/hero.jpg"
                alt="Hotel Paraíso Encantado Xilitla — fachada y jardines"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/habitacion.jpg"
                alt="Habitación del Hotel Paraíso Encantado Xilitla"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/terraza.jpg"
                alt="Terraza con vista al cañón en el Hotel Paraíso Encantado"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-dorado text-dorado" aria-hidden="true" />
              ))}
              <span className="text-crema/50 font-dm text-xs ml-2">Boutique 4 estrellas</span>
            </div>

            <InfoCard title="¿Por qué hospedarte aquí?" accent="dorado">
              <BulletList
                items={[
                  "Punto de salida oficial de todos los tours — sin traslados de madrugada",
                  "A 50 metros del Jardín Surrealista de Edward James",
                  "Desayuno de cocina huasteca incluido en los tours",
                  "Piscina con vista al cañón y zona de selva",
                  "Habitaciones con AC, WiFi y baño privado",
                  "Recepción 24h para coordinación de logística",
                ]}
              />
            </InfoCard>

            <InfoCard title="Reservas" accent="verde">
              <p className="text-crema/60 font-dm text-sm mb-3">
                Mencionando que vas con nosotros al reservar obtienes tarifa preferencial.
              </p>
              <a
                href="https://wa.me/524891251458?text=Hola%2C%20quisiera%20reservar%20habitaci%C3%B3n%20en%20el%20Hotel%20Para%C3%ADso%20Encantado%20Xilitla"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-[#25D366] border border-[#25D366]/40 hover:border-[#25D366] hover:bg-[#25D366]/10 px-4 py-2 transition-all rounded"
              >
                Consultar disponibilidad →
              </a>
            </InfoCard>

            <a
              href="https://share.google/YS3dbxN4wrnHZ8lO9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors"
            >
              Ver en Google Maps →
            </a>
          </div>
        </div>
      </Section>

      {/* ── RESTAURANTE PAPÁN HUASTECO ── */}
      <Section id="papan-huasteco" Icon={UtensilsCrossed} title="Dónde comer: Restaurante Papán Huasteco">
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          En el mismo corazón de Xilitla, el{" "}
          <strong className="text-crema">Restaurante Papán Huasteco</strong> es nuestra
          recomendación número uno para cocina regional auténtica. Platillos tradicionales
          huastecos cocinados en fogón de leña, con ingredientes de la región.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Info */}
          <div className="space-y-4">
            <InfoCard title="Lo que no debes perderte" accent="terracota">
              <BulletList
                items={[
                  "Zacahuil — el tamal gigante huasteco en hoja de plátano",
                  "Bocoles rellenos de frijol y queso fresco",
                  "Enchiladas huastecas con carne de cerdo",
                  "Café de olla preparado con piloncillo y canela",
                  "Agua de tamarindo y jamaica de la región",
                ]}
              />
            </InfoCard>

            <InfoCard title="Razones para venir" accent="dorado">
              <BulletList
                items={[
                  "Recetas auténticas de cocineras locales, no fusión turística",
                  "Ingredientes frescos de mercado huasteco",
                  "Fogón de leña — sabores que no existen en la ciudad",
                  "Precios justos: comida completa desde $120 MXN",
                  "Perfecto antes o después de visitar Las Pozas",
                ]}
              />
            </InfoCard>
          </div>

          {/* Galería */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative aspect-[4/3] col-span-2 overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/hero.webp"
                alt="Restaurante Papán Huasteco — cocina regional auténtica en Xilitla"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/platillos.jpg"
                alt="Platillos típicos huastecos — zacahuil y bocoles"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/fogon.webp"
                alt="Fogón de leña en el Restaurante Papán Huasteco"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── PRESUPUESTO ── */}
      <Section id="presupuesto" Icon={DollarSign} title="Presupuesto diario">
        <p className="text-crema/60 font-dm text-sm mb-8">
          Costos aproximados por persona/día (2026). La Huasteca es sorprendentemente accesible.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            {
              nivel: "Económico",
              rango: "$400–600 MXN",
              color: "border-lima/40 bg-lima/8",
              dot: "bg-lima",
              incluye: [
                "Hospedaje: hostal o camping ($150–200)",
                "Comida: mercado y puestos locales ($100–150)",
                "1 destino por día: $60–220 MXN entrada",
                "Transporte: combis y colectivos ($50–100)",
              ],
            },
            {
              nivel: "Moderado",
              rango: "$800–1,500 MXN",
              color: "border-dorado/40 bg-dorado/8",
              dot: "bg-dorado",
              incluye: [
                "Hotel 3 estrellas o posada ($400–600)",
                "Restaurantes y cafés ($200–300)",
                "2 destinos por día incluidas actividades",
                "Taxi o renta compartida de auto",
                "Recuerdos y gastos varios",
              ],
            },
            {
              nivel: "Premium",
              rango: "$1,500+ MXN",
              color: "border-agua/40 bg-agua/8",
              dot: "bg-agua",
              incluye: [
                "Hotel boutique o posada de lujo ($800+)",
                "Restaurante de cocina huasteca gourmet",
                "Tour guiado privado + actividades premium",
                "Renta de coche propia",
                "Spa o experiencias exclusivas",
              ],
            },
          ].map((p) => (
            <div key={p.nivel} className={`border ${p.color} p-6`}>
              <span className={`inline-block w-3 h-3 rounded-full ${p.dot} mb-3`} aria-hidden="true" />
              <h3 className="font-cormorant text-crema text-xl mb-1">{p.nivel}</h3>
              <p className="text-dorado font-dm text-sm font-medium mb-4">{p.rango} / día</p>
              <BulletList items={p.incluye} />
            </div>
          ))}
        </div>

        <InfoCard title="Pagos y efectivo" accent="dorado">
          <BulletList
            items={[
              "SIEMPRE llevar efectivo. Muchos destinos solo aceptan efectivo",
              "Cajeros en Ciudad Valles (BBVA, Banamex, HSBC) — surtir antes de salir",
              "Las Pozas y hoteles aceptan tarjeta; Tamul, Golondrinas: solo efectivo",
              "Tipo de cambio: cambiar pesos en Valles, no en aeropuerto",
            ]}
          />
        </InfoCard>
      </Section>

      {/* ── QUÉ LLEVAR ── */}
      <Section id="que-llevar" Icon={Backpack} title="Qué llevar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              categoria: "Calzado",
              items: [
                "Aqua shoes INDISPENSABLES para ríos y pozas",
                "Tenis con suela antiderrapante para senderos",
                "Sandalias para hotel/pueblo",
                "Calzado cerrado para Tamtoc (terreno irregular)",
              ],
            },
            {
              categoria: "Ropa",
              items: [
                "Ropa dry-fit o de secado rápido (2–3 mudas)",
                "Traje de baño (llevar 2 si habrá días seguidos de agua)",
                "Camiseta manga larga para sol y repelente",
                "Chamarra ligera para el Sótano de Golondrinas (6°C en el fondo)",
                "Sombrero o gorra imprescindible para Tamtoc y días calurosos",
              ],
            },
            {
              categoria: "Salud y protección",
              items: [
                "Repelente BIODEGRADABLE (obligatorio en pozas y cascadas)",
                "Bloqueador solar BIODEGRADABLE (solo este permitido en agua)",
                "Pastillas potabilizadoras o filtro de agua",
                "Botiquín básico: curitas, antidiarreico, antihistamínico",
                "Medicamento para el mareo si haces lancha en Tamul",
              ],
            },
            {
              categoria: "Documentos y dinero",
              items: [
                "INE o pasaporte vigente",
                "Efectivo en pesos mexicanos (ver sección Presupuesto)",
                "Seguro de viaje recomendado para actividades extremas",
                "Reservaciones descargadas en el celular (sin internet en cascadas)",
                "Número de emergencias guardado: ver sección Seguridad",
              ],
            },
            {
              categoria: "Tecnología",
              items: [
                "Powerbank: muchos sitios sin carga disponible",
                "Funda impermeable para teléfono (esencial en lanchas y pozas)",
                "Cámara de acción (GoPro) si harás actividades acuáticas",
                "Descarga mapas offline de la región antes de salir",
                "Chip local o eSIM: cobertura limitada fuera de Valles",
              ],
            },
            {
              categoria: "Mochila y extras",
              items: [
                "Mochila resistente al agua o bolsas zip-lock para lo electrónico",
                "Botella de agua reutilizable (2L mínimo para días de cascadas)",
                "Snacks energéticos para días largos",
                "Linterna frontal para el Sótano de Golondrinas",
                "Toalla de microfibra de secado rápido",
              ],
            },
          ].map((cat) => (
            <InfoCard key={cat.categoria} title={cat.categoria} accent="verde">
              <BulletList items={cat.items} />
            </InfoCard>
          ))}
        </div>
      </Section>

      {/* ── SEGURIDAD ── */}
      <Section id="seguridad" Icon={Shield} title="Seguridad y emergencias">
        <div className="space-y-5">
          <InfoCard title="Números de emergencia" accent="terracota">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {[
                { label: "Emergencias general", num: "911" },
                { label: "Cruz Roja Valles", num: "(481) 382-0119" },
                { label: "IMSS Ciudad Valles", num: "(481) 381-1190" },
                { label: "Bomberos Valles", num: "(481) 382-0123" },
                { label: "Policía Municipal Valles", num: "(481) 382-0066" },
                { label: "Protección Civil SLP", num: "(444) 812-6000" },
              ].map((e) => (
                <div key={e.label} className="flex items-center gap-3 py-2 border-b border-white/6">
                  <div>
                    <div className="text-[10px] uppercase tracking-[1px] text-crema/40 font-dm">{e.label}</div>
                    <div className="text-crema text-sm font-dm font-medium">{e.num}</div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Consejos de seguridad general" accent="dorado">
            <BulletList
              items={[
                "La región es generalmente segura para turistas. Mantén actitud de viajero responsable.",
                "Viaja en grupos y evita excursiones solitarias a cascadas remotas.",
                "Sigue SIEMPRE las indicaciones de guías y personal local en sitios de aventura.",
                "No desobedezcas señales de corriente fuerte o nivel alto de río.",
                "Guarda objetos de valor en el hotel; no los lleves a las cascadas.",
                "Comparte tu itinerario del día con alguien de confianza antes de salir.",
              ]}
            />
          </InfoCard>

          <InfoCard title="Seguridad en el agua" accent="agua">
            <BulletList
              items={[
                "Chaleco salvavidas OBLIGATORIO en Tamul y actividades de río.",
                "Nunca nadar en zonas con corrientes fuertes sin guía.",
                "Puente de Dios: seguir siempre la cuerda de seguridad instalada.",
                "Consultar caudal de ríos en temporada de lluvia antes de ir.",
                "Habilidades de natación básicas necesarias para Tamul y Puente de Dios.",
                "Tamasopo y Micos: ideales para no nadadores por aguas más tranquilas.",
              ]}
            />
          </InfoCard>

          <InfoCard title="Salud" accent="verde">
            <BulletList
              items={[
                "Hospital Regional Ciudad Valles: atención de urgencias 24hrs.",
                "Llevar medicamentos básicos: el surtido en zonas rurales es limitado.",
                "Hidratación constante: mínimo 2L diarios, más en días calurosos.",
                "Protección solar rigurosa especialmente en Tamtoc (sin sombra natural).",
                "Diarrea del viajero: beber solo agua embotellada o purificada.",
                "Vacunación: no requerida, pero recomendable hepatitis A y tifoidea.",
              ]}
            />
          </InfoCard>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <section className="py-20 border-b border-white/6">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-7 h-7 text-verde-selva flex-shrink-0" aria-hidden="true" />
            <h2
              className="font-cormorant font-light text-crema"
              style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
            >
              Preguntas Frecuentes
            </h2>
          </div>
          <p className="text-crema/45 font-dm text-sm mb-10 ml-10">
            Todo lo que necesitas saber antes de reservar.
          </p>

          {/* Política de cancelación destacada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
            {([
              { color: "text-lima border-lima/30 bg-lima/8",       Icon: CheckCircle2,   titulo: "+48h de anticipación", sub: "Reembolso completo" },
              { color: "text-dorado border-dorado/30 bg-dorado/8", Icon: AlertTriangle,  titulo: "-24h de anticipación", sub: "Sin reembolso · Reagendamiento gratuito (1 vez)" },
              { color: "text-terracota border-terracota/30 bg-terracota/8", Icon: XCircle, titulo: "No-show",             sub: "Sin reembolso" },
            ] as { color: string; Icon: LucideIcon; titulo: string; sub: string }[]).map((p) => (
              <div key={p.titulo} className={`border ${p.color} p-4 rounded`}>
                <p.Icon className="w-5 h-5 mb-2" aria-hidden="true" />
                <p className="font-dm text-sm font-medium mb-1">{p.titulo}</p>
                <p className="text-[11px] font-dm opacity-75">{p.sub}</p>
              </div>
            ))}
          </div>

          <FAQAccordion categorias={FAQ_DATA} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center bg-verde-profundo/20 border-t border-white/6">
        <h2
          className="font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
        >
          ¿Listo para <em className="text-dorado">planear tu viaje?</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          Usa nuestro planificador IA para crear un itinerario personalizado con toda la
          información práctica que necesitas.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/destinos"
            className="border border-crema/30 text-crema px-10 py-3.5 text-[11px] tracking-[3px] uppercase font-dm hover:bg-crema/10 transition-all"
          >
            Ver destinos
          </Link>
          <Link
            href="/planear"
            className="bg-verde-selva text-crema px-10 py-3.5 text-[11px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            Planear con IA →
          </Link>
        </div>
      </section>
    </main>
  );
}
