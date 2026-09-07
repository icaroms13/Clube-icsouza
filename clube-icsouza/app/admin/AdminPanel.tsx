"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminLogout, getAdminData } from "@/app/actions/admin";
import RecommendationsTab from "./tabs/RecommendationsTab";
import ClientsTab from "./tabs/ClientsTab";
import RedemptionsTab from "./tabs/RedemptionsTab";
import CatalogTab from "./tabs/CatalogTab";
import CommsTab from "./tabs/CommsTab";
import SettingsTab from "./tabs/SettingsTab";

export type AdminData = Awaited<ReturnType<typeof getAdminData>>;

const TABS = [
  { id: "recs", label: "Recomendações" },
  { id: "clients", label: "Clientes" },
  { id: "redeem", label: "Resgates" },
  { id: "catalog", label: "Catálogo" },
  { id: "comms", label: "Comunicação" },
  { id: "settings", label: "Config" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPanel({ initialData }: { initialData: AdminData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<TabId>("recs");
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const fresh = await getAdminData();
      setData(fresh);
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await adminLogout();
      router.push("/admin");
    });
  }

  const pendingRefs = data.recommendations.filter(
    (r) => r.status === "aguardando" || (r.status === "agendada" && new Date(r.meeting_date + "T" + r.meeting_time) < new Date())
  ).length;
  const pendingRedeems = data.redemptions.filter((r) => r.status === "novo").length;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gold text-xs tracking-[0.3em] uppercase">IC Souza</p>
            <h1 className="font-display text-3xl font-semibold text-bone">Painel Administrativo</h1>
          </div>
          <button onClick={handleLogout} className="text-xs text-bone/50 hover:text-bone/80">
            Sair
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => {
            const badge = t.id === "recs" ? pendingRefs : t.id === "redeem" ? pendingRedeems : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative text-xs px-3 py-2 rounded-md border ${
                  tab === t.id
                    ? "bg-gold/15 border-gold text-gold-light font-semibold"
                    : "bg-white/5 border-transparent text-bone/60"
                }`}
              >
                {t.label}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "recs" && <RecommendationsTab data={data} refresh={refresh} />}
        {tab === "clients" && <ClientsTab data={data} refresh={refresh} />}
        {tab === "redeem" && <RedemptionsTab data={data} refresh={refresh} />}
        {tab === "catalog" && <CatalogTab data={data} refresh={refresh} />}
        {tab === "comms" && <CommsTab data={data} refresh={refresh} />}
        {tab === "settings" && <SettingsTab data={data} refresh={refresh} />}
      </div>
    </main>
  );
}
