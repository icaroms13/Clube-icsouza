"use client";

import { useState, useTransition, useEffect } from "react";
import { addRecommendation } from "@/app/actions/client";
import { BRAZIL_STATES } from "@/lib/brazil-states";

const RELATIONSHIP_OPTIONS = [
  "Amigo(a)",
  "Familiar",
  "Colega de trabalho",
  "Vizinho(a)",
  "Cliente ou parceiro de negócios",
  "Outro",
];

// Formata como (DD) 9XXXX-XXXX enquanto digita, sempre DDD + 9 dígitos (celular)
function formatPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function RecommendationForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [age, setAge] = useState("");
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [profession, setProfession] = useState("");
  const [relationship, setRelationship] = useState("");
  const [description, setDescription] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [married, setMarried] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Busca as cidades do estado escolhido (API pública do IBGE, sem necessidade de chave)
  useEffect(() => {
    if (!uf) { setCities([]); return; }
    setLoadingCities(true);
    setCity("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => r.json())
      .then((data: { nome: string }[]) => {
        setCities(data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR")));
      })
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [uf]);

  function reset() {
    setName(""); setPhoneDigits(""); setAge(""); setUf(""); setCity(""); setProfession("");
    setRelationship(""); setDescription(""); setHasChildren(null); setMarried(null); setConfirmed(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);

    if (phoneDigits.length !== 11) {
      setError("Telefone inválido. Digite DDD + 9 dígitos (celular).");
      return;
    }

    startTransition(async () => {
      const cityWithState = city ? `${city} - ${uf}` : "";
      const result = await addRecommendation({
        name, phone: phoneDigits, age, city: cityWithState, profession, relationship,
        hasChildren, married, description, confirmedContactNotice: confirmed,
      });
      if (!result.ok) { setError(result.error); return; }
      reset();
      setSuccess(true);
      onSaved();
    });
  }

  const toggleBtn = (active: boolean) =>
    `flex-1 text-center py-2 rounded-md text-sm border ${
      active ? "bg-gold/20 border-gold text-gold-light font-semibold" : "bg-black/20 border-gold/30 text-bone/60"
    }`;

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-3">
      <h2 className="font-display text-xl text-bone">Nova recomendação</h2>
      <p className="text-xs text-bone/50 -mt-1">
        Você ganha 10 pontos quando o Ícaro se reunir com essa pessoa, e mais 100 pontos se ela virar cliente.
      </p>

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo"
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />

      <input
        value={formatPhone(phoneDigits)}
        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 11))}
        inputMode="numeric"
        placeholder="(DDD) 9XXXX-XXXX"
        maxLength={16}
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
      />

      <div className="grid grid-cols-2 gap-3">
        <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="Idade"
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />

        <select value={uf} onChange={(e) => setUf(e.target.value)}
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone focus:border-gold">
          <option value="">Estado</option>
          {BRAZIL_STATES.map((s) => <option key={s.uf} value={s.uf}>{s.uf}</option>)}
        </select>
      </div>

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={!uf || loadingCities}
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone focus:border-gold disabled:opacity-40"
      >
        <option value="">{!uf ? "Escolha o estado primeiro" : loadingCities ? "Carregando cidades..." : "Cidade"}</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Profissão"
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />

      <select value={relationship} onChange={(e) => setRelationship(e.target.value)}
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone focus:border-gold">
        <option value="">Grau de relação / onde conhece</option>
        {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-bone/50 mb-1">Tem filhos?</p>
          <div className="flex gap-2">
            <button type="button" className={toggleBtn(hasChildren === true)} onClick={() => setHasChildren(true)}>Sim</button>
            <button type="button" className={toggleBtn(hasChildren === false)} onClick={() => setHasChildren(false)}>Não</button>
          </div>
        </div>
        <div>
          <p className="text-xs text-bone/50 mb-1">É casado(a)?</p>
          <div className="flex gap-2">
            <button type="button" className={toggleBtn(married === true)} onClick={() => setMarried(true)}>Sim</button>
            <button type="button" className={toggleBtn(married === false)} onClick={() => setMarried(false)}>Não</button>
          </div>
        </div>
      </div>

      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={3}
          maxLength={500}
          placeholder="Descrição (opcional) — ex: nome dos filhos, do(a) marido/esposa, idade, atividade profissional..."
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold resize-none"
        />
        <p className="text-right text-[11px] text-bone/30 mt-1">{description.length}/500</p>
      </div>

      <label className="flex items-start gap-2 bg-gold/5 border border-gold/30 rounded-md p-3 cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 accent-gold" />
        <span className="text-xs text-bone/70">
          Já avisei essa pessoa que o <b>Ícaro Souza</b> vai entrar em contato com ela.
        </span>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-gold">Recomendação registrada! Você ganha +10 pontos assim que o Ícaro se reunir com essa pessoa.</p>}

      <button disabled={isPending}
        className="w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50">
        {isPending ? "Salvando..." : "Cadastrar recomendação"}
      </button>
    </form>
  );
}
