import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { I18nCards } from "../src/content/schema";
import { cycleCoverage, mapSnapshotTranslation, translationsByPack } from "./snapshotText";

const en = { code: "02001", name: "Zoey Samaras", subname: "The Chef", traits: "Believer. Hunter.", text: "Reaction: test", back_text: "Deck Size: 30", back_name: "Zoey", flavor: "God spoke" };
const ru = { code: "02001", name: "Зои Самарас", subname: "Повар", traits: "Верующий. Охотник.", text: "[reaction] Тест", back_text: "Размер: 30", back_name: "Зои", flavor: "Господь", back_flavor: "…" };

describe("mapSnapshotTranslation", () => {
  it("keeps the fields the game shows, as our i18n schema has them: traits as a list, back fields camel-cased, no flavour", () => {
    const out = mapSnapshotTranslation(ru, en);
    expect(out).toEqual({ name: "Зои Самарас", subname: "Повар", traits: ["Верующий", "Охотник"], text: "[reaction] Тест", backText: "Размер: 30", backName: "Зои" });
    expect(I18nCards.safeParse({ "02001": out }).success).toBe(true);
  });

  it("leaves out what is empty or equal to English, so English stays the fallback", () => {
    const out = mapSnapshotTranslation({ code: "02001", name: "Zoey Samaras", subname: "", text: "[reaction] Тест", traits: "Believer. Hunter." }, en);
    expect(out).toEqual({ text: "[reaction] Тест" });
    expect(mapSnapshotTranslation({ code: "02001", flavor: "Господь" }, en)).toEqual({});
  });
});

/** a snapshot folder with English packs and a locale's translations: pack/<folder>/<f>.json, translations/<locale>/pack/<folder>/<f>.json */
function snapshot(english: Record<string, unknown[]>, translated: Record<string, unknown[]>) {
  const root = mkdtempSync(join(tmpdir(), "arkham-text-"));
  const put = (base: string, files: Record<string, unknown[]>) => {
    for (const [path, cards] of Object.entries(files)) {
      mkdirSync(join(root, base, path.split("/")[0]), { recursive: true });
      writeFileSync(join(root, base, path), JSON.stringify(cards));
    }
  };
  put("pack", english);
  put("translations/ru/pack", translated);
  return root;
}
const card = (code: string, pack: string, name: string) => ({ code, name, pack_code: pack, type_code: "asset", faction_code: "neutral" });

describe("translationsByPack", () => {
  it("groups a locale's translations by the pack the English card goes to: core's own file, the reprints and other folders separately", () => {
    const root = snapshot(
      { "core/core.json": [card("01016", "core", ".45 Automatic")], "core/core_2026.json": [card("12016", "core_2026", ".45 Automatic")], "dwl/dwl.json": [{ ...en, type_code: "investigator", faction_code: "guardian", pack_code: "dwl" }] },
      { "core/core.json": [{ code: "01016", name: "Кольт" }], "core/core_2026.json": [{ code: "12016", name: "Кольт 2" }], "dwl/dwl.json": [ru] },
    );
    const by = translationsByPack(root, "ru");
    expect([...by.keys()].sort()).toEqual(["core", "core_2026", "dwl"]);
    expect(by.get("dwl")!["02001"].name).toBe("Зои Самарас");
    expect(by.get("core")!["01016"]).toEqual({ name: "Кольт" });
  });

  it("drops translations of codes the English data doesn't have (the reprint stubs), and cards with nothing translated", () => {
    const root = snapshot({ "dwl/dwl.json": [card("02016", "dwl", "Same")] }, { "dwl/dwl.json": [{ code: "02016", name: "Same" }, { code: "02999", name: "Нет" }] });
    expect(translationsByPack(root, "ru").get("dwl") ?? {}).toEqual({});
  });
});

describe("cycleCoverage", () => {
  it("counts a pack's cards and how many have a name in the locale", () => {
    const db = {
      packs: { core: { loaded: true, cards: ["1", "2", "3"] }, dwl: { loaded: true, cards: ["4"] } },
      i18n: { ru: { cards: { "1": { name: "А" }, "2": { text: "только текст" }, "4": { name: "Б" } } } },
    } as never;
    expect(cycleCoverage(db, "ru")).toEqual([
      { pack: "core", cards: 3, translated: 1 },
      { pack: "dwl", cards: 1, translated: 1 },
    ]);
  });
});
