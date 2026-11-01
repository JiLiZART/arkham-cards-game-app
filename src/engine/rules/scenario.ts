import { peril, surge as surgeFlag } from "../flags";
import {
  abilitiesOf,
  actClueCost,
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
  type G,
  hasFlag,
  inv,
  invName,
  isCancelled,
  leadInvestigator,
  moveCard,
  pile,
  push,
  reshuffleDiscard,
  scenarioIdOf,
  setCounter,
  tapToDraw,
} from "../core";
import type { InstId, Step } from "../types";
import { win } from "./cards";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

// ---------- encounter deck ----------
export const drawEncounterHandler: Handler<"DrawEncounter"> = (g, step) => {
  if (inv(g, step.inv).status !== "playing") return;
  if (!tapToDraw(g, step, step.inv, "encounter", 1)) return;
  if (pile(g, "encounterDeck").length === 0) {
    reshuffleDiscard(g, "encounter");
    emit(g, "reshuffle", "The encounter discard pile is shuffled into a new encounter deck");
  }
  const id = pile(g, "encounterDeck")[0];
  if (!id) return;
  const d = def(g, id);
  moveCard(g, id, "resolving");
  emit(g, "encounter", `${invName(g, step.inv)} draws ${d.name}`, { inv: step.inv, card: id });
  if (d.type === "enemy") {
    push(
      g,
      { t: "Spawn", enemy: id, inv: step.inv },
      ...(d.keywords.includes("surge") ? [{ t: "DrawEncounter", inv: step.inv } as Step] : []),
    );
    return;
  }
  push(g, win("treacheryDrawn", { inv: step.inv, card: id, key: `rev:${id}` }), {
    t: "Revelation",
    inv: step.inv,
    card: id,
  });
};

export const revelationHandler: Handler<"Revelation"> = (g, step) => {
  const c = cardIf(g, step.card);
  if (!c) return;
  if (isCancelled(g, `rev:${step.card}`)) {
    emit(g, "cancelled", `${def(g, step.card).name}'s revelation is cancelled`, {
      card: step.card,
    });
    moveCard(g, step.card, c.owner ? "discard" : "encounterDiscard");
    return;
  }
  const d = def(g, step.card);
  moveCard(g, step.card, "resolving");
  if (d.keywords.includes("peril")) peril.set(g, true);
  const ctx = { source: step.card, you: step.inv, inv: step.inv };
  const steps: Step[] = [];
  for (const a of abilitiesOf(g, step.card)) {
    if (a.kind !== "revelation") continue;
    if (a.run) steps.push({ t: "Script", code: c.code, fn: a.run, ctx });
    else if (a.effects) steps.push({ t: "Effects", effects: a.effects, ctx });
  }
  steps.push({ t: "Script", code: "__engine", fn: "finishRevelation", ctx });
  push(g, ...steps);
};

export function finishRevelation(g: G, cardId: InstId, invId: string) {
  const c = cardIf(g, cardId);
  peril.clear(g);
  const surges = surgeFlag.take(g, cardId) || def(g, cardId).keywords.includes("surge");
  // a treachery with Victory X is added to the victory display instead (Grimoire, Victory X)
  const d = def(g, cardId);
  const playerType = d.type === "asset" || d.type === "event" || d.type === "skill";
  if (c?.zone === "resolving")
    moveCard(
      g,
      cardId,
      !c.owner && d.victory !== undefined
        ? "victory"
        : c.owner
          ? playerType
            ? "hand"
            : "discard"
          : "encounterDiscard",
    );
  if (surges) push(g, { t: "DrawEncounter", inv: invId });
}

// ---------- doom, agenda, act ----------
const DOOM_ZONES = ["agenda", "act", "enemy", "play", "location", "attached", "threat"];
export const doomInPlay = (g: G) =>
  allCards(g)
    .filter((c) => DOOM_ZONES.includes(c.zone))
    .reduce((n, c) => n + c.doom, 0);

export const placeDoomHandler: Handler<"PlaceDoom"> = (g, step) => {
  const c = cardIf(g, step.card);
  if (!c) return;
  // the agenda may replace placing doom (Brethren of Ash)
  const agenda = currentAgenda(g) ? cardIf(g, currentAgenda(g)) : undefined;
  if (agenda && g.db.scripts[agenda.code]?.wouldPlaceDoom?.(g, agenda.id, step.n)) return;
  addCounter(g, c.id, "doom", step.n);
  emit(g, "doom", `${step.n} doom placed on ${def(g, step.card).name}`, {
    card: step.card,
    data: { n: step.n },
  });
  push(g, win("doomPlaced", { card: step.card, amount: step.n }));
};

export const checkDoomHandler: Handler<"CheckDoom"> = (g) => {
  const agenda = currentAgenda(g);
  if (!agenda || currentPhase(g) === "ended") return;
  const threshold = def(g, agenda).doom ?? Infinity;
  if (doomInPlay(g) >= threshold) push(g, { t: "AdvanceAgenda" });
};

