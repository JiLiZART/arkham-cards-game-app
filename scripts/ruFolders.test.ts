import { describe, expect, it } from "vitest";
import { codePrefix, parseImageName, pdfScope, resolveFolder, type CodeInfo } from "./ruFolders";

describe("parseImageName", () => {
  it("reads a bare number as a front, a/b as the two sides, _k as a one-sided card with k copies", () => {
    expect(parseImageName("01.png")).toEqual({ from: 1, to: 1, side: "front" });
    expect(parseImageName("104a.png")).toEqual({ from: 104, to: 104, side: "front" });
    expect(parseImageName("104b.png")).toEqual({ from: 104, to: 104, side: "back" });
    expect(parseImageName("144_3.png")).toEqual({ from: 144, to: 144, side: "front", copies: 3 });
  });

  it("takes Cyrillic look-alikes, a space before the letter, and a trailing underscore", () => {
    expect(parseImageName("129а.png")).toEqual({ from: 129, to: 129, side: "front" });
    expect(parseImageName("63 б.jpg")).toEqual({ from: 63, to: 63, side: "back" });
    expect(parseImageName("5 a.jpg")).toEqual({ from: 5, to: 5, side: "front" });
    expect(parseImageName("05b_.png")).toEqual({ from: 5, to: 5, side: "back" });
  });

  it("reads 128-129b as one back for a run of cards, and (2) as two copies", () => {
    expect(parseImageName("128-129b.png")).toEqual({ from: 128, to: 129, side: "back" });
    expect(parseImageName("231 (2).png")).toEqual({ from: 231, to: 231, side: "front", copies: 2 });
  });

  it("drops a short letter prefix and an underscore before the side letter", () => {
    expect(parseImageName("RPC 36_1.png")).toEqual({ from: 36, to: 36, side: "front", copies: 1 });
    expect(parseImageName("RPC 15b_1.png")).toEqual({ from: 15, to: 15, side: "back" });
    expect(parseImageName("NC_01_a.png")).toEqual({ from: 1, to: 1, side: "front" });
    expect(parseImageName("NC_09_2.png")).toEqual({ from: 9, to: 9, side: "front", copies: 2 });
  });

  it("leaves everything else alone: minis, helps, act sides, variants", () => {
    for (const n of ["01mini_a.png", "Help1.png", "68 Act 2 A.jpg", "178b-5.png", "NC-back.png", "notes.txt"]) expect(parseImageName(n)).toBeNull();
  });
});

describe("codePrefix", () => {
  it("numbered folders carry their cycle number, Return-to folders count from 50, standalones have their own", () => {
    expect(codePrefix("02_01_музей")).toBe("02");
    expect(codePrefix("07_02_В_Пучину")).toBe("07");
    expect(codePrefix("01R_Возвращение_к_ночи_фанатиков")).toBe("50");
    expect(codePrefix("03R_Возвращение_в_Каркозу")).toBe("52");
    expect(codePrefix("sa_01_проклятие_ругару")).toBe("81");
    expect(codePrefix("SA_03_Лабиринты_безумия")).toBe("70");
  });

  it("starter decks are numbered inside the 60 range, a hundred per deck", () => {
    expect(codePrefix("SD_01_Nathaniel_Cho")).toBe("601");
    expect(codePrefix("SD_05_Stella_Clark")).toBe("605");
  });

  it("returns null for folders without a known code range", () => {
    expect(codePrefix("books")).toBeNull();
    expect(codePrefix("PI_03_Кровная_Вражда")).toBeNull();
  });
});

describe("resolveFolder", () => {
  const codes = new Map<string, CodeInfo>([
    ["02105", { quantity: 2, doubleSided: false }],
    ["02118", { quantity: 1, doubleSided: true }],
    ["02128", { quantity: 1, doubleSided: true }],
    ["02129", { quantity: 1, doubleSided: true }],
  ]);
  const at = (files: string[]) => resolveFolder("02_01_музей", files, codes);

  it("maps each file to a card side by number", () => {
    const r = at(["105_2.png", "118a.png", "118b.png"]);
    expect(r.picks).toEqual([
      { code: "02105", side: "front", file: "105_2.png" },
      { code: "02118", side: "front", file: "118a.png" },
      { code: "02118", side: "back", file: "118b.png" },
    ]);
  });

  it("gives a shared back to every card in its run", () => {
    const r = at(["128-129b.png"]);
    expect(r.picks.map((p) => `${p.code}:${p.side}`)).toEqual(["02128:back", "02129:back"]);
  });

  it("rejects a file whose copies disagree with the card's quantity, and a back for a one-sided card", () => {
    const r = at(["105_3.png", "105b.png", "999a.png", "mini.png"]);
    expect(r.picks).toEqual([]);
    expect(r.rejected.sort()).toEqual(["105_3.png", "105b.png", "999a.png"].sort());
    expect(r.unparsed).toEqual(["mini.png"]);
  });

  it("a front is the best of several files for the same side: the first in name order wins, the rest are listed as extra", () => {
    const r = at(["118a.png", "118 a.png"]);
    expect(r.picks).toHaveLength(1);
    expect(r.extra).toHaveLength(1);
  });
});

describe("resolveFolder in a starter deck", () => {
  it("NC_09_2 in the first starter deck is card 60109", () => {
    const codes = new Map<string, CodeInfo>([["60109", { quantity: 2, doubleSided: false }]]);
    expect(resolveFolder("SD_01_Nathaniel_Cho", ["NC_09_2.png"], codes).picks).toEqual([{ code: "60109", side: "front", file: "NC_09_2.png" }]);
  });
});

describe("pdfScope", () => {
  it("a cycle's PDF is matched against that cycle's cards only", () => {
    expect(pdfScope("02_01_Мескатонский_музей.pdf")).toEqual(["02"]);
    expect(pdfScope("07_02_В_Глубины.pdf")).toEqual(["07"]);
    expect(pdfScope("01_к базе для 3-4чел_a4.pdf")).toEqual(["01"]);
  });

  it("a Return-to PDF covers its own codes and its cycle's", () => {
    expect(pdfScope("03R_Возвращение_в_Каркозу.pdf")).toEqual(["52", "03"]);
    expect(pdfScope("02R_только_карты_сыщиков.pdf")).toEqual(["51", "02"]);
  });

  it("standalone scenarios have their own range; sheets with no known range match everything", () => {
    expect(pdfScope("SA_01_проклятие_ругару_А4.pdf")).toEqual(["81"]);
    expect(pdfScope("PI_03.pdf")).toEqual("all");
    expect(pdfScope("SD_01-05.pdf")).toEqual("all");
  });

  it("tokens, the playmat and the superseded sheet are not cards", () => {
    for (const f of ["playmat.pdf", "Arkham Horror The Card Game - жетоны.pdf", "Жетоны Иннсмут.pdf", "SD_01-05(old).pdf"]) expect(pdfScope(f)).toBeNull();
  });
});
