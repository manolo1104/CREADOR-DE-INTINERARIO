/**
 * Datos de contacto de la empresa — FUENTE ÚNICA.
 *
 * Antes había tres correos distintos repartidos por el sitio:
 *   - `hola@huastecapotosina.mx`   (pie de la home)  ← ese dominio NO tiene
 *     registros MX, así que todo lo que se enviara ahí rebotaba.
 *   - `hola@huasteca-potosina.com` (solo en el JSON-LD, invisible al cliente)
 *   - `privacidad@huasteca-potosina.com` (aviso de privacidad)
 *
 * Se unifica en el dominio del sitio, que sí tiene correo configurado.
 * Si algún día se publica otro correo, se agrega aquí y solo aquí.
 */

const WA_NUMBER = "524891251458";

export const CONTACTO = {
  nombreComercial: "Tours Huasteca Potosina",

  /** Correo público de atención. Verificado con registros MX activos. */
  email: "hola@huasteca-potosina.com",
  /** Buzón de datos personales (ARCO), referenciado en el aviso de privacidad. */
  emailPrivacidad: "privacidad@huasteca-potosina.com",

  telefonoDisplay: "+52 489 125 1458",
  telefonoE164: "+524891251458",
  whatsappUrl: `https://wa.me/${WA_NUMBER}`,

  /**
   * PENDIENTE: el sitio nunca ha publicado un horario de atención. Cuando
   * Manolo confirme el real, se pone aquí y /contacto lo muestra solo.
   */
  horario: null as string | null,

  /** Base de operaciones. Los tours recogen en Xilitla y en Ciudad Valles. */
  ciudadBase: "Xilitla, San Luis Potosí",
  ubicacionCorta: "San Luis Potosí, México",
  /**
   * PENDIENTE DE CONFIRMAR: domicilio tomado del Perfil de Empresa de Google.
   * No se renderiza hasta que Manolo confirme que es el domicilio de la
   * operadora de tours y no solo el del Hotel Paraíso Encantado.
   */
  direccion: null as string | null,
  mapsUrl: "https://maps.app.goo.gl/SWGyihBFTiykTFFM6",

  /** PENDIENTE: razón social y RFC. El aviso de privacidad dice "En trámite". */
  razonSocial: null as string | null,
  rfc: null as string | null,

  facebook: "https://www.facebook.com/huastecatours/?locale=es_LA",
} as const;
