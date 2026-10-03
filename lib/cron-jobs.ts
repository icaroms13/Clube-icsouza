import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailOnInactive, emailWeeklyBecameClientDigest } from "@/lib/automations";
import { creditPoints } from "@/lib/points";

// Credita +100 para quem já completou os 90 dias de contagem desde que a recomendação virou cliente.
export async function processNinetyDayBonuses() {
  const db = supabaseAdmin();
  const { data: due } = await db
    .from("recommendations")
    .select("id, referrer_cpf, became_client_at")
    .eq("status", "contando");

  let credited = 0;
  for (const rec of due ?? []) {
    if (!rec.became_client_at) continue;
    const days = (Date.now() - new Date(rec.became_client_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days >= 90) {
      await db
        .from("recommendations")
        .update({ status: "cliente", bonus_credited_at: new Date().toISOString() })
        .eq("id", rec.id);
      await creditPoints(rec.referrer_cpf, 100);
      credited++;
    }
  }
  return { credited };
}

// Avisa clientes sem recomendar há 30+ dias, no máximo 1x a cada 30 dias por cliente.
export async function processInactivityReminders() {
  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clients } = await db
    .from("clients")
    .select("cpf, email, last_referral_at, last_inactivity_email_at, active")
    .eq("active", true);

  let sent = 0;
  for (const c of clients ?? []) {
    const lastRef = c.last_referral_at ?? null;
    const isInactive = !lastRef || lastRef < cutoff;
    const alreadyRemindedRecently = c.last_inactivity_email_at && c.last_inactivity_email_at > cutoff;
    if (isInactive && !alreadyRemindedRecently && c.email) {
      await emailOnInactive(c.email);
      await db.from("clients").update({ last_inactivity_email_at: new Date().toISOString() }).eq("cpf", c.cpf);
      sent++;
    }
  }
  return { sent };
}

// Roda 1x por semana: envia ao admin um resumo de quem virou cliente nos últimos 7 dias
// (contando a partir de quando o admin marcou "virou cliente" para cada recomendação).
export async function processWeeklyDigest() {
  const db = supabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await db
    .from("recommendations")
    .select("name, referrer_cpf, became_client_at")
    .in("status", ["contando", "cliente"])
    .gte("became_client_at", sevenDaysAgo);

  const items = (recent ?? []).map((r) => ({
    referrerCpf: r.referrer_cpf,
    name: r.name,
    becameClientAt: r.became_client_at as string,
  }));

  await emailWeeklyBecameClientDigest(items);
  return { count: items.length };
}
