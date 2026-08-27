/**
 * Manda TODOS los correos del sistema, con el diseño de marca ya aplicado.
 *
 * Reusa el mismo armado que la vista previa en navegador para no mantener dos
 * listas: si una se queda corta, se nota al instante.
 *
 *   npx tsx src/scripts/previsualizar-todos.ts <correo> [desde]
 */

import { correos } from "./previsualizar-en-navegador";
import { sendBrevoEmail } from "../lib/brevo";

const destino = process.argv[2];
const desde   = Number(process.argv[3] ?? 0);
if (!destino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) {
  console.error("Uso: npx tsx src/scripts/previsualizar-todos.ts <correo> [desde-n]");
  process.exit(1);
}

const cinta = (n: number, nombre: string, subject: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto 16px;border:1px dashed #c4882a;background:#fdf8ec;padding:12px 16px">
    <p style="margin:0 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c4882a">Correo ${n} · rediseñado</p>
    <p style="margin:0 0 2px;font-size:14px;color:#1a2e1a"><strong>${nombre}</strong></p>
    <p style="margin:0;font-size:12px;color:#666">Asunto real: <em>${subject}</em></p>
  </div>`;

async function main() {
  const lista = correos().filter((c) => c.n >= desde);
  console.log(`Mandando ${lista.length} correos a ${destino}…\n`);

  for (const c of lista) {
    // La cinta va DENTRO del <body>: meter un <div> antes del <!DOCTYPE> lo
    // rompe en varios clientes de correo.
    const html = c.html.trimStart().startsWith("<!DOCTYPE")
      ? c.html.replace("<body>", `<body>\n<div style="padding:20px 0">${cinta(c.n, c.nombre, c.subject)}</div>`)
      : cinta(c.n, c.nombre, c.subject) + c.html;

    await sendBrevoEmail({
      to: [{ email: destino }],
      subject: `[${c.n}] ${c.subject}`,
      htmlContent: html,
    });
    console.log(`  ✓ ${String(c.n).padStart(3)}  ${c.nombre}`);
    await new Promise((r) => setTimeout(r, 1300));
  }
  console.log(`\nListo. Revisa ${destino}.`);
}

main().catch((e) => {
  console.error("\n✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
