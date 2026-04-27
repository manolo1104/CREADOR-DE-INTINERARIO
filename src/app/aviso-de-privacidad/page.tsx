import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de Privacidad — Tours Huasteca Potosina",
  description:
    "Aviso de Privacidad de Tours Huasteca Potosina conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).",
  robots: { index: false },
};

const FECHA = "27 de abril de 2026";
const RESPONSABLE = "Tours Huasteca Potosina";
const RFC = "En trámite";
const DOMICILIO = "Xilitla, San Luis Potosí, México";
const EMAIL_ARCO = "privacidad@huasteca-potosina.com";
const SITIO = "https://www.huasteca-potosina.com";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-cormorant font-light text-verde-profundo mt-12 mb-4" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-negro/65 font-dm text-sm leading-relaxed mb-4">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-negro/65 font-dm text-sm leading-relaxed mb-2">
      <span className="text-verde-selva flex-shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function AvisoPrivacidadPage() {
  return (
    <main id="main-content" className="min-h-screen bg-crema">

      {/* Hero */}
      <section className="bg-verde-profundo px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">Legal</p>
        <h1 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(32px,5vw,58px)" }}>
          Aviso de Privacidad
        </h1>
        <p className="text-crema/50 font-dm text-sm">Última actualización: {FECHA}</p>
      </section>

      {/* Contenido */}
      <article className="max-w-3xl mx-auto px-6 py-16">

        <H2>I. Identidad y domicilio del Responsable</H2>
        <P>
          <strong>{RESPONSABLE}</strong> (en adelante "el Responsable"), con domicilio en {DOMICILIO},
          RFC {RFC}, es el responsable del tratamiento de sus datos personales conforme a lo
          establecido en la <em>Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares</em> (LFPDPPP) y su Reglamento.
        </P>
        <P>
          Sitio web: <a href={SITIO} className="text-verde-selva underline hover:text-verde-vivo transition-colors">{SITIO}</a>
          <br />
          Correo electrónico ARCO: <a href={`mailto:${EMAIL_ARCO}`} className="text-verde-selva underline hover:text-verde-vivo transition-colors">{EMAIL_ARCO}</a>
        </P>

        <H2>II. Datos personales que se recaban</H2>
        <P>Para las finalidades descritas en el presente aviso, el Responsable podrá recabar las siguientes categorías de datos personales:</P>
        <ul className="mb-4">
          <Li><strong>Datos de identificación:</strong> nombre completo, número de personas en el grupo.</Li>
          <Li><strong>Datos de contacto:</strong> número de teléfono (WhatsApp), correo electrónico.</Li>
          <Li><strong>Datos de preferencias de viaje:</strong> fechas deseadas, tour de interés, número de participantes, presupuesto aproximado.</Li>
          <Li><strong>Datos financieros:</strong> información de pago procesada a través de Stripe (los datos de tarjeta son gestionados exclusivamente por Stripe y no son almacenados por el Responsable).</Li>
          <Li><strong>Datos de navegación:</strong> dirección IP, tipo de navegador, páginas visitadas, duración de la sesión (vía cookies analíticas).</Li>
        </ul>
        <P>El Responsable <strong>no recaba datos personales sensibles</strong> en el sentido del artículo 3, fracción VI de la LFPDPPP.</P>

        <H2>III. Finalidades del tratamiento</H2>
        <P><strong>Finalidades primarias</strong> (necesarias para la relación jurídica):</P>
        <ul className="mb-6">
          <Li>Procesar y confirmar reservaciones de tours guiados.</Li>
          <Li>Enviar información sobre el tour reservado (punto de encuentro, hora de salida, lista de qué llevar).</Li>
          <Li>Procesar pagos a través de la pasarela Stripe.</Li>
          <Li>Emitir confirmaciones y comprobantes de pago.</Li>
          <Li>Atender aclaraciones, cambios o cancelaciones de reservación.</Li>
          <Li>Cumplir con obligaciones legales y fiscales aplicables.</Li>
        </ul>
        <P><strong>Finalidades secundarias</strong> (no necesarias para la relación jurídica — puede oponerse):</P>
        <ul className="mb-4">
          <Li>Enviar información sobre nuevos tours, destinos y promociones.</Li>
          <Li>Realizar encuestas de satisfacción post-tour.</Li>
          <Li>Análisis estadístico anónimo de navegación para mejorar el sitio web.</Li>
        </ul>
        <P>
          Si no desea que sus datos sean tratados para las finalidades secundarias, puede manifestarlo
          enviando un correo a <a href={`mailto:${EMAIL_ARCO}`} className="text-verde-selva underline">{EMAIL_ARCO}</a> con
          el asunto "Oposición a finalidades secundarias".
        </P>

        <H2>IV. Transferencias de datos personales</H2>
        <P>El Responsable podrá transferir sus datos personales a los siguientes terceros:</P>
        <ul className="mb-4">
          <Li><strong>Stripe, Inc.</strong> (procesador de pagos) — para gestionar transacciones seguras. Stripe opera bajo su propia política de privacidad.</Li>
          <Li><strong>Autoridades competentes</strong> — cuando sea requerido por ley, orden judicial o autoridad administrativa.</Li>
          <Li><strong>Guías y operadores locales</strong> — exclusivamente para coordinar la logística de los tours reservados, con datos mínimos necesarios.</Li>
        </ul>
        <P>
          El Responsable no comercializa, vende ni cede datos personales a terceros con fines de
          mercadotecnia ajena. Todas las transferencias están sujetas a las mismas medidas de
          seguridad descritas en este aviso.
        </P>

        <H2>V. Derechos ARCO</H2>
        <P>
          Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar y Oponerse</strong> (derechos ARCO)
          al tratamiento de sus datos personales, conforme a los artículos 22 al 35 de la LFPDPPP.
        </P>
        <P>Para ejercer sus derechos ARCO, envíe una solicitud a <a href={`mailto:${EMAIL_ARCO}`} className="text-verde-selva underline">{EMAIL_ARCO}</a> que contenga:</P>
        <ul className="mb-4">
          <Li>Nombre completo e identificación oficial (INE, pasaporte).</Li>
          <Li>Descripción clara del derecho que desea ejercer.</Li>
          <Li>Cualquier elemento que facilite la localización de sus datos.</Li>
        </ul>
        <P>
          El Responsable dará respuesta en un plazo máximo de <strong>20 días hábiles</strong> a partir
          de recibida la solicitud. Si la respuesta es procedente, se hará efectiva en un plazo de
          15 días hábiles adicionales.
        </P>

        <H2>VI. Uso de cookies y tecnologías de rastreo</H2>
        <P>
          El sitio web utiliza cookies propias de sesión y cookies analíticas de terceros para
          mejorar la experiencia de navegación y medir el tráfico. Puede gestionar sus preferencias
          de cookies a través del banner que aparece en su primera visita o configurando su navegador.
        </P>
        <P>
          Deshabilitar las cookies analíticas no afectará el funcionamiento esencial del sitio ni
          su capacidad de realizar reservaciones.
        </P>

        <H2>VII. Medidas de seguridad</H2>
        <P>
          El Responsable ha implementado medidas de seguridad administrativas, técnicas y físicas
          para proteger sus datos personales contra daño, pérdida, alteración o acceso no autorizado,
          incluyendo: transmisión cifrada mediante HTTPS/TLS, acceso restringido a bases de datos
          mediante autenticación, y proveedores de alojamiento con certificaciones de seguridad.
        </P>

        <H2>VIII. Cambios al Aviso de Privacidad</H2>
        <P>
          El Responsable se reserva el derecho de modificar el presente Aviso de Privacidad en
          cualquier momento. Cualquier cambio será notificado a través de este sitio web con al menos
          30 días de anticipación. La versión vigente siempre estará disponible en{" "}
          <a href={`${SITIO}/aviso-de-privacidad`} className="text-verde-selva underline">{SITIO}/aviso-de-privacidad</a>.
        </P>

        <H2>IX. Contacto</H2>
        <P>
          Para cualquier duda, aclaración o ejercicio de derechos ARCO, contáctenos en:<br />
          📧 <a href={`mailto:${EMAIL_ARCO}`} className="text-verde-selva underline">{EMAIL_ARCO}</a><br />
          📍 {DOMICILIO}
        </P>

        <div className="mt-12 pt-8 border-t border-negro/10">
          <p className="text-negro/40 font-dm text-xs">
            Este Aviso de Privacidad fue elaborado conforme a la{" "}
            <em>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</em>{" "}
            (DOF 5 de julio de 2010) y su Reglamento (DOF 21 de diciembre de 2011),
            emitidos por el Instituto Nacional de Transparencia, Acceso a la Información y
            Protección de Datos Personales (INAI).
          </p>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors border-b border-verde-selva/30 pb-0.5 font-dm">
            ← Volver al inicio
          </Link>
        </div>

      </article>
    </main>
  );
}
