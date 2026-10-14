/** validate all content files: schema + cross references. Exit code 1 on errors. */
import { loadContentFromDisk } from "../src/content/node";

const { db, errors } = await loadContentFromDisk();
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
