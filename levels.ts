export type Level = {
  name: string;
  minPoints: number;
};

export const LEVELS: Level[] = [
  { name: "Aliado", minPoints: 0 },
  { name: "Guardião", minPoints: 50 },
  { name: "Mentor", minPoints: 150 },
  { name: "Legado", minPoints: 300 },
];

export const POINTS_PER_REFERRAL = 10;
export const POINTS_PER_CLOSED_DEAL = 50;

export function getCurrentLevel(points: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
  }
  return current;
}

export function getNextLevel(points: number): Level | null {
  const next = LEVELS.find((l) => l.minPoints > points);
  return next ?? null;
}

export function pointsToNextLevel(points: number): number {
  const next = getNextLevel(points);
  return next ? next.minPoints - points : 0;
}
