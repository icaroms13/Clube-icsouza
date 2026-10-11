import { NextRequest, NextResponse } from "next/server";
import { processNinetyDayBonuses, processInactivityReminders } from "@/lib/cron-jobs";

// Este endpoint é chamado automaticamente 1x por dia pelo Vercel Cron (ver vercel.json).
// Protegido por CRON_SECRET para que ninguém de fora consiga disparar isso manualmente.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const bonuses = await processNinetyDayBonuses();
  const reminders = await processInactivityReminders();

  return NextResponse.json({
    ok: true,
    bonusesCredited: bonuses.credited,
    inactivityRemindersSent: reminders.sent,
  });
}
