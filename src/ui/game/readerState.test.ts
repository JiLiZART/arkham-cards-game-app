import { describe, expect, it } from "vitest";
import type { CampaignState } from "../../engine/campaign/types";
import type { ReaderPage } from "./readerPages";
import { revealAll, skipTo, turnPage, type ReaderState } from "./readerState";

const page = (id: string, kind: ReaderPage["kind"], n: number): ReaderPage => ({
  id,
  kind,
  paragraphs: Array.from({ length: n }, (_, k) => `${id} p${k + 1}`),
  notes: [],
  ...(kind === "prompt" ? { prompt: "chooseOne" as const, step: id.slice(7) } : {}),
});
const waiting = (kind: string, id = "x") =>
  ({ flow: { waiting: { id, step: { kind } }, answers: [] } }) as unknown as CampaignState;

const at = (pages: ReaderPage[], i = 0, revealed = 1): ReaderState => ({
  pages,
  at: i,
  revealed,
  movers: {},
});

describe("turning the pages (3.2)", () => {
  const story = [page("story:a", "story", 3), page("story:b", "story", 1)];

  it("each tap shows the next paragraph, then the next page", () => {
    let r = at(story);
    for (const want of [2, 3]) {
      const t = turnPage(r, waiting("continue"))!;
      r = t.reader;
      expect(r).toMatchObject({ at: 0, revealed: want });
    }
    const t = turnPage(r, waiting("continue"))!;
    expect(t.reader).toMatchObject({ at: 1, revealed: 1 });
    expect(t.flow).toBeUndefined();
  });

  it("past the last page the flow's Continue is answered", () => {
    const r = at(story, 1, 1);
    expect(turnPage(r, waiting("continue"))).toEqual({ reader: r, flow: "continue" });
  });

  it("a prompt or Begin on screen is answered by its own controls, never by a tap", () => {
    const p = at([page("prompt:q", "prompt", 1)]);
    expect(turnPage(p, waiting("chooseOne", "q"))).toBeNull();
    const s = at([page("scenario:s", "scenario", 2)], 0, 2);
    expect(turnPage(s, waiting("play", "play"))).toBeNull();
  });

  it("an answered prompt page can be turned from like any page", () => {
    const r = at([page("prompt:q", "prompt", 1), page("scenario:s", "scenario", 1)]);
    expect(turnPage(r, waiting("play", "play"))?.reader).toMatchObject({ at: 1 });
  });

  it("a page with no text opens with nothing to reveal and turns at once", () => {
    const r = at([page("story:e", "story", 0), page("story:f", "story", 2)], 0, 0);
    expect(turnPage(r, waiting("continue"))?.reader).toMatchObject({ at: 1, revealed: 1 });
  });

  it("the whole page can be shown at once", () => {
    expect(revealAll(at(story)).revealed).toBe(3);
  });
});

describe("skipping (3.2)", () => {
  const pages = [
    page("story:a", "story", 3),
    page("story:b", "story", 2),
    page("prompt:q", "prompt", 1),
    page("story:c", "story", 2),
    page("scenario:s", "scenario", 2),
  ];
  const open = (id: string) => waiting("chooseOne", id);

  it("jumps to the next page that asks something, all its text shown", () => {
    const r = skipTo(at(pages), open("q"));
    expect(r).toMatchObject({ at: 2, revealed: 1 });
  });

  it("goes to the scenario page when nothing asks before it", () => {
    const r = skipTo(at(pages, 3), waiting("play", "play"));
    expect(r).toMatchObject({ at: 4, revealed: 2 });
  });

  it("on the page that asks, it shows the rest of the text and goes no further", () => {
    const r = skipTo(at([page("prompt:q", "prompt", 3)]), open("q"));
    expect(r).toMatchObject({ at: 0, revealed: 3 });
  });

  it("never skips past a prompt that is still open, even from before it", () => {
    expect(skipTo(at(pages, 0), open("q")).at).toBe(2);
  });
});
