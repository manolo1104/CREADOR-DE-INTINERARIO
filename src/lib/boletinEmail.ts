/**
 * El resumen mensual: lo que hace que la base de correos deje de ser un archivo
 * muerto.
 *
 * Hoy la secuencia termina y ahí acaba todo. Quien dejó su correo en la guía
 * gratis, el planificador o un artículo del blog no vuelve a saber de nosotros
 * nunca — aunque el blog publique cada cinco días y aunque la temporada cambie
 * el color del agua dos veces al año.
 *
 * ── Por qué UNA vez al mes y no cada artículo ──────────────────────────────
 *
 * El agente publica cada 5 días. Mandar cada artículo serían ~6 correos al mes
 * a gente que nunca pidió un boletín: eso no se lee, se marca spam. Una vez al
 * mes, con los artículos agrupados y un motivo real para abrirlo (qué está
 * pasando en la Huasteca ESTE mes), es lo que sostiene la lista viva.
 *
 * ── Los tres bloques, y por qué en ese orden ───────────────────────────────
 *
 *  1. LA TEMPORADA. Es lo único que cambia de verdad mes a mes y lo único que
 *     justifica el correo. Va primero, y con su matiz honesto incluido.
 *  2. LO QUE ESCRIBIMOS. Los artículos nuevos, con foto. Es contenido, no venta.
 *  3. UN CONSEJO. Práctico y corto. Lo que sabe alguien que vive ahí.
 *
 * La venta va al final y suave: un botón. Quien lleva ocho meses en la lista sin
 * reservar no se convence a empujones; se convence el mes en que por fin tiene
 * fechas, y para entonces lo importante es seguir estando ahí.
 */

import { TOURS_DB } from "./tours";
import { temporadaDe, nombreMes } from "./temporada";
import {
  BASE, C, WA, bajoBoton, barra, boton, fotoTour, nota, parrafo, shellCorreo, tabla, titulo,
} from "./emailLayout";

export interface BoletinPost {
  slug:          string;
  title:         string;
  excerpt:       string;
  coverImageUrl: string | null;
}

export interface BoletinInput {
  /** Para el enlace de baja del pie. */
  email:      string;
  /** Los artículos publicados desde el último envío. */
  posts:      BoletinPost[];
  /** El recorrido que le tocó en su día, si lo tenemos. */
  tourSlug?:  string | null;
  /** Mes a retratar (1–12). Por omisión, el actual. */
  mes?:       number;
}

/**
 * Consejos que solo sabe quien vive ahí. Rotan por mes para no repetir.
 *
 * Todos salen de datos que el sitio ya afirma (requisitos de tour, advertencias
 * de destino, FAQ). Ninguno es un consejo genérico de viaje.
 */
const CONSEJOS = [
  "Lleva efectivo. Varios parques no aceptan tarjeta y el cajero más cercano puede estar a media hora.",
  "El zapato importa más que la ropa: que se pueda mojar y que agarre en roca mojada. Las chanclas se quedan en el hotel.",
  "Bloqueador biodegradable. En varios sitios es obligatorio y te lo revisan en la entrada.",
  "Si vas a Tamul o al rafting, mete el celular en una bolsa seca. La lancha se moja por dentro.",
  "Puente de Dios tiene cupo limitado por día. En fin de semana largo, llega antes de las 10.",
  "Las Pozas de Edward James abre a las 9:00. A las 11 ya hay fila y las fotos salen con multitud.",
  "Xilitla y Ciudad Valles son las dos bases. Xilitla te ahorra carretera si vas por Las Pozas; Ciudad Valles, si vas por cascadas.",
  "De Ciudad de México a Ciudad Valles son 6.5 a 7 horas. El tramo final a Xilitla es sierra: mejor no manejarlo de noche.",
  "El agua turquesa es de temporada seca. Si vienes en lluvias, vienes por el caudal — que también vale la pena, pero es otra foto.",
  "Nadie hace la Huasteca en un día. Las cascadas quedan lejos unas de otras; con dos días completos ya se siente distinto.",
  "Pregunta antes de descartar un recorrido por edad o condición física. La mayoría admite más gente de la que la foto sugiere.",
  "Si llueve el día de tu tour, se reprograma sin costo. No pierdas el viaje por el pronóstico de una semana antes.",
] as const;

