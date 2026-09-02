import { FECHAS, GARANTIA, LINKS, WHATSAPP_CURSO, fechaLarga, horaCorta } from "@/lib/curso";

/**
 * /curso/bienvenido — a donde llega el alumno después de pagar en Stripe.
 *
 * El correo de bienvenida (C1, con el calendario adjunto) es la entrega
 * canónica y sale del webhook; esta página confirma al instante y repite lo
 * esencial por si el correo tarda.
 */
export default function BienvenidoPage() {
  const pasos = [
    {
      t: "Revisa tu correo",
      d: "Te acaba de llegar la bienvenida con tu recibo y el calendario de sesiones adjunto (ábrelo y se guarda en el calendario de tu teléfono).",
    },
    {
      t: "Agenda las fechas",
      d: `Arrancamos el ${fechaLarga(FECHAS.inicioCohorte)} a las ${horaCorta(FECHAS.inicioCohorte)} (hora del centro). Sesiones martes y jueves de 7:00 a 8:30 pm, talleres los sábados a las 10:00 am.`,
    },
    {
      t: "Tu tarea antes del martes",
      d: "En una hoja: qué vendes, a quién, tus 3 productos estrella con precios y las 5 preguntas que más te hacen los clientes. Con esa hoja construimos todo.",
    },
    {
      t: LINKS.comunidadWhatsApp ? "Entra a la comunidad" : "Espera la invitación a la comunidad",
      d: LINKS.comunidadWhatsApp
        ? "El grupo de WhatsApp de alumnos: dudas, avances y compañía de gremio."
        : "En estos días te llega por correo la invitación al grupo de WhatsApp de alumnos.",
    },
  ];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-tinta text-hielo">
      <section className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 md:py-24">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-azul-vivo">
          Turismo con IA · Cohorte 1
        </p>
        <h1 className="mt-4 font-sora text-5xl font-semibold leading-[1.05] text-hielo md:text-6xl">
          Estás dentro.
        </h1>
        <p className="mt-6 font-dm text-xl leading-relaxed text-hielo/80">
          Tu pago quedó registrado y tu lugar está apartado. A partir de hoy,
          esto deja de ser un curso que compraste y empieza a ser un sistema
          que construyes.
        </p>

        <ol className="mt-10 space-y-0">
          {pasos.map((p, i) => (
            <li key={p.t} className={`grid grid-cols-[auto_1fr] gap-5 py-6 ${i > 0 ? "border-t border-linea" : ""}`}>
              <span className="font-sora text-4xl font-light leading-none text-azul-vivo">{i + 1}</span>
              <div>
                <h2 className="font-dm text-lg font-semibold text-hielo">{p.t}</h2>
                <p className="mt-1.5 font-dm text-lg leading-relaxed text-hielo/75">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <a
            href="/curso/calendario.ics"
            className="inline-block bg-azul px-8 py-4 text-center font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-[background-color,transform] duration-200 ease-out hover:bg-azul-vivo active:scale-[0.98]"
          >
            Agregar fechas a mi calendario
          </a>
          {LINKS.comunidadWhatsApp && (
            <a
              href={LINKS.comunidadWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#25d366] px-8 py-4 text-center font-dm text-base font-semibold uppercase tracking-[2px] text-tinta transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              Entrar a la comunidad
            </a>
          )}
        </div>

        <div className="mt-10 border border-azul/25 bg-tinta-2 p-6">
          <p className="font-dm text-base leading-relaxed text-hielo/75">
            <strong className="text-hielo">{GARANTIA.nombre}.</strong>{" "}
            {GARANTIA.texto}
          </p>
        </div>

        <p className="mt-8 font-dm text-lg text-hielo/75">
          ¿Algo no llegó o tienes una duda?{" "}
          <a href={WHATSAPP_CURSO} target="_blank" rel="noopener noreferrer" className="font-medium text-azul-vivo underline">
            Escríbeme por WhatsApp
          </a>
          .
        </p>
      </section>

      <footer className="bg-tinta-2 px-5 py-8 text-center font-dm text-sm text-hielo/60">
        <p>Manolo · Huasteca Potosina Tours</p>
      </footer>
    </main>
  );
}
