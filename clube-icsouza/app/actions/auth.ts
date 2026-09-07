"use server";

import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { setClientSession, clearClientSession } from "@/lib/session";

export type AuthResult =
  | { ok: true; status: "logged_in" }
  | { ok: true; status: "needs_password_setup" }
  | { ok: false; error: string };

function cleanCpf(cpf: string) {
  return cpf.replace(/\D/g, "");
}

// Passo 1: cliente digita o CPF. Verificamos se está autorizado e se já tem conta.
export async function checkCpf(cpfInput: string): Promise<AuthResult> {
  const cpf = cleanCpf(cpfInput);
  if (cpf.length !== 11) {
    return { ok: false, error: "CPF inválido. Digite os 11 números." };
  }

  const db = supabaseAdmin();

  const { data: authorized } = await db
    .from("authorized_cpfs")
    .select("cpf")
    .eq("cpf", cpf)
    .maybeSingle();

  if (!authorized) {
    return {
      ok: false,
      error: "Este CPF não está autorizado. Fale com a IC Souza para liberar seu acesso.",
    };
  }

  const { data: client } = await db
    .from("clients")
    .select("cpf")
    .eq("cpf", cpf)
    .maybeSingle();

  return { ok: true, status: client ? "logged_in" : "needs_password_setup" };
}

// Primeiro acesso: cliente autorizado cria a própria senha e informa o e-mail.
export async function createPassword(
  cpfInput: string,
  password: string,
  email: string
): Promise<AuthResult> {
  const cpf = cleanCpf(cpfInput);
  if (password.length < 6) {
    return { ok: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Digite um e-mail válido — é para onde vamos te avisar sobre suas recomendações e pontos." };
  }

  const db = supabaseAdmin();

  const { data: authorized } = await db
    .from("authorized_cpfs")
    .select("cpf")
    .eq("cpf", cpf)
    .maybeSingle();

  if (!authorized) {
    return { ok: false, error: "CPF não autorizado." };
  }

  const { data: existing } = await db
    .from("clients")
    .select("cpf")
    .eq("cpf", cpf)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Este CPF já tem uma senha cadastrada. Faça login normalmente." };
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await db
    .from("clients")
    .insert({ cpf, password_hash, email, points: 0, active: true });
  if (error) return { ok: false, error: "Não consegui criar sua conta. Tente de novo." };

  await setClientSession(cpf);
  return { ok: true, status: "logged_in" };
}

// Acessos seguintes: CPF + senha.
export async function login(cpfInput: string, password: string): Promise<AuthResult> {
  const cpf = cleanCpf(cpfInput);
  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("cpf, password_hash, active, blocked_until")
    .eq("cpf", cpf)
    .maybeSingle();

  if (!client) {
    return { ok: false, error: "Conta não encontrada." };
  }

  const valid = await bcrypt.compare(password, client.password_hash);
  if (!valid) {
    return { ok: false, error: "Senha incorreta." };
  }

  if (!client.active) {
    return {
      ok: false,
      error: "Sua apólice foi cancelada. O acesso ao Clube de Recomendações foi encerrado.",
    };
  }

  if (client.blocked_until && new Date(client.blocked_until) > new Date()) {
    const until = new Date(client.blocked_until).toLocaleDateString("pt-BR");
    return {
      ok: false,
      error: `Seu acesso está temporariamente suspenso até ${until}, devido ao cancelamento de uma recomendação que havia virado cliente.`,
    };
  }

  await setClientSession(cpf);
  return { ok: true, status: "logged_in" };
}

// Acesso de demonstração (CPF 00000000000) — entra sem pedir senha.
export async function loginDemo(): Promise<AuthResult> {
  const cpf = "00000000000";
  const db = supabaseAdmin();

  const { data: client } = await db.from("clients").select("cpf").eq("cpf", cpf).maybeSingle();

  if (!client) {
    const password_hash = await bcrypt.hash("demo-" + Date.now(), 10);
    await db.from("clients").insert({ cpf, password_hash, points: 0, active: true, email: "demo@icsouza.com.br" });
  }

  await setClientSession(cpf);
  return { ok: true, status: "logged_in" };
}

export async function logout() {
  await clearClientSession();
}
