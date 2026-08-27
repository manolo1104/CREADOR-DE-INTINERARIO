// Correo del lead magnet: "Itinerario de 3 días en la Huasteca".
//
// Es contenido real y útil por sí solo (por eso la gente deja su correo), pero
// cada día apunta al tour que cubre justo esa zona, y al final ofrece la Guía
// Definitiva de $49. Así se capturan leads sin canibalizar el producto pagado:
// el itinerario resuelve "qué hago", la guía resuelve "cómo lo hago yo solo".

import { TOURS_DB } from "./tours";
import {
  BASE, C, WA, bajoBoton, barra, boton, fotoTour, parrafo, shellCorreo, tabla, titulo,
} from "./emailLayout";

const mx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

type Dia = {
  num: number;
  zona: string;
  titulo: string;
  lugares: string[];
  tip: string;
  tourSlug: string;
};

// Cada día corresponde a una zona real y al tour que la cubre. El orden es el
// que menos carretera implica: sur → centro → norte.
const DIAS: Dia[] = [
  {
    num: 1,
    zona: "Xilitla",
    titulo: "Arte surrealista y manantiales",
    lugares: [
      "Las Pozas — el Jardín Surrealista de Edward James",
      "Xilitla Pueblo Mágico y su mercado",
      "Nacimiento de Huichihuayán (agua turquesa, poca gente)",
    ],
    tip: "Llega a Las Pozas a la apertura (9:00). Después de las 11 se llena y las fotos salen con multitud.",
    tourSlug: "ruta-surrealista-edward-james",
  },
  {
    num: 2,
    zona: "Aquismón",
    titulo: "La cascada más alta y el abismo",
    lugares: [
      "Cascada de Tamul en canoa (105 m de caída)",
      "Sótano de las Huahuas — mirador al abismo de 512 m",
      "Cenote Cueva del Agua",
    ],
    tip: "Tamul lleva agua turquesa de noviembre a mayo. En temporada de lluvias baja café y con más caudal.",
    tourSlug: "expedicion-tamul",
  },
  {
    num: 3,
    zona: "Tamasopo y Ciudad Valles",
    titulo: "Cascadas escalonadas para cerrar",
    lugares: [
      "Puente de Dios — la poza dentro de la cueva",
      "Siete Cascadas de Tamasopo",
      "Cascadas de Micos (opción con salto y skybike)",
    ],
    tip: "Puente de Dios tiene cupo limitado por día. Si vas en fin de semana largo, llega antes de las 10.",
    tourSlug: "ruta-acuatica-puente-de-dios",
  },
];

