import { peril, surge as surgeFlag } from "../world/flags";
import { abilitiesOf, actClueCost, hasFlag } from "../queries";
import {
  activeInvs,
  addCounter,
  allCards,
  card,
  cardIf,
  currentAct,
  currentAgenda,
  currentPhase,
  def,
  emit,
  endScenario,
  type GameContext,
  inv,
  invName,
  isCancelled,
  leadInvestigator,
  pile,
  push,
  scenarioIdOf,
  setCounter,
  tapToDraw,
} from "../context";
import { moveCard, reshuffleDiscard } from "../movement";
import type { InstId, Step } from "../world/types";
import { win } from "./cards";
import { EVENT } from "../events/event";
import { ZONE, type Zone } from "../world/constants";
import { STEP } from "../steps/step";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

// ---------- encounter deck ----------
export const drawEncounterHandler: Handler<"DrawEncounter"> = (game, step) => {
  if (inv(game, step.inv).status !== "playing") return;
  if (!tapToDraw(game, step, step.inv, "encounter", 1)) return;
  if (pile(game, ZONE.EncounterDeck).length === 0) {
    reshuffleDiscard(game, "encounter");
    emit(game, EVENT.Reshuffle, "The encounter discard pile is shuffled into a new encounter deck");
  }
  const id = pile(game, ZONE.EncounterDeck)[0];
  if (!id) return;
  const d = def(game, id);
  moveCard(game, id, ZONE.Resolving);
  emit(game, EVENT.Encounter, `${invName(game, step.inv)} draws ${d.name}`, {
    inv: step.inv,
    card: id,
  });
  if (d.type === "enemy") {
    push(
      game,
      { t: STEP.Spawn, enemy: id, inv: step.inv },
      ...(d.keywords.includes("surge") ? [{ t: STEP.DrawEncounter, inv: step.inv } as Step] : []),
    );
    return;
  }
  push(game, win("treacheryDrawn", { inv: step.inv, card: id, key: `rev:${id}` }), {
    t: STEP.Revelation,
    inv: step.inv,
    card: id,
  });
};

