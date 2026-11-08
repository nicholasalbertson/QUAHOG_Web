/**
 * Declarative mission runtime: phase machine, event bus, and owned-entity
 * cleanup so fail / retry / abandon never leave stale spawns.
 * Independent Mount Hope design — not a port of proprietary mission scripts.
 */

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

  start(mi: number, step = 0, failSec: number | null = null): void {
    this.cleanupOwned();
    this.phase = "active";
    this.mi = mi;
    this.step = step;
    this.failReason = null;
    this.elapsed = 0;
    this.stepElapsed = 0;
    this.stepFailSec = failSec;
    this.emit({ type: "mission.start", payload: { mi, step } });
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
  advance(dt: number, events: readonly GameEvent[] = []): boolean {
    if (this.phase !== "active") return false;
    this.elapsed += dt;
    this.stepElapsed += dt;

    for (const ev of events) this.emit(ev);

    if (this.stepFailSec != null && this.stepElapsed >= this.stepFailSec) {
      this.fail("Time's up");
      return true;
    }
    return false;
  }

  /** Mark the current step complete and move the cursor (caller owns content). */
  completeStep(nextStep: number, nextFailSec: number | null = null): void {
    if (this.phase !== "active") return;
    this.cleanupStep(this.step);
    this.emit({ type: "mission.step", payload: { from: this.step, to: nextStep } });
    this.step = nextStep;
    this.stepElapsed = 0;
    this.stepFailSec = nextFailSec;
  }

  completeMission(): void {
    this.cleanupOwned();
    this.phase = "complete";
    this.failReason = null;
    this.emit({ type: "mission.complete" });
    this.assertNoLeaks("complete");
  }

  fail(reason: string): void {
    if (this.phase !== "active") return;
    this.cleanupOwned();
    this.phase = "failed";
    this.failReason = reason;
    this.emit({ type: "mission.fail", payload: { reason } });
    this.assertNoLeaks("fail");
  }

  /** Retry the current mission index from the current step (or step 0). */
  retry(fromStep?: number, failSec: number | null = null): void {
    const step = fromStep ?? this.step;
    this.cleanupOwned();
    this.phase = "active";
    this.failReason = null;
    this.step = step;
    this.elapsed = 0;
    this.stepElapsed = 0;
    this.stepFailSec = failSec;
    this.emit({ type: "mission.retry", payload: { mi: this.mi, step } });
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