export function buildItinerarioEmailHtml(email?: string): { subject: string; html: string } {
  const diasHtml = DIAS.map((d) => {
    const tour = TOURS_DB.find((t) => t.slug === d.tourSlug);
    const lugares = d.lugares
      .map((l) => `
        <p style="margin:0 0 7px 0;font-family:'DM Sans',Arial,sans-serif;font-size:13.5px;font-weight:300;color:${C.texto};line-height:1.6;">
          <span style="color:${C.verde};">·</span>&nbsp; ${l}
        </p>`)
      .join("");

    const tourHtml = tour
      ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:2px solid ${C.dorado};margin:16px 0 0 0;">
          <tr><td style="padding:2px 0 2px 16px;">
            <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:${C.texto};line-height:1.7;">
              ¿Sin coche o sin ganas de manejar? Este día completo es nuestro
              <a href="${BASE}/tours/${tour.slug}" style="color:${C.verde};font-weight:500;">${tour.nombre.split(" — ")[0]}</a>
              — ${mx(tour.precio)} por persona, con entradas, guía y traslado redondo desde tu hospedaje.
            </p>
          </td></tr>
        </table>`
      : "";

    // La foto es la del tour que cubre ESA zona, no una postal genérica: el
    // día 2 habla de Aquismón y la imagen es Tamul. Versión ligera y en JPG
    // (`src/scripts/generar-imagenes-correo.ts`) — la del sitio pesa demasiado
    // y dos tours la tienen en webp, que Outlook no muestra.
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">
      ${tour ? `<tr><td style="padding:0;">${fotoTour(tour.slug, `${d.titulo} — ${d.zona}`, 180)}</td></tr>` : ""}
      <tr><td style="border:1px solid ${C.borde};${tour ? "border-top:none;" : ""}background-color:${C.tarjeta};padding:20px 22px;">
        <p style="margin:0 0 4px 0;font-family:'DM Sans',Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.dorado};">Día ${d.num} · ${d.zona}</p>
        ${titulo(d.titulo, "0 0 14px 0")}
        ${lugares}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;">
          <tr><td style="border-top:1px solid ${C.borde};padding:13px 0 0 0;">
            <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:${C.tenue};line-height:1.7;">
              <strong style="color:${C.oscuro};">Tip:</strong> ${d.tip}
            </p>
          </td></tr>
        </table>
        ${tourHtml}
      </td></tr>
    </table>`;
  }).join("");

  const antesDeSalir = [
    "Lleva efectivo: varios parques no aceptan tarjeta.",
    "Zapato que se pueda mojar y se agarre bien a la roca.",
    "Bloqueador biodegradable — en varios sitios es obligatorio.",
    "Bolsa seca o funda para el celular si vas a Tamul o rafting.",
  ];

  const html = shellCorreo({
    locale: "es",
    preheader: "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: "Tu itinerario, gratis",
    h1a: "Tres días en",
    h1b: "la Huasteca",
    entradilla: "Este es el recorrido que le armamos a la mayoría de nuestros viajeros: cubre lo imperdible sin pasar el día entero en carretera. Guárdalo, es tuyo.",
    cuerpo: [
      diasHtml,
      barra("Antes de salir"),
      tabla(`
        <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:20px 22px;">
          ${antesDeSalir.map((x) => `
          <p style="margin:0 0 8px 0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:${C.texto};line-height:1.6;">
            <span style="color:${C.verde};">✓</span>&nbsp; ${x}
          </p>`).join("")}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 0 0;">
            <tr><td style="border-top:1px solid ${C.borde};padding:13px 0 0 0;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;color:${C.tenue};line-height:1.7;">
                <strong style="color:${C.oscuro};">¿Dónde quedarte?</strong> Xilitla y Ciudad Valles son las dos bases más
                prácticas. Si tomas alguno de nuestros tours, pasamos por ti a tu hospedaje en cualquiera de las dos —
                no importa en qué hotel te quedes.
              </p>
            </td></tr>
          </table>
        </td></tr>`),
      boton(`${BASE}/tours`, "Ver los tours con guía"),
      bajoBoton("Puedes apartar tu lugar con el 30 % y pagar el resto el día del tour."),
      barra("¿Vas por tu cuenta?"),
      tabla(`
        <tr><td style="border:1px solid ${C.borde};background-color:${C.tarjeta};padding:22px;">
          ${titulo("La Guía Definitiva de la Huasteca", "0 0 10px 0")}
          ${parrafo("Presupuesto real día por día, cómo llegar a cada sitio desde CDMX, Monterrey y San Luis, horarios y precios de entrada actualizados, dónde dormir y comer, e itinerarios de 5 y 7 días. Todo lo que este correo no alcanza a cubrir.", "0")}
        </td></tr>`),
      boton(`${BASE}/guia`, "Verla — $49 MXN", "dorado"),
    ].join(""),
    pie: `¿Dudas sobre fechas, clima o cómo combinar los días? Escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a> — contestamos en menos de 1 hora.`,
    origen: "Recibiste este correo porque pediste el itinerario en nuestro sitio.",
    paraBaja: email,
  });

  return { subject: "Tu itinerario de 3 días en la Huasteca 🌿", html };
}
