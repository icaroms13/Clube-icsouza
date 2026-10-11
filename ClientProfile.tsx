"use client";

import { useState, useTransition } from "react";
import { updateClientEmail } from "@/app/actions/client";

export default function ClientProfile({
  cpf,
  email,
  onClose,
  onUpdated,
}: {
  cpf: string;
  email: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function formatCpf(c: string) {
    return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c;
  }

  function handleSave() {
    setError(""); setSuccess(false);
    startTransition(async () => {
      const result = await updateClientEmail(newEmail);
      if (!result.ok) { setError(result.error); return; }
      setSuccess(true);
      onUpdated();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="card max-w-sm w-full p-6">
        <h3 className="font-display text-xl text-bone mb-1 text-center">Meu perfil</h3>
        <p className="text-xs text-bone/50 text-center mb-6">
          CPF: {formatCpf(cpf)} (não pode ser alterado)
        </p>

        <label className="text-xs text-bone/50">E-mail para receber avisos do clube</label>
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
          className="w-full bg-black/30 gold-border rounded-md px-4 py-3 mt-1 mb-2 text-bone placeholder:text-bone/30 focus:border-gold"
        />

        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        {success && <p className="text-sm text-gold mb-2">E-mail atualizado!</p>}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 border border-gold/30 rounded-md py-2.5 text-sm text-bone">
            Fechar
          </button>
          <button
            disabled={isPending}
            onClick={handleSave}
            className="flex-1 bg-gold text-ink rounded-md py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
