// Black Stars Rise (its token table's function is its reference card's, 03274): no act deck, two agenda decks (1a 2a
// 3a and 1c 2c 3c, engine-scenario-structure). Agendas 2a and 2c, the Chapel of St. Aubert and the Abbey Tower come
// from one pile at random, The Flood Below's or The Vortex Above's; the other pile leaves the game. One agenda 2's back
// replaces the rest of its deck with a set-aside act 3 (Open the Path Below at the Chapel: R1; Above at the Tower: R2),
// the other's spawns Beast of Aldebaran and Ashleigh Clarke and leads to an agenda 3 whose back is R3. Agenda 1's backs
// mark one Conviction or Doubt by the doom on the other deck's agenda 1. The set-aside locations enter play when the
// Abbey Church is revealed; the Chapel needs "found a guide" (the Cloister), the Tower "found the tower key" (Knight's
// Hall). If Ashleigh Clarke was interviewed, an investigator may remove 1 doom from an agenda once per game.
import {
  allCards,
  card,
  cardIf,
  type CardScript,
  createCard,
  currentAct,
  currentAgenda,
  currentAgendas,
  deckCards,
  def,
  emit,
  enemies,
  type EffCtx,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  locations,
  moveCard,
  randomInt,
  reshuffleDiscard,
  type ScriptRun,
  setCode,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  addCounter,
  argField,
  asNumber,
  cancelEvent,
  controlled,
  dealDamage,
  discard,
  pile,
  placeDoom,
  remainingSanity,
  resolveEffect,
  runScript,
  spawn,
} from "../../../../src/engine/api";

export const PORTE = "03283";
export const ABBEY_CHURCH = "03291";
export const CHOEUR = ["03292", "03293"];
export const CLOISTER = "03294";
export const KNIGHTS_HALL = "03295";
/** Return to Black Stars Rise's Cloister and Knight's Hall (52055, 52056): set aside instead when their pile is kept */
export const NEW_CLOISTER_PAIR = ["52055", "52056"];
export const CHAPEL = ["03296", "03297"];
export const TOWER = ["03298", "03299"];
/** act 3a (the Chapel, R1) and act 3c (the Tower, R2) */
export const ACT_BELOW = "03281";
export const ACT_ABOVE = "03282";
export const ASHLEIGH = "03069b";
export const BEAST = "03088";
export const TIDAL_TERROR = "03300";
export const RIFT_SEEKER = "03301";
export const ANCIENT_EVILS = "01166";
/** "remember that you have 'found a guide'" (the Cloister), "'found the tower key'" (Knight's Hall) */
export const FOUND_GUIDE = "foundAGuide";
export const TOWER_KEY = "foundTheTowerKey";
/** Ashleigh's Information: the group may remove 1 doom from an agenda, once per game */
export const ASHLEIGHS_INFORMATION = "bsrAshleighsInformation";

/** each pile's agenda 2a, agenda 2c, Chapel and Tower (the scenario file lists The Flood Below's agendas) */
const FLOOD = { a: "03276b", c: "03279a", chapel: "03296", tower: "03299" };
const VORTEX = { a: "03276a", c: "03279b", chapel: "03297", tower: "03298" };

/** the current agenda of a deck, if that deck is still an agenda deck */
export const agendaOf = (game: GameContext, deck: "a" | "c") => currentAgenda(game, deck);
/** the doom on a deck's current agenda (0 when the deck holds none) */
export const doomOf = (game: GameContext, deck: "a" | "c") => {
  const id = currentAgenda(game, deck);
  return id ? card(game, id).doom : 0;
};
/** every agenda in play */
export const agendasInPlay = (game: GameContext): InstId[] =>
  Object.values(currentAgendas(game)).filter((x): x is InstId => !!x);
/** a location in play of one of these codes */
export const inPlay = (game: GameContext, codes: string[]) =>
  locations(game).find((l) => codes.includes(l.code));
/** the stage of the "a" (or "c") side: agenda 1, 2 or 3, or 3 once its act 3 is in play (Crashing Floods, Worlds Merge) */
export function stageOf(game: GameContext, deck: "a" | "c"): number {
  const act = cardIf(game, currentAct(game));
  if (act?.code === (deck === "a" ? ACT_BELOW : ACT_ABOVE)) return 3;
  const id = currentAgenda(game, deck);
  return id ? (def(game, id).stage ?? 0) : 0;
}

function mark(game: GameContext, which: "conviction" | "doubt") {
  const key = [which, which] as const;
  flags.countEntry.set(game, key, (flags.countEntry.get(game, key) ?? 0) + 1);
  emit(game, EVENT.Remember, `Mark one ${which === "conviction" ? "Conviction" : "Doubt"}`, {
    data: { key: which },
  });
}

