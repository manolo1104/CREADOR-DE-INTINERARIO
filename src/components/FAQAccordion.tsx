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
    <div className="border-b border-white/8 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-crema/85 font-dm text-sm leading-snug group-hover:text-crema transition-colors">
          {item.q}
        </span>
        <span
          className={`flex-shrink-0 w-5 h-5 border border-crema/25 rounded-full flex items-center justify-center text-crema/50 transition-all duration-200 ${
            open ? "bg-verde-vivo/20 border-verde-vivo/60 rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 pb-4" : "max-h-0"
        }`}
      >
        <p className="text-crema/60 font-dm text-sm leading-relaxed whitespace-pre-line pl-0 pr-8">
          {item.a}
        </p>
      </div>
    </div>
  );
}

export function FAQAccordion({ categorias }: Props) {
  return (
    <div className="space-y-10">
      {categorias.map((cat) => (
        <div key={cat.titulo}>
          <h3 className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mb-4">
            {cat.titulo}
          </h3>
          <div className="border border-white/8 bg-negro/30">
            <div className="divide-y divide-white/0 px-5">
              {cat.items.map((item) => (
                <FAQRow key={item.q} item={item} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
