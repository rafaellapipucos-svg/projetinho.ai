import "server-only";
import { logger } from "@/lib/logger";

/**
 * Envio de e-mail transacional via Resend. Gated por credencial: sem
 * RESEND_API_KEY (dev/staging), registra em log em vez de enviar — nada
 * quebra e nenhum e-mail vaza de ambiente de teste.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.info(
      { to: message.to, subject: message.subject },
      "email_skipped_no_credential",
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error({ status: response.status, detail }, "email_send_failed");
    throw new Error("Falha ao enviar e-mail");
  }
}
