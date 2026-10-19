/**
 * The sound slots (every event, moment, card sound and music role the game can play) and how five CC0 candidates are
 * drawn for each from the packs in sound-packs.ts. A slot lists substrings of file paths, one per sound family that could
 * fit; the candidates take one file from each family in turn, so the five differ in character. Which of them a slot uses
 * is the developer's ear's choice, made in the picker (ADR-0010).
 */
import { type Loose, type Pack, LOOSE, PACKS } from "./sound-packs";

export type Slot = { id: string; kind: "effect" | "music"; where: string; patterns: string[] };

const fx = (id: string, where: string, ...patterns: string[]): Slot => ({ id, kind: "effect", where, patterns });
const track = (id: string, where: string, ...patterns: string[]): Slot => ({ id, kind: "music", where, patterns });

const BEDS = ["sector", "airy", "cathedral", "music-dark-cavern", "music-ancient-caverns", "music-ambient-horror", "music-end-of-hope", "music-echoes", "music-hallway", "music-orien", "transmission", "drone57", "pulse"];

export const SLOTS: Slot[] = [
  // engine events (the animated ones)
  fx("event:token.0", "a chaos token leaves the bag: the rattle", "dice-shake", "dice-throw", "chips-handle", "stones_0", "beads"),
  fx("event:token.1", "a chaos token leaves the bag: the clink", "chips-collide", "chips-lay", "impactmetal_light", "impacttin", "coin"),
  fx("event:testResult", "a skill test is won", "confirmation_", "hit jingles/", "handlecoins", "item_gem", "bell3"),
  fx("event:testResult:fail", "a skill test is lost", "impactwood_heavy", "impactsoft_heavy", "error_00", "hit_0", "impactplate_heavy"),
  fx("event:encounter", "an encounter card is revealed", "thunder", "impactbell_heavy", "lowfrequency_explosion", "creature/monster_", "forcefield"),
  fx("event:attack", "an investigator attacks", "sword/", "sword-clash/", "swing", "knifeslice", "impactpunch_medium"),
  fx("event:spawn", "an enemy spawns", "creature/roar_", "creature/troll", "creature_roar", "creature/monster_", "slime"),
  fx("event:enemyMove", "an enemy moves", "footstep_wood", "footstep_concrete", "kenney-rpg-audio/audio/footstep", "sfx100v2_footstep", "footstep_snow"),
  fx("event:damage", "an investigator takes damage", "impactpunch_medium", "creature/hurt_", "impactsoft_medium", "sfx100v2_hit_", "creature_hurt"),
  fx("event:damage:horror", "an investigator takes horror", "ghostbreath", "creature/breath", "creature/weird_", "creature/scream_", "creature/alien_"),
  fx("event:clues", "clues are gained", "glass_00", "item_gem", "forcefield", "pluck_", "handlecoins"),
  fx("event:doom", "doom is placed", "impactbell", "bell1", "bell3", "bong_", "drone57"),
  fx("event:agendaAdvance", "the agenda advances", "bookflip", "pageflips/", "bookopen", "sfx100v2_door", "thunder"),
  fx("event:actAdvance", "the act advances", "bookclose", "bookplace", "rpg/book_0", "dooropen", "creak"),
  fx("event:enemyDefeated", "an enemy is defeated", "creature_die", "creature/scream_", "impactmetal_heavy", "creature/monster_0", "zombie"),
  fx("event:defeated", "an investigator is defeated", "thunder", "lowfrequency_explosion", "monster-roar", "zombie", "explosioncrunch"),
  fx("event:resolution", "the scenario ends", "music-jingles/audio/steel", "music-jingles/audio/sax", "music-jingles/audio/hit", "victory.mp3", "bell3"),
  fx("event:enemyDamage", "an enemy takes damage", "impactmetal_medium", "impactpunch_heavy", "sfx100v2_hit_", "rpg/blade_", "chop"),
  fx("event:weakness", "a weakness is drawn", "thunder", "ghostbreath", "creak", "drone57", "creature/weird_"),
  // UI moments
  fx("moment:draw", "drawing a card", "card-slide", "cards-pack-take-out", "kenney-rpg-audio/audio/cloth", "pageflips/", "card-shove"),
  fx("moment:play", "playing a card", "card-place", "impactsoft_medium", "impactwood_medium", "bookplace", "chip-lay"),
  fx("moment:flip", "flipping a card", "card-fan", "card-shove", "bookflip", "kenney-rpg-audio/audio/cloth", "card-slide"),
  fx("moment:commit", "committing a card to a test", "card-place", "chip-lay", "chips-stack", "select_", "tick_"),
  fx("moment:shuffle", "shuffling a deck", "card-shuffle", "cards-pack-open", "card-fan", "dice-grab", "kenney-rpg-audio/audio/cloth"),
  fx("moment:phase", "a phase begins", "impactbell", "bong_", "music-jingles/audio/steel", "forcefield", "creak"),
  fx("moment:button", "pressing a button", "interface-sounds/audio/click_", "ui-audio/audio/click", "mouseclick", "ui-audio/audio/switch", "tick_"),
  fx("moment:tip", "a tip appears", "pops/", "pluck_", "bong_", "glass_00", "select_"),
  fx("moment:undo", "taking back an action", "back_", "scratch_", "minimize_", "drop_", "rewind"),
  fx("moment:move", "an investigator's marker lands", "footstep_", "impactsoft_medium", "drop_", "chip-lay", "wood_0"),
  fx("moment:reveal", "a card is revealed", "card-fan", "glass_00", "question_", "pluck_", "scratch_"),
  fx("moment:deckTap", "tapping a deck", "card-slide", "card-shove", "ui-audio/audio/switch", "rollover", "cards-pack-take-out"),
  fx("moment:bagLand", "the token bag lands on the table", "kenney-rpg-audio/audio/cloth", "handlesmallleather", "dropleather", "beltHandle", "impactsoft_heavy"),
  fx("moment:tokenClatter", "the tokens clatter out of the bag", "dice-throw", "chips-collide", "chips-stack", "stones_0", "beads"),
  fx("moment:tokenPick", "picking a token", "chips-handle", "dice-grab", "ui-audio/audio/switch", "interface-sounds/audio/click_", "impacttin"),
  fx("moment:avatarChoice", "choosing an investigator", "select_", "confirmation_", "toggle_", "ui-audio/audio/switch", "rollover"),
  fx("moment:countdown", "the countdown closes", "tick_", "confirmation_", "bong_", "drop_", "maximize_"),
  fx("moment:cancel", "calling a skill test off", "back_", "minimize_", "error_00", "scratch_", "close_"),
  fx("moment:builderAdd", "adding a card to the deck", "card-place", "drop_", "chip-lay", "select_", "pluck_"),
  fx("moment:builderRemove", "removing a card from the deck", "card-slide", "back_", "minimize_", "kenney-rpg-audio/audio/cloth", "scratch_"),
  fx("moment:builderReplace", "replacing a card in the deck", "card-shove", "ui-audio/audio/switch", "toggle_", "card-fan", "kenney-rpg-audio/audio/cloth"),
  fx("moment:tab", "switching a tab", "tick_", "ui-audio/audio/switch", "rollover", "toggle_", "interface-sounds/audio/click_"),
  fx("moment:open", "a dialog or drawer opens", "open_", "maximize_", "dooropen", "bookopen", "creak"),
  fx("moment:close", "a dialog or drawer closes", "close_", "minimize_", "doorclose", "bookclose", "back_"),
  fx("moment:screen", "the screen changes", "scroll_", "bong_", "impactbell", "dooropen", "forcefield"),
  fx("moment:turn", "a turn's title appears", "impactbell", "bong_", "music-jingles/audio/steel", "drone57", "sfx100v2_loop_ambient"),
  fx("moment:victory", "the scenario is won", "music-jingles/audio/hit", "music-jingles/audio/steel", "music-jingles/audio/sax", "victory.mp3", "bell3"),
  fx("moment:resource", "a resource is gained", "handlecoins", "coin", "item_coins", "chips-handle", "impacttin"),
  fx("moment:heal", "damage or horror is healed", "pluck_", "forcefield", "confirmation_", "spell_0", "bubble"),
  fx("moment:evade", "an enemy is evaded", "kenney-rpg-audio/audio/cloth", "swing", "scroll_", "footstep_grass", "slide"),
  fx("moment:engage", "an enemy engages", "sword-clash/", "impactmetal_medium", "chainmail", "metallatch", "metalclick"),
  fx("moment:discard", "a card is discarded", "card-shove", "dropleather", "kenney-rpg-audio/audio/cloth", "scratch_", "paper"),
  // a card's own sound (by trait, then by card)
  fx("trait:play:Firearm", "playing a Firearm", "metallatch", "metalclick", "ui-audio/audio/switch", "metal_0", "sfx100v2_switch"),
  fx("trait:play:Melee", "playing a Melee weapon", "sword-unsheathe", "drawknife", "sword/", "swing", "chainmail"),
  fx("trait:play:Spell", "playing a Spell", "spell_0", "magic1", "forcefield", "spell_fire", "pluck_"),
  fx("trait:play:Tome", "playing a Tome", "bookopen", "bookflip", "rpg/book_0", "bookplace", "pageflips/"),
  fx("trait:play:Ally", "playing an Ally", "kenney-rpg-audio/audio/footstep", "kenney-rpg-audio/audio/cloth", "handlesmallleather", "dooropen", "cloth"),
  fx("trait:play:Item", "playing an Item", "item_misc", "handlecoins", "bottle", "metal-small", "item_wood"),
  fx("trait:fight:Firearm", "a Firearm is used in a fight", "gunshots/", "impactmetal_heavy", "lowfrequency_explosion", "explosioncrunch", "impactplate_heavy"),
  fx("trait:fight:Melee", "a Melee weapon is used in a fight", "sword-clash/", "sword/", "swing", "impactmetal_medium", "knifeslice"),
  fx("trait:fight:Spell", "a Spell is used in a fight", "spell_fire", "magic1", "kenney-sci-fi-sounds/audio/laserlarge", "forcefield", "lowfrequency_explosion"),
  fx("trait:spawn:Ghoul", "a Ghoul spawns", "creature/monster_", "zombie", "creature/troll", "creature_monster", "slime"),
  fx("trait:spawn:Monster", "a Monster spawns", "monster-roar", "creature/roar_", "creature_roar", "creature/troll", "spaceenginelow"),
  fx("trait:spawn:Humanoid", "a Humanoid spawns", "kenney-rpg-audio/audio/footstep", "creature/grunt_", "kenney-rpg-audio/audio/cloth", "creak", "dooropen"),
  fx("card:01016:fight", "the .45 Automatic is used in a fight", "gunshots/", "impactmetal_heavy", "lowfrequency_explosion", "impactplate_heavy", "explosioncrunch"),
  // music roles
  track("music:bed:the-gathering", "the bed of The Gathering", ...BEDS),
  track("music:bed:the-midnight-masks", "the bed of The Midnight Masks", ...BEDS),
  track("music:bed:default", "the bed of a scenario without its own", ...BEDS),
  track("music:bed:the-devourer-below", "the bed of The Devourer Below", ...BEDS),
  track("music:fight", "while an enemy is engaged", "war-drums", "music-action-loop", "music-determined-pursuit", "urgent", "pulse", "music-empty-city", "sector"),
  track("music:tension", "in the enemy phase and one doom from the agenda advancing", "urgent", "pulse", "music-hallway", "music-orien", "drone57", "transmission", "music-ambient-horror", "airy"),
];

