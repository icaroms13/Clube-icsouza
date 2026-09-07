import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Faltou definir RESEND_API_KEY no .env");
    resendClient = new Resend(key);
  }
  return resendClient;
}

// Endereço "de" usado em todo envio. Precisa ser de um domínio verificado na Resend
// (ver README.md, seção "Configurando o domínio de e-mail").
const FROM = process.env.EMAIL_FROM || "Clube de Recomendações IC Souza <clube@avisos.icsouza.com.br>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to || !to.includes("@")) return { ok: false, error: "destinatário sem e-mail válido" };
  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error("Erro ao enviar e-mail via Resend:", err);
    return { ok: false, error: "falha no envio" };
  }
}
