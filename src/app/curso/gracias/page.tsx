import { prisma } from "@/lib/prisma";
import {
  FECHAS, PRECIOS, WHATSAPP_CURSO, fechaLarga, horaCorta, inscripcionesAbiertas,
  mxnCurso, precioVigente,
} from "@/lib/curso";
import { BotonComprar } from "@/components/curso/CursoCliente";

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

  return (
    <main className="flex min-h-[100dvh] flex-col bg-crema text-negro">
      <section className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 md:py-24">
        <p className="font-dm text-xs font-medium uppercase tracking-[2.5px] text-verde-selva">
          Turismo con IA
        </p>
        <h1 className="mt-4 font-cormorant text-5xl font-semibold leading-[1.05] text-verde-profundo md:text-6xl">
          {esTaller ? "Tu lugar en el taller está apartado." : "Listo. Va en camino."}
        </h1>
        <p className="mt-6 font-dm text-xl leading-relaxed text-negro/80">
          {esTaller
            ? `Nos vemos el ${fechaLarga(FECHAS.webinar)} a las ${horaCorta(FECHAS.webinar)} (hora del centro), en vivo por Zoom. Te acabo de mandar la confirmación por correo; la liga de Zoom llega un día antes.`
            : "Te acabo de mandar el programa completo por correo. Si no lo ves en unos minutos, revisa la carpeta de promociones o de no deseados."}
        </p>

        <div className="mt-10 border border-negro/15 bg-white/70 p-7">
          <h2 className="font-cormorant text-3xl font-semibold text-verde-profundo">
            ¿Ya lo tienes claro?
          </h2>
          <p className="mt-3 font-dm text-lg leading-relaxed text-negro/75">
            {pv.esFundador
              ? `El precio de fundador de ${mxnCurso(PRECIOS.fundador)} (en vez de ${mxnCurso(PRECIOS.regular)}) dura hasta el ${fechaLarga(FECHAS.finFundador)} o hasta llenarse los primeros ${PRECIOS.cupoFundador} lugares. No hace falta esperar el correo para entrar.`
              : `Las inscripciones cierran el ${fechaLarga(FECHAS.cierreInscripciones)}. No hace falta esperar el correo para entrar.`}
          </p>
          <div className="mt-6">
            <BotonComprar
              precio={pv.precio}
              abierto={abierto}
              className="inline-block bg-dorado px-10 py-5 font-dm text-base font-semibold uppercase tracking-[2px] text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-terracota hover:text-crema active:scale-[0.98]"
            >
              Reservar mi lugar · {mxnCurso(pv.precio)}
            </BotonComprar>
          </div>
        </div>

        <p className="mt-10 font-dm text-lg text-negro/75">
          ¿Prefieres preguntarme algo antes?{" "}
          <a href={WHATSAPP_CURSO} target="_blank" rel="noopener noreferrer" className="font-medium text-verde-selva underline">
            Escríbeme por WhatsApp
          </a>
          , te contesto yo.
        </p>
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
