/**
 * El correo que recibe quien deja su correo en el popup de Xantolo.
 *
 * No manda un PDF ni nada nuevo: manda la guía de Xantolo que ya existe en el
 * blog desde el 21 de septiembre. Eso es lo que el popup promete y es lo único
 * que se debe prometer: el artículo ya está escrito, ya tiene fotos propias y
 * ya rankea. Inventar un segundo material sería trabajo nuevo para entregar
 * algo peor.
 *
 * 🔴 Va con `await` dentro del endpoint. Un correo lanzado sin esperar se
 * pierde en cuanto el servidor cierra la petición.
 */

import {
  BASE, C, WA, bajoBoton, barra, boton, nota, parrafo, shellCorreo, tabla, titulo,
} from "./emailLayout";

/** Las tres noches de Xantolo 2026. Si cambian, se cambian aquí y en el popup. */
export const XANTOLO_FECHAS = "31 de octubre, 1 y 2 de noviembre de 2026";

/** El artículo que ya vive en el blog. Sin prefijo de idioma: el blog es solo español. */
export const XANTOLO_SLUG =
  "/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia";

export function buildXantoloEmailHtml(
  email?: string,
  appUrl: string = BASE,
): { subject: string; html: string } {
  const guiaUrl  = `${appUrl}${XANTOLO_SLUG}`;
  const toursUrl = `${appUrl}/tours`;

  const html = shellCorreo({
    locale: "es",
    preheader: `Xantolo 2026 · ${XANTOLO_FECHAS} · Huasteca Potosina`,
    eyebrow: "Tu guía de Xantolo",
    h1a: "Xantolo en la",
    h1b: "Huasteca Potosina",
    entradilla: `Aquí está. Las fechas, los pueblos donde se vive de verdad, qué es cada danza y cómo llegar sin perderte nada. Este año cae el ${XANTOLO_FECHAS}.`,
    cuerpo: [
      boton(guiaUrl, "Leer la guía completa", "dorado"),
      bajoBoton("Guarda este correo: el botón sirve las veces que quieras, también desde el celular."),

      barra("Lo que vas a encontrar"),
      tabla(`
        <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:22px;">
          ${titulo("Las tres noches, pueblo por pueblo", "0 0 10px 0")}
          ${parrafo("Qué pasa el 31, el 1 y el 2, y en qué pueblo se vive cada cosa: <strong>Axtla</strong>, <strong>Tancanhuitz</strong>, <strong>San Martín Chalchicuautla</strong> —la cuna del Xantolo— y <strong>Xilitla</strong>.", "0 0 14px 0")}
          ${titulo("Las danzas y qué significan", "0 0 10px 0")}
          ${parrafo("Los huehues, las comparsas, el arco y la ofrenda. Para que no lo veas como un desfile bonito sin saber qué estás viendo.", "0 0 14px 0")}
          ${titulo("Cómo moverte esos días", "0 0 10px 0")}
          ${parrafo("Dónde dormir, cuánto tardas entre pueblo y pueblo, y qué se cierra en fechas de fiesta.", "0")}
        </td></tr>`),

      barra("Y si vienes esos días"),
      parrafo("Xantolo es de noche. Los días quedan libres, y son los mejores del año para el agua turquesa: octubre y noviembre son plena temporada alta en la Huasteca.", "16px 0 18px 0"),
      boton(toursUrl, "Ver los recorridos"),
      nota("Si ya tienes fechas, escríbenos por WhatsApp y te decimos qué se puede combinar sin que se te empalme con las noches de fiesta."),
    ].join(""),
    pie: `¿Alguna duda? Responde a este correo o escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 109 0388</a>.`,
    origen: "Recibes este correo porque pediste la guía de Xantolo en huasteca-potosina.com.",
    paraBaja: email,
  });

  return {
    subject: `Tu guía de Xantolo 2026 🕯️ — ${XANTOLO_FECHAS}`,
    html,
  };
}
