"use client";

import { useState, useTransition } from "react";
import { addAuthorizedCpfs, setRulesText } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

export default function SettingsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();

  const [cpfList, setCpfList] = useState("");
  const [cpfMsg, setCpfMsg] = useState("");

  const [rulesText, setRulesTextValue] = useState(data.rulesText);
  const [rulesMsg, setRulesMsg] = useState("");

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
