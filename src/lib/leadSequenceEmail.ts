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
import { CIUDADES_ORIGEN } from "./ciudadesOrigen";
import { temporadaDe, nombreMes } from "./temporada";
import { GRUPO_MAX } from "@/lib/tours";
import {
  BASE, C, WA, bajoBoton, barra, boton, fotoTour, nota, parrafo, shellCorreo, tabla, titulo,
} from "./emailLayout";

const mx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export type LeadEmailPaso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LeadEmailInput {
  paso:            LeadEmailPaso;
  /** Del destinatario, solo para firmar su enlace de baja. */
  email?:          string | null;
  grupo?:          string | null;
  dias?:           string | null;
  origen?:         string | null;
  /** Lo que marcó en el recomendador: "Cascadas turquesas", "Relax total"… */
  intereses?:      string[] | null;
  tourPrincipal?:  string | null;  // slug
  tourSecundario?: string | null;  // slug
}

/**
 * El carrito con los recorridos ya dentro.
 *
 * Acepta varios `agregar`: así el correo del plan por día aterriza en un
 * carrito con el viaje completo armado, no con un tour suelto que la persona
 * tenga que completar a mano acordándose de lo que decía el correo.
 */
const linkCarrito = (...slugs: string[]) =>
  `${BASE}/reservar/carrito?${slugs.map((s) => `agregar=${encodeURIComponent(s)}`).join("&")}`;

/** Atajo: la foto de un tour con su nombre como texto alternativo. */
const foto = (t: Tour, alto = 240) => fotoTour(t.slug, t.nombre, alto);

// ── Piezas reutilizables ────────────────────────────────────────────────────

interface Cabecera { eyebrow: string; h1a: string; h1b?: string; entradilla?: string }

function wrap(cab: Cabecera, contenido: string, footer = true, email?: string | null): string {
  return shellCorreo({
    locale: "es",
    preheader: "Huasteca Potosina · San Luis Potosí · México",
    eyebrow: cab.eyebrow,
    h1a: cab.h1a,
    h1b: cab.h1b,
    entradilla: cab.entradilla,
    cuerpo: contenido,
    pie: footer
      ? `¿Dudas de fechas, clima o cómo combinar los días? Escríbenos por WhatsApp al <a href="https://wa.me/${WA}" style="color:${C.verde};font-weight:500;">+52 489 125 1458</a> — contestamos en menos de 1 hora.`
      : undefined,
    origen: footer ? "Recibes esto porque dejaste tu correo en nuestro sitio." : undefined,
    // Con el enlace real ya no hace falta pedirle que responda "baja" y que
    // alguien lo saque a mano de la lista.
    paraBaja: footer ? (email ?? undefined) : undefined,
  });
}

// ── El plan por día ─────────────────────────────────────────────────────────
//
// El recomendador pregunta cuántos días vienen y solo devuelve DOS tours. Con
// "4 días" la persona contestaba una pregunta que el correo ignoraba: recibía
// las mismas dos tarjetas que quien viene un día. Aquí se arma el viaje
// completo con lo que el formulario ya recogió.

/** "3 días" → 3 · "5 o más días" → 5 · vacío o "1 día" → 1. */
function diasDelViaje(dias?: string | null): number {
  const n = parseInt(String(dias ?? ""), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 5) : 1;
}

/**
 * Cómo se dice en una frase con quién viaja.
 *
 * ⚠️ El código comparaba con `"pareja"` y el formulario manda `"En pareja"`,
 * así que la comparación NUNCA daba y todos caían al respaldo `con ${grupo}`:
 * el correo decía "para tu viaje con En pareja", "con Familia con niños" y
 * "con Solo/Sola". Las llaves son literalmente los textos de `GRUPOS` en
 * `RecommenderShell.tsx`; un valor que no esté ahí no dice nada, que es mejor
 * que decirlo mal.
 */
function conQuienViaja(grupo?: string | null): string {
  const frases: Record<string, string> = {
    "Solo/Sola":         " para tu viaje en solitario",
    "En pareja":         " para tu viaje en pareja",
    "Familia con niños": " para tu viaje en familia",
    "Con amigos":        " para tu viaje con amigos",
  };
  return grupo ? frases[grupo] ?? "" : "";
}

