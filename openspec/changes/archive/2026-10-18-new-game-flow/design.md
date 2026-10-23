## Context

- `Screens.tsx` holds `MenuScreen` (one form: campaign select, difficulty select filtered to easy/standard, investigator grid with a deck select, settings), `CampaignLogScreen`, `HowToScreen`; `store.screen` is `"menu" | "game" | "log" | "howto"`; `newCampaign({campaignId, difficulty, seed, investigators: [{code, deckId}]})` starts a campaign; `db.campaigns[id].chaosBags` holds the four bags; `chaos.ts` has `groupTokens`; `ChaosToken` draws a token; `Portrait` draws the class-ringed avatar; `validateDeck` validates a deck.
- One campaign exists today; the step still shows it as a card so the screen is right when the second lands.
- In-force ADRs: 0001–0003; none constrains the menus.

## Goals / Non-Goals

**Goals:**

- A phone-first wizard that a first-time player can walk through without reading.
- Pure step state (`wizard.ts`) so the flow is unit-tested without React.
- No change to what `newCampaign` receives.

**Non-Goals:**

- Deck editing (deck-configuration), the table's phone layout, campaign selection beyond what content defines.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
+-----------------------------------------------------------------------------------+
| Browser app                                                                       |
|  store.screen: title | wizard | settings | howto | log | game                     |
|                                                                                   |
|  +-------------+   +------------------------------------------------------------+ |
|  | Title       |-->| Wizard (src/ui/menu/)                                      | |
|  | Continue    |   |  wizard.ts (pure): { step, campaignId, picks[], decks{},   | |
|  | New campaign|   |   difficulty }, next/back/toggleInvestigator/canContinue   | |
|  | How to play |   |  CampaignStep -> InvestigatorsStep -> DecksStep ->         | |
|  | [gear]      |   |   DifficultyStep (BagCard x4: groupTokens, average) ->     | |
|  +------+------+   |   ReadyStep -> store.newCampaign(...)                       | |
|         |          +------------------------------------------------------------+ |
|         v                                                                          |
|  +-------------+   content db: campaigns (chaosBags, scenarios), investigators,   |
|  | Settings    |   decks (+ custom decks from local storage, deck-configuration)  |
|  +-------------+   Portrait, ChaosToken, validateDeck reused                      |
+-----------------------------------------------------------------------------------+
```

## Decisions

### 1. Pure wizard state in `wizard.ts`

`WizardState` plus reducers (`toggleInvestigator` keeps tap order and caps at four, `setDeck`, `setDifficulty`, `next`/`back` with per-step `canContinue`), tested without React. The React steps render it. Alternative: state inside the components; rejected, the back-keeps-picks rule and the order rule deserve tests.

### 2. Screens as store values

`screen` gains `"title" | "wizard" | "settings"`; the wizard's own step lives in the wizard state (not the store) so a reload returns to the title, which is fine for a menu.

### 3. Bag cards from the data

`BagCard` groups the bag with `groupTokens` and renders `ChaosToken`s with counts; `averageModifier(tokens)` in `chaos.ts` averages the numeric tokens (symbols excluded) and is tested. No per-difficulty text beyond a one-line blurb string per difficulty id.

### 4. Avatars are `Portrait`

The tiles and the ready screen use the existing `Portrait` (class ring, active ring unused). The campaign log's investigator rows switch to it too.

### 5. Deck step defers editing

The step lists `db.decks` for the investigator plus custom decks read through a `customDecks()` function that returns `[]` until deck-configuration provides them; the "Edit" control appears only when that change registers an editor. No coupling in the other direction.

## Risks / Trade-offs

- [Only one campaign: a carousel of one looks odd] -> the campaign step shows the single card with its description and auto-advances on Continue; no carousel chrome until there are two.
- [Average modifier is a crude measure] -> it is a hint next to the real tokens, labelled "average"; the tokens are the truth.
- [Scripts that read `.screen.menu`] -> `check-sound-controls.js` and `check-tips.js` touch the settings; updated to the settings screen.

## Migration Plan

UI only. Rollback: git.

## Open Questions

- Whether the title screen plays the scenario intro art or a static table image. Default: static art from `public/table`.
