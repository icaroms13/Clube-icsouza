"use client";

import { useState, useTransition } from "react";
import { addAuthorizedCpfs, setRulesText, createPromotion, endPromotion } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

export default function SettingsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();

  const [cpfList, setCpfList] = useState("");
  const [cpfMsg, setCpfMsg] = useState("");

  const [rulesText, setRulesTextValue] = useState(data.rulesText);
  const [rulesMsg, setRulesMsg] = useState("");

  const [promoLabel, setPromoLabel] = useState("");
  const [promoMultiplier, setPromoMultiplier] = useState("2");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  function handleCreatePromo() {
    setPromoMsg("");
    startTransition(async () => {
      const result = await createPromotion(promoLabel, parseFloat(promoMultiplier), promoStart, promoEnd);
      if (!result.ok) { setPromoMsg(result.error ?? "Erro."); return; }
      setPromoMsg("Promoção criada!");
      setPromoLabel(""); setPromoMultiplier("2"); setPromoStart(""); setPromoEnd("");
      refresh();
    });
  }

  function handleEndPromo(id: string) {
    startTransition(async () => {
      await endPromotion(id);
      refresh();
    });
  }

  function handleAddCpfs() {
    setCpfMsg("");
    startTransition(async () => {
      const result = await addAuthorizedCpfs(cpfList);
      if (!result.ok) { setCpfMsg(result.error ?? "Erro."); return; }
      setCpfMsg(`${result.count} CPF(s) autorizado(s).`);
      setCpfList("");
      refresh();
    });
  }

  function handleSetRules() {
    setRulesMsg("");
    startTransition(async () => {
      const result = await setRulesText(rulesText);
      if (!result.ok) { setRulesMsg(result.error ?? "Erro."); return; }
      setRulesMsg("Regras atualizadas.");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="font-display text-xl text-bone mb-1">CPFs autorizados</h2>
        <p className="text-xs text-bone/50 mb-4">
          {data.authorizedCpfs.length} CPF(s) autorizado(s) hoje. Cole novos CPFs abaixo, um por linha.
        </p>
        <textarea
          value={cpfList}
          onChange={(e) => setCpfList(e.target.value)}
          placeholder={"12345678900\n98765432100"}
          rows={4}
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold font-mono text-sm"
        />
        {cpfMsg && <p className="text-sm text-gold mt-2">{cpfMsg}</p>}
        <button disabled={isPending} onClick={handleAddCpfs} className="mt-3 bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Adicionar CPFs
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-bone mb-1">Promoção de pontos temporária</h2>
        <p className="text-xs text-bone/50 mb-4">
          Enquanto estiver no período, os 10 pontos da reunião e os 100 pontos de "virou cliente" são
          multiplicados automaticamente. Ex: multiplicador 2 = pontos em dobro.
        </p>

        {data.promotions.length > 0 && (
          <ul className="space-y-2 mb-4">
            {data.promotions.map((p: any) => {
              const active = new Date(p.starts_at) <= new Date() && new Date() <= new Date(p.ends_at);
              return (
                <li key={p.id} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div>
                    <p className="text-sm text-bone">
                      {p.label} · {p.multiplier}x {active && <span className="text-gold">(ativa agora)</span>}
                    </p>
                    <p className="text-xs text-bone/40">
                      {new Date(p.starts_at).toLocaleString("pt-BR")} até {new Date(p.ends_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    disabled={isPending}
                    onClick={() => handleEndPromo(p.id)}
                    className="text-xs bg-red-500/80 text-white rounded-md px-3 py-1.5 shrink-0"
                  >
                    Encerrar
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <label className="text-xs text-bone/50">Nome da promoção</label>
        <input
          value={promoLabel}
          onChange={(e) => setPromoLabel(e.target.value)}
          placeholder="Ex: Pontos em dobro de Black Friday"
          className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-3 mt-1"
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-bone/50">Multiplicador</label>
            <input
              type="number" step="0.5" min="1.5"
              value={promoMultiplier}
              onChange={(e) => setPromoMultiplier(e.target.value)}
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-bone/50">&nbsp;</label>
            <p className="text-xs text-bone/40 mt-2.5">ex: 2 = dobro, 3 = triplo</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-bone/50">Início</label>
            <input
              type="datetime-local"
              value={promoStart}
              onChange={(e) => setPromoStart(e.target.value)}
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-bone/50">Fim</label>
            <input
              type="datetime-local"
              value={promoEnd}
              onChange={(e) => setPromoEnd(e.target.value)}
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mt-1"
            />
          </div>
        </div>
        {promoMsg && <p className="text-sm text-gold mb-2">{promoMsg}</p>}
        <button disabled={isPending} onClick={handleCreatePromo} className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Criar promoção
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-bone mb-1">Texto das regras</h2>
        <p className="text-xs text-bone/50 mb-4">Aparece no pop-up mostrado ao cliente assim que ele entra.</p>
        <textarea
          value={rulesText}
          onChange={(e) => setRulesTextValue(e.target.value)}
          rows={10}
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold text-sm"
        />
        {rulesMsg && <p className="text-sm text-gold mt-2">{rulesMsg}</p>}
        <button disabled={isPending} onClick={handleSetRules} className="mt-3 bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Salvar regras
        </button>
      </div>
    </div>
  );
}