/** Qué recorrido responde a cada interés que marcó en el formulario. */
const CUMPLE_INTERES: Record<string, (t: Tour) => boolean> = {
  "Cascadas turquesas":  (t) => /Cascadas|Acuática/i.test(t.tipo),
  "Aventura extrema":    (t) => t.dificultad === "alta" || /Adrenalina|Extrema|Off-Road/i.test(t.tipo),
  "Arte y cultura":      (t) => /Cultura/i.test(t.tipo),
  "Fotografía perfecta": (t) => /Fotografía/i.test(t.tipo),
  "Relax total":         (t) => /Bienestar/i.test(t.tipo) || t.dificultad === "baja",
};

/**
 * Los recorridos del viaje, en el orden en que se harían.
 *
 * Día 1 es el principal —es el que el recomendador eligió como el que mejor le
 * queda, y esa ES la razón de que vaya primero—. El resto se ordena de más
 * largo a más corto, para que el último día le quede tarde libre antes de
 * volver a casa. El correo dice esto en voz alta: un orden que no se explica
 * parece azar.
 */
function planDelViaje(d: LeadEmailInput, principal: Tour, secundario?: Tour): Tour[] {
  const total = diasDelViaje(d.dias);
  if (total <= 1) return [principal];

  const plan: Tour[] = [principal];
  if (secundario && secundario.slug !== principal.slug) plan.push(secundario);

  const intereses = d.intereses ?? [];
  const familia   = d.grupo === "Familia con niños";

  const candidatos = TOURS_DB
    .filter((t) => !plan.some((p) => p.slug === t.slug))
    // El RZR se queda fuera del relleno: son 2 h y se cobra por vehículo, así
    // que no es "un día" del viaje. Si el recomendador lo eligió, ya entró
    // arriba como principal o secundario.
    .filter((t) => t.precioUnidad !== "vehiculo" && t.duracion_hrs >= 4)
    .map((t) => {
      let punt = 0;
      for (const i of intereses) if (CUMPLE_INTERES[i]?.(t)) punt += 3;
      // Con niños, un recorrido de dificultad alta no se sugiere solo.
      if (familia && t.dificultad === "alta") punt -= 5;
      if (familia && t.dificultad === "baja") punt += 2;
      // Variedad: repetir el mismo tipo de día dos veces se siente a relleno.
      if (plan.some((p) => p.tipo === t.tipo)) punt -= 2;
      return { t, punt };
    })
    .sort((a, b) => b.punt - a.punt || b.t.reviewCount - a.t.reviewCount);

  for (const { t } of candidatos) {
    if (plan.length >= total) break;
    plan.push(t);
  }

  // Día 1 se queda donde está; los demás, del más largo al más corto.
  const [primero, ...resto] = plan;
  resto.sort((a, b) => b.duracion_hrs - a.duracion_hrs);
  return [primero, ...resto];
}

/**
 * Por qué ESE recorrido a ESTA persona. Una frase, sacada de lo que contestó.
 *
 * `usados` evita el efecto plantilla: con dos días de cascadas, ambos decían
 * palabra por palabra «Marcaste "Cascadas turquesas" — este día es justo eso»,
 * y una razón repetida deja de leerse como razón. Cada interés se gasta una
 * sola vez; a partir de ahí el correo cambia de argumento.
 */
