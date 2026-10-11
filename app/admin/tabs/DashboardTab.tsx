"use client";

import { useMemo, useState } from "react";
import { formatCpf, formatTenure } from "@/lib/format";
import type { AdminData } from "../AdminPanel";

const GOLD = "#c8a24d";
const GREEN = "#6fcf97";
const BLUE = "#6ea8fe";
const RED = "#eb6f6f";
const MUTED = "#8a8478";

const MEETING_DONE = ["realizada", "contando", "cliente", "cancelada"];
const SCHEDULED_OR_BEYOND = ["agendada", "realizada", "naorealizada", "contando", "cliente", "cancelada"];

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando agendamento",
  agendada: "Reunião agendada",
  realizada: "Reunião realizada",
  naorealizada: "Reunião não aconteceu",
  contando: "Virou cliente (contando 90 dias)",
  cliente: "Cliente + bônus pago",
  cancelada: "Cancelou a apólice",
};
const STATUS_COLOR: Record<string, string> = {
  aguardando: "#8a8478",
  agendada: BLUE,
  realizada: GOLD,
  naorealizada: "#b08a5a",
  contando: "#e0c36f",
  cliente: GREEN,
  cancelada: RED,
};

type Period = "all" | "30" | "90" | "365";
const PERIODS: { id: Period; label: string }[] = [
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "365", label: "12 meses" },
  { id: "all", label: "Tudo" },
];

