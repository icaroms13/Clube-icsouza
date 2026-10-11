"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdminSession, setAdminSession, clearAdminSession } from "@/lib/session";
import {
  emailOnScheduled,
  emailOnBecameClient,
  emailOnPointsAdded,
  emailOnNewCatalogItem,
  emailOnRecommendationCancelled,
  sendManualCampaign as sendCampaignEmails,
} from "@/lib/automations";
import { creditPoints } from "@/lib/points";
import { getActivePointsMultiplier } from "@/lib/promotions";

export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, error: "ADMIN_PASSWORD não configurada no servidor." };
  if (password !== expected) return { ok: false, error: "Senha incorreta." };
  await setAdminSession();
  return { ok: true };
}

export async function adminLogout() {
  await clearAdminSession();
}

async function requireAdmin() {
  const ok = await getAdminSession();
  if (!ok) throw new Error("not_authenticated");
}

// ---------- Visão geral / dados agregados ----------

export async function getAdminData() {
  await requireAdmin();
  const db = supabaseAdmin();

  const [
    { data: recommendations },
    { data: catalog },
    { data: authorizedCpfs },
    { data: settings },
    { data: clients },
    { data: redemptions },
    { data: automations },
    { data: emailLog },
    { data: promotions },
  ] = await Promise.all([
    db.from("recommendations").select("*").order("created_at", { ascending: false }),
    db.from("catalog_items").select("*").order("points", { ascending: true }),
    db.from("authorized_cpfs").select("cpf, name, city, client_since, created_at").order("created_at", { ascending: false }),
    db.from("app_settings").select("value").eq("key", "rules_text").maybeSingle(),
    db.from("clients").select("cpf, points, email, active, last_referral_at, blocked_until, rules_accepted_at, created_at").order("created_at", { ascending: false }),
    db.from("redemptions").select("*").order("created_at", { ascending: false }),
    db.from("email_automations").select("*"),
    db.from("email_log").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("promotions").select("*").order("starts_at", { ascending: false }),
  ]);

  const counts = new Map<string, number>();
  (recommendations ?? []).forEach((r) => counts.set(r.referrer_cpf, (counts.get(r.referrer_cpf) ?? 0) + 1));

  const profiles = new Map<string, { name: string | null; city: string | null; client_since: string | null }>();
  (authorizedCpfs ?? []).forEach((a: any) =>
    profiles.set(a.cpf, { name: a.name ?? null, city: a.city ?? null, client_since: a.client_since ?? null })
  );

  const clientsWithCounts = (clients ?? []).map((c) => ({
    ...c,
    recommendationCount: counts.get(c.cpf) ?? 0,
    name: profiles.get(c.cpf)?.name ?? null,
    city: profiles.get(c.cpf)?.city ?? null,
    client_since: profiles.get(c.cpf)?.client_since ?? null,
  }));

  // Cada recomendação carrega os dados de quem indicou (nome, cidade, desde quando é cliente)
  const recommendationsWithReferrer = (recommendations ?? []).map((r: any) => ({
    ...r,
    referrer: {
      cpf: r.referrer_cpf,
      name: profiles.get(r.referrer_cpf)?.name ?? null,
      city: profiles.get(r.referrer_cpf)?.city ?? null,
      client_since: profiles.get(r.referrer_cpf)?.client_since ?? null,
    },
  }));

  return {
    recommendations: recommendationsWithReferrer,
    catalog: catalog ?? [],
    authorizedCpfs: (authorizedCpfs ?? []).map((r) => r.cpf),
    authorizedProfiles: (authorizedCpfs ?? []).map((r: any) => ({
      cpf: r.cpf as string,
      name: (r.name ?? null) as string | null,
      city: (r.city ?? null) as string | null,
      client_since: (r.client_since ?? null) as string | null,
    })),
    rulesText: settings?.value ?? "",
    clients: clientsWithCounts,
    redemptions: redemptions ?? [],
    automations: automations ?? [],
    emailLog: emailLog ?? [],
    promotions: promotions ?? [],
  };
}

// ---------- Recomendações: agendar reunião, marcar status, virar cliente ----------

