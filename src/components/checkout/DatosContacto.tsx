"use client";

import type { BookingMessages } from "@/lib/i18n/booking";
import type { CampoContacto, ErroresContacto } from "@/lib/checkout/validarContacto";

interface Campo {
  campo: CampoContacto | "pickup";
  etiqueta: string;
  ayuda?: string;
  valor: string;
  cambiar: (v: string) => void;
  tipo: "text" | "email" | "tel";
  autoComplete: string;
  inputMode?: "text" | "email" | "tel";
  placeholder?: string;
}

/**
 * «Tus datos»: cuatro campos con su etiqueta VISIBLE.
 *
 * Antes eran cuadros con el texto de ayuda dentro (placeholder): en cuanto el
 * navegador los autollenaba, la persona ya no sabía qué era cada uno, y en un
 * teléfono no salía el teclado correcto. Ahora cada campo dice qué es, para qué
 * se usa, abre el teclado que toca y se valida al salir de él con un mensaje
 * que dice qué arreglar.
 */
export function DatosContacto({
  m,
  name, setName, email, setEmail, phone, setPhone, pickup, setPickup,
  errores,
  onSalirDe,
}: {
  m: BookingMessages["checkout"];
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  pickup: string; setPickup: (v: string) => void;
  errores: ErroresContacto;
  /** Al salir de un campo: valida solo ese. */
  onSalirDe: (campo: CampoContacto) => void;
}) {
  const campos: Campo[] = [
    { campo: "name",   etiqueta: m.nombreLabel,    valor: name,   cambiar: setName,   tipo: "text",  autoComplete: "name" },
    { campo: "phone",  etiqueta: m.whatsappLabel,  ayuda: m.whatsappAyuda, valor: phone, cambiar: setPhone, tipo: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+52 489 123 4567" },
    { campo: "email",  etiqueta: m.correoLabel,    ayuda: m.correoAyuda,   valor: email, cambiar: setEmail, tipo: "email", autoComplete: "email", inputMode: "email" },
    { campo: "pickup", etiqueta: m.hospedajeLabel, ayuda: m.hospedajeAyuda, valor: pickup, cambiar: setPickup, tipo: "text", autoComplete: "off" },
  ];

  return (
    <div className="space-y-4">
      <p className="font-dm text-[13px] text-negro/60">{m.datosIntro}</p>
      {campos.map((c) => {
        const error = c.campo !== "pickup" ? errores[c.campo] : undefined;
        const id = `datos-${c.campo}`;
        return (
          <div key={c.campo}>
            <label htmlFor={id} className="block font-dm text-[12px] font-medium text-negro/80 mb-1.5">
              {c.etiqueta}
            </label>
            <input
              id={id}
              name={c.campo}
              type={c.tipo}
              value={c.valor}
              onChange={(e) => c.cambiar(e.target.value)}
              onBlur={() => { if (c.campo !== "pickup" && c.valor.trim()) onSalirDe(c.campo); }}
              autoComplete={c.autoComplete}
              inputMode={c.inputMode}
              placeholder={c.placeholder}
              autoCapitalize={c.tipo === "email" ? "none" : undefined}
              autoCorrect={c.tipo === "email" ? "off" : undefined}
              spellCheck={c.tipo === "email" ? false : undefined}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : c.ayuda ? `${id}-ayuda` : undefined}
              className={`w-full border bg-white px-3 py-3 font-dm text-[15px] text-negro placeholder:text-negro/30 outline-none transition-colors ${
                error ? "border-terracota focus:border-terracota" : "border-negro/20 focus:border-verde-selva"
              }`}
            />
            {error ? (
              <p id={`${id}-error`} className="mt-1.5 font-dm text-[12px] text-terracota">{error}</p>
            ) : c.ayuda ? (
              <p id={`${id}-ayuda`} className="mt-1.5 font-dm text-[11px] text-negro/45">{c.ayuda}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
