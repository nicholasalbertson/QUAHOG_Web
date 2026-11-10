// Earth campaign. Latitude and longitude so a frame rebase does not move the
// pin. The shared MISSIONS list is left alone: stylized saves index into it.
// Dialogue is text for the subtitle line. No audio files.

import type { RegionId } from "./regions";

export type StepKind = "go" | "deliver" | "chase" | "escape" | "timed" | "photo";

export interface Line { who: string; text: string }

export interface JobStep {
  text: string;
  lat: number;
  lon: number;
  radius: number;
  needCar?: boolean;
  noHeat?: boolean;
  reward?: number;
  kind?: StepKind;
  limitSec?: number;
  checkpoint?: boolean;
  lines?: Line[];
  /** Chase steps start here and run toward lat/lon. */
  fromLat?: number;
  fromLon?: number;
}

export interface EarthJob {
  id: string;
  region: RegionId;
  regionLabel: string;
  title: string;
  who: string;
  /** Front id whose price drops once this chapter is finished. */
  front?: string;
  steps: JobStep[];
}

export const REGION_JOBS: EarthJob[] = [
  {
    id: "fr-quequechan",
    region: "fallRiver",
    regionLabel: "Fall River",
    title: "The Narrows ledger",
    who: "Mira Costa",
    front: "narrowscafe",
    steps: [
      {
        kind: "go", checkpoint: true,
        text: "Walk the Quequechan at The Narrows.",
        lat: 41.7028, lon: -71.1575, radius: 45,
        lines: [
          { who: "Mira Costa", text: "The ledger is under the footbridge. Don't open it on the street." },
          { who: "Mira Costa", text: "Ray is waiting at the Cove. He still thinks this is about boat paint." },
        ],
      },
      {
        kind: "deliver", needCar: true,
        text: "Drive the ledger to Battleship Cove.",
        lat: 41.7044, lon: -71.1641, radius: 55,
        lines: [{ who: "Ray Pacheco", text: "You made it. Government Center closes the book. Don't dawdle." }],
      },
      {
        kind: "timed", needCar: true, limitSec: 180,
        text: "Reach Government Center before the clock runs out.",
        lat: 41.7015, lon: -71.1547, radius: 50,
        lines: [{ who: "Mira Costa", text: "Three minutes. If you're late, we start the walk again." }],
      },
      {
        kind: "photo",
        text: "Photograph the Lizzie Borden House.",
        lat: 41.6993, lon: -71.1558, radius: 40,
        lines: [{ who: "Mira Costa", text: "Second Street. The house is the proof, not the rumor." }],
      },
      {
        kind: "go",
        text: "Ending: bring the ledger home to The Narrows.",
        lat: 41.7028, lon: -71.1575, radius: 45, reward: 250,
        lines: [{ who: "Mira Costa", text: "That's the chapter. Fall River keeps the book." }],
      },
    ],
  },
  {
    id: "nb-whaling",
    region: "newBedford",
    regionLabel: "New Bedford",
    title: "Johnny Cake Hill",
    who: "Lena Duarte",
    front: "whalingcab",
    steps: [
      {
        kind: "go", needCar: true, checkpoint: true,
        text: "Drive to Seamen's Bethel.",
        lat: 41.636, lon: -70.9205, radius: 50,
        lines: [{ who: "Lena Duarte", text: "The hill keeps the names. Photograph the museum, then the pier." }],
      },
      {
        kind: "photo",
        text: "Photograph the Whaling Museum.",
        lat: 41.6355, lon: -70.9233, radius: 40,
        lines: [{ who: "Lena Duarte", text: "Hold still on the steps. The frame is the proof." }],
      },
      {
        kind: "photo", checkpoint: true,
        text: "Photograph the State Pier.",
        lat: 41.6342, lon: -70.9188, radius: 45,
        lines: [{ who: "Cal Souza", text: "They're already looking for the car. Fort Taber, and lose them." }],
      },
      {
        kind: "escape", needCar: true, noHeat: true, limitSec: 240, reward: 400,
        text: "Reach Fort Taber with the heat gone.",
        lat: 41.5935, lon: -70.9002, radius: 70,
        lines: [{ who: "Lena Duarte", text: "If the stars climb, the run is blown. We retry from the pier." }],
      },
      {
        kind: "go", needCar: true,
        text: "Drive the film to Clasky Common.",
        lat: 41.6418, lon: -70.9336, radius: 55,
        lines: [{ who: "Lena Duarte", text: "North end. Then we close it on the hill." }],
      },
      {
        kind: "go",
        text: "Ending: return the names to Seamen's Bethel.",
        lat: 41.636, lon: -70.9205, radius: 50, reward: 200,
        lines: [{ who: "Lena Duarte", text: "Johnny Cake Hill keeps them. This chapter is done." }],
      },
    ],
  },
  {
    id: "br-main",
    region: "brockton",
    regionLabel: "Brockton",
    title: "Down Main",
    who: "Eddie Vara",
    front: "anvil",
    steps: [
      {
        kind: "deliver", needCar: true, checkpoint: true,
        text: "Drop the crate on Main Street.",
        lat: 42.08229, lon: -71.02002, radius: 55,
        lines: [{ who: "Eddie Vara", text: "Main Street. Then you follow the van south. Don't lose it." }],
      },
      {
        kind: "chase", needCar: true, limitSec: 150, checkpoint: true,
        text: "Stay with the van to Campello.",
        fromLat: 42.08229, fromLon: -71.02002,
        lat: 42.068, lon: -71.0185, radius: 50,
        lines: [{ who: "Eddie Vara", text: "The van is moving. Catch it before Campello." }],
      },
      {
        kind: "timed", needCar: true, noHeat: true, limitSec: 200, reward: 350,
        text: "Park at Westgate with no heat.",
        lat: 42.0924, lon: -71.0456, radius: 60,
        lines: [{ who: "Eddie Vara", text: "Clean arrival. The garage keys are in the glove box story, not the car." }],
      },
      {
        kind: "photo",
        text: "Photograph the Rocky Marciano statue.",
        lat: 42.0836, lon: -71.0186, radius: 45,
        lines: [{ who: "Eddie Vara", text: "Downtown Brockton. The statue, then we're square." }],
      },
      {
        kind: "go",
        text: "Ending: park it on Main Street.",
        lat: 42.08229, lon: -71.02002, radius: 55, reward: 200,
        lines: [{ who: "Eddie Vara", text: "Brockton's closed. Don't come back loud." }],
      },
    ],
  },
  {
    id: "sc-towns",
    region: "southCoast",
    regionLabel: "South Coast",
    title: "The towns between",
    who: "Nia Perry",
    front: "dartmall",
    steps: [
      {
        kind: "deliver", needCar: true, checkpoint: true,
        text: "Leave the packet in Fairhaven.",
        lat: 41.6375, lon: -70.9038, radius: 50,
        lines: [{ who: "Nia Perry", text: "Fairhaven first. The towns are the job, not the highway." }],
      },
      {
        kind: "timed", needCar: true, limitSec: 220, checkpoint: true,
        text: "Make Wareham before the clock.",
        lat: 41.758, lon: -70.722, radius: 60,
        lines: [{ who: "Nia Perry", text: "I-195 if you must. Wareham is the stamp." }],
      },
      {
        kind: "escape", needCar: true, noHeat: true, limitSec: 260, reward: 450,
        text: "Reach Taunton Green with the heat gone.",
        lat: 41.9002, lon: -71.0899, radius: 55,
        lines: [{ who: "Nia Perry", text: "Taunton is the last town. Show up quiet." }],
      },
      {
        kind: "go", needCar: true,
        text: "Stop in Padanaram.",
        lat: 41.576, lon: -70.94, radius: 70,
        lines: [{ who: "Nia Perry", text: "The harbor towns, not the highway." }],
      },
      {
        kind: "go",
        text: "Ending: bring the packet back to Fairhaven.",
        lat: 41.6375, lon: -70.9038, radius: 50, reward: 200,
        lines: [{ who: "Nia Perry", text: "The towns between are finished." }],
      },
    ],
  },
  {
    id: "cape-canal",
    region: "cape",
    regionLabel: "Cape Cod",
    title: "Over the canal",
    who: "Jonah Ellis",
    front: "longisland",
    steps: [
      {
        kind: "go", needCar: true, checkpoint: true,
        text: "Cross to the Bourne Bridge.",
        lat: 41.7476, lon: -70.5902, radius: 80,
        lines: [{ who: "Jonah Ellis", text: "The canal is the door. Hyannis is the picture. P-town is the end." }],
      },
      {
        kind: "photo", needCar: true, checkpoint: true,
        text: "Photograph Hyannis Harbor.",
        lat: 41.65075, lon: -70.27325, radius: 60,
        lines: [{ who: "Jonah Ellis", text: "The ferry slips. Get the frame, then run the mid-cape." }],
      },
      {
        kind: "photo", needCar: true,
        text: "Photograph the Sagamore Bridge.",
        lat: 41.7746, lon: -70.5428, radius: 80,
        lines: [{ who: "Jonah Ellis", text: "The other canal bridge. Then the wharf." }],
      },
      {
        kind: "timed", needCar: true, limitSec: 300, reward: 600,
        text: "Ending: tie up at MacMillan Wharf.",
        lat: 42.0519, lon: -70.1856, radius: 70,
        lines: [{ who: "Jonah Ellis", text: "Provincetown. The Cape chapter ends here." }],
      },
    ],
  },
];