/** agenda 1's back: the set-aside copies shuffled in with the discard pile; Conviction or Doubt by the other agenda 1 */
export function sunrise(game: GameContext, shuffleIn: string, other: "a" | "c", otherCode: string) {
  for (const c of allCards(game).filter((x) => x.code === shuffleIn && x.zone === ZONE.SetAside))
    moveCard(game, c.id, ZONE.EncounterDeck);
  reshuffleDiscard(game, "encounter");
  const id = currentAgenda(game, other);
  if (!id || card(game, id).code !== otherCode) return;
  mark(game, card(game, id).doom <= 2 ? "conviction" : "doubt");
}

/** "The Path to Carcosa": the rest of this agenda deck leaves the game; its act 3 is the current act */
export function pathToCarcosa(game: GameContext, deck: "a" | "c") {
  // a copy: the pile changes as its cards leave
  for (const id of deckCards(game, "agenda", deck).slice()) moveCard(game, id, ZONE.Removed);
  const act = findByCode(game, deck === "a" ? ACT_BELOW : ACT_ABOVE, [ZONE.SetAside]);
  if (!act) return;
  moveCard(game, act.id, ZONE.Act, { deck: "a" });
  emit(game, EVENT.Act, `New act: ${def(game, act.id).name}`, { card: act.id });
}

/**
 * "Worlds Intertwine": Beast of Aldebaran spawns at a set-aside location (discarded if it isn't in play), Ashleigh
 * Clarke at Porte de l'Avancée unless she was slain; the other act 3 leaves the game; agenda 3 follows
 */
export function worldsIntertwine(game: GameContext, beastAt: string[], removeAct: string) {
  const beast = findByCode(game, BEAST, [ZONE.SetAside]);
  const at = inPlay(game, beastAt);
  const ashleigh = findByCode(game, ASHLEIGH, [ZONE.SetAside]);
  const porte = inPlay(game, [PORTE]);
  const act = findByCode(game, removeAct, [ZONE.SetAside]);
  if (act) moveCard(game, act.id, ZONE.Removed);
  if (beast && !at) moveCard(game, beast.id, ZONE.EncounterDiscard);
  queue(
    game,
    ...(beast && at ? [spawn({ enemy: beast.id, inv: null, at: at.id })] : []),
    ...(ashleigh && porte ? [spawn({ enemy: ashleigh.id, inv: null, at: porte.id })] : []),
  );
}

/** Ashleigh's Information: an investigator removes 1 doom from an agenda in play (group limit once per game) */
export function ashleighsInformation(game: GameContext, run: ScriptRun) {
  const withDoom = agendasInPlay(game).filter((id) => card(game, id).doom > 0);
  if (!withDoom.length) return;
  const pick = run.chooseCard(withDoom, {
    text: "Remove 1 doom from which agenda?",
    key: "bsrRemoveDoom",
  });
  flags.rememberedFact.clear(game, ASHLEIGHS_INFORMATION);
  addCounter(game, pick, "doom", -1);
  emit(game, EVENT.Doom, `1 doom is removed from ${def(game, pick).name}`, {
    card: pick,
    data: { n: -1 },
  });
}
/** offered on one agenda only: deck a's while it is an agenda deck, else deck c's */
export const ashleighOffered = (game: GameContext, ctx: EffCtx) =>
  !!flags.rememberedFact.get(game, ASHLEIGHS_INFORMATION) &&
  agendasInPlay(game)[0] === ctx.source &&
  agendasInPlay(game).some((id) => card(game, id).doom > 0);

/**
 * Broken Steps: "you must either <lose 1 action / discard an asset you control>, or draw the topmost <[[Omen]] treachery /
 * [[Cultist]] enemy> in the encounter discard pile" (the drawn card is put on top of the deck and drawn from there)
 */
export function brokenSteps(game: GameContext, run: ScriptRun, version: "omen" | "cultist") {
  const [trait, type] = version === "omen" ? ["Omen", "treachery"] : ["Cultist", "enemy"];
  const top = [...pile(game, "encounterDiscard")]
    .reverse()
    .find((id) => def(game, id).type === type && def(game, id).traits.includes(trait));
  const canPay = version === "omen" || controlled(game, run.you).length > 0;
  const options = [
    ...(canPay
      ? [
          version === "omen"
            ? { id: "pay", label: "Lose 1 action", value: "pay", key: "option.bsrLoseAction" }
            : {
                id: "pay",
                label: "Discard an asset you control",
                value: "pay",
                key: "option.bsrDiscardAsset",
              },
        ]
      : []),
    ...(top
      ? [
          {
            id: "draw",
            label: `Draw ${def(game, top).name}`,
            value: "draw",
            key: "option.bsrDrawTopmost",
            vars: { card: top },
          },
        ]
      : []),
  ];
  if (!options.length) return;
  const pick = run.choose<string>(options, {
    text: `${def(game, run.source).name}: choose one`,
    key: "bsrBrokenSteps",
  });
  const ctx = { ...run.ctx, you: run.you, source: run.source };
  if (pick === "draw" && top) {
    moveCard(game, top, ZONE.EncounterDeck, { top: true });
    queue(game, resolveEffect({ effect: { op: "drawEncounterCard" }, ctx }));
  } else
    queue(
      game,
      resolveEffect({
        effect: version === "omen" ? { op: "loseActions", amount: 1 } : { op: "discardAsset" },
        ctx,
      }),
    );
}

