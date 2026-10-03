"use client";

import { useState, useTransition } from "react";
import { addCatalogItem, editCatalogItem, removeCatalogItem } from "@/app/actions/admin";
import type { AdminData } from "../AdminPanel";

type FormState = { id: string | null; name: string; points: string; imageBase64: string | null; previewUrl: string | null };

const EMPTY_FORM: FormState = { id: null, name: "", points: "", imageBase64: null, previewUrl: null };

export default function CatalogTab({ data, refresh }: { data: AdminData; refresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  function openAdd() {
    setForm({ ...EMPTY_FORM });
  }
  function openEdit(item: any) {
    setForm({ id: item.id, name: item.name, points: String(item.points), imageBase64: null, previewUrl: item.image_url });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, imageBase64: reader.result as string, previewUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!form) return;
    const points = parseInt(form.points, 10);
    if (!form.name.trim() || !points) return;

    startTransition(async () => {
      if (form.id) {
        await editCatalogItem(form.id, form.name, points, form.imageBase64 || undefined);
      } else {
        await addCatalogItem(form.name, points, form.imageBase64 || undefined);
      }
      setForm(null);
      refresh();
    });
  }

  function handleRemove() {
    if (!removeId) return;
    startTransition(async () => {
      await removeCatalogItem(removeId);
      setRemoveId(null);
      refresh();
    });
  }

  const removeTarget = data.catalog.find((c: any) => c.id === removeId);

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-1">Brindes do catálogo</h2>
      <p className="text-xs text-bone/50 mb-4">
        Adicione, edite pontos, troque a foto ou remova um brinde. As mudanças aparecem na hora para os clientes.
      </p>

      <button onClick={openAdd} className="w-full bg-gold text-ink font-semibold rounded-md py-2.5 text-sm mb-4">
        + Adicionar novo brinde
      </button>

      <ul className="space-y-3">
        {data.catalog.map((item: any) => (
          <li key={item.id} className="flex items-center gap-3 border-b border-white/5 pb-3 last:border-0">
            {item.image_url ? (
              <img src={item.image_url} className="w-12 h-12 rounded-md object-cover gold-border" />
            ) : (
              <div className="w-12 h-12 rounded-md border border-dashed border-gold/30 flex items-center justify-center text-lg">🎁</div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-bone">{item.name}</p>
              <p className="text-xs text-bone/40">{item.points} pontos</p>
            </div>
            <button onClick={() => openEdit(item)} className="text-xs border border-gold/30 text-bone rounded-md px-3 py-1.5">
              Editar
            </button>
            <button onClick={() => setRemoveId(item.id)} className="text-xs bg-red-500/80 text-white rounded-md px-3 py-1.5">
              Remover
            </button>
          </li>
        ))}
      </ul>

      {form && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6">
            <h3 className="font-display text-xl text-bone mb-3 text-center">{form.id ? "Editar brinde" : "Novo brinde"}</h3>
            <div className="flex justify-center mb-3">
              {form.previewUrl ? (
                <img src={form.previewUrl} className="w-24 h-24 rounded-lg object-cover gold-border" />
              ) : (
                <div className="w-24 h-24 rounded-lg border border-dashed border-gold/30 flex items-center justify-center text-2xl">🎁</div>
              )}
            </div>
            <label className="text-xs text-bone/50">Foto do brinde</label>
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-xs text-bone/70 mb-3 mt-1" />
            <label className="text-xs text-bone/50">Nome do brinde</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Caneca personalizada"
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-3 mt-1"
            />
            <label className="text-xs text-bone/50">Pontos necessários</label>
            <input
              type="number"
              value={form.points}
              onChange={(e) => setForm({ ...form, points: e.target.value })}
              placeholder="Ex: 150"
              className="w-full bg-black/30 gold-border rounded-md px-3 py-2 text-sm text-bone mb-4 mt-1"
            />
            <div className="flex gap-2">
              <button onClick={() => setForm(null)} className="flex-1 border border-gold/30 rounded-md py-2 text-sm text-bone">
                Cancelar
              </button>
              <button disabled={isPending} onClick={handleSave} className="flex-1 bg-gold text-ink rounded-md py-2 text-sm font-semibold">
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeId && removeTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6 text-center">
            <p className="text-3xl mb-2">🗑️</p>
            <h3 className="font-display text-xl text-bone mb-2">Remover brinde?</h3>
            <p className="text-sm text-bone/70 mb-6">
              Remover <b>{removeTarget.name}</b> do catálogo? Ele deixa de aparecer para os clientes.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveId(null)} className="flex-1 border border-gold/30 rounded-md py-2 text-sm text-bone">
                Cancelar
              </button>
              <button disabled={isPending} onClick={handleRemove} className="flex-1 bg-red-500 text-white rounded-md py-2 text-sm font-semibold">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
