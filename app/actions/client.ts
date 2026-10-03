"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientSession } from "@/lib/session";
import { emailOnReferral, notifyAdminNewRecommendation, notifyAdminNewRedemption } from "@/lib/automations";

export async function getDashboardData() {
  const cpf = await getClientSession();
  if (!cpf) return null;

  const db = supabaseAdmin();

  const [{ data: client }, { data: recommendations }, { data: catalog }, { data: settings }] =
    await Promise.all([
      db.from("clients").select("cpf, points, email, active, blocked_until").eq("cpf", cpf).maybeSingle(),
      db
        .from("recommendations")
        .select("id, name, phone, status, meeting_date, meeting_time, became_client_at")
        .eq("referrer_cpf", cpf)
        .order("created_at", { ascending: false }),
      db.from("catalog_items").select("id, name, points, image_url").order("points", { ascending: true }),
      db.from("app_settings").select("value").eq("key", "rules_text").maybeSingle(),
    ]);

  if (!client || !client.active) return null;
  if (client.blocked_until && new Date(client.blocked_until) > new Date()) return null;

  // Calcula dias restantes para o bônus de 90 dias em quem está "contando"
  const withCountdown = (recommendations ?? []).map((r) => {
    if (r.status === "contando" && r.became_client_at) {
      const elapsedMs = Date.now() - new Date(r.became_client_at).getTime();
      const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, 90 - elapsedDays);
      return { ...r, daysLeft, daysTotal: 90 };
    }
    return r;
  });

  return {
    cpf: client.cpf,
    points: client.points,
    email: client.email as string | null,
    recommendations: withCountdown,
    catalog: catalog ?? [],
    rulesText: settings?.value ?? "",
  };
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function addRecommendation(input: {
  name: string;
  phone: string;
  age?: string;
  city?: string;
  profession?: string;
  relationship?: string;
  hasChildren?: boolean | null;
  married?: boolean | null;
  description?: string;
  confirmedContactNotice: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cpf = await getClientSession();
  if (!cpf) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const name = input.name.trim();
  const digits = cleanPhone(input.phone);

  if (name.length < 2) return { ok: false, error: "Digite o nome da pessoa recomendada." };
  if (digits.length !== 11) {
    return { ok: false, error: "Telefone inválido. Use DDD + 9 dígitos (celular)." };
  }
  if (!input.confirmedContactNotice) {
    return { ok: false, error: "Confirme que avisou a pessoa sobre o contato do Ícaro." };
  }
  const description = (input.description || "").trim();
  if (description.length > 500) {
    return { ok: false, error: "A descrição pode ter no máximo 500 caracteres." };
  }

  const db = supabaseAdmin();

  // Duplicidade: mesmo telefone já recomendado antes (por qualquer cliente)
  const { data: existingPhone } = await db
    .from("recommendations")
    .select("id")
    .eq("phone", digits)
    .maybeSingle();
  if (existingPhone) {
    return { ok: false, error: "Este telefone já está na nossa base de recomendações." };
  }

  const { error: insertError } = await db.from("recommendations").insert({
    referrer_cpf: cpf,
    name,
    phone: digits,
    age: input.age || null,
    city: input.city || null,
    profession: input.profession || null,
    relationship: input.relationship || null,
    has_children: input.hasChildren ?? null,
    married: input.married ?? null,
    description: description || null,
    confirmed_contact_notice: true,
    status: "aguardando",
  });

  if (insertError) return { ok: false, error: "Não consegui salvar a recomendação. Tente de novo." };

  await db.from("clients").update({ last_referral_at: new Date().toISOString() }).eq("cpf", cpf);

  const { data: client } = await db.from("clients").select("email").eq("cpf", cpf).maybeSingle();
  await emailOnReferral(client?.email ?? null, name);
  await notifyAdminNewRecommendation(cpf, name, digits);

  return { ok: true };
}

export async function requestRedemption(
  itemId: string
): Promise<{ ok: true } | { ok: false; error: string; missing?: number }> {
  const cpf = await getClientSession();
  if (!cpf) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const db = supabaseAdmin();

  const [{ data: client }, { data: item }] = await Promise.all([
    db.from("clients").select("points, email").eq("cpf", cpf).maybeSingle(),
    db.from("catalog_items").select("id, name, points").eq("id", itemId).maybeSingle(),
  ]);

  if (!client || !item) return { ok: false, error: "Não encontrei esse item ou sua conta." };

  if (client.points < item.points) {
    return { ok: false, error: "Saldo insuficiente.", missing: item.points - client.points };
  }

  const { error: insertError } = await db.from("redemptions").insert({
    client_cpf: cpf,
    item_id: item.id,
    item_name: item.name,
    points: item.points,
    status: "novo",
  });
  if (insertError) return { ok: false, error: "Não consegui registrar o resgate. Tente de novo." };

  const { error: updateError } = await db
    .from("clients")
    .update({ points: client.points - item.points })
    .eq("cpf", cpf);
  if (updateError) return { ok: false, error: "Resgate registrado, mas houve erro ao descontar pontos." };

  await notifyAdminNewRedemption(cpf, item.name, item.points);

  return { ok: true };
}

export async function updateClientEmail(
  newEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cpf = await getClientSession();
  if (!cpf) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const email = newEmail.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Digite um e-mail válido." };
  }

  const db = supabaseAdmin();
  const { error } = await db.from("clients").update({ email }).eq("cpf", cpf);
  if (error) return { ok: false, error: "Não consegui atualizar o e-mail. Tente de novo." };

  return { ok: true };
}
