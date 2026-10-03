import { LEVELS, getCurrentLevel, pointsToNextLevel } from "@/lib/levels";

export default function PointsMedallion({ points }: { points: number }) {
  const current = getCurrentLevel(points);
  const toNext = pointsToNextLevel(points);
  const isMaxLevel = toNext === 0 && current.name === LEVELS[LEVELS.length - 1].name;

  return (
    <div className="card p-6 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-gold/80">Seus pontos</p>
      <p className="font-display text-6xl font-semibold text-bone mt-2">{points}</p>
      <div className="gold-divider w-16 mx-auto my-4" />
      <p className="text-sm text-bone/70">
        Nível atual: <span className="text-gold font-semibold">{current.name}</span>
      </p>
      <p className="text-xs text-bone/50 mt-1">
        {isMaxLevel ? "Você alcançou o nível máximo!" : `Faltam ${toNext} pontos para o próximo nível`}
      </p>
    </div>
  );
}
