/**
 * A simple scripted player used by playthrough tests, the replay corpus and the debug "auto-play" button. On its turn it
 * plays toward the current act's objective as the cards print it: the locations and enemies the act (or an encounter
 * card's own Objective) names, the clues the act asks for and where they are spent, resigning when the act's objective
 * is to resign. It fights or evades what engages it, investigates, and explores. Deterministic: no randomness.
 */
import { dispatch, type Result } from "./index";
import {
  allCards,
  card,
  cardOfIf,
  currentAct,
  currentAgenda,
  def,
  inv,
  playerCount,
  type GameContext,
} from "./context";
import {
  abilitiesOf,
  actClueCost,
  enemies,
  enemyStat,
  engagedWith,
  hasFlag,
  locations,
  remainingHealth,
  remainingSanity,
  skillValue,
  spendableGroupClues,
  stepsToward,
} from "./queries";
import { withinLimit } from "./rules/cards";
import { ZONE } from "./world/constants";
import type { ChoiceOption, ContentDb, InstId, InvId, TurnAction } from "./world/types";

const plain = (text: string) => text.replace(/<[^>]+>/g, "");
/** an action's label that gives the group clues, or may put places into play (a location drawn from beneath one) */
const GIVES_CLUES = /(gain|discover) \d+ clues?/i;
const GIVES_PLACES = /into play|underneath/i;

/** the clues an Objective's "spend N [per_investigator] clues" asks of the group (0 when it names none) */
function cluesAsked(game: GameContext, text: string): number {
  const m = /spend (\d+) (\[per_investigator\] )?clues/i.exec(text);
  return m ? Number(m[1]) * (m[2] ? playerCount(game) : 1) : 0;
}

/**
 * What the current act asks for, read from its text and the Objectives printed on the encounter cards in play: the
 * places to reach (once the group holds the clues spent there), the enemies to defeat, the story cards to win over
 * (parley), whether to resign, and whether the group still needs clues.
 */
function objective(game: GameContext) {
  const a = currentAct(game);
  const text = a ? plain(def(game, a).text) : "";
  // names are matched without case: "no clues in the Hidden Chamber"
  const lower = text.toLowerCase();
  const says = (name: string) => lower.includes(name.toLowerCase());
  const held = spendableGroupClues(game);
  const cost = actClueCost(game);
  const spendAt = a ? def(game, a).actSpendAt : undefined;
  const all = locations(game);
  // a name the act prints; with a subtitle when the act gives one ("the Exhibit Hall (Restricted Hall)"), or several
  // locations in play share the name
  const named = (id: InstId) => {
    const d = def(game, id);
    if (
      d.subname &&
      (says(`${d.name} (`) || all.filter((l) => def(game, l.id).name === d.name).length > 1)
    )
      return says(d.subname);
    return says(d.name);
  };
  // "find and complete an objective on another encounter card"
  const elsewhere = /another encounter card/.test(text);
  const ownObjective = (id: InstId) => /Objective/.test(def(game, id).text);
  let need = cost < Infinity ? cost : 0;
  const locs: InstId[] = [];
  for (const l of all) {
    const own = elsewhere && ownObjective(l.id);
    if (!own && !named(l.id) && def(game, l.id).name !== spendAt) continue;
    // a goal once the group holds the clues spent there, and those it takes to move in (Sentinel Peak, The Edge of
    // the Universe)
    const asks =
      (own
        ? cluesAsked(game, plain(def(game, l.id).text))
        : /may spend/.test(text) || spendAt
          ? cost
          : 0) +
      (def(game, l.id).enterCluesPerInvestigator ?? 0) * playerCount(game) +
      (def(game, l.id).moveInClues ?? 0);
    if (held >= asks) locs.push(l.id);
    else need = Math.max(need, asks);
  }
  // the goals that can be entered now (The Hidden Chamber is locked until its Key is attached)
  const open = locs.filter((l) => !hasFlag(game, l, "cannotMoveInto"));
  const foes = new Set(
    enemies(game)
      .filter((e) => named(e.id))
      .map((e) => e.id),
  );
  // story cards in play that nobody controls: an ally to parley with (Jazz Mulligan, Dr. Morgan)
  const story = allCards(game)
    .filter(
      (c) =>
        (c.zone === ZONE.Attached || c.zone === ZONE.Play) &&
        !c.controller &&
        !c.attachedTo &&
        named(c.id),
    )
    .map((c) => c.id);
  // an agenda that advances when a kind of enemy is dealt damage (the Clover Club's Criminals): leave them be
  const ag = currentAgenda(game);
  const spare = ag
    ? /deals damage to an? \[\[(\w+)\]\] enemy/.exec(plain(def(game, ag).text))?.[1]
    : undefined;
  return {
    text,
    locs,
    open,
    foes,
    story,
    spare,
    short: held < need,
    resign: /has resigned/.test(text),
  };
}