/** Chœur Gothique: "[action] Place 1 doom on the current <"a" / "c"> agenda: Heal 2 <damage / horror>" (group limit once per game) */
export const choeur = (deck: "a" | "c"): CardScript => ({
  abilities: [
    {
      kind: "action",
      label: `Chœur Gothique: 1 doom on the current "${deck}" agenda, heal 2 ${deck === "a" ? "damage" : "horror"}`,
      condition: { script: "agendaThere" },
      limit: { per: "game", count: 1, group: true },
      run: "choeur",
    },
  ],
  conditions: { agendaThere: (game: GameContext) => !!currentAgenda(game, deck) },
  fns: {
    choeur(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game, deck);
      if (!agenda) return;
      queue(
        game,
        placeDoom({ card: agenda, n: 1 }),
        resolveEffect({
          effect: deck === "a" ? { op: "heal", damage: 2 } : { op: "heal", horror: 2 },
          ctx: { you: run.you, source: run.source },
        }),
      );
    },
  },
});

/** the hidden way: an unrevealed Chapel (Tower) can be entered once the group has "found a guide" ("the tower key") */
const unlocked = (game: GameContext, self: InstId, fact: string) =>
  !card(game, self).revealed && flags.rememberedFact.get(game, fact)
    ? [{ target: self, mod: { flag: "ignoreUnrevealedText" as const } }]
    : [];

/** "You can only discover clues in <this location> if …": a discovery here that doesn't meet it is cancelled */
const onlyIf = (name: string) => ({
  kind: "forced" as const,
  trigger: "wouldDiscoverClues" as const,
  label: `${name}: no clues discovered`,
  condition: { script: "cannotDiscoverHere" },
  run: "noClues",
});
const noClues = (game: GameContext, run: ScriptRun) => {
  if (run.ctx.key) cancelEvent(game, run.ctx.key);
};

/** the Chapel of St. Aubert: The Path is Open's clue rule and horror action, both versions' hidden way */
export const chapel = (open: boolean): CardScript => ({
  abilities: open
    ? [
        onlyIf("Chapel of St. Aubert"),
        { kind: "action", label: "Chapel of St. Aubert: take up to 3 horror", run: "horror" },
      ]
    : [],
  modifiers: (game: GameContext, self: InstId) => unlocked(game, self, FOUND_GUIDE),
  conditions: {
    // "You can only discover clues in the Chapel of St. Aubert if you have 3 or fewer remaining sanity"
    cannotDiscoverHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && remainingSanity(game, ctx.inv) > 3,
  },
  fns: {
    noClues,
    horror(game: GameContext, run: ScriptRun) {
      const n = run.choose<number>(
        [1, 2, 3].map((k) => ({
          id: String(k),
          label: `${k} horror`,
          value: k,
          key: "option.bsrHorror",
          vars: { n: k },
        })),
        { text: "Take how much horror?", key: "bsrTakeHorror" },
      );
      queue(
        game,
        dealDamage({ inv: run.you, damage: 0, horror: n, direct: false, source: run.source }),
      );
    },
  },
});

/** the Abbey Tower: The Path is Open's clue rule and discard action, both versions' locked door */
export const tower = (open: boolean): CardScript => ({
  abilities: open
    ? [
        onlyIf("Abbey Tower"),
        {
          kind: "action",
          label: "Abbey Tower: discard up to 3 cards from your hand",
          run: "discard",
        },
      ]
    : [],
  modifiers: (game: GameContext, self: InstId) => unlocked(game, self, TOWER_KEY),
  conditions: {
    // "You can only discover clues in the Abbey Tower if you have no cards in your hand"
    cannotDiscoverHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && inv(game, ctx.inv).hand.length > 0,
  },
  fns: {
    noClues,
    /** one card at a time, up to 3 (`args`: how many are left) */
    discard(game: GameContext, run: ScriptRun) {
      const left = asNumber(argField(run.args, "left")) ?? 3;
      const hand = inv(game, run.you).hand;
      if (!hand.length || left <= 0) return;
      const pick = run.choose<string>(
        [
          ...hand.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { id: "stop", label: "Stop discarding", value: "stop", key: "option.bsrStopDiscarding" },
        ],
        { text: "Discard which card?", key: "bsrTowerDiscard" },
        { auto: false },
      );
      if (pick === "stop") return;
      discard(game, pick);
      queue(
        game,
        runScript({
          code: card(game, run.source).code,
          fn: "discard",
          ctx: run.ctx,
          args: { left: left - 1 },
        }),
      );
    },
  },
});

