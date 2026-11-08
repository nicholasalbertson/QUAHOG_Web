/**
 * §2.1.6 WebGL context-loss handler: pause, restore, HUD notice.
 */

export type ContextLossPhase = "ok" | "lost" | "restoring";

export interface ContextLossState {
  phase: ContextLossPhase;
  notice: string | null;
  lostAt: number | null;
}

export type ContextLossListener = (s: ContextLossState) => void;

export class WebGlContextLoss {
  private phase: ContextLossPhase = "ok";
  private notice: string | null = null;
  private lostAt: number | null = null;
  private listeners = new Set<ContextLossListener>();
  private canvas: HTMLCanvasElement | null = null;
  private onLost = (e: Event) => {
    e.preventDefault();
    this.phase = "lost";
    this.lostAt = Date.now();
    this.notice = "Graphics context lost — pausing…";
    this.emit();
  };
  private onRestored = () => {
    this.phase = "restoring";
    this.notice = "Restoring graphics…";
    this.emit();
    // Brief restore window then clear.
    queueMicrotask(() => {
      this.phase = "ok";
      this.notice = null;
      this.lostAt = null;
      this.emit();
    });
  };

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.canvas = canvas;
    canvas.addEventListener("webglcontextlost", this.onLost, false);
    canvas.addEventListener("webglcontextrestored", this.onRestored, false);
  }

  detach(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener("webglcontextlost", this.onLost, false);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored, false);
    this.canvas = null;
  }

  subscribe(fn: ContextLossListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot(): ContextLossState {
    return { phase: this.phase, notice: this.notice, lostAt: this.lostAt };
  }

  /** Test hook. */
  simulateLoss(): void {
    this.onLost(new Event("webglcontextlost"));
  }

  simulateRestore(): void {
    this.onRestored();
  }

  private emit(): void {
    const s = this.snapshot();
    for (const fn of this.listeners) fn(s);
  }
}

export const webGlContextLoss = new WebGlContextLoss();
