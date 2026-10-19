## Context

An enemy attack resolves in `src/engine/rules/enemies.ts`: the `enemyAttacks` window (Dodge cancels the attack there through `ctx.key` and `g.s.cancelled`), then `ResolveAttack`, which pushes `AssignDamage { inv, damage, horror, direct: false, source, enemy }`. `assignDamageHandler` (`src/engine/rules/investigators.ts:55`) asks one point at a time where it goes, offering the investigator and every controlled asset with health or sanity room (`soakers`), then applies it, defeats an asset at its cap, and opens `assetDamaged`, `horrorPlaced` and `damageTaken`, all after the fact. The options are labelled with the bare card name, and the strip shows them as buttons on the cards (`stripAction`).

Cards' data: `uses` is placed when the card enters play (`cards.ts:323`), spent by an ability's `cost.uses`, and the card leaves play when empty if every ability spends uses or it has `discardWhenEmpty`. `heal` (`effects.ts:120`) heals investigators only, by `InvTarget`. `Cost` can take horror (`takeHorror`, as an `AssignDamage` with `direct: true`) but not damage.

A scan of the 5,859 generated cards: every rules field ArkhamDB provides is already read by the engine (uses, health, sanity, enemy stats, keywords, spawn, prey, victory, shroud, clues, doom, stage, act clues, slots, cost, xp, deck limit, quantity, subtype, skills, tags, traits, unique); `flavor`, `subname`, `doubleSided` and `backText` are for the UI. Of the 322 cards with uses, 8 have their abilities written.

In-force ADRs: 0001 to 0013. ADR-0013 (a card works when every printed line is accounted for) decides when these cards count as working; ADR-0006 (card data from the vendored snapshot) is the data the abilities are written over.

## Goals / Non-Goals

**Goals:** prevention at the moment an attack deals damage, with Flesh Ward written on it; assignment options that say what they do; the listed healing uses-cards written; their coverage counted.

