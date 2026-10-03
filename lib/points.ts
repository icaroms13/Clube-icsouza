import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailOnPointsAdded } from "@/lib/automations";

export async function creditPoints(cpf: string, amount: number) {
  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("points, email").eq("cpf", cpf).maybeSingle();
  if (!client) return;
  const newTotal = client.points + amount;
  await db.from("clients").update({ points: newTotal }).eq("cpf", cpf);
  await emailOnPointsAdded(client.email, amount, newTotal);
}