function porQueEsteDia(t: Tour, d: LeadEmailInput, dia: number, usados: Set<string>): string {
  // El día 1 no se justifica por el catálogo: es la respuesta del recomendador
  // a lo que ella misma contestó, y eso pesa más que cualquier atributo.
  if (dia === 1) {
    return "Es el que salió de tus respuestas en el recomendador — de todo lo que tenemos, es el que mejor te queda.";
  }

  // Cada razón lleva una llave; la primera cuya llave siga libre es la que sale.
  // Sin esto, un viaje de 4 días con niños repetía la misma frase sobre la
  // dificultad baja dos veces seguidas.
  const candidatas: { llave: string; texto: string }[] = [];

  for (const i of d.intereses ?? []) {
    if (CUMPLE_INTERES[i]?.(t)) candidatas.push({ llave: `interes:${i}`, texto: `Marcaste «${i}» — este día es justo eso.` });
  }
  if (d.grupo === "Familia con niños") {
    candidatas.push(
      t.dificultad === "baja"
        ? { llave: "familia", texto: "Dificultad baja y sin tramos técnicos: los niños lo hacen completo." }
        : { llave: "familia", texto: `Es de dificultad ${t.dificultad}: dinos las edades y te decimos con franqueza si les conviene.` },
    );
  }
  if (t.duracion_hrs <= 6) {
    candidatas.push({ llave: "ligero", texto: `Son ${t.duracion_hrs} h — el día más ligero del viaje, bueno para cerrar sin prisa.` });
  }
  if (d.grupo === "En pareja" && t.groupMax <= GRUPO_MAX) {
    candidatas.push({ llave: "grupo", texto: `Grupos de máximo ${t.groupMax} personas: no es un camión de turistas.` });
  }
  if (t.destinos.length >= 3) {
    candidatas.push({ llave: "paradas", texto: `Son ${t.destinos.length} paradas en un solo día: ${t.destinos.slice(0, 3).join(", ")}.` });
  }
  // El tagline es distinto en cada tour, así que siempre cierra sin repetirse.
  candidatas.push({ llave: `tagline:${t.slug}`, texto: t.tagline });

  const elegida = candidatas.find((c) => !usados.has(c.llave)) ?? candidatas[candidatas.length - 1];
  usados.add(elegida.llave);
  return elegida.texto;
}

/**
 * Cómo llegar, solo cuando de verdad lo sabemos.
 *
 * `CIUDADES_ORIGEN` únicamente tiene CDMX y Monterrey verificados —Querétaro y
 * Guadalajara se dejaron fuera a propósito por no inventar logística—. Desde
 * cualquier otra ciudad este bloque no sale: mejor callar que estimar horas.
 */
function notaDeCamino(origen?: string | null): string {
  if (!origen) return "";
  const o = origen.trim().toLowerCase();
  const ciudad = CIUDADES_ORIGEN.find(
    (c) => o.includes(c.nombre.toLowerCase()) || c.nombreLargo.toLowerCase().includes(o),
  );
  if (!ciudad) return "";

  return `
  <div style="border-left:3px solid #c4882a;background:#faf7ee;padding:14px 16px;margin:0 0 18px">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Viniendo de ${ciudad.nombre}</p>
    <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;line-height:1.8;color:#3a3a2e">
      Te conviene quedarte en <strong>${ciudad.baseRecomendada}</strong>. ${ciudad.razonBase}
    </p>
  </div>`;
}

/** Tarjeta del tour recomendado, con lo que de verdad incluye. */
function tarjetaTour(t: Tour, etiqueta: string): string {
  const incluye = t.incluye.slice(0, 5)
    .map((i) => `<li style="margin:0 0 5px;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:300;line-height:1.65;color:#3a3a2e">${i}</li>`)
    .join("");
  const anticipo = t.precioUnidad === "vehiculo" ? "" : `
    <p style="margin:10px 0 0;font-size:13px;color:#3a6b1a">
      Puedes apartar tu lugar con el 30 % — <strong>${mx(Math.round(t.precio * 0.3))}</strong> hoy
      y el resto el día del tour.
    </p>`;

  return `
  <div style="border:1px solid #d4ccbc;background:#faf7ee;margin:0 0 16px">
    ${foto(t, 200)}
    <div style="padding:18px 20px">
    <p style="margin:0 0 2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">${etiqueta}</p>
    <h2 style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#1a2e1a;font-weight:400">${t.nombre}</h2>
    <p style="margin:0 0 12px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e">${t.descripcion}</p>
    <p style="margin:0 0 12px;font-size:15px;color:#1a2e1a">
      <strong>${mx(t.precio)}</strong>
      <span style="font-size:13px;color:#8a7a5a">${t.precioUnidad === "vehiculo" ? "por vehículo" : "por persona"} · ${t.duracion_hrs} h aprox.</span>
    </p>
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a">Incluye</p>
    <ul style="margin:0;padding-left:18px">${incluye}</ul>
    ${anticipo}
    </div>
  </div>`;
}

