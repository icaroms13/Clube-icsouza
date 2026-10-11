"use client";

import { useState, useTransition } from "react";
import { acceptRules } from "@/app/actions/client";

/**
 * Dois modos:
 *  - requireAccept = true  → primeiro login: só fecha depois de "Li, estou de acordo" (grava no log com o CPF).
 *  - requireAccept = false → apenas leitura (botão "Ver regras"): fecha com "Fechar", não grava nada.
 */
export default function RulesModal({
  text,
  requireAccept = false,
  onClose,
  onAccepted,
}: {
  text: string;
  requireAccept?: boolean;
  onClose?: () => void;
  onAccepted?: () => void;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError("");
    startTransition(async () => {
      const result = await acceptRules();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onAccepted?.();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="card max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <p className="text-gold text-xs uppercase tracking-[0.25em] mb-2">Como funciona</p>
        <h2 className="font-display text-2xl text-bone mb-4">Regras do Clube</h2>
        <p className="text-sm text-bone/70 leading-relaxed whitespace-pre-line">
          {text || "Carregando regras..."}
        </p>
        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        {requireAccept ? (
          <button
            disabled={isPending}
            onClick={handleAccept}
            className="mt-6 w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Li, estou de acordo"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="mt-6 w-full border border-gold/30 text-bone rounded-md py-3 text-sm hover:border-gold/60 transition"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
