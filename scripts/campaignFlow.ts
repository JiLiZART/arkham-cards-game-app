/**
 * Compile a campaign guide's flow (ArkhamCards' step graph) into the game's step language (ADR-0011): the campaign's
 * setup, its interludes and epilogues, and every resolution's steps. A construct the game can't offer is compiled as the
 * guide's text with no outcome (a prompt), the answer the guide defaults to (a test) or left out (an effect), and counted
 * by kind in `unsupported`, so the import can list them.
 */
import type {
  CampaignEffect,
  CampaignFlow,
  CampaignStep,
  FlowCondition,
  FlowEffect,
} from "../src/content/schema";
import { stepRefs } from "../src/content/schema";
import { namedScenarios } from "../src/content/flow";
import { kebab, tokenName, type Raw } from "./campaignGuide";
import { TEST_STAGE } from "../src/engine/world/constants";

export interface FlowSource {
  /** the guide's campaign record */
  campaign: Raw;
  /** the guide's scenarios of this campaign: the playable ones (named in `ids`) and the interludes and epilogues */
  scenarios: Raw[];
  /** guide scenario id → the id of the scenario file written for it (the playable ones) */
  ids: Map<string, string>;
  /** the guide's shared steps (its `core` scenario: `$advance_time`, `$update_day`...), by id */
  shared?: Map<string, Raw>;
  /** the codes of the real cards: a guide's own made-up cards (The Scarlet Keys' "ztsk_" thieves) are not among them */
  cards?: Set<string>;
}

const isSetScenarios = (e: Raw) => e?.type === "campaign_data" && e.setting === "set_scenarios";
/** a choice that sets the order of play (Carcosa's original or reprint printing) */
const setsOrder = (c: Raw) => (c.effects ?? []).some(isSetScenarios);

export interface FlowResult {
  flow: CampaignFlow;
  /** constructs left out or defaulted, by "input:kind", "condition:kind" or "effect:kind" */
  unsupported: Record<string, number>;
  /** the guide's text for each log entry it records */
  logLabels: Record<string, string>;
}

type Who = "each" | "lead" | "choice" | "input";
const NOTES = "campaign_notes";
/** a limit the guide gives as a number (it may also be a count read from the log, which the game doesn't offer) */
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
/** inputs the new-game screen and the engine already answer, and the placeholder random weakness the campaign start draws */
const HANDLED_INPUTS = new Set([
  "scenario_investigators",
  "save_decks",
  "play_scenario",
  "random_location",
]);
const RESULTS: Record<string, "win" | "lose" | "survived"> = {
  win: "win",
  lose: "lose",
  survived: "survived",
  won: "win",
  lost: "lose",
};

class Compiler {
  steps: Record<string, CampaignStep> = {};
  unsupported: Record<string, number> = {};
  logLabels: Record<string, string> = {};
  private done = new Map<string, string[]>();
  private serial = 0;

  constructor(private src: FlowSource) {}

  private skip(kind: string) {
    this.unsupported[kind] = (this.unsupported[kind] ?? 0) + 1;
  }

  /** whether the game has a scenario or an interlude for a guide id (one the import skipped has neither) */
  private known(guide: string): boolean {
    return (
      this.src.ids.has(guide) ||
      this.src.scenarios.some(
        (s) => s.id === guide && (s.type === "interlude" || s.type === "epilogue"),
      )
    );
  }

  /** the id a guide scenario has in the game (a playable one) or as an interlude */
  private scenarioId(guide: string): string {
    return this.src.ids.get(guide) ?? kebab(guide);
  }

  /** each scenario's guide resolutions by owner id, for a step that sends play to another resolution */
  private resolutionsOf = new Map<string, Raw[]>();

  private add(owner: string, base: string, step: CampaignStep): string {
    let id = `${owner}:${base}`;
    if (this.steps[id]) id = `${id}#${++this.serial}`;
    this.steps[id] = step;
    return id;
  }

  // ---------- effects ----------