export const revelationHandler: Handler<"Revelation"> = (game, step) => {
  const c = cardIf(game, step.card);
  if (!c) return;
  if (isCancelled(game, `rev:${step.card}`)) {
    emit(game, EVENT.Cancelled, `${def(game, step.card).name}'s revelation is cancelled`, {
      card: step.card,
    });
    moveCard(game, step.card, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
    return;
  }
  const d = def(game, step.card);
  moveCard(game, step.card, ZONE.Resolving);
  if (d.keywords.includes("peril")) peril.set(game, true);
  const ctx = { source: step.card, you: step.inv, inv: step.inv };
  const steps: Step[] = [];
  for (const a of abilitiesOf(game, step.card)) {
    if (a.kind !== "revelation") continue;
    if (a.run) steps.push({ t: STEP.Script, code: c.code, fn: a.run, ctx });
    else if (a.effects) steps.push({ t: STEP.Effects, effects: a.effects, ctx });
  }
  steps.push({ t: STEP.Script, code: "__engine", fn: "finishRevelation", ctx });
  push(game, ...steps);
};

export function finishRevelation(game: GameContext, cardId: InstId, invId: string) {
  const c = cardIf(game, cardId);
  peril.clear(game);
  const surges = surgeFlag.take(game, cardId) || def(game, cardId).keywords.includes("surge");
  // a treachery with Victory X is added to the victory display instead (Grimoire, Victory X)
  const d = def(game, cardId);
  const playerType = d.type === "asset" || d.type === "event" || d.type === "skill";
  if (c?.zone === "resolving")
    moveCard(
      game,
      cardId,
      !c.owner && d.victory !== undefined
        ? ZONE.Victory
        : c.owner
          ? playerType
            ? ZONE.Hand
            : ZONE.Discard
          : ZONE.EncounterDiscard,
    );
  if (surges) push(game, { t: STEP.DrawEncounter, inv: invId });
}

// ---------- doom, agenda, act ----------
const DOOM_ZONES: Zone[] = [
  ZONE.Agenda,
  ZONE.Act,
  ZONE.Enemy,
  ZONE.Play,
  ZONE.Location,
  ZONE.Attached,
  ZONE.Threat,
];
export const doomInPlay = (game: GameContext) =>
  allCards(game)
    .filter((c) => DOOM_ZONES.includes(c.zone))
    .reduce((n, c) => n + c.doom, 0);

export const placeDoomHandler: Handler<"PlaceDoom"> = (game, step) => {
  const c = cardIf(game, step.card);
  if (!c) return;
  // the agenda may replace placing doom (Brethren of Ash)
  const agenda = currentAgenda(game) ? cardIf(game, currentAgenda(game)) : undefined;
  if (agenda && game.db.scripts[agenda.code]?.wouldPlaceDoom?.(game, agenda.id, step.n)) return;
  addCounter(game, c.id, "doom", step.n);
  emit(game, EVENT.Doom, `${step.n} doom placed on ${def(game, step.card).name}`, {
    card: step.card,
    data: { n: step.n },
  });
  push(game, win("doomPlaced", { card: step.card, amount: step.n }));
};

export const checkDoomHandler: Handler<"CheckDoom"> = (game) => {
  const agenda = currentAgenda(game);
  if (!agenda || currentPhase(game) === "ended") return;
  const threshold = def(game, agenda).doom ?? Infinity;
  if (doomInPlay(game) >= threshold) push(game, { t: STEP.AdvanceAgenda });
};

function backSide(game: GameContext, id: InstId): Step[] {
  const c = card(game, id);
  return abilitiesOf(game, id)
    .filter((a) => a.kind === "revelation")
    .map((a): Step =>
      a.run
        ? {
            t: STEP.Script,
            code: c.code,
            fn: a.run,
            ctx: { source: id, you: leadInvestigator(game) },
          }
        : {
            t: STEP.Effects,
            effects: a.effects ?? [],
            ctx: { source: id, you: leadInvestigator(game) },
          },
    );
}

export const advanceAgendaHandler: Handler<"AdvanceAgenda"> = (game, step) => {
  const id = currentAgenda(game);
  if (!id) return;
  if (!step.fired) {
    push(game, win("agendaAdvances", { card: id }), { ...step, fired: true });
    return;
  }
  for (const c of allCards(game))
    if (DOOM_ZONES.includes(c.zone)) setCounter(game, c.id, "doom", 0);
  emit(
    game,
    EVENT.AgendaAdvance,
    `Agenda advances: ${def(game, id).backName ?? def(game, id).name}`,
    {
      card: id,
    },
  );
  moveCard(game, id, ZONE.Limbo);
  push(game, ...backSide(game, id), {
    t: STEP.Script,
    code: "__engine",
    fn: "nextAgenda",
    ctx: { source: id },
  });
};

export function nextAgenda(game: GameContext, prev: InstId) {
  if (currentPhase(game) === "ended") return;
  moveCard(game, prev, ZONE.Removed);
  const next = pile(game, ZONE.AgendaDeck)[0];
  if (next) {
    moveCard(game, next, ZONE.Agenda);
    emit(game, EVENT.Agenda, `New agenda: ${def(game, next).name}`, { card: next });
  } else endUnscripted(game, prev, EVENT.Agenda);
}

/**
 * The resolution an unscripted last act or agenda leads to (generated scenarios, ADR-0007): the "(→R2)" its back
 * names when the scenario has it, else the first numbered resolution for an act and no resolution for an agenda.
 */
export function finalResolution(
  backText: string | undefined,
  ids: string[],
  kind: "act" | "agenda",
): string {
  const named = /→\s*(R\d+)/.exec((backText ?? "").replace(/<[^>]+>/g, ""))?.[1];
  if (named && ids.includes(named)) return named;
  if (kind === "agenda") return "none";
  return (
    ids
      .filter((i) => /^R\d+$/.test(i))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))[0] ?? "none"
  );
}

