// Mockup visual (sin imagen externa) de la "Guía Definitiva": una portada de
// folleto en 3D con una página interior asomando que muestra un adelanto del índice.
const INDICE = [
  "Cómo llegar y moverte",
  "Dónde quedarte y comer",
  "3 itinerarios (3 · 5 · 7 días)",
  "Presupuesto por viajero",
  "Checklist + tips locales",
];

export function GuiaMockup() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[300px]" style={{ perspective: "1200px" }}>
      {/* Página interior asomando = adelanto del contenido */}
      <div
        className="absolute -right-5 top-6 bottom-6 w-[78%] bg-crema rounded-sm shadow-2xl hidden sm:block"
        style={{ transform: "rotateY(-18deg) translateZ(-28px)" }}
        aria-hidden="true"
      >
        <div className="p-5 pt-6">
          <div className="h-1.5 w-16 bg-verde-selva/40 rounded mb-3" />
          <div className="space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-1.5 rounded bg-negro/10" style={{ width: `${90 - i * 8}%` }} />
            ))}
          </div>
          <div className="h-14 w-full bg-verde-selva/10 rounded mt-4 border border-verde-selva/15" />
        </div>
      </div>

      {/* Portada */}
      <div
        className="relative bg-gradient-to-br from-verde-profundo via-negro to-negro border border-dorado/30 rounded-r-md rounded-l-sm overflow-hidden"
        style={{ transform: "rotateY(-14deg) rotateX(4deg)", boxShadow: "0 30px 60px -15px rgba(0,0,0,0.7)" }}
      >
        {/* Lomo del folleto */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-dorado/60 to-dorado/20" aria-hidden="true" />
        <div className="p-7 pl-9">
          <p className="text-[8px] tracking-[3px] uppercase text-verde-vivo mb-4 font-dm">✦ Guía Definitiva 2026</p>
          <h3 className="font-cormorant text-crema text-[26px] leading-[1.05] mb-1">
            Huasteca<br />Potosina
          </h3>
          <p className="font-cormorant italic text-dorado/80 text-sm mb-6">Viaja solo, sin perderte nada</p>

          <ul className="space-y-2 mb-6">
            {INDICE.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[10.5px] text-crema/65 font-dm leading-snug">
                <span className="text-verde-vivo flex-shrink-0">→</span>{t}
              </li>
            ))}
          </ul>

          <span className="inline-block text-[8px] tracking-[2px] uppercase text-negro bg-dorado px-2.5 py-1 font-dm font-bold">
            PDF · Edición 2026
          </span>
        </div>
      </div>
    </div>
  );
}