  private who(inv: unknown): Who | null {
    switch (inv) {
      case undefined:
      case "all":
        return "each";
      case "lead_investigator":
        return "lead";
      case "choice":
      case "any":
        return "choice";
      case "$input_value":
        return "input";
      case "defeated":
      case "not_resigned":
      case "$fixed_investigator":
        this.skip(`effect-target:${String(inv)}`);
        return "each";
      default:
        return "each";
    }
  }

  /** one guide effect as game effects, or the step ids it expands to (story_step) */
  private effect(e: Raw, victory: boolean): (FlowEffect | { steps: string[] })[] {
    const who = (allow: Who[] = ["each", "lead", "choice", "input"]): Who => {
      const w = this.who(e.investigator) ?? "each";
      return allow.includes(w) ? w : "each";
    };
    switch (e.type) {
      case "campaign_log": {
        if (!e.id) return [];
        const section = e.hidden ? "hidden" : (e.section ?? NOTES);
        if (e.text && e.text !== "dummy") this.logLabels[e.id] ??= e.text;
        if (e.cross_out) return [{ do: "crossOut", key: e.id, section } as CampaignEffect];
        if (e.remove)
          return [{ do: "crossOut", key: e.id, section, erase: true } as CampaignEffect];
        return [{ do: "record", key: e.id, section, value: true } as CampaignEffect];
      }
      case "campaign_log_count": {
        const section = e.section ?? NOTES;
        const value = e.operation?.endsWith("_input") ? "input" : (e.value ?? 0);
        if (e.operation === "subtract_input") return this.skipEffect(e);
        return [
          {
            do: "count",
            id: e.id ?? section,
            section,
            op: String(e.operation).startsWith("set") ? "set" : "add",
            value,
          },
        ];
      }
      case "campaign_log_investigator_count": {
        const section = e.section ?? NOTES;
        const value = e.operation?.endsWith("_input") ? "input" : (e.value ?? 0);
        return [
          {
            do: "investigatorCount",
            id: e.id ?? section,
            section,
            who: who(["each", "lead", "input"]) as "each",
            op: String(e.operation).startsWith("set") ? "set" : "add",
            value,
          },
        ];
      }
      case "campaign_log_cards": {
        const section = e.section ?? NOTES;
        // a list of the guide's own made-up cards, which no card data has, is left to the campaign's change
        if (
          this.src.cards &&
          (e.codes ?? []).some((c: string) => !c.startsWith("$") && !this.src.cards!.has(c))
        )
          return this.skipEffect({ type: "campaign_log_cards:custom-card" });
        // a card the players picked is listed under the section's own name
        if (e.id === "$input_value")
          return [{ do: "listCards", id: section, section, codes: ["$input"], remove: false }];
        if (e.codes?.length)
          return [
            { do: "listCards", id: e.id ?? section, section, codes: e.codes, remove: !!e.remove },
          ];
        if (e.id && e.remove)
          return [{ do: "crossOut", key: e.id, section, erase: true } as CampaignEffect];
        return e.id ? [{ do: "record", key: e.id, section, value: true } as CampaignEffect] : [];
      }
      case "add_card":
        return e.card ? [{ do: "earnCard", code: e.card, who: who() }] : [];
      case "remove_card":
        return e.card
          ? [
              {
                do: "removeCard",
                code: e.card === "$input_value" ? "$input" : e.card,
                ...(e.investigator ? { who: who(["each", "lead", "input"]) as "each" } : {}),
              },
            ]
          : [];
      case "replace_card":
        return e.old_card && e.new_card
          ? [
              {
                do: "replaceCard",
                old: e.old_card,
                new: e.new_card,
                who: who(["each", "lead", "input"]) as "each",
              },
            ]
          : [];
      case "add_chaos_token":
      case "remove_chaos_token":
        return (e.tokens ?? []).flatMap((t: string) => {
          const token = tokenName(t);
          if (!token) {
            this.skip(`effect-token:${t}`);
            return [];
          }
          return [
            {
              do: e.type === "add_chaos_token" ? "addChaosToken" : "removeChaosToken",
              token,
            } as FlowEffect,
          ];
        });
      case "add_weakness": {
        const w = who(["each", "lead", "input"]);
        return [
          {
            do: "addWeakness",
            trait: e.weakness_traits?.[0] ?? "",
            ...(w === "each" ? {} : { who: w as "lead" }),
          },
        ];
      }
      case "earn_xp": {
        if (e.special_xp || e.side_scenario_cost) return this.skipEffect(e);
        return [
          { do: "xp", bonus: e.bonus ?? 0, who: who(["each", "lead", "input"]) as "each", victory },
        ];
      }
      case "trauma": {
        if (e.mental_or_physical || e.heal_input || e.set_physical !== undefined || e.insane)
          return this.skipEffect(e);
        if (e.killed)
          return who(["each"]) === "each" &&
            (e.investigator === "all" || e.investigator === undefined)
            ? [{ do: "kill", who: "each" }]
            : this.skipEffect(e);
        return [
          {
            do: "trauma",
            who: who(["each", "lead", "input"]) as "each",
            physical: e.physical ?? 0,
            mental: e.mental ?? 0,
          },
        ];
      }
      case "campaign_data": {
        const scenario = e.scenario ? this.scenarioId(e.scenario) : "";
        if (
          ["next_scenario", "skip_scenario", "replay_scenario"].includes(e.setting) &&
          !this.known(e.scenario)
        )
          return this.skipEffect({ type: `${e.setting}:missing-scenario` });
        switch (e.setting) {
          case "next_scenario":
            return [{ do: "nextScenario", scenario }];
          case "skip_scenario":
            return [{ do: "skipScenario", scenario }];
          case "replay_scenario":
            return [{ do: "replayScenario", scenario }];
          case "result": {
            const r = RESULTS[String(e.value).toLowerCase()];
            return r ? [{ do: TEST_STAGE.End, result: r }] : this.skipEffect(e);
          }
          case "difficulty":
          // the order of play is the flow's own (compile() reads the first set_scenarios on the setup's default path)
          case "set_scenarios":
            return [];
          default:
            return this.skipEffect(e);
        }
      }
      case "story_step":
        return [{ steps: e.steps ?? [] }];
      default:
        return this.skipEffect(e);
    }
  }

