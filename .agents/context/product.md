# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, equally important:

- **Hot-seat groups.** One to four investigators share one device and play a full campaign together without the physical box. The players are mostly Russian-speaking friends of the author.
- **Solo players.** One person plays alone, sometimes several investigators at once. Some are new to the game and lean on the tutorial tips, the card catalog and the rules glossary.

## Product Purpose

Arkham Table is a browser version of *Arkham Horror: The Card Game*. It plays scenarios and whole campaigns on a card table, with a rules engine that runs the game and the campaign guide. Success means a group can sit down, pick investigators and decks, and play a campaign start to finish by the real rules, with nothing to track by hand.

## Positioning

The engine is the authority on the rules. A card counts as working only when every printed line is accounted for (ADR-0013), and the campaign guide is played step by step as a typed flow (ADR-0011). Content coverage is measured and committed (ADR-0012), so the game says honestly what it cannot do yet instead of silently simplifying.

## Operating Context

- Played at a desk or on a sofa on one shared screen. Hand-off screens hide each investigator's hand from the others.
- Sessions are long: a scenario takes an evening, a campaign spans many sessions, and saved games are restored later.
- The physical game's language carries over: real card scans, cardboard tokens, chaos bag, act and agenda decks, campaign log.
- Rules reference is the Arkham Grimoire (ADR-0015). Card data comes from a vendored ArkhamDB snapshot (ADR-0006). Campaigns are generated from ArkhamCards' campaign guides (ADR-0007).

## Capabilities and Constraints

- Desktop first, plus phone in landscape. Layout switches through one layout mode that components read (ADR-0005).
- Two languages: Russian and English. Russian card images are preferred wherever they exist; English is the fallback.
- Night of the Zealot is hand-written and fully playable. 36 other campaigns are generated; what the engine cannot offer yet is shown as the guide's text with its usual outcome.
- Viewing is view state, deciding is game state (ADR-0004). Player windows are engine windows (ADR-0014).
- Presentation follows the animation clock (ADR-0002). Sounds are keyed to it and normalised to fixed loudness.
- Reduced motion is honoured: animations that fly cards collapse to instant placement.
- Packs load lazily. The main bundle carries only the core pack.
- Hosted on GitHub Pages at arkham.artkost.dev. Card scans are proxied in dev and downloaded into the build for deploys.

## Brand Commitments

- Name: **Arkham Table**.
- Fan project for personal, non-commercial use. The game is © Fantasy Flight Games. Card text from ArkhamDB, card images from arkham.build. Credit these sources; never present the app as official.
- Card fonts are Teutonic, Teutonic RU and Alegreya. Icons come from ArkhamCards' icon sets as one SVG sprite (ADR-0003).

## Evidence on Hand

- Card scans: arkham.build CDN, and Russian images in `public/cards-ru`.
- Menu art extracted from the core rulebook into `public/art/`, with sources in `content/art/art.json`.
- Cardboard token art, card backs and table background in `public/icons` and `public/table`.
- CC0 sound effects with a provenance manifest (ADR-0001).
- Content coverage in `content/coverage.json`.
- No testimonials, user counts or press exist. Do not invent them.

## Product Principles

1. **Rules first.** Fidelity to the printed rules and the campaign guide beats convenience. Never fake an effect the engine does not resolve.
2. **Honest about gaps.** Unimplemented content is labelled, not hidden.
3. **The table is the interface.** Players act on cards, tokens and locations the way they would on the physical table.
4. **Content, not code.** New cards and campaigns arrive as data and imports, not engine changes.
5. **Both languages are first-class.** Every player-facing string works in Russian and English.

## Accessibility & Inclusion

- Reduced motion must be respected everywhere cards or tokens move.
- Touch and pointer both work: long press stands in for hover on touch screens.
- Shared-screen play needs text readable from a little distance, and hidden information must stay hidden behind hand-off screens.
