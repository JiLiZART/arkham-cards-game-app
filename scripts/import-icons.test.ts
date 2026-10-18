import { describe, expect, it } from "vitest";
import { buildSymbols, checkIcons, codeIconNames, contentIconNames, setsWithoutIcon, spriteIds, spriteSvg, stripSvg, symbolSet } from "./import-icons";

describe("stripSvg", () => {
  it("keeps the viewBox and every path, drops size, fill, ids and editor metadata", () => {
    const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" id="x" viewBox="0 0 1024 1024" width="1024" height="1024">
      <style>.st0{fill:#020203;}</style><path class="st0" fill="#000" d="M10.26,20.04l5 5z" id="p1"/><path
        d="M1 2h3z" /></svg>`;
    expect(stripSvg(svg)).toEqual({ viewBox: "0 0 1024 1024", body: '<path d="M10,20l5 5z"/><path d="M1 2h3z"/>' });
  });

  it("small boxes keep one decimal and rounding never merges neighbouring numbers", () => {
    // "0.95.3" is two numbers (0.95 and .3); rounded, they must stay two
    expect(stripSvg('<svg viewBox="0 0 10 10"><path d="c0.95.3-1.04-2.5"/></svg>').body).toBe('<path d="c1 .3-1-2.5"/>');
  });

  it("refuses shapes it would silently drop", () => {
    expect(() => stripSvg('<svg viewBox="0 0 10 10"><circle r="3"/></svg>')).toThrow(/only plain <path>/);
    expect(() => stripSvg('<svg viewBox="0 0 10 10"><path transform="scale(2)" d="M0 0"/></svg>')).toThrow(/only plain <path>/);
  });
});

describe("symbol set", () => {
  it("names every layer of the layered icons the code draws", () => {
    const names = codeIconNames();
    for (const n of ["skill_willpower", "skill_willpower_inverted", "health", "health_inverted", "token_symbol_fill", "token_skull_overlay", "token_skull_highlight", "token_number_overlay", "token_-3_highlight", "per_investigator", "unique"]) {
      expect(names, n).toContain(n);
    }
  });

  it("font glyphs keep their font, other names and aliases are extras", () => {
    const set = symbolSet({ fonts: { arkhamicons: ["skull"], tokens: ["skull", "token_symbol_fill"] }, referenced: ["skull", "chaos_bag"], extra: { torch: "the_gathering" } });
    expect(Object.fromEntries(set)).toEqual({
      skull: { file: "skull", set: "arkhamicons" },
      token_symbol_fill: { file: "token_symbol_fill", set: "tokens" },
      chaos_bag: { file: "chaos_bag", set: "extra" },
      torch: { file: "the_gathering", set: "extra" },
    });
  });

  it("fails naming every icon with no source file", () => {
    const set = symbolSet({ fonts: {}, referenced: ["skull", "made_up_icon", "other_missing"], extra: {} });
    const read = (f: string) => (f === "skull" ? '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>' : null);
    expect(() => buildSymbols(set, read)).toThrow("no icon file for: made_up_icon, other_missing");
  });

  it("writes one symbol per name and reads the ids back", () => {
    const set = symbolSet({ fonts: {}, referenced: ["skull"], extra: { torch: "the_gathering" } });
    const svg = spriteSvg(buildSymbols(set, () => '<svg viewBox="0 0 10 20"><path d="M0 0"/></svg>'));
    expect(svg).toContain('<symbol id="skull" viewBox="0 0 10 20"><path d="M0 0"/></symbol>');
    expect(spriteIds(svg)).toEqual(["skull", "torch"]);
  });
});

describe("checkIcons", () => {
  const db = (sets: string[]) => ({ encounterSets: {}, scenarios: { "the-gathering": { encounterSets: sets, sideDecks: {} } } }) as never;
  const manifest = (ids: string[]) => ({ source: "", extra: {}, symbols: Object.fromEntries(ids.map((id) => [id, { file: `${id}.svg`, set: "extra" }])) });

  it("passes when every set and scenario has a symbol and manifest and sprite agree", () => {
    expect(checkIcons(db(["torch"]), manifest(["torch", "the_gathering"]), ["the_gathering", "torch"])).toEqual([]);
  });

  it("fails on an encounter set the sprite does not know", () => {
    const errors = checkIcons(db(["torch", "made_up_set"]), manifest(["torch", "the_gathering"]), ["the_gathering", "torch"]);
    expect(errors.map((e) => e.path)).toEqual(["made_up_set"]);
  });

  it("fails when the manifest and the sprite disagree, or either is missing", () => {
    expect(checkIcons(db([]), manifest(["the_gathering", "skull"]), ["the_gathering", "curse"]).map((e) => e.path)).toEqual(["curse", "skull"]);
    expect(checkIcons(db([]), null, null)).toHaveLength(1);
  });
});

describe("which encounter sets need an icon", () => {
  /** a core card in set "rats", a Dunwich card in set "dealings", a scenario that uses "torch" */
  const db = {
    cards: { "01159": { pack: "core", encounterSet: "rats" }, "02200": { pack: "dwl", encounterSet: "dealings" } },
    encounterSets: { rats: ["01159"], dealings: ["02200"], torch: [] },
    scenarios: { "the-gathering": { encounterSets: ["torch"], sideDecks: {} } },
  } as never;

  it("the sets scenarios use, the scenarios themselves and the core pack's sets; not every set of every pack", () => {
    expect(contentIconNames(db).sort()).toEqual(["rats", "the_gathering", "torch"]);
  });

  it("the other sets are listed by name for the report, once the sprite is known", () => {
    expect(setsWithoutIcon(db, ["torch", "rats"])).toEqual(["dealings"]);
    expect(setsWithoutIcon(db, ["dealings", "torch", "rats"])).toEqual([]);
  });
});
