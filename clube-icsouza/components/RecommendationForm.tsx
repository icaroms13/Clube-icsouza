"use client";

import { useState, useTransition } from "react";
import { addRecommendation } from "@/app/actions/client";

const RELATIONSHIP_OPTIONS = [
  "Amigo(a)",
  "Familiar",
  "Colega de trabalho",
  "Vizinho(a)",
  "Cliente ou parceiro de negócios",
  "Outro",
];

export default function RecommendationForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [relationship, setRelationship] = useState("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [married, setMarried] = useState<boolean | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName(""); setPhone(""); setAge(""); setCity(""); setProfession("");
    setRelationship(""); setHasChildren(null); setMarried(null); setConfirmed(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(false);
    startTransition(async () => {
      const result = await addRecommendation({
        name, phone, age, city, profession, relationship,
        hasChildren, married, confirmedContactNotice: confirmed,
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
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Telefone (DDD + número)"
        className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />

      <div className="grid grid-cols-2 gap-3">
        <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="Idade"
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade"
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold" />
      </div>

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
