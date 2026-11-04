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
const FROM = process.env.EMAIL_FROM || "Clube de Recomendações IC Souza <clube@avisos.icsouzapf.com.br>";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to || !to.includes("@")) return { ok: false, error: "destinatário sem e-mail válido" };
  try {
    // A Resend (v4) não lança exceção quando recusa o envio: devolve { error }.
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("Resend recusou o e-mail:", error);
      return { ok: false, error: error.message || "falha no envio" };
    }
    return { ok: true };
  } catch (err) {
    console.error("Erro ao enviar e-mail via Resend:", err);
    return { ok: false, error: "falha no envio" };
  }
}

// Envia vários e-mails diferentes de uma vez (até 100 por chamada), sem estourar o limite de envios por segundo.
export async function sendEmailBatch(items: { to: string; subject: string; html: string }[]) {
  const valid = items.filter((i) => i.to && i.to.includes("@"));
  const results: { to: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    try {
      const { error } = await getResend().batch.send(
        chunk.map((c) => ({ from: FROM, to: c.to, subject: c.subject, html: c.html }))
      );
      if (error) {
        console.error("Resend recusou o lote:", error);
        chunk.forEach((c) => results.push({ to: c.to, ok: false, error: error.message || "falha no envio" }));
      } else {
        chunk.forEach((c) => results.push({ to: c.to, ok: true }));
      }
    } catch (err) {
      console.error("Erro ao enviar lote via Resend:", err);
      chunk.forEach((c) => results.push({ to: c.to, ok: false, error: "falha no envio" }));
    }
  }
  return results;
}
