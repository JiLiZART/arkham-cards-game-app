import { describe, expect, it } from "vitest";
import { botChoice } from "../engine/bot";
import { dispatch } from "../engine/engine";
import { db, skipMulligans, start } from "../engine/testkit";
import { layout } from "./layout";
import { optionHome, optionOwner } from "./optionHome";
import { viewerOf } from "./store";

describe("every pending option is reachable without a sidebar", () => {
  for (const scenario of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
    it(`bot playthrough of ${scenario}`, () => {
      let r = skipMulligans(start(scenario, ["01001", "01002", "01004"], 5));
      const problems: string[] = [];
      const seen = new Set<string>();
      for (let step = 0; step < 1500 && r.state.pending; step++) {
        const s = r.state;
        const viewer = viewerOf(s);
        const L = layout(db, s, viewer);
        for (const o of s.pending!.options) {
          const home = optionHome(o, s, viewer);
          seen.add(home);
          const c = o.card ? s.cards[o.card] : null;
          const ok =
            home === "rail" ? !o.card :
            home === "hand" ? !!viewer && s.invs[viewer].hand.includes(o.card!) :
            // "board": on the map, or the viewer's play area strip (assets, threat area, engaged enemies)
            home === "board" ? L.cards.has(o.card!) || (!!c && !!viewer && (((c.zone === "play" || c.zone === "threat") && c.controller === viewer) || (c.zone === "enemy" && c.engagedWith === viewer))) :
            home === "strip" ? !!c && (o.card === s.act || o.card === s.agenda || ["victory", "encounterDiscard", "encounterDeck", "sideDeck"].includes(c.zone)) :
            home === "portrait" ? !!viewer && s.invs[viewer].cardId === o.card :
            /* invModal */ (() => { const w = optionOwner(o, s); return !!w && w !== viewer && !!s.invs[w]; })();
          if (!ok) problems.push(`${s.pending!.kind}: "${o.label}" → ${home} (${c?.zone ?? "no card"})`);
        }
        const next = dispatch(db, s, { type: "choose", inv: s.pending!.inv, option: botChoice(db, r) });
        if (next.error) throw new Error(next.error);
        r = next;
      }
      expect([...new Set(problems)]).toEqual([]);
      expect(seen.has("board") && seen.has("hand") && seen.has("rail")).toBe(true);
    });
  }
});
