/**
 * Import translations from the ArkhamCards data in inspired/ArkhamCards into content/i18n/<locale>/*.generated.json.
 * Hand-written content/i18n/<locale>/{ui,campaigns}.json are never touched and win over the generated files.
 *
 *   npm run import:i18n -- --locale ru
 *
 * - campaigns.generated.json: campaign/scenario names, intro narrative, resolutions, campaign log labels, encounter set names
 *   (our campaigns and scenarios name their ArkhamCards counterpart with `i18nId`)
 * - ui.generated.json: our English UI strings matched by msgid in ArkhamCards' <locale>.po (msgctxt "action" preferred)
 * - card text for every cycle from the local ArkhamDB snapshot (inspired/arkhamdb-json-data/translations/<locale>): the core
 *   pack's in cards.generated.json, every other pack's in packs/<pack>.generated.json (loaded with the pack in the browser).
 *   The hand-written cards.json and the print-matched cards.print.json still win over them, field by field.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { I18nCards } from "../src/content/schema";
import { introLead, prologueOf } from "./campaignGuide";
import { SNAPSHOT, translationsByPack } from "./snapshotText";

const AC = "inspired/ArkhamCards/assets";
const locale = process.argv[process.argv.indexOf("--locale") + 1];
if (!locale || process.argv.indexOf("--locale") < 0) {
  console.error("usage: import-i18n --locale <code>");
  process.exit(1);
}
const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
/** ArkhamCards log entries are lower-case sentence fragments; ours are full sentences */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.replace(/\r/g, "").trim();

type Raw = Record<string, any>;

/** our log keys that don't follow ArkhamCards' ids */
const LOG_ALIASES: Record<string, string> = { cultists_escaped: "cultistsGotAway" };

const campaignsOut: { campaigns: Raw; scenarios: Raw; encounterSets: Record<string, string> } = { campaigns: {}, scenarios: {}, encounterSets: {} };
const acCampaigns: Raw[] = read(join(AC, `generated/all_campaigns_${locale}.txt`));
const encounterNames: Record<string, string> = read(join(AC, `generated/encounter_sets_${locale}.txt`));

// the generated campaigns' scenario text and log labels go to one file each, loaded with the campaign (ADR-0007)
const perCampaign: Record<string, { campaigns: Raw; scenarios: Raw; encounterSets: Record<string, string> }> = {};
const campaignDirs = ["content/campaigns", "content/campaigns-generated"].flatMap((root) => (existsSync(root) ? readdirSync(root).map((d) => join(root, d)) : []));
for (const dirPath of campaignDirs) {
  const campaign = read(join(dirPath, "campaign.json"));
  // a generated campaign keeps its (English) log labels with its text, not in campaign.json
  const enText = join("content/i18n/en/campaign-texts", `${campaign.id}.json`);
  if (campaign.generated && existsSync(enText)) campaign.logLabels = read(enText).campaigns[campaign.id].logLabels;
  const ac = acCampaigns.find((c) => c.campaign.id === campaign.i18nId);
  if (!ac) {
    console.warn(`${campaign.id}: no ArkhamCards campaign "${campaign.i18nId}"`);
    continue;
  }
  const logLabels: Record<string, string> = {};
  const addLog = (id: string, text: string) => {
    // hand-written campaigns name their log keys in camelCase; generated ones keep the guide's ids
    const key = LOG_ALIASES[id] ?? (id in campaign.logLabels ? id : camel(id));
    if (key in campaign.logLabels && text) logLabels[key] = sentence(clean(text));
  };
  for (const section of ac.campaign.campaign_log ?? []) addLog(section.id, section.title);
  const scenarios = new Map<string, Raw>(ac.scenarios.map((s: Raw) => [s.id, s]));
  for (const s of ac.scenarios) for (const step of s.steps ?? []) for (const e of step.effects ?? []) if (e.type === "campaign_log" && e.id && e.text) addLog(e.id, e.text);
  const out = campaign.generated ? (perCampaign[campaign.id] = { campaigns: { [campaign.id]: { logLabels } }, scenarios: {}, encounterSets: {} }) : campaignsOut;
  // the tile's text before the scenarios are loaded: the campaign's opening text and its scenarios' names
  const blurb = { ...(prologueOf(ac.campaign) ? { prologue: prologueOf(ac.campaign) } : {}), scenarioNames: campaign.scenarios.map((id: string) => scenarios.get(read(join(dirPath, "scenarios", `${id}.json`)).i18nId)?.scenario_name).filter(Boolean) };
  campaignsOut.campaigns[campaign.id] = campaign.generated ? { name: ac.campaign.name, ...blurb } : { name: ac.campaign.name, ...blurb, logLabels };

  for (const id of campaign.scenarios) {
    const ours = read(join(dirPath, "scenarios", `${id}.json`));
    const theirs = scenarios.get(ours.i18nId);
    if (!theirs) {
      console.warn(`${id}: no ArkhamCards scenario "${ours.i18nId}"`);
      continue;
    }
    // the first story step is the scenario's opening narration
    const intro = (theirs.steps ?? []).find((st: Raw) => st.type === "story" && st.text)?.text;
    const resolutions: Raw = {};
    for (const r of theirs.resolutions ?? []) {
      const key = r.id === "no_resolution" ? "none" : r.id;
      if (key in ours.resolutions) resolutions[key] = { title: r.title, ...(r.text ? { text: clean(r.text) } : {}) };
    }
    out.scenarios[id] = { name: theirs.scenario_name, ...(intro ? { intro: clean(intro) } : {}), resolutions };
    for (const set of ours.encounterSets ?? []) if (encounterNames[set]) campaignsOut.encounterSets[set] = encounterNames[set];
    // a side scenario's tile shows its intro
    if (campaign.id.startsWith("side-") && out.scenarios[id].intro) campaignsOut.campaigns[campaign.id].prologue = introLead(out.scenarios[id].intro);
  }
}

