/**
 * §2.1.1 Raycast throttle — max N/frame with priority queue.
 */

export interface RaycastRequest {
  id: string;
  priority: number;
  /** Higher = sooner. */
  run: () => void;
}

export class RaycastThrottle {
  private readonly maxPerFrame: number;
  private queue: RaycastRequest[] = [];
  private issued = 0;

  constructor(maxPerFrame = 8) {
    this.maxPerFrame = Math.max(1, maxPerFrame);
  }

  beginFrame(): void {
    this.issued = 0;
  }

  enqueue(req: RaycastRequest): void {
    this.queue.push(req);
  }

  /** Drain up to maxPerFrame, highest priority first. */
  flush(): number {
    if (this.queue.length === 0) return 0;
    this.queue.sort((a, b) => b.priority - a.priority);
    let n = 0;
    while (this.queue.length && this.issued < this.maxPerFrame) {
      const next = this.queue.shift()!;
      next.run();
      this.issued++;
      n++;
    }
    return n;
  }

  get pending(): number {
    return this.queue.length;
  }

  get usedThisFrame(): number {
    return this.issued;
  }
}