/** Un día del plan: foto, qué es, cuánto dura y por qué se lo ponemos a él. */
function tarjetaDia(t: Tour, dia: number, d: LeadEmailInput, usados: Set<string>): string {
  const unidad = t.precioUnidad === "vehiculo" ? "por vehículo" : "por persona";
  return `
  <div style="border:1px solid #d4ccbc;background:#faf7ee;margin:0 0 14px">
    ${foto(t, 190)}
    <div style="padding:16px 18px">
      <p style="margin:0 0 3px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
        Día ${dia} · ${t.tipo}
      </p>
      <h2 style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:21px;color:#1a2e1a;font-weight:400">${t.nombre}</h2>
      <p style="margin:0 0 10px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:#3a3a2e">${t.descripcion}</p>
      <p style="margin:0 0 10px;font-size:14px;color:#1a2e1a">
        <strong>${mx(t.precio)}</strong>
        <span style="font-size:13px;color:#8a7a5a">${unidad} · ${t.duracion_hrs} h · dificultad ${t.dificultad}</span>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#3a6b1a;border-top:1px solid #d4ccbc;padding-top:11px">
        <strong style="color:#1a2e1a">Por qué a ti:</strong> ${porQueEsteDia(t, d, dia, usados)}
      </p>
    </div>
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
  const conQuien     = conQuienViaja(d.grupo);

  switch (d.paso) {
    // ── 1. Inmediato: le entregamos lo que pidió. No vende. ──────────────────
    //
    // Con 2 días o más deja de ser "aquí tienes un tour" y pasa a ser el viaje
    // día por día. El formulario ya preguntó cuántos días, con quién viaja y
    // qué le emociona: hasta ahora nada de eso salía del cuestionario.
    case 1: {
      const totalDias = diasDelViaje(d.dias);

      if (totalDias <= 1) {
        return {
          subject: `Tu recomendación: ${nombreCorto}`,
          html: wrap({
            eyebrow: "Tu recomendación",
            h1a: "Esto es lo que",
            h1b: "te recomendamos",
            entradilla: `Con lo que nos contaste${conQuien}, este es el recorrido que mejor te queda. Te lo dejamos por escrito para que lo revises con calma — sin prisa y sin compromiso.`,
          }, `
            ${tarjetaTour(principal, "Tu mejor opción")}
            ${secundario ? tarjetaTour(secundario, "Y si prefieres otra cosa") : ""}
            ${boton(linkCarrito(principal.slug), "Apartar este día →")}
            <p style="text-align:center;font-size:13px;color:#8a7a5a;margin:0">
              Cancelación gratuita hasta 48 h antes. Sin preguntas.
            </p>
          `, true, d.email),
        };
      }

      const plan  = planDelViaje(d, principal, secundario);
      const total = plan.reduce((s, t) => s + t.precio, 0);
      // Un solo `usados` para todo el correo: así ningún interés se usa dos
      // veces como razón y cada día argumenta algo distinto.
      const usados = new Set<string>();
      const dias  = plan.map((t, i) => tarjetaDia(t, i + 1, d, usados)).join("");
      // Entrecomillado a propósito: los intereses son etiquetas del formulario
      // ("Cascadas turquesas", "Relax total") y meterlas dentro de una frase
      // suelta obliga a concordar género y número con cada una. Citadas se leen
      // como lo que son —lo que ella marcó— y ninguna combinación queda coja.
      const gustos = (d.intereses ?? []).length
        ? ` y que marcaste ${(d.intereses as string[]).map((i) => `«${i}»`).join(" y ")}`
        : "";

      return {
        subject: `Tu plan de ${plan.length} días en la Huasteca`,
        html: wrap({
          eyebrow: "Tu plan de viaje",
          h1a: `Tus ${plan.length} días,`,
          h1b: "día por día",
          entradilla: `Nos dijiste que vienes ${d.dias}${conQuien}${gustos}. Así lo armaríamos nosotros.`,
        }, `

          <div style="border:1px solid #d4ccbc;padding:14px 16px;margin:0 0 20px">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#8a7a5a">
              <strong style="color:#1a2e1a">El orden no es al azar.</strong>
              El día 1 es el recorrido que mejor te queda, para que si algo se atraviesa
              ya lo hayas hecho. Los demás van del más largo al más corto, así el último
              día te queda tarde libre antes de volver.
            </p>
          </div>

          ${notaDeCamino(d.origen)}
          ${dias}

          <div style="border:1px solid #d4ccbc;background:#faf7ee;padding:18px 20px;margin:0 0 4px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Los ${plan.length} días juntos</p>
            <p style="margin:0 0 8px;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;color:#1a2e1a;font-weight:500">${mx(total)}</p>
            <p style="margin:0;font-size:13px;color:#8a7a5a">
              por persona · apartas hoy con ${mx(Math.round(total * 0.3))} y liquidas el resto allá
            </p>
          </div>

          ${boton(linkCarrito(...plan.map((t) => t.slug)), "Abrir mi plan en el carrito →")}
          <p style="text-align:center;font-size:13px;color:#8a7a5a;margin:0">
            Se abre con los ${plan.length} días ya cargados. Puedes quitar los que no quieras
            y elegir fechas — no se aparta nada hasta que tú confirmes.
          </p>
        `, true, d.email),
      };
    }

    // ── 2. +1 día: por qué ESE tour, y cómo funciona el día ─────────────────
    case 2: {
      const paradas = principal.destinos.slice(0, 4)
        .map((x) => `<li style="margin:0 0 5px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.65;color:#3a3a2e">${x}</li>`)
        .join("");
      return {
        subject: `Cómo es un día en ${nombreCorto}`,
        html: wrap({
          eyebrow: "Tu recorrido, paso a paso",
          h1a: "Cómo se ve",
          h1b: "tu día",
          entradilla: `Para que no te quede duda de qué estás reservando, así funciona ${nombreCorto} de principio a fin.`,
        }, `

          <div style="border:1px solid #d4ccbc;background:#faf7ee;margin:0 0 16px">
            ${foto(principal, 200)}
            <div style="padding:18px 20px">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">El recorrido</p>
            <ul style="margin:0 0 14px;padding-left:18px">${paradas}</ul>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#8a7a5a;border-top:1px solid #d4ccbc;padding-top:12px">
              <strong style="color:#1a2e1a">Pasamos por ti</strong> a tu hospedaje en Xilitla o
              Ciudad Valles entre las 8:00 y 9:00 AM, y te regresamos entre 6:00 y 7:00 PM.
              No necesitas hospedarte con nosotros ni tener coche.
            </p>
            </div>
          </div>

          <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e;margin:0 0 4px">
            Grupos de máximo ${principal.groupMax} personas, guía certificado NOM-09 SECTUR y
            ${principal.reviewCount} reseñas de gente que ya lo hizo.
          </p>
          ${boton(urlPrincipal, "Ver fechas disponibles →")}
        `, true, d.email),
      };
    }

    // ── 3. +3 días: la objeción real es el monto, no el precio ──────────────
    case 3: {
      if (principal.precioUnidad === "vehiculo") {
        return {
          subject: `¿Apartamos tu ${nombreCorto}?`,
          html: wrap({
            eyebrow: "Disponibilidad",
            h1a: "Los fines de semana",
            h1b: "se llenan",
            entradilla: "La flota es limitada y los sábados y domingos se apartan con días de anticipación. Si ya tienes una fecha en mente, avísanos y te la guardamos.",
          }, `
            ${tarjetaTour(principal, "Tu recomendación")}
            ${boton(linkCarrito(principal.slug), "Elegir mi ruta y fecha →")}
          `, true, d.email),
        };
      }
      const anticipo = Math.round(principal.precio * 0.3);
      return {
        // El asunto nombra el recorrido. "No hace falta que pagues todo hoy" no
        // decía de QUÉ hablaba: a los tres días de haber pedido una
        // recomendación, la persona ya no se acuerda de que fuimos nosotros.
        subject: `Aparta tu ${nombreCorto} con ${mx(anticipo)}`,
        html: wrap({
          eyebrow: "Sin pagar todo hoy",
          h1a: "Aparta tu lugar",
          h1b: "con el 30 %",
          entradilla: `Hablamos de ${nombreCorto}, el recorrido que te recomendamos. Sabemos que soltar el monto completo por adelantado para un viaje que todavía no haces cuesta. Por eso no hace falta.`,
        }, `
          ${foto(principal, 200)}
          <div style="height:18px"></div>

          <div style="border:1px solid #d4ccbc;background:#faf7ee;padding:20px;margin:0 0 18px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Hoy pagas</p>
            <p style="margin:0 0 10px;font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;color:#3a6b1a;font-weight:500">${mx(anticipo)}</p>
            <p style="margin:0;font-size:14px;color:#8a7a5a">
              por persona · el resto (${mx(principal.precio - anticipo)}) lo liquidas
              el día del tour, en efectivo o con tarjeta
            </p>
          </div>

          <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e;margin:0 0 6px">
            Y si al final no puedes ir: <strong>cancelación gratuita hasta 48 horas antes</strong>,
            con reembolso completo y sin preguntas. Si llueve, reprogramamos sin costo.
          </p>
          ${boton(linkCarrito(principal.slug), `Apartar mi ${nombreCorto} →`)}
          <p style="text-align:center;font-size:13px;color:#8a7a5a;margin:0">
            El botón abre el carrito con ${nombreCorto} ya dentro — solo eliges fecha y cuántos van.
          </p>
        `, true, d.email),
      };
    }

    // ── 4. +7 días: última, y con una persona del otro lado ─────────────────
    case 4:
      return {
        subject: `¿Te ayudamos a decidir?`,
        html: wrap({
          eyebrow: "Sin más correos",
          h1a: "Última de",
          h1b: "nuestra parte",
          entradilla: "No te vamos a seguir escribiendo. Solo queríamos decirte que si algo no te terminó de convencer —las fechas, el precio, si es apto para tu grupo, cómo llegar— hay una persona de este lado que te contesta en menos de una hora.",
        }, `

          <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e;margin:0 0 20px">
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
          <p style="text-align:center;font-size:13px;color:#8a7a5a;margin:0 0 22px">
            O si prefieres verlo tú:
            <a href="${urlPrincipal}" style="color:#3a6b1a">${nombreCorto}</a>
          </p>
        `, true, d.email),
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
        html: wrap({
          eyebrow: "El viaje completo",
          h1a: "Casi nadie viene",
          h1b: "por un solo día",
          entradilla: "De cada diez personas que reservan con nosotros, seis se llevan dos o tres recorridos. No por vendérselos: es que la Huasteca no se ve en un día y las cascadas quedan lejos unas de otras.",
        }, `

          <!-- Aquí iba la promesa de 10 % y 15 % por varios recorridos. Se
               quitó al apagar ese descuento (20 ago 2026): un correo no puede
               ofrecer algo que el carrito ya no aplica. -->
          <div style="border:1px solid #d4ccbc;background:#faf7ee;padding:18px 20px;margin:0 0 20px">
            <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Si armas tu viaje completo</p>
            <p style="margin:0 0 6px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e">
              Un solo traslado, el mismo guía y el mismo grupo: nos organizamos
              una vez y tú aprovechas cada día.
            </p>
            <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:#3a3a2e">
              Te armamos el itinerario día por día, sin que tengas que cuadrar
              distancias ni horarios.
            </p>
          </div>

          ${tarjetaTour(principal, "Con el que casi todos empiezan")}
          ${otro ? tarjetaTour(otro, "Y el que suelen sumarle") : ""}
          ${boton(`${BASE}/reservar`, "Armar mi viaje →")}
          <p style="text-align:center;font-size:13px;color:#8a7a5a;margin:0">
            Apartas con el 30 %. Cancelación gratuita hasta 48 h antes.
          </p>
        `, true, d.email),
      };
    }

    // ── 6. +35 días: la temporada, que es la única urgencia honesta ─────────
    //
    // La secuencia moría a los 21 días. Mucha gente pide una recomendación en
    // enero para un viaje de Semana Santa: a los 21 días todavía no tiene
    // fechas, y a los 35 ya suele estar mirando el calendario.
    //
    // No inventa escasez: la ventana de agua turquesa es un hecho del clima, no
    // un "quedan 3 lugares".
    case 6: {
      const t = temporadaDe();
      return {
        subject: `${t.nombre} en la Huasteca`,
        html: wrap({
          eyebrow: `${nombreMes()} en la Huasteca`,
          h1a: t.nombre.split(",")[0],
          h1b: t.nombre.includes(",") ? t.nombre.split(",").slice(1).join(",").trim() : undefined,
          entradilla: t.gancho,
        }, `
          ${nota(`<strong style="color:${C.oscuro};">Lo que no te va a decir un folleto:</strong> ${t.matiz}`, C.texto, "0")}
          ${barra("Sigue en pie tu recomendación")}
          ${tarjetaTour(principal, "El que te tocó")}
          ${boton(linkCarrito(principal.slug), "Ver fechas y apartar")}
          ${bajoBoton("Apartas con el 30 %. Cancelación gratuita hasta 48 h antes.")}
        `, true, d.email),
      };
    }

    // ── 7. +60 días: la última, y la que de verdad cierra la puerta ─────────
    //
    // Dos meses después, o ya viajó con otro o el viaje se le quedó en la
    // cabeza sin fecha. A esta altura no sirve insistir con el mismo tour:
    // sirve preguntar y ofrecer armarlo a la medida.
    case 7:
      return {
        subject: `¿Sigue en pie tu viaje a la Huasteca?`,
        html: wrap({
          eyebrow: "Dos meses después",
          h1a: "¿Sigue en pie",
          h1b: "tu viaje?",
          entradilla: "Han pasado un par de meses desde que nos escribiste. O ya viniste —y entonces ojalá te haya encantado— o el viaje sigue ahí, sin fecha.",
        }, `
          ${parrafo("Si es lo segundo, no te vamos a mandar otro correo con el mismo tour. Lo que sí podemos hacer es armarte el viaje completo alrededor de las fechas que <em>sí</em> puedes: qué recorridos entran en esos días, dónde dormir y cuánto sale todo junto.")}
          ${parrafo("Dinos cuándo podrías y nosotros ponemos el resto.")}
          ${boton(`https://wa.me/${WA}?text=${encodeURIComponent("Hola, les escribí hace un par de meses por un viaje a la Huasteca. Me gustaría ver fechas.")}`, "Decirnos mis fechas", "whatsapp")}
          ${bajoBoton("Contestamos en menos de una hora. Si prefieres, respóndele a este correo.")}
          ${nota("Después de este dejamos de escribirte sobre tu recomendación. Si quieres seguir sabiendo de la Huasteca —artículos, temporada y consejos— no hagas nada: te llega un resumen al mes y te puedes salir cuando quieras.", C.tenue, "30px 0 0 0")}
        `, true, d.email),
      };

    default:
      return null;
  }
}

/** Horas de espera antes de cada paso, contadas desde la captura del correo. */
export const ESPERA_HORAS: Record<LeadEmailPaso, number> = {
  1: 0,     // inmediato
  2: 24,    // +1 día
  3: 72,    // +3 días
  4: 168,   // +7 días
  5: 504,   // +21 días — el que vende el viaje de varios recorridos
  6: 840,   // +35 días — la temporada
  7: 1440,  // +60 días — la última, y abre el boletín mensual
};

/** Pasos que tiene la secuencia. El cron lo usa para saber cuándo termina. */
export const PASOS_SECUENCIA = 7;
