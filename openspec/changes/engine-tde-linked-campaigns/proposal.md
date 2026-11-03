## Why

The Dream-Eaters is two campaigns, The Dream-Quest (A) and The Web of Dreams (B), that the guide lets a group play alone (4 parts), interleaved as one 8-part campaign with two investigator sets, decks and chaos bags, or in step with a second group whose decisions are typed in. `CampaignState` (`src/engine/campaign/types.ts:94`) holds one campaign and nothing links two, so the compiled flows carry 42 (A) and 43 (B) `unsupported` steps: every `send_campaign_link` and `receive_campaign_link` (19+18, 20+19), the `linked_campaign` checks and the prologue's mode question. Interludes II and III (The Black Cat, The Oneironauts, The Great Ones) hand play back and forth between the campaigns and change both logs and both chaos bags; The Silver Key (06189) earned in A Thousand Shapes of Horror (B) is handed to an investigator of A. None of it can happen today, and even 4-part play reads "This part of the guide isn't played yet" at every link.

## What Changes

- **A link mode per Dream-Eaters campaign**, chosen on the new-game screen: _four_ (one campaign alone), _interconnected_ (both campaigns in one save, two investigator sets, two chaos bags, play alternating A and B as the guide's sync points dictate) and _separate_ (another group plays the other campaign; their decisions are typed in). The guide's `ask_8_part_campaign` prompt is answered by that choice, like difficulty.
- **Two new flow steps and one condition** (ADR-0011's language, `src/content/schema.ts`, `src/engine/campaign/flow.ts`): `sendLink { id, value }` posts a decision for the other campaign; `receiveLink { id, choices, prompt, flip }` reads one, with per-mode behaviour (four: the guide's default branch; interconnected: wait, and hand play to the other campaign when `flip` says so; separate: a prompt with the guide's `manual_prompt` and its choices); `linkedMode { is }` as a condition, replacing the fixed `take` the `linked_campaign` checks compile to. `scripts/campaignFlow.ts` compiles the guide's `send_campaign_link` and `receive_campaign_link` into them; the two flows lose their 85 `unsupported` steps.
- **A linked pair in the engine**: `src/engine/campaign/linked.ts` holds two `CampaignState`s, the mode, which one is active and the mailbox of link values. One pure call advances the active campaign, delivers what it sent, and flips to the other when the active one waits on a link the other hasn't sent. Each campaign keeps its own log, bag, investigators and flow, so "add 1 elder thing to both chaos bags" and "check both Campaign Logs" are each campaign's own steps, run when play flips to it.
- **The Silver Key moves between decks**: the `great_ones_silver_key` link carries `transfer_key` or `no_key`; A's receive branch earns 06189 to a chosen investigator of A and B's steps remove it from B's deck, with the existing `earnCard` and `removeCard` effects.
- **The campaign screen and the save** show which campaign is in play, a "waiting for the other campaign" state and a switch to the other; `Save` (`src/ui/state/store.ts:93`) carries the other campaign and the mailbox. Resuming restores both.
- **A deck change from play** (`deck:` note read by `applyScenarioEnd`): the dream intros of Beyond the Gates of Sleep replace a basic weakness with trauma; the scenario script needs one note kind to change a campaign deck, as `log:` notes change the log today.
- **Confirmed engine bug, owned elsewhere**: story cards (type `story`, the `b` faces of double-sided locations and enemies) are shuffled into the encounter deck by `createGame` (`src/engine/index.ts`), which skips only act, agenda and scenario cards. A scratch vitest run of the generated TDE scenarios showed 06057b and 06058b in Beyond the Gates of Sleep's deck (29 cards), 17 story faces in The Search for Kadath's, 12 in Point of No Return's and 06078 in Waking Nightmare's. The fix (story cards out of the deck, linked to their front face, resolvable) belongs to `engine-scenario-structure`; this change depends on it for the campaign changes, not for linked play.

Out of scope, in their own changes: Swarming, Veiled, Hidden, Bonded, Researched (`engine-generic-keywords`); the `multi` and `version` compile fixes that skip the deck upgrade after scenario III (`campaign-flow-compiler-fixes`); the scenarios' setups, scripts and token tables (`campaign-the-dream-quest`, `campaign-the-web-of-dreams`); online play of an interconnected pair.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-flow`: link steps and the link-mode condition in the step language; the compiler turns the guide's campaign links into them; a linked pair of campaigns advanced as one.
- `campaign-play`: the link mode on the new-game screen; an interconnected pair in one save, played in alternation, restored together; the Silver Key handed between the campaigns; a scenario can change a campaign deck.

## Impact

- `src/engine/campaign/types.ts` (`CampaignState.link`), `src/engine/campaign/linked.ts` (new: the pair, `advanceLinked`, `deliver`, `flip`), `src/engine/campaign/flow.ts` (`sendLink`, `receiveLink`, `linkedMode`), `src/engine/campaign/campaign.ts` (`startLinked`, `deck:` notes in `applyScenarioEnd`), `src/engine/world/flags.ts` (`campaignNotes` deck kind), `src/content/schema.ts` and `src/content/flow.ts` (step and condition kinds, `stepRefs`), `scripts/campaignFlow.ts` (the compile; `ask_8_part_campaign` handled), `content/campaigns-generated/the-dream-quest/flow.json` and `the-web-of-dreams/flow.json` (regenerated by `pnpm import:campaigns`).
- `src/ui/state/store.ts` (`Save.linked`, `newCampaign` with a mode and two investigator sets, `answerFlow` through the pair), `src/ui/menu/NewGame` (mode step, second investigator picker), `src/ui/menu/CampaignScreen` and `FlowPrompt` (active campaign, waiting state, switch, manual link prompt), `src/ui/menu/campaignView.ts`, `content/i18n/{en,ru}/ui.json`.
- `ENGINE_VERSION` unchanged (no scenario rule changes); the save gains an optional field, old saves load as before.
- New ADR-0058 (a linked campaign is two campaign states and a mailbox).
