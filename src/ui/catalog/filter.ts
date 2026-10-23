import { cardText } from "../../content/i18n";
import type { CardDef } from "../../content/schema";
import type { ContentDb } from "../../engine/types";
import { implemented } from "../../content/implemented";

export type Tab = "investigators" | "player" | "encounter";

export interface CatalogFilters {
  tab: Tab;
  factions: string[];
  types: string[];
  /** the content packs (a cycle each) and the printed packs inside them */
  cycles: string[];
  packs: string[];
  /** experience level */
  levels: number[];
  costs: number[];
  traits: string[];
  icons: string[];
  slots: string[];
  sets: string[];
  works: "any" | "yes" | "no";
  query: string;
}

export const emptyFilters: CatalogFilters = {
  tab: "investigators",
  factions: [],
  types: [],
  cycles: [],
  packs: [],
  levels: [],
  costs: [],
  traits: [],
  icons: [],
  slots: [],
  sets: [],
  works: "any",
  query: "",
};

/** investigators, the player cards (weaknesses too) and the encounter cards */
export const tabOf = (c: Pick<CardDef, "type" | "faction">): Tab =>
  c.type === "investigator" ? "investigators" : c.faction === "mythos" ? "encounter" : "player";

/** lower case, ё as е, no markup or icon tokens: what a search compares */
export const normalise = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[(\w+)\]/g, " $1 ")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

/** the content pack (cycle) of each card */
export function cycleIndex(db: ContentDb): Map<string, string> {
  const m = new Map<string, string>();
  for (const [pack, info] of Object.entries(db.packs))
    for (const code of info.cards) m.set(code, pack);
  return m;
}

const anyOf = <T>(chosen: T[], value: T) => !chosen.length || chosen.includes(value);

/** the cards of the tab that pass every filter, in code order (the core set first) */
export function catalogCards(db: ContentDb, locale: string, f: CatalogFilters): CardDef[] {
  const cycles = f.cycles.length ? cycleIndex(db) : null;
  const words = normalise(f.query).split(" ").filter(Boolean);
  return Object.values(db.cards)
    .filter((c) => {
      if (tabOf(c) !== f.tab) return false;
      if (
        !anyOf(f.factions, c.faction) ||
        !anyOf(f.types, c.type) ||
        !anyOf(f.packs, c.pack) ||
        !anyOf(f.sets, c.encounterSet ?? "")
      )
        return false;
      if (cycles && !f.cycles.includes(cycles.get(c.code) ?? "")) return false;
      if (f.levels.length && !f.levels.includes(c.xp ?? 0)) return false;
      if (f.costs.length && (typeof c.cost !== "number" || !f.costs.includes(c.cost))) return false;
      if (f.icons.length && !f.icons.some((i) => (c.icons[i as keyof typeof c.icons] ?? 0) > 0))
        return false;
      if (f.slots.length && !f.slots.some((s) => c.slots.includes(s as never))) return false;
      if (f.traits.length) {
        const mine = cardText(db, c.code, locale).traits ?? [];
        if (!f.traits.some((t) => mine.includes(t))) return false;
      }
      if (f.works !== "any" && implemented(db, c.code) !== (f.works === "yes")) return false;
      if (words.length) {
        const tx = cardText(db, c.code, locale);
        const hay = normalise(
          [
            tx.name,
            tx.subname,
            tx.backName,
            c.name,
            ...(tx.traits ?? []),
            tx.text,
            tx.backText,
          ].join(" "),
        );
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** the traits of some cards in the game's language, sorted: the trait filter's choices */
export const traitsOf = (db: ContentDb, locale: string, cards: CardDef[]) =>
  [...new Set(cards.flatMap((c) => cardText(db, c.code, locale).traits ?? []))].sort((a, b) =>
    a.localeCompare(b, locale),
  );

/** the printed packs of some cards, in code order */
export const packsOfCards = (cards: CardDef[]) => [
  ...new Set([...cards].sort((a, b) => a.code.localeCompare(b.code)).map((c) => c.pack)),
];

/** the content packs (cycles) of some cards, in code order */
export function cyclesOfCards(db: ContentDb, cards: CardDef[]): string[] {
  const index = cycleIndex(db);
  return [
    ...new Set(
      [...cards]
        .sort((a, b) => a.code.localeCompare(b.code))
        .flatMap((c) => index.get(c.code) ?? []),
    ),
  ];
}

/** the content pack (cycle) a card is in */
export const cycleOf = (db: ContentDb, code: string): string | undefined => {
  for (const [pack, info] of Object.entries(db.packs)) if (info.cards.includes(code)) return pack;
};