function backSide(g: G, id: InstId): Step[] {
  const c = card(g, id);
  return abilitiesOf(g, id)
    .filter((a) => a.kind === "revelation")
    .map((a): Step =>
      a.run
        ? { t: "Script", code: c.code, fn: a.run, ctx: { source: id, you: leadInvestigator(g) } }
        : { t: "Effects", effects: a.effects ?? [], ctx: { source: id, you: leadInvestigator(g) } },
    );
}

export const advanceAgendaHandler: Handler<"AdvanceAgenda"> = (g, step) => {
  const id = currentAgenda(g);
  if (!id) return;
  if (!step.fired) {
    push(g, win("agendaAdvances", { card: id }), { ...step, fired: true });
    return;
  }
  for (const c of allCards(g)) if (DOOM_ZONES.includes(c.zone)) setCounter(g, c.id, "doom", 0);
  emit(g, "agendaAdvance", `Agenda advances: ${def(g, id).backName ?? def(g, id).name}`, {
    card: id,
  });
  moveCard(g, id, "limbo");
  push(g, ...backSide(g, id), {
    t: "Script",
    code: "__engine",
    fn: "nextAgenda",
    ctx: { source: id },
  });
};

export function nextAgenda(g: G, prev: InstId) {
  if (currentPhase(g) === "ended") return;
  moveCard(g, prev, "removed");
  const next = pile(g, "agendaDeck")[0];
  if (next) {
    moveCard(g, next, "agenda");
    emit(g, "agenda", `New agenda: ${def(g, next).name}`, { card: next });
  } else endUnscripted(g, prev, "agenda");
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
function endUnscripted(g: G, prev: InstId, kind: "act" | "agenda") {
  if (backSide(g, prev).length) return;
  push(g, {
    t: "Resolution",
    id: finalResolution(
      def(g, prev).backText,
      Object.keys(g.db.scenarios[scenarioIdOf(g)].resolutions),
      kind,
    ),
  });
}

export { actClueCost };

export const advanceActHandler: Handler<"AdvanceAct"> = (g, step) => {
  const id = currentAct(g);
  if (!id) return;
  if (step.spend) {
    let n = actClueCost(g);
    const order = [
      leadInvestigator(g),
      ...activeInvs(g).filter((x) => x !== leadInvestigator(g)),
    ].filter((x) => !hasFlag(g, x, "cannotSpendClues"));
    for (const i of order) {
      const take = Math.min(n, inv(g, i).clues);
      addCounter(g, i, "clues", -take);
      n -= take;
    }
  }
  emit(g, "actAdvance", `Act advances: ${def(g, id).backName ?? def(g, id).name}`, { card: id });
  moveCard(g, id, "limbo");
  push(g, ...backSide(g, id), {
    t: "Script",
    code: "__engine",
    fn: "nextAct",
    ctx: { source: id },
  });
};

export function nextAct(g: G, prev: InstId) {
  if (currentPhase(g) === "ended") return;
  moveCard(g, prev, "removed");
  const next = pile(g, "actDeck")[0];
  if (next) {
    moveCard(g, next, "act");
    emit(g, "act", `New act: ${def(g, next).name}`, { card: next });
  } else endUnscripted(g, prev, "act");
}

export const checkObjectivesHandler: Handler<"CheckObjectives"> = (g) => {
  if (currentPhase(g) === "ended") return;
  const hook = g.db.scripts[scenarioIdOf(g)]?.hooks?.checkObjectives;
  if (hook) hook(g, {});
};

export const resolutionHandler: Handler<"Resolution"> = (g, step) => {
  if (currentPhase(g) === "ended") return;
  endScenario(g, step.id);
  // what the scenario's script records about the game, before its cards are gone (Smoke and Mirrors)
  g.db.scripts[scenarioIdOf(g)]?.hooks?.ended?.(g, { x: step.id === "none" ? 0 : 1 });
  // "when the game ends" effects (Cover Up, Hospital Debts; Dead Ends in the hand)
  for (const c of allCards(g)) {
    if (c.zone !== "threat" && c.zone !== "play" && c.zone !== "hand") continue;
    g.db.scripts[c.code]?.hooks?.gameEnd?.(g, { source: c.id, you: c.controller });
  }
  const r = g.db.scenarios[scenarioIdOf(g)].resolutions[step.id];
  emit(g, "resolution", `Scenario ends: ${r?.title ?? step.id}`, { data: { id: step.id } });
};

export function allEliminated(g: G) {
  const hook = g.db.scripts[scenarioIdOf(g)]?.hooks?.allEliminated;
  if (hook) hook(g, {});
  else push(g, { t: "Resolution", id: "none" });
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
