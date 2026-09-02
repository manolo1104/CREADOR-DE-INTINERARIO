import type { Metadata } from "next";
import Image from "next/image";
import { CIFRAS, FECHAS, fechaLarga, horaCorta, mxnCurso } from "@/lib/curso";
import { FormLead } from "@/components/curso/CursoCliente";

export const metadata: Metadata = {
  title: "Taller gratuito: cómo automaticé Huasteca Potosina Tours",
  description:
    "Taller en vivo por Zoom: el sistema real (página, agente de WhatsApp y panel) con el que Huasteca Potosina Tours vendió más de $500,000 MXN en 4 meses sin publicidad.",
  robots: { index: false, follow: false },
};

/**
 * /curso/webinar — registro al taller gratuito del 10 de septiembre.
 * Una sola acción posible: apartar lugar. Sin barra de compra, sin salidas.
 */
export default function WebinarPage() {
  const puntos = [
    "El sistema completo funcionando: la página, el agente contestando el WhatsApp y el panel con los números",
    `Cómo se hicieron más de ${mxnCurso(CIFRAS.toursVentas4m)} en ventas en 4 meses con $0 de publicidad`,
    "Qué puedes automatizar tú primero, aunque no sepas programar",
    "Al final: preguntas abiertas, las que quieras",
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-crema text-negro">
      <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 md:py-20">
        <p className="font-dm text-xs font-medium uppercase tracking-[2.5px] text-verde-selva">
          Taller gratuito en vivo · para negocios turísticos
        </p>
        <h1 className="mt-4 font-cormorant text-[2.6rem] font-semibold leading-[1.05] text-verde-profundo sm:text-6xl">
          Cómo automaticé Huasteca Potosina Tours
        </h1>
        <p className="mt-5 font-dm text-xl leading-relaxed text-negro/80">
          {fechaLarga(FECHAS.webinar)} · {horaCorta(FECHAS.webinar)} (hora del
          centro) · por Zoom · sin costo
        </p>

        <div className="mt-8 grid gap-10 md:grid-cols-[3fr_2fr] md:gap-12">
          <div>
            <p className="font-dm text-lg leading-relaxed text-negro/80">
              Voy a enseñar el sistema real, no diapositivas:
            </p>
            <ul className="mt-5 space-y-3.5">
              {puntos.map((p) => (
                <li key={p} className="flex items-start gap-3.5 font-dm text-lg leading-relaxed text-negro/85">
                  <svg aria-hidden="true" className="mt-1.5 h-5 w-5 shrink-0 text-verde-selva" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden border border-negro/10 bg-white shadow-[0_20px_50px_-20px_rgba(26,46,26,0.4)]">
              <Image
                src="/imagenes/curso/panel.jpg"
                alt="El panel de control de Huasteca Potosina Tours"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover object-top"
              />
            </div>
            <figcaption className="mt-3 font-dm text-sm text-negro/60">
              Esto es lo que ves en el taller: el panel real, en vivo.
            </figcaption>
          </figure>
        </div>

        <div className="mt-12 border border-negro/15 bg-white/70 p-6 sm:p-8">
          <h2 className="font-cormorant text-3xl font-semibold text-verde-profundo">
            Aparta tu lugar
          </h2>
          <p className="mt-2 font-dm text-base text-negro/70">
            Te llega la confirmación por correo y la liga de Zoom un día antes.
          </p>
          <div className="mt-6">
            <FormLead webinar />
          </div>
        </div>
      </section>

      <footer className="bg-negro px-5 py-8 text-center font-dm text-sm text-crema/60">
        <p>
          Manolo · Huasteca Potosina Tours ·{" "}
          <a href="/aviso-de-privacidad" className="underline hover:text-crema">Aviso de privacidad</a>
        </p>
      </footer>
    </main>
  );
}
