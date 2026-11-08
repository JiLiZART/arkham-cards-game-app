/**
 * Every ability of a Path to Carcosa encounter card that a player uses ([action], [fast] or a reaction, from the card's
 * data or its script) has its label in both locales, `ability.<code>.<index>` (campaign-the-path-to-carcosa task 11.1);
 * so does each of Return to The Path to Carcosa's player cards, 52001–52013 (player-cards-ptc task 9.1), and its
 * encounter cards 52014–52078 (campaign-return-to-the-path-to-carcosa groups 1–9, task 11.2).
 * Without one the option shows the engine's English label (`src/ui/game/optionText.ts`).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { content, loadPack } from ".";
import { scriptOf } from "../engine/world/scripts";
import en from "../../content/i18n/en/ui.json";
import ru from "../../content/i18n/ru/ui.json";

const USED = new Set(["action", "fast", "reaction"]);
const base = (code: string) => code.replace(/[a-z]$/, "");
const codes = (pack: string) =>
  (
    JSON.parse(readFileSync(`content/packs/${pack}/cards.generated.json`, "utf8")) as {
      code: string;
    }[]
  ).map((c) => c.code);
const bases = new Set([
  ...codes("ptc").map(base),
  ...codes("return")
    .map(base)
    .filter((c) => c >= "52001" && c <= "52078"),
]);

beforeAll(async () => {
  await Promise.all([loadPack("ptc"), loadPack("return")]);
});

describe("The Path to Carcosa's ability labels", () => {
  it("each ability a player uses is labelled in English and Russian", () => {
    const missing: string[] = [];
    // each face: the a and b sides, and the c–f faces paired in cards.json
    for (const [code, d] of Object.entries(content.cards)) {
      if (!bases.has(base(code))) continue;
      const abilities = [...d.abilities, ...(scriptOf(content, code)?.abilities ?? [])];
      abilities.forEach((a, k) => {
        if (!USED.has(a.kind)) return;
        const key = `ability.${code}.${k}`;
        if (!(key in en) || !(key in ru)) missing.push(key);
      });
    }
    expect(missing).toEqual([]);
  });
});