const actionOf = (o: ChoiceOption) => o.value as TurnAction | undefined;
const kindOf = (o: ChoiceOption) => actionOf(o)?.kind;

/**
 * the option that attacks `enemy`: a weapon's fight ability that names the enemy's kind first (Esoteric Formula, "only
 * on an Abomination"), else any weapon's (it picks its target next), else a basic fight
 */
function fightOption(game: GameContext, opts: ChoiceOption[], enemy: InstId) {
  const weapons = opts.filter((o) => kindOf(o) === "ability" && /: fight/i.test(o.label));
  return (
    weapons.find((o) => def(game, enemy).traits.some((t) => o.label.includes(t))) ??
    weapons[0] ??
    opts.find((o) => {
      const a = actionOf(o);
      return a?.kind === "fight" && a.enemy === enemy;
    })
  );
}

/** the skill a fight option tests and the bonus its label prints (".45 Automatic: fight (+1 combat, +1 damage)") */
function fightSkill(game: GameContext, i: InvId, o: ChoiceOption): number {
  const skill = (["willpower", "intellect", "agility"] as const).find((x) => o.label.includes(x));
  const bonus = /\+(\d+) (combat|willpower|intellect|agility)/.exec(o.label);
  return skillValue(game, i, skill ?? "combat") + (bonus ? Number(bonus[1]) : 0);
}

/** fight an enemy the investigator clearly beats (or must defeat), else evade it when that is likelier */
function fightOrEvade(
  game: GameContext,
  i: InvId,
  opts: ChoiceOption[],
  enemy: InstId,
  must: boolean,
) {
  const fight = fightOption(game, opts, enemy);
  const evade = opts.find((o) => {
    const a = actionOf(o);
    return a?.kind === "evade" && a.enemy === enemy;
  });
  if (!fight || !evade) return fight ?? evade;
  if (must) return fight;
  const fightGap = fightSkill(game, i, fight) - enemyStat(game, enemy, "fight");
  const evadeGap = skillValue(game, i, "agility") - enemyStat(game, enemy, "evade");
  const sturdy = enemyStat(game, enemy, "health") > 2;
  if (fightGap >= 2 || (fightGap >= 1 && !sturdy)) return fight;
  return evadeGap >= fightGap ? evade : fight;
}

