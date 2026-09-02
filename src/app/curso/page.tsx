import Image from "next/image";
import { prisma } from "@/lib/prisma";
import {
  ANTES_DESPUES, BONOS, CIFRAS, DOLORES, FAQS, FECHAS, GARANTIA, INCLUYE,
  NO_ES_PARA, PARA_QUIEN, PRECIOS, PROGRAMA, VALOR_BONOS, WHATSAPP_CURSO,
  fechaLarga, inscripcionesAbiertas, mxnCurso, precioVigente,
} from "@/lib/curso";
import {
  BarraCurso, BotonComprar, Cifra, CuentaRegresiva, FormLead,
} from "@/components/curso/CursoCliente";

export const dynamic = "force-dynamic";

/**
 * Landing del curso "Turismo con IA".
 *
 * Diseño leído así: página de venta para dueños de negocios turísticos,
 * muchos mayores de 45, no técnicos, llegando desde WhatsApp en el celular.
 * Marca Huasteca (Cormorant + DM Sans, crema/verdes, dorado como acento,
 * esquinas rectas). Tipografía de cuerpo GRANDE (18px+), contraste alto,
 * movimiento mínimo y con motivo. Un solo CTA de compra repetido; nada de
 * salidas del embudo.
 */
export default async function CursoPage() {
  const ahora = new Date();
  const pagados = await prisma.cursoLead
    .count({ where: { compro: true } })
    .catch(() => 0);
  const pv = precioVigente(ahora, pagados);
  const abierto = inscripcionesAbiertas(ahora, pagados);
  const lugares = PRECIOS.cupoTotal - pagados;

  const ctaPrimario = `Reservar mi lugar · ${mxnCurso(pv.precio)}`;

  const claseCtaDorado =
    "inline-block whitespace-nowrap bg-dorado px-5 py-5 text-center font-dm text-[14px] font-semibold uppercase tracking-[1px] text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-terracota hover:text-crema active:scale-[0.98] sm:px-10 sm:text-base sm:tracking-[2px]";

  return (
    <main className="bg-crema text-negro md:pt-[52px]">
      <BarraCurso
        precio={pv.precio}
        esFundador={pv.esFundador}
        limiteIso={pv.limite.toISOString()}
        abierto={abierto}
      />

      {/* ══ HERO ══ Split: mensaje a la izquierda, el panel real a la derecha */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-10 md:grid-cols-[7fr_5fr] md:gap-14 md:pb-20 md:pt-16">
        <div>
          <p className="font-dm text-xs font-medium uppercase tracking-[2.5px] text-verde-selva">
            Para agencias de viajes, guías, operadores y hoteles
          </p>
          <h1 className="mt-4 font-cormorant text-[2.6rem] font-semibold leading-[1.04] text-verde-profundo sm:text-6xl md:text-[4.2rem]">
            +{mxnCurso(CIFRAS.total4m)} en 4 meses.
            <br />
            <em className="not-italic text-terracota">Sin pagar publicidad.</em>
          </h1>
          <p className="mt-6 max-w-[32ch] font-dm text-xl leading-relaxed text-negro/80 sm:text-2xl">
            Lo hice con IA, sin saber programar. En 4 semanas construyes el
            mismo sistema para tu negocio, conmigo.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <BotonComprar precio={pv.precio} abierto={abierto} className={claseCtaDorado}>
              {ctaPrimario}
            </BotonComprar>
            <a
              href="#programa"
              className="inline-block whitespace-nowrap border border-verde-selva/40 px-6 py-5 text-center font-dm text-[14px] uppercase tracking-[1px] text-verde-selva sm:text-base sm:tracking-[2px] sm:px-8 transition-colors duration-200 hover:border-verde-selva hover:bg-verde-selva/10"
            >
              Ver el programa
            </a>
          </div>
        </div>

        <figure className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden border border-negro/10 bg-white shadow-[0_24px_60px_-24px_rgba(26,46,26,0.45)] sm:aspect-[4/3] md:aspect-[4/5]">
            <Image
              src="/imagenes/curso/panel-hero.jpg"
              alt="El panel de control real de Huasteca Potosina Tours: reservas, ingresos y ocupación"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover object-top"
            />
          </div>
          <figcaption className="mt-3 font-dm text-sm text-negro/60">
            El panel real de Huasteca Potosina Tours, construido con IA. En el
            curso lo ves por dentro, con los números en vivo.
          </figcaption>
        </figure>
      </section>
      <div id="fin-hero" aria-hidden="true" />

      {/* ══ FRANJA DE RESULTADOS ══ Las tres cifras, contadas al entrar */}
      <section className="bg-verde-profundo px-5 py-14 text-crema md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 text-center sm:grid-cols-3 sm:gap-6">
          <div>
            <Cifra hasta={CIFRAS.toursVentas4m} prefijo="+$" className="font-cormorant text-5xl font-semibold text-arena md:text-6xl" />
            <p className="mt-3 font-dm text-base leading-snug opacity-85">
              en ventas de Huasteca Potosina Tours<br />en sus primeros 4 meses
            </p>
          </div>
          <div>
            <Cifra hasta={CIFRAS.hotelReservas4m} prefijo="+$" className="font-cormorant text-5xl font-semibold text-arena md:text-6xl" />
            <p className="mt-3 font-dm text-base leading-snug opacity-85">
              en reservas del hotel<br />en sus primeros 4 meses
            </p>
          </div>
          <div>
            <span className="font-cormorant text-5xl font-semibold text-arena md:text-6xl">$0</span>
            <p className="mt-3 font-dm text-base leading-snug opacity-85">
              en publicidad pagada. El único gasto:<br />la suscripción de IA
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl border-t border-crema/15 pt-6 text-center">
          <p className="font-dm text-sm leading-relaxed opacity-70">
            Cifras reales de mis negocios; las muestro en vivo durante el curso.
            Son resultados propios y no garantizan resultados individuales.
          </p>
          <p className="mt-3 font-dm text-base font-medium text-arena">
            La cohorte arranca el {fechaLarga(FECHAS.inicioCohorte)}
            {pagados >= 3 ? ` · quedan ${lugares} de ${PRECIOS.cupoTotal} lugares` : ` · cupo: ${PRECIOS.cupoTotal} lugares`}
          </p>
        </div>
      </section>

      {/* ══ DOLORES ══ En las palabras exactas del gremio */}
      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <h2 className="max-w-[18ch] font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
          Si todavía haces esto a mano, estás pagando de más.
        </h2>
        <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {DOLORES.map((d) => (
            <blockquote key={d} className="border-l-2 border-dorado pl-6">
              <p className="font-cormorant text-2xl italic leading-snug text-negro/85 md:text-[1.7rem]">
                “{d}”
              </p>
            </blockquote>
          ))}
        </div>
        <p className="mt-10 max-w-[58ch] font-dm text-lg leading-relaxed text-negro/75">
          Son frases reales de colegas del gremio. Yo estaba igual: contestando
          a las 11 de la noche, con las reservas en un Excel. Hasta que dejé de
          hacerlo a mano.
        </p>
      </section>

      {/* ══ HISTORIA / PRUEBA ══ Bloque oscuro: el sistema existe y se ve */}
      <section className="bg-verde-profundo px-5 py-16 text-crema md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-[20ch] font-cormorant text-4xl font-semibold leading-tight md:text-5xl">
            Lo construí para mi negocio. Ahora lo construyes tú.
          </h2>
          <div className="mt-8 grid gap-12 md:grid-cols-[3fr_2fr] md:gap-16">
            <div className="space-y-5 font-dm text-lg leading-relaxed text-crema/85">
              <p>
                Soy Manolo. Llevo <strong className="text-crema">Huasteca Potosina Tours</strong>,
                un hotel en la Huasteca y Kora, una plataforma para hoteles.
                Estudié turismo, no computación.
              </p>
              <p>
                Arranqué los tours sin presupuesto de marketing. En vez de pagar
                anuncios, construí con IA la página, el agente que atiende el
                WhatsApp y las automatizaciones de cobro y seguimiento.
              </p>
              <p>
                En 4 meses: más de {mxnCurso(CIFRAS.toursVentas4m)} en ventas.
                Repetí la fórmula en el hotel: más de {mxnCurso(CIFRAS.hotelReservas4m)} en
                reservas en el mismo plazo. El único gasto fijo fue la
                suscripción de IA, {CIFRAS.gastoIa}.
              </p>
              <p className="border-l-2 border-dorado pl-5 font-cormorant text-2xl italic leading-snug text-crema">
                “No te voy a enseñar teoría de IA. Te voy a enseñar lo que uso
                todos los días.”
              </p>
            </div>
            <dl className="h-fit border border-crema/20 bg-verde-bosque/60 p-7 font-dm">
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-base opacity-80">Publicidad pagada</dt>
                <dd className="text-2xl font-semibold text-arena">$0</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-crema/15 py-3">
                <dt className="text-base opacity-80">Suscripción de IA</dt>
                <dd className="text-right text-base font-medium text-crema">cientos de pesos/mes</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-crema/15 py-3">
                <dt className="text-base opacity-80">Ventas + reservas</dt>
                <dd className="text-2xl font-semibold text-arena">+{mxnCurso(CIFRAS.total4m)}</dd>
              </div>
              <p className="mt-2 border-t border-crema/15 pt-4 text-sm leading-relaxed opacity-70">
                Primeros 4 meses de cada negocio, sumados.
              </p>
            </dl>
          </div>

          {/* Las tres pruebas visuales: página, agente, panel */}
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                src: "/imagenes/curso/pagina.jpg",
                alt: "La página pública de Huasteca Potosina Tours",
                pie: "La página, con reservas y pagos. La construyes en la semana 1.",
              },
              {
                src: "/imagenes/curso/whatsapp.jpg",
                alt: "El agente de IA respondiendo una cotización por WhatsApp",
                pie: "El agente cotizando por WhatsApp. Lo conectas en la semana 2.",
              },
              {
                src: "/imagenes/curso/panel.jpg",
                alt: "El panel de control con reservas e ingresos",
                pie: "El panel con tus números en tiempo real. Lo haces en la semana 4.",
              },
            ].map((f) => (
              <figure key={f.src + f.pie}>
                <div className="relative aspect-[3/4] overflow-hidden border border-crema/15 bg-verde-bosque">
                  <Image src={f.src} alt={f.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover object-top" />
                </div>
                <figcaption className="mt-3 font-dm text-sm leading-relaxed opacity-75">{f.pie}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROGRAMA ══ Línea de 4 semanas, cada una con su entregable */}
      <section id="programa" className="mx-auto max-w-4xl scroll-mt-16 px-5 py-16 md:py-24">
        <h2 className="font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
          Qué construyes en 4 semanas
        </h2>
        <p className="mt-4 max-w-[56ch] font-dm text-lg leading-relaxed text-negro/75">
          Dos sesiones en vivo por semana (martes y jueves, 7:00 a 8:30 pm) y un
          taller abierto el sábado para revisar tu proyecto. Cada semana termina
          con algo tuyo, publicado y funcionando.
        </p>
        <ol className="mt-12 space-y-0">
          {PROGRAMA.map((s, i) => (
            <li key={s.semana} className={`grid gap-5 py-9 sm:grid-cols-[auto_1fr] sm:gap-8 ${i > 0 ? "border-t border-negro/10" : ""}`}>
              <div className="font-cormorant text-6xl font-light leading-none text-dorado sm:w-20">
                {s.semana}
              </div>
              <div>
                <h3 className="font-cormorant text-3xl font-semibold leading-tight text-verde-profundo">
                  {s.titulo}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {s.sesiones.map((t) => (
                    <li key={t} className="flex gap-3 font-dm text-lg leading-relaxed text-negro/80">
                      <span aria-hidden="true" className="mt-[13px] h-1.5 w-1.5 shrink-0 bg-verde-selva" />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 inline-block bg-verde-selva/10 px-4 py-2.5 font-dm text-base font-medium text-verde-profundo">
                  Te llevas: {s.entregable.charAt(0).toLowerCase() + s.entregable.slice(1)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ══ ANTES / DESPUÉS ══ */}
      <section className="bg-[#efe8d3] px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
            Tu negocio, antes y después
          </h2>
          <div className="mt-10">
            <div className="hidden grid-cols-2 gap-8 pb-3 font-dm text-sm font-semibold uppercase tracking-[2px] text-negro/50 sm:grid">
              <span>Hoy</span>
              <span className="text-verde-selva">En 4 semanas</span>
            </div>
            {ANTES_DESPUES.map(([antes, despues], i) => (
              <div key={antes} className={`grid gap-2 py-6 sm:grid-cols-2 sm:gap-8 ${i > 0 ? "border-t border-negro/10" : "sm:border-t sm:border-negro/10"}`}>
                <p className="font-dm text-lg leading-relaxed text-negro/60">
                  <span className="mr-2 font-semibold uppercase tracking-wide text-negro/40 sm:hidden">Hoy:</span>
                  {antes}
                </p>
                <p className="font-dm text-lg font-medium leading-relaxed text-verde-profundo">
                  <span className="mr-2 font-semibold uppercase tracking-wide text-verde-selva sm:hidden">Después:</span>
                  {despues}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ QUÉ INCLUYE + BONOS ══ */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-24">
        <h2 className="font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
          Todo lo que recibes
        </h2>
        <ul className="mt-8 space-y-4">
          {INCLUYE.map((x) => (
            <li key={x} className="flex items-start gap-4 font-dm text-lg leading-relaxed text-negro/85">
              <svg aria-hidden="true" className="mt-1.5 h-5 w-5 shrink-0 text-verde-selva" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              {x}
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <h3 className="font-cormorant text-3xl font-semibold text-verde-profundo">
            Y si entras con precio de fundador, también:
          </h3>
          <div className="mt-6 space-y-4">
            {BONOS.map((b, i) => (
              <div key={b.nombre} className="border border-dorado/50 bg-white/70 p-6 sm:flex sm:items-start sm:justify-between sm:gap-8">
                <div>
                  <p className="font-dm text-sm font-semibold uppercase tracking-[2px] text-dorado">
                    Bono {i + 1}
                  </p>
                  <h4 className="mt-1 font-cormorant text-2xl font-semibold leading-tight text-verde-profundo">
                    {b.nombre}
                  </h4>
                  <p className="mt-2 max-w-[52ch] font-dm text-base leading-relaxed text-negro/75">{b.detalle}</p>
                </div>
                <p className="mt-4 shrink-0 font-dm text-lg font-semibold text-verde-profundo sm:mt-1 sm:text-right">
                  Valor: {mxnCurso(b.valor)}
                  <span className="block text-sm font-medium text-verde-selva">incluido</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 font-dm text-base text-negro/70">
            Los tres bonos suman <strong>{mxnCurso(VALOR_BONOS)}</strong> y
            expiran con el precio de fundador el {fechaLarga(FECHAS.finFundador)}.
          </p>
        </div>
      </section>

      {/* ══ INVERSIÓN ══ */}
      <section id="inversion" className="scroll-mt-16 bg-verde-profundo px-5 py-16 text-crema md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-cormorant text-4xl font-semibold leading-tight md:text-5xl">
            Tu inversión
          </h2>

          <div className="mt-10 border border-crema/20 bg-verde-bosque/60 p-8 md:p-12">
            {pv.esFundador ? (
              <>
                <p className="font-dm text-sm font-semibold uppercase tracking-[2.5px] text-arena">
                  Precio de fundador
                </p>
                <p className="mt-4 font-dm text-xl text-crema/60">
                  <s>{mxnCurso(PRECIOS.regular)}</s>
                </p>
                <p className="font-cormorant text-7xl font-semibold text-crema md:text-8xl">
                  {mxnCurso(PRECIOS.fundador)}
                </p>
                <p className="mt-3 font-dm text-lg text-crema/85">
                  o 3 pagos de {mxnCurso(Math.round(PRECIOS.fundador / 3))} sin intereses
                </p>
                <p className="mt-5 font-dm text-base text-arena">
                  Solo los primeros {PRECIOS.cupoFundador} lugares, hasta el {fechaLarga(FECHAS.finFundador)}.
                  Después: {mxnCurso(PRECIOS.regular)} y sin bonos.
                </p>
              </>
            ) : (
              <>
                <p className="font-dm text-sm font-semibold uppercase tracking-[2.5px] text-arena">
                  Cohorte 1 · inicia {fechaLarga(FECHAS.inicioCohorte)}
                </p>
                <p className="mt-4 font-cormorant text-7xl font-semibold text-crema md:text-8xl">
                  {mxnCurso(PRECIOS.regular)}
                </p>
                <p className="mt-3 font-dm text-lg text-crema/85">
                  o 3 pagos de {mxnCurso(PRECIOS.regular / 3)} sin intereses
                </p>
              </>
            )}

            <div className="mt-8">
              <BotonComprar precio={pv.precio} abierto={abierto} className={`${claseCtaDorado} w-full sm:w-auto`}>
                {ctaPrimario}
              </BotonComprar>
            </div>
            <p className="mt-4 font-dm text-sm text-crema/60">
              Pago seguro con Stripe · tarjeta de crédito o débito
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-[60ch] space-y-4 text-left font-dm text-lg leading-relaxed text-crema/85">
            <p>
              Piénsalo contra lo que reemplaza: la página que pagas por fuera,
              el asistente que contesta y el CRM suman más de{" "}
              <strong className="text-crema">{mxnCurso(CIFRAS.reemplazaAnualMxn)} al año</strong>.
            </p>
            <p>
              Y contra lo que produce: este sistema generó más de{" "}
              <strong className="text-crema">{mxnCurso(CIFRAS.total4m)} en 4 meses</strong> en
              mis negocios, sin publicidad. El curso cuesta menos del 1.5% de eso.
              Una reserva extra por semana captada por tu agente lo paga en el
              primer mes.
            </p>
          </div>

          <div className="mt-10 border border-arena/40 bg-verde-bosque/40 p-7 text-left sm:flex sm:items-start sm:gap-5">
            <svg aria-hidden="true" className="h-9 w-9 shrink-0 text-arena" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
            <div className="mt-3 sm:mt-0">
              <h3 className="font-cormorant text-2xl font-semibold text-crema">{GARANTIA.nombre}</h3>
              <p className="mt-2 font-dm text-base leading-relaxed text-crema/85">{GARANTIA.texto}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PARA QUIÉN ══ */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-24">
        <h2 className="font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
          ¿Es para ti?
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-dm text-base font-semibold uppercase tracking-[2px] text-verde-selva">
              Sí, si eres
            </h3>
            <ul className="mt-5 space-y-3.5">
              {PARA_QUIEN.map((x) => (
                <li key={x} className="flex items-start gap-3.5 font-dm text-lg leading-relaxed text-negro/85">
                  <svg aria-hidden="true" className="mt-1.5 h-5 w-5 shrink-0 text-verde-selva" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-dm text-base font-semibold uppercase tracking-[2px] text-terracota">
              No, si buscas
            </h3>
            <ul className="mt-5 space-y-3.5">
              {NO_ES_PARA.map((x) => (
                <li key={x} className="flex items-start gap-3.5 font-dm text-lg leading-relaxed text-negro/70">
                  <svg aria-hidden="true" className="mt-1.5 h-5 w-5 shrink-0 text-terracota" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="bg-[#efe8d3] px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-cormorant text-4xl font-semibold leading-tight text-verde-profundo md:text-5xl">
            Las dudas de siempre
          </h2>
          <div className="mt-8">
            {FAQS.map((f) => (
              <details key={f.p} className="group border-t border-negro/10 py-1 last-of-type:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-dm text-lg font-medium text-verde-profundo [&::-webkit-details-marker]:hidden">
                  {f.p}
                  <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-verde-selva transition-transform duration-200 ease-out group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </summary>
                <p className="max-w-[60ch] pb-6 font-dm text-lg leading-relaxed text-negro/75">{f.r}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 border border-verde-selva/25 bg-white/60 p-7 text-center">
            <p className="font-dm text-lg text-negro/85">¿Tienes otra duda? Pregúntame directo, te contesto yo.</p>
            <a
              href={WHATSAPP_CURSO}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2.5 bg-[#25d366] px-8 py-4 font-dm text-base font-semibold uppercase tracking-[1.5px] text-white transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" /></svg>
              WhatsApp directo conmigo
            </a>
          </div>
        </div>
      </section>

      {/* ══ CIERRE ══ */}
      <section id="cierre" className="scroll-mt-16 bg-verde-profundo px-5 py-16 text-crema md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-cormorant text-4xl font-semibold leading-tight md:text-6xl">
            La próxima cohorte es en enero.
            <br />
            Este precio no vuelve.
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] font-dm text-xl leading-relaxed text-crema/85">
            Yo ya lo hice dos veces: en los tours y en el hotel, sin anuncios.
            Ahora te toca a ti.
          </p>

          <div className="mt-10 text-arena">
            <CuentaRegresiva limiteIso={pv.limite.toISOString()} grande />
          </div>
          <p className="mt-4 font-dm text-base text-crema/70">
            {pv.esFundador
              ? `para que termine el precio de fundador de ${mxnCurso(PRECIOS.fundador)}`
              : "para que cierren las inscripciones de la cohorte 1"}
          </p>

          {pagados >= 3 && (
            <div className="mx-auto mt-8 max-w-md">
              <div className="h-2.5 w-full border border-crema/25">
                <div
                  className="h-full bg-dorado"
                  style={{ width: `${Math.min(100, Math.round((pagados / PRECIOS.cupoTotal) * 100))}%` }}
                />
              </div>
              <p className="mt-2.5 font-dm text-base text-crema/80">
                {pagados} de {PRECIOS.cupoTotal} lugares ocupados
              </p>
            </div>
          )}

          <div className="mt-10">
            <BotonComprar precio={pv.precio} abierto={abierto} className={claseCtaDorado}>
              {ctaPrimario}
            </BotonComprar>
          </div>

          <div className="mt-16 border-t border-crema/15 pt-12 text-left">
            <h3 className="text-center font-cormorant text-3xl font-semibold">
              ¿Aún no te decides?
            </h3>
            <p className="mx-auto mt-3 max-w-[48ch] text-center font-dm text-lg leading-relaxed text-crema/80">
              Déjame tus datos y te mando el programa completo por correo, sin
              compromiso.
            </p>
            <div className="mx-auto mt-8 max-w-xl border border-crema/20 bg-crema p-6 text-negro sm:p-8">
              <FormLead />
            </div>
          </div>
        </div>
      </section>

      {/* ══ PIE MÍNIMO ══ */}
      <footer className="bg-negro px-5 py-10 pb-24 text-center font-dm text-sm text-crema/60 md:pb-10">
        <p>
          Un curso de Manolo · Huasteca Potosina Tours · Xilitla, San Luis
          Potosí, México
        </p>
        <p className="mt-3 space-x-4">
          <a href="/aviso-de-privacidad" className="underline hover:text-crema">Aviso de privacidad</a>
          <a href={WHATSAPP_CURSO} target="_blank" rel="noopener noreferrer" className="underline hover:text-crema">WhatsApp</a>
        </p>
      </footer>
    </main>
  );
}
