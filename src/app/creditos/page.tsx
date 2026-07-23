import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/creditos`;

export const metadata: Metadata = {
  title: "Créditos de fotografía — Huasteca Potosina Tours",
  description:
    "Atribución de las fotografías con licencia Creative Commons utilizadas en las páginas de destinos de la Huasteca Potosina.",
  alternates: { canonical: URL },
  robots: { index: true, follow: true },
};

// Fotos de Wikimedia Commons con licencia CC que EXIGEN atribución.
// Mantener en sync con las imágenes de public/imagenes/<destino>/.
const CREDITOS_CC: { destino: string; slug: string; autor: string; licencia: string; licenciaUrl: string }[] = [
  { destino: "Aquismón Pueblo Mágico (Parroquia de San Miguel Arcángel)", slug: "aquismon-pueblo-magico", autor: "Patricia Alzuarte Díaz", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Zona Arqueológica Tamohí / El Consuelo", slug: "zona-arqueologica-tamohi-el-consuelo", autor: "Ricardosanluis", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Templo de San Juan Bautista (Coxcatlán)", slug: "templo-san-juan-bautista-coxcatlan", autor: "Patricia Alzuarte Díaz", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Sótano de las Huahuas", slug: "sotano-de-las-huahuas", autor: "panza.rayada (Panoramio)", licencia: "CC BY-SA 3.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  { destino: "Río Tampaón", slug: "rio-tampaon-rafting", autor: "Comisión Mexicana de Filmaciones (F. Uriegas)", licencia: "CC BY-SA 2.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/2.0/" },
  { destino: "Cascada El Trampolín (Tamasopo)", slug: "cascada-el-trampolin-tamasopo", autor: "Juan Carlos Fonseca Mata", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Cascada Los Comales (imagen representativa)", slug: "cascada-los-comales", autor: "Pintsmasher", licencia: "CC BY 3.0", licenciaUrl: "https://creativecommons.org/licenses/by/3.0/" },
  { destino: "Tancanhuitz (imagen representativa)", slug: "tancanhuitz", autor: "Diego Delso", licencia: "CC BY-SA", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "San Martín Chalchicuautla (imagen representativa)", slug: "san-martin-chalchicuautla", autor: "Zahira Arias", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "San Vicente Tancuayalab (imagen representativa)", slug: "san-vicente-tancuayalab", autor: "Oscaraleman2018", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Tanlajás (imagen representativa)", slug: "tanlajas", autor: "AlejandroLinaresGarcia", licencia: "CC BY-SA 4.0", licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { destino: "Texquitote (imagen representativa)", slug: "texquitote", autor: "Wikimedia Commons", licencia: "CC0 (dominio público)", licenciaUrl: "https://creativecommons.org/publicdomain/zero/1.0/" },
];

export default function CreditosPage() {
  return (
    <main id="main-content" className="min-h-screen bg-negro pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
          <Link href="/" className="hover:text-crema/60 transition-colors">Inicio</Link>
          <span>/</span>
          <span className="text-verde-vivo/70">Créditos</span>
        </nav>

        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
          Atribución de fotografía
        </p>
        <h1 className="font-cormorant font-light text-crema leading-tight mb-6" style={{ fontSize: "clamp(34px,5vw,56px)" }}>
          Créditos de imágenes
        </h1>
        <p className="text-crema/60 font-dm text-base leading-relaxed mb-6 max-w-2xl">
          La mayoría de las fotografías de este sitio son propias o cortesía de nuestros
          viajeros y aliados. Algunas imágenes de las páginas de{" "}
          <Link href="/destinos" className="text-verde-vivo hover:text-lima transition-colors">destinos</Link>{" "}
          provienen de Wikimedia Commons bajo licencias Creative Commons; aquí está su
          atribución, con gratitud a sus autores.
        </p>
        <p className="text-crema/40 font-dm text-sm leading-relaxed mb-14 max-w-2xl">
          Las imágenes marcadas como &ldquo;representativas&rdquo; ilustran el tipo de
          paisaje o tradición del lugar mientras conseguimos fotografía propia del sitio
          exacto. Las fotos de La Trinidad, la Olla de la Luz, la Cueva del Salitre y el
          Museo Leonora Carrington de Xilitla provienen de los sitios oficiales de cada
          lugar y de la Secretaría de Cultura (Sistema de Información Cultural).
        </p>

        <div className="divide-y divide-white/8 border-t border-white/8">
          {CREDITOS_CC.map((c) => (
            <div key={c.slug} className="py-5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-6">
              <div>
                <p className="font-dm text-crema/85 text-sm md:text-[15px]">{c.destino}</p>
                <p className="font-dm text-crema/45 text-xs mt-0.5">Fotografía: {c.autor}</p>
              </div>
              <a
                href={c.licenciaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-dm text-xs text-verde-vivo/80 hover:text-lima transition-colors"
              >
                {c.licencia}
              </a>
            </div>
          ))}
        </div>

        <p className="text-crema/35 font-dm text-xs leading-relaxed mt-12 max-w-2xl">
          ¿Eres autor de alguna de estas imágenes y quieres ajustar o retirar su
          atribución? Escríbenos a tours@huasteca-potosina.com y lo resolvemos de
          inmediato.
        </p>
      </div>
    </main>
  );
}
