"use client";

import { useState, useTransition } from "react";
import { addAuthorizedCpfs, saveCpfProfile, resendInvite, setRulesText, createPromotion, endPromotion } from "@/app/actions/admin";
import { formatCpf, formatTenure, formatDateBr } from "@/lib/format";
import type { AdminData } from "../AdminPanel";

export default function SettingsTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();

  const [cpfList, setCpfList] = useState("");
  const [cpfMsg, setCpfMsg] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formSince, setFormSince] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSend, setFormSend] = useState(true);
  const [formMsg, setFormMsg] = useState("");
  const [bulkSend, setBulkSend] = useState(true);

  function handleSaveProfile() {
    setFormMsg("");
    startTransition(async () => {
      const result: any = await saveCpfProfile({
        cpf: formCpf, name: formName, city: formCity, clientSince: formSince, email: formEmail, sendWelcome: formSend,
      });
      if (!result.ok) { setFormMsg(result.error ?? "Erro."); return; }
      const st = result.emailStatus;
      setFormMsg(
        st === "sent" ? "Salvo! E-mail de boas-vindas enviado." :
        st === "no_email" ? "Salvo, mas sem e-mail não dá para enviar o convite." :
        st === "failed" ? `Salvo, mas o e-mail falhou: ${result.emailError ?? "erro"}. Use Reenviar na lista.` :
        "Salvo!"
      );
      setFormCpf(""); setFormName(""); setFormCity(""); setFormSince(""); setFormEmail("");
      refresh();
    });
  }

  function handleResend(cpf: string) {
    setFormMsg("");
    startTransition(async () => {
      const result = await resendInvite(cpf);
      setFormMsg(result.ok ? "Convite reenviado!" : result.error ?? "Erro.");
      refresh();
    });
  }

  function loadForEdit(p: { cpf: string; name: string | null; city: string | null; client_since: string | null; email: string | null }) {
    setFormCpf(p.cpf);
    setFormName(p.name ?? "");
    setFormCity(p.city ?? "");
    setFormSince(p.client_since ?? "");
    setFormEmail(p.email ?? "");
    setFormMsg("Editando. Altere os campos e toque em Salvar.");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
      const result: any = await addAuthorizedCpfs(cpfList, bulkSend);
      if (!result.ok) { setCpfMsg(result.error ?? "Erro."); return; }
      let msg = `${result.count} CPF(s) autorizado(s).`;
      if (result.invited) msg += ` ${result.invited} convite(s) enviado(s).`;
      if (result.failed) msg += ` ${result.failed} falhou(aram)${result.emailError ? ` (${result.emailError})` : ""}.`;
      if (bulkSend && result.withoutEmail) msg += ` ${result.withoutEmail} sem e-mail (sem convite).`;
      setCpfMsg(msg);
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
          {data.authorizedCpfs.length} CPF(s) autorizado(s) hoje. Preencha nome, cidade e a data em que a pessoa virou
          cliente: esses dados aparecem em cada recomendação e no Dashboard. Digitar um CPF que já existe atualiza os dados dele.
        </p>

        <div className="space-y-2">
          <input
            value={formCpf}
            onChange={(e) => setFormCpf(e.target.value)}
            placeholder="CPF (11 números)"
            inputMode="numeric"
            className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone"
          />
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nome completo"
            className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone"
          />
          <input
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
            placeholder="Cidade"
            className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone"
          />
          <input
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="E-mail do cliente"
            type="email"
            inputMode="email"
            className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone"
          />
          <label className="block text-xs text-bone/50">
            Cliente desde (data em que virou cliente)
            <input
              type="date"
              value={formSince}
              onChange={(e) => setFormSince(e.target.value)}
              className="mt-1 w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-bone/70 mt-3">
          <input type="checkbox" checked={formSend} onChange={(e) => setFormSend(e.target.checked)} />
          Enviar e-mail de boas-vindas com o passo a passo
        </label>
        {formMsg && <p className="text-sm text-gold mt-2">{formMsg}</p>}
        <button disabled={isPending} onClick={handleSaveProfile} className="mt-3 bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Salvar CPF
        </button>

        <details className="mt-5">
          <summary className="text-xs text-bone/60 cursor-pointer">Cadastrar vários de uma vez</summary>
          <p className="text-xs text-bone/40 mt-2 mb-2">
            Uma pessoa por linha, separando com ponto e vírgula: CPF; Nome; Cidade; Data (dd/mm/aaaa); E-mail. Só o CPF é obrigatório. Quem tiver e-mail recebe o convite de boas-vindas (quem já recebeu não recebe de novo).
          </p>
          <textarea
            value={cpfList}
            onChange={(e) => setCpfList(e.target.value)}
            placeholder={"12345678900; Maria Silva; Belo Horizonte; 15/03/2024; maria@email.com\n98765432100; João Souza; Contagem; 02/10/2025; joao@email.com"}
            rows={4}
            className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold font-mono text-xs"
          />
          <label className="flex items-center gap-2 text-xs text-bone/70 mt-2">
            <input type="checkbox" checked={bulkSend} onChange={(e) => setBulkSend(e.target.checked)} />
            Enviar e-mail de boas-vindas para quem tiver e-mail
          </label>
          {cpfMsg && <p className="text-sm text-gold mt-2">{cpfMsg}</p>}
          <button disabled={isPending} onClick={handleAddCpfs} className="mt-3 border border-gold/40 text-bone rounded-md px-4 py-2 text-sm">
            Adicionar lista
          </button>
        </details>

        {data.authorizedProfiles.length > 0 && (
          <ul className="mt-5 space-y-2">
            {data.authorizedProfiles.map((p) => (
              <li key={p.cpf} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div className="min-w-0">
                  <p className="text-sm text-bone truncate">{p.name || "Sem nome"}</p>
                  <p className="text-xs text-bone/40">
                    {formatCpf(p.cpf)} · {p.city || "sem cidade"}
                    {p.client_since ? ` · cliente há ${formatTenure(p.client_since)} (${formatDateBr(p.client_since)})` : " · sem data"}
                  </p>
                  <p className="text-xs text-bone/40 truncate">
                    {p.email ? p.email : "sem e-mail"}
                    {p.email ? (p.welcome_sent_at ? ` · convite enviado em ${formatDateBr(p.welcome_sent_at)}` : " · convite não enviado") : ""}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  <button onClick={() => loadForEdit(p)} className="text-xs border border-gold/30 text-bone rounded-md px-3 py-1.5">
                    Editar
                  </button>
                  {p.email && (
                    <button disabled={isPending} onClick={() => handleResend(p.cpf)} className="text-xs border border-gold/30 text-gold rounded-md px-3 py-1.5">
                      {p.welcome_sent_at ? "Reenviar" : "Enviar convite"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
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
