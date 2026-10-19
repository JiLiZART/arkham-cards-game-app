/**
 * The CC0 packs the sound candidates are drawn from (ADR-0001). A pack with a `page` is a Kenney asset page: its zip is
 * found on the page, downloaded once into sounds-src/packs and extracted to sounds-src/<dir>. The others were downloaded
 * by hand earlier and sit in sounds-src already (their provenance is the manifest's).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export type Pack = { dir: string; source: string; author: string; page?: string };

const kenney = (slug: string): Pack => ({ dir: `kenney-${slug}`, source: `https://kenney.nl/assets/${slug}`, author: "Kenney", page: `https://kenney.nl/assets/${slug}` });

export const PACKS: Pack[] = [
  { dir: "kenney-casino", source: "https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips", author: "Kenney" },
  kenney("impact-sounds"),
  kenney("interface-sounds"),
  kenney("ui-audio"),
  kenney("rpg-audio"),
  kenney("music-jingles"),
  kenney("sci-fi-sounds"),
  { dir: "rpg", source: "https://opengameart.org/content/80-cc0-rpg-sfx", author: "rubberduck" },
  { dir: "sfx100", source: "https://opengameart.org/content/100-cc0-sfx-2", author: "rubberduck" },
  { dir: "creature", source: "https://opengameart.org/content/80-cc0-creature-sfx", author: "rubberduck" },
  { dir: "rpg-pack", source: "https://opengameart.org/content/rpg-sound-pack", author: "artisticdude" },
  { dir: "sword", source: "https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes", author: "StarNinjas" },
  { dir: "sword-clash", source: "https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes", author: "StarNinjas" },
  { dir: "pageflips", source: "https://opengameart.org/content/10-book-page-flips", author: "StarNinjas" },
  { dir: "clicks", source: "https://opengameart.org/content/87-clickety-clips", author: "OwlishMedia" },
  { dir: "pops", source: "https://opengameart.org/content/3-pop-sounds", author: "wubitog" },
  { dir: "gunshots", source: "https://opengameart.org/content/gunshot-sounds", author: "Tabasco" },
];

/** single files (not packs) with their own page */
export type Loose = { file: string; source: string; author: string; /** where to download it when it is not on disk yet */ url?: string };

export const LOOSE: Loose[] = [
  ...["airy.mp3", "sector.mp3", "urgent.mp3", "victory.mp3", "transmission.mp3", "pulse.mp3", "hover.mp3"].map((file) => ({ file, source: "https://opengameart.org/content/dark-sci-fi-audio-pack", author: "SRG774" })),
  { file: "cathedral.ogg", source: "https://opengameart.org/content/cathedral-in-the-forest-ambient-loop", author: "congusbongus" },
  { file: "war-drums.wav", source: "https://opengameart.org/content/horde-war-drums-loop", author: "William Hector" },
  { file: "bell1.wav", source: "https://opengameart.org/content/bell-dingschimes", author: "PWL" },
  { file: "bell3.wav", source: "https://opengameart.org/content/bell-dingschimes", author: "PWL" },
  { file: "drone57.wav", source: "https://opengameart.org/content/droning-sound-effects", author: "bretbernhoft" },
  { file: "ghostbreath.flac", source: "https://opengameart.org/content/ghost-breath", author: "qubodup" },
  { file: "zombie.ogg", source: "https://opengameart.org/content/zombie-moans", author: "Darsycho" },
  { file: "monster-roar.wav", source: "https://opengameart.org/content/cc0-deep-monster-roar", author: "trazzz123" },
  // music beds and loops found for the sound-rework change (OpenGameArt, CC0 on the page)
  { file: "music-dark-cavern.ogg", source: "https://opengameart.org/content/dark-cavern-ambient", author: "Paul Wortmann", url: "https://opengameart.org/sites/default/files/dark_cavern_ambient_001.ogg" },
  { file: "music-ancient-caverns.ogg", source: "https://opengameart.org/content/ancient-caverns-horror-ambient-loop", author: "congusbongus", url: "https://opengameart.org/sites/default/files/caverns.ogg" },
  { file: "music-ambient-horror.ogg", source: "https://opengameart.org/content/ambient-horror-track-01", author: "Nerdzmasterz", url: "https://opengameart.org/sites/default/files/ambient_horror_track01.ogg" },
  { file: "music-empty-city.ogg", source: "https://opengameart.org/content/emptycity-background-music", author: "TinyWorlds", url: "https://opengameart.org/sites/default/files/EmptyCity.ogg" },
  { file: "music-end-of-hope.mp3", source: "https://opengameart.org/content/at-the-end-of-hope", author: "Chasersgaming", url: "https://opengameart.org/sites/default/files/at%20the%20end%20of%20hope.mp3" },
  { file: "music-echoes-of-the-past.wav", source: "https://opengameart.org/content/echoes-of-the-past", author: "glitchart", url: "https://opengameart.org/sites/default/files/echoes_of_the_past.wav" },
  { file: "music-hallway.ogg", source: "https://opengameart.org/content/hallway", author: "thenewkgb", url: "https://opengameart.org/sites/default/files/hallway.ogg" },
  { file: "music-orien.ogg", source: "https://opengameart.org/content/orien", author: "Snabisch", url: "https://opengameart.org/sites/default/files/orien_1.ogg" },
  { file: "music-determined-pursuit.wav", source: "https://opengameart.org/content/determined-pursuit-epic-orchestra-loop", author: "Tozan", url: "https://opengameart.org/sites/default/files/determined_pursuit_loop.wav" },
  { file: "music-action-loop.ogg", source: "https://opengameart.org/content/action-music-loop", author: "AppPro", url: "https://opengameart.org/sites/default/files/action%20loop.ogg" },
];

/** the zip link on a Kenney asset page */
export function zipUrl(html: string): string | null {
  return html.match(/https:\/\/kenney\.nl\/media\/[^"'\s]+\.zip/)?.[0] ?? null;
}

/** downloads and extracts a pack with a page, once; returns whether it fetched anything */
export async function ensurePack(p: Pack, root = "sounds-src"): Promise<boolean> {
  if (!p.page || existsSync(`${root}/${p.dir}`)) return false;
  const html = await (await fetch(p.page, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  const url = zipUrl(html);
  if (!url) throw new Error(`${p.dir}: no zip link on ${p.page}`);
  mkdirSync(`${root}/packs`, { recursive: true });
  const zip = `${root}/packs/${p.dir}.zip`;
  if (!existsSync(zip)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${p.dir}: ${url} answered ${r.status}`);
    writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  }
  execFileSync("unzip", ["-q", "-o", zip, "-d", `${root}/${p.dir}`]);
  return true;
}

/** downloads a loose file that has a url and isn't on disk yet; returns whether it fetched anything */
export async function ensureLoose(l: Loose, root = "sounds-src"): Promise<boolean> {
  if (!l.url || existsSync(`${root}/${l.file}`)) return false;
  const r = await fetch(l.url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${l.file}: ${l.url} answered ${r.status}`);
  writeFileSync(`${root}/${l.file}`, Buffer.from(await r.arrayBuffer()));
  return true;
}
