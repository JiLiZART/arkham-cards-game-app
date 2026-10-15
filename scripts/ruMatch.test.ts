import { describe, expect, it } from "vitest";
import { choose } from "./import-ru-cards";
import { accepted, fileStem, rank, type CardInfo, type ImageInfo } from "./ruMatch";

const card = (code: string, type: string, names: string[], extra: Partial<CardInfo> = {}): CardInfo => ({
  code,
  type,
  landscape: { front: type === "act" || type === "agenda", back: type === "act" || type === "agenda" },
  doubleSided: false,
  names,
  text: {},
  enLength: {},
  ...extra,
});
const img = (file: string, title: string, text: string, landscape = false): ImageInfo => ({ file, source: file.includes("CARDS_ru") ? "cards" : "pdf", landscape, title, text });

// what Tesseract made of the real cards (titles and bodies abridged)
const CARDS: CardInfo[] = [
  card("01111", "location", ["Кабинет"], {
    doubleSided: true,
    enLength: { front: 22, back: 150 },
  }),
  card("01112", "location", ["Прихожая"], { doubleSided: true, enLength: { front: 60, back: 120 } }),
  card("01017", "asset", ["Физическая подготовка"], {
    text: { front: "Умение. Использование (2 ресурса). Пополняйте эти ресурсы в начале каждого раунда. Потратьте 1 ресурс из вашего запаса или с Физической подготовки: Вы получаете +1 или +1 на эту проверку." },
  }),
  card("01091", "asset", ["Физическая подготовка"], {
    text: { front: "Умение. Потратьте 1 ресурс: Вы получаете +1 на эту проверку навыка. Потратьте 1 ресурс: Вы получаете +1 на эту проверку навыка." },
  }),
  card("01108", "act", ["В ловушке", "Дверь в полу"], { doubleSided: true, text: { back: "Введите в игру отложенные локации «Прихожая», «Подвал», «Чердак» и «Гостиная»." } }),
  card("01105", "agenda", ["Что происходит?!", "Что происходит"], { doubleSided: true }),
];

describe("matching Russian card images", () => {
  it("file stems drop copy numbers and notes", () => {
    expect(fileStem("inspired/CARDS_ru/Физическая тренировка 2.JPG")).toBe("Физическая тренировка");
    expect(fileStem("inspired/CARDS_ru/Локации/База/Гостиная (база).jpg")).toBe("Гостиная");
    expect(fileStem("inspired/CARDS_ru/Томпсон 45-го калибра (1).jpg")).toBe("Томпсон 45-го калибра");
  });

  it("the Study's two sides go to the right sides", () => {
    const back = img("inspired/CARDS_ru/Локации/База/Кабинет.jpg", "", "bl изучаете материалы о загадочных событиях, произошедших в Аркхэме за последние несколько дней. Ваш стол завален газетными вырезками, полицейскими отчётами и показаниями свидетелей.");
    const front = img("inspired/CARDS_ru/Локации/База/Кабинет 2.jpg", "| Кабинет a", "a Дверь исчезла! TY Мо");
    expect(accepted(rank(back, CARDS))).toMatchObject({ code: "01111", side: "back" });
    expect(accepted(rank(front, CARDS))).toMatchObject({ code: "01111", side: "front" });
  });

  it("same name, different level: the text decides", () => {
    const lvl0 = img("inspired/CARDS_ru/Физическая тренировка.jpg", ") Физическая тренировка", "Умение. Использование (2 ресурса). Пополняйте эти ресурсы в начале каждого раунда. Потратьте 1 ресурс из вашего запаса или с Физической тренировки: Вы получаете +1 @ или +1 $ на эту проверку.");
    const lvl2 = img("inspired/CARDS_ru/Физическая тренировка 2.JPG", ") Физическая трениронка", "Умение. „М Потратьте 1 ресурс: Вы получаете +1 @ на эту проверку навыка. „“— Потратьте 1 ресурс: Вы получаете +1 $ на эту проверку навыка.");
    expect(accepted(rank(lvl0, CARDS))?.code).toBe("01017");
    expect(accepted(rank(lvl2, CARDS))?.code).toBe("01091");
  });

  it("an act from the PDF matches by orientation and its printed text", () => {
    const act = img(".cache/ru-import/pdf/01_Coreset/img-004-020.jpg", "", "Акт 1а В ловушке Дверь в полу Введите в игру отложенные локации «Прихожая», «Подвал», «Чердак» и «Гостиная».", true);
    expect(accepted(rank(act, CARDS))).toMatchObject({ code: "01108" });
    // a portrait image never matches an act
    expect(rank({ ...act, landscape: false }, CARDS).some((s) => s.code === "01108")).toBe(false);
  });

  it("unrelated cards are not accepted", () => {
    expect(accepted(rank(img("inspired/CARDS_ru/Бензопила.jpg", "Бензопила", "Предмет. Оружие. Битва. Вы получаете +2 на эту атаку."), CARDS))).toBeNull();
  });

  it("CARDS_ru beats the PDF, and overrides pin or reject", () => {
    const s = (code: string, score: number) => [{ code, side: "front" as const, score }];
    const ranked = [
      { img: img(".cache/ru-import/pdf/x/img-1.jpg", "", ""), scores: s("01017", 0.95) },
      { img: img("inspired/CARDS_ru/Физическая тренировка.jpg", "", ""), scores: s("01017", 0.7) },
      { img: img("inspired/CARDS_ru/Кабинет 2.jpg", "", ""), scores: s("01111", 0.9) },
    ];
    const src = (f: string) => (f.includes("CARDS_ru") ? "cards" : "pdf") as "cards" | "pdf";
    const m = choose(ranked, {}, src);
    expect(m["01017"].front?.source).toBe("cards");
    const pinned = choose(ranked, { "01017:front": ".cache/ru-import/pdf/x/img-1.jpg", "01111:front": null, "01112:back": "inspired/CARDS_ru/Локации/База/Прихожая.jpg" }, src);
    expect(pinned["01017"].front).toMatchObject({ source: "pdf", pinned: true });
    expect(pinned["01111"]).toBeUndefined();
    expect(pinned["01112"].back?.pinned).toBe(true);
  });
});