  private skipEffect(e: Raw): [] {
    this.skip(`effect:${e.type}`);
    return [];
  }

  /** a list of guide effects as steps: runs of effects together, a story_step's steps between them */
  private effectSteps(
    owner: string,
    byId: Map<string, Raw>,
    base: string,
    effects: Raw[],
    victory = false,
  ): string[] {
    const out: string[] = [];
    let run: FlowEffect[] = [];
    const flush = () => {
      if (run.length) out.push(this.add(owner, base, { kind: "effects", effects: run }));
      run = [];
    };
    for (const e of effects) {
      for (const r of this.effect(e, victory)) {
        if ("steps" in r) {
          flush();
          out.push(...this.expand(owner, byId, r.steps));
        } else run.push(r);
      }
    }
    flush();
    return out;
  }

  // ---------- conditions ----------

  /** a boolean test as a game condition; null when the game can't make it */
  private test(c: Raw): FlowCondition | null {
    switch (c.type) {
      case "campaign_log":
        return { kind: "logHas", id: c.id, section: c.section ?? NOTES };
      case "campaign_log_cards":
        return { kind: "logCards", id: c.id, section: c.section ?? NOTES };
      case "has_card":
        return { kind: "hasCard", card: c.card, inv: "any" };
      case "campaign_data":
        if (c.campaign_data === "scenario_completed" && c.scenario)
          return { kind: "scenarioCompleted", scenario: this.scenarioId(c.scenario) };
        // the guide's app version: the game plays the current guide
        if (c.campaign_data === "version")
          return { kind: "unsupported", name: "version", take: true };
        return null;
      case "multi": {
        const parts = (c.conditions ?? []).map((x: Raw) => this.test(x));
        if (parts.some((p: FlowCondition | null) => p === null)) return null;
        return (c.count ?? 1) >= parts.length
          ? { kind: "all", conditions: parts }
          : { kind: "any", conditions: parts };
      }
      default:
        return null;
    }
  }

