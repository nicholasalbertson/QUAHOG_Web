/**
 * Declarative mission runtime: phase machine, event bus, and owned-entity
 * cleanup so fail / retry / abandon never leave stale spawns.
 * Independent Mount Hope design — not a port of proprietary mission scripts.
 */

import { isSpawnKind, type SpawnKind } from "../registries";
import { failReasonLabel, normalizeFailReason, type FailReason } from "./FailReasons";
import { rng } from "./Rng";
import { evalTrigger, type Trigger } from "./Triggers";

export type MissionPhase = "idle" | "active" | "failed" | "complete" | "abandoned";

export interface GameEvent {
  type: string;
  actorId?: string;
  entityId?: string;
  at?: number;
  payload?: unknown;
}

export interface OwnedEntity {
  id: string;
  kind: string;
  /** Optional step scope — cleaned when the step advances if set. */
  step?: number;
  cleanup: () => void;
}

export interface MissionRuntimeSnapshot {
  phase: MissionPhase;
  mi: number;
  step: number;
  failReason: string | null;
  elapsed: number;
  stepElapsed: number;
}

/** §1.3.30 Checkpoint — enough to retry to an identical hash (modulo RNG). */
export interface MissionCheckpoint {
  snap: MissionRuntimeSnapshot;
  worldHash: string;
  ownedSeeds: { id: string; kind: string; step?: number }[];
  inventory: Record<string, number>;
  position: { x: number; z: number };
  hp: number;
  police: number;
  rngDigest?: string;
}

export type ObjectiveState = "pending" | "active" | "complete" | "failed";

type EventHandler = (e: GameEvent) => void;

export class MissionRuntime {
  phase: MissionPhase = "idle";
  mi = 0;
  step = 0;
  failReason: string | null = null;
  /** Seconds elapsed on the whole mission since start/retry. */
  elapsed = 0;
  /** Seconds elapsed on the current step. */
  stepElapsed = 0;
  /** Optional per-step fail deadline (seconds). Null = no timer. */
  stepFailSec: number | null = null;

  private owned = new Map<string, OwnedEntity>();
  private listeners = new Map<string, Set<EventHandler>>();
  private anyListeners = new Set<EventHandler>();
  /** §1.3.5 Event log ring buffer (last 256). */
  private log: GameEvent[] = [];
  private logHead = 0;
  private emitting = false;
  private emitQueue: GameEvent[] = [];
  private triggers: Trigger[] = [];
  private checkpoint: MissionCheckpoint | null = null;
  private economyDipGuard = false;
  objectiveState: ObjectiveState = "pending";

  start(mi: number, step = 0, failSec: number | null = null): void {
    this.cleanupOwned();
    this.clearTriggers();
    this.phase = "active";
    this.mi = mi;
    this.step = step;
    this.failReason = null;
    this.elapsed = 0;
    this.stepElapsed = 0;
    this.stepFailSec = failSec;
    this.economyDipGuard = false;
    this.objectiveState = "active";
    this.emit({ type: "mission.start", payload: { mi, step } });
  }

  /**
   * §1.3.30 Capture checkpoint for exact retry.
   */
  captureCheckpoint(opts: {
    worldHash: string;
    inventory?: Record<string, number>;
    position: { x: number; z: number };
    hp?: number;
    police?: number;
    rngDigest?: string;
  }): MissionCheckpoint {
    const cp: MissionCheckpoint = {
      snap: this.serialize(),
      worldHash: opts.worldHash,
      ownedSeeds: [...this.owned.values()].map((e) => ({
        id: e.id,
        kind: e.kind,
        step: e.step,
      })),
      inventory: { ...(opts.inventory ?? {}) },
      position: { ...opts.position },
      hp: opts.hp ?? 100,
      police: opts.police ?? 0,
      rngDigest: opts.rngDigest,
    };
    this.checkpoint = cp;
    this.emit({ type: "mission.checkpoint", payload: { hash: cp.worldHash } });
    return cp;
  }

  lastCheckpoint(): MissionCheckpoint | null {
    return this.checkpoint;
  }

  /** §1.3.34 Replay completed mission must not double-dip economy. */
  markEconomySettled(): void {
    this.economyDipGuard = true;
  }

  canAwardEconomy(): boolean {
    return !this.economyDipGuard;
  }

