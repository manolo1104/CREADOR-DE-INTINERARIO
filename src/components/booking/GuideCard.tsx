import Image from "next/image";

const GUIAS = [
  {
    foto:   "/guides/guia-1.png",
    nombre: "Carlos Rodríguez",
    badge:  "Guía Principal · Certificado NOM-09 SECTUR",
    frase:  "Hola, yo seré tu guía ese día. Llevo 8 años recorriendo la Huasteca y conozco cada mirador secreto del camino. ¡Nos vemos pronto!",
    estrellas: "4.9",
    resenas:   "492",
  },
  {
    foto:   "/guides/guia-2.png",
    nombre: "Miguel Ángel",
    badge:  "Guía Acuático · Especialista Río Tampaón",
    frase:  "Soy especialista en los recorridos por el río Tampaón. He guiado más de 600 grupos y sé exactamente dónde están los mejores ángulos para las fotos.",
    estrellas: "5.0",
    resenas:   "318",
  },
  {
    foto:   "/guides/guia-3.png",
    nombre: "José Laredo",
    badge:  "Guía de Aventura · Rappel y Montaña",
    frase:  "Me especializo en los recorridos de aventura extrema. Seguridad siempre primero, pero sin perder ni un segundo de adrenalina. ¡Te espero!",
    estrellas: "4.9",
    resenas:   "274",
  },
];

interface Props {
  guiaIndex?: 0 | 1 | 2;
}

export function GuideCard({ guiaIndex = 0 }: Props) {
  const g = GUIAS[guiaIndex];
  return (
    <div className="bg-white border border-negro/8 p-5">
      <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-4">Tu guía ese día</p>
      <div className="flex gap-4 items-start">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dorado flex-shrink-0 shadow-sm">
          <Image
            src={g.foto}
            alt={`${g.nombre} — ${g.badge}`}
            width={64}
            height={64}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-dm text-sm font-medium text-negro/85 leading-none mb-0.5">{g.nombre}</p>
          <p className="text-[9px] tracking-[1.5px] uppercase text-verde-selva font-dm mb-3">{g.badge}</p>
          <p className="text-xs text-negro/55 font-dm leading-relaxed italic border-l-2 border-dorado/30 pl-3">
            &ldquo;{g.frase}&rdquo;
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-dorado text-xs tracking-tight">★★★★★</span>
            <span className="text-[10px] text-negro/40 font-dm">{g.estrellas} · {g.resenas} reseñas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
