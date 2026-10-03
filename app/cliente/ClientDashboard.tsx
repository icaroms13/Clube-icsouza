"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { getDashboardData } from "@/app/actions/client";
import PointsMedallion from "@/components/PointsMedallion";
import RecommendationForm from "@/components/RecommendationForm";
import RecommendationList from "@/components/RecommendationList";
import RewardsCatalog from "@/components/RewardsCatalog";
import RulesModal from "@/components/RulesModal";
import ClientProfile from "@/components/ClientProfile";

type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboardData>>>;

export default function ClientDashboard({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [showProfile, setShowProfile] = useState(false);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const fresh = await getDashboardData();
      if (fresh) setData(fresh);
      else router.push("/"); // apólice foi cancelada nesse meio tempo
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/");
    });
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <RulesModal text={data.rulesText} />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gold text-xs tracking-[0.3em] uppercase">IC Souza</p>
            <h1 className="font-display text-3xl font-semibold text-bone">Clube de Recomendações</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowProfile(true)} className="text-xs text-bone/50 hover:text-bone/80">
              Perfil
            </button>
            <button onClick={handleLogout} className="text-xs text-bone/50 hover:text-bone/80">
              Sair
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <PointsMedallion points={data.points} />
          <RecommendationForm onSaved={refresh} />
          <RecommendationList recommendations={data.recommendations} />
          <RewardsCatalog catalog={data.catalog} points={data.points} onRedeemed={refresh} />
        </div>
      </div>

      {showProfile && (
        <ClientProfile
          cpf={data.cpf}
          email={data.email}
          onClose={() => setShowProfile(false)}
          onUpdated={refresh}
        />
      )}
    </main>
  );
}
