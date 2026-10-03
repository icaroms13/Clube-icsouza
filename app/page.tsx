"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkCpf, createPassword, login } from "@/app/actions/auth";

type Stage = "cpf" | "set_password" | "login_password";

export default function HomePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [stage, setStage] = useState<Stage>("cpf");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleCpfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await checkCpf(cpf);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStage(result.status === "logged_in" ? "login_password" : "set_password");
    });
  }

  function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    startTransition(async () => {
      const result = await createPassword(cpf, password, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/cliente");
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await login(cpf, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/cliente");
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-gold text-xs tracking-[0.3em] uppercase mb-2">IC Souza</p>
          <h1 className="font-display text-4xl font-semibold text-bone">Clube de Recomendações</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
        </div>

        <div className="card p-8">
          {stage === "cpf" && (
            <form onSubmit={handleCpfSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm text-bone/70">Digite seu CPF</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="mt-1 w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
                />
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                disabled={isPending}
                className="w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50"
              >
                {isPending ? "Verificando..." : "Continuar"}
              </button>
            </form>
          )}

          {stage === "set_password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-sm text-bone/70">
                Primeiro acesso! Crie uma senha e informe seu e-mail — é para onde vamos te avisar
                sobre suas recomendações e pontos.
              </p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (mínimo 6 caracteres)"
                className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a senha"
                className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
              />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                disabled={isPending}
                className="w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50"
              >
                {isPending ? "Criando conta..." : "Criar conta e entrar"}
              </button>
              <button
                type="button"
                onClick={() => setStage("cpf")}
                className="w-full text-xs text-bone/50 hover:text-bone/80"
              >
                Voltar
              </button>
            </form>
          )}

          {stage === "login_password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-bone/70">Digite sua senha para entrar.</p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full bg-black/30 gold-border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:border-gold"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                disabled={isPending}
                className="w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition disabled:opacity-50"
              >
                {isPending ? "Entrando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => setStage("cpf")}
                className="w-full text-xs text-bone/50 hover:text-bone/80"
              >
                Usar outro CPF
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
