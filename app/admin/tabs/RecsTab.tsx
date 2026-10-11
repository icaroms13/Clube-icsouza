"use client";

import { useState, useTransition } from "react";
import {
  scheduleMeeting,
  rescheduleMeeting,
  markMeetingHappened,
  markMeetingMissed,
  markBecameClient,
  cancelRecommendationClient,
} from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

function formatPhone(phone: string) {
  if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  return phone;
}

export default function RecommendationsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [dateDrafts, setDateDrafts] = useState<Record<string, { date: string; time: string }>>({});
  const [becomeClientId, setBecomeClientId] = useState<string | null>(null);
  const [promoteCpf, setPromoteCpf] = useState("");

  function setDraft(id: string, field: "date" | "time", value: string) {
    setDateDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function handleSchedule(id: string) {
    const draft = dateDrafts[id];
    if (!draft?.date || !draft?.time) return;
    startTransition(async () => {
      await scheduleMeeting(id, draft.date, draft.time);
      refresh();
    });
  }

  function handleConfirmBecameClient() {
    if (!becomeClientId) return;
    startTransition(async () => {
      await markBecameClient(becomeClientId, promoteCpf || undefined);
      setBecomeClientId(null);
      setPromoteCpf("");
      refresh();
    });
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-1">Todas as recomendações</h2>
      <p className="text-xs text-bone/50 mb-4">
        Agende a reunião, marque se aconteceu (+10 pts) e depois marque se a pessoa virou cliente
        (inicia a contagem automática de 90 dias para +100 pts).
      </p>

      {data.recommendations.length === 0 && <p className="text-sm text-bone/50">Nenhuma recomendação ainda.</p>}

      <ul className="space-y-4">
        {data.recommendations.map((r: any) => {
          const daysLeft =
            r.status === "contando" && r.became_client_at
              ? Math.max(0, 90 - Math.floor((Date.now() - new Date(r.became_client_at).getTime()) / 86400000))
              : null;

          return (
            <li key={r.id} className="border-b border-white/5 pb-4 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-bone">{r.name}</p>
                <span className="text-[10px] px-2 py-1 rounded-full border bg-white/5 border-white/10 text-bone/50">
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-bone/40">
                {formatPhone(r.phone)} · {r.age ?? "-"} anos · {r.city ?? "-"} · {r.profession ?? "-"}
              </p>
              <p className="text-xs text-bone/40">
                Relação: {r.relationship ?? "-"} · Filhos: {r.has_children === true ? "Sim" : r.has_children === false ? "Não" : "-"} ·
                Casado(a): {r.married === true ? "Sim" : r.married === false ? "Não" : "-"}
              </p>
              <p className="text-xs text-bone/30">Recomendado por: {r.referrer_cpf}</p>
              {r.description && (
                <p className="text-xs text-bone/60 bg-black/20 border border-gold/20 rounded-md p-2 mt-2">
                  "{r.description}"
                </p>
              )}

              {r.status === "aguardando" && (
                <div className="flex gap-2 mt-3 flex-wrap items-center">
                  <input
                    type="date"
                    className="bg-black/30 gold-border rounded-md px-2 py-1.5 text-xs text-bone"
                    onChange={(e) => setDraft(r.id, "date", e.target.value)}
                  />
                  <input
                    type="time"
                    className="bg-black/30 gold-border rounded-md px-2 py-1.5 text-xs text-bone"
                    onChange={(e) => setDraft(r.id, "time", e.target.value)}
                  />
                  <button
                    disabled={isPending}
                    onClick={() => handleSchedule(r.id)}
                    className="text-xs bg-gold text-ink font-semibold rounded-md px-3 py-1.5"
                  >
                    Agendar reunião
                  </button>
                </div>
              )}

              {r.status === "agendada" && (
                <div className="mt-3">
                  <p className="text-xs text-blue-300 mb-2">
                    📅 Agendada para {r.meeting_date?.split("-").reverse().join("/")} às {r.meeting_time}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await markMeetingHappened(r.id); refresh(); })}
                      className="text-xs bg-gold text-ink font-semibold rounded-md px-3 py-1.5"
                    >
                      Reunião realizada (+10 pts)
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await markMeetingMissed(r.id); refresh(); })}
                      className="text-xs border border-gold/30 text-bone rounded-md px-3 py-1.5"
                    >
                      Não aconteceu
                    </button>
                  </div>
                </div>
              )}

              {r.status === "naorealizada" && (
                <button
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await rescheduleMeeting(r.id); refresh(); })}
                  className="mt-3 text-xs border border-gold/30 text-bone rounded-md px-3 py-1.5"
                >
                  Reagendar reunião
                </button>
              )}

              {r.status === "realizada" && (
                <button
                  disabled={isPending}
                  onClick={() => setBecomeClientId(r.id)}
                  className="mt-3 text-xs bg-gold text-ink font-semibold rounded-md px-3 py-1.5"
                >
                  Marcar que virou cliente
                </button>
              )}

              {r.status === "contando" && daysLeft !== null && (
                <div className="mt-2">
                  <p className="text-xs text-gold/80">
                    Faltam {daysLeft} de 90 dias — os 100 pontos entram sozinhos ao final (automático via cron)
                  </p>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(async () => { await cancelRecommendationClient(r.id); refresh(); })}
                    className="mt-2 text-xs border border-red-400/40 text-red-300 rounded-md px-3 py-1.5"
                  >
                    Recomendado cancelou a apólice
                  </button>
                </div>
              )}

              {r.status === "cliente" && (
                <div className="mt-2">
                  <p className="text-xs text-green-300">
                    +100 pontos concedidos{r.promoted_cpf ? ` · CPF ${r.promoted_cpf} já tem acesso ao portal` : ""}
                  </p>
                  {r.became_client_at && Date.now() - new Date(r.became_client_at).getTime() <= 92 * 86400000 && (
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await cancelRecommendationClient(r.id); refresh(); })}
                      className="mt-2 text-xs border border-red-400/40 text-red-300 rounded-md px-3 py-1.5"
                    >
                      Recomendado cancelou a apólice
                    </button>
                  )}
                </div>
              )}

              {r.status === "cancelada" && (
                <p className="text-xs text-red-300 mt-2">
                  Recomendado cancelou a apólice — pontos estornados{r.client_cancelled_at ? ` em ${new Date(r.client_cancelled_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {becomeClientId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6">
            <h3 className="font-display text-xl text-bone mb-2 text-center">Confirmar que virou cliente?</h3>
            <p className="text-sm text-bone/70 mb-4 text-center">
              Isso vai iniciar a contagem automática de 90 dias até os +100 pontos.
            </p>
            <p className="text-xs text-bone/50 mb-2">
              Se já souber o CPF dessa pessoa, cadastre agora e ela já ganha acesso ao próprio portal:
            </p>
            <input
              value={promoteCpf}
              onChange={(e) => setPromoteCpf(e.target.value)}
              placeholder="CPF (opcional)"
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setBecomeClientId(null); setPromoteCpf(""); }}
                className="flex-1 border border-gold/30 rounded-md py-2 text-sm text-bone"
              >
                Cancelar
              </button>
              <button
                disabled={isPending}
                onClick={handleConfirmBecameClient}
                className="flex-1 bg-gold text-ink rounded-md py-2 text-sm font-semibold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