export async function scheduleMeeting(id: string, date: string, time: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: rec } = await db
    .from("recommendations")
    .select("id, referrer_cpf, name")
    .eq("id", id)
    .maybeSingle();
  if (!rec) return { ok: false, error: "Recomendação não encontrada." };

  const { error } = await db
    .from("recommendations")
    .update({ status: "agendada", meeting_date: date, meeting_time: time })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao agendar reunião." };

  const { data: client } = await db.from("clients").select("email").eq("cpf", rec.referrer_cpf).maybeSingle();
  await emailOnScheduled(client?.email ?? null, rec.name, date, time);

  return { ok: true };
}

export async function rescheduleMeeting(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db.from("recommendations").update({ status: "aguardando" }).eq("id", id);
  if (error) return { ok: false, error: "Erro ao reabrir agendamento." };
  return { ok: true };
}

export async function markMeetingHappened(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: rec } = await db
    .from("recommendations")
    .select("id, referrer_cpf, status")
    .eq("id", id)
    .maybeSingle();
  if (!rec) return { ok: false, error: "Recomendação não encontrada." };
  if (rec.status === "realizada") return { ok: true }; // evita creditar duas vezes

  const { error } = await db.from("recommendations").update({ status: "realizada" }).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  const multiplier = await getActivePointsMultiplier();
  await creditPoints(rec.referrer_cpf, Math.round(10 * multiplier));
  return { ok: true };
}

export async function markMeetingMissed(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db.from("recommendations").update({ status: "naorealizada" }).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar." };
  return { ok: true };
}

