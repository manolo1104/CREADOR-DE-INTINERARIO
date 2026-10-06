interface BrevoRecipient {
  email: string;
  name?: string;
}

interface BrevoAttachment {
  name: string;
  content: string; // base64
}

interface BrevoEmailParams {
  to: BrevoRecipient[];
  bcc?: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  /** Versión de texto plano. Cuando va, Gmail y los clientes sin HTML muestran
   *  ESTO en vez de una traducción automática del HTML. */
  textContent?: string;
  senderName?: string;
  senderEmail?: string;
  attachments?: BrevoAttachment[];
}

/**
 * Los buzones del equipo, leídos de `ADMIN_EMAIL_TOURS` como lista separada
 * por comas (oct 2026: el gmail de Manolo y `the.huasteca.potosina@gmail.com`,
 * el que trae el celular del equipo). Vacía si la variable no está.
 */
export function correosEquipo(): BrevoRecipient[] {
  return partirCorreos(process.env.ADMIN_EMAIL_TOURS ?? "").map((email) => ({ email }));
}

function partirCorreos(texto: string): string[] {
  return texto.split(",").map((c) => c.trim()).filter(Boolean);
}

/**
 * Parte los correos que traen comas y quita repetidos.
 *
 * Los envíos al equipo arman `[{ email: process.env.ADMIN_EMAIL_TOURS }]` en
 * trece sitios distintos. Con la variable en «a@x,b@y» Brevo rechazaría el
 * envío entero —también el correo al cliente cuando el equipo va en copia
 * oculta—, así que la lista se reparte aquí y ninguno de esos sitios cambia.
 */
function normalizar(lista: BrevoRecipient[] | undefined, yaVan: Set<string>): BrevoRecipient[] {
  const fuera: BrevoRecipient[] = [];
  for (const r of lista ?? []) {
    for (const email of partirCorreos(r.email)) {
      const clave = email.toLowerCase();
      if (yaVan.has(clave)) continue;
      yaVan.add(clave);
      fuera.push(r.name ? { email, name: r.name } : { email });
    }
  }
  return fuera;
}

export async function sendBrevoEmail(params: BrevoEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY no configurada");

  // Un mismo buzón en `to` y en `bcc` (el cliente que es del equipo) va solo en `to`.
  const yaVan = new Set<string>();
  const to = normalizar(params.to, yaVan);
  const bcc = normalizar(params.bcc, yaVan);

  const senderEmail =
    params.senderEmail ||
    process.env.BREVO_FROM_EMAIL ||
    "tours@huasteca-potosina.com";
  const senderName =
    params.senderName ||
    process.env.BREVO_FROM_NAME ||
    "Tours Huasteca Potosina";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to,
      ...(bcc.length ? { bcc } : {}),
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.textContent ? { textContent: params.textContent } : {}),
      ...(params.attachments?.length ? { attachment: params.attachments } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }

  return res.json();
}