  /** an option's content: its own effects, then its steps */
  private optionSteps(owner: string, byId: Map<string, Raw>, base: string, o: Raw): string[] {
    return [
      ...this.effectSteps(owner, byId, `${base}:fx`, o.effects ?? []),
      ...this.expand(owner, byId, o.steps ?? []),
    ];
  }

  /** a chain of tests, each with what follows it, the last "else" being the default */
  private chain(
    owner: string,
    base: string,
    cases: { when: FlowCondition; then: string[] }[],
    otherwise: string[],
  ): string[] {
    // a test that leads nowhere (everything it would do is something the game doesn't offer) is not a step
    if (cases.every((c) => !c.then.length) && !otherwise.length) return [];
    const build = (i: number): string[] => {
      if (i === cases.length) return otherwise;
      const rest = build(i + 1);
      return [
        this.add(owner, i === 0 ? base : `${base}#${i}`, {
          kind: "branch",
          condition: cases[i].when,
          then: cases[i].then,
          else: rest,
        }),
      ];
    };
    return build(0);
  }

  private branch(owner: string, byId: Map<string, Raw>, id: string, c: Raw): string[] {
    const options: Raw[] = c.options ?? [];
    const fallback = c.default_option
      ? this.optionSteps(owner, byId, `${id}:default`, c.default_option)
      : [];
    const numeric = (when: (n: number) => FlowCondition) =>
      this.chain(
        owner,
        id,
        options
          .filter((o) => o.numCondition !== undefined)
          .map((o) => ({
            when: when(o.numCondition),
            then: this.optionSteps(owner, byId, `${id}:${o.numCondition}`, o),
          })),
        fallback,
      );
    switch (c.type) {
      case "campaign_log_count":
        return numeric((n) => ({
          kind: "logCount",
          id: c.id,
          section: c.section ?? NOTES,
          min: n,
          ...(c.max !== undefined && n >= c.max ? {} : { max: n }),
        }));
      case "campaign_log_investigator_count":
        return numeric((n) => ({
          kind: "investigatorCount",
          id: c.id,
          section: c.section ?? NOTES,
          inv: "any",
          min: n,
          max: n,
        }));
      case "scenario_data":
        if (c.scenario_data === "player_count")
          return numeric((n) => ({ kind: "playerCount", min: n, max: n }));
        break;
      case "campaign_data":
        if (c.campaign_data === "difficulty")
          return this.chain(
            owner,
            id,
            options
              .filter((o) => o.condition)
              .map((o) => ({
                when: { kind: "difficulty", is: [o.condition] } as FlowCondition,
                then: this.optionSteps(owner, byId, `${id}:${o.condition}`, o),
              })),
            fallback,
          );
        break;
    }
    // a yes/no test (or one the game can't make, which takes the guide's usual answer)
    let when = this.test(c);
    if (!when) {
      this.skip(`condition:${c.type}`);
      when = {
        kind: "unsupported",
        name: c.type,
        take: c.type === "campaign_data" && c.campaign_data === "version",
      };
    }
    const yes = options.find((o) => o.boolCondition === true);
    const no = options.find((o) => o.boolCondition === false);
    const then = yes ? this.optionSteps(owner, byId, `${id}:yes`, yes) : [];
    const otherwise = no ? this.optionSteps(owner, byId, `${id}:no`, no) : fallback;
    if (!then.length && !otherwise.length) return [];
    return [this.add(owner, id, { kind: "branch", condition: when, then, else: otherwise })];
  }

  // ---------- inputs ----------