**Non-Goals:** prevention outside enemy attacks (treachery damage, direct damage), which no listed card needs; the healing cards with riders (listed in the proposal); the other 300 uses-cards, which stay with their packs in the campaign program.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 enemies.ts                 investigators.ts: AssignDamage                      effects.ts
 +--------------+  push     +--------------------------------------------+     +---------------------+
 | ResolveAttack|---------->| enemy attack, not yet windowed:            |     | preventDamage       |
 +--------------+           |   push win("attackDealsDamage",            |     |   {amount, kind}    |
                            |     {inv, enemy, key, damage, horror})     |     |   -> g.s.prevented  |
                            |   then itself, windowed                    |<----|      [key]          |
                            | windowed: subtract g.s.prevented[key]      |     | heal: target may be |
                            | ask point by point (labels: "Assign 1      |     |   an Ally asset     |
                            |   damage to X (defeated)")                 |     +---------------------+
                            | apply, assetDamaged, horrorPlaced, ...     |
                            +--------------------------------------------+     cards.ts: cost.takeDamage
                                         ^                                      (AssignDamage direct)
         Flesh Ward (cards.json): reaction on attackDealsDamage,
         cost {exhaust, uses: 1}, effects [preventDamage {amount: 1, kind: "either"}]
```

## Decisions

1. **A window between dealt and assigned, for enemy attacks.** `ResolveAttack` pushes `win("attackDealsDamage", { inv, enemy, key, damage, horror })` before its `AssignDamage`, which carries the attack's `key`; a new trigger `attackDealsDamage` in `TRIGGERS`. Reactions answer it like any window (the player sees the offer and may pass). *Why:* Flesh Ward's wording ("when you are dealt damage and/or horror from an enemy attack … cancel 1 damage or horror just dealt") is the moment between dealing and assigning; the engine's other "would" windows (`wouldFailSkillTest`, `wouldMoveOut`) are built the same way. *Alternative:* reacting to `damageTaken` and healing the point back: rejected, the point would already have been placed on an asset (and could have defeated it), which is the bug.

2. **`preventDamage { amount, kind: "damage" | "horror" | "either" }`.** It records against the window's key in the game flags, `flags["prevented:<key>"] = [damage, horror]` (as `attackBonus:<key>` already does); with `either` and both dealt, the player chooses which (a `chooseOne` the effect builds). The windowed `AssignDamage` subtracts it, never below 0, and deletes the entry. *Why:* the window's data is a copy; the step that will assign the points is the one that has to see the reduction, and the key already ties windows to their step (Dodge's `cancelled` works the same way).

3. **Soak labels from the engine, translated by key.** The assignment options keep their ids and values; each gets a `key` and `vars` for the UI's strings: `option.assignDamage` / `option.assignHorror` with `{ card, defeated }`, where `defeated` is true when that point brings the asset to its health or sanity. English: "Assign 1 damage to {card}" and " (defeated)"; Russian alongside. `optionLabel` renders them; the strip's button for an assignment on a card shows the same text. *Why:* the engine knows whether the point defeats the asset; the words belong to the strings files, as for every other prompt.

4. **`cost.takeDamage`.** Mirrors `takeHorror`: the cost pushes `AssignDamage { damage: n, direct: true, source: card }` (direct: the cost's own damage goes on the investigator, not an asset, as the card says "take 1 damage").

5. **`heal` on an Ally asset.** `heal` gains `targetAlly?: "atLocation" | "controlled"`: the choice offers the investigators the target names plus the Ally assets at the controller's location (or the ones they control); healing an asset lowers its damage and horror and emits `heal` with the card. For "from among investigators at your location", the data writes one `heal` of 1 per point, each its own choice, so the player places each point.

6. **The cards, in data**, in their packs' `cards.json`, each `cost` as printed (uses, exhaust, takeDamage/takeHorror), `discardWhenEmpty` where the card says so (First Aid, Extra Rations), a label per ability in `content/i18n/{en,ru}/ui.json` (`ability.<code>.<index>`):

   | Card | Pack | Ability |
   | --- | --- | --- |
   | Flesh Ward 60106 | investigator | reaction `attackDealsDamage` (you), exhaust, 1 charge: prevent 1 either |
   | Clarity of Mind 02030 / 51008 | dwl / return | action, 1 charge: heal 1 horror (level 3: two of 1, among, at location) |
   | Smoking Pipe 02116 | dwl | fast, 1 supply, exhaust, take 1 damage: heal 1 horror (you) |
   | Painkillers 02117 | dwl | fast, 1 supply, exhaust, take 1 horror: heal 1 damage (you) |
   | Strange Solution 02262 | dwl | action, 1 supply: heal 2 damage (an investigator at location) |
   | First Aid 03230 | ptc | action, 1 supply: heal 1 damage and 1 horror (investigator or Ally at location); discard when empty |
   | Healing Words 06163 / 08068 | tde / eoe | action, 1 charge: heal 1 damage (level 3: two of 1, among) |
   | Sinha's Medical Kit 08736 | eoe | fast, exhaust, 1 supply: heal 1 damage or 1 horror (investigator or Ally at location) |
   | Extra Rations 60570 | investigator | fast, 1 supply, exhaust: heal 1 damage (you or an Ally you control); discard when empty |
   | Canteen 60573 | investigator | fast, 1 supply, exhaust: heal 2 horror (you) |

7. **`ENGINE_VERSION` 3.** A save replays its actions; the new window and abilities add prompts an old log doesn't answer, so a version-2 save restarts its scenario and keeps its campaign, as the store already does for any rules change.

## Risks / Trade-offs

- [The window adds a prompt on every enemy attack] → only when a reaction can answer it: a window with nothing to offer resolves without asking, as the others do; a test checks an attack without Flesh Ward asks nothing new.
- [Other prevention cards have other timings (Guard Dog, Bulletproof Vest's soak, "would be defeated")] → this window is for enemy attacks only; those come with their packs and add their own windows when needed.
- [Healing an Ally asset changes `heal`'s shape] → the field is optional; existing cards are unchanged and the schema still validates them.
- [A version bump restarts scenarios in progress] → the campaign log and decks are kept; the store already explains it in a notice.

## Migration Plan

Engine and content; `ENGINE_VERSION` 3 (version-2 saves restart their scenario, campaign kept). Rollback: revert.

## Open Questions

None.