function turnChoice(db: ContentDb, r: Result): string | undefined {
  const game: GameContext = { s: r.state, db, events: [] };
  const p = r.state.pending!;
  const i = p.inv;
  const opts = p.options;
  const here = inv(game, i).location;
  const goal = objective(game);
  const pick = (pred: (o: ChoiceOption) => boolean) => opts.find(pred)?.id;
  const ability = (o: ChoiceOption) => {
    const a = actionOf(o);
    return a?.kind === "ability" ? abilitiesOf(game, a.card)[a.index] : undefined;
  };
  const sourceOf = (o: ChoiceOption) => {
    const a = actionOf(o);
    return a?.kind === "ability" ? card(game, a.card) : undefined;
  };
  const isResign = (o: ChoiceOption) => ability(o)?.designator === "resign";
  /** where a card stands: a location is its own place, an enemy or a story card is at one */
  const placeOf = (id: InstId) => {
    const c = card(game, id);
    return c.zone === ZONE.Location ? c.id : c.location;
  };

  /** a label that names the place: by its subtitle, or by its name when no other place in play shares it */
  const named = (l: InstId, label = "") => {
    const d = def(game, l);
    if (d.subname && label.includes(d.subname)) return true;
    const twins = locations(game).filter((x) => def(game, x.id).name === d.name).length;
    return twins === 1 && label.includes(d.name);
  };

  const advance = pick((o) => kindOf(o) === "advanceAct");
  if (advance) return advance;
  if (goal.resign) {
    const resign = pick(isResign);
    if (resign) return resign;
  }
  // an objective's own ability (a location's clue spend, a story ally's parley), one that names a place the act names
  // (Key to the Chamber: attach it to The Hidden Chamber), or one that names the kind of an enemy the act names, here
  // ("place 1 clue on an Abomination here")
  const foeKinds = enemies(game)
    .filter((e) => goal.foes.has(e.id) && e.location === here)
    .flatMap((e) => def(game, e.id).traits);
  const own = pick((o) => {
    const c = sourceOf(o);
    return (
      !!c &&
      !isResign(o) &&
      !/: fight/i.test(o.label) &&
      (goal.locs.includes(c.id) ||
        goal.story.includes(c.id) ||
        goal.locs.some((l) => l !== c.id && named(l, o.label)) ||
        foeKinds.some((t) => o.label.includes(t)))
    );
  });
  if (own) return own;

  const engaged = engagedWith(game, i);
  if (engaged.length) {
    const e = engaged.find((x) => goal.foes.has(x.id)) ?? engaged[0];
    const spared = !!goal.spare && def(game, e.id).traits.includes(goal.spare);
    const o = spared
      ? opts.find((x) => {
          const a = actionOf(x);
          return a?.kind === "evade" && a.enemy === e.id;
        })
      : fightOrEvade(game, i, opts, e.id, goal.foes.has(e.id) && !goal.locs.length);
    if (o) return o.id;
  }
  // an enemy the act names, when it names no place to go instead (Silas Bishop, beside The Hidden Chamber's clues)
  const foeHere = enemies(game).find(
    (e) => goal.foes.has(e.id) && e.location === here && !goal.locs.length,
  );
  if (foeHere) {
    const o = fightOption(game, opts, foeHere.id);
    if (o) return o.id;
  }

  // close to defeat: heal (Medical Texts, the Student Union)
  const hurt = remainingHealth(game, i) <= 2;
  const shaken = remainingSanity(game, i) <= 2;
  if (hurt || shaken) {
    const heal = pick(
      (o) =>
        !!sourceOf(o) &&
        /heal|treat/i.test(o.label) &&
        ((hurt && /damage|treat/i.test(o.label)) || (shaken && /horror/i.test(o.label))),
    );
    if (heal) return heal;
  }

  const clues = here ? card(game, here).clues : 0;
  const investigate = () =>
    clues > 0
      ? (pick((o) => kindOf(o) === "ability" && /: investigate/i.test(o.label)) ??
        pick((o) => kindOf(o) === "investigate"))
      : undefined;
  const moveToward = (targets: (InstId | null)[]) => {
    const to = targets.filter((t): t is InstId => !!t);
    if (!here || !to.length) return undefined;
    const steps = stepsToward(game, here, to);
    return pick((o) => {
      const a = actionOf(o);
      return a?.kind === "move" && steps.includes(a.to);
    });
  };
  // the act's own action (searching the encounter deck, exploring), when its objective is not a clue spend
  const actAbility = () => pick((o) => sourceOf(o)?.zone === ZONE.Act);
  // a locked goal is a goal for whoever holds a card whose ability names it (Key to the Chamber)
  const keys = goal.locs.filter(
    (l) =>
      !goal.open.includes(l) &&
      allCards(game).some(
        (c) => c.controller === i && abilitiesOf(game, c.id).some((a) => named(l, a.label)),
      ),
  );
  const toGoal = () =>
    moveToward([
      ...(goal.short ? [] : [...goal.open, ...keys]),
      ...[...goal.foes].map(placeOf),
      ...goal.story.map(placeOf),
    ]);

  // clues here, and the group needs them, or this place is the goal, or there is no way on yet (a locked train car):
  // investigate here, or use the place's action that gives clues (the Parlor Car, the Clover Club's Bar)
  if (clues > 0 && (goal.short || (here && goal.locs.includes(here)) || !toGoal())) {
    const o = investigate() ?? pick((x) => !!sourceOf(x) && GIVES_CLUES.test(x.label));
    if (o) return o;
  }
  if (goal.short) {
    const o = pick((x) => !!sourceOf(x) && GIVES_CLUES.test(x.label));
    if (o) return o;
  }

  const play = pick((o) => {
    const a = actionOf(o);
    return a?.kind === "play" && def(game, a.card).type === "asset";
  });
  if (play) return play;

  if (goal.resign) {
    const o = moveToward(
      locations(game)
        .filter((l) => abilitiesOf(game, l.id).some((a) => a.designator === "resign"))
        .map((l) => l.id),
    );
    if (o) return o;
  }
  const there = toGoal();
  if (there) return there;
  if (actClueCost(game) === Infinity) {
    const o = actAbility();
    if (o) return o;
  }
  // the place the act names is not in play yet: the action that puts locations into play (the Museum Halls)
  if (!goal.open.length && /enters/.test(goal.text)) {
    const o = pick((x) => !!sourceOf(x) && GIVES_PLACES.test(x.label));
    if (o) return o;
    const to = moveToward(
      locations(game)
        .filter((l) =>
          abilitiesOf(game, l.id).some(
            (a, k) =>
              a.kind !== "forced" &&
              GIVES_PLACES.test(a.label ?? "") &&
              withinLimit(game, l.id, k, a),
          ),
        )
        .map((l) => l.id),
    );
    if (to) return to;
  }
  const o = investigate();
  if (o) return o;
  const toClues = moveToward(
    locations(game)
      .filter((l) => l.id !== here && (!l.revealed || l.clues > 0))
      .map((l) => l.id),
  );
  if (toClues) return toClues;
  // no clues left to investigate: go to a place whose action gives clues (the Clover Club's Bar), staying at one whose
  // action can't be paid yet: the resources come next
  const givesClues = (l: InstId) =>
    abilitiesOf(game, l).some(
      (a, k) =>
        a.kind === "action" && GIVES_CLUES.test(a.label ?? "") && withinLimit(game, l, k, a),
    );
  if (goal.short && !(here && givesClues(here))) {
    const o = moveToward(
      locations(game)
        .filter((l) => givesClues(l.id))
        .map((l) => l.id),
    );
    if (o) return o;
  }
  // the scenario's own actions (an act's exploration, a location's ability), never resigning early, nor giving away
  // clues the group still needs
  const scenario = pick((o) => {
    const c = sourceOf(o);
    if (!c || isResign(o) || c.controller) return false;
    return !(goal.short && /(place|spend) .*clue/i.test(o.label));
  });
  if (scenario) return scenario;
  return (
    pick((o) => kindOf(o) === "draw" && inv(game, i).hand.length < 5) ??
    pick((o) => kindOf(o) === "resource") ??
    pick((o) => kindOf(o) === "endTurn")
  );
}