  private choices(
    owner: string,
    byId: Map<string, Raw>,
    id: string,
    choices: Raw[],
    victory = false,
  ) {
    return choices.map((ch: Raw) => ({
      id: ch.id,
      text: ch.text ?? "",
      effects: (ch.effects ?? []).flatMap((e: Raw) =>
        this.effect(e, victory).filter((r): r is FlowEffect => !("steps" in r)),
      ),
      steps: [
        ...(ch.effects ?? []).flatMap((e: Raw) =>
          this.effect(e, victory).flatMap((r) =>
            "steps" in r ? this.expand(owner, byId, r.steps) : [],
          ),
        ),
        ...this.expand(owner, byId, ch.steps ?? []),
      ],
      ...(ch.condition && this.test(ch.condition) ? { when: this.test(ch.condition)! } : {}),
    }));
  }

  private input(owner: string, byId: Map<string, Raw>, st: Raw): string[] {
    const i = st.input;
    const head = {
      ...(st.title ? { title: st.title } : {}),
      ...(st.text || i.text ? { text: st.text ?? i.text } : {}),
    };
    switch (i.type) {
      case "choose_one": {
        // the difficulty is chosen on the new-game screen
        if (
          (i.choices ?? []).some((c: Raw) =>
            (c.effects ?? []).some(
              (e: Raw) => e.type === "campaign_data" && e.setting === "difficulty",
            ),
          )
        )
          return [];
        // a question that only picks the order of play (Carcosa's printing): the first answer, not asked
        const chs: Raw[] = i.choices ?? [];
        if (chs.length && chs.every(setsOrder)) {
          const first = chs[0];
          return [
            ...this.effectSteps(
              owner,
              byId,
              `${st.id}:${first.id}`,
              (first.effects ?? []).filter((e: Raw) => !isSetScenarios(e)),
            ),
            ...this.expand(owner, byId, first.steps ?? []),
          ];
        }
        return [
          this.add(owner, st.id, {
            kind: "chooseOne",
            ...head,
            choices: this.choices(owner, byId, st.id, i.choices ?? []),
          }),
        ];
      }
      case "counter": {
        // "Victory display": the experience from the cards in the victory display is counted by the game itself
        if (
          /victory display/i.test(i.text ?? "") ||
          (i.effects ?? []).every((e: Raw) => e.type === "earn_xp")
        ) {
          return this.effectSteps(owner, byId, st.id, i.effects ?? [], true);
        }
        const effects = (i.effects ?? []).flatMap((e: Raw) =>
          this.effect(e, false).filter((r): r is FlowEffect => !("steps" in r)),
        );
        return [
          this.add(owner, st.id, {
            kind: "counter",
            ...head,
            min: num(i.min) ?? 0,
            ...(num(i.max) !== undefined ? { max: num(i.max) } : {}),
            effects,
            steps: [],
          }),
        ];
      }
      case "investigator_choice": {
        const choices: Raw[] = i.choices ?? [];
        // the placeholder "random basic weakness" is drawn when the campaign starts
        if (
          choices.some((c) =>
            (c.effects ?? []).some((e: Raw) => e.type === "remove_card" && e.card === "01000"),
          )
        )
          return [];
        if (choices.length === 1 && i.investigator === "all")
          return this.effectSteps(
            owner,
            byId,
            st.id,
            (choices[0].effects ?? []).map((e: Raw) => ({
              ...e,
              investigator: e.investigator === "$input_value" ? "all" : e.investigator,
            })),
          );
        if (choices.length > 1) return this.unsupportedInput(owner, st, i.type);
        const c = choices[0] ?? { effects: i.effects ?? [], steps: [] };
        return [
          this.add(owner, st.id, {
            kind: "investigatorChoice",
            ...head,
            optional: !!i.optional,
            effects: (c.effects ?? []).flatMap((e: Raw) =>
              this.effect(e, false).filter((r): r is FlowEffect => !("steps" in r)),
            ),
            steps: this.expand(owner, byId, c.steps ?? []),
          }),
        ];
      }
      case "card_choice": {
        const codes: string[] = (i.query ?? []).flatMap((q: Raw) =>
          Array.isArray(q.code) ? q.code : q.code ? [q.code] : [],
        );
        const c = (i.choices ?? [])[0] ?? { effects: [], steps: [] };
        return [
          this.add(owner, st.id, {
            kind: "cardChoice",
            ...head,
            codes,
            min: num(i.min) ?? 1,
            max: num(i.max) ?? 1,
            effects: (c.effects ?? []).flatMap((e: Raw) =>
              this.effect(e, false).filter((r): r is FlowEffect => !("steps" in r)),
            ),
            steps: this.expand(owner, byId, c.steps ?? []),
          }),
        ];
      }
      case "checklist":
        return [
          this.add(owner, st.id, {
            kind: "checklist",
            ...head,
            min: num(i.min) ?? 0,
            ...(num(i.max) !== undefined ? { max: num(i.max) } : {}),
            choices: this.choices(owner, byId, st.id, i.choices ?? []),
          }),
        ];
      case "upgrade_decks":
        return [this.add(owner, st.id, { kind: "upgradeDecks" })];
      default:
        if (HANDLED_INPUTS.has(i.type)) return [];
        return this.unsupportedInput(owner, st, i.type);
    }
  }

