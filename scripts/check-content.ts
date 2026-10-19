/** validate all content files: schema + cross references. Exit code 1 on errors. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { loadContentFromDisk } from "../src/content/node";
import { SoundCandidates } from "../src/content/schema";
import { checkCampaignCards, checkCoverage } from "../src/content/coverage";
import { checkFlows } from "../src/content/flowChecks";
import { checkCandidates, checkLoudness, checkMoments, checkSounds } from "../src/content/soundChecks";
import { MOMENTS } from "../src/content/soundSlots";
import { SLOTS } from "./sound-candidates";
import { ANIMATED } from "../src/ui/store";
import { replaceCredits, soundCredits } from "./sound-credits";
import { ffmpegAvailable, ffmpegProbe } from "./sound-probe";
import { checkIcons, MANIFEST, SPRITE, SPRITE_CAMPAIGNS, setsWithoutIcon, spriteIds } from "./import-icons";
import { cycleCoverage } from "./snapshotText";

const { db, errors } = await loadContentFromDisk();
// the sound files are converted and committed; an event sound must be one the UI animates; sizes within budget
const fileSize = (path: string) => {
  try {
    return statSync(`public/sounds/${path}`).size;
  } catch {
    return null;
  }
};
errors.push(...checkSounds(db.sounds, fileSize, ANIMATED), ...checkMoments(db.sounds, MOMENTS));
// every campaign flow: steps reached, scenarios, log sections and cards named exist
errors.push(...checkFlows(db));
// the committed coverage report is what the content gives, and every campaign's chapters match its scenarios
errors.push(...checkCoverage(db), ...checkCampaignCards(db));
// every sound slot has its five candidates listed (the audio itself is untracked); the slots the game can play are in SLOTS
const candidates = SoundCandidates.safeParse(JSON.parse(readFileSync("content/sounds/candidates.json", "utf8")));
if (candidates.success) errors.push(...checkCandidates(db.sounds, candidates.data, SLOTS.map((s) => s.id)));
else errors.push({ file: "content/sounds/candidates.json", path: "", message: candidates.error.message });
// the README credits every sound source the manifest uses (npm run sound-credits)
const readme = readFileSync("README.md", "utf8");
if (replaceCredits(readme, soundCredits(db.sounds)) !== readme) errors.push({ file: "README.md", path: "Sound credits", message: "behind content/sounds/sounds.json (npm run sound-credits)" });
// loudness and loop seams need ffmpeg; without it they are skipped with a warning, not failed
if (ffmpegAvailable()) errors.push(...checkLoudness(db.sounds, ffmpegProbe()));
else console.warn("warning: ffmpeg not found, sound loudness and loop seam checks skipped");
// every encounter set and scenario has an icon in the sprite; the manifest lists exactly the sprite's symbols
const read = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);
const manifest = read(MANIFEST);
const sprite = read(SPRITE);
const campaignSprite = read(SPRITE_CAMPAIGNS) ?? "";
errors.push(...checkIcons(db, manifest === null ? null : JSON.parse(manifest), sprite === null ? null : spriteIds(sprite), spriteIds(campaignSprite)));
// sets of the other cycles' cards that have no icon yet are only listed: a scenario that uses one needs it (npm run import:icons)
const noIcon = sprite === null ? [] : setsWithoutIcon(db, [...spriteIds(sprite), ...spriteIds(campaignSprite)]);
if (noIcon.length) console.log(`note: ${noIcon.length} encounter sets of the other cycles have no icon in the sprite yet (${noIcon.slice(0, 4).join(", ")}…)`);
// every prompt has an instruction for the bar, and the tips and How to play are written, in every language
const en = db.i18n.en?.ui ?? {};
const needed = Object.keys(en).flatMap((k) => (k.startsWith("prompt.") ? [k, `instruction.${k.slice(7)}`] : k.startsWith("tip.") || k.startsWith("howto.") ? [k] : []));
for (const [locale, { ui }] of Object.entries(db.i18n))
  for (const key of needed) if (!(key in ui)) errors.push({ file: `content/i18n/${locale}/ui.json`, path: key, message: "missing string" });
for (const e of errors) console.error(`✗ ${e.file} ${e.path}: ${e.message}`);
// per pack: how many cards, and how many have Russian text (a card without it falls back to English)
const ru = cycleCoverage(db, "ru");
if (ru.length) console.log(ru.map((c) => `${c.pack} ${c.cards} cards, ${c.translated} in Russian`).join("\n"));
console.log(
  `${Object.keys(db.cards).length} cards, ${Object.keys(db.investigators).length} investigators, ${Object.keys(db.decks).length} decks, ` +
    `${Object.keys(db.scenarios).length} scenarios, ${Object.keys(db.campaigns).length} campaigns, ${Object.keys(db.scripts).length} scripts`,
);
if (errors.length) {
  console.error(`${errors.length} content error(s)`);
  process.exit(1);
}
console.log("content OK");
