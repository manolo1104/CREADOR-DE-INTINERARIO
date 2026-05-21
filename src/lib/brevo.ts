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
  senderName?: string;
  senderEmail?: string;
  attachments?: BrevoAttachment[];
}

export async function sendBrevoEmail(params: BrevoEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY no configurada");

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
      to: params.to,
      ...(params.bcc?.length ? { bcc: params.bcc } : {}),
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.attachments?.length ? { attachment: params.attachments } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }

  return res.json();
}
