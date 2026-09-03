import type { Metadata } from "next";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CIFRAS, NOCHES_TEXTO, TALLER_NOCHES, fechaLarga, horaCorta, mxnCurso } from "@/lib/curso";
import { FormLead } from "@/components/curso/CursoCliente";
import { LoopSetup } from "@/components/curso/LoopSetup";

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
export const dynamic = "force-dynamic";

/** Botón que baja al formulario. Es un ancla, no JS: funciona sin hidratar y
 *  con `scroll-behavior: smooth` heredado del layout. */
function BotonRegistro({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#registro"
      className={`inline-block bg-azul px-9 py-5 text-center font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo active:scale-[0.98] ${className}`}
    >
      {children}
    </a>
  );
}

export default async function WebinarPage() {
  const dia = (d: Date) => fechaLarga(d).replace(/^(\w)/, (m) => m.toUpperCase());

  /* Prueba social honesta: sólo aparece cuando el número ya empuja. Con 3
     registrados, decirlo resta. La misma regla que `lineaCupo` en los correos. */
  const registrados = await prisma.cursoLead
    .count({ where: { webinar: true, status: "activo" } })
    .catch(() => 0);

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
          {NOCHES_TEXTO} · {horaCorta(TALLER_NOCHES[0].fecha)} (hora del
          centro) · por Google Meet · sin costo
        </p>
        <p className="mt-4 font-dm text-lg leading-relaxed text-hielo/70">
          No hay diapositivas. Comparto pantalla y construyo, y tú ves cada clic,
          incluidos los que salen mal.
        </p>

        {/* El botón de arriba: la mitad del tráfico llega de WhatsApp, en celular,
            y no baja tres pantallas para encontrar el formulario. */}
        <div className="mt-8">
          <BotonRegistro className="w-full sm:w-auto">Apartar mi lugar gratis</BotonRegistro>
          <p className="mt-3 font-dm text-sm text-hielo/55">
            Sin costo y sin tarjeta. Nombre, correo y WhatsApp.
            {registrados >= 8 && (
              <> Ya somos <span className="font-mono text-azul-vivo">{registrados}</span> apartados.</>
            )}
          </p>
        </div>

        {/* La franja de cifras. Esta página recibe el tráfico más frío de todo el
            embudo: la prueba tiene que estar arriba, no sólo en /curso. */}
        {/* En 320 px tres columnas dejan 80 px por cifra y "+$500,000" se
            encima con la de al lado. Abajo de `sm` va en renglones: número a
            la izquierda, qué es a la derecha. Desde `sm`, la franja de tres. */}
        <div className="mt-10 divide-y divide-linea border-y border-linea sm:grid sm:grid-cols-3 sm:gap-6 sm:divide-y-0 sm:py-6 sm:text-center">
          {[
            { n: `+${mxnCurso(CIFRAS.toursVentas4m)}`, q: <>en ventas de tours<br className="hidden sm:inline" /> en 4 meses</> },
            { n: `+${mxnCurso(CIFRAS.hotelReservas4m)}`, q: <>en reservas del hotel<br className="hidden sm:inline" /> en el mismo plazo</> },
            { n: mxnCurso(CIFRAS.publicidadPagada), q: <>en publicidad<br className="hidden sm:inline" /> pagada</> },
          ].map((c) => (
            <div
              key={c.n}
              className="flex items-baseline gap-3 py-4 sm:block sm:gap-0 sm:py-0"
            >
              <p className="whitespace-nowrap font-sora text-[1.7rem] font-semibold leading-none text-azul-vivo sm:text-4xl">
                {c.n}
              </p>
              <p className="font-dm text-sm leading-snug text-hielo/70 sm:mt-2">{c.q}</p>
            </div>
          ))}
        </div>

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
                La noche 1 abro este panel en vivo. Hoy va en{" "}
                <span className="font-mono text-hielo">{mxnCurso(CIFRAS.vendidoTotal)}</span>{" "}
                vendidos en {CIFRAS.reservasTotal} reservas, con{" "}
                {mxnCurso(CIFRAS.publicidadPagada)} de publicidad.
              </figcaption>
            </figure>

            <div className="mt-8 border border-linea bg-tinta-2 p-5">
              <p className="font-dm text-sm leading-relaxed text-hielo/75">
                <strong className="text-hielo">Sólo recibe la liga quien está registrado.</strong>{" "}
                No la comparto en público y la sala tiene tope de lugares. La grabación
                dura 24 horas, y los workbooks van protegidos con una contraseña que sólo
                digo en vivo: si faltas, te quedas sin él.
              </p>
            </div>
          </div>
        </div>

        {/* ══ QUÉ TE LLEVAS ══ El cierre de valor de Iman: lo que te queda aunque
            no compres nada. Va justo después de la noche 3, donde ya sabes qué
            se construye y todavía no se ha mencionado ningún precio. */}
        <div className="mt-14 border border-linea bg-tinta-2 p-6 sm:p-8">
          <h2 className="font-sora text-3xl font-semibold text-hielo md:text-4xl">
            Qué te llevas, aunque nunca me compres nada.
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              "El mapa de tu sistema: qué se automatiza en TU negocio y en qué orden.",
              "El guion de tu agente de WhatsApp, escrito para tu catálogo y tu tono.",
              "Tus 3 automatizaciones definidas, con el número de lo que te cuesta no tenerlas.",
              "Las grabaciones de las tres noches, durante 24 horas.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 font-dm text-lg leading-relaxed text-hielo/85">
                <svg
                  aria-hidden="true"
                  className="mt-1.5 h-4 w-4 shrink-0 text-azul-vivo"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-6 font-dm text-base leading-relaxed text-hielo/70">
            El taller es gratis de verdad. Al final de la noche 3 te cuento cómo
            hacemos esto mismo con tu negocio durante 4 semanas, y ahí tú decides.
          </p>
          <div className="mt-7">
            <BotonRegistro className="w-full sm:w-auto">Apartar mi lugar gratis</BotonRegistro>
          </div>
        </div>

        {/* ══ POR QUÉ ESCUCHARME ══ La página no decía en ningún lado quién soy.
            La foto no es decoración: es la credencial, con la fecha dentro, y
            respalda el "recién egresado" sin que haya que pedir que me crean. */}
        <div className="mt-14 border-t border-linea pt-10">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-azul-vivo">
            Por qué escucharme
          </p>
          <h2 className="mt-3 max-w-[22ch] font-sora text-3xl font-semibold leading-tight text-hielo md:text-4xl">
            No estudié computación. Estudié cómo se transforman los negocios.
          </h2>

          <div className="mt-8 grid gap-8 md:grid-cols-[5fr_4fr] md:gap-12">
            <div className="space-y-4 font-dm text-lg leading-relaxed text-hielo/80">
              <p>
                Soy Manolo Covarrubias. Acabo de egresar de la licenciatura en{" "}
                <strong className="text-hielo">
                  Estrategia y Transformación de Negocios
                </strong>{" "}
                del Tec de Monterrey, campus Ciudad de México.
              </p>
              <p>
                Empecé hace unos meses automatizando el negocio de mis papás. Funcionó, así
                que emprendí lo mío: <strong className="text-hielo">Huasteca Potosina
                Tours</strong>. En cuatro meses vendí más de{" "}
                {mxnCurso(CIFRAS.toursVentas4m)} en tours, sin pagar un peso de publicidad.
              </p>
              <p>
                Y no fue sólo la página y el panel. Fue el sistema completo, y esa es la
                parte que casi nadie te enseña:
              </p>
              <ul className="space-y-2.5 border-l-2 border-azul pl-5 text-base">
                {[
                  "Aparecer primero en Google cuando alguien busca lo que tú vendes.",
                  "Ver qué páginas traen el tráfico que de verdad compra, y cuáles no.",
                  "Las piezas que convierten a un curioso en una reserva pagada.",
                  "El embudo de ventas entero, diseñado y armado pieza por pieza.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-hielo/85">
                    <svg
                      aria-hidden="true"
                      className="mt-1.5 h-4 w-4 shrink-0 text-azul-vivo"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
              <p>
                Todo con IA, construido por mí.{" "}
                <strong className="text-hielo">
                  Y todo eso es lo que vas a construir tú en el curso.
                </strong>
              </p>
            </div>

            <figure className="md:pt-1">
              <div className="relative aspect-[5/4] overflow-hidden border border-linea bg-tinta-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
                <Image
                  src="/imagenes/curso/manolo-titulo.jpg"
                  alt="Manolo Covarrubias firmando su título de Licenciado en Estrategia y Transformación de Negocios en el Tec de Monterrey, campus Ciudad de México, junio de 2026"
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover object-top"
                />
              </div>
              <figcaption className="mt-3 font-dm text-sm leading-relaxed text-hielo/60">
                Junio de 2026, campus Ciudad de México. Firmando el título de{" "}
                <span className="text-hielo/80">
                  Licenciado en Estrategia y Transformación de Negocios
                </span>
                .
              </figcaption>
            </figure>

            {/* El papel arriba, el trabajo abajo. La cita es el pie del bucle
                porque describe literalmente lo que se está viendo. */}
            <figure className="md:col-start-2">
              <div className="relative aspect-[9/16] max-h-[420px] overflow-hidden border border-linea bg-tinta-2">
                <LoopSetup />
              </div>
              <figcaption className="mt-4 border-l-2 border-azul pl-5 font-sora text-2xl italic leading-snug text-hielo">
                “No te voy a enseñar teoría de IA. Te voy a enseñar lo que uso
                todos los días.”
              </figcaption>
            </figure>
          </div>

          <p className="mt-8 font-dm text-sm leading-relaxed text-hielo/50">
            Las cifras son de mis negocios y no garantizan resultados individuales.
            Abro el panel en pantalla durante la noche 1 para que las veas tú.
          </p>
        </div>

        <div id="registro" className="mt-14 scroll-mt-6 border border-linea bg-tinta-2 p-6 sm:p-8">
          <h2 className="font-sora text-3xl font-semibold text-hielo">
            Reserva tu lugar
          </h2>
          <p className="mt-2 font-dm text-base text-hielo/70">
            Es gratis, son tres noches y no pide tarjeta.{" "}
            <strong className="text-hielo">La liga de cada noche te la mando por WhatsApp</strong>{" "}
            —ahí no se pierde—, y la confirmación por correo con el grupo donde subo los
            workbooks.
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
