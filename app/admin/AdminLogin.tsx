"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/app/actions/admin";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await adminLogin(password);
      if (!result.ok) {
        setError(result.error ?? "Senha incorreta.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2">IC Souza</p>
          <h1 className="font-display text-3xl font-semibold text-bone">Painel Administrativo</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-8 space-y-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha do administrador"
            className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            disabled={isPending}
            className="w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