  /**
   * §1.3.6 / §1.3.11 Deterministic spawn — id entropy from missions RNG stream.
   */
  spawn(
    kind: SpawnKind | string,
    cleanup: () => void,
    opts: { step?: number; id?: string } = {},
  ): OwnedEntity {
    const resolved: string = isSpawnKind(kind) ? kind : kind;
    const id = opts.id ?? `${resolved}-${rng.stream("missions").int(0, 1_000_000_000)}`;
    const entity: OwnedEntity = { id, kind: resolved, step: opts.step, cleanup };
    this.claim(entity);
    return entity;
  }

  /** §1.3.12–18 Register triggers evaluated in advance(). */
  addTrigger(t: Trigger): void {
    this.triggers.push({ ...t, armed: t.armed !== false, fired: false });
  }

  clearTriggers(): void {
    this.triggers = [];
  }

  /** Register a mission-owned entity; cleaned on fail/retry/abandon/complete. */
  claim(entity: OwnedEntity): void {
    const prev = this.owned.get(entity.id);
    if (prev) {
      try { prev.cleanup(); } catch { /* ignore */ }
    }
    this.owned.set(entity.id, entity);
  }

  release(id: string, runCleanup = true): void {
    const e = this.owned.get(id);
    if (!e) return;
    this.owned.delete(id);
    if (runCleanup) {
      try { e.cleanup(); } catch { /* ignore */ }
    }
  }

  has(id: string): boolean {
    return this.owned.has(id);
  }

  get ownedCount(): number {
    return this.owned.size;
  }

  ownedIds(): string[] {
    return [...this.owned.keys()];
  }

  /** Drop every owned entity (and run cleanups). */
  cleanupOwned(): void {
    for (const e of this.owned.values()) {
      try { e.cleanup(); } catch { /* ignore */ }
    }
    this.owned.clear();
  }

  /** Drop entities scoped to the previous step after a successful advance. */
  cleanupStep(step: number): void {
    for (const [id, e] of [...this.owned]) {
      if (e.step === step) {
        this.owned.delete(id);
        try { e.cleanup(); } catch { /* ignore */ }
      }
    }
  }

