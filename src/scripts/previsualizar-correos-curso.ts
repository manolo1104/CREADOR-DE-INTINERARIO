/**
 * Manda a una bandeja TODOS los correos que puede recibir alguien del funnel
 * del curso, generados con el MISMO código que corre en producción.
 *
 * No es una maqueta: importa `CORREOS_PROSPECTO` y `CORREOS_ALUMNO` tal cual,
 * así que lo que llega a la bandeja es exactamente lo que le llega a un
 * cliente. Si algo se ve mal aquí, se ve mal allá.
 *
 * No toca la base de datos: el lead es un objeto en memoria. Se puede correr
 * sin haber desplegado nada.
 *
 *   npx tsx src/scripts/previsualizar-correos-curso.ts <correo-destino>
 *   npx tsx src/scripts/previsualizar-correos-curso.ts <correo> --listar
 */

import type { CursoLead } from "@prisma/client";
import { cargarEnv } from "./_env";
import { CORREOS_ALUMNO, CORREOS_PROSPECTO, REMITENTE_CURSO } from "../lib/cursoEmail";
import { sendBrevoEmail } from "../lib/brevo";

cargarEnv();

const destino = process.argv[2];
const soloListar = process.argv.includes("--listar");

if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-correos-curso.ts <correo> [--listar]");
  process.exit(1);
}

/**
 * Un lead de mentira pero con datos REALES de forma: si aquí se inventaran
 * etiquetas que el formulario nunca produce, la vista previa se vería mejor
 * que el correo de verdad y no serviría para revisar nada.
 */
const LEAD: CursoLead = {
  id: "vista-previa",
  email: destino,
  nombre: "Manolo",
  whatsapp: "4891251458",
  tipoNegocio: "Agencia",
  ciudad: "Ciudad Valles",
  origen: "webinar",
  webinar: true,
  correosEnviados: [],
  checkoutIniciadoAt: new Date("2026-09-11T20:00:00-06:00"),
  compro: false,
  comproAt: null,
  montoMxn: null,
  stripeSessionId: null,
  status: "activo",
  createdAt: new Date("2026-09-02T10:00:00-06:00"),
  updatedAt: new Date("2026-09-02T10:00:00-06:00"),
};

/** Cuándo tendría sentido cada bloque, para la cinta de contexto. */
const CUANDO: Record<string, string> = {
  A1: "al dejar su correo en /curso",
  A2: "+1 día", A3: "+2 días", A4: "+3 días", A5: "+4 días",
  A6: "11 sep, 6 pm · mañana sube el precio",
  A7: "12 sep, 6 pm · últimas 6 horas",
  B1: "1 h después de dejar el pago a medias",
  B2: "24 h después", B3: "48 h después",
  W1: "al registrarse al taller · las 3 tareas",
  W2: "8 sep, 9 am · noche 1",
  W3: "8 sep, 6:30 pm · en 30 minutos",
  W4: "9 sep, 9 am · grabación de la noche 1",
  W5: "9 sep, 6:30 pm · noche 2",
  W6: "10 sep, 9 am · grabación de la noche 2",
  W7: "10 sep, 6:30 pm · última noche",
  D1: "10 sep, 10 pm · al salir de la noche 3",
  D2: "11 sep, 9 am · ¿qué te detiene?",
  D3: "13 sep, 12 pm · cierra hoy",
  D4: "14 sep, 10 am · gracias, y qué sigue",
};

const cuandoDe = (id: string) =>
  CUANDO[id] ?? (id.startsWith("C") ? "ya es alumno" : "según su avance");

const bloqueDe = (id: string) =>
  id.startsWith("A") ? "Dejó su correo en la página del curso"
  : id.startsWith("W") ? "Se registró al taller gratuito"
  : id.startsWith("B") ? "Empezó a pagar y no terminó"
  : id.startsWith("D") ? "No compró: cierre de inscripciones"
  : "Ya pagó: bienvenida y curso";

/**
 * La cinta de contexto va DENTRO del <body>. Un <div> antes del <!DOCTYPE>
 * rompe el correo en varios clientes.
 */
function conCinta(html: string, n: number, total: number, id: string, subject: string): string {
  const cinta = `
<div style="margin:0;padding:14px 18px;background:#07090C;border-bottom:2px dashed #3B8CFF;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;color:#9FB0C6;">
  <div style="color:#63A6FF;font-weight:700;letter-spacing:.08em;">VISTA PREVIA ${n} DE ${total} &middot; ${id}</div>
  <div style="margin-top:4px;color:#F2F6FC;">${subject}</div>
  <div style="margin-top:2px;">Cuándo sale: ${cuandoDe(id)}</div>
  <div style="margin-top:2px;">Le llega a: ${bloqueDe(id)}</div>
</div>`;

  const i = html.search(/<body[^>]*>/i);
  if (i >= 0) {
    const fin = html.indexOf(">", i) + 1;
    return html.slice(0, fin) + cinta + html.slice(fin);
  }
  return cinta + html; // fragmento sin documento completo
}

async function main() {
  const ahora = new Date("2026-09-11T09:00:00-06:00"); // a mitad de campaña
  const cx = { lead: LEAD, ahora, pagados: 7 };

  // El orden en el que los VIVE una persona, no el orden del archivo.
  const orden = [
    ...CORREOS_PROSPECTO.filter((c) => c.id.startsWith("W")),
    ...CORREOS_PROSPECTO.filter((c) => c.id.startsWith("A")),
    ...CORREOS_PROSPECTO.filter((c) => c.id.startsWith("B")),
    ...CORREOS_PROSPECTO.filter((c) => c.id.startsWith("D")),
    ...CORREOS_ALUMNO,
  ];

  const piezas = orden.map((c) => {
    const { subject, html } = c.build(cx);
    return { id: c.id, subject, html };
  });

  console.log(`\n${piezas.length} correos que puede recibir una persona:\n`);
  piezas.forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${p.id.padEnd(4)} ${p.subject}`);
    console.log(`      ${cuandoDe(p.id)}`);
  });

  if (soloListar) {
    console.log("\n(--listar: no se mandó ninguno)\n");
    return;
  }

  console.log(`\nMandando a ${destino}...\n`);
  let bien = 0;
  for (let i = 0; i < piezas.length; i++) {
    const p = piezas[i];
    const n = i + 1;
    try {
      await sendBrevoEmail({
        to: [{ email: destino, name: "Manolo" }],
        subject: `[${String(n).padStart(2, "0")}/${piezas.length}] ${p.subject}`,
        htmlContent: conCinta(p.html, n, piezas.length, p.id, p.subject),
        senderName: REMITENTE_CURSO,
      });
      bien++;
      console.log(`  ✓ ${String(n).padStart(2)} ${p.id}`);
    } catch (e) {
      console.error(`  ✗ ${String(n).padStart(2)} ${p.id}: ${e instanceof Error ? e.message : e}`);
    }
    // Brevo aguanta más, pero de golpe Gmail agrupa y esconde la mitad.
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`\n${bien} de ${piezas.length} enviados.\n`);
}

// Guarda: si otro script importa este, que no salga disparado su main().
if (process.argv[1]?.includes("previsualizar-correos-curso")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
