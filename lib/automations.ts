import { sendEmail, sendEmailBatch } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "icaromsouza13@gmail.com";

function portalUrl() {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

function wrap(title: string, bodyHtml: string) {
  const url = portalUrl();
  const button = url
    ? `<p style="text-align:center;margin:26px 0 4px;"><a href="${url}" style="display:inline-block;background:#c8a24d;color:#0b0b0c;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;">Acessar o portal</a></p>`
    : "";
  return `
  <div style="font-family:Georgia,serif;background:#0b0b0c;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#151513;border:1px solid rgba(200,162,77,.35);border-radius:14px;padding:28px;">
      <p style="color:#c8a24d;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">IC Souza</p>
      <h1 style="color:#f2ede1;font-size:22px;margin:0 0 16px;">${title}</h1>
      <div style="color:#cfc9bb;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">${bodyHtml}</div>
      ${button}
      <p style="color:#8a8478;font-size:11px;margin-top:24px;">Clube de Recomendações IC Souza</p>
    </div>
  </div>`;
}

// ---------- Notificações para o admin (sempre ativas, não passam pelos toggles) ----------

export async function notifyAdminNewRecommendation(clientCpf: string, name: string, phone: string) {
  const html = wrap(
    "Nova recomendação cadastrada",
    `O cliente <b>${clientCpf}</b> recomendou <b>${name}</b> (${phone}). Entre no painel admin para agendar a reunião.`
  );
  await sendEmail(ADMIN_EMAIL, "Nova recomendação recebida", html);
}

export async function notifyAdminNewRedemption(clientCpf: string, itemName: string, points: number) {
  const html = wrap(
    "Novo pedido de resgate",
    `O cliente <b>${clientCpf}</b> solicitou o resgate de <b>${itemName}</b> (${points} pontos). Combine a entrega em até 5 dias corridos.`
  );
  await sendEmail(ADMIN_EMAIL, "Novo resgate solicitado", html);
}

export async function notifyAdminNewClient(clientCpf: string, clientEmail: string | null) {
  const html = wrap(
    "Novo cliente ativou o acesso",
    `O cliente <b>${clientCpf}</b> (${clientEmail || "sem e-mail"}) acabou de criar a senha e entrou no Clube pela primeira vez.`
  );
  await sendEmail(ADMIN_EMAIL, "Novo cliente ativou o acesso ao Clube", html);
}

// ---------- Convite de boas-vindas (disparado quando o admin cadastra o cliente) ----------

export function inviteSubject() {
  return "Seu acesso ao Clube de Recomendações IC Souza está liberado";
}

export function inviteHtml(name: string | null) {
  const url = portalUrl();
  const first = (name ?? "").trim().split(/\s+/)[0];
  const hello = first ? `Olá, <b>${first}</b>!` : "Olá!";
  const step = (n: number, text: string) =>
    `<tr><td valign="top" style="padding:6px 12px 6px 0;color:#c8a24d;font-weight:bold;font-size:15px;">${n}</td><td style="padding:6px 0;color:#cfc9bb;font-size:14px;line-height:1.6;">${text}</td></tr>`;
  const link = url ? ` <span style="color:#8a8478;">(${url})</span>` : "";
  const body = `
    <p style="margin:0 0 14px;">${hello} Seu acesso ao <b>Clube de Recomendações IC Souza</b> está liberado. Veja como entrar:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      ${step(1, `Toque no botão <b>Acessar o portal</b> abaixo${link}.`)}
      ${step(2, "Digite o seu <b>CPF</b> (somente os números).")}
      ${step(3, "No primeiro acesso, <b>crie uma senha</b> (mínimo de 6 caracteres) e informe o seu <b>e-mail</b>.")}
      ${step(4, "Leia as regras do Clube e toque em <b>“Li, estou de acordo”</b>. Isso só é pedido na primeira vez.")}
      ${step(5, "Pronto! Faça a sua primeira <b>recomendação</b>: informe o nome e o telefone de quem você quer apresentar.")}
    </table>
    <p style="margin:0 0 6px;"><b>Como você ganha pontos</b></p>
    <p style="margin:0 0 14px;">+10 pontos quando a reunião com a pessoa que você recomendou acontece, e +100 pontos quando ela vira cliente e completa 90 dias. Os pontos podem ser trocados por brindes no catálogo do portal.</p>
    <p style="margin:0;">Qualquer dúvida, é só falar com o Ícaro.</p>`;
  return wrap("Seu acesso está liberado", body);
}

export async function emailInviteClient(to: string, name: string | null) {
  const subject = inviteSubject();
  const result = await sendEmail(to, subject, inviteHtml(name));
  if (result.ok) await logEmail(to, subject, "auto");
  return result;
}

export async function emailInviteBatch(items: { to: string; name: string | null }[]) {
  const subject = inviteSubject();
  const results = await sendEmailBatch(items.map((i) => ({ to: i.to, subject, html: inviteHtml(i.name) })));
  const db = supabaseAdmin();
  const okRows = results.filter((r) => r.ok).map((r) => ({ to_email: r.to, subject, type: "auto" }));
  if (okRows.length) await db.from("email_log").insert(okRows);
  return results;
}

export async function emailWelcomeClient(to: string | null) {
  if (!to || !to.includes("@")) return;
  const subject = "Bem-vindo ao Clube de Recomendações IC Souza";
  const html = wrap(
    "Seu acesso está ativo! 🎉",
    `Seja bem-vindo ao Clube. A cada pessoa que você recomendar, você acumula pontos e troca por brindes no catálogo. Entre no portal, leia as regras e faça sua primeira recomendação.`
  );
  const result = await sendEmail(to, subject, html);
  if (result.ok) await logEmail(to, subject, "auto");
}

// ---------- Automações para o cliente (respeitam o toggle salvo no banco) ----------

async function isAutomationOn(key: string): Promise<{ on: boolean; subject: string }> {
  const db = supabaseAdmin();
  const { data } = await db.from("email_automations").select("enabled, subject").eq("key", key).maybeSingle();
  if (!data) return { on: false, subject: "" };
  return { on: data.enabled, subject: data.subject };
}

async function logEmail(to: string, subject: string, type: "auto" | "manual") {
  const db = supabaseAdmin();
  await db.from("email_log").insert({ to_email: to, subject, type });
}

async function fireClientAutomation(key: string, to: string | null | undefined, bodyHtml: string) {
  const { on, subject } = await isAutomationOn(key);
  if (!on || !to) return;
  const result = await sendEmail(to, subject, wrap(subject, bodyHtml));
  if (result.ok) await logEmail(to, subject, "auto");
}

export async function emailOnReferral(to: string | null, referredName: string) {
  await fireClientAutomation(
    "onReferral",
    to,
    `Recebemos sua recomendação de <b>${referredName}</b>! Assim que o Ícaro conseguir se reunir com essa pessoa, você ganha <b>+10 pontos</b> automaticamente.`
  );
}

export async function emailOnScheduled(to: string | null, referredName: string, date: string, time: string) {
  await fireClientAutomation(
    "onScheduled",
    to,
    `<b>${referredName}</b>, que você recomendou, agendou uma reunião com o Ícaro para <b>${date} às ${time}</b>. Assim que a conversa acontecer, seus 10 pontos entram automaticamente.`
  );
}

export async function emailOnBecameClient(to: string | null, referredName: string) {
  await fireClientAutomation(
    "onBecameClient",
    to,
    `Ótima notícia: <b>${referredName}</b>, que você recomendou, virou cliente da IC Souza! Em 90 dias, seus <b>+100 pontos</b> entram automaticamente — acompanhe a contagem no seu portal.`
  );
}

export async function emailOnPointsAdded(to: string | null, amount: number, newTotal: number) {
  await fireClientAutomation(
    "onPointsAdded",
    to,
    `Você acabou de ganhar <b>+${amount} pontos</b> no Clube de Recomendações. Seu novo saldo é <b>${newTotal} pontos</b>.`
  );
}

export async function emailOnNewCatalogItem(to: string | null, itemName: string, points: number) {
  await fireClientAutomation(
    "onNewCatalogItem",
    to,
    `Tem novidade no catálogo de resgate: <b>${itemName}</b>, por <b>${points} pontos</b>. Dá uma olhada no seu portal!`
  );
}

export async function emailOnInactive(to: string | null) {
  await fireClientAutomation(
    "onInactive",
    to,
    `Faz um tempo que você não cadastra uma recomendação. Que tal pensar em alguém que possa se beneficiar de uma conversa com o Ícaro? Cada recomendação vale pontos no clube.`
  );
}

// Sempre enviado (não passa pelo toggle) — informa o cliente sobre o estorno de pontos
// quando alguém que ele recomendou vira cliente e cancela a apólice em até 3 meses.
export async function emailOnRecommendationCancelled(
  to: string | null,
  referredName: string,
  pointsRemoved: number,
  blocked: boolean
) {
  if (!to) return;
  const blockedNote = blocked
    ? `Como isso zerou seu saldo, seu acesso à plataforma fica suspenso por <b>3 meses</b>, conforme as regras do clube.`
    : `Seu saldo foi ajustado, mas você ainda pode usar a plataforma normalmente.`;
  const subject = "Ajuste no seu saldo do Clube de Recomendações";
  const html = wrap(
    subject,
    `<b>${referredName}</b>, que você recomendou, cancelou a apólice com a IC Souza dentro do período de 3 meses. Por isso, os <b>${pointsRemoved} pontos</b> do bônus por ela ter virado cliente foram removidos do seu saldo (os 10 pontos da reunião continuam garantidos). ${blockedNote}`
  );
  const result = await sendEmail(to, subject, html);
  if (result.ok) await logEmail(to, subject, "auto");
}

// Resumo semanal para o admin: quais recomendações viraram cliente nos últimos 7 dias.
export async function emailWeeklyBecameClientDigest(
  items: { referrerCpf: string; name: string; becameClientAt: string }[]
) {
  if (items.length === 0) return;
  const rows = items
    .map((i) => `<li><b>${i.name}</b> — recomendado por ${i.referrerCpf} (virou cliente em ${new Date(i.becameClientAt).toLocaleDateString("pt-BR")})</li>`)
    .join("");
  const html = wrap(
    "Resumo semanal: recomendações que viraram cliente",
    `Nos últimos 7 dias, ${items.length} pessoa(s) recomendada(s) viraram cliente:<ul style="padding-left:18px;">${rows}</ul>`
  );
  await sendEmail(ADMIN_EMAIL, "Resumo semanal — recomendações que viraram cliente", html);
}

// ---------- Disparo manual (campanha) ----------

export async function sendManualCampaign(recipients: string[], subject: string, message: string) {
  const html = wrap(subject, message.replace(/\n/g, "<br/>"));
  let sent = 0;
  for (const to of recipients) {
    const result = await sendEmail(to, subject, html);
    if (result.ok) sent++;
  }
  if (sent > 0) {
    await logEmail(sent === 1 ? recipients[0] : `${sent} clientes`, subject, "manual");
  }
  return sent;
}
