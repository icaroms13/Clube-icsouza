type Recommendation = {
  id: string;
  name: string;
  phone: string;
  status: "aguardando" | "agendada" | "realizada" | "naorealizada" | "contando" | "cliente";
  meeting_date: string | null;
  meeting_time: string | null;
  daysLeft?: number;
  daysTotal?: number;
};

function formatPhone(phone: string) {
  if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  if (phone.length === 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
  return phone;
}

function StatusBadge({ status }: { status: Recommendation["status"] }) {
  const map: Record<Recommendation["status"], { label: string; cls: string }> = {
    aguardando: { label: "Aguardando agendamento", cls: "bg-white/5 text-bone/60 border-white/10" },
    agendada: { label: "Reunião agendada", cls: "bg-blue-400/10 text-blue-300 border-blue-400/30" },
    realizada: { label: "Reunião feita · +10 pts", cls: "bg-gold/15 text-gold border-gold/40" },
    naorealizada: { label: "Reunião não aconteceu", cls: "bg-red-400/10 text-red-300 border-red-400/30" },
    contando: { label: "Em contagem p/ +100", cls: "bg-gold/15 text-gold border-gold/40" },
    cliente: { label: "Virou cliente 🎉 +100", cls: "bg-green-400/10 text-green-300 border-green-400/30" },
  };
  const s = map[status];
  return <span className={`text-xs px-3 py-1 rounded-full border ${s.cls}`}>{s.label}</span>;
}

export default function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-bone mb-4">Minhas recomendações</h2>
      {recommendations.length === 0 ? (
        <p className="text-sm text-bone/50">Você ainda não cadastrou nenhuma recomendação.</p>
      ) : (
        <ul className="space-y-3">
          {recommendations.map((r) => (
            <li key={r.id} className="border-b border-white/5 py-2 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-bone text-sm font-medium">{r.name}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-bone/40 text-xs">{formatPhone(r.phone)}</p>
              {r.status === "agendada" && r.meeting_date && (
                <p className="text-xs text-blue-300 mt-1">
                  📅 Reunião marcada para {r.meeting_date.split("-").reverse().join("/")} às {r.meeting_time}
                </p>
              )}
              {r.status === "contando" && r.daysLeft !== undefined && r.daysTotal !== undefined && (
                <div className="mt-1">
                  <div className="w-full h-1.5 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-gold rounded"
                      style={{ width: `${Math.round(((r.daysTotal - r.daysLeft) / r.daysTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-bone/40 mt-1">
                    {r.daysLeft} dias restantes — seus 100 pontos entram automaticamente ao fim da contagem
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
