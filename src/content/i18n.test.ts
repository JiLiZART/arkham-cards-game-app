import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { cardText, logLabel, scenarioText, t } from "./i18n";
import { buildContent } from "./loader";

describe("translations", () => {
  it("hand-written strings win over imported ones, field by field", () => {
    const { db: d } = buildContent(
      {
        "/content/i18n/ru/ui.generated.json": { a: "generated a", b: "generated b" },
        "/content/i18n/ru/ui.json": { a: "hand a" },
        "/content/i18n/ru/cards.generated.json": { "01020": { name: "Мачете (gen)", text: "текст" } },
        "/content/i18n/ru/cards.json": { "01020": { name: "Мачете" } },
        "/content/i18n/ru/campaigns.generated.json": { scenarios: { s: { name: "gen", resolutions: { R1: { title: "gen R1", text: "gen text" } } } } },
        "/content/i18n/ru/campaigns.json": { scenarios: { s: { resolutions: { R1: { title: "hand R1" } } } } },
      },
      {},
    );
    expect(d.i18n.ru.ui).toEqual({ a: "hand a", b: "generated b" });
    expect(d.i18n.ru.cards["01020"]).toEqual({ name: "Мачете", text: "текст" });
    expect(d.i18n.ru.campaigns.scenarios.s).toEqual({ name: "gen", resolutions: { R1: { title: "hand R1", text: "gen text" } } });
  });

  it("Russian scenario, log and card text come from the imported data", () => {
    expect(scenarioText(db, "the-gathering", "ru").name).toBe("Встреча");
    expect(scenarioText(db, "the-gathering", "en").name).toBe("The Gathering");
    expect(scenarioText(db, "the-gathering", "ru").resolution("R1")?.title).toBe("Исход 1");
    expect(logLabel(db, "night-of-the-zealot", "houseBurned", "ru")).toBe("Ваш дом сгорел дотла.");
    expect(t(db, "ru", "stat.health")).toBe("Здоровье");
    expect(cardText(db, "01001", "ru").name).toBe("Роланд Бэнкс");
  });
});