  private unsupportedInput(owner: string, st: Raw, kind: string): string[] {
    this.skip(`input:${kind}`);
    return [
      this.add(owner, st.id, {
        kind: "unsupported",
        name: kind,
        ...(st.title ? { title: st.title } : {}),
        ...(st.text ? { text: st.text } : {}),
        effects: [],
        steps: [],
      }),
    ];
  }

  // ---------- steps ----------

  /** the game's steps for a list of guide step ids, in order; a step a linked resolution already ran is not run again */
  expand(owner: string, byId: Map<string, Raw>, ids: string[]): string[] {
    return [...new Set(ids.flatMap((id) => this.one(owner, byId, id)))];
  }

  private one(owner: string, byId: Map<string, Raw>, id: string): string[] {
    const key = `${owner}|${id}`;
    const seen = this.done.get(key);
    if (seen) return seen;
    this.done.set(key, []); // a cycle in the guide ends here
    const out = this.compileStep(owner, byId, id);
    this.done.set(key, out);
    return out;
  }

  private compileStep(owner: string, byId: Map<string, Raw>, id: string): string[] {
    if (id === "$upgrade_decks") return [this.add(owner, "upgradeDecks", { kind: "upgradeDecks" })];
    // the owner's own step, else the guide's shared one; a $ id found nowhere is a rule reminder
    const st = byId.get(id) ?? this.src.shared?.get(id);
    if (!st) return [];
    switch (st.type) {
      case "resolution": {
        // "Proceed to Resolution 6": that resolution's steps, here
        const r = this.resolutionsOf.get(owner)?.find((x: Raw) => x.id === st.resolution);
        return r ? this.expand(owner, byId, r.steps ?? []) : [];
      }
      case "branch":
        return st.condition ? this.branch(owner, byId, id, st.condition) : [];
      case "input":
        return this.input(owner, byId, st);
      case "story":
        return [
          this.add(owner, id, {
            kind: "story",
            ...(st.title ? { title: st.title } : {}),
            ...(st.text ? { text: st.text } : {}),
            bullets: [],
          }),
          ...this.effectSteps(owner, byId, `${id}:fx`, st.effects ?? []),
          ...this.expand(owner, byId, st.steps ?? []),
        ];
      case undefined:
      case null:
        // a note about the ArkhamCards app is not the campaign's text
        if (!st.effects?.length && /\b(this|the) app\b/i.test(st.text ?? "")) return [];
        // a shared rule reminder ($day_and_night_rule) is the rulebook's, not the campaign's text
        if (!st.effects?.length && /^\$.*_rule$/.test(id)) return [];
        return [
          ...(st.text
            ? [this.add(owner, `${id}:text`, { kind: "story", text: st.text, bullets: [] })]
            : []),
          ...this.effectSteps(owner, byId, id, st.effects ?? []),
          // the steps it leads on to ($advance_time then $update_day)
          ...this.expand(owner, byId, st.steps ?? []),
        ];
      default:
        // encounter sets, location setup, rule reminders, borders, tables: the scenario's setup, not the campaign's flow
        return [];
    }
  }

