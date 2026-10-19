import type { SoundManifest } from "./schema";

/** every UI moment the game plays, in the order the picker lists them; the manifest has a value (a clip or "none") for each */
export const MOMENTS = [
  "draw", "play", "flip", "commit", "shuffle", "phase", "button", "tip", "undo",
  "move", "reveal", "deckTap", "bagLand", "tokenClatter", "tokenPick", "avatarChoice", "countdown", "cancel",
  "builderAdd", "builderRemove", "builderReplace", "tab", "open", "close", "screen", "turn", "victory",
  "resource", "heal", "evade", "engage", "discard",
] as const;
// "play", "fight" and "spawn" also have a clip of the card's own (traits, cards); "fight" has no generic one

/**
 * The slots of a manifest, as the picker and the candidate list name them: "event:damage:horror", "event:token.1" (the
 * second clip of a layered event), "moment:draw", "trait:play:Firearm", "card:01016:fight", "music:bed:default".
 */
export function slotsOf(m: SoundManifest): string[] {
  const slots: string[] = [];
  for (const [k, v] of Object.entries(m.events)) {
    if (Array.isArray(v)) v.forEach((_, i) => slots.push(`event:${k}.${i}`));
    else slots.push(`event:${k}`);
  }
  for (const k of Object.keys(m.moments)) slots.push(`moment:${k}`);
  for (const [when, byTrait] of Object.entries(m.traits)) for (const trait of Object.keys(byTrait)) slots.push(`trait:${when}:${trait}`);
  for (const [code, byWhen] of Object.entries(m.cards)) for (const when of Object.keys(byWhen)) slots.push(`card:${code}:${when}`);
  for (const k of Object.keys(m.music)) slots.push(`music:${k}`);
  return slots;
}