/** the deck ran out and the card's back did nothing (no written behaviour): the scenario ends rather than stalls */
function endUnscripted(game: GameContext, prev: InstId, kind: "act" | "agenda") {
  if (backSide(game, prev).length) return;
  push(game, {
    t: STEP.Resolution,
    id: finalResolution(
      def(game, prev).backText,
      Object.keys(game.db.scenarios[scenarioIdOf(game)].resolutions),
      kind,
    ),
  });
}

export { actClueCost };

export const advanceActHandler: Handler<"AdvanceAct"> = (game, step) => {
  const id = currentAct(game);
  if (!id) return;
  if (step.spend) {
    let n = actClueCost(game);
    const order = [
      leadInvestigator(game),
      ...activeInvs(game).filter((x) => x !== leadInvestigator(game)),
    ].filter((x) => !hasFlag(game, x, "cannotSpendClues"));
    for (const i of order) {
      const take = Math.min(n, inv(game, i).clues);
      addCounter(game, i, "clues", -take);
      n -= take;
    }
  }
  emit(game, EVENT.ActAdvance, `Act advances: ${def(game, id).backName ?? def(game, id).name}`, {
    card: id,
  });
  moveCard(game, id, ZONE.Limbo);
  push(game, ...backSide(game, id), {
    t: STEP.Script,
    code: "__engine",
    fn: "nextAct",
    ctx: { source: id },
  });
};

export function nextAct(game: GameContext, prev: InstId) {
  if (currentPhase(game) === "ended") return;
  moveCard(game, prev, ZONE.Removed);
  const next = pile(game, ZONE.ActDeck)[0];
  if (next) {
    moveCard(game, next, ZONE.Act);
    emit(game, EVENT.Act, `New act: ${def(game, next).name}`, { card: next });
  } else endUnscripted(game, prev, EVENT.Act);
}

export const checkObjectivesHandler: Handler<"CheckObjectives"> = (game) => {
  if (currentPhase(game) === "ended") return;
  const hook = game.db.scripts[scenarioIdOf(game)]?.hooks?.checkObjectives;
  if (hook) hook(game, {});
};

export const resolutionHandler: Handler<"Resolution"> = (game, step) => {
  if (currentPhase(game) === "ended") return;
  endScenario(game, step.id);
  // what the scenario's script records about the game, before its cards are gone (Smoke and Mirrors)
  game.db.scripts[scenarioIdOf(game)]?.hooks?.ended?.(game, { x: step.id === "none" ? 0 : 1 });
  // "when the game ends" effects (Cover Up, Hospital Debts; Dead Ends in the hand)
  for (const c of allCards(game)) {
    if (c.zone !== "threat" && c.zone !== "play" && c.zone !== "hand") continue;
    game.db.scripts[c.code]?.hooks?.gameEnd?.(game, { source: c.id, you: c.controller });
  }
  const r = game.db.scenarios[scenarioIdOf(game)].resolutions[step.id];
  emit(game, EVENT.Resolution, `Scenario ends: ${r?.title ?? step.id}`, { data: { id: step.id } });
};

export function allEliminated(game: GameContext) {
  const hook = game.db.scripts[scenarioIdOf(game)]?.hooks?.allEliminated;
  if (hook) hook(game, {});
  else push(game, { t: STEP.Resolution, id: "none" });
}

export const handlers = {
  DrawEncounter: drawEncounterHandler,
  Revelation: revelationHandler,
  PlaceDoom: placeDoomHandler,
  CheckDoom: checkDoomHandler,
  AdvanceAgenda: advanceAgendaHandler,
  AdvanceAct: advanceActHandler,
  CheckObjectives: checkObjectivesHandler,
  Resolution: resolutionHandler,
};