export function botChoice(db: ContentDb, r: Result): string {
  const p = r.state.pending!;
  // the bot plays no cards out of turn, but advances the act
  if (p.promptKey === "playerWindow") return p.options.find((o) => o.id === "act")?.id ?? "pass";
  // any reaction but a weakness's own (Cover Up's would take the clues just found)
  if (p.kind === "reaction")
    return (
      p.options.find(
        (o) =>
          o.id !== "pass" && !(o.card && db.cards[cardOfIf(r.state, o.card)?.code ?? ""]?.subtype),
      )?.id ?? "pass"
    );
  if (p.kind === "turn") {
    const o = turnChoice(db, r);
    if (o) return o;
  }
  // a fight's or an evasion's target: an enemy engaged with you first, never one the agenda spares (an aloof Criminal)
  if (
    p.kind === "target" &&
    p.options.some((o) => cardOfIf(r.state, o.card)?.zone === ZONE.Enemy)
  ) {
    const game: GameContext = { s: r.state, db, events: [] };
    const { spare } = objective(game);
    const ok = p.options.filter((o) => {
      const c = cardOfIf(r.state, o.card);
      return !c || c.zone !== ZONE.Enemy || !spare || !db.cards[c.code]?.traits.includes(spare);
    });
    const mine = ok.find((o) => cardOfIf(r.state, o.card)?.engagedWith === p.inv);
    return (mine ?? ok[0] ?? p.options[0]).id;
  }
  // commit skill cards (the assets and events are kept to play) until the test is 2 over its difficulty
  if (p.kind === "commit") {
    const done = /value (\d+) vs (\d+)/.exec(p.options.find((o) => o.id === "done")?.label ?? "");
    const safe = done && Number(done[1]) >= Number(done[2]) + 2;
    const skill = p.options.find(
      (o) =>
        o.label.startsWith("Commit") &&
        !!o.card &&
        db.cards[cardOfIf(r.state, o.card)?.code ?? ""]?.type === "skill",
    );
    return (!safe && skill?.id) || "done";
  }
  if (p.kind === "assign") return p.options.at(-1)!.id; // soak with assets first
  return p.options[0].id;
}

export function autoPlay(db: ContentDb, r: Result, maxSteps = 4000): Result {
  for (let k = 0; k < maxSteps && r.state.pending; k++) {
    const p = r.state.pending;
    const next = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
    if (next.error) throw new Error(next.error);
    r = next;
  }
  return r;
}
