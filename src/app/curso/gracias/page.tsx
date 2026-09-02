import { prisma } from "@/lib/prisma";
import {
  FECHAS, LINKS, NOCHES_TEXTO, PRECIOS, TALLER_NOCHES, WHATSAPP_CURSO, fechaLarga, horaCorta,
  inscripcionesAbiertas, mxnCurso, ofertaAbierta, precioVigente,
} from "@/lib/curso";
import { ApartarTaller, BotonComprar } from "@/components/curso/CursoCliente";

export const dynamic = "force-dynamic";

/**
 * /curso/gracias — confirmación de lead (y de registro al taller con ?taller=1).
 *
 * La página no es un callejón: confirma, dice exactamente qué va a pasar y
 * ofrece UN siguiente paso (inscribirse ya, con el precio vigente).
 */
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: { taller?: string };
}) {
  const esTaller = searchParams.taller === "1";
  const ahora = new Date();
  const pagados = await prisma.cursoLead
    .count({ where: { compro: true } })
    .catch(() => 0);
  const pv = precioVigente(ahora, pagados);
  const abierto = inscripcionesAbiertas(ahora, pagados);
  const yaAbrio = ofertaAbierta(ahora);

  /* La escalera de compromisos. Cada "sí" chiquito hace más probable el
     grande: quien entra al grupo, aparta las noches y saca su número llega
     a la noche 1 con otra actitud. Por eso van AQUÍ y no en un correo que
     tal vez no abra. */
  const tareas = [
    {
      /* Va primero porque es la única que caduca: el correo acaba de llegar y
         moverlo a Principal ahora entrena a Gmail para los seis que faltan. */
      t: "Busca mi correo y muévelo a Principal",
      d: "Te acabo de escribir con el asunto “Confirmado: tu lugar en el taller”. Si no está en Principal, búscalo en Promociones y arrástralo. Si le das a responder y me escribes “ok”, mejor todavía: así los avisos de cada noche te llegan seguro.",
      href: "",
      cta: "",
      falta: "",
    },
    {
      t: "Entra al grupo de WhatsApp del taller",
      d: "Ahí mando la liga de cada noche, los workbooks y el material extra. No lo comparto en ningún otro lado.",
      href: LINKS.grupoTaller,
      cta: "Entrar al grupo",
      falta: "En un momento te mando la liga del grupo por correo.",
    },
    {
      t: "Aparta las tres noches",
      d: `${NOCHES_TEXTO}, 7 pm. Cada noche trae un workbook protegido con contraseña, y la contraseña sólo la digo en vivo. Si faltas, te quedas sin él.`,
      /* "Apartar las noches" tiene que poner algo en el calendario. El botón
         abría la sala de Meet: un cuarto vacío seis días antes. */
      href: "/curso/taller.ics",
      cta: "Agregar las 3 noches",
      falta: "Te mando la liga por correo antes del martes.",
    },
    {
      t: "Saca tu número de reservas perdidas",
      d: "La mayoría de las agencias no pierde clientes por precio: los pierde por contestar tarde. Contesta 3 preguntas y sabrás cuánto se te va cada mes. Llega al martes sabiendo tu número.",
      href: "/curso/calculadora?ref=registrado",
      cta: "Ver cuánto pierdo",
      falta: "",
    },
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-tinta text-hielo">
      <section className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 md:py-24">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-azul-vivo">
          Turismo con IA
        </p>
        <h1 className="mt-4 font-sora text-5xl font-semibold leading-[1.05] text-hielo md:text-6xl">
          {esTaller ? "Tu lugar en el taller está apartado." : "Listo. Va en camino."}
        </h1>
        <p className="mt-6 font-dm text-xl leading-relaxed text-hielo/80">
          {esTaller
            ? `Son tres noches: ${NOCHES_TEXTO} a las ${horaCorta(TALLER_NOCHES[0].fecha)} (hora del centro), en vivo por Google Meet. Te acabo de mandar la confirmación por correo.`
            : "Te acabo de mandar el programa completo por correo. Si no lo ves en unos minutos, revisa la carpeta de promociones o de no deseados."}
        </p>

        {esTaller && (
          <div className="mt-10">
            <h2 className="font-sora text-3xl font-semibold text-hielo">
              Falta lo importante: que sí estés el martes.
            </h2>
            <p className="mt-3 font-dm text-lg leading-relaxed text-hielo/75">
              Cada año se registra mucha gente a talleres a los que nunca entra. Estas
              cuatro cosas toman dos minutos y son la diferencia. Hazlas ahora, antes de
              cerrar esta pestaña.
            </p>
            <ol className="mt-7 divide-y divide-linea/12 border-y border-linea">
              {tareas.map((x, i) => (
                <li key={x.t} className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 py-6">
                  <span
                    aria-hidden="true"
                    className="row-span-3 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tinta-2 font-sora text-lg font-semibold text-azul-vivo"
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-sora text-2xl font-semibold text-hielo">
                    {x.t}
                  </h3>
                  <p className="font-dm text-base leading-relaxed text-hielo/75">{x.d}</p>
                  <div className={x.href || x.falta ? "" : "hidden"}>
                    {x.href ? (
                      <a
                        href={x.href}
                        {...(x.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="mt-1 inline-block border border-azul/50 px-5 py-3 font-dm text-sm font-medium uppercase tracking-[1px] text-azul-vivo transition-colors duration-200 hover:bg-azul-humo"
                      >
                        {x.cta}
                      </a>
                    ) : (
                      <p className="mt-1 font-dm text-sm text-hielo/55">{x.falta}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ══ PRE-TALLER ══ Quien pidió el programa antes de que abra la oferta NO
            puede comprar todavía: el botón de $9,900 sólo hacía scroll, y eso
            quema la confianza justo en la página que la acaba de ganar. En su
            lugar, el único paso que sí existe hoy: apartar el taller, con un
            clic, porque su correo y su consentimiento ya están dados. */}
        {!esTaller && !yaAbrio && (
          <div className="mt-10 border border-linea bg-tinta-2 p-7">
            <h2 className="font-sora text-3xl font-semibold text-hielo">
              Ya que estás aquí: las inscripciones abren el {fechaLarga(FECHAS.aperturaOferta)}.
            </h2>
            <p className="mt-3 font-dm text-lg leading-relaxed text-hielo/75">
              El programa te dice qué construyes. El taller te lo enseño construyéndolo:
              tres noches en vivo, gratis, el {NOCHES_TEXTO} a las{" "}
              {horaCorta(TALLER_NOCHES[0].fecha)} Al final de la noche 3 abro las
              inscripciones del curso, y para entonces ya sabrás si soy para ti.
            </p>
            <div className="mt-6">
              <ApartarTaller className="inline-block bg-azul px-10 py-5 font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo hover:text-tinta active:scale-[0.98] disabled:opacity-60" />
            </div>
            <p className="mt-4 font-dm text-sm text-hielo/55">
              Sin costo y sin tarjeta. Si ya te registraste al taller, ignora esto:
              tu lugar está apartado.
            </p>
          </div>
        )}

        {yaAbrio && (
        <div className="mt-10 border border-linea bg-tinta-2 p-7">
          <h2 className="font-sora text-3xl font-semibold text-hielo">
            ¿Ya lo tienes claro?
          </h2>
          <p className="mt-3 font-dm text-lg leading-relaxed text-hielo/75">
            {pv.esFundador
              ? `El precio de fundador de ${mxnCurso(PRECIOS.fundador)} (en vez de ${mxnCurso(PRECIOS.regular)}) dura hasta el ${fechaLarga(FECHAS.finFundador)} o hasta llenarse los primeros ${PRECIOS.cupoFundador} lugares. No hace falta esperar el correo para entrar.`
              : `Las inscripciones cierran el ${fechaLarga(FECHAS.cierreInscripciones)}. No hace falta esperar el correo para entrar.`}
          </p>
          <div className="mt-6">
            <BotonComprar
              precio={pv.precio}
              abierto={abierto}
              className="inline-block bg-azul px-10 py-5 font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo hover:text-tinta active:scale-[0.98]"
            >
              Reservar mi lugar · {mxnCurso(pv.precio)}
            </BotonComprar>
          </div>
        </div>
        )}

        <p className="mt-10 font-dm text-lg text-hielo/75">
          ¿Prefieres preguntarme algo antes?{" "}
          <a href={WHATSAPP_CURSO} target="_blank" rel="noopener noreferrer" className="font-medium text-azul-vivo underline">
            Escríbeme por WhatsApp
          </a>
          , te contesto yo.
        </p>
      </section>

      <footer className="bg-tinta-2 px-5 py-8 text-center font-dm text-sm text-hielo/60">
        <p>
          Manolo · Huasteca Potosina Tours ·{" "}
          <a href="/aviso-de-privacidad" className="underline hover:text-hielo">Aviso de privacidad</a>
        </p>
      </footer>
    </main>
  );
}