/** while this card is agenda 2a or 3a: each Ancient Evils gains surge */
export const ancientEvilsSurge = (game: GameContext) =>
  allCards(game)
    .filter((c) => c.code === ANCIENT_EVILS)
    .map((c) => ({ target: c.id, mod: { keyword: "surge" as const } }));
/** while this card is agenda 2c or 3c: each [[Monster]] enemy gets +1 fight */
export const monstersFight = (game: GameContext) =>
  enemies(game)
    .filter((e) => def(game, e.id).traits.includes("Monster"))
    .map((e) => ({ target: e.id, mod: { stat: "fight" as const, value: 1 } }));

/** the agendas' group ability: spend 1 clue per investigator, 1 doom here, then each investigator's reward */
export const groupDoom = (reward: "resources" | "cards") => ({
  kind: "fast" as const,
  label: `${reward === "resources" ? "Each investigator gains 2 resources" : "Each investigator draws 1 card"}: spend 1 clue per investigator, 1 doom on this agenda`,
  cost: { cluesPerInvestigator: 1 },
  limit: { per: "round" as const, count: 1, group: true },
  effects: [
    { op: "placeDoom" as const, amount: 1, on: "self" as const },
    reward === "resources"
      ? { op: "gainResources" as const, amount: 2, target: "each" as const }
      : { op: "drawCards" as const, amount: 1, target: "each" as const },
    { op: "checkDoom" as const },
  ],
});
/** Ashleigh's Information, offered on the agendas */
export const ashleighAbility = {
  kind: "fast" as const,
  label: "Ashleigh's Information: remove 1 doom from an agenda",
  condition: { script: "ashleighOffered" },
  run: "ashleigh",
};

export default {
  conditions: {
    /** the doom was placed on deck a's (deck c's) current agenda (the Outer Wall, North Tower) */
    onDeckA: (game: GameContext, ctx: EffCtx) =>
      !!ctx.card && ctx.card === currentAgenda(game, "a"),
    onDeckC: (game: GameContext, ctx: EffCtx) =>
      !!ctx.card && ctx.card === currentAgenda(game, "c"),
  },
  fns: {
    /** "If Ashleigh Clarke is not listed under VIPs Slain": she waits set aside for an agenda 2's back */
    ashleighAside(game: GameContext) {
      createCard(game, ASHLEIGH, ZONE.SetAside);
    },
    /** Ashleigh's Information (she was interviewed) */
    ashleighsInformation(game: GameContext) {
      flags.rememberedFact.set(game, ASHLEIGHS_INFORMATION, true);
    },
    /** one pile at random: its agendas 2a and 2c, Chapel and Tower; the other pile out of the game; both acts set aside */
    pile(game: GameContext) {
      const vortex = randomInt(game, 2) === 1;
      const [use, other] = vortex ? [VORTEX, FLOOD] : [FLOOD, VORTEX];
      for (const deck of ["a", "c"] as const)
        for (const id of deckCards(game, "agenda", deck))
          if (card(game, id).code === other[deck]) setCode(game, id, use[deck]);
      for (const c of allCards(game).filter(
        (x) => x.zone === ZONE.SetAside && [other.chapel, other.tower].includes(x.code),
      ))
        moveCard(game, c.id, ZONE.Removed);
      createCard(game, ACT_BELOW, ZONE.SetAside);
      createCard(game, ACT_ABOVE, ZONE.SetAside);
    },
  },
  hooks: {
    /** act 3: "If each undefeated investigator is at <the Chapel / the Abbey Tower> and there are no clues there, advance" */
    checkObjectives(game: GameContext) {
      const act = cardIf(game, currentAct(game));
      const place = act?.code === ACT_BELOW ? CHAPEL : act?.code === ACT_ABOVE ? TOWER : null;
      const loc = place && inPlay(game, place);
      if (!loc || loc.clues > 0) return;
      const playing = turnOrder(game).filter((i) => inv(game, i).status === "playing");
      if (playing.length && playing.every((i) => inv(game, i).location === loc.id))
        queue(game, advanceAct({ by: "objective" }));
    },
    ended(game: GameContext) {
      if (allCards(game).some((c) => c.code === ASHLEIGH && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", ASHLEIGH], true);
    },
  },
} satisfies CardScript;
