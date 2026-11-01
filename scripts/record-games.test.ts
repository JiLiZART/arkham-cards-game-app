/**
 * Records the replay oracle's corpus (src/engine/replays/corpus) with the current engine: every recipe in
 * src/engine/replays/recipes.ts is played and written with what it produced, and recordings no recipe names are deleted.
 * It runs under vitest so it plays on exactly the content the replay test loads (core plus each recipe's packs), and only
 * when asked: `pnpm record:games` (RECORD_GAMES=1); RECORD_ONLY="id id" records just those. Run it only when a change is
 * meant to alter the game; the replay test never writes.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { content, loadPack } from "../src/content";
import { CORPUS, inPackOrder, traceScripts, usePacks } from "../src/engine/replays/corpus";
import {
  BASE_GAME_RECIPES,
  CAMPAIGN_RECIPES,
  GAME_RECIPES,
  templates,
  type Template,
} from "../src/engine/replays/recipes";
import { recordCampaign, recordGame, type Recording } from "../src/engine/replays/record";

it.skipIf(!process.env.RECORD_GAMES)(
  "records the replay corpus",
  async () => {
    const only = new Set((process.env.RECORD_ONLY ?? "").split(/\s+/).filter(Boolean));
    const recipes = inPackOrder([...GAME_RECIPES, ...CAMPAIGN_RECIPES]);
    mkdirSync(CORPUS, { recursive: true });
    for (const r of recipes) {
      if (only.size && !only.has(r.id)) continue;
      await usePacks(content, r.packs, loadPack);
      const rec: Recording =
        "setup" in r ? recordGame(content, { ...r, setup: r.setup() }) : recordCampaign(content, r);
      writeFileSync(`${CORPUS}/${r.id}.json`, JSON.stringify(rec));
      const n = rec.kind === "game" ? `${rec.actions.length} choices` : `${rec.moves.length} moves`;
      console.log(`${r.id}: ${n}`);
    }
    if (!only.size) {
      const ids = new Set(recipes.map((r) => `${r.id}.json`));
      for (const f of readdirSync(CORPUS)) if (!ids.has(f)) rmSync(`${CORPUS}/${f}`);
    }
  },
  600_000,
);

/**
 * `pnpm search:games` (SEARCH_GAMES=1): plays each template of recipes.ts over seeds 1 to SEARCH_SEEDS (default 30)
 * with the random player, after noting the scripts the base corpus and the campaigns run, and keeps each seed whose game
 * runs a script nothing kept so far does. Writes the kept seeds to coverage.json (then `pnpm record:games`), lists the
 * scripts no seed reached, and reports any seed the engine refused a choice in: a bug random play found.
 */
it.skipIf(!process.env.SEARCH_GAMES)(
  "searches seeds for the scripts the corpus misses",
  async () => {
    const seeds = Number(process.env.SEARCH_SEEDS ?? 30);
    const ran = new Set<string>();
    const covered = new Set<string>();
    const kept: { template: string; seed: number }[] = [];
    const refused: string[] = [];
    type Item =
      | {
          packs: string[];
          recipe: (typeof BASE_GAME_RECIPES)[number] | (typeof CAMPAIGN_RECIPES)[number];
        }
      | { packs: string[]; template: Template };
    const items: Item[] = inPackOrder([
      ...[...BASE_GAME_RECIPES, ...CAMPAIGN_RECIPES].map((recipe) => ({
        packs: recipe.packs,
        recipe,
      })),
      ...templates().map((template) => ({ packs: template.packs, template })),
    ]);
    for (const item of items) {
      await usePacks(content, item.packs, loadPack);
      traceScripts(content, ran);
      if ("recipe" in item) {
        const r = item.recipe;
        ran.clear();
        if ("setup" in r) recordGame(content, { ...r, setup: r.setup() });
        else recordCampaign(content, r);
        for (const code of ran) covered.add(code);
        continue;
      }
      const t = item.template;
      for (let seed = 1; seed <= seeds; seed++) {
        ran.clear();
        try {
          recordGame(content, { ...t, setup: t.setup(seed) });
        } catch (e) {
          refused.push(`${t.id} seed ${seed}: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        const fresh = [...ran].filter((code) => !covered.has(code));
        if (!fresh.length) continue;
        kept.push({ template: t.id, seed });
        for (const code of fresh) covered.add(code);
        console.log(`${t.id} seed ${seed}: ${fresh.join(" ")}`);
      }
    }
    writeFileSync("src/engine/replays/coverage.json", `${JSON.stringify(kept, null, 2)}\n`);
    const missed = Object.keys(content.scripts).filter((code) => !covered.has(code));
    console.log(`kept ${kept.length} seeds; no seed runs: ${missed.sort().join(" ") || "(none)"}`);
    if (refused.length) console.log(`refused choices:\n${refused.join("\n")}`);
  },
  3_600_000,
);
