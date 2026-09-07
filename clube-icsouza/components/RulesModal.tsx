"use client";

import { useState } from "react";

export default function RulesModal({ text }: { text: string }) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="card max-w-md w-full p-6">
        <p className="text-gold text-xs uppercase tracking-[0.25em] mb-2">Como funciona</p>
        <h2 className="font-display text-2xl text-bone mb-4">Regras do Clube</h2>
        <p className="text-sm text-bone/70 leading-relaxed whitespace-pre-line">{text}</p>
        <button
          onClick={() => setOpen(false)}
          className="mt-6 w-full bg-gold text-ink font-semibold rounded-md py-3 hover:bg-gold-light transition"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