  on(type: string, handler: EventHandler): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
    return () => { set!.delete(handler); };
  }

  onAny(handler: EventHandler): () => void {
    this.anyListeners.add(handler);
    return () => { this.anyListeners.delete(handler); };
  }

  emit(event: GameEvent): void {
    const e = { ...event, at: event.at ?? this.elapsed };
    // §1.3.3 Re-entrancy: queue emits that happen during emit.
    if (this.emitting) {
      this.emitQueue.push(e);
      return;
    }
    this.emitting = true;
    this.pushLog(e);
    this.dispatch(e);
    while (this.emitQueue.length) {
      const next = this.emitQueue.shift()!;
      this.pushLog(next);
      this.dispatch(next);
    }
    this.emitting = false;
  }

  private pushLog(e: GameEvent): void {
    if (this.log.length < 256) this.log.push(e);
    else {
      this.log[this.logHead] = e;
      this.logHead = (this.logHead + 1) % 256;
    }
  }

  private dispatch(e: GameEvent): void {
    // §1.3.4 Listener error isolation.
    for (const h of this.anyListeners) {
      try { h(e); } catch (err) { console.warn("[MissionRuntime] listener", err); }
    }
    const set = this.listeners.get(e.type);
    if (!set) return;
    for (const h of set) {
      try { h(e); } catch (err) { console.warn("[MissionRuntime] listener", e.type, err); }
    }
  }

  /** Snapshot of the ring buffer (oldest → newest). */
  eventLog(): readonly GameEvent[] {
    if (this.log.length < 256) return this.log.slice();
    return [...this.log.slice(this.logHead), ...this.log.slice(0, this.logHead)];
  }

  /** §1.3.10 Leak detector — owned count must be 0 after mission end. */
  assertNoLeaks(label = "mission-end"): void {
    if (this.ownedCount === 0) return;
    const ids = this.ownedIds().join(",");
    console.warn(`[MissionRuntime] leak ${label}: owned=${this.ownedCount} [${ids}]`);
  }

  /**
   * Advance timers and process a batch of world events.
   * Returns true if the mission just failed this tick.
   */
  advance(
    dt: number,
    events: readonly GameEvent[] = [],
    pose?: { x: number; z: number; hp?: number; inventory?: Record<string, number>; flag?: (k: string) => boolean },
  ): boolean {
    if (this.phase !== "active") return false;
    this.elapsed += dt;
    this.stepElapsed += dt;

    for (const ev of events) this.emit(ev);

    if (pose) {
      for (const t of this.triggers) {
        if (
          evalTrigger(t, {
            x: pose.x,
            z: pose.z,
            dt,
            hp: pose.hp,
            inventory: pose.inventory,
            flag: pose.flag,
          })
        ) {
          this.emit({ type: "mission.trigger", payload: { id: t.id, kind: t.kind } });
        }
      }
    }

    if (this.stepFailSec != null && this.stepElapsed >= this.stepFailSec) {
      this.fail("timeout");
      return true;
    }
    return false;
  }

  /** Mark the current step complete and move the cursor (caller owns content). */
  completeStep(nextStep: number, nextFailSec: number | null = null): void {
    if (this.phase !== "active") return;
    this.cleanupStep(this.step);
    this.emit({ type: "mission.step.changed", payload: { from: this.step, to: nextStep } });
    this.emit({ type: "mission.step", payload: { from: this.step, to: nextStep } });
    this.step = nextStep;
    this.stepElapsed = 0;
    this.stepFailSec = nextFailSec;
    this.objectiveState = "active";
  }

  completeMission(): void {
    this.cleanupOwned();
    this.phase = "complete";
    this.failReason = null;
    this.objectiveState = "complete";
    this.markEconomySettled();
    this.emit({ type: "mission.complete" });
    this.assertNoLeaks("complete");
  }

  fail(reason: string | FailReason): void {
    if (this.phase !== "active") return;
    this.cleanupOwned();
    this.phase = "failed";
    const normalized = normalizeFailReason(String(reason));
    this.failReason = failReasonLabel(normalized);
    this.objectiveState = "failed";
    this.emit({
      type: "mission.fail",
      payload: { reason: this.failReason, code: normalized },
    });
    this.assertNoLeaks("fail");
  }

  /**
   * §1.3.31–32 Retry from checkpoint when available; assert world hash match.
   */
  retry(fromStep?: number, failSec: number | null = null): MissionCheckpoint | null {
    const cp = this.checkpoint;
    const step = fromStep ?? cp?.snap.step ?? this.step;
    this.cleanupOwned();
    this.phase = "active";
    this.failReason = null;
    this.step = step;
    this.elapsed = cp?.snap.elapsed ?? 0;
    this.stepElapsed = 0;
    this.stepFailSec = failSec;
    this.objectiveState = "active";
    this.emit({
      type: "mission.retry",
      payload: { mi: this.mi, step, hash: cp?.worldHash ?? null },
    });
    return cp;
  }

  /** §1.3.32 Assert retry restores identical world hash. */
  assertCheckpointHash(currentHash: string): boolean {
    if (!this.checkpoint) return false;
    const ok = this.checkpoint.worldHash === currentHash;
    if (!ok) {
      console.warn(
        `[MissionRuntime] checkpoint hash mismatch want=${this.checkpoint.worldHash} got=${currentHash}`,
      );
    }
    return ok;
  }

  abandon(): void {
    this.cleanupOwned();
    this.phase = "abandoned";
    this.failReason = null;
    this.emit({ type: "mission.abandon" });
    this.assertNoLeaks("abandon");
  }

  serialize(): MissionRuntimeSnapshot {
    return {
      phase: this.phase,
      mi: this.mi,
      step: this.step,
      failReason: this.failReason,
      elapsed: this.elapsed,
      stepElapsed: this.stepElapsed,
    };
  }

  hydrate(snap: MissionRuntimeSnapshot, failSec: number | null = null): void {
    this.cleanupOwned();
    this.phase = snap.phase === "failed" || snap.phase === "abandoned" ? "active" : snap.phase;
    // Load never restores a failed/abandoned soft-lock — resume as active.
    if (snap.phase === "failed" || snap.phase === "abandoned") this.phase = "active";
    this.mi = snap.mi;
    this.step = snap.step;
    this.failReason = null;
    this.elapsed = snap.elapsed;
    this.stepElapsed = 0;
    this.stepFailSec = failSec;
  }
}