// Marca que a pessoa recomendada virou cliente: inicia a contagem automática de 90 dias.
// Se promotedCpf for informado, autoriza esse CPF para acessar o próprio portal.
export async function markBecameClient(
  id: string,
  promotedCpf?: string,
  profile?: { name?: string; city?: string }
) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: rec } = await db
    .from("recommendations")
    .select("id, referrer_cpf, name")
    .eq("id", id)
    .maybeSingle();
  if (!rec) return { ok: false, error: "Recomendação não encontrada." };

  const nowIso = new Date().toISOString();
  const cleanPromoted = promotedCpf ? promotedCpf.replace(/\D/g, "") : null;

  const { error } = await db
    .from("recommendations")
    .update({
      status: "contando",
      became_client_at: nowIso,
      promoted_cpf: cleanPromoted || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  if (cleanPromoted && cleanPromoted.length === 11) {
    const row: Record<string, string> = { cpf: cleanPromoted, client_since: nowIso.slice(0, 10) };
    if (profile?.name?.trim()) row.name = profile.name.trim();
    if (profile?.city?.trim()) row.city = profile.city.trim();
    await db.from("authorized_cpfs").upsert(row, { onConflict: "cpf" });
  }

  const { data: client } = await db.from("clients").select("email").eq("cpf", rec.referrer_cpf).maybeSingle();
  await emailOnBecameClient(client?.email ?? null, rec.name);

  return { ok: true };
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

// Marca que a pessoa recomendada (que já tinha virado cliente) cancelou a apólice dela.
// Os 10 pontos da reunião NUNCA são removidos — são garantidos assim que a reunião acontece.
// Se o cancelamento aconteceu em até 3 meses depois de virar cliente E os +100 já tinham sido
// creditados, esses 100 pontos são removidos do indicador. Se ainda estava em contagem (os 100
// ainda não tinham sido creditados), só cancelamos a recomendação e a contagem para — sem estorno.
// Se a remoção dos 100 zerar o saldo do indicador (porque já tinha gasto em algum brinde), o
// acesso dele fica bloqueado por 3 meses.
export async function cancelRecommendationClient(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const { data: rec } = await db
    .from("recommendations")
    .select("id, referrer_cpf, name, status, became_client_at")
    .eq("id", id)
    .maybeSingle();
  if (!rec) return { ok: false, error: "Recomendação não encontrada." };
  if (!rec.became_client_at) return { ok: false, error: "Essa recomendação ainda não tinha virado cliente." };
  if (rec.status === "cancelada") return { ok: true };

  const withinThreeMonths = Date.now() - new Date(rec.became_client_at).getTime() <= THREE_MONTHS_MS;
  const pointsToReverse = withinThreeMonths && rec.status === "cliente" ? 100 : 0;

  await db
    .from("recommendations")
    .update({ status: "cancelada", client_cancelled_at: new Date().toISOString() })
    .eq("id", id);

  if (pointsToReverse === 0) {
    return { ok: true, pointsReversed: 0, blocked: false };
  }

  const { data: client } = await db
    .from("clients")
    .select("points, email")
    .eq("cpf", rec.referrer_cpf)
    .maybeSingle();
  if (!client) return { ok: true, pointsReversed: 0, blocked: false };

  const newBalance = client.points - pointsToReverse;
  const blocked = newBalance < 0;

  if (blocked) {
    const blockedUntil = new Date(Date.now() + THREE_MONTHS_MS).toISOString();
    await db.from("clients").update({ points: 0, blocked_until: blockedUntil }).eq("cpf", rec.referrer_cpf);
  } else {
    await db.from("clients").update({ points: newBalance }).eq("cpf", rec.referrer_cpf);
  }

  await emailOnRecommendationCancelled(client.email, rec.name, pointsToReverse, blocked);

  return { ok: true, pointsReversed: pointsToReverse, blocked };
}

// ---------- CPFs autorizados ----------

function parseDateInput(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

// Cada linha: CPF; Nome; Cidade; Cliente desde (dd/mm/aaaa). Só o CPF é obrigatório.
export async function addAuthorizedCpfs(rawList: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  let count = 0;

  for (const line of rawList.split("\n")) {
    const parts = line.split(/[;\t|]/);
    const cpf = (parts[0] ?? "").replace(/\D/g, "");
    if (cpf.length !== 11) continue;
    const row: Record<string, string> = { cpf };
    if (parts[1]?.trim()) row.name = parts[1].trim();
    if (parts[2]?.trim()) row.city = parts[2].trim();
    const since = parseDateInput(parts[3]);
    if (since) row.client_since = since;
    const { error } = await db.from("authorized_cpfs").upsert(row, { onConflict: "cpf" });
    if (error) return { ok: false, error: "Erro ao salvar CPFs. Rodou o SQL novo no Supabase?" };
    count++;
  }
  if (count === 0) return { ok: false, error: "Nenhum CPF válido encontrado." };
  return { ok: true, count };
}

// Cadastra ou edita um CPF com nome, cidade e data em que virou cliente.
export async function saveCpfProfile(input: { cpf: string; name: string; city: string; clientSince: string }) {
  await requireAdmin();
  const db = supabaseAdmin();
  const cpf = input.cpf.replace(/\D/g, "");
  if (cpf.length !== 11) return { ok: false, error: "CPF inválido (precisa ter 11 números)." };
  const { error } = await db.from("authorized_cpfs").upsert(
    {
      cpf,
      name: input.name.trim() || null,
      city: input.city.trim() || null,
      client_since: parseDateInput(input.clientSince),
    },
    { onConflict: "cpf" }
  );
  if (error) return { ok: false, error: "Erro ao salvar. Rodou o SQL novo no Supabase?" };
  return { ok: true };
}

// ---------- Clientes: saldo manual e cancelamento ----------

export async function setClientBalance(cpf: string, newPoints: number) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("points, email").eq("cpf", cpf).maybeSingle();
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  const increased = newPoints > client.points;
  const { error } = await db.from("clients").update({ points: newPoints }).eq("cpf", cpf);
  if (error) return { ok: false, error: "Erro ao salvar saldo." };

  if (increased) await emailOnPointsAdded(client.email, newPoints - client.points, newPoints);
  return { ok: true };
}

export async function cancelClientPolicy(cpf: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db.from("clients").update({ active: false, points: 0 }).eq("cpf", cpf);
  if (error) return { ok: false, error: "Erro ao cancelar." };
  return { ok: true };
}

// ---------- Catálogo: adicionar, editar, remover brindes (com foto) ----------

async function uploadBrindeImage(base64DataUrl: string): Promise<string | null> {
  const db = supabaseAdmin();
  const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const ext = mime.split("/")[1] || "jpg";
  const buffer = Buffer.from(match[2], "base64");
  const fileName = `brinde-${Date.now()}.${ext}`;

  const { error } = await db.storage.from("brindes").upload(fileName, buffer, { contentType: mime });
  if (error) {
    console.error("Erro ao subir imagem do brinde:", error);
    return null;
  }
  const { data } = db.storage.from("brindes").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function addCatalogItem(name: string, points: number, imageBase64?: string, description?: string) {
  await requireAdmin();
  if (!name.trim() || !points) return { ok: false, error: "Preencha nome e pontos do brinde." };

  const db = supabaseAdmin();
  const image_url = imageBase64 ? await uploadBrindeImage(imageBase64) : null;

  const { error } = await db
    .from("catalog_items")
    .insert({ name: name.trim(), points, image_url, description: description?.trim() || null });
  if (error) return { ok: false, error: "Erro ao adicionar brinde." };

  const { data: activeClients } = await db.from("clients").select("email").eq("active", true);
  for (const c of activeClients ?? []) {
    await emailOnNewCatalogItem(c.email, name.trim(), points);
  }

  return { ok: true };
}

export async function editCatalogItem(id: string, name: string, points: number, imageBase64?: string, description?: string) {
  await requireAdmin();
  const db = supabaseAdmin();

  const update: Record<string, unknown> = { name: name.trim(), points, description: description?.trim() || null };
  if (imageBase64) {
    const url = await uploadBrindeImage(imageBase64);
    if (url) update.image_url = url;
  }

  const { error } = await db.from("catalog_items").update(update).eq("id", id);
  if (error) return { ok: false, error: "Erro ao editar brinde." };
  return { ok: true };
}

export async function removeCatalogItem(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db.from("catalog_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao remover brinde." };
  return { ok: true };
}

// Pausa (esconde do catálogo dos clientes sem apagar) ou reativa um brinde.
export async function toggleCatalogItemActive(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: item } = await db.from("catalog_items").select("active").eq("id", id).maybeSingle();
  if (!item) return { ok: false, error: "Brinde não encontrado." };

  const { error } = await db.from("catalog_items").update({ active: !item.active }).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar o brinde." };
  return { ok: true, active: !item.active };
}

// ---------- Resgates: acompanhar status de entrega ----------

export async function advanceRedemptionStatus(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: red } = await db.from("redemptions").select("status").eq("id", id).maybeSingle();
  if (!red) return { ok: false, error: "Resgate não encontrado." };

  const next = red.status === "novo" ? "andamento" : "entregue";
  const { error } = await db.from("redemptions").update({ status: next }).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar status." };
  return { ok: true };
}

// ---------- Comunicação: automações e disparo manual ----------

export async function toggleAutomation(key: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { data: current } = await db.from("email_automations").select("enabled").eq("key", key).maybeSingle();
  if (!current) return { ok: false, error: "Automação não encontrada." };

  const { error } = await db.from("email_automations").update({ enabled: !current.enabled }).eq("key", key);
  if (error) return { ok: false, error: "Erro ao atualizar automação." };
  return { ok: true };
}

export async function sendManualCampaign(audience: "all" | "inactive", subject: string, message: string) {
  await requireAdmin();
  if (!subject.trim() || !message.trim()) return { ok: false, error: "Escreva assunto e mensagem." };

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clients } = await db.from("clients").select("email, last_referral_at").eq("active", true);
  const targets = (clients ?? []).filter((c) => {
    if (!c.email) return false;
    if (audience === "inactive") return !c.last_referral_at || c.last_referral_at < cutoff;
    return true;
  });

  if (targets.length === 0) return { ok: false, error: "Nenhum cliente encontrado nesse filtro." };

  const sent = await sendCampaignEmails(targets.map((t) => t.email as string), subject, message);
  return { ok: true, sent };
}

// ---------- Promoções temporárias de pontos ----------

export async function createPromotion(label: string, multiplier: number, startsAt: string, endsAt: string) {
  await requireAdmin();
  if (!label.trim()) return { ok: false, error: "Dê um nome pra promoção." };
  if (!multiplier || multiplier <= 1) return { ok: false, error: "O multiplicador precisa ser maior que 1 (ex: 2 para pontos em dobro)." };
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { ok: false, error: "Confira as datas: o fim precisa ser depois do início." };
  }

  const db = supabaseAdmin();
  const { error } = await db.from("promotions").insert({
    label: label.trim(),
    multiplier,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
  });
  if (error) return { ok: false, error: "Erro ao criar a promoção." };
  return { ok: true };
}

export async function endPromotion(id: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db.from("promotions").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao encerrar a promoção." };
  return { ok: true };
}

export async function setRulesText(text: string) {
  await requireAdmin();
  const db = supabaseAdmin();
  const { error } = await db
    .from("app_settings")
    .upsert({ key: "rules_text", value: text }, { onConflict: "key" });
  if (error) return { ok: false, error: "Erro ao salvar regras." };
  return { ok: true };
}
