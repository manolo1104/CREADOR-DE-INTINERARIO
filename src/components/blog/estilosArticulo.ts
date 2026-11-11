/**
 * Estilos del cuerpo de un artículo del blog, compartidos por `/blog/[slug]` y
 * `/en/blog/[slug]` (10 nov 2026): el artículo en inglés se ve igual que el
 * español. Antes vivían dentro de la página española.
 *
 * 🔴 Vive en `src/components/` A PROPÓSITO: Tailwind solo escanea `src/app`,
 * `src/components` y `src/pages` (`tailwind.config.ts`). En `src/lib/` estas
 * clases se purgarían y el artículo saldría sin formato.
 */
export const PROSE_ARTICULO = `prose prose-lg max-w-none
    prose-headings:font-cormorant prose-headings:font-normal prose-headings:text-verde-profundo
    prose-h2:text-[2rem] prose-h2:leading-[1.15] prose-h2:mt-12 prose-h2:mb-5 prose-h2:scroll-mt-28
    prose-h3:text-[1.35rem] prose-h3:leading-snug prose-h3:mt-9 prose-h3:mb-3
    prose-p:font-dm prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-negro/75
    prose-a:text-verde-selva prose-a:underline prose-a:decoration-verde-selva/30 prose-a:underline-offset-4 hover:prose-a:text-terracota
    prose-strong:text-negro prose-strong:font-medium
    prose-ul:font-dm prose-ul:text-negro/75 prose-ol:font-dm prose-ol:text-negro/75 prose-li:leading-relaxed prose-li:marker:text-verde-selva
    prose-blockquote:border-l-2 prose-blockquote:border-dorado prose-blockquote:font-cormorant prose-blockquote:text-2xl prose-blockquote:not-italic prose-blockquote:text-verde-profundo prose-blockquote:font-light
    prose-img:rounded-2xl prose-img:w-full
    prose-figure:my-8
    prose-figcaption:font-dm prose-figcaption:text-negro/45 prose-figcaption:text-[13px] prose-figcaption:text-center prose-figcaption:mt-2
    prose-hr:border-negro/10
    prose-table:font-dm prose-table:text-[15px] prose-th:text-verde-profundo prose-td:text-negro/75
    [&_.cta-box]:my-10 [&_.cta-box]:rounded-2xl [&_.cta-box]:border [&_.cta-box]:border-negro/10 [&_.cta-box]:bg-white [&_.cta-box]:p-7 [&_.cta-box]:text-center
    [&_.cta-block]:my-10 [&_.cta-block]:rounded-2xl [&_.cta-block]:border [&_.cta-block]:border-negro/10 [&_.cta-block]:bg-white [&_.cta-block]:p-7 [&_.cta-block]:text-center
    [&_.cta-final]:bg-verde-profundo [&_.cta-final]:border-verde-profundo
    [&_.cta-headline]:font-cormorant [&_.cta-headline]:text-2xl [&_.cta-headline]:leading-snug [&_.cta-headline]:text-verde-profundo [&_.cta-headline]:mb-2 [&_.cta-headline]:font-normal
    [&_.cta-final_.cta-headline]:text-crema
    [&_.cta-subtext]:font-dm [&_.cta-subtext]:text-negro/60 [&_.cta-subtext]:text-[15px] [&_.cta-subtext]:leading-relaxed [&_.cta-subtext]:mb-5
    [&_.cta-final_.cta-subtext]:text-crema/70
    [&_.cta-button]:inline-flex [&_.cta-button]:items-center [&_.cta-button]:justify-center [&_.cta-button]:gap-2 [&_.cta-button]:min-h-[48px] [&_.cta-button]:rounded-full [&_.cta-button]:px-7 [&_.cta-button]:py-2.5 [&_.cta-button]:font-dm [&_.cta-button]:text-[15px] [&_.cta-button]:font-medium [&_.cta-button]:no-underline [&_.cta-button]:mx-1.5 [&_.cta-button]:mt-2
    [&_.cta-button--primary]:bg-dorado [&_.cta-button--primary]:text-negro [&_.cta-button--primary]:hover:bg-lima
    [&_.cta-button--secondary]:bg-transparent [&_.cta-button--secondary]:text-verde-profundo [&_.cta-button--secondary]:border [&_.cta-button--secondary]:border-negro/20 [&_.cta-button--secondary]:hover:border-verde-selva
    [&_.cta-final_.cta-button--secondary]:text-crema [&_.cta-final_.cta-button--secondary]:border-crema/40
    [&_.cta-link]:text-verde-selva [&_.cta-link]:underline
    [&_.tour-cta]:my-8 [&_.tour-cta]:rounded-2xl [&_.tour-cta]:border [&_.tour-cta]:border-negro/10 [&_.tour-cta]:bg-white [&_.tour-cta]:p-5 [&_.tour-cta]:not-prose
    [&_details]:my-3 [&_details]:rounded-2xl [&_details]:border [&_details]:border-negro/10 [&_details]:bg-white [&_details]:overflow-hidden
    [&_details[open]]:border-verde-selva/40
    [&_summary]:cursor-pointer [&_summary]:px-5 [&_summary]:py-4 [&_summary]:text-verde-profundo [&_summary]:font-dm [&_summary]:font-medium [&_summary]:text-base [&_summary]:list-none [&_summary]:select-none
    [&_summary::-webkit-details-marker]:hidden [&_summary::marker]:hidden [&_summary]:hover:bg-crema/60
    [&_details>p]:px-5 [&_details>p]:pb-4 [&_details>p]:pt-0 [&_details>p]:text-negro/65 [&_details>p]:text-[15px] [&_details>p]:leading-relaxed
    [&_details_strong]:text-negro [&_details_strong]:font-medium`;
