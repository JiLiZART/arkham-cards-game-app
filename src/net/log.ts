/**
 * A browser's copy of the room's move log. Only the host numbers moves, so every copy is a prefix of one log
 * (ADR-0018): catching up is taking the tail, and a takeover needs no vote.
 */
import type { Numbered, Proposal } from "./moves";

export class MoveLog {
  private list: Numbered[];
  /** moves that arrived before the ones ahead of them */
  private early = new Map<number, Numbered>();

  constructor(moves: Numbered[] = []) {
    this.list = [...moves];
  }

  get n(): number {
    return this.list.length;
  }

  get moves(): readonly Numbered[] {
    return this.list;
  }

  get last(): Numbered | null {
    return this.list[this.list.length - 1] ?? null;
  }

  /** host: the proposal as a numbered move, or why it can't be (it was made on another state than the latest) */
  next(p: Proposal): Numbered | "net.refused.stale" {
    if (p.at !== this.n) return "net.refused.stale";
    return { n: this.n, by: p.by, move: p.move };
  }

  /** take a numbered move: the moves that can now be applied, in order (none for a copy or a move that came early) */
  receive(m: Numbered): Numbered[] {
    if (m.n < this.n) {
      const have = this.list[m.n];
      if (have.by !== m.by || JSON.stringify(have.move) !== JSON.stringify(m.move))
        throw new Error(`move log diverged at ${m.n}`);
      return [];
    }
    this.early.set(m.n, m);
    const out: Numbered[] = [];
    for (let next = this.early.get(this.n); next; next = this.early.get(this.n)) {
      this.early.delete(next.n);
      this.list.push(next);
      out.push(next);
    }
    return out;
  }

  /** the moves from number `from` on */
  tail(from: number): Numbered[] {
    return this.list.slice(from);
  }
}
