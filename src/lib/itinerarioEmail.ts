// Correo del lead magnet: "Itinerario de 3 días en la Huasteca".
//
// Es contenido real y útil por sí solo (por eso la gente deja su correo), pero
// cada día apunta al tour que cubre justo esa zona, y al final ofrece la Guía
// Definitiva de $49. Así se capturan leads sin canibalizar el producto pagado:
// el itinerario resuelve "qué hago", la guía resuelve "cómo lo hago yo solo".

import { TOURS_DB } from "./tours";

const BASE = "https://www.huasteca-potosina.com";
const WA   = "524891251458";

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

export function buildItinerarioEmailHtml(): { subject: string; html: string } {
  const diasHtml = DIAS.map((d) => {
    const tour = TOURS_DB.find((t) => t.slug === d.tourSlug);
    const lugares = d.lugares
      .map(
        (l) =>
          `<li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#444">${l}</li>`,
      )
      .join("");

    const tourHtml = tour
      ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#3a6b1a">
           ¿Sin coche o sin ganas de manejar? Este día completo es nuestro
           <a href="${BASE}/tours/${tour.slug}" style="color:#3a6b1a;font-weight:bold">${tour.nombre.split(" — ")[0]}</a>
           — ${mx(tour.precio)} por persona, con entradas, guía y traslado redondo
           desde tu hospedaje en Xilitla o Ciudad Valles.
         </p>`
      : "";

    return `
    <div style="border:1px solid #e3ddc9;background:#f7f4ec;padding:18px 20px;margin:0 0 16px">
      <p style="margin:0 0 2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
        Día ${d.num} · ${d.zona}
      </p>
      <h2 style="margin:0 0 12px;font-size:18px;color:#1a2e1a;font-weight:normal">${d.titulo}</h2>
      <ul style="margin:0;padding-left:18px">${lugares}</ul>
      <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#666;border-top:1px solid #e3ddc9;padding-top:12px">
        <strong style="color:#1a2e1a">Tip:</strong> ${d.tip}
      </p>
      ${tourHtml}
    </div>`;
  }).join("");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">

    <h1 style="font-size:24px;margin:0 0 8px;color:#1a2e1a">Tu itinerario de 3 días en la Huasteca</h1>
    <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px">
      Este es el recorrido que le armamos a la mayoría de nuestros viajeros: cubre
      lo imperdible sin pasar el día entero en carretera. Guárdalo, es tuyo.
    </p>

    ${diasHtml}

    <div style="border:1px solid #e3ddc9;padding:18px 20px;margin:24px 0 16px">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Antes de salir</p>
      <ul style="margin:0;padding-left:18px">
        <li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#444">Lleva efectivo: varios parques no aceptan tarjeta.</li>
        <li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#444">Zapato que se pueda mojar y se agarre bien a la roca.</li>
        <li style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#444">Bloqueador biodegradable — en varios sitios es obligatorio.</li>
        <li style="margin:0;font-size:14px;line-height:1.5;color:#444">Bolsa seca o funda para el celular si vas a Tamul o rafting.</li>
      </ul>
      <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#666;border-top:1px solid #e3ddc9;padding-top:12px">
        <strong style="color:#1a2e1a">¿Dónde quedarte?</strong> Xilitla y Ciudad Valles son las dos
        bases más prácticas. Si tomas alguno de nuestros tours, pasamos por ti a tu hospedaje en
        cualquiera de las dos — no importa en qué hotel te quedes.
      </p>
    </div>

    <p style="text-align:center;margin:28px 0 8px">
      <a href="${BASE}/tours" style="background:#3a6b1a;color:#ffffff;text-decoration:none;padding:14px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
        Ver los tours con guía →
      </a>
    </p>
    <p style="text-align:center;font-size:13px;color:#666;margin:0 0 28px">
      Puedes apartar tu lugar con el 30 % y pagar el resto el día del tour.
    </p>

    <div style="background:#1a2e1a;padding:22px 24px;margin:0 0 20px">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">¿Vas por tu cuenta?</p>
      <h2 style="margin:0 0 10px;font-size:19px;color:#f4edd8;font-weight:normal">La Guía Definitiva de la Huasteca</h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:rgba(244,237,216,0.75)">
        Presupuesto real día por día, cómo llegar a cada sitio desde CDMX, Monterrey
        y San Luis, horarios y precios de entrada actualizados, dónde dormir y comer,
        e itinerarios de 5 y 7 días. Todo lo que este correo no alcanza a cubrir.
      </p>
      <a href="${BASE}/guia" style="background:#c4882a;color:#0e1710;text-decoration:none;padding:12px 28px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:12px;display:inline-block">
        Verla — $49 MXN
      </a>
    </div>

    <p style="font-size:12px;line-height:1.6;color:#888;text-align:center">
      ¿Dudas sobre fechas, clima o cómo combinar los días?<br>
      Escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:#3a6b1a">+52 489 125 1458</a> — contestamos en menos de 1 hora.
    </p>
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:18px">
      Tours Huasteca Potosina · Recibiste este correo porque pediste el itinerario en nuestro sitio.
    </p>
  </div>`;

  return { subject: "Tu itinerario de 3 días en la Huasteca 🌿", html };
}