export function buildBoletinEmail(d: BoletinInput): { subject: string; html: string } {
  const mes = d.mes ?? Number(
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }).slice(5, 7),
  );
  const t = temporadaDe(mes);
  const consejo = CONSEJOS[(mes - 1) % CONSEJOS.length];

  // El recorrido que destaca: el suyo si lo tenemos, si no el primero que la
  // temporada favorece. Nunca uno al azar.
  const suyo = d.tourSlug ? TOURS_DB.find((x) => x.slug === d.tourSlug) : undefined;
  const destacado = suyo ?? TOURS_DB.find((x) => x.slug === t.destaca[0]);

  const postsHtml = d.posts.length
    ? barra(d.posts.length === 1 ? "Lo que escribimos este mes" : "Lo que escribimos este mes") +
      tabla(d.posts.slice(0, 3).map((p, i) => `
        <tr>
          <td style="border:1px solid ${C.borde};${i === 0 ? "" : "border-top:none;"}background-color:${C.tarjeta};padding:18px 22px;">
            <p style="margin:0 0 6px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:${C.oscuro};line-height:1.3;">
              <a href="${BASE}/blog/${p.slug}" style="color:${C.oscuro};">${p.title}</a>
            </p>
            <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:${C.texto};line-height:1.7;">${p.excerpt}</p>
            <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;">
              <a href="${BASE}/blog/${p.slug}" style="color:${C.verde};font-weight:500;">Leerlo →</a>
            </p>
          </td>
        </tr>`).join(""))
    : "";

  const html = shellCorreo({
    locale: "es",
    preheader: `${nombreMes(mes)} en la Huasteca Potosina`,
    eyebrow: `${nombreMes(mes)} en la Huasteca`,
    h1a: t.nombre.split(",")[0],
    h1b: t.nombre.includes(",") ? t.nombre.split(",").slice(1).join(",").trim() : undefined,
    entradilla: t.gancho,
    cuerpo: [
      // El matiz va arriba, no escondido al final: es lo que hace que este
      // correo se lea distinto de una promoción.
      nota(`<strong style="color:${C.oscuro};">Lo que no te va a decir un folleto:</strong> ${t.matiz}`, C.texto, "0"),
      postsHtml,
      barra("El consejo del mes"),
      tabla(`
        <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:20px 22px;">
          ${parrafo(consejo, "0")}
        </td></tr>`),
      destacado ? barra(suyo ? "Sigue esperándote" : "El que mejor luce este mes") : "",
      destacado ? tabla(`
        <tr><td style="padding:0;">${fotoTour(destacado.slug, destacado.nombre, 190)}</td></tr>
        <tr><td style="border:1px solid ${C.borde};border-top:none;background-color:${C.tarjeta};padding:20px 22px;">
          ${titulo(destacado.nombre.split("—")[0].trim(), "0 0 8px 0")}
          ${parrafo(destacado.tagline, "0 0 10px 0")}
          <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:${C.oscuro};">
            $${destacado.precio.toLocaleString("es-MX")} MXN
            <span style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.tenue};">
              ${destacado.precioUnidad === "vehiculo" ? "por vehículo" : "por persona"} · ${destacado.duracion_hrs} h
            </span>
          </p>
        </td></tr>`) : "",
      destacado
        ? boton(`${BASE}/reservar/carrito?agregar=${destacado.slug}`, "Ver fechas")
        : boton(`${BASE}/tours`, "Ver los recorridos"),
      bajoBoton("Sin prisa. Apartas con el 30 % y cancelas gratis hasta 48 h antes."),
    ].join(""),
    pie: `¿Vas a venir y tienes dudas de fechas o de clima? Escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a> — contestamos en menos de una hora.`,
    origen: "Te llega una vez al mes porque dejaste tu correo en nuestro sitio.",
    paraBaja: d.email,
  });

  return { subject: `${nombreMes(mes)} en la Huasteca: ${t.nombre.toLowerCase()}`, html };
}