// UI strings: our English text → the locale's msgstr for the same msgid
const en: Record<string, string> = read("content/i18n/en/ui.json");
const po = read(join(AC, `i18n/${locale}.po.json`)).translations as Record<string, Record<string, { msgstr: string[] }>>;
const ui: Record<string, string> = {};
for (const [key, text] of Object.entries(en)) {
  if (/\{/.test(text)) continue; // placeholders never line up with ArkhamCards' strings
  const hit = po.action?.[text]?.msgstr?.[0] || po[""]?.[text]?.msgstr?.[0];
  if (hit) ui[key] = hit;
}

const dir = join("content/i18n", locale);
if (!existsSync(dir)) throw new Error(`${dir} does not exist`);
const write = (name: string, data: unknown) => writeFileSync(join(dir, name), JSON.stringify(data, null, name.startsWith("packs") ? 0 : name === "cards.generated.json" ? 1 : 2) + "\n");
write("campaigns.generated.json", campaignsOut);
const textDir = join(dir, "campaign-texts");
rmSync(textDir, { recursive: true, force: true });
mkdirSync(textDir, { recursive: true });
for (const [id, text] of Object.entries(perCampaign)) writeFileSync(join(textDir, `${id}.json`), JSON.stringify(text) + "\n");
write("ui.generated.json", ui);

// card text for every cycle, from the snapshot
const root = process.argv.includes("--root") ? process.argv[process.argv.indexOf("--root") + 1] : SNAPSHOT;
const byPack = translationsByPack(root, locale);
const packsDir = join(dir, "packs");
rmSync(packsDir, { recursive: true, force: true });
let cardTotal = 0;
for (const [pack, cards] of byPack) {
  I18nCards.parse(cards);
  if (pack === "core") write("cards.generated.json", cards);
  else {
    mkdirSync(packsDir, { recursive: true });
    write(join("packs", `${pack}.generated.json`), cards);
  }
  cardTotal += Object.keys(cards).length;
}
console.log(
  `${locale}: ${Object.keys(campaignsOut.campaigns).length} campaigns, ${Object.keys(campaignsOut.scenarios).length} scenarios, ${Object.keys(campaignsOut.encounterSets).length} encounter sets, ${Object.keys(ui).length} UI strings, ${cardTotal} card texts in ${byPack.size} packs`,
);
