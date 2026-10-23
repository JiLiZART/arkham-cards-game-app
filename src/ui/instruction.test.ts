import { describe, expect, it } from "vitest";
import { db, skipMulligans, start } from "../engine/testkit";
import type { ContentDb } from "../engine/types";
import { instructionParts } from "./instruction";

describe("instructionParts", () => {
  const game = skipMulligans(start("the-gathering", ["01001"], 1)).state;
  const ghoul = Object.keys(game.cards)[0];
  const base = { inv: "01001", prompt: "Roland Banks: where does it move?" };

  it("fills the instruction's investigator and card vars", () => {
    const parts = instructionParts(
      { ...base, promptKey: "commitOther", promptVars: { by: "01001", skill: "intellect" } },
      game,
      db,
      "en",
    );
    expect(parts).toContainEqual({ t: "inv", id: "01001" });
    expect(parts).toContainEqual({ t: "icon", name: "intellect" });
    expect(parts[0]).toEqual({ t: "text", s: "Tap a card to help " });
    expect(
      instructionParts(
        { ...base, promptKey: "enemyMoveWhere", promptVars: { card: ghoul } },
        game,
        db,
        "ru",
      ),
    ).toContainEqual({ t: "card", id: ghoul });
  });

  it("falls back to the prompt's sentence when there is no instruction", () => {
    const ui = Object.fromEntries(
      Object.entries(db.i18n.en.ui).filter(([k]) => k !== "instruction.chooseEnemy"),
    );
    const noInstruction: ContentDb = { ...db, i18n: { ...db.i18n, en: { ...db.i18n.en, ui } } };
    expect(
      instructionParts({ ...base, promptKey: "chooseEnemy" }, game, noInstruction, "en"),
    ).toEqual([{ t: "text", s: "choose an enemy" }]);
  });

  it("falls back to the engine's sentence without the name prefix", () => {
    expect(instructionParts({ ...base, promptKey: "noSuchKey" }, game, db, "en")).toEqual([
      { t: "text", s: "where does it move?" },
    ]);
    expect(instructionParts(base, game, db, "en")).toEqual([
      { t: "text", s: "where does it move?" },
    ]);
  });
});
