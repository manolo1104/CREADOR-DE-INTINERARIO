import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

export function GuideProfile() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <div className="border border-verde-vivo/20 bg-verde-profundo/30 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">

          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full bg-verde-selva border-2 border-verde-vivo/40 flex items-center justify-center text-crema text-xl font-cormorant font-medium flex-shrink-0"
            aria-hidden="true"
          >
            HP
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-cormorant text-crema text-lg">
                Equipo Huasteca Potosina
              </h3>
              <span className="text-[9px] bg-verde-selva/60 border border-verde-vivo/30 text-verde-vivo px-2 py-0.5 font-dm tracking-[1px] uppercase">
                ✓ Guía certificado NOM-09 SECTUR
              </span>
            </div>
            <p className="text-[11px] text-crema/40 font-dm mb-2">
              Más de 8 años recorriendo la Huasteca · Español e inglés básico
            </p>
            <p className="text-sm text-crema/60 font-dm leading-relaxed">
              Somos una familia de guías locales nacidos en la Huasteca. Conocemos cada sendero,
              cada cascada y cada secreto de la región. Nuestro trabajo es que regreses con las
              mejores fotos de tu vida y ganas de volver.
            </p>
          </div>

          {/* CTA */}
          <a
            href={waLink(WA_MESSAGES.tourGeneral)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] tracking-[1.5px] uppercase font-dm px-5 py-3 transition-colors whitespace-nowrap"
          >
            {WA_SVG}
            Hablar con el equipo
          </a>
        </div>
      </div>
    </section>
  );
}
