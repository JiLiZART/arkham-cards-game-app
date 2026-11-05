// The Pallid Mask (its token table's functions are its reference card's, 03240): the catacombs on the grid of
// engine-location-instances-grid. The starting location is The Gate to Hell, or, for investigators who awoke inside
// the catacombs, a random Catacombs other than the Tomb of Shadows and the Blocked Passage; the other Catacombs form the
// Catacombs deck, those two among its bottom five. Each Catacombs revealed puts the deck's next cards into play beside
// it in the directions it names (the revealer choosing among free spots; with none free, nothing). The investigators
// begin at the starting location; its Forced ability resolves on the first turn (setup can't ask), and with the secret
// passageway opened the lead then reveals a Catacombs beside it. Act 2's back marks two Conviction or two Doubt in the
// campaign log, which the flow reads.
import {
  allCards,
  campaignLogOf,
  card,
  cardIf,
  type CardScript,
  cellOf,
  createCard,
  currentAct,
  def,
  emit,
  enemies,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  locationAt,
  locations,
  moveCard,
  type ScriptRun,
  setCell,
  shuffleList,
  turnOrder,
  placeInvestigator,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  resolveEffect,
  revealLocation,
} from "../../../../src/engine/api";

export const GATE = "03247";
export const BLOCKED = "03256";
export const TOMB = "03257";
/** every Catacombs location (the revealed sides; Stone Archways, Candlelit Tunnels and Labyrinth of Bones twice) */
export const CATACOMBS = [
  "03247",
  "03248",
  "03249",
  "03250",
  "03251",
  "03252",
  "03253",
  "03254",
  "03255",
  "03256",
  "03257",
];
export const HARUKO = "03067b";
export const MITPM = "03059";
export const THE_WAY_OUT = "03245";
export const LEADING_THE_WAY = "03246";
/** the starting location's Forced ability waits for the first turn */
export const START_PENDING = "tpmStartPending";
/** the secret passageway is opened beside the starting location once its Forced ability has resolved */
export const PASSAGEWAY = "tpmSecretPassageway";

export type Dir = "left" | "right" | "above" | "below";
const DIR_LABEL: Record<Dir, string> = {
  left: "To the left",
  right: "To the right",
  above: "Above",
  below: "Below",
};
const toward = (c: [number, number], d: Dir): [number, number] =>
  d === "left"
    ? [c[0] - 1, c[1]]
    : d === "right"
      ? [c[0] + 1, c[1]]
      : d === "above"
        ? [c[0], c[1] - 1]
        : [c[0], c[1] + 1];

export const actIs = (game: GameContext, code: string) =>
  cardIf(game, currentAct(game))?.code === code;
export const startLocation = (game: GameContext) => flags.startLocation.get(game);

/** the Catacombs deck's top card still set aside */
function drawCatacomb(game: GameContext): InstId | undefined {
  const deck = (flags.catacombs.get(game) ?? []).filter(
    (id) => card(game, id).zone === ZONE.SetAside,
  );
  const top = deck.shift();
  flags.catacombs.set(game, deck);
  return top;
}

/** the deck's top card into play, Catacombs side up, on a cell */
function putCatacomb(game: GameContext, at: [number, number]) {
  const id = drawCatacomb(game);
  if (!id) return;
  moveCard(game, id, ZONE.Location);
  setCell(game, id, at);
  emit(game, EVENT.Location, "A Catacombs location is put into play", { card: id });
}

const failed = (game: GameContext, self: InstId) =>
  emit(game, EVENT.PlacementFailed, `${def(game, self).name}: no Catacombs can be put into play`, {
    card: self,
  });

/** "Put the top N Catacombs into play <here>, <there> …": one in each free spot named, in order */
export function catacombsEach(game: GameContext, self: InstId, dirs: Dir[]) {
  const here = cellOf(game, self);
  if (!here) return;
  const free = dirs.map((d) => toward(here, d)).filter((c) => !locationAt(game, c));
  if (!free.length) return failed(game, self);
  for (const c of free) putCatacomb(game, c);
}

/** "Put the topmost Catacombs into play <here> or <there>": the revealer chooses among the free spots */
export function catacombsOneOf(game: GameContext, run: ScriptRun, self: InstId, dirs: Dir[]) {
  const here = cellOf(game, self);
  if (!here) return;
  const free = dirs.filter((d) => !locationAt(game, toward(here, d)));
  if (!free.length) return failed(game, self);
  const d = run.choose<Dir>(
    free.map((x) => ({ id: x, label: DIR_LABEL[x], value: x, key: `option.tpmDirection.${x}` })),
    { text: `${def(game, self).name}: put the next Catacombs where?`, key: "tpmPlaceWhere" },
  );
  putCatacomb(game, toward(here, d));
}

