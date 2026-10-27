import type { CardDef } from "../../content/schema";

/**
 * Keywords the details column explains (worded after the rules references, in each locale's ui.json as `kw.<id>` and
 * `kw.<id>.name`), in the order they are listed.
 */
export const KEYWORDS = [
  "hunter",
  "retaliate",
  "alert",
  "aloof",
  "massive",
  "surge",
  "peril",
  "fast",
  "patrol",
  "elusive",
  "swarming",
  "concealed",
  "exceptional",
  "myriad",
  "bonded",
  "permanent",
  "seal",
  "uses",
  "victory",
] as const;
export type Keyword = (typeof KEYWORDS)[number];

const capital = (k: string) => k[0].toUpperCase() + k.slice(1);
/** a keyword opens its line or sentence, capitalised, followed by a full stop, a value or its parenthesis */
const IN_TEXT = new RegExp(
  `(?:^|\\n|\\.\\s+)(${KEYWORDS.map(capital).join("|")})(?=[.\\s(]|$)`,
  "g",
);

/** the keywords a card has: its keyword list, keyword lines of its (English) text, its uses and its victory points */
export function keywordsOf(
  d: Pick<CardDef, "keywords" | "text"> & Partial<Pick<CardDef, "uses" | "victory">>,
): Keyword[] {
  const found = new Set<string>(d.keywords ?? []);
  for (const m of (d.text ?? "").replace(/<[^>]+>/g, "").matchAll(IN_TEXT))
    found.add(m[1].toLowerCase());
  if (d.uses) found.add("uses");
  if (d.victory) found.add("victory");
  return KEYWORDS.filter((k) => found.has(k));
}
