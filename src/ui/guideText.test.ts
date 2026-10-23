import { describe, expect, it } from "vitest";
import { guideHtml, moreBelow } from "./guideText";

describe("guideHtml", () => {
  it("renders each of the guide's tags as styled text, never as raw tags", () => {
    expect(guideHtml("<fancy>June</fancy>")).toBe('<span class="g-fancy">June</span>');
    expect(guideHtml("<typewriter>Dear sir</typewriter>")).toBe(
      '<span class="g-typewriter">Dear sir</span>',
    );
    expect(guideHtml("<innsmouth>Deep</innsmouth>")).toBe('<span class="g-innsmouth">Deep</span>');
    expect(guideHtml("<game>Title</game>")).toBe('<span class="g-game">Title</span>');
    expect(guideHtml("<smallcaps>Small</smallcaps>")).toBe(
      '<span class="g-smallcaps">Small</span>',
    );
    expect(guideHtml("<center>mid</center>")).toBe('<div class="g-center">mid</div>');
    expect(guideHtml("<right>end</right>")).toBe('<div class="g-right">end</div>');
    expect(guideHtml("<blockquote>said</blockquote>")).toBe('<div class="g-blockquote">said</div>');
    expect(guideHtml("<strike>no</strike>")).toBe("<s>no</s>");
    expect(guideHtml("<i>a</i> <b>b</b>")).toBe("<i>a</i> <b>b</b>");
  });

  it("nests: a centred handwritten date", () => {
    expect(guideHtml("<center><fancy>June 1926</fancy></center>")).toBe(
      '<div class="g-center"><span class="g-fancy">June 1926</span></div>',
    );
  });

  it("shows an unknown tag's text without the tag", () => {
    expect(guideHtml("a <marquee>b</marquee> c")).toBe("a b c");
  });

  it("drops a tag that is not balanced and keeps its text", () => {
    expect(guideHtml("<fancy>never closed")).toBe("never closed");
    expect(guideHtml("stray</fancy> close")).toBe("stray close");
    expect(guideHtml("<b>a<i>b</b>c</i>")).not.toMatch(/<\/i><\/b>/);
  });

  it("escapes everything else: content can't inject HTML", () => {
    const html = guideHtml('<fancy>x</fancy> <script>alert(1)</script> a < b & c "q"');
    expect(html).not.toContain("<script");
    expect(html).toContain("a &lt; b &amp; c");
    expect(guideHtml("<img src=x onerror=alert(1)>")).toBe("");
    expect(guideHtml("&lt;b&gt;")).toBe("&amp;lt;b&amp;gt;");
  });

  it("keeps line breaks and the card markup of its text runs", () => {
    expect(guideHtml("one\ntwo")).toBe("one<br/>two");
    expect(guideHtml("the [[Cultist]] came")).toBe("the <i>Cultist</i> came");
    expect(guideHtml("<center>\nTitle\n</center>\nBody")).toBe(
      '<div class="g-center">Title</div>Body',
    );
  });

  it("handles Russian text and the Russian guide's tags", () => {
    expect(guideHtml("<center><fancy>Июнь 1926</fancy></center>")).toBe(
      '<div class="g-center"><span class="g-fancy">Июнь 1926</span></div>',
    );
  });
});

describe("moreBelow", () => {
  const el = (scrollHeight: number, clientHeight: number, scrollTop: number) =>
    ({ scrollHeight, clientHeight, scrollTop }) as HTMLElement;
  it("is true while text is scrolled out of sight below", () => {
    expect(moreBelow(el(1000, 300, 0))).toBe(true);
    expect(moreBelow(el(1000, 300, 500))).toBe(true);
  });
  it("is false when it all fits, and at the end (within a pixel or two)", () => {
    expect(moreBelow(el(300, 300, 0))).toBe(false);
    expect(moreBelow(el(1000, 300, 700))).toBe(false);
    expect(moreBelow(el(1000, 300, 699))).toBe(false);
  });
});