const ORDER = REGION_JOBS.map((job) => job.id);
const done = new Set<string>();
let activeId: string | null = null;
let activeStep = 0;
let checkpoint = 0;
let clock = 0;
let line = 0;

export function jobById(id: string): EarthJob | undefined {
  return REGION_JOBS.find((job) => job.id === id);
}

export function resetJobs(): void {
  done.clear();
  activeId = null;
  activeStep = 0;
  checkpoint = 0;
  clock = 0;
  line = 0;
}

export function isJobDone(id: string): boolean {
  return done.has(id);
}

/** Fall River is open. Each later chapter waits for the one before it. */
export function jobUnlocked(id: string): boolean {
  const index = ORDER.indexOf(id);
  if (index < 0) return false;
  if (index === 0) return true;
  return done.has(ORDER[index - 1]);
}

export function currentJob(): { job: EarthJob; step: JobStep; index: number } | null {
  if (!activeId) return null;
  const job = jobById(activeId);
  if (!job) return null;
  const step = job.steps[activeStep];
  if (!step) return null;
  return { job, step, index: activeStep };
}

export function currentLine(): Line | null {
  const cur = currentJob();
  const lines = cur?.step.lines;
  if (!lines || line >= lines.length) return null;
  return lines[line];
}

export function advanceLine(): void {
  const cur = currentJob();
  if (!cur?.step.lines) return;
  if (line < cur.step.lines.length) line += 1;
}

