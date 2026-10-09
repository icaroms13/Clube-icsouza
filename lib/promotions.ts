import { supabaseAdmin } from "@/lib/supabase-admin";

// Retorna o maior multiplicador entre as promoções ativas agora (1 = sem promoção).
// Uma promoção está "ativa" quando a data/hora atual está entre starts_at e ends_at.
export async function getActivePointsMultiplier(): Promise<number> {
  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data } = await db
    .from("promotions")
    .select("multiplier")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  if (!data || data.length === 0) return 1;
  return Math.max(1, ...data.map((p) => Number(p.multiplier)));
}
