/**
 * Draft Russian card texts from the OCR of a card image (pure; reviewed by hand before they go into cards.print.json).
 * Icons can't be read reliably, so each run of OCR junk where an icon was printed takes the next icon token of the
 * official text, in order.
 */
import { fileStem } from "./ruMatch";

export interface PrintDraft {
  name: string;
  traits?: string[];
  text?: string;
  /** true when the icon count in the OCR didn't match the official text: check the icons by hand */
  iconsUnsure?: boolean;
}

const CYR = /[А-Яа-яЁё]/g;
const cyrShare = (s: string) => (s.match(CYR)?.length ?? 0) / Math.max(1, s.replace(/\s/g, "").length);

/** the printed name: the community file name (typed by people; OCR adds typos), else the cleaned OCR title */
export function draftName(title: string, file: string | null): string {
  const stem = file?.includes("CARDS_ru") ? fileStem(file) : "";
  return stem || title.replace(/^[^А-Яа-яЁё«]+|[^А-Яа-яЁё»!?.)]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

/** "Предмет. Оружие. Рукопашный." → ["Предмет", "Оружие", "Рукопашный"] */
const TRAITS = /^([А-ЯЁ][а-яё-]+(?: [а-яё-]+)?\.\s*)+$/;

/** icon tokens of a marked-up text, in order */
export const iconTokens = (markup: string) => [...markup.matchAll(/\[(\w+)\]/g)].map((m) => `[${m[1]}]`);

/** what OCR makes of a printed icon: a short run of symbols, stray Latin letters or punctuation */
const JUNK = /(?:^|(?<=\s))(?:[»«›‹„“”"%@$#&*^~|\\/<>{}©®°§¶•■●○◆→=_`']|[A-Za-z]{1,2}(?=\s))+(?=\s|$|[.:,])/g;

export function draftText(ocr: string, official: string): { traits?: string[]; text?: string; iconsUnsure: boolean } {
  const lines = ocr.split("\n").map((l) => l.trim()).filter(Boolean);
  // keep the lines that are mostly Russian text; card numbers, artist credits and art noise go
  const kept = lines.filter((l) => cyrShare(l) > 0.55 && /[А-Яа-яЁё]{4,}/.test(l));
  let traits: string[] | undefined;
  if (kept.length && TRAITS.test(kept[0])) traits = kept.shift()!.split(".").map((s) => s.trim()).filter(Boolean);
  const tokens = iconTokens(official);
  let k = 0;
  const body = kept.join("\n").replace(JUNK, (m) => (k < tokens.length ? tokens[k++] : m));
  const text = body.replace(/[ \t]{2,}/g, " ").trim() || undefined;
  return { traits, text, iconsUnsure: k !== tokens.length };
}
