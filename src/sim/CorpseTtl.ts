/**
 * §13.2 Persistent bodies with TTL + cap.
 */

export interface Corpse {
  id: string;
  x: number;
  z: number;
  age: number;
  kind: "ped" | "cop";
}

export class CorpseField {
  private items: Corpse[] = [];
  constructor(private cap = 24, private ttl = 90) {}

  add(c: Omit<Corpse, "age">): void {
    this.items.push({ ...c, age: 0 });
    this.trim();
  }

  step(dt: number): void {
    for (const c of this.items) c.age += dt;
    this.items = this.items.filter((c) => c.age < this.ttl);
    this.trim();
  }

  private trim(): void {
    if (this.items.length <= this.cap) return;
    this.items.sort((a, b) => b.age - a.age);
    this.items.length = this.cap;
  }

  list(): readonly Corpse[] {
    return this.items;
  }

  get count(): number {
    return this.items.length;
  }
}