export type Source = { path: string; source: string; author: string };

const AUDIO = /\.(ogg|wav|mp3|flac)$/i;

/** every candidate file with its provenance, from the packs and loose files that exist under `root` */
export function inventory(list: (rel: string) => string[], exists: (rel: string) => boolean, packs: Pack[] = PACKS, loose: Loose[] = LOOSE): Source[] {
  const out: Source[] = [];
  for (const p of packs) for (const f of list(p.dir)) if (AUDIO.test(f) && !/preview|__MACOSX|\/\._/i.test(f)) out.push({ path: `${p.dir}/${f}`, source: p.source, author: p.author });
  for (const l of loose) if (exists(l.file)) out.push({ path: l.file, source: l.source, author: l.author });
  return out;
}

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * The files that may serve a slot, best first: one from each pattern's family in turn (starting at a place in the
 * family, and with a family, that depend on the slot, so two slots sharing families don't offer the same files). The caller takes the first
 * five that pass its own checks (length, readable).
 */
export function candidateOrder(slot: Slot, files: Source[]): Source[] {
  // the families start in a different order per slot too, so slots with the same families still open differently
  const turn = hash(slot.id) % slot.patterns.length;
  const pools = [...slot.patterns.slice(turn), ...slot.patterns.slice(0, turn)].map((p) => files.filter((f) => f.path.toLowerCase().includes(p.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path)));
  const taken = new Set<string>();
  const order: Source[] = [];
  const next = pools.map((pool) => (pool.length ? hash(slot.id) % pool.length : 0));
  for (let progress = true; progress; ) {
    progress = false;
    pools.forEach((pool, i) => {
      for (let n = 0; n < pool.length; n++) {
        const f = pool[(next[i] + n) % pool.length];
        if (taken.has(f.path)) continue;
        taken.add(f.path);
        next[i] = (next[i] + n + 1) % pool.length;
        order.push(f);
        progress = true;
        return;
      }
    });
  }
  return order;
}