function daysBetween(a: string | Date, b: string | Date) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}
function avg(nums: number[]) {
  return nums.length ? nums.reduce((x, y) => x + y, 0) / nums.length : null;
}
function median(nums: number[]) {
  if (!nums.length) return null;
  const s = [...nums].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
function fmtDays(n: number | null) {
  if (n === null) return "—";
  return `${Math.round(n)} ${Math.round(n) === 1 ? "dia" : "dias"}`;
}
function titleCase(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
function topCounts(values: (string | null | undefined)[], limit: number) {
  const m = new Map<string, number>();
  values.forEach((v) => {
    const t = (v ?? "").trim();
    if (!t) return;
    const key = titleCase(t);
    m.set(key, (m.get(key) ?? 0) + 1);
  });
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ---------- peças visuais ----------

function Kpi({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-black/20 px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-bone/50">{label}</p>
      <p className="font-display text-2xl mt-1" style={{ color: color ?? "#f2ede1" }}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-bone/40 mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg text-bone">{title}</h3>
      {subtitle && <p className="text-xs text-bone/50 mb-3">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-bone/40">Ainda sem dados neste período.</p>;
}

function BarList({ items, color = GOLD, suffix = "" }: { items: { label: string; value: number; extra?: string }[]; color?: string; suffix?: string }) {
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-bone truncate">{i.label}</span>
            <span className="text-bone/70 shrink-0">
              {i.value}
              {suffix}
              {i.extra ? ` · ${i.extra}` : ""}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 mt-1 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Columns({
  items,
  color = GOLD,
  color2 = GREEN,
}: {
  items: { label: string; value: number; value2?: number }[];
  color?: string;
  color2?: string;
}) {
  const max = Math.max(...items.flatMap((i) => [i.value, i.value2 ?? 0]), 1);
  const H = 110;
  return (
    <div className="flex items-end gap-1.5" style={{ height: H + 34 }}>
      {items.map((i) => (
        <div key={i.label} className="flex-1 flex flex-col items-center justify-end min-w-0">
          <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: H }}>
            <div className="flex flex-col items-center justify-end" style={{ width: i.value2 !== undefined ? "46%" : "70%" }}>
              <span className="text-[10px] text-bone/70">{i.value || ""}</span>
              <div className="w-full rounded-t" style={{ height: Math.max((i.value / max) * (H - 14), i.value ? 3 : 1), background: color, opacity: i.value ? 1 : 0.25 }} />
            </div>
            {i.value2 !== undefined && (
              <div className="flex flex-col items-center justify-end" style={{ width: "46%" }}>
                <span className="text-[10px] text-bone/70">{i.value2 || ""}</span>
                <div className="w-full rounded-t" style={{ height: Math.max((i.value2 / max) * (H - 14), i.value2 ? 3 : 1), background: color2, opacity: i.value2 ? 1 : 0.25 }} />
              </div>
            )}
          </div>
          <span className="text-[10px] text-bone/50 mt-1.5 truncate w-full text-center">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <Empty />;
  let acc = 0;
  const stops = parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const from = (acc / total) * 100;
      acc += p.value;
      const to = (acc / total) * 100;
      return `${p.color} ${from}% ${to}%`;
    })
    .join(", ");
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <div className="rounded-full w-full h-full" style={{ background: `conic-gradient(${stops})` }} />
        <div className="absolute rounded-full bg-[#151513] flex flex-col items-center justify-center" style={{ inset: 24 }}>
          <span className="font-display text-xl text-bone">{total}</span>
          <span className="text-[9px] text-bone/50 uppercase tracking-wider">total</span>
        </div>
      </div>
      <ul className="space-y-1 text-xs flex-1 min-w-[150px]">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <li key={p.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
              <span className="text-bone/80 flex-1">{p.label}</span>
              <span className="text-bone">{p.value}</span>
              <span className="text-bone/40 w-9 text-right">{pct(p.value, total)}%</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <ul className="space-y-2">
      {steps.map((s, idx) => (
        <li key={s.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-bone">{s.label}</span>
            <span className="text-bone/70">
              {s.value} · {pct(s.value, top)}% do início
              {idx > 0 && steps[idx - 1].value > 0 ? ` · ${pct(s.value, steps[idx - 1].value)}% da etapa anterior` : ""}
            </span>
          </div>
          <div className="h-5 rounded bg-white/5 overflow-hidden">
            <div
              className="h-full rounded"
              style={{ width: `${Math.max((s.value / top) * 100, s.value ? 3 : 0)}%`, background: `linear-gradient(90deg, ${GOLD}, #e8d08a)`, opacity: 1 - idx * 0.12 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- aba ----------

export default function DashboardTab({ data }: { data: AdminData }) {
  const [period, setPeriod] = useState<Period>("all");

  const m = useMemo(() => {
    const now = new Date();
    const cutoff = period === "all" ? null : new Date(now.getTime() - parseInt(period, 10) * 86400000);
    const all: any[] = data.recommendations as any[];
    const recs = cutoff ? all.filter((r) => new Date(r.created_at) >= cutoff) : all;
    const total = recs.length;

    const scheduled = recs.filter((r) => SCHEDULED_OR_BEYOND.includes(r.status)).length;
    const meetings = recs.filter((r) => MEETING_DONE.includes(r.status)).length;
    const became = recs.filter((r) => r.became_client_at);
    const bonusPaid = recs.filter((r) => r.status === "cliente").length;
    const counting = recs.filter((r) => r.status === "contando").length;
    const cancelled = recs.filter((r) => r.status === "cancelada").length;

    const cycleClient = became.map((r) => Math.max(0, daysBetween(r.created_at, r.became_client_at)));
    const cycleMeeting = recs
      .filter((r) => r.meeting_date)
      .map((r) => Math.max(0, daysBetween(r.created_at, r.meeting_date + "T12:00:00")));
    const meetingToClient = became
      .filter((r) => r.meeting_date)
      .map((r) => Math.max(0, daysBetween(r.meeting_date + "T12:00:00", r.became_client_at)));

    const cycleBuckets = [
      { label: "0-15d", test: (d: number) => d <= 15 },
      { label: "16-30d", test: (d: number) => d > 15 && d <= 30 },
      { label: "31-60d", test: (d: number) => d > 30 && d <= 60 },
      { label: "61-90d", test: (d: number) => d > 60 && d <= 90 },
      { label: "90d+", test: (d: number) => d > 90 },
    ].map((b) => ({ label: b.label, value: cycleClient.filter(b.test).length }));

    // últimos 12 meses (recomendações criadas x viraram cliente)
    const monthly: { key: string; label: string; value: number; value2: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.push({ key: monthKey(d), label: MONTHS[d.getMonth()], value: 0, value2: 0 });
    }
    all.forEach((r) => {
      const k = monthKey(new Date(r.created_at));
      const slot = monthly.find((x) => x.key === k);
      if (slot) slot.value++;
      if (r.became_client_at) {
        const k2 = monthKey(new Date(r.became_client_at));
        const slot2 = monthly.find((x) => x.key === k2);
        if (slot2) slot2.value2++;
      }
    });

    const newClubMembers = monthly.map((x) => ({ key: x.key, label: x.label, value: 0 }));
    (data.clients as any[]).forEach((c) => {
      if (!c.created_at) return;
      const slot = newClubMembers.find((x) => x.key === monthKey(new Date(c.created_at)));
      if (slot) slot.value++;
    });

    // por cliente que indica
    const byRef = new Map<string, { cpf: string; name: string; city: string; recs: number; meetings: number; conv: number; since: string | null }>();
    recs.forEach((r) => {
      const ref = r.referrer ?? {};
      const cur = byRef.get(r.referrer_cpf) ?? {
        cpf: r.referrer_cpf,
        name: ref.name || formatCpf(r.referrer_cpf),
        city: ref.city || "",
        recs: 0,
        meetings: 0,
        conv: 0,
        since: ref.client_since ?? null,
      };
      cur.recs++;
      if (MEETING_DONE.includes(r.status)) cur.meetings++;
      if (r.became_client_at) cur.conv++;
      byRef.set(r.referrer_cpf, cur);
    });
    const referrers = [...byRef.values()].sort((a, b) => b.conv - a.conv || b.recs - a.recs);

    const refCities = topCounts(
      [...byRef.values()].map((r) => r.city),
      8
    );

    // perfil dos recomendados
    const ages = recs.map((r) => parseInt(r.age, 10)).filter((n) => !isNaN(n) && n > 0 && n < 110);
    const ageBuckets = [
      { label: "até 25", test: (n: number) => n <= 25 },
      { label: "26-35", test: (n: number) => n > 25 && n <= 35 },
      { label: "36-45", test: (n: number) => n > 35 && n <= 45 },
      { label: "46-55", test: (n: number) => n > 45 && n <= 55 },
      { label: "56+", test: (n: number) => n > 55 },
    ].map((b) => ({ label: b.label, value: ages.filter(b.test).length }));
    const kidsKnown = recs.filter((r) => r.has_children === true || r.has_children === false);
    const marriedKnown = recs.filter((r) => r.married === true || r.married === false);

    // clientes do clube
    const clients = data.clients as any[];
    const activeClients = clients.filter((c) => c.active);
    const pointsInCirculation = activeClients.reduce((s, c) => s + (c.points ?? 0), 0);
    const recCountAll = new Map<string, number>();
    all.forEach((r) => recCountAll.set(r.referrer_cpf, (recCountAll.get(r.referrer_cpf) ?? 0) + 1));
    const neverReferred = activeClients.filter((c) => !recCountAll.get(c.cpf)).length;
    const active30 = activeClients.filter((c) => c.last_referral_at && daysBetween(c.last_referral_at, now) <= 30).length;
    const invitedNoSignup = Math.max(0, data.authorizedCpfs.length - clients.length);
    const tenures = (data.authorizedProfiles as any[])
      .filter((p) => p.client_since)
      .map((p) => daysBetween(p.client_since + "T12:00:00", now));
    const clientCities = topCounts(
      (data.authorizedProfiles as any[]).map((p) => p.city),
      8
    );

    // resgates
    const reds = data.redemptions as any[];
    const redCut = cutoff ? reds.filter((r) => new Date(r.created_at) >= cutoff) : reds;
    const pointsRedeemed = redCut.reduce((s, r) => s + (r.points ?? 0), 0);
    const itemCounts = new Map<string, number>();
    redCut.forEach((r) => itemCounts.set(r.item_name, (itemCounts.get(r.item_name) ?? 0) + 1));
    const topItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
    const redByStatus = {
      novo: redCut.filter((r) => r.status === "novo").length,
      andamento: redCut.filter((r) => r.status === "andamento").length,
      entregue: redCut.filter((r) => r.status === "entregue").length,
    };

    // pendências
    const waiting = all.filter((r) => r.status === "aguardando");
    const waitingOld = waiting.filter((r) => daysBetween(r.created_at, now) > 3).length;
    const overdueMeetings = all.filter(
      (r) => r.status === "agendada" && r.meeting_date && new Date(r.meeting_date + "T" + (r.meeting_time || "23:59")) < now
    ).length;
    const finishingSoon = all.filter(
      (r) => r.status === "contando" && r.became_client_at && 90 - daysBetween(r.became_client_at, now) <= 15
    ).length;

    return {
      total, scheduled, meetings, became: became.length, bonusPaid, counting, cancelled,
      cycleClient, cycleMeeting, meetingToClient, cycleBuckets, monthly, newClubMembers,
      referrers, refCities,
      statusParts: Object.keys(STATUS_LABEL).map((k) => ({
        label: STATUS_LABEL[k], color: STATUS_COLOR[k], value: recs.filter((r) => r.status === k).length,
      })),
      cities: topCounts(recs.map((r) => r.city), 8),
      professions: topCounts(recs.map((r) => r.profession), 8),
      relationships: topCounts(recs.map((r) => r.relationship), 6),
      avgAge: avg(ages), ageBuckets,
      kidsPct: pct(kidsKnown.filter((r) => r.has_children === true).length, kidsKnown.length), kidsN: kidsKnown.length,
      marriedPct: pct(marriedKnown.filter((r) => r.married === true).length, marriedKnown.length), marriedN: marriedKnown.length,
      clientsTotal: clients.length, activeClients: activeClients.length, pointsInCirculation, neverReferred,
      active30, invitedNoSignup, avgTenureDays: avg(tenures), clientCities,
      redCount: redCut.length, pointsRedeemed, topItems, redByStatus,
      waiting: waiting.length, waitingOld, overdueMeetings, finishingSoon,
    };
  }, [data, period]);

  const avgCycle = avg(m.cycleClient);
  const medCycle = median(m.cycleClient);

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-bone">Dashboard</h2>
          <p className="text-xs text-bone/50">Seu trabalho em números. O período vale para recomendações e resgates.</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`text-xs px-3 py-1.5 rounded-md border ${
                period === p.id ? "bg-gold/15 border-gold text-gold-light font-semibold" : "bg-white/5 border-transparent text-bone/60"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {(m.waiting > 0 || m.overdueMeetings > 0 || m.finishingSoon > 0) && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3 text-xs text-bone/80 space-y-1">
          <p className="text-red-300 font-semibold uppercase tracking-widest text-[10px]">Precisa de você</p>
          {m.waiting > 0 && (
            <p>
              {m.waiting} recomendação(ões) aguardando agendamento{m.waitingOld > 0 ? ` (${m.waitingOld} há mais de 3 dias)` : ""}.
            </p>
          )}
          {m.overdueMeetings > 0 && <p>{m.overdueMeetings} reunião(ões) já passaram da data e ainda não foram marcadas como realizadas.</p>}
          {m.finishingSoon > 0 && <p>{m.finishingSoon} contagem(ns) de 90 dias terminam em até 15 dias (bônus de 100 pts a caminho).</p>}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Kpi label="Recomendações" value={m.total} hint="cadastradas no período" />
        <Kpi label="Reuniões realizadas" value={m.meetings} hint={`${pct(m.meetings, m.total)}% das recomendações`} color={GOLD} />
        <Kpi label="Viraram cliente" value={m.became} hint={`${pct(m.became, m.total)}% de conversão`} color={GREEN} />
        <Kpi label="Ciclo médio até virar cliente" value={fmtDays(avgCycle)} hint={medCycle !== null ? `mediana ${fmtDays(medCycle)}` : "da recomendação ao fechamento"} color={GOLD} />
        <Kpi label="Tempo até a reunião" value={fmtDays(avg(m.cycleMeeting))} hint="da recomendação à data da reunião" />
        <Kpi label="Reunião → cliente" value={fmtDays(avg(m.meetingToClient))} hint="da reunião ao fechamento" />
      </div>

      <Section title="Funil de recomendações" subtitle="Quantas chegam em cada etapa e quanto se perde entre elas.">
        <Funnel
          steps={[
            { label: "Recomendações cadastradas", value: m.total },
            { label: "Reunião agendada", value: m.scheduled },
            { label: "Reunião realizada", value: m.meetings },
            { label: "Virou cliente", value: m.became },
            { label: "Bônus de 100 pts pago", value: m.bonusPaid },
          ]}
        />
        <p className="text-xs text-bone/50 mt-3">
          Em contagem de 90 dias: {m.counting} · Cancelaram a apólice: {m.cancelled}
        </p>
      </Section>

      <Section title="Situação de cada recomendação" subtitle="Onde estão todas as recomendações do período.">
        <Donut parts={m.statusParts} />
      </Section>

      <Section title="Evolução nos últimos 12 meses" subtitle="Dourado: recomendações recebidas · Verde: pessoas que viraram cliente.">
        <Columns items={m.monthly} />
      </Section>

      <Section title="Ciclo de venda" subtitle="Dias entre a recomendação e a pessoa virar cliente.">
        {m.cycleClient.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Kpi label="Média" value={fmtDays(avgCycle)} />
              <Kpi label="Mais rápido" value={fmtDays(Math.min(...m.cycleClient))} color={GREEN} />
              <Kpi label="Mais longo" value={fmtDays(Math.max(...m.cycleClient))} color={RED} />
            </div>
            <Columns items={m.cycleBuckets} color={BLUE} />
          </>
        )}
      </Section>

      <Section title="Ranking de quem mais indica" subtitle="Clientes ordenados por quantas pessoas viraram cliente e quantas recomendaram.">
        {m.referrers.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {m.referrers.slice(0, 10).map((r, idx) => (
              <li key={r.cpf} className="border-b border-white/5 pb-3 last:border-0">
                <div className="flex justify-between gap-2">
                  <p className="text-sm text-bone">
                    <span className="text-gold mr-2">{idx + 1}º</span>
                    {r.name}
                  </p>
                  <p className="text-xs text-bone/60 shrink-0">{r.recs} indicações</p>
                </div>
                <p className="text-xs text-bone/40">
                  {r.city || "cidade não informada"}
                  {r.since ? ` · cliente há ${formatTenure(r.since)}` : ""}
                </p>
                <p className="text-xs text-bone/60 mt-1">
                  {r.meetings} reuniões · <span className="text-green-300">{r.conv} viraram cliente</span> · conversão {pct(r.conv, r.recs)}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Clientes do clube">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <Kpi label="Clientes ativos" value={m.activeClients} hint={`${m.clientsTotal} cadastrados no portal`} />
          <Kpi label="Indicaram no último mês" value={m.active30} hint={`${pct(m.active30, m.activeClients)}% dos ativos`} color={GREEN} />
          <Kpi label="Nunca indicaram" value={m.neverReferred} hint="oportunidade de reativar" color={RED} />
          <Kpi label="Autorizados sem login" value={m.invitedNoSignup} hint="ainda não criaram senha" />
          <Kpi label="Pontos em circulação" value={m.pointsInCirculation.toLocaleString("pt-BR")} hint="saldo dos clientes ativos" color={GOLD} />
          <Kpi label="Tempo médio de cliente" value={m.avgTenureDays !== null ? formatTenure(new Date(Date.now() - m.avgTenureDays * 86400000).toISOString()) : "—"} hint="com data informada em Config" />
        </div>
        <p className="text-xs text-bone/50 mb-2">Novos clientes no portal por mês</p>
        <Columns items={m.newClubMembers} color={GOLD} />
      </Section>

      <Section title="De onde vêm as recomendações" subtitle="Cidade e profissão das pessoas recomendadas.">
        <p className="text-xs text-bone/50 mb-2">Cidades dos recomendados</p>
        <BarList items={m.cities} />
        <p className="text-xs text-bone/50 mt-5 mb-2">Profissões dos recomendados</p>
        <BarList items={m.professions} color={BLUE} />
        <p className="text-xs text-bone/50 mt-5 mb-2">Relação com quem indicou</p>
        <BarList items={m.relationships} color={GREEN} />
      </Section>

      <Section title="Cidades dos seus clientes" subtitle="Onde moram os clientes que mais indicam e a base cadastrada em Config.">
        <p className="text-xs text-bone/50 mb-2">Clientes que indicaram no período</p>
        <BarList items={m.refCities} />
        <p className="text-xs text-bone/50 mt-5 mb-2">Todos os CPFs cadastrados</p>
        <BarList items={m.clientCities} color={BLUE} />
      </Section>

      <Section title="Perfil dos recomendados">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Kpi label="Idade média" value={m.avgAge !== null ? `${Math.round(m.avgAge)} anos` : "—"} />
          <Kpi label="Têm filhos" value={m.kidsN ? `${m.kidsPct}%` : "—"} hint={`${m.kidsN} informados`} />
          <Kpi label="Casados" value={m.marriedN ? `${m.marriedPct}%` : "—"} hint={`${m.marriedN} informados`} />
        </div>
        <p className="text-xs text-bone/50 mb-2">Faixa etária</p>
        <Columns items={m.ageBuckets} color={GOLD} />
      </Section>

      <Section title="Resgates e brindes" subtitle="O que os clientes estão trocando pelos pontos.">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Kpi label="Resgates" value={m.redCount} />
          <Kpi label="Pontos usados" value={m.pointsRedeemed.toLocaleString("pt-BR")} color={GOLD} />
          <Kpi label="Pendentes" value={m.redByStatus.novo + m.redByStatus.andamento} hint={`${m.redByStatus.novo} novos · ${m.redByStatus.andamento} em andamento`} color={m.redByStatus.novo ? RED : undefined} />
        </div>
        <p className="text-xs text-bone/50 mb-2">Brindes mais resgatados</p>
        <BarList items={m.topItems} color={GOLD} />
      </Section>
    </div>
  );
}
