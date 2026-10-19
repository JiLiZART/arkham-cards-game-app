/** write content/coverage.json: how much of the content works, per pack, campaign and investigator (ADR-0012) */
import { writeFileSync } from "node:fs";
import { coverageJson } from "../src/content/coverage";
import { loadContentFromDisk } from "../src/content/node";

const { db, errors } = await loadContentFromDisk();
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e.file} ${e.path}: ${e.message}`);
  process.exit(1);
}
writeFileSync("content/coverage.json", coverageJson(db));
const done = Object.values(db.campaigns).filter((c) => JSON.parse(coverageJson(db)).campaigns[c.id].complete).length;
console.log(`content/coverage.json: ${Object.keys(db.packs).length} packs, ${Object.keys(db.campaigns).length} campaigns (${done} complete)`);
