/**
 * §10.5 Tutorial beyond tip string — move, drive, mission, wanted.
 */

export type TutorialStepId = "move" | "drive" | "mission" | "wanted" | "done";

export interface TutorialState {
  step: TutorialStepId;
  skipped: boolean;
  completed: boolean;
}

const ORDER: TutorialStepId[] = ["move", "drive", "mission", "wanted", "done"];

export function createTutorial(): TutorialState {
  return { step: "move", skipped: false, completed: false };
}

export function tutorialCopy(step: TutorialStepId): string {
  switch (step) {
    case "move":
      return "Move with the stick or WASD. Look around.";
    case "drive":
      return "Enter a car with E. Throttle, steer, handbrake.";
    case "mission":
      return "Follow the yellow marker to start a job.";
    case "wanted":
      return "Crimes raise heat. Lose cops in fog or a safehouse.";
    case "done":
      return "Tutorial complete.";
  }
}

export function advanceTutorial(s: TutorialState): TutorialState {
  if (s.skipped || s.completed) return s;
  const i = ORDER.indexOf(s.step);
  const next = ORDER[Math.min(ORDER.length - 1, i + 1)]!;
  return {
    ...s,
    step: next,
    completed: next === "done",
  };
}

export function skipTutorial(s: TutorialState): TutorialState {
  return { ...s, skipped: true, completed: true, step: "done" };
}

export function replayTutorial(): TutorialState {
  return createTutorial();
}
