"use client";

import { useState, useTransition } from "react";
import { requestRedemption } from "@/app/actions/client";

type CatalogItem = { id: string; name: string; points: number; image_url: string | null; description: string | null };

export default function RewardsCatalog({
  catalog,
  points,
  onRedeemed,
}: {
  catalog: CatalogItem[];
  points: number;
  onRedeemed: () => void;
}) {
  const [confirmItem, setConfirmItem] = useState<CatalogItem | null>(null);
  const [failMsg, setFailMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  function handleClick(item: CatalogItem) {
    if (points < item.points) {
      setFailMsg(
        `Você tem ${points} pontos. Este item custa ${item.points} pontos. Faltam ${item.points - points} pontos.`
      );
      return;
    }
    setConfirmItem(item);
  }

  function confirmRedeem() {
    if (!confirmItem) return;
    startTransition(async () => {
      const result = await requestRedemption(confirmItem.id);
      if (!result.ok) {
        setConfirmItem(null);
        setFailMsg(result.error);
        return;
      }
      setOkMsg(
        `O Ícaro Souza LifePlanner vai entrar em contato em até 5 dias corridos para combinar a entrega do seu prêmio: ${confirmItem.name}.`
      );
      setConfirmItem(null);
      onRedeemed();
    });
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-4">Catálogo de resgate</h2>
      <p className="text-xs text-bone/50 -mt-2 mb-4">
        Itens nítidos estão disponíveis com seu saldo. Os com cadeado são liberados quando você atingir a pontuação.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {catalog.map((item) => {
          const locked = points < item.points;
          const missing = item.points - points;
          const hasImage = !!item.image_url && !brokenImages[item.id];
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              disabled={locked}
              aria-disabled={locked}
              className={`relative bg-black/20 gold-border rounded-lg overflow-hidden text-left ${
                locked ? "cursor-not-allowed" : "active:scale-[0.99] transition-transform"
              }`}
            >
              <div className="relative">
                {hasImage ? (
                  <img
                    src={item.image_url as string}
                    alt={item.name}
                    loading="lazy"
                    onError={() => setBrokenImages((prev) => ({ ...prev, [item.id]: true }))}
                    className={`w-full aspect-square object-cover ${
                      locked ? "grayscale brightness-[0.45]" : ""
                    }`}
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-4xl bg-white/5">🎁</div>
                )}
                {locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="w-14 h-14 rounded-full bg-black/70 border border-gold/60 flex items-center justify-center text-2xl">
                      🔒
                    </span>
                    <span className="text-[11px] font-semibold text-bone bg-black/70 rounded-full px-3 py-1">
                      Faltam {missing} pts
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className={`text-xs ${locked ? "text-bone/50" : "text-bone"}`}>{item.name}</p>
                <p className={`text-xs mt-1 font-semibold ${locked ? "text-bone/50" : "text-gold"}`}>{item.points} pts</p>
                {item.description && (
                  <p className={`text-[11px] mt-1 line-clamp-2 ${locked ? "text-bone/30" : "text-bone/60"}`}>
                    {item.description}
                  </p>
                )}
                {locked ? (
                  <span className="block mt-2 text-center text-[11px] font-semibold border border-gold/30 text-bone/50 rounded-md py-1.5">
                    🔒 Bloqueado
                  </span>
                ) : (
                  <span className="block mt-2 text-center text-[11px] font-semibold bg-gold text-ink rounded-md py-1.5">
                    Resgatar
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {confirmItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6 text-center">
            <p className="text-3xl mb-2">🎁</p>
            <h3 className="font-display text-xl text-bone mb-2">Confirmar resgate?</h3>
            <p className="text-sm text-bone/70 mb-2">
              Confirmar o resgate de <b>{confirmItem.name}</b> por <b>{confirmItem.points} pontos</b>?
            </p>
            <p className="text-xs text-bone/50 mb-6">{confirmItem.description || ""}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)} className="flex-1 border border-gold/30 rounded-md py-2 text-sm text-bone">
                Cancelar
              </button>
              <button disabled={isPending} onClick={confirmRedeem} className="flex-1 bg-gold text-ink rounded-md py-2 text-sm font-semibold">
                {isPending ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {failMsg && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6 text-center">
            <p className="text-3xl mb-2">🔒</p>
            <h3 className="font-display text-xl text-bone mb-2">Saldo insuficiente</h3>
            <p className="text-sm text-bone/70 mb-6">{failMsg}</p>
            <button onClick={() => setFailMsg(null)} className="w-full border border-gold/30 rounded-md py-2 text-sm text-bone">
              Entendi
            </button>
          </div>
        </div>
      )}

      {okMsg && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full p-6 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <h3 className="font-display text-xl text-bone mb-2">Resgate solicitado!</h3>
            <p className="text-sm text-bone/70 mb-4">{okMsg}</p>
            <p className="text-xs text-gold/80 bg-gold/5 border border-gold/30 rounded-md p-2 mb-4">
              📧 O Ícaro foi avisado por e-mail sobre essa solicitação.
            </p>
            <button onClick={() => setOkMsg(null)} className="w-full bg-gold text-ink rounded-md py-2 text-sm font-semibold">
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
