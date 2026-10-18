import { describe, expect, it } from "vitest";
import { ART, artFile, magickArgs, manifestOf, pageLocal, pagesOfList } from "./importArt";

describe("the rulebook art table", () => {
  it("names the cover painting, the parchment pages and the five class pages, each once", () => {
    const names = ART.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(expect.arrayContaining(["title", "parchment", "parchment-wide", "class-guardian", "class-seeker", "class-rogue", "class-mystic", "class-survivor"]));
  });

  it("every entry is an image and its soft mask from the same page, widths sensible for the web", () => {
    for (const a of ART) {
      expect(a.image).toMatch(/^\d{3}-\d{3}$/);
      expect(a.mask).toMatch(/^\d{3}-\d{3}$/);
      expect(a.image.slice(0, 3)).toBe(a.mask.slice(0, 3));
      expect(a.width).toBeGreaterThanOrEqual(800);
      expect(a.width).toBeLessThanOrEqual(1600);
    }
  });
});

describe("artFile", () => {
  it("is where pdfimages leaves the object of a page", () => {
    expect(artFile("/tmp/x", "024-922")).toBe("/tmp/x/i-024-922.png");
  });
});

describe("page-local object numbers", () => {
  const list = ["page num type width height", "--------", " 1 0 image 10 10", " 1 1 image 10 10", " 2 3 image 10 10", " 2 4 smask 10 10", " 3 7 image 10 10"].join("\n");
  it("reads the page of each image from pdfimages' list", () => {
    expect(pagesOfList(list)).toEqual([1, 1, 2, 2, 3]);
  });
  it("counts an image from the first one of its page", () => {
    // images are numbered over the document (0..4); page 2 starts at 2
    expect(pageLocal(pagesOfList(list), "002-003")).toBe("002-001");
    expect(pageLocal(pagesOfList(list), "003-004")).toBe("003-000");
  });
  it("a page without images is an error", () => {
    expect(() => pageLocal(pagesOfList(list), "009-001")).toThrow(/page 9/);
  });
});

describe("magickArgs", () => {
  it("applies the mask as the alpha, lays the result on the page colour and writes a WebP of the given width", () => {
    const args = magickArgs({ name: "title", image: "024-922", mask: "024-923", width: 1400, page: 24, source: "x" }, "/tmp/x", "out/title.webp");
    expect(args.slice(0, 2)).toEqual(["/tmp/x/i-024-922.png", "/tmp/x/i-024-923.png"]);
    expect(args).toContain("| gray=>alpha");
    expect(args).toContain("-flatten");
    expect(args).toEqual(expect.arrayContaining(["-resize", "1400x"]));
    expect(args.at(-1)).toBe("out/title.webp");
  });
});

describe("manifestOf", () => {
  it("lists each file with where it came from, sorted by name", () => {
    const m = manifestOf("inspired/ahc100_rulebook-web.pdf", [
      { name: "title", image: "024-922", mask: "024-923", width: 1400, page: 24, source: "cover painting without the logo" },
      { name: "parchment", image: "006-354", mask: "006-355", width: 1000, page: 6, source: "page background" },
    ]);
    expect(m.source).toBe("inspired/ahc100_rulebook-web.pdf");
    expect(Object.keys(m.files)).toEqual(["parchment", "title"]);
    expect(m.files.title).toEqual({ file: "title.webp", page: 24, object: "024-922", note: "cover painting without the logo" });
  });
});
