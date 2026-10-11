import { NextRequest, NextResponse } from "next/server";
import { processWeeklyDigest } from "@/lib/cron-jobs";

// Chamado 1x por semana pelo Vercel Cron (ver vercel.json) — manda um e-mail resumo
// pro admin com quem virou cliente nos últimos 7 dias.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const result = await processWeeklyDigest();
  return NextResponse.json({ ok: true, sent: result.count > 0, itemCount: result.count });
}
