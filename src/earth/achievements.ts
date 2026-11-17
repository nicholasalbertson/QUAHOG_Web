// Career counters and the achievement list. Text only. Nothing here phones home.

export interface Career {
  seconds: number;
  meters: number;
  drove: boolean;
  repairs: number;
}

export interface AchievementView {
  id: string;
  name: string;
  detail: string;
  earned: boolean;
}

export interface AchievementInput {
  career: Career;
  jobsDone: readonly string[];
  ownedFronts: number;
  heatSeen: boolean;
}

export const ACHIEVEMENTS: { id: string; name: string; detail: string; test: (input: AchievementInput) => boolean }[] = [
  { id: "first-drive", name: "On the road", detail: "Get in the car.", test: (s) => s.career.drove },
  { id: "ledger", name: "The ledger", detail: "Finish the Fall River chapter.", test: (s) => s.jobsDone.includes("fr-quequechan") },
  { id: "hill", name: "Johnny Cake Hill", detail: "Finish the New Bedford chapter.", test: (s) => s.jobsDone.includes("nb-whaling") },
  { id: "main", name: "Down Main", detail: "Finish the Brockton chapter.", test: (s) => s.jobsDone.includes("br-main") },
  { id: "towns", name: "The towns", detail: "Finish the South Coast chapter.", test: (s) => s.jobsDone.includes("sc-towns") },
  { id: "canal", name: "Over the canal", detail: "Finish the Cape chapter.", test: (s) => s.jobsDone.includes("cape-canal") },
  { id: "front", name: "A place of your own", detail: "Buy a front.", test: (s) => s.ownedFronts > 0 },
  { id: "distance", name: "A long drive", detail: "Cover 5 km in one career.", test: (s) => s.career.meters >= 5000 },
  { id: "heat", name: "They noticed", detail: "Pick up police heat.", test: (s) => s.heatSeen },
];

export function listAchievements(input: AchievementInput): AchievementView[] {
  return ACHIEVEMENTS.map((row) => ({ id: row.id, name: row.name, detail: row.detail, earned: row.test(input) }));
}

export function earnedCount(input: AchievementInput): number {
  return listAchievements(input).filter((row) => row.earned).length;
}
