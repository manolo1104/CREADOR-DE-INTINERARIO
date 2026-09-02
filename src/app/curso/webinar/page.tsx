import type { Metadata } from "next";
import Image from "next/image";
import { CIFRAS, TALLER_NOCHES, fechaLarga, horaCorta, mxnCurso } from "@/lib/curso";
import { FormLead } from "@/components/curso/CursoCliente";

export const metadata: Metadata = {
  title: "Taller gratuito de 3 noches: Turismo con IA en vivo",
  description:
    "Tres noches en vivo, sin costo: construyo frente a ti la página, el agente de WhatsApp y las automatizaciones con las que Huasteca Potosina Tours vendió más de $500,000 MXN en 4 meses sin publicidad.",
  robots: { index: false, follow: false },
};

/**
 * /curso/webinar — registro al taller gratuito de TRES noches (8, 9 y 10 sep).
 * Una sola acción posible: apartar lugar. Sin barra de compra, sin salidas.
 *
 * Por qué tres y no una: la oferta del curso se presenta al final de la noche
 * 3, a gente que ya lleva tres horas viéndome construir. Eso no se parece en
 * nada a vender desde una página fría.
 */
export default function WebinarPage() {
  const dia = (d: Date) => fechaLarga(d).replace(/^(\w)/, (m) => m.toUpperCase());

  return (
    <main className="flex min-h-[100dvh] flex-col bg-tinta text-hielo">
      <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 md:py-20">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-azul-vivo">
          Taller gratuito en vivo · 3 noches · para negocios turísticos
        </p>
        <h1 className="mt-4 font-sora text-[2.6rem] font-semibold leading-[1.05] text-hielo sm:text-6xl">
          En 3 noches construyo el sistema que opera mis dos negocios
        </h1>
        <p className="mt-5 font-dm text-xl leading-relaxed text-hielo/80">
          8, 9 y 10 de septiembre · {horaCorta(TALLER_NOCHES[0].fecha)} (hora del
          centro) · por Google Meet · sin costo
        </p>
        <p className="mt-4 font-dm text-lg leading-relaxed text-hielo/70">
          No hay diapositivas. Comparto pantalla y construyo, y tú ves cada clic,
          incluidos los que salen mal.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-[3fr_2fr] md:gap-12">
          <ol className="space-y-8">
            {TALLER_NOCHES.map((noche) => (
              <li key={noche.n}>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-azul-vivo">
                  Noche {noche.n} · {dia(noche.fecha)}
                </p>
                <h2 className="mt-1.5 font-sora text-3xl font-semibold text-hielo">
                  {noche.titulo}
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {noche.puntos.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-3 font-dm text-base leading-relaxed text-hielo/80"
                    >
                      <svg
                        aria-hidden="true"
                        className="mt-1.5 h-4 w-4 shrink-0 text-azul-vivo"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 inline-block border border-azul/40 bg-azul-humo px-3 py-1.5 font-dm text-sm text-hielo/75">
                  Workbook {noche.n}: {noche.workbook}
                </p>
              </li>
            ))}
          </ol>

          <div>
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden border border-linea bg-tinta-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
                <Image
                  src="/imagenes/curso/panel.jpg"
                  alt="El panel de control de Huasteca Potosina Tours"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover object-top"
                />
              </div>
              <figcaption className="mt-3 font-dm text-sm text-hielo/60">
                La noche 1 abro este panel en vivo: {mxnCurso(CIFRAS.toursVentas4m)} en
                ventas en 4 meses, con {mxnCurso(CIFRAS.publicidadPagada)} de publicidad.
              </figcaption>
            </figure>

            <div className="mt-8 border border-linea bg-tinta-2 p-5">
              <p className="font-dm text-sm leading-relaxed text-hielo/75">
                <strong className="text-hielo">La grabación dura 24 horas.</strong>{" "}
                Los workbooks van protegidos con una contraseña que sólo digo en vivo. Si
                faltas, te quedas sin él.
              </p>
            </div>
          </div>
        </div>

        <div id="registro" className="mt-12 border border-linea bg-tinta-2 p-6 sm:p-8">
          <h2 className="font-sora text-3xl font-semibold text-hielo">
            Reserva tu lugar
          </h2>
          <p className="mt-2 font-dm text-base text-hielo/70">
            Es gratis y son tres noches. Te llega la confirmación por correo, con la liga y
            el grupo de WhatsApp donde mando los workbooks.
          </p>
          <div className="mt-6">
            <FormLead webinar />
          </div>
        </div>
      </section>

      <footer className="bg-tinta-2 px-5 py-8 text-center font-dm text-sm text-hielo/60">
        <p>
          Manolo · Huasteca Potosina Tours ·{" "}
          <a href="/aviso-de-privacidad" className="underline hover:text-hielo">
            Aviso de privacidad
          </a>
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-hielo/40">
          Este sitio no es parte de Facebook ni de Meta Platforms, y no está avalado por
          ellos de ninguna forma.
        </p>
      </footer>
    </main>
  );
}
