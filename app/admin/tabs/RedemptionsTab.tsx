"use client";

import { useTransition } from "react";
import { advanceRedemptionStatus } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  novo: { label: "Novo pedido", cls: "bg-red-400/10 text-red-300 border-red-400/30" },
  andamento: { label: "Em andamento", cls: "bg-blue-400/10 text-blue-300 border-blue-400/30" },
  entregue: { label: "Entregue", cls: "bg-green-400/10 text-green-300 border-green-400/30" },
};

export default function RedemptionsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-1">Solicitações de resgate</h2>
      <p className="text-xs text-bone/50 mb-4">
        Toda nova solicitação chega também por e-mail em icaromsouza13@gmail.com. Acompanhe o status de entrega aqui.
      </p>

      {data.redemptions.length === 0 && <p className="text-sm text-bone/50">Nenhum resgate ainda.</p>}

      <ul className="space-y-3">
        {data.redemptions.map((r: any) => {
          const s = STATUS_LABEL[r.status];
          return (
            <li key={r.id} className="border-b border-white/5 pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-bone">{r.item_name}</p>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${s.cls}`}>{s.label}</span>
              </div>
              <p className="text-xs text-bone/40">
                CPF {r.client_cpf} · {r.points} pts · {new Date(r.created_at).toLocaleString("pt-BR")}
              </p>
              {r.status !== "entregue" && (
                <button
                  disabled={isPending}
                  onClick={() => startTransition(async () => { await advanceRedemptionStatus(r.id); refresh(); })}
                  className="mt-2 text-xs bg-gold text-ink font-semibold rounded-md px-3 py-1.5"
                >
                  {r.status === "novo" ? "Marcar em andamento" : "Marcar como entregue"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
