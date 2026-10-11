import crypto from "crypto";
import { cookies } from "next/headers";

const CLIENT_COOKIE = "icsouza_session";
const ADMIN_COOKIE = "icsouza_admin_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Faltou definir SESSION_SECRET no .env");
  return s;
}

function sign(value: string) {
  const h = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${h}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  if (sig.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return ok ? value : null;
}

// --- Sessão do cliente (guarda o CPF) ---

export async function setClientSession(cpf: string) {
  const store = await cookies();
  store.set(CLIENT_COOKIE, sign(cpf), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getClientSession(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CLIENT_COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}

export async function clearClientSession() {
  const store = await cookies();
  store.delete(CLIENT_COOKIE);
}

// --- Sessão do admin ---

export async function setAdminSession() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getAdminSession(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  return verify(raw) === "admin";
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
