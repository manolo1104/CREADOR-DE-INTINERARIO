/**
 * Manda a una bandeja los 7 correos que recibe alguien que deja su correo en el
 * sitio, generados con el MISMO código que corre en producción.
 *
 * No es una maqueta: importa `buildItinerarioEmailHtml` y `buildLeadSequenceEmail`
 * tal cual, así que lo que llega a la bandeja es exactamente lo que llega a un
 * cliente. Si algo se ve mal aquí, se ve mal allá.
 *
 *   npx tsx src/scripts/previsualizar-correos-leads.ts <correo-destino>
 */

import { buildItinerarioEmailHtml } from "../lib/itinerarioEmail";
import { buildLeadSequenceEmail, type LeadEmailInput } from "../lib/leadSequenceEmail";
import { sendBrevoEmail } from "../lib/brevo";

const destino = process.argv[2];
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-leads.ts <correo>");
  process.exit(1);
}

// El contexto de un lead real, con los MISMOS valores que escribe el
// recomendador: los textos de `GRUPOS`, `DIAS_OPCIONES`, `INTERESES` y
// `CIUDADES_POPULARES` de RecommenderShell.tsx. Si aquí se inventaran etiquetas
// ("pareja" en vez de "En pareja"), la vista previa se vería mejor que el
// correo real y no serviría para revisar nada.
const CTX: Omit<LeadEmailInput, "paso"> = {
  grupo:          "En pareja",
  dias:           "3 días",
  origen:         "Ciudad de México",
  intereses:      ["Cascadas turquesas", "Fotografía perfecta"],
  tourPrincipal:  "expedicion-tamul",
  tourSecundario: "ruta-acuatica-puente-de-dios",
};

type Pieza = { n: number; etiqueta: string; subject: string; html: string };

function armar(): Pieza[] {
  const piezas: Pieza[] = [];

  // 1 · El itinerario de 3 días (blog y páginas de destino).
  const itin = buildItinerarioEmailHtml();
  piezas.push({ n: 1, etiqueta: "Itinerario de 3 días · al momento", ...itin });

  // 2 a 4 · Pasos 1, 2 y 3 de la secuencia, con Tamul.
  const pasos: { paso: 1 | 2 | 3 | 4 | 5; etiqueta: string }[] = [
    { paso: 1, etiqueta: "Tu plan por día · al momento" },
    { paso: 2, etiqueta: "Cómo se ve tu día · +24 h" },
    { paso: 3, etiqueta: "Aparta con el 30 % · +3 días" },
  ];
  for (const { paso, etiqueta } of pasos) {
    const c = buildLeadSequenceEmail({ paso, ...CTX });
    if (!c) throw new Error(`El paso ${paso} volvió vacío`);
    piezas.push({ n: piezas.length + 1, etiqueta, subject: c.subject, html: c.html });
  }

  // 5 · La otra cara del paso 3: cuando el tour se cobra por vehículo (el RZR).
  // Es el único de los siete que NO puede ir con Tamul — cambia justo porque el
  // cobro no es por persona y el argumento del 30 % no aplica.
  const rzr = buildLeadSequenceEmail({ ...CTX, paso: 3, tourPrincipal: "rzr-xilitla", tourSecundario: null });
  if (!rzr) throw new Error("El paso 3 en versión RZR volvió vacío");
  piezas.push({ n: 5, etiqueta: "Aparta con el 30 %, versión RZR · +3 días", ...rzr });

  // 6 y 7 · Los dos últimos pasos, otra vez con Tamul.
  for (const { paso, etiqueta } of [
    { paso: 4 as const, etiqueta: "¿Te ayudamos a decidir? · +7 días" },
    { paso: 5 as const, etiqueta: "Los que vienen 3 días · +21 días" },
  ]) {
    const c = buildLeadSequenceEmail({ paso, ...CTX });
    if (!c) throw new Error(`El paso ${paso} volvió vacío`);
    piezas.push({ n: piezas.length + 1, etiqueta, subject: c.subject, html: c.html });
  }

  return piezas;
}

/**
 * Una cinta arriba del correo que dice cuál de los siete es y cuándo saldría.
 * Va FUERA del HTML original —pegada antes— para no tocar ni un pixel de lo que
 * recibiría el cliente.
 */
function conCinta(p: Pieza, total: number): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto 18px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
    <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">
      Vista previa ${p.n} de ${total} · no es un correo real
    </p>
    <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${p.etiqueta}</strong></p>
    <p style="margin:0;font-size:12px;color:#666">
      Asunto real: <em>${p.subject}</em>
    </p>
  </div>
  ${p.html}`;
}

async function main() {
  const piezas = armar();
  console.log(`Mandando ${piezas.length} correos a ${destino}…\n`);

  for (const p of piezas) {
    // En serie y con pausa: siete envíos de golpe al mismo buzón es justo el
    // patrón que Gmail agrupa o manda a promociones.
    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${p.n}/${piezas.length}] ${p.subject}`,
      htmlContent: conCinta(p, piezas.length),
    });
    console.log(`  ✓ ${p.n}/${piezas.length}  ${p.etiqueta}`);
    console.log(`      ${p.subject}`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
