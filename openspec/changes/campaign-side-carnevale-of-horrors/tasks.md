## 1. Carnevale of Horrors: definition and setup

- [ ] 1.1 Failing test (`src/engine/__tests__/`, testkit `start("carnevale-of-horrors")`): eight locations in a one-way clockwise ring, the Abbess at San Marco, six face-down Carnevale-Goers, the investigators at San Marco, 19 tokens in the Standard bag. Then `content/campaigns/side-carnevale-of-horrors/{campaign,flow}.json` and `scenarios/carnevale-of-horrors.json`: the guide's Standard/Hard bags (Easy = Standard, Expert = Hard), `encounterSets: [venice]`, acts 82005–82007, agendas 82002–82004, set-asides 82027 and 82023–82026, layout as a circle; delete `content/campaigns-generated/side-carnevale-of-horrors/`.
- [ ] 1.2 `scripts/carnevale-of-horrors.ts` `setup` hook: remove one random location other than 82008/82009, shuffle the ring, write per-instance `oneWay` links; helpers `across`, `clockwise`, `counterClockwise`; `LINE_RULE` for the clockwise connection line on 82008–82016.

## 2. Token table

- [ ] 2.1 Tests per token on Standard and Hard: skull −2 minus revelers beneath the agenda (Hard: act or agenda), cultist reveal another and encounter draw on fail, tablet −3/−4 with damage or horror to the nearest reveler, elder thing −4/−6 with Cnidathqua's attack. Then `x` sources `revelersBeneathAgenda`, `revelersBeneathActOrAgenda` in `schema.ts` and `rules/tokens.ts`, the token entries for all four difficulties.

## 3. Scripts per card

- [ ] 3.1 Agendas and acts: 82003/82004 backs (flip a Carnevale-Goer, Cnidathqua attacks everyone, revelers take damage first), 82005 (group-clue peek, objective by revelers beneath act/agenda), 82006 and 82006b Gondola (forced flip, everyone to Canal-side, board swap), 82007 (encounter replacement: look at 5, Writhing Appendages engage). Tests per back.
- [ ] 3.2 Locations: 82009–82016 in data (`enterLocation`, `leaveLocation`, fast move), 82008 San Marco and 82014 Flooded Square scripts; 82022 Abbess (any-investigator move).
- [ ] 3.3 Enemies: 82017b–82021 Masked Carnevale-Goer / Innocent Reveler (flip, beneath agenda on discard, horror to all), 82017 Don Lagorio, 82018 Elisabetta, 82019 Salvatore Neri, 82020 Savio Corvi, 82027 Cnidathqua (no location, from anywhere, cannot be evaded, spawns 82030), 82028 (prey most revelers), 82029 Sentinel (across, blocks the peek), 82030 Writhing Appendage, 82032 (move across).
- [ ] 3.4 Treacheries: 82031 Mass Hysteria, 82033/82034 (controllers test too, reveler first), 82035 Mesmerize, 82036 Abduction (data), 82037 Acrid Miasma (attach clockwise).
- [ ] 3.5 Masks 82023–82026: reaction `substituteSkill` in `rules/skillTest.ts` and the one-Mask play limit; enter-play reactions in data. Test: Pantalone offers willpower for an intellect test once per round.

## 4. Resolutions and flow

- [ ] 4.1 Test: act 3 complete with 3 saved and 1 sacrificed → R1 records `sun_banished_cnidathqua`, offers the Abbess; Cnidathqua defeated → R2; `none` with the Madness/Injury/Monster weakness branch. `setData` of both counts; `logCount` branches in `flow.json`; no cost step when standalone.
- [ ] 4.2 `investigatorChoice { codes }` in `schema.ts` and `src/engine/campaign/flow.ts`: one pick per active investigator in player order, taken codes removed, `earnCard` bound to the picker; test with three investigators and four masks.

## 5. Translations and coverage

- [ ] 5.1 Prompt keys for the peek, the ring moves and the mask choice in `content/i18n/{en,ru}/ui.json`; `campaign-texts/side-carnevale-of-horrors.json` re-keyed to the hand-written flow in both locales (RU text from ArkhamCards' `side` guide).
- [ ] 5.2 Bot plays the scenario three rounds without an error (`generated.test.ts` keeps covering it); `pnpm coverage` reports `coh` 40 of 40 and `tokens: true`; `docs/campaign-program.md` ticks `coh`.
- [ ] 5.3 `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate campaign-side-carnevale-of-horrors --type change --strict`.