  // ---------- the flow ----------

  /** does a step do something beyond showing text: an effect, a question, or a branch that leads to one */
  private acts(id: string, seen = new Set<string>()): boolean {
    const st = this.steps[id];
    if (!st || seen.has(id)) return false;
    seen.add(id);
    if (st.kind === "story") return false;
    if (st.kind === "branch") return stepRefs(st).some((x) => this.acts(x, seen));
    return true;
  }

  compile(): CampaignFlow {
    const { campaign, scenarios, ids } = this.src;
    const flow: CampaignFlow = {
      setup: [],
      order: [],
      interludes: {},
      resolutions: {},
      before: {},
      steps: this.steps,
    };
    const campaignSteps = new Map<string, Raw>((campaign.steps ?? []).map((s: Raw) => [s.id, s]));
    flow.setup = this.expand("campaign", campaignSteps, campaign.setup ?? []);
    // what follows each scenario's resolutions, and what each interlude or epilogue is (all of them, listed in the order or not)
    for (const s of scenarios) {
      const id = this.scenarioId(s.id);
      const byId = new Map<string, Raw>((s.steps ?? []).map((x: Raw) => [x.id, x]));
      if (ids.has(s.id)) {
        this.resolutionsOf.set(id, s.resolutions ?? []);
        const res: Record<string, string[]> = {};
        // a hidden resolution is a tail another one proceeds to, never an ending of its own
        const shown: Raw[] = (s.resolutions ?? []).filter((r: Raw) => !r.hidden);
        const defeated = shown.find((r) => r.id === "no_resolution_defeated");
        const resigned = shown.find((r) => r.id === "no_resolution_resigned");
        for (const r of shown) {
          const k =
            r.id === "no_resolution" ||
            (r.id.startsWith("no_resolution_") && !(defeated && resigned))
              ? "none"
              : /^R\d+$/.test(r.id)
                ? r.id
                : null;
          if (k && !res[k]) res[k] = this.expand(id, byId, r.steps ?? []);
        }
        if (defeated && resigned)
          res.none = [
            this.add(id, "none", {
              kind: "chooseOne",
              text: "Did the investigators resign, or were they all defeated?",
              choices: [
                {
                  id: "resigned",
                  text: "They resigned",
                  effects: [],
                  steps: this.expand(id, byId, resigned.steps ?? []),
                },
                {
                  id: "defeated",
                  text: "They were all defeated",
                  effects: [],
                  steps: this.expand(id, byId, defeated.steps ?? []),
                },
              ],
            }),
          ];
        if (Object.keys(res).length) flow.resolutions[id] = res;
        // its own setup steps that change the campaign or ask the players (difficulty tokens, an intro choice); the intro
        // and the setup instructions are the scenario's to show and to do
        const had = new Set(Object.keys(this.steps));
        const before = this.expand(id, byId, s.setup ?? []).filter((x) => this.acts(x));
        if (before.length) flow.before[id] = before;
        // the steps that expansion made and nothing kept leads to (the setup's texts) go
        const kept = new Set<string>();
        const keep = (x: string) => {
          if (kept.has(x) || !this.steps[x]) return;
          kept.add(x);
          stepRefs(this.steps[x]).forEach(keep);
        };
        before.forEach(keep);
        for (const k of Object.keys(this.steps))
          if (!had.has(k) && !kept.has(k)) delete this.steps[k];
      } else if (s.type === "interlude" || s.type === "epilogue") {
        flow.interludes[id] = {
          kind: s.type,
          ...(s.scenario_name ? { name: s.scenario_name } : {}),
          steps: this.expand(id, byId, s.setup ?? []),
        };
      }
    }
    // the order of play: the guide's, then the scenarios it doesn't list and no step names (the players choose their
    // order, as in Carcosa) in the guide's file order
    const byGuide = new Set(scenarios.map((s) => s.id));
    for (const gid of campaign.scenarios ?? [])
      if (byGuide.has(gid) && (ids.has(gid) || flow.interludes[this.scenarioId(gid)]))
        flow.order.push(this.scenarioId(gid));
    const named = namedScenarios(flow);
    for (const s of scenarios) {
      const id = this.scenarioId(s.id);
      if (ids.has(s.id) && !flow.order.includes(id) && !named.has(id)) flow.order.push(id);
    }
    // the guide's own order of play, where its setup sets one (Carcosa): the first list on the setup's default path
    const set = this.setScenarios(campaignSteps, campaign.setup ?? []);
    if (set)
      flow.order = set
        .map((gid) => this.scenarioId(gid))
        .filter(
          (id, k, all) => all.indexOf(id) === k && (this.knownFile(id) || flow.interludes[id]),
        );
    // an interlude nothing reaches (in neither the order nor a step) goes, with its steps
    const reached = namedScenarios(flow);
    for (const id of Object.keys(flow.interludes))
      if (!flow.order.includes(id) && !reached.has(id)) {
        delete flow.interludes[id];
        for (const k of Object.keys(this.steps)) if (k.startsWith(`${id}:`)) delete this.steps[k];
      }
    // skipping an interlude that isn't played (the reprint's Interlude I) does nothing
    const playable = (id: string) =>
      flow.order.includes(id) || !!flow.interludes[id] || this.knownFile(id);
    for (const st of Object.values(this.steps))
      if (st.kind === "effects")
        st.effects = st.effects.filter((e) => e.do !== "skipScenario" || playable(e.scenario));
    return flow;
  }

