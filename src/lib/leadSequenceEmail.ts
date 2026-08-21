// Secuencia de correos para quien deja su correo en el recomendador.
//
// Hasta ahora ese correo caía en una hoja de Google y nadie le volvía a
// escribir. El recomendador ya sabe qué tour le queda, para cuántos días y con
// quién viaja: la secuencia usa ESO. No es un boletín, son cuatro mensajes
// sobre SU viaje.
//
// Cadencia: inmediato → +1 día → +3 días → +7 días. El primero no vende: le
// entrega lo que pidió. El descuento nunca aparece; la palanca es el anticipo
// del 30 % y la cancelación gratuita, que en travel convierten mejor que un
// porcentaje.

import { TOURS_DB, type Tour } from "./tours";

const BASE = "https://www.huasteca-potosina.com";
const WA   = "524891251458";

const mx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export type LeadEmailPaso = 1 | 2 | 3 | 4 | 5;

export interface LeadEmailInput {
  paso:            LeadEmailPaso;
  grupo?:          string | null;
  dias?:           string | null;
  origen?:         string | null;
  tourPrincipal?:  string | null;  // slug
  tourSecundario?: string | null;  // slug
}

// ── Piezas reutilizables ────────────────────────────────────────────────────

function wrap(contenido: string, footer = true): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2e1a">
    ${contenido}
    ${footer ? `
    <p style="font-size:12px;line-height:1.6;color:#888;text-align:center;margin-top:28px">
      ¿Dudas de fechas, clima o cómo combinar los días?<br>
      Escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:#3a6b1a">+52 489 125 1458</a> — contestamos en menos de 1 hora.
    </p>
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:16px">
      Tours Huasteca Potosina · Recibes esto porque usaste nuestro recomendador.
      Si ya no quieres saber de nosotros, respóndenos "baja" y no te volvemos a escribir.
    </p>` : ""}
  </div>`;
}

function botonPrincipal(href: string, texto: string): string {
  return `
  <p style="text-align:center;margin:28px 0 8px">
    <a href="${href}" style="background:#3a6b1a;color:#ffffff;text-decoration:none;padding:14px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
      ${texto}
    </a>
  </p>`;
}

/** Tarjeta del tour recomendado, con lo que de verdad incluye. */
function tarjetaTour(t: Tour, etiqueta: string): string {
  const incluye = t.incluye.slice(0, 5)
    .map((i) => `<li style="margin:0 0 5px;font-size:13px;line-height:1.5;color:#444">${i}</li>`)
    .join("");
  const anticipo = t.precioUnidad === "vehiculo" ? "" : `
    <p style="margin:10px 0 0;font-size:13px;color:#3a6b1a">
      Puedes apartar tu lugar con el 30 % — <strong>${mx(Math.round(t.precio * 0.3))}</strong> hoy
      y el resto el día del tour.
    </p>`;

  return `
  <div style="border:1px solid #e3ddc9;background:#f7f4ec;padding:18px 20px;margin:0 0 16px">
    <p style="margin:0 0 2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">${etiqueta}</p>
    <h2 style="margin:0 0 6px;font-size:19px;color:#1a2e1a;font-weight:normal">${t.nombre}</h2>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#444">${t.descripcion}</p>
    <p style="margin:0 0 12px;font-size:15px;color:#1a2e1a">
      <strong>${mx(t.precio)}</strong>
      <span style="font-size:13px;color:#666">${t.precioUnidad === "vehiculo" ? "por vehículo" : "por persona"} · ${t.duracion_hrs} h aprox.</span>
    </p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Incluye</p>
    <ul style="margin:0;padding-left:18px">${incluye}</ul>
    ${anticipo}
  </div>`;
}

// ── Los cuatro mensajes ─────────────────────────────────────────────────────

export function buildLeadSequenceEmail(d: LeadEmailInput): { subject: string; html: string } | null {
  const principal  = d.tourPrincipal  ? TOURS_DB.find((t) => t.slug === d.tourPrincipal)  : undefined;
  const secundario = d.tourSecundario ? TOURS_DB.find((t) => t.slug === d.tourSecundario) : undefined;

  // Sin tour recomendado no hay nada personalizado que decir: mejor no escribir.
  if (!principal) return null;

  const urlPrincipal = `${BASE}/tours/${principal.slug}`;
  const nombreCorto  = principal.nombre.split(" — ")[0];
  const conQuien     = d.grupo ? ` para tu viaje ${d.grupo === "pareja" ? "en pareja" : `con ${d.grupo}`}` : "";

  switch (d.paso) {
    // ── 1. Inmediato: le entregamos lo que pidió. No vende. ──────────────────
    case 1:
      return {
        subject: `Tu recomendación: ${nombreCorto}`,
        html: wrap(`
          <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Esto es lo que te recomendamos</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 22px">
            Con lo que nos contaste${conQuien}${d.dias ? ` y tus ${d.dias}` : ""},
            este es el recorrido que mejor te queda. Te lo dejamos por escrito para que
            lo revises con calma — sin prisa y sin compromiso.
          </p>
          ${tarjetaTour(principal, "Tu mejor opción")}
          ${secundario ? tarjetaTour(secundario, "Y si prefieres otra cosa") : ""}
          ${botonPrincipal(urlPrincipal, "Ver el tour completo →")}
          <p style="text-align:center;font-size:13px;color:#666;margin:0">
            Cancelación gratuita hasta 48 h antes. Sin preguntas.
          </p>
        `),
      };

    // ── 2. +1 día: por qué ESE tour, y cómo funciona el día ─────────────────
    case 2: {
      const paradas = principal.destinos.slice(0, 4)
        .map((x) => `<li style="margin:0 0 5px;font-size:14px;line-height:1.5;color:#444">${x}</li>`)
        .join("");
      return {
        subject: `Cómo es un día en ${nombreCorto}`,
        html: wrap(`
          <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Cómo se ve tu día</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            Para que no te quede duda de qué estás reservando, así funciona
            <strong>${nombreCorto}</strong> de principio a fin.
          </p>

          <div style="border:1px solid #e3ddc9;background:#f7f4ec;padding:18px 20px;margin:0 0 16px">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">El recorrido</p>
            <ul style="margin:0 0 14px;padding-left:18px">${paradas}</ul>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#666;border-top:1px solid #e3ddc9;padding-top:12px">
              <strong style="color:#1a2e1a">Pasamos por ti</strong> a tu hospedaje en Xilitla o
              Ciudad Valles entre las 8:00 y 9:00 AM, y te regresamos entre 6:00 y 7:00 PM.
              No necesitas hospedarte con nosotros ni tener coche.
            </p>
          </div>

          <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 4px">
            Grupos de máximo ${principal.groupMax} personas, guía certificado NOM-09 SECTUR y
            ${principal.reviewCount} reseñas de gente que ya lo hizo.
          </p>
          ${botonPrincipal(urlPrincipal, "Ver fechas disponibles →")}
        `),
      };
    }

    // ── 3. +3 días: la objeción real es el monto, no el precio ──────────────
    case 3: {
      if (principal.precioUnidad === "vehiculo") {
        return {
          subject: `¿Apartamos tu ${nombreCorto}?`,
          html: wrap(`
            <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Los fines de semana se llenan</h1>
            <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
              La flota es limitada y los sábados y domingos se apartan con días de
              anticipación. Si ya tienes una fecha en mente, avísanos y te la guardamos.
            </p>
            ${tarjetaTour(principal, "Tu recomendación")}
            ${botonPrincipal(urlPrincipal, "Elegir mi ruta y fecha →")}
          `),
        };
      }
      const anticipo = Math.round(principal.precio * 0.3);
      return {
        subject: `No hace falta que pagues todo hoy`,
        html: wrap(`
          <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Aparta tu lugar con el 30 %</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            Sabemos que soltar el monto completo por adelantado para un viaje que
            todavía no haces cuesta. Por eso no hace falta:
          </p>

          <div style="border:1px solid #e3ddc9;background:#f7f4ec;padding:20px;margin:0 0 18px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Hoy pagas</p>
            <p style="margin:0 0 10px;font-size:30px;color:#3a6b1a;font-weight:bold">${mx(anticipo)}</p>
            <p style="margin:0;font-size:14px;color:#666">
              por persona · el resto (${mx(principal.precio - anticipo)}) lo liquidas
              el día del tour, en efectivo o con tarjeta
            </p>
          </div>

          <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 6px">
            Y si al final no puedes ir: <strong>cancelación gratuita hasta 48 horas antes</strong>,
            con reembolso completo y sin preguntas. Si llueve, reprogramamos sin costo.
          </p>
          ${botonPrincipal(urlPrincipal, `Apartar con ${mx(anticipo)} →`)}
        `),
      };
    }

    // ── 4. +7 días: última, y con una persona del otro lado ─────────────────
    case 4:
      return {
        subject: `¿Te ayudamos a decidir?`,
        html: wrap(`
          <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Última de nuestra parte</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            No te vamos a seguir escribiendo. Solo queríamos decirte que si algo no
            te terminó de convencer —las fechas, el precio, si es apto para tu grupo,
            cómo llegar— <strong>hay una persona de este lado</strong> que te contesta
            en menos de una hora.
          </p>

          <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 20px">
            Mucha gente nos escribe con dudas que parecen tontas y no lo son:
            "¿puedo ir sin saber nadar?", "¿mi mamá de 65 aguanta?",
            "¿qué pasa si llueve?". Pregúntanos lo que sea.
          </p>

          <p style="text-align:center;margin:28px 0 8px">
            <a href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, me recomendaron el tour "${nombreCorto}" y tengo una pregunta antes de reservar.`)}"
               style="background:#25D366;color:#ffffff;text-decoration:none;padding:14px 34px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;display:inline-block">
              Escribirle a una persona →
            </a>
          </p>
          <p style="text-align:center;font-size:13px;color:#666;margin:0 0 22px">
            O si prefieres verlo tú:
            <a href="${urlPrincipal}" style="color:#3a6b1a">${nombreCorto}</a>
          </p>
        `),
      };

    // ── 5. +21 días: el único correo que vende el viaje completo ────────────
    // La secuencia terminaba a los 7 días, justo cuando mucha gente todavía no
    // tiene fechas. Y en tres semanas ya suele tenerlas.
    //
    // Este es además el único paso que habla de varios recorridos, que es donde
    // está el dinero de verdad: 21 de las 35 reservas del negocio son de dos o
    // más tours y hacen el 85 % del ingreso.
    case 5: {
      const otro = secundario ?? TOURS_DB.find((t) => t.slug !== principal.slug && !t.precioUnidad);
      return {
        subject: `Los que vienen 3 días hacen esto`,
        html: wrap(`
          <h1 style="font-size:23px;margin:0 0 8px;color:#1a2e1a">Casi nadie viene por un solo día</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 20px">
            De cada diez personas que reservan con nosotros, seis se llevan dos o
            tres recorridos. No por vendérselos: es que la Huasteca no se ve en un
            día y las cascadas quedan lejos unas de otras.
          </p>

          <!-- Aquí iba la promesa de 10 % y 15 % por varios recorridos. Se
               quitó al apagar ese descuento (20 ago 2026): un correo no puede
               ofrecer algo que el carrito ya no aplica. -->
          <div style="border:1px solid #e3ddc9;background:#f7f4ec;padding:18px 20px;margin:0 0 20px">
            <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Si armas tu viaje completo</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#444">
              Un solo traslado, el mismo guía y el mismo grupo: nos organizamos
              una vez y tú aprovechas cada día.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#444">
              Te armamos el itinerario día por día, sin que tengas que cuadrar
              distancias ni horarios.
            </p>
          </div>

          ${tarjetaTour(principal, "Con el que casi todos empiezan")}
          ${otro ? tarjetaTour(otro, "Y el que suelen sumarle") : ""}
          ${botonPrincipal(`${BASE}/reservar`, "Armar mi viaje →")}
          <p style="text-align:center;font-size:13px;color:#666;margin:0">
            Apartas con el 30 %. Cancelación gratuita hasta 48 h antes.
          </p>
        `),
      };
    }

    default:
      return null;
  }
}

/** Horas de espera antes de cada paso, contadas desde la captura del correo. */
export const ESPERA_HORAS: Record<LeadEmailPaso, number> = {
  1: 0,    // inmediato
  2: 24,   // +1 día
  3: 72,   // +3 días
  4: 168,  // +7 días
  5: 504,  // +21 días — el que vende el viaje de varios recorridos
};

/** Pasos que tiene la secuencia. El cron lo usa para saber cuándo termina. */
export const PASOS_SECUENCIA = 5;
