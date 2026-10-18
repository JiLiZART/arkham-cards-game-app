/** the guide's markup (<fancy>, <i>, <blockquote>…) removed, paragraphs split on blank lines */
const clean = (s: string) => s.replace(/<\/?[a-z][^>]*>/gi, "").replace(/[ \t]+\n/g, "\n").trim();

const LEAD = 300;

/** a campaign description for a tile: its first paragraph, and what More shows (null when there is nothing more) */
export function blurb(prologue: string | undefined): { lead: string; more: string | null } {
  const text = clean(prologue ?? "");
  if (!text) return { lead: "", more: null };
  const [first, ...rest] = text.split(/\n\s*\n/);
  if (first.length <= LEAD + 40) return { lead: first, more: rest.length ? rest.join("\n\n") : null };
  // a long paragraph is cut after the last sentence that ends within LEAD characters
  const cut = [...first.slice(0, LEAD + 40).matchAll(/[.!?…»”"]\s/g)].map((m) => m.index! + 1).filter((i) => i <= LEAD + 40).at(-1) ?? LEAD;
  return { lead: first.slice(0, cut).trim(), more: [first.slice(cut).trim(), ...rest].filter(Boolean).join("\n\n") };
}
