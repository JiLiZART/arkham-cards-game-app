import type { CardDef } from "../content/schema";

const BASE = (import.meta.env?.VITE_CARD_IMAGE_BASE as string | undefined) ?? "/cards";

/** front/back image URLs for a card; double-sided cards use the "<code>b" image for their back */
export function cardImage(card: Pick<CardDef, "code" | "doubleSided" | "image" | "backImage">, side: "front" | "back"): string | null {
  if (side === "front") return card.image ?? `${BASE}/${card.code}.webp`;
  if (card.backImage) return card.backImage;
  return card.doubleSided ? `${BASE}/${card.code}b.webp` : null;
}

/** generic card back art by kind (player cards without their own back scan, encounter cards) */
export const backUrl = (kind: "player" | "encounter") => (kind === "encounter" ? "/table/back-encounter.png" : "/table/back-player.png");

/** cards that use the generic encounter back; the others use the player back */
export const isEncounterCard = (c: Pick<CardDef, "faction" | "subtype">) => c.faction === "mythos" && !c.subtype;

export const FACTION_COLORS: Record<string, string> = {
  guardian: "#2b80c5", seeker: "#ec8426", rogue: "#107116", mystic: "#4331b9", survivor: "#cc3038", neutral: "#606060", mythos: "#3a3a3a",
};

const strip = (s: string) =>
  s.replace(/<\/?[a-z]+>/g, "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[(\w+)\]/g, (_, k: string) => ICONS[k] ?? `[${k}]`);
const ICONS: Record<string, string> = {
  action: "➤", reaction: "↺", fast: "⚡", free: "⚡", elder_sign: "✶", skull: "☠", cultist: "☥", tablet: "⌘", elder_thing: "✵", auto_fail: "✖",
  willpower: "WIL", intellect: "INT", combat: "COM", agility: "AGI", wild: "?", per_investigator: "/inv",
  guardian: "Guardian", seeker: "Seeker", rogue: "Rogue", mystic: "Mystic", survivor: "Survivor",
};

/** text lines shown on a drawn (fallback) card face */
export function faceLines(card: CardDef, side: "front" | "back", name = card.name, text = card.text): { title: string; stats: string; body: string[] } {
  if (side === "back") return { title: card.backName ?? name, stats: "", body: wrap(strip(card.backText ?? ""), 34) };
  const stats: string[] = [];
  if (card.cost !== undefined && card.cost !== null) stats.push(`Cost ${card.cost}`);
  if (card.xp) stats.push(`XP ${card.xp}`);
  if (card.skills) stats.push(`WIL ${card.skills.willpower} INT ${card.skills.intellect} COM ${card.skills.combat} AGI ${card.skills.agility}`);
  if (card.enemy) stats.push(`Fight ${card.enemy.fight} · HP ${card.enemy.health}${card.enemy.healthPerInvestigator ? "/inv" : ""} · Evade ${card.enemy.evade} · ${card.enemy.damage}D ${card.enemy.horror}H`);
  if (card.shroud !== undefined) stats.push(`Shroud ${card.shroud} · Clues ${card.clues ?? 0}${card.cluesPerInvestigator ? "/inv" : ""}`);
  if (card.doom !== undefined) stats.push(`Doom ${card.doom}`);
  if (card.actClues) stats.push(`Clues ${card.actClues}${card.actCluesPerInvestigator ? "/inv" : ""}`);
  if (card.health || card.sanity) stats.push(`HP ${card.health ?? "-"} SAN ${card.sanity ?? "-"}`);
  const icons = Object.entries(card.icons).filter(([, n]) => n).map(([k, n]) => `${ICONS[k]}×${n}`).join(" ");
  if (icons) stats.push(icons);
  const traits = card.traits.length ? [card.traits.join(". ") + "."] : [];
  return { title: name, stats: stats.join(" · "), body: [...traits, ...wrap(strip(text), 34)] };
}

export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      if (!w) continue;
      if ((line + " " + w).trim().length > width) {
        out.push(line.trim());
        line = w;
      } else line += " " + w;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}
