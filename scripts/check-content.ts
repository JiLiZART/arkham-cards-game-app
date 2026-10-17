/** validate all content files: schema + cross references. Exit code 1 on errors. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { loadContentFromDisk } from "../src/content/node";
import { checkSounds } from "../src/content/soundChecks";
import { ANIMATED } from "../src/ui/store";
import { checkIcons, MANIFEST, SPRITE, spriteIds } from "./import-icons";

const { db, errors } = await loadContentFromDisk();
// the sound files are converted and committed; an event sound must be one the UI animates; sizes within budget
const fileSize = (path: string) => {
  try {
    return statSync(`public/sounds/${path}`).size;
  } catch {
    return null;
  }
};
errors.push(...checkSounds(db.sounds, fileSize, ANIMATED));
// every encounter set and scenario has an icon in the sprite; the manifest lists exactly the sprite's symbols
const read = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : null);
const manifest = read(MANIFEST);
const sprite = read(SPRITE);
errors.push(...checkIcons(db, manifest === null ? null : JSON.parse(manifest), sprite === null ? null : spriteIds(sprite)));
// every prompt has an instruction for the bar, and the tips and How to play are written, in every language
const en = db.i18n.en?.ui ?? {};
const needed = Object.keys(en).flatMap((k) => (k.startsWith("prompt.") ? [k, `instruction.${k.slice(7)}`] : k.startsWith("tip.") || k.startsWith("howto.") ? [k] : []));
for (const [locale, { ui }] of Object.entries(db.i18n))
  for (const key of needed) if (!(key in ui)) errors.push({ file: `content/i18n/${locale}/ui.json`, path: key, message: "missing string" });
for (const e of errors) console.error(`✗ ${e.file} ${e.path}: ${e.message}`);
console.log(
  `${Object.keys(db.cards).length} cards, ${Object.keys(db.investigators).length} investigators, ${Object.keys(db.decks).length} decks, ` +
    `${Object.keys(db.scenarios).length} scenarios, ${Object.keys(db.campaigns).length} campaigns, ${Object.keys(db.scripts).length} scripts`,
);
if (errors.length) {
  console.error(`${errors.length} content error(s)`);
  process.exit(1);
}
console.log("content OK");
