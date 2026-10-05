"use client";

import Link from "next/link";
import { useComparador } from "./ComparadorShell";
import { urlComparar, type TipoComparacion } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";
import type { Atajo } from "@/lib/comparadorDatos";

/**
 * Pestañas (Recorridos | Paquetes) y comparaciones rápidas. Las ligas se arman
 * aquí y no en el servidor para que lleven el grupo que el visitante tenga
 * puesto AHORA: si cambió a 4 personas y luego toca "Aventura", sigue en 4.
 */
export function NavComparador({ atajos }: { atajos: Atajo[] }) {
  const { tipo, locale, grupo, slugs } = useComparador();
  const ui = comparadorUI(locale);
  const pestanas: TipoComparacion[] = ["recorridos", "paquetes"];
  const mismo = (a: string[]) => a.length === slugs.length && a.every((s) => slugs.includes(s));

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={ui.pestanas.aria} className="inline-flex self-start border border-white/15">
        {pestanas.map((p) => {
          const activa = p === tipo;
          return (
            <Link
              key={p}
              href={urlComparar(p, [], { grupo, locale })}
              aria-current={activa ? "page" : undefined}
              className={`min-h-[44px] inline-flex items-center px-6 font-dm text-[11px] tracking-[2px] uppercase transition-colors ${
                activa ? "bg-dorado text-negro" : "text-crema/70 hover:text-crema hover:bg-white/5"
              }`}
            >
              {ui.pestanas[p]}
            </Link>
          );
        })}
      </nav>

      {atajos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-dm text-xs text-crema/45 mr-1">{ui.atajos.titulo}</span>
          {atajos.map((a) => {
            const activo = mismo(a.slugs);
            return (
              <Link
                key={a.etiqueta}
                href={urlComparar("recorridos", a.slugs, { grupo, locale, origen: "atajo" })}
                scroll={false}
                aria-current={activo ? "true" : undefined}
                className={`min-h-[44px] inline-flex items-center rounded-full border px-4 font-dm text-xs transition-colors ${
                  activo ? "border-dorado text-dorado" : "border-white/15 text-crema/75 hover:border-dorado/60 hover:text-crema"
                }`}
              >
                {a.etiqueta}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
