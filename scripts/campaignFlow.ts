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
import { namedScenarios } from "../src/content/flow";
import { kebab, tokenName, type Raw } from "./campaignGuide";

export interface FlowSource {
  /** the guide's campaign record */
  campaign: Raw;
  /** the guide's scenarios of this campaign: the playable ones (named in `ids`) and the interludes and epilogues */
  scenarios: Raw[];
  /** guide scenario id → the id of the scenario file written for it (the playable ones) */
  ids: Map<string, string>;
}

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
            return r ? [{ do: "end", result: r }] : this.skipEffect(e);
          }
          case "difficulty":
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

  /** the game's steps for a list of guide step ids, in order */
  expand(owner: string, byId: Map<string, Raw>, ids: string[]): string[] {
    return ids.flatMap((id) => this.one(owner, byId, id));
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
    if (id.startsWith("$")) return [];
    const st = byId.get(id);
    if (!st) return [];
    switch (st.type) {
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
        ];
      case undefined:
      case null:
        return [
          ...(st.text
            ? [this.add(owner, `${id}:text`, { kind: "story", text: st.text, bullets: [] })]
            : []),
          ...this.effectSteps(owner, byId, id, st.effects ?? []),
        ];
      default:
        // encounter sets, location setup, rule reminders, borders, tables: the scenario's setup, not the campaign's flow
        return [];
    }
  }

  // ---------- the flow ----------

  compile(): CampaignFlow {
    const { campaign, scenarios, ids } = this.src;
    const flow: CampaignFlow = {
      setup: [],
      order: [],
      interludes: {},
      resolutions: {},
      steps: this.steps,
    };
    const campaignSteps = new Map<string, Raw>((campaign.steps ?? []).map((s: Raw) => [s.id, s]));
    flow.setup = this.expand("campaign", campaignSteps, campaign.setup ?? []);
    // what follows each scenario's resolutions, and what each interlude or epilogue is (all of them, listed in the order or not)
    for (const s of scenarios) {
      const id = this.scenarioId(s.id);
      const byId = new Map<string, Raw>((s.steps ?? []).map((x: Raw) => [x.id, x]));
      if (ids.has(s.id)) {
        const res: Record<string, string[]> = {};
        for (const r of s.resolutions ?? []) {
          const k = r.id === "no_resolution" ? "none" : /^R\d+$/.test(r.id) ? r.id : null;
          if (k) res[k] = this.expand(id, byId, r.steps ?? []);
        }
        if (Object.keys(res).length) flow.resolutions[id] = res;
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
    return flow;
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
