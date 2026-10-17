# Arkham Table

A browser version of *Arkham Horror: The Card Game* on a 3D table (React + react-three-fiber), with a rules engine in plain TypeScript. 1–4 investigators play hot-seat on one device. It ships the **Night of the Zealot** campaign and starter decks for the five core investigators.

Fan project for personal use. Card text comes from ArkhamDB and card images from arkham.build. The game is © Fantasy Flight Games.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # engine, content and UI-logic tests
npm run check:content  # validate every file under content/
npm run build
```

Card images are loaded from `https://cdn.arkham.build/optimized/<code>.webp`. That CDN sends no CORS headers, so the dev and preview servers proxy `/cards/*` to it (see `vite.config.ts`). The GitHub Pages build downloads the scans into the site instead (see Deploying). On another host, set up the same rewrite, or set `VITE_CARD_IMAGE_BASE` to a CORS-enabled mirror. When an image cannot load, the card is drawn from its data instead.

Icons are one SVG sprite, `public/icons/sprite.svg`, injected into the page before the first screen draws, so no icon ever flashes blank. `npm run import:icons` (`scripts/import-icons.ts`) builds it from the vector sources in `inspired/svg-icons`. The sprite holds every glyph of ArkhamCards' five IcoMoon icon fonts, which includes every encounter set and scenario they know, so a later campaign's icons need no new code. It also holds every name the code draws and every encounter set and scenario in `content/`. Codes the icon set spells differently (the core set's `torch`, `cultists` and others) are aliased under `extra` in the provenance manifest `content/icons/icons.json`, which lists each symbol with its source file and icon set. `check:content` fails when a set or scenario has no icon, or when the manifest and the sprite disagree. Only the cardboard tokens the icon set doesn't draw are PNGs: damage, horror, doom, the lead token and the connector plaques (from `inspired/icons`, cut out along the hand-made transparent copies in `inspired/icons/transparent`). The card backs come from ArkhamCards too, and the framed table background from `inspired/icons`; the card fonts are Teutonic, Teutonic RU and Alegreya. `scripts/extract-assets.sh` copies these into `public/icons`, `public/table` and `public/fonts`; it needs ImageMagick. All outputs are committed, so builds never read `inspired/`. Like the card scans, the art, icons, fonts and imported text are for personal use.

## Deploying

Every push to `main` deploys the game to GitHub Pages at **https://arkham.artkost.dev** (`.github/workflows/deploy.yml`). The workflow runs the tests, lint and content check, builds, and then publishes. A failing check publishes nothing and the site keeps the previous version. To deploy without a push, use Actions → "Deploy to GitHub Pages" → Run workflow.

- **One-time setup:**
  - Settings → Pages: Source "GitHub Actions", custom domain `arkham.artkost.dev`, Enforce HTTPS.
  - In Cloudflare DNS for `artkost.dev`: a `CNAME` record `arkham` → `jilizart.github.io`, proxy off (DNS only), so GitHub can issue the certificate.
- **Why a subdomain:** the account's user site has the custom domain `artkost.dev`, so `jilizart.github.io/<repo>/` redirects to `artkost.dev/<repo>/`, which Cloudflare serves as the portfolio. Without a custom domain, the game would live at `/<repo>/`: build with `PAGES_BASE=/arkham-cards-game-app/`, and every asset path follows (see below).
- **Card scans:** `npm run fetch:cards -- dist` downloads every scan the game uses (about 230 files, 46 MB) into `dist/cards`, so the map's WebGL cards load them from the same origin. They are cached in `.cache/cards` and never committed. A scan that can't be downloaded is listed in the log and that card shows its drawn face. The scans are publicly hosted on the Pages site.
- **Trying a deploy build locally:** `npm run build && npm run fetch:cards -- dist && npx vite preview`, then open http://localhost:4173/. Add `PAGES_BASE=/some-path/` to both commands to check a sub-path build.
- In code, files under `public/` are referenced with `asset("…")` from `src/ui/images.ts`, never with a leading `/`; a test enforces this.

## Layout

```
content/                         game data — no engine changes needed to add more
  packs/core/cards.generated.json  imported from ArkhamDB (never edit by hand)
  packs/core/cards.json            hand-written behavior & fixes, merged over the generated data by card code
  packs/core/scripts/<code>.ts     TS for cards the data format can't express
  investigators/<code>.json        deckbuilding rules, signature cards
  decks/<id>.json                  deck lists
  campaigns/<id>/campaign.json     scenario order, chaos bags, campaign-log labels
  campaigns/<id>/scenarios/*.json  setup, connections, map layout, chaos token effects, resolutions
  campaigns/<id>/scripts/<scenario>.ts  objectives and scenario-specific hooks
  i18n/<locale>/{ui,cards,campaigns}.json            hand-written translations (English is the fallback)
  i18n/<locale>/*.generated.json   imported translations; the hand-written files win field by field
scripts/import-cards.ts          ArkhamDB → cards.generated.json
src/engine/                      rules engine (no React/three imports — enforced by ESLint)
src/content/                     zod schemas, loader, i18n
src/ui/                          React HUD + R3F table
```

## Adding cards

1. Import a pack: `npm run import:cards -- --pack <pack_code>` (add the code prefix in `scripts/import-cards.ts` if needed). This only rewrites `cards.generated.json`.
2. Describe behavior in `content/packs/<pack>/cards.json`:

   ```json
   "01088": { "abilities": [{ "kind": "onPlay", "effects": [{ "op": "gainResources", "amount": 3 }] }] }
   ```

   Ability kinds are `action`, `fast`, `reaction`, `forced`, `constant`, `revelation` (also an act's or agenda's back side), `onPlay` (also a skill card's effect when committed), and `elderSign`. Effects, conditions, triggers and modifiers form a closed vocabulary defined in `src/content/schema.ts`. Unknown names fail validation.
3. If something can't be expressed this way, set `"script": true` and add `scripts/<code>.ts` exporting a `CardScript`. Copy any existing script as a starting point.
4. Run `npm run check:content`.

## Russian card images

With the Russian interface, cards show Russian card images from `public/cards-ru` (378×531 WebP). Most are community-made cards from `inspired/CARDS_ru`; acts, agendas, scenario cards, investigators and the few cards the community set lacks come from the Russian print sheets in `inspired/PDF_ru`. The Russian card names and texts follow what is printed on those images (`content/i18n/ru/cards.print.json`, layered between the imported translation and hand-written `cards.json`). Like the English scans, these images are publicly hosted on the Pages site.

To rebuild them, run `npm run import:ru-cards`. It needs `tesseract`, `pdfimages` (poppler), ImageMagick and `cwebp`, and downloads Tesseract's Russian data once into `.cache/tessdata`. The import:

1. extracts the card images embedded in the PDFs;
2. reads every image with OCR (about 15 minutes the first time, cached in `.cache/ru-import`);
3. matches each one to a card code by name, text, orientation and level;
4. writes the manifest `content/i18n/ru/images.json`, the WebP files and `src/ui/ruImages.generated.json`.

Uncertain matches are left out and listed on `.cache/ru-import/review.html`, next to the English scans. Pin or reject a match in `content/i18n/ru/images.overrides.json` (`{"01111:back": "inspired/…/Кабинет.jpg"}`, or `null`) and rerun; the same inputs and overrides always give the same output. For new cards, add their printed text to `cards.print.json`; `npm run check:content` rejects unknown codes and icon tokens there.

## Translations

Translations are imported, not typed in:

```bash
npm run import:i18n -- --locale ru               # campaign/scenario names, intros, resolutions, log labels,
                                                 # encounter sets and matching UI labels from inspired/ArkhamCards
npm run import:cards -- --pack core --locale ru  # card names, traits and text from ru.arkhamdb.com
```

Both write only `content/i18n/<locale>/*.generated.json`. Fix a string by putting it in the hand-written `ui.json`, `cards.json` or `campaigns.json` next to them; re-running an import never touches those. Campaigns and scenarios name their ArkhamCards counterpart with `i18nId`. If ArkhamDB is unreachable, the card import exits with an error and keeps the old file.

## Adding a campaign

Create `content/campaigns/<id>/` with a `campaign.json`, one JSON file per scenario and, if needed, `scripts/<scenario>.ts`. Use Night of the Zealot as the template. The menu picks it up automatically.

ArkhamDB has no location connection data, so each scenario file lists its `connections` as code pairs (and any one-way ones as `oneWay: [from, to]` pairs) and its `layout` as grid positions.

## Playing

- **Title screen and new game:** the game opens on a title screen: **Continue** (when there is a game, a campaign or a save), **New campaign**, **How to play**, and a gear for settings. New campaign is a short wizard with Back and Continue: pick the campaign, tap investigators (up to four; the avatars get badges P1 to P4 in tap order, the first is the lead, tapping again removes one and closes the gap), pick a deck for each, pick the difficulty, then check the summary (avatars in order, the chaos bag, the first scenario) and press **Begin**. Difficulty is shown as the bag itself: four cards with the tokens grouped and the bag's average modifier (the lower, the harder). The settings screen holds language, private hands, drawing tokens by hand, pace, tips, **Reset tips**, music and sound effects. Between scenarios the campaign log shows each investigator's avatar with experience and trauma, the scenarios played, the log and what comes next.
- **Starting a scenario:** the table is empty while you mulligan. Click cards in your hand to put them on the "to redraw" row above it; click one there to take it back. **Redraw** sends them face down into your deck and deals new ones (**Keep hand** if you picked none). After the last mulligan the scenario is introduced: its name and story with the agenda, then the act, each large in the middle until you press **Continue** (or Space / Enter); each then flies to the act/agenda panel, and the starting locations are dealt face down from there, turning over where an investigator starts. **Skip introduction** puts everything in place at once. A loaded game skips the introduction.
- **Players:** every investigator is an avatar in the top bar, in turn order, with health and sanity under it. In the investigation phase the avatar of the investigator whose turn it is is ringed, with a pip per action left that empties as an action is spent (a fourth pip for an extra action); those done are dimmed and the defeated greyed; a changed count flashes. **Tap an avatar to look at that investigator**: the play strip and the map show their assets, threats and marker, and their hand only when hands aren't private; your choices wait, and **Back to Roland** (or the decision passing to someone else) returns. **Tap the avatar on screen to open its sheet**: the investigator card, ability text with its button when it can be used, skills, resources, clues and the hand count; Escape, a tap outside or the avatar closes it. When someone other than the active investigator can act (a commit to a teammate's test, a reaction), their avatar **pulses with a label** ("Daisy can commit cards"); tap it to hand over the device (with private hands the "Pass to Daisy" screen follows). When a choice is among investigators (who plays next, who takes the damage), the avatars light up and a tap answers.
- **Round tracker:** the top bar shows the scenario and round, then the round's four phases in order (Mythos, Investigation, Enemy, Upkeep) with the current one lit, the ones played dimmed and Mythos struck through in round 1, when it doesn't happen. The player bar sits beside the phases (see Players below). When nothing is left to spend, **End turn** glows. When the turn passes to another investigator and hands aren't private, "Daisy Walker's turn" plays across the middle with her portrait; with private hands the hand-off screen begins the turn instead. On a narrow screen the phases shrink to their initials.
- **Enemy intents:** every enemy carries a small badge saying what it will do in the enemy phase: ⚔ with its damage and horror when it is engaged and ready to attack, » when it is a hunter with nobody at its location, z when it is exhausted and will rest, … otherwise. The badge follows the state at once (evade an enemy and it rests; engage one and it attacks). Hover the badge, or the enemy for its enlarged copy, for the words.
- **Tips for a first game:** the first time each situation comes up (the mulligan, the scenario's goal, your turn, investigating, moving, playing a card, a skill test, drawing a chaos token, an enemy, taking damage, the mythos and upkeep phases, ending the turn, undo), a small tip card says in a sentence or two what to do, with an arrow to the thing it is about. One tip at a time, only while nothing plays and the game waits for you; it never covers the middle of the screen or blocks a tap, and it goes when you do what it says, when the moment passes, or with **Got it**. A tip seen once isn't shown again on this device (remembered in local storage under `ah:tips`). The settings screen has **Show tips** (on by default, saved with the other settings) and **Reset tips**, which forgets which tips were seen. **How to play** on the title screen sums the game up in five short parts: the goal, a round, your turn, skill tests, enemies and harm.
- **Sound:** cards slide, snap and flip, the chaos bag rattles and the token clinks, tests chime or thud, enemies growl and strike, clues glint, doom tolls, the phase title swells. A card with a matching trait brings its own sound: firearms fire, blades cut, spells whoosh, tomes turn a page. Each scenario has an ambient bed; a tension track takes over in the enemy phase and when the agenda is one doom from advancing, and a fight track while any enemy is engaged. Sounds play when the event is on screen, so they match the pace, and skipped events are silent. The settings screen has **Music** and **Sound effects** sliders (saved with the other settings) and the top bar a mute button. Browsers keep audio off until the first tap, so a reloaded game starts its music on the first interaction. Every clip is CC0 and listed in `content/sounds/sounds.json` with its source; `check:content` verifies the files, licences and size budgets; `npm run import:sounds` rebuilds `public/sounds/` from the originals (or synthesised placeholders) with ffmpeg.
- **Instruction bar:** whenever you have something to decide, the bar under the top bar shows your portrait and says in plain words what to tap ("Tap a card to commit it to the Intellect test, then Done", "Tap who takes the damage"), with the buttons that answer it right there: **Done**, **Pass**, **Keep hand**, **Redraw**, **Take nothing**, **Resign**, and on your turn **End turn** (it moved here from the action rail). The action rail keeps only Draw, Resource and Investigate. While events play the bar steps aside. When the question is about particular cards (where damage goes, what to commit or discard, which enemy, which location), everything else dims: the map, the hand, the play strip, the piles and the portraits, leaving the things you can tap bright and outlined. Choosing an action on your turn dims nothing.
- **The map:** drag empty table (or any card) to pan, scroll or pinch to zoom. The camera starts on the deciding investigator's location and follows the decision; **Focus** brings it back, **Whole map** zooms out to every location. On your turn, drag your portrait onto a highlighted location to move; **Investigate** is on the action rail beside Draw and Resource, or click your location.
- **Cards:** hover any card to see it twice as large with a details column beside it (enemies list their fight, health, evade, attack and the damage on them); click it to use it (several options open a menu). Your assets, threat area and engaged enemies are in the strip above your hand, where each card's actions sit on it as buttons: **Fight** and **Evade** on an engaged enemy, an asset's ability on the asset. The act, the agenda and the scenario reference card (top left) open a viewer: every act or agenda in order with the current one marked (the backs of the ones still to come stay hidden), or the reference card with both sides and the bag's tokens; the act's **Advance** button sits on the act card itself, in the panel and in the viewer. The chaos bag (top right) lists its tokens.
- **Hand:** move the pointer along the fan and it magnifies like the macOS Dock: the card under the pointer rises most, its neighbours a little. A column beside the raised card lists its class, type, level, cost, traits, slots, skill icons and text. Cards rest at 225×315 px and rise to about 288×403. Each card carries a glance badge hanging over its top edge: up to three chips saying what it is for. First what its play or ability does (the combat, intellect or agility icon for a fight, an investigation or an evade; the damage icon with the amount; health or sanity healed; clues, cards drawn, resources gained), then the skill icons it commits, merged by skill. A weakness shows just the weakness icon, a card the data can't describe has an entry in `src/ui/glance.ts` (or no badge), and hovering a chip names it. Next to the clue stack the hand count shows a card icon with the number of cards held, turning red over the limit of 8; its tooltip gives the limit.
- **Card animations:** every card travels to where it lands. A card you draw rises face down out of your deck pile, then arcs to the middle of the screen, growing and turning face up (several leave the pile one after another). It stays there, large, with "Tap a card to take it to your hand" under it: tap a card or the dark backdrop, or press Space / Enter, and it slides into the fan (the opening hand flies straight in). Up to four cards stand in a row; five to eight shrink into two rows, more shrink further, and the area never scrolls. Hover or focus a card (long press on a touch screen) and the fan's details column appears beside it, on its left for the rightmost card. Searching your deck or picking from your discard pile shows those cards the same way: "Choose one", or "Choose one, or take nothing" with the none option as a link; tap a card to take it. Played cards fly from the fan to your play area, cards from the encounter deck glide onto the map from the middle of the screen, and new locations are dealt face down from the act panel one after another. A location that is revealed (when someone moves in) lifts and turns over once the portrait has arrived. Other investigators' draws fly face down to their token. With the system's reduced-motion setting, cards just appear.
- **Locations:** clues lie on them as a pile of clue tokens with the total. Hover one to see its shroud, clues, victory points, connections, who is there and its text beside it.
- **Feed:** what everyone (and the game) does appears under the chaos bag, newest on top, at most 4 lines, fading out after a while. Routine entries from one choice are merged into one line ("Each investigator drew a card and took 1 resource"). Only the big moments (damage and horror, attacks, spawns, defeats, clues, doom, act and agenda advances) also rise from whoever did them over the map. The middle of the screen shows one thing at a time: drawn cards, an encounter card, the chaos draw, a test result or a phase title wait their turn, and floating text waits for them. While an event plays, the map dims except for the cards and investigators it is about. A new phase shows as a chapter title across the middle of the screen, like a film's, with the round under it; it stays until the lead investigator presses **Continue** (or Space / Enter), and only then does the phase play out. While a phase plays out by itself, a caption under the top bar names each step as it happens ("Doom gathers on the agenda", "Roland draws an encounter card", "Hunters move", "Enemies attack", "Upkeep"), and the camera pans to whoever acts (a hunter as it moves, an enemy as it attacks), then returns to the investigator who decides next. Hunters move one beat at a time instead of sliding while something else plays. The Journal shows each step as a section line. **Journal** (top bar) shows the whole history there, scrollable; click a card thumbnail to open the card, Escape closes it.
- **Skill tests:** one screen takes the table from the commit prompt to the verdict. On the left is what is tested (the enemy, location or card; your portrait for a plain test), in the middle its line ("Fight: Ghoul Minion · fight 2"), on the right the cards placed so far with the icons each adds. Along the bottom a strip adds it up as icons: skill, placed cards, each chaos token, "= total vs difficulty". Tap a card in the fan to place it; it flies across. Changed your mind? Tap a placed card of yours to take it back into your hand, until you press Done. The play strip stays usable above the screen, dimmed to the cards with an ability you can use now, so Physical Training and its kind work mid-test. Helpers at the location commit in turn on the same screen: their placed cards carry their portrait, each player can take back only their own, and the strip counts everyone's (with private hands the hand-off box comes first). Then the draw: one disc per token spills out of the bag, each the size of a real token. Tap one (or press Space / Enter): it flips in place to the token while the others fade, and the token slides into the strip. The token is decided by the game's seeded draw, so the disc you pick doesn't change it. With "Draw chaos tokens by hand" off in settings a single token flips out of the bag by itself. Last the big total, Success or Fail, and Continue (by hand or at the Tap pace; otherwise the screen closes after a short pause).
- **Pace:** the settings screen's **Pace** setting chooses how fast events play. **Normal** is the usual speed, **Slow** keeps every event on screen 1.6 times as long, and **Tap to continue** holds each big event (an encounter card, an attack, a spawn, an enemy moving, a defeat, an act or agenda advance) until you press **Next** in the caption, Space or Enter, or click the card it is about. Damage, clues and doom that follow it play by themselves.
- **Undo:** the **Undo** button (bottom right, or Ctrl/Cmd+Z) takes back your last choices one by one, back to the last moment something hidden came out: a chaos token, a drawn card, an encounter card, a search or a shuffle. Pressing Done reveals the token, so take a mistaken commit back before that.
- **Hits:** when a card hurts an investigator (the Attic's horror, a treachery, an enemy attack), the card glows red and a streak flies from it to their portrait before the numbers change.

## Debugging

The **Debug** panel shows the seed and state, and has these buttons:

- **Bot** answers choices automatically.
- **Download** saves the action log.
- **Load** replays a saved log; games are deterministic, so a log reproduces a game exactly, which makes it useful for bug reports.

In dev builds, the store is also available as `window.__arkham`.

## Sound credits

All sounds are CC0 (public domain), from OpenGameArt:

- [54 casino sound effects cards dice chips](https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips) by Kenney (CC0)
- [80 cc0 rpg sfx](https://opengameart.org/content/80-cc0-rpg-sfx) by rubberduck (CC0)
- [100 cc0 sfx 2](https://opengameart.org/content/100-cc0-sfx-2) by rubberduck (CC0)
- [dark sci fi audio pack](https://opengameart.org/content/dark-sci-fi-audio-pack) by SRG774 (CC0)
- [rpg sound pack](https://opengameart.org/content/rpg-sound-pack) by artisticdude (CC0)
- [gunshot sounds](https://opengameart.org/content/gunshot-sounds) by Tabasco (CC0)
- [20 sword sound effects attacks and clashes](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) by StarNinjas (CC0)
- [80 cc0 creature sfx](https://opengameart.org/content/80-cc0-creature-sfx) by rubberduck (CC0)
- [zombie moans](https://opengameart.org/content/zombie-moans) by Darsycho (CC0)
- [cc0 deep monster roar](https://opengameart.org/content/cc0-deep-monster-roar) by trazzz123 (CC0)
- [ghost breath](https://opengameart.org/content/ghost-breath) by qubodup (CC0)
- [bell dingschimes](https://opengameart.org/content/bell-dingschimes) by PWL (CC0)
- [10 book page flips](https://opengameart.org/content/10-book-page-flips) by StarNinjas (CC0)
- [droning sound effects](https://opengameart.org/content/droning-sound-effects) by bretbernhoft (CC0)
- [87 clickety clips](https://opengameart.org/content/87-clickety-clips) by OwlishMedia (CC0)
- [3 pop sounds](https://opengameart.org/content/3-pop-sounds) by wubitog (CC0)
- [cathedral in the forest ambient loop](https://opengameart.org/content/cathedral-in-the-forest-ambient-loop) by congusbongus (CC0)
- [horde war drums loop](https://opengameart.org/content/horde-war-drums-loop) by William Hector (CC0)

## Icon credits

The icons are the [ArkhamCards](https://github.com/zzorba/ArkhamCards) icon set: fan-drawn versions of Fantasy Flight Games' Arkham Horror: The Card Game symbols. They are not CC0. `content/icons/icons.json` lists the source of every symbol.
