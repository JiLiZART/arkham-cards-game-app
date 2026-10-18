import { formatText } from "./hud/Hud";

type Tag = { el: "span" | "div" | "i" | "b" | "s" | "u"; cls?: string };

/** the campaign guide's tags we draw: styled spans, aligned or indented blocks, and the plain emphasis ones */
const TAGS: Record<string, Tag> = {
  fancy: { el: "span", cls: "g-fancy" },
  typewriter: { el: "span", cls: "g-typewriter" },
  innsmouth: { el: "span", cls: "g-innsmouth" },
  game: { el: "span", cls: "g-game" },
  smallcaps: { el: "span", cls: "g-smallcaps" },
  center: { el: "div", cls: "g-center" },
  right: { el: "div", cls: "g-right" },
  blockquote: { el: "div", cls: "g-blockquote" },
  strike: { el: "s" },
  i: { el: "i" },
  em: { el: "i" },
  b: { el: "b" },
  strong: { el: "b" },
  u: { el: "u" },
};

const TOKEN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?>/g;

/**
 * The campaign guide's markup as safe HTML: the tags in TAGS become elements with classes, balanced tags only (an
 * unbalanced tag is dropped, its text kept), any other tag is dropped with its text kept, and every text run goes through
 * the card-text formatter, which escapes it. Line breaks stay; the one right inside or after a block tag is dropped.
 */
export function guideHtml(text: string): string {
  const tokens = [...text.matchAll(TOKEN)];
  // pair opening and closing tags: only a pair of known tags that match each other is drawn
  const stack: { name: string; at: number }[] = [];
  const paired = new Set<number>();
  tokens.forEach((m, k) => {
    const name = m[2].toLowerCase();
    if (!TAGS[name]) return;
    if (!m[1]) return void stack.push({ name, at: k });
    const open = stack.map((s) => s.name).lastIndexOf(name);
    if (open < 0) return;
    // tags opened inside the one being closed were never closed: dropped
    const [match] = stack.splice(open);
    paired.add(match.at);
    paired.add(k);
  });
  let out = "";
  let last = 0;
  const run = (s: string) => (out += formatText(s));
  tokens.forEach((m, k) => {
    run(text.slice(last, m.index));
    last = m.index! + m[0].length;
    if (!paired.has(k)) return;
    const tag = TAGS[m[2].toLowerCase()];
    const block = tag.el === "div";
    if (m[1]) {
      out = block ? out.replace(/(<br\/>)+$/, "") : out;
      out += `</${tag.el}>`;
      // a line break right after a block's close would only add a gap
      if (block && text[last] === "\n") last += 1;
    } else {
      out += `<${tag.el}${tag.cls ? ` class="${tag.cls}"` : ""}>`;
      if (block && text[last] === "\n") last += 1;
    }
  });
  run(text.slice(last));
  return out;
}

/** whether text is scrolled out of sight below the box's bottom edge (a pixel or two of rounding doesn't count) */
export const moreBelow = (el: Pick<HTMLElement, "scrollHeight" | "clientHeight" | "scrollTop">) => el.scrollHeight - el.clientHeight - el.scrollTop > 2;
