"use client";

import { useState, useTransition } from "react";
import { setClientBalance, cancelClientPolicy } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

export default function ClientsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cancelCpf, setCancelCpf] = useState<string | null>(null);

  function save(cpf: string) {
    const val = parseInt(drafts[cpf] ?? "", 10);
    if (Number.isNaN(val)) return;
    startTransition(async () => {
      await setClientBalance(cpf, val);
      refresh();
    });
  }

  function confirmCancel() {
    if (!cancelCpf) return;
    startTransition(async () => {
      await cancelClientPolicy(cancelCpf);
      setCancelCpf(null);
      refresh();
    });
  }

  const cancelTarget = data.clients.find((c: any) => c.cpf === cancelCpf);

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-1">Clientes do clube</h2>
      <p className="text-xs text-bone/50 mb-4">
        Quantidade de recomendações por CPF, ajuste manual de saldo e cancelamento de apólice.
      </p>

      <ul className="space-y-4">
        {data.clients.map((c: any) => {
          const isBlocked = c.blocked_until && new Date(c.blocked_until) > new Date();
          return (
          <li key={c.cpf} className="border-b border-white/5 pb-4 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-bone">{c.cpf}</p>
              <span
                className={`text-[10px] px-2 py-1 rounded-full border ${
                  !c.active
                    ? "bg-red-400/10 text-red-300 border-red-400/30"
                    : isBlocked
                    ? "bg-yellow-400/10 text-yellow-300 border-yellow-400/30"
                    : "bg-green-400/10 text-green-300 border-green-400/30"
                }`}
              >
                {!c.active ? "Apólice cancelada" : isBlocked ? "Bloqueado temporariamente" : "Ativo"}
              </span>
            </div>
            <p className="text-xs text-bone/40">
              {c.email || "sem e-mail cadastrado"} · {c.recommendationCount} recomendações cadastradas
            </p>
            {isBlocked && (
              <p className="text-xs text-yellow-300/80 mt-1">
                Bloqueado até {new Date(c.blocked_until).toLocaleDateString("pt-BR")} (estorno de pontos zerou o saldo)
              </p>
            )}

            {c.active ? (
              <>
                <div className="flex gap-2 items-center mt-3">
                  <input
                    type="number"
                    defaultValue={c.points}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [c.cpf]: e.target.value }))}
                    className="w-24 bg-black/30 gold-border rounded-md px-3 py-1.5 text-sm text-bone"
                  />
                  <button
                    disabled={isPending}
                    onClick={() => save(c.cpf)}
                    className="text-xs bg-gold text-ink font-semibold rounded-md px-3 py-1.5"
                  >
                    Salvar saldo
                  </button>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => setCancelCpf(c.cpf)}
                  className="mt-2 text-xs bg-red-500/80 text-white rounded-md px-3 py-1.5"
                >
                  Cancelar apólice
                </button>
              </>
            ) : (
              <p className="text-xs text-bone/40 mt-2">Acesso encerrado, saldo zerado automaticamente.</p>
            )}
          </li>
          );
        })}
      </ul>

      {cancelCpf && cancelTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6 text-center">
            <p className="text-3xl mb-2">🚫</p>
            <h3 className="font-display text-xl text-bone mb-2">Cancelar apólice?</h3>
            <p className="text-sm text-bone/70 mb-6">
              O cliente <b>{cancelTarget.cpf}</b> perderá o acesso ao portal e o saldo de{" "}
              <b>{cancelTarget.points} pontos</b> será zerado automaticamente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelCpf(null)} className="flex-1 border border-gold/30 rounded-md py-2 text-sm text-bone">
                Voltar
              </button>
              <button disabled={isPending} onClick={confirmCancel} className="flex-1 bg-red-500 text-white rounded-md py-2 text-sm font-semibold">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
