"use client";

import { useState, useTransition } from "react";
import { toggleAutomation, sendManualCampaign } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

export default function CommsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [audience, setAudience] = useState<"all" | "inactive">("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  function handleToggle(key: string) {
    startTransition(async () => {
      await toggleAutomation(key);
      refresh();
    });
  }

  function handleSend() {
    setFeedback("");
    startTransition(async () => {
      const result = await sendManualCampaign(audience, subject, message);
      if (!result.ok) {
        setFeedback(result.error ?? "Erro ao enviar.");
        return;
      }
      setFeedback(`Disparo enviado para ${result.sent} cliente(s).`);
      setSubject("");
      setMessage("");
      refresh();
    });
  }

  return (
    <>
      <div className="card p-6 mb-4">
        <h2 className="font-display text-xl text-bone mb-1">E-mails automáticos</h2>
        <p className="text-xs text-bone/50 mb-4">Ative ou desative cada disparo automático para os clientes.</p>
        <ul className="space-y-3">
          {data.automations.map((a: any) => (
            <li key={a.key} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
              <div>
                <p className="text-sm text-bone">{a.label}</p>
                <p className="text-xs text-bone/40">Assunto: "{a.subject}"</p>
              </div>
              <button
                disabled={isPending}
                onClick={() => handleToggle(a.key)}
                className={`text-xs px-3 py-1.5 rounded-md border shrink-0 ${
                  a.enabled ? "bg-gold/15 border-gold text-gold-light font-semibold" : "border-bone/20 text-bone/50"
                }`}
              >
                {a.enabled ? "Ativado" : "Desativado"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6 mb-4">
        <h2 className="font-display text-xl text-bone mb-1">Novo disparo manual</h2>
        <p className="text-xs text-bone/50 mb-4">Envie uma mensagem personalizada para engajar os clientes a recomendar.</p>

        <label className="text-xs text-bone/50">Destinatários</label>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as "all" | "inactive")}
          className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-3 mt-1"
        >
          <option value="all">Todos os clientes ativos</option>
          <option value="inactive">Só quem não recomenda há 30+ dias</option>
        </select>

        <label className="text-xs text-bone/50">Assunto</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Que tal indicar alguém essa semana?"
          className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-3 mt-1"
        />

        <label className="text-xs text-bone/50">Mensagem</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Escreva uma mensagem curta e pessoal"
          className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-3 mt-1"
        />

        {feedback && <p className="text-sm text-gold mb-2">{feedback}</p>}
        <button disabled={isPending} onClick={handleSend} className="w-full bg-gold text-ink font-semibold rounded-md py-2.5 text-sm">
          {isPending ? "Enviando..." : "Enviar disparo"}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-bone mb-1">Histórico de envios</h2>
        <ul className="space-y-2 mt-3">
          {data.emailLog.length === 0 && <p className="text-sm text-bone/50">Nenhum envio ainda.</p>}
          {data.emailLog.map((e: any) => (
            <li key={e.id} className="border-b border-white/5 pb-2 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-bone">{e.subject}</p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    e.type === "auto" ? "bg-gold/10 border-gold/30 text-gold" : "bg-blue-400/10 border-blue-400/30 text-blue-300"
                  }`}
                >
                  {e.type === "auto" ? "Automático" : "Manual"}
                </span>
              </div>
              <p className="text-xs text-bone/40">
                Para: {e.to_email} · {new Date(e.created_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
