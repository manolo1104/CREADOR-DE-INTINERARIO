import type { Locale } from "@/lib/i18n/config";

const WA = "https://wa.me/524891090388";

/**
 * Lo que ve quien abre una liga del check-in o de la encuesta que no sirve.
 * Sin `cancelada` no sabemos ni su idioma (la liga no existe): va en los dos.
 * Con `cancelada` sí lo sabemos, y decimos lo que de verdad pasó.
 */
export function LigaQueNoFunciona({ cancelada }: { cancelada?: Locale }) {
  const textos = cancelada
    ? [cancelada === "en"
        ? { lang: "en", titulo: "This booking is no longer active", cuerpo: "If you think that's a mistake, message us on", wa: "WhatsApp", fin: "." }
        : { lang: "es", titulo: "Esta reserva ya no está activa", cuerpo: "Si crees que es un error, escríbenos por", wa: "WhatsApp", fin: "." }]
    : [
        { lang: "es", titulo: "Este enlace no funciona", cuerpo: "Puede que esté incompleto por cómo lo copió tu correo o tu WhatsApp. Escríbenos por", wa: "WhatsApp", fin: " y te ayudamos." },
        { lang: "en", titulo: "This link isn't working", cuerpo: "Your email or WhatsApp may have cut it off. Message us on", wa: "WhatsApp", fin: " and we'll help." },
      ];
  return (
    <main className="min-h-screen bg-crema flex items-center justify-center px-5 pt-12 pb-20">
      <div className="w-full max-w-md space-y-10">
        <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado">Tours Huasteca Potosina</p>
        {textos.map((t) => (
          <div key={t.lang} lang={t.lang}>
            <h1 className="font-cormorant font-light text-verde-profundo text-4xl mb-4">{t.titulo}</h1>
            <p className="font-dm text-[15px] text-negro/60 leading-relaxed">
              {t.cuerpo} <a href={WA} className="text-verde-selva underline">{t.wa}</a>{t.fin}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
