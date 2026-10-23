import { describe, expect, it } from "vitest";
import { draftName, draftText, iconTokens } from "./ruText";

describe("Russian print-text drafts", () => {
  it("the name: clean OCR title, else the file name", () => {
    expect(draftName(") Мачете", "inspired/CARDS_ru/Мачете.jpg")).toBe("Мачете");
    expect(draftName("В поди ОС ИНСТ енот", "inspired/CARDS_ru/Локации/База/Кабинет.jpg")).toBe(
      "Кабинет",
    );
    expect(
      draftName(") Физическая трениронка", "inspired/CARDS_ru/Физическая тренировка 2.JPG"),
    ).toBe("Физическая тренировка");
  });

  it("Machete: traits line, then the text with the official icons in order", () => {
    const ocr =
      "м ри ВР = ” й\nПредмет. Оружие. Рукопашный.\n» Битва. Вы получаете +1 % на эту атаку. Если\nатакуемый противник является единственным\nпротивником в вашей зоне угрозы, то эта атака\nнаносит +1 повреждение.\nWe 20";
    const official =
      "[action] <b>Бой</b>. Вы получаете +1 [combat] при этой атаке. Если атакуемый враг — единственный враг, вступивший с вами в схватку, эта атака наносит +1 урон.";
    expect(iconTokens(official)).toEqual(["[action]", "[combat]"]);
    const d = draftText(ocr, official);
    expect(d.traits).toEqual(["Предмет", "Оружие", "Рукопашный"]);
    expect(d.text).toBe(
      "[action] Битва. Вы получаете +1 [combat] на эту атаку. Если\nатакуемый противник является единственным\nпротивником в вашей зоне угрозы, то эта атака\nнаносит +1 повреждение.",
    );
    expect(d.iconsUnsure).toBe(false);
  });

  it("a dash in the text is not an icon", () => {
    expect(draftText("Враг — единственный, и это всё.", "[action] Fight.").text).toBe(
      "Враг — единственный, и это всё.",
    );
  });

  it("flags a text whose icons don't line up", () => {
    expect(
      draftText(
        "Умение.\nПотратьте 1 ресурс: Вы получаете +1 на эту проверку навыка.",
        "[fast] Spend 1 resource: You get +1 [willpower] for this skill test.",
      ).iconsUnsure,
    ).toBe(true);
  });
});