export function jobClock(): number {
  return clock;
}

export function chasePoint(step: JobStep, elapsed: number): { lat: number; lon: number } {
  if (step.kind !== "chase" || step.fromLat == null || step.fromLon == null || !step.limitSec) {
    return { lat: step.lat, lon: step.lon };
  }
  const t = Math.max(0, Math.min(1, elapsed / step.limitSec));
  return {
    lat: step.fromLat + (step.lat - step.fromLat) * t,
    lon: step.fromLon + (step.lon - step.fromLon) * t,
  };
}

export function startJob(id: string): boolean {
  if (activeId || done.has(id) || !jobById(id) || !jobUnlocked(id)) return false;
  activeId = id;
  activeStep = 0;
  checkpoint = 0;
  clock = 0;
  line = 0;
  return true;
}

function armCheckpoint(): void {
  const cur = currentJob();
  if (cur?.step.checkpoint) checkpoint = cur.index;
}

/** Complete the current step. The reward is paid when that step carries one. */
export function advanceJob(): { finished: boolean; reward: number; text: string } | null {
  const cur = currentJob();
  if (!cur) return null;
  const reward = cur.step.reward ?? 0;
  if (cur.index + 1 >= cur.job.steps.length) {
    done.add(cur.job.id);
    activeId = null;
    activeStep = 0;
    clock = 0;
    line = 0;
    return { finished: true, reward, text: cur.step.text };
  }
  activeStep += 1;
  clock = 0;
  line = 0;
  armCheckpoint();
  return { finished: false, reward, text: cur.job.steps[activeStep].text };
}

/** Timer or a blown escape. The step returns to the last checkpoint. */
export function tickJob(dt: number, heat: number): "ok" | "fail" {
  const cur = currentJob();
  if (!cur || dt < 0) return "ok";
  clock += dt;
  const timedOut = cur.step.limitSec != null && clock > cur.step.limitSec;
  const blown = cur.step.kind === "escape" && heat >= 2;
  if (!timedOut && !blown) return "ok";
  activeStep = checkpoint;
  clock = 0;
  line = 0;
  return "fail";
}

export function unlockedFrontIds(): string[] {
  return REGION_JOBS.filter((job) => done.has(job.id) && job.front).map((job) => job.front!);
}

/** Story price is half, once the chapter that mentions the front is done. */
export function frontCost(id: string, base: number, unlocked: readonly string[]): number {
  if (!unlocked.includes(id)) return base;
  return Math.round(base * 0.5);
}

export interface JobSave {
  jobId?: string;
  jobStep?: number;
  jobsDone: string[];
  jobLine?: number;
  jobClock?: number;
  jobCheckpoint?: number;
}

export function jobSnapshot(): JobSave {
  const save: JobSave = { jobsDone: [...done], jobLine: line, jobClock: clock, jobCheckpoint: checkpoint };
  if (activeId) { save.jobId = activeId; save.jobStep = activeStep; }
  return save;
}

export function loadJobs(save: Partial<JobSave> | null | undefined): void {
  resetJobs();
  if (!save) return;
  for (const id of save.jobsDone ?? []) if (jobById(id)) done.add(id);
  if (save.jobId && jobById(save.jobId) && !done.has(save.jobId)) {
    activeId = save.jobId;
    const job = jobById(save.jobId)!;
    const step = save.jobStep ?? 0;
    activeStep = step >= 0 && step < job.steps.length ? Math.floor(step) : 0;
    checkpoint = typeof save.jobCheckpoint === "number" ? Math.max(0, Math.min(activeStep, Math.floor(save.jobCheckpoint))) : activeStep;
    line = typeof save.jobLine === "number" && save.jobLine >= 0 ? Math.floor(save.jobLine) : 0;
    clock = typeof save.jobClock === "number" && save.jobClock >= 0 ? save.jobClock : 0;
  }
}