/** "look at the revealed side of any Catacombs location in play" (Candlelit Tunnels, Catacombs Docent) */
export function peek(game: GameContext, run: ScriptRun) {
  const hidden = locations(game).filter((l) => !l.revealed);
  if (!hidden.length) return;
  const pick = run.chooseCard(
    hidden.map((l) => l.id),
    { text: "Look at which Catacombs?", key: "tpmPeek" },
  );
  emit(
    game,
    EVENT.Look,
    `${inv(game, run.you).name} looks at a Catacombs: ${def(game, pick).name}`,
    {
      inv: run.you,
      card: pick,
    },
  );
}

export default {
  fns: {
    /** "If Ishimaru Haruko is not listed under VIPs Slain": she waits set aside for act 1's back */
    harukoAside(game: GameContext) {
      createCard(game, HARUKO, ZONE.SetAside);
    },
    /** the starting location, the Catacombs deck, and everyone at the start */
    catacombs(game: GameContext) {
      const aside = (code: string) =>
        allCards(game).filter((c) => c.code === code && c.zone === ZONE.SetAside);
      const pool = CATACOMBS.flatMap((code) => aside(code).map((c) => c.id));
      const awoke = !!campaignLogOf(game).awokeInsideCatacombs;
      const candidates = awoke
        ? pool.filter((id) => ![TOMB, BLOCKED].includes(card(game, id).code))
        : pool.filter((id) => card(game, id).code === GATE);
      shuffleList(game, candidates);
      const start = candidates[0];
      moveCard(game, start, ZONE.Location);
      setCell(game, start, [0, 0]);
      flags.startLocation.set(game, start);
      // the Tomb, the Blocked Passage and 3 others the bottom 5; the rest on top, in a random order
      const rest = pool.filter((id) => id !== start);
      const pair = rest.filter((id) => [TOMB, BLOCKED].includes(card(game, id).code));
      const others = rest.filter((id) => !pair.includes(id));
      shuffleList(game, others);
      const bottom = [...pair, ...others.slice(0, 3)];
      shuffleList(game, bottom);
      const top = others.slice(3);
      flags.catacombs.set(game, [...top, ...bottom]);
      for (const i of turnOrder(game)) placeInvestigator(game, i, start);
      flags.rememberedFact.set(game, START_PENDING, true);
    },
    /** Ishimaru's Information: "you opened a secret passageway" */
    secretPassageway(game: GameContext) {
      flags.rememberedFact.set(game, PASSAGEWAY, true);
    },
    /** the bearer of The Man in the Pallid Mask sets him aside (one is made if no one bears him) */
    strangerAside(game: GameContext) {
      const his = allCards(game).find((c) => c.code === MITPM && c.owner && c.zone === ZONE.Deck);
      if (his) moveCard(game, his.id, ZONE.SetAside);
      else if (!findByCode(game, MITPM, [ZONE.SetAside])) createCard(game, MITPM, ZONE.SetAside);
    },
    /** with the secret passageway opened: the lead reveals a Catacombs beside the starting location */
    passageway(game: GameContext, run: ScriptRun) {
      const start = startLocation(game);
      const here = start ? cellOf(game, start) : null;
      if (!here) return;
      const beside = (["left", "right", "above", "below"] as const)
        .map((d) => locationAt(game, toward(here, d)))
        .filter((l): l is InstId => !!l && !card(game, l).revealed);
      if (!beside.length) return;
      const pick = run.chooseCard(beside, {
        text: "Reveal which Catacombs beside the starting location?",
        key: "tpmSecretPassageway",
      });
      queue(game, revealLocation(pick));
    },
  },
  hooks: {
    /** act 3: "If each undefeated investigator is at The Gate to Hell / Blocked Passage, advance." */
    checkObjectives(game: GameContext) {
      const at = actIs(game, THE_WAY_OUT) ? GATE : actIs(game, LEADING_THE_WAY) ? BLOCKED : null;
      if (!at) return;
      const playing = turnOrder(game).filter((i) => inv(game, i).status === "playing");
      if (playing.length && playing.every((i) => codeAt(game, i) === at))
        queue(game, advanceAct({ by: "objective" }));
    },
    /**
     * Corpse Dweller: "Discard a [[Humanoid]] enemy at any location and spawn Corpse Dweller at that location (if
     * there are no [[Humanoid]] enemies in play, discard Corpse Dweller and it gains surge instead)": with none, its
     * drawer draws again (it is discarded for having no spawn location)
     */
    spawnRedirect(game: GameContext, enemy: InstId, drawer: InvId | null) {
      if (card(game, enemy).code !== "03259" || !drawer) return undefined;
      if (!enemies(game).some((e) => def(game, e.id).traits.includes("Humanoid")))
        queue(
          game,
          resolveEffect({
            effect: { op: "drawEncounterCard" },
            ctx: { you: drawer, source: null },
          }),
        );
      return undefined;
    },
    ended(game: GameContext) {
      if (allCards(game).some((c) => c.code === HARUKO && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", HARUKO], true);
    },
  },
} satisfies CardScript;

const codeAt = (game: GameContext, i: InvId) => {
  const l = inv(game, i).location;
  return l ? card(game, l).code : null;
};
