export function GuideCard() {
  return (
    <div className="bg-white border border-negro/8 p-5">
      <p className="text-[9px] tracking-[2px] uppercase text-negro/35 font-dm mb-4">Tu guía ese día</p>
      <div className="flex gap-4 items-start">
        {/* Avatar con iniciales */}
        <div className="w-16 h-16 rounded-full border-2 border-dorado flex-shrink-0 bg-verde-profundo flex items-center justify-center shadow-sm">
          <span className="font-cormorant text-dorado text-xl font-light select-none">CR</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-dm text-sm font-medium text-negro/85 leading-none mb-0.5">Carlos R.</p>
          <p className="text-[9px] tracking-[1.5px] uppercase text-verde-selva font-dm mb-3">
            Guía certificado NOM-09 SECTUR
          </p>
          <p className="text-xs text-negro/55 font-dm leading-relaxed italic border-l-2 border-dorado/30 pl-3">
            "Hola, yo seré tu guía ese día. Llevo 8 años recorriendo la Huasteca y conozco cada mirador y secreto del camino. ¡Nos vemos pronto!"
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-dorado text-xs tracking-tight">★★★★★</span>
            <span className="text-[10px] text-negro/40 font-dm">4.9 · 492 reseñas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
