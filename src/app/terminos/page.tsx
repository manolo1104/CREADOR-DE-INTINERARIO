import { Metadata } from "next";
import Link from "next/link";
import { CONTACTO } from "@/lib/contacto";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Términos y condiciones — Tours Huasteca Potosina",
  description:
    "Condiciones de contratación de nuestros tours: reservas, anticipo del 30 %, pagos, cancelaciones, responsabilidades del viajero, seguridad y uso de imágenes.",
  alternates: { canonical: `${SITE}/terminos` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Términos y condiciones — Tours Huasteca Potosina",
    description: "Condiciones de contratación de nuestros tours en la Huasteca Potosina.",
    url: `${SITE}/terminos`,
    type: "website",
  },
};

/** Última revisión del documento. Actualízala si cambian las condiciones. */
const ULTIMA_ACTUALIZACION = "10 de agosto de 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-cormorant font-light text-verde-profundo text-2xl mt-12 mb-4">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-dm text-sm text-negro/65 leading-relaxed mb-4">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="font-dm text-sm text-negro/65 leading-relaxed flex items-start gap-2 mb-2">
      <span className="text-verde-vivo mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
      <span>{children}</span>
    </li>
  );
}

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">Legal</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          Términos y <em className="text-dorado">condiciones</em>
        </h1>
        <p className="font-dm text-xs text-negro/40 mb-10">Última actualización: {ULTIMA_ACTUALIZACION}</p>

        <P>
          Estas condiciones rigen la contratación de los servicios turísticos que{" "}
          <strong className="text-verde-profundo">{CONTACTO.nombreComercial}</strong> ofrece a través de{" "}
          <span className="text-verde-profundo">www.huasteca-potosina.com</span> y por sus canales de atención.
          Al reservar un tour aceptas lo que se describe a continuación.
        </P>

        <H2>1. Quiénes somos</H2>
        <P>
          Somos una operadora de turismo de aventura con base en {CONTACTO.ciudadBase}, que opera
          recorridos guiados en la Huasteca Potosina con guías certificados en la norma NOM-09-TUR.
          {CONTACTO.razonSocial && CONTACTO.rfc
            ? ` Razón social: ${CONTACTO.razonSocial}, RFC ${CONTACTO.rfc}.`
            : ""}
        </P>
        <P>
          Contacto: WhatsApp {CONTACTO.telefonoDisplay} · correo{" "}
          <a href={`mailto:${CONTACTO.email}`} className="text-verde-selva underline underline-offset-2">
            {CONTACTO.email}
          </a>
          .
        </P>

        <H2>2. Reservas</H2>
        <ul className="mb-4">
          <Li>Una reserva queda confirmada cuando recibimos el anticipo y te enviamos la confirmación por correo o WhatsApp. Hasta ese momento no hay lugar apartado.</Li>
          <Li>Los tours operan con un cupo máximo por salida (12 participantes en la mayoría de los recorridos). El cupo se asigna por orden de confirmación.</Li>
          <Li>Es tu responsabilidad revisar que los datos de la reserva —fecha, número de personas, edades y punto de encuentro— sean correctos. Avísanos de inmediato si algo no coincide.</Li>
          <Li>Podemos requerir un mínimo de participantes para operar ciertas salidas. Si no se alcanza, te ofrecemos otra fecha o el reembolso completo.</Li>
        </ul>

        <H2>3. Precios y pagos</H2>
        <ul className="mb-4">
          <Li>Todos los precios están en pesos mexicanos (MXN) e incluyen lo que cada tour detalla en su página.</Li>
          <Li>Puedes apartar con un anticipo del 30 % y liquidar el saldo el día del tour, o pagar el 100 % al reservar.</Li>
          <Li>Los pagos con tarjeta se procesan a través de Stripe. No almacenamos los datos de tu tarjeta en ningún momento.</Li>
          <Li>El saldo del día del tour se puede cubrir en efectivo o con tarjeta. Los pagos con tarjeta en sitio pueden llevar una comisión del 3 %.</Li>
          <Li>Algunos destinos cobran cuotas locales en efectivo (accesos ejidales, pangas). Cuando así sea, viene indicado en la página del tour o del destino.</Li>
          <Li>Los precios de niños se aplican por edad: de 6 a 10 años pagan el 70 % del precio de adulto y los menores de 6 años el 50 %. Podemos pedir identificación el día del tour.</Li>
        </ul>

        <H2>4. Cancelaciones, cambios y clima</H2>
        <P>
          Las condiciones completas están en la{" "}
          <Link href="/politica-de-cancelacion" className="text-verde-selva underline underline-offset-2">
            política de cancelación y clima
          </Link>
          , que forma parte de estos términos. En resumen: cancelación gratuita con 48 horas o más
          de anticipación; entre 48 y 24 horas se retiene el 50 %; con menos de 24 horas no hay
          reembolso pero puedes reagendar una vez sin costo. Si cancelamos nosotros —por clima,
          seguridad o cierre del paraje— eliges entre reembolso completo o reagendar sin costo.
        </P>

        <H2>5. Tu responsabilidad como participante</H2>
        <ul className="mb-4">
          <Li>Debes informarnos al reservar de cualquier condición médica, lesión, embarazo, limitación física o tratamiento que pueda afectar tu participación en actividades de aventura.</Li>
          <Li>Las instrucciones del guía son obligatorias, incluido el uso de chaleco salvavidas, casco y arnés donde corresponda. El guía puede excluir de una actividad a quien no las siga, sin derecho a reembolso.</Li>
          <Li>No se permite participar bajo el efecto de alcohol o de sustancias que alteren la coordinación o el juicio.</Li>
          <Li>Los menores de edad viajan bajo la responsabilidad de su padre, madre o tutor, que debe acompañarlos durante todo el recorrido.</Li>
          <Li>Debes presentarte en el punto y a la hora acordados. El grupo no espera indefinidamente; llegar tarde puede significar perder la salida sin reembolso.</Li>
          <Li>Eres responsable de tus objetos personales. No respondemos por pérdida o daño de equipo electrónico, joyería o pertenencias en actividades acuáticas.</Li>
        </ul>

        <H2>6. Seguridad y seguro</H2>
        <P>
          Operamos con guías certificados NOM-09-TUR y equipo de seguridad revisado. Los tours
          incluyen seguro de viajero durante la actividad contratada, con las coberturas y los
          límites que fija la póliza vigente; el seguro no sustituye a un seguro de gastos médicos
          personal y no cubre condiciones preexistentes ni conductas contrarias a las instrucciones
          del guía.
        </P>
        <P>
          El turismo de aventura implica riesgos inherentes que no se pueden eliminar por completo.
          Al participar los reconoces y los aceptas. Nuestra responsabilidad se limita al valor de
          los servicios contratados y no cubre gastos derivados de tu traslado a la región,
          hospedaje ajeno al paquete, ni daños que resulten de incumplir las instrucciones de
          seguridad.
        </P>

        <H2>7. Cambios en el itinerario</H2>
        <P>
          Los tiempos publicados son estimados. Podemos modificar el orden de las visitas, el punto
          de encuentro o sustituir un destino por otro equivalente cuando lo exijan las condiciones
          del río, del clima, del tráfico, del acceso o de la seguridad del grupo. Cuando el cambio
          sea sustancial te lo comunicamos y aplican las opciones de la política de cancelación.
        </P>

        <H2>8. Imágenes</H2>
        <P>
          Durante los recorridos tomamos fotografías y video, que en varios tours se entregan
          incluidos. Podemos usar ese material con fines de difusión. Si no quieres aparecer,
          dínoslo antes de la salida o escríbenos después a{" "}
          <a href={`mailto:${CONTACTO.email}`} className="text-verde-selva underline underline-offset-2">
            {CONTACTO.email}
          </a>{" "}
          y lo retiramos.
        </P>

        <H2>9. Datos personales</H2>
        <P>
          El tratamiento de tus datos se rige por nuestro{" "}
          <Link href="/aviso-de-privacidad" className="text-verde-selva underline underline-offset-2">
            Aviso de Privacidad
          </Link>
          , conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares.
        </P>

        <H2>10. Quejas y ley aplicable</H2>
        <P>
          Si algo no salió como esperabas, escríbenos primero a nosotros: la mayoría de los casos se
          resuelven directo y rápido. Estas condiciones se rigen por la legislación mexicana y por
          la Ley Federal de Protección al Consumidor. En caso de controversia son competentes los
          tribunales de San Luis Potosí, sin perjuicio de tu derecho a acudir a PROFECO.
        </P>

        <H2>11. Cambios a estos términos</H2>
        <P>
          Podemos actualizar este documento. La versión aplicable a tu reserva es la publicada en
          esta página el día en que reservaste; la fecha de la última revisión aparece al inicio.
        </P>

        <p className="font-dm text-xs text-negro/40 mt-12 pt-8 border-t border-negro/10">
          Ver también:{" "}
          <Link href="/politica-de-cancelacion" className="underline underline-offset-2 hover:text-negro/70">Política de cancelación</Link>
          {" · "}
          <Link href="/aviso-de-privacidad" className="underline underline-offset-2 hover:text-negro/70">Aviso de Privacidad</Link>
          {" · "}
          <Link href="/contacto" className="underline underline-offset-2 hover:text-negro/70">Contacto</Link>
        </p>
      </div>
    </main>
  );
}
