import nodemailer from "nodemailer";
import type { EmailConfig, MessageResult, ProviderTestResult } from "../../types";

/** Server-only: uses raw SMTP sockets via nodemailer, never import from client components. */
function buildTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.serveurSmtp,
    port: config.port,
    secure: config.securite === "ssl",
    requireTLS: config.securite === "tls",
    auth: { user: config.utilisateur, pass: config.motDePasse },
  });
}

export async function testSmtpConnection(config: EmailConfig): Promise<ProviderTestResult> {
  try {
    const transporter = buildTransport(config);
    await transporter.verify();
    return { success: true, message: "Connexion SMTP établie avec succès." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Échec de connexion SMTP." };
  }
}

export async function sendSmtpEmail(
  config: EmailConfig,
  to: string,
  subject: string,
  body: string,
): Promise<MessageResult> {
  try {
    const transporter = buildTransport(config);
    const signedText = config.signature ? `${body}\n\n${config.signature}` : body;
    const html = signedText.replace(/\n/g, "<br>");

    const info = await transporter.sendMail({
      from: `"${config.expediteur}" <${config.adresseEmail}>`,
      to,
      replyTo: config.adresseReponse || undefined,
      subject,
      text: signedText,
      html,
    });

    return { success: true, messageId: info.messageId, timestamp: new Date() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Échec d'envoi de l'e-mail.",
      timestamp: new Date(),
    };
  }
}
