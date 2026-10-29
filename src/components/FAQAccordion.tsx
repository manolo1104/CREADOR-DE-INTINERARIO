"use client";

import { useState } from "react";

export interface FAQItem {
  q: string;
  a: string;
}

export interface FAQCategory {
  titulo: string;
  items: FAQItem[];
}

interface Props {
  categorias: FAQCategory[];
}

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-negro/15">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-dm text-[15px] leading-snug text-verde-profundo transition-colors group-hover:text-verde-selva sm:text-base">
          {item.q}
        </span>
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            open ? "rotate-45 border-verde-selva bg-verde-selva/10 text-verde-selva" : "border-negro/25 text-negro/50"
          }`}
          aria-hidden="true"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="whitespace-pre-line pr-10 font-dm text-[15px] leading-relaxed text-negro/70">
          {item.a}
        </p>
      </div>
    </div>
  );
}

/** Acordeón de preguntas, en claro: renglones con línea, sin caja. */
export function FAQAccordion({ categorias }: Props) {
  return (
    <div className="space-y-12">
      {categorias.map((cat) => (
        <div key={cat.titulo}>
          <h3 className="mb-3 font-cormorant text-2xl text-verde-profundo sm:text-3xl">
            {cat.titulo}
          </h3>
          <div className="border-b border-negro/15">
            {cat.items.map((item) => (
              <FAQRow key={item.q} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
