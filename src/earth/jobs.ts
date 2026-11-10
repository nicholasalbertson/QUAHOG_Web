// Earth-only jobs. They use latitude and longitude so a frame rebase does
// not move the objective. The shared MISSIONS list is left alone: stylized
// saves index into it.

import type { RegionId } from "./regions";

export interface JobStep {
  text: string;
  lat: number;
  lon: number;
  radius: number;
  needCar?: boolean;
  noHeat?: boolean;
  reward?: number;
}

export interface EarthJob {
  id: string;
  region: RegionId;
  regionLabel: string;
  title: string;
  steps: JobStep[];
}

export const REGION_JOBS: EarthJob[] = [
  {
    id: "fr-quequechan",
    region: "fallRiver",
    regionLabel: "Fall River",
    title: "Under the Braga",
    steps: [
      { text: "Walk the Quequechan at The Narrows.", lat: 41.7028, lon: -71.1575, radius: 45 },
      { text: "Drive to Battleship Cove.", lat: 41.7044, lon: -71.1641, radius: 55, needCar: true },
      { text: "Leave the car at Government Center.", lat: 41.7015, lon: -71.1547, radius: 50, reward: 250 },
    ],
  },
  {
    id: "nb-whaling",
    region: "newBedford",
    regionLabel: "New Bedford",
    title: "Johnny Cake Hill",
    steps: [
      { text: "Drive to Seamen's Bethel.", lat: 41.636, lon: -70.9205, radius: 50, needCar: true },
      { text: "Walk the State Pier.", lat: 41.6342, lon: -70.9188, radius: 45 },
      { text: "Reach Fort Taber with no heat.", lat: 41.5935, lon: -70.9002, radius: 70, needCar: true, noHeat: true, reward: 400 },
    ],
  },
  {
    id: "br-main",
    region: "brockton",
    regionLabel: "Brockton",
    title: "Down Main",
    steps: [
      { text: "Drive to downtown Brockton.", lat: 42.08229, lon: -71.02002, radius: 55, needCar: true },
      { text: "Continue south to Campello.", lat: 42.068, lon: -71.0185, radius: 55, needCar: true },
      { text: "Park at Westgate with no heat.", lat: 42.0924, lon: -71.0456, radius: 60, needCar: true, noHeat: true, reward: 350 },
    ],
  },
  {
    id: "cape-canal",
    region: "cape",
    regionLabel: "Cape Cod",
    title: "Over the canal",
    steps: [
      { text: "Cross to the Bourne Bridge.", lat: 41.7476, lon: -70.5902, radius: 80, needCar: true },
      { text: "Drive to Hyannis Harbor.", lat: 41.65075, lon: -70.27325, radius: 60, needCar: true },
      { text: "Finish at MacMillan Wharf.", lat: 42.0519, lon: -70.1856, radius: 70, needCar: true, reward: 600 },
    ],
  },
  {
    id: "sc-towns",
    region: "southCoast",
    regionLabel: "South Coast",
    title: "The towns between",
    steps: [
      { text: "Stop in Fairhaven center.", lat: 41.6375, lon: -70.9038, radius: 50, needCar: true },
      { text: "Take I-195 to Wareham.", lat: 41.758, lon: -70.722, radius: 60, needCar: true },
      { text: "Reach Taunton Green with no heat.", lat: 41.9002, lon: -71.0899, radius: 55, needCar: true, noHeat: true, reward: 450 },
    ],
  },
];

const done = new Set<string>();
let activeId: string | null = null;
let activeStep = 0;

export function jobById(id: string): EarthJob | undefined {
  return REGION_JOBS.find((job) => job.id === id);
}

export function resetJobs(): void {
  done.clear();
  activeId = null;
  activeStep = 0;
}

export function isJobDone(id: string): boolean {
  return done.has(id);
}

export function currentJob(): { job: EarthJob; step: JobStep; index: number } | null {
  if (!activeId) return null;
  const job = jobById(activeId);
  if (!job) return null;
  const step = job.steps[activeStep];
  if (!step) return null;
  return { job, step, index: activeStep };
}

export function startJob(id: string): boolean {
  if (activeId || done.has(id) || !jobById(id)) return false;
  activeId = id;
  activeStep = 0;
  return true;
}

/** Complete the current step. Returns the reward when the chain finishes. */
export function advanceJob(): { finished: boolean; reward: number; text: string } | null {
  const cur = currentJob();
  if (!cur) return null;
  const reward = cur.step.reward ?? 0;
  const text = cur.step.text;
  if (cur.index + 1 >= cur.job.steps.length) {
    done.add(cur.job.id);
    activeId = null;
    activeStep = 0;
    return { finished: true, reward, text };
  }
  activeStep += 1;
  return { finished: false, reward, text: cur.job.steps[activeStep].text };
}

export interface JobSave { jobId?: string; jobStep?: number; jobsDone: string[] }

export function jobSnapshot(): JobSave {
  const save: JobSave = { jobsDone: [...done] };
  if (activeId) { save.jobId = activeId; save.jobStep = activeStep; }
  return save;
}

export function loadJobs(save: { jobId?: string; jobStep?: number; jobsDone?: string[] } | null | undefined): void {
  resetJobs();
  if (!save) return;
  for (const id of save.jobsDone ?? []) if (jobById(id)) done.add(id);
  if (save.jobId && jobById(save.jobId) && !done.has(save.jobId)) {
    activeId = save.jobId;
    const job = jobById(save.jobId)!;
    const step = save.jobStep ?? 0;
    activeStep = step >= 0 && step < job.steps.length ? Math.floor(step) : 0;
  }
}