  /** is `id` a scenario file of this group */
  private knownFile(id: string): boolean {
    return [...this.src.ids.values()].includes(id);
  }

  /**
   * The first `set_scenarios` list on the setup's default path: a branch takes its true option for the guide's version
   * check and its default otherwise, a question its first answer
   */
  private setScenarios(
    steps: Map<string, Raw>,
    ids: string[],
    seen = new Set<string>(),
  ): string[] | null {
    const inEffects = (effects: Raw[] | undefined) =>
      (effects ?? []).find(isSetScenarios)?.scenarios ?? null;
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const st = steps.get(id) ?? this.src.shared?.get(id);
      if (!st) continue;
      const own = inEffects(st.effects);
      if (own) return own;
      const c = st.condition;
      const opts: Raw[] = c?.options ?? [];
      const option =
        st.type === "branch"
          ? c?.campaign_data === "version" ||
            (c?.type === "multi" &&
              (c.conditions ?? []).some((x: Raw) => x.campaign_data === "version"))
            ? opts.find((o) => o.boolCondition === true)
            : (c?.defaultOption ?? opts[0])
          : st.type === "input"
            ? st.input?.choices?.[0]
            : null;
      if (option) {
        const found =
          inEffects(option.effects) ?? this.setScenarios(steps, option.steps ?? [], seen);
        if (found) return found;
      }
    }
    return null;
  }
}

export function compileFlow(src: FlowSource): FlowResult {
  const c = new Compiler(src);
  const flow = c.compile();
  return { flow, unsupported: c.unsupported, logLabels: c.logLabels };
}

export interface StepTexts {
  steps: Record<string, { title?: string; text?: string; choices?: Record<string, string> }>;
  interludes: Record<string, string>;
}

/** the words of a flow by step id, for the translations (the same compile of another language's guide gives the same ids) */
export function stepTexts(flow: CampaignFlow): StepTexts {
  const steps: StepTexts["steps"] = {};
  for (const [id, st] of Object.entries(flow.steps)) {
    const t = {
      ...("title" in st && st.title ? { title: st.title } : {}),
      ...("text" in st && st.text ? { text: st.text } : {}),
      ...("choices" in st
        ? { choices: Object.fromEntries(st.choices.map((c) => [c.id, c.text])) }
        : {}),
    };
    if (Object.keys(t).length) steps[id] = t;
  }
  return {
    steps,
    interludes: Object.fromEntries(
      Object.entries(flow.interludes).flatMap(([id, i]) => (i.name ? [[id, i.name]] : [])),
    ),
  };
}
