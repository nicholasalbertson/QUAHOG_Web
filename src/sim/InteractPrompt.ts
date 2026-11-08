/**
 * §10.1.4 / §1.10 Unified interact prompt registry.
 */

export type PromptKind = "enter" | "buy" | "talk" | "sleep" | "shop" | "mission" | "custom";

export interface InteractPrompt {
  id: string;
  kind: PromptKind;
  label: string;
  /** Priority — higher wins when multiple overlap. */
  priority: number;
  x: number;
  z: number;
  radius: number;
}

export class PromptRegistry {
  private items = new Map<string, InteractPrompt>();

  upsert(p: InteractPrompt): void {
    this.items.set(p.id, p);
  }

  remove(id: string): void {
    this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }

  /** Best prompt at player pose, or null. */
  at(x: number, z: number): InteractPrompt | null {
    let best: InteractPrompt | null = null;
    for (const p of this.items.values()) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d > p.radius) continue;
      if (!best || p.priority > best.priority) best = p;
    }
    return best;
  }

  list(): InteractPrompt[] {
    return [...this.items.values()];
  }
}

export const prompts = new PromptRegistry();
