---
name: Arkham Table
description: The Investigator's Casebook. A candlelit card table framed by brass and parchment.
colors:
  gilt-edge: "#c9a95c"
  lamp-glow: "#ffd27a"
  brass-shadow: "#5a4520"
  night-table: "#0d1410"
  walnut-dark: "#1a120b"
  smoked-panel: "rgba(18, 14, 10, 0.88)"
  lacquer-black: "#17120c"
  worn-leather: "#2b241b"
  worn-leather-lit: "#3a3022"
  brass-rule: "#5a4a30"
  brass-rule-dim: "#4a3b22"
  bone-ink: "#eadfc4"
  faded-ink: "#a99c80"
  playable-green: "#7fe08a"
  steady-green: "#6fbf73"
  warning-red: "#e06060"
  attack-red: "#7a1e14"
  attack-ember: "#e0573f"
  parchment: "#e6d9bb"
  parchment-leaf: "#f6edd6"
  parchment-chosen: "#fff6d8"
  parchment-button: "#e9dcb8"
  parchment-rule: "#b69c6a"
  iron-gall: "#2b1d0e"
  sepia-heading: "#3a2410"
  sepia-muted: "#6b5a3c"
  umber-gilt: "#7a5410"
  oxblood: "#a32a2a"
  tip-paper: "#f3e6c4"
  leather-top: "#2e2619"
  leather-bottom: "#1d1710"
  brass-highlight: "#e3c67c"
  brass-low: "#a8863f"
  brass-edge-lit: "#7a6440"
typography:
  display:
    fontFamily: "Teutonic, TeutonicRU, Georgia, serif"
    fontSize: "clamp(28px, 4vw, 44px)"
    fontWeight: 400
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Teutonic, TeutonicRU, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    letterSpacing: "0.02em"
  title:
    fontFamily: "Teutonic, TeutonicRU, Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
    letterSpacing: "0.02em"
  prompt:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "22px"
    lineHeight: 1.3
  body:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "16px"
    lineHeight: 1.4
  ui:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "15px"
  label:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "14px"
    fontFeature: "smcp"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  card: "14px"
  plate: "16px"
  bar: "22px"
  pill: "999px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  xxl: "24px"
components:
  button:
    backgroundColor: "{colors.worn-leather}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  button-hover:
    backgroundColor: "{colors.worn-leather-lit}"
  button-primary:
    backgroundColor: "{colors.brass-shadow}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  button-big:
    padding: "10px 18px"
  rail-button:
    backgroundColor: "{colors.worn-leather}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  instruction-bar:
    backgroundColor: "{colors.leather-top}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.prompt}"
    rounded: "{rounded.bar}"
    padding: "6px 14px 6px 8px"
  phase-chip:
    textColor: "{colors.faded-ink}"
    rounded: "{rounded.xl}"
    padding: "3px 10px"
  phase-chip-current:
    backgroundColor: "{colors.gilt-edge}"
    textColor: "{colors.walnut-dark}"
    rounded: "{rounded.xl}"
    padding: "3px 10px"
  rail-button-primary:
    backgroundColor: "{colors.gilt-edge}"
    textColor: "{colors.walnut-dark}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  hud-plate:
    backgroundColor: "{colors.leather-top}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.plate}"
    padding: "12px 14px"
  modal:
    backgroundColor: "{colors.lacquer-black}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  tip-card:
    backgroundColor: "{colors.tip-paper}"
    textColor: "{colors.iron-gall}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 14px 10px"
  parchment-button:
    backgroundColor: "{colors.parchment-button}"
    textColor: "{colors.iron-gall}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  parchment-button-primary:
    backgroundColor: "{colors.gilt-edge}"
    textColor: "{colors.iron-gall}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  parchment-tile:
    backgroundColor: "{colors.parchment-leaf}"
    textColor: "{colors.iron-gall}"
    rounded: "{rounded.lg}"
  parchment-tile-selected:
    backgroundColor: "{colors.parchment-chosen}"
  select:
    backgroundColor: "#221c14"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.xs}"
    padding: "3px"
---

# Design System: Arkham Table

## Overview

**Creative North Star: "The Investigator's Casebook"**

Arkham Table is a record of a case being worked. Between scenarios the player handles the casebook itself: parchment pages with vine borders, set in a blackletter display face and inked in sepia, where the campaign log, the guide's story and the deck choices are written down. During a scenario the casebook is open on a dark table at night. The real card scans, the cardboard tokens and the rulebook art carry the color, and everything the interface adds is a prop on that table: brass fittings, worn leather, a slip of paper with a note.

The system has two rooms and one material language. The **study** is light: parchment, iron-gall ink, umber gilt. The **table** is dark: night green-black, smoked panels, bone-colored ink and gilt edges. A modal opened over parchment switches back to the table's dark theme, so every dialog reads as an object lifted off the page.

Density is high on the table, because a hot-seat game needs the whole state in view, and calm in the study, where reading comes first. The HUD is made of props on that table, drawn entirely in CSS: worn brown leather with a fine grain, brass bevels, stitching on the large plates, and a brass rail under the top bar. They have weight and material instead of reading as floating software chrome.

Rejected directions: generic dark SaaS, neon or sci-fi glow, cartoon or mobile-game styling, and gore or splatter horror.

**Key Characteristics:**
- Real card scans, tokens and rulebook art are the imagery. The interface never competes with them.
- Two themes from one token set: the dark table and the light parchment study.
- Serif everywhere. Teutonic for names and headings, Alegreya for reading, Georgia for controls.
- HUD chrome is grained brown leather with brass edges. The primary action is the one polished brass plate. Glow is a signal, not decoration.
- Every animation has a reduced-motion fallback.

## Colors

Warm, low-saturation browns and golds on a near-black green table, with paper tones for the study. Two saturated signals, green and red, stand out because nothing else is saturated.

### Primary
- **Gilt Edge** (#c9a95c): the system's accent on the dark table. It is the border of modals, the instruction bar, hand-off boxes and the tip card, the fill of the current phase chip, and the color of headings and emphasised words in prompts.
- **Lamp Glow** (#ffd27a): the lit version of Gilt Edge. It is used only for the thing that is live right now: the current phase's border, filled action pips, the glowing rail button, keyboard focus outlines on HUD tabs, and the faint top highlight inside the instruction bar's frame.
- **Brass Shadow** (#5a4520): the primary button fill on the table, and the button inside a tip card.

### Secondary
- **Umber Gilt** (#7a5410): Gilt Edge's role on parchment. It marks the border and stitching of a selected tile, the current step dot (a 28px pill), keyboard focus on paper, and the chosen language tab.

### Tertiary
- **Playable Green** (#7fe08a): the legal-move ring. A card, portrait, token or mini card the player can act on gets a 3px ring and a soft glow of this color.
- **Attack Red / Attack Ember** (#7a1e14 / #e0573f): an enemy that will attack, shown on its intent badge.
- **Warning Red** (#e06060) and **Oxblood** (#a32a2a): danger buttons and errors on the table and on parchment.
- **Steady Green** (#6fbf73): success text.

### Neutral
- **Night Table** (#0d1410): the page background behind everything.
- **Walnut Dark** (#1a120b): the table under the framed table art, and dark text on gilt.
- **Smoked Panel** (rgba(18, 14, 10, 0.88)): the translucent content panels over the table that are not props, such as the action feed entries, the zoom panel and small count chips.
- **Lacquer Black** (#17120c): solid surfaces like modals and the hand-off box.
- **Worn Leather / lit** (#2b241b / #3a3022): button fill at rest and on hover.
- **Brass Rule / dim** (#5a4a30 / #4a3b22): one-pixel borders on buttons, the top bar and panels.
- **Bone Ink** (#eadfc4): body text on the table. **Faded Ink** (#a99c80): secondary text.
- **Parchment** (#e6d9bb): the study's base under the parchment art. **Parchment Leaf** (#f6edd6, at 80% opacity on the page): sections, tiles and inputs. **Parchment Chosen** (#fff6d8): a selected tile. **Parchment Button** (#e9dcb8). **Parchment Rule** (#b69c6a): borders on paper.
- **Iron Gall** (#2b1d0e): text on parchment. **Sepia Heading** (#3a2410): parchment headings. **Sepia Muted** (#6b5a3c): secondary text on parchment.
- **Tip Paper** (#f3e6c4): the tutorial note.
- **Leather** (#2e2619 to #1d1710): the HUD plates and the top bar, a vertical gradient with a warm speckle grain from an inline SVG noise filter (sRGB, at most 10% strength). The grain stays this faint so Faded Ink keeps 4.5:1 on it.
- **Brass** (#e3c67c to #c9a95c to #a8863f): the primary action's plate on the table, on the title menu and on parchment, and the rail under the top bar. **Brass Edge, lit** (#7a6440): the top border of leather tabs and plates, where light catches the edge.

### Named Rules
**The Earned Glow Rule.** Glow means "act here". Playable Green rings legal targets and Lamp Glow lights the current step. No other element glows.

**The Props Rule.** Chrome is a physical prop: on the table and over the cover it is grained leather with a lit brass top edge and a downward shadow; on parchment it is card stock. Only the primary action is polished brass, one plate per screen; a switched-on toggle or chosen tab is pressed in, never brass. Content panels like the feed and modals keep Lacquer Black.

**The Two Inks Rule.** Theme switches by redefining the same ink, muted, gold and bad variables. Never hard-code table colors inside the study, or study colors on the table.

## Typography

**Display Font:** Teutonic, with TeutonicRU for Cyrillic and Georgia as the fallback.
**Body Font:** Alegreya, with Georgia as the fallback.
**UI Font:** Georgia, with Times New Roman as the fallback.

**Character:** Teutonic is the blackletter of the printed cards, so names on screen look like names on cardboard. Alegreya is a calligraphic book serif for anything read at length: card text, the guide, prompts and tips.

### Hierarchy
- **Display** (400, clamp(28px, 4vw, 44px)): wizard and menu page titles on parchment.
- **Headline** (400, 26px): card names in the card modal, in Gilt Edge.
- **Title** (400, 20px): card names on drawn card faces and stat names.
- **Prompt** (400, 22px, 1.3): the instruction bar, the line that tells the player what to do now.
- **Body** (400, 16px, 1.4): card text, the modal side column, the guide's story and the deck editor.
- **UI** (400, 15px): rail buttons and general controls, inheriting the page's Georgia.
- **Label** (400, 14px, small caps for the round counter): the top bar and ribbon.

### Named Rules
**The Printed Name Rule.** A card, investigator, scenario or encounter name is set in Teutonic, like the printed card. Running text never is.

**The Both Alphabets Rule.** Every display stack lists TeutonicRU right after Teutonic, so Russian names keep the same face.

## Layout

The table is a fixed, full-viewport stage. The WebGL map fills it, and the HUD is pinned around its edges. The top bar runs across the top. A 300px action feed sits on the right, with a 143px column of played cards beside it. The hand fans along the bottom in the DOM, and the instruction bar floats above it. Overlays such as the card showcase, modals and hand-off screens cover the centre on a dark backdrop.

Layout mode is a single switch between desktop and phone. A viewport counts as a phone when it is landscape and at most 500px tall or 900px wide, or portrait and at most 500px wide. Phone mode adds a root class and safe-area insets, shrinks the played-cards strip to 44px cards, and collapses phase names to short forms. Components that compute pixels read the same mode.

The study is a scrolling page on parchment art with centred content, tiles in grids, and a header that stays in reach. Spacing follows a loose 4–6–10–14–18–24px rhythm. Gaps between controls are usually 6px, and panels pad at 14 to 18px.

## Elevation & Depth

Depth comes from shadow and light, like objects on a lamplit table. Panels cast heavy black shadows straight down, overlays sit over a dark scrim, and the only colored light is the earned glow. The study is flatter: paper on paper, with selected tiles lifted by a soft umber glow.

### Shadow Vocabulary
- **Tabletop lift** (`box-shadow: 0 3px 12px #000c`): small floating notes. The instruction bar lifts a little further (`0 4px 14px #000c`) inside its frame rings.
- **HUD plate** (`box-shadow: 0 8px 22px #000c` with the bevel): the investigator panel and the token row.
- **Held object** (`box-shadow: 0 8px 24px #000c`): the tip card and pop-out sheets.
- **Lifted off the page** (`box-shadow: 0 10px 40px #000`): modals.
- **Gilt-framed lift** (`box-shadow: 0 10px 30px #000d, 0 0 0 2px var(--gold)`): a focused large card.
- **Bevel** (`box-shadow: inset 0 1px 0 #c9a95c2e, inset 0 -1px 0 #00000080`): the lit top and shaded bottom of every leather prop.
- **Pressed** (`box-shadow: inset 0 2px 4px #000a` with a 1px drop): a leather tab while pressed.
- **Brass plate** (`box-shadow: inset 0 1px 0 #fff3c4, inset 0 -1px 0 #7a5a20, 0 2px 5px #000a`): the polished primary action.
- **Brass rail** (a 4px gradient from #e3c67c through #a8863f to #5a4520, with `0 3px 8px #000a` below): the edge under the top bar.
- **Token contact** (`box-shadow: 0 1px 3px #000c`): badges and intent chips resting on cards.
- **Playable ring** (`box-shadow: 0 0 0 3px #7fe08a, 0 0 18px #7fe08acc`): a legal target. Use 14px blur for small targets.
- **Current light** (`box-shadow: 0 0 10px #c9a95c88`): the current phase chip.
- **Chosen page** (`box-shadow: 0 0 0 1px #c9a95c, inset 0 1px 0 #fff, 0 6px 14px #7a541055` with a 2px dashed `#7a5410a0` stitch at -7px): a selected wizard tile on parchment. Campaign rows and deck rows keep the plain glow `0 0 14px #7a541066`.
- **Paper card** (`box-shadow: inset 0 1px 0 #fffaf0, 0 1px 0 #b69c6a66, 0 3px 6px #5a452030`): a wizard tile at rest; it lifts 2px with a deeper shadow on hover.

### Named Rules
**The Lamplight Rule.** Cast shadows are black and fall downward. Colored light exists only as the earned glow. A 1px inset edge in brass or gilt is a bevel on the material, not a shadow.

## Shapes

Corners are softened but never bubbly, like the die-cut corners of the cards. Small controls use 6px, panels and tiles 10 to 12px, cards and modals 14px. Round shapes are reserved for tokens, pips and portraits, the cardboard pieces of the game. HUD plates use 14 to 16px. The instruction bar is the one long pill, at 22px. Borders are one pixel of Brass Rule or Parchment Rule, lit on the top edge for leather props. Modals and the hand-off box get a one-pixel Gilt Edge, and the instruction bar a 2px gilt frame.

## Components

### Buttons
Worn and solid, like a leather-bound case with brass fittings.
- **Shape:** gently rounded (6px).
- **Default:** Worn Leather fill, Bone Ink text, a one-pixel Brass Rule border, 5px 10px padding.
- **Hover:** the fill lightens to Worn Leather lit and the border turns Gilt Edge.
- **Primary:** Brass Shadow fill with a Gilt Edge border.
- **Big:** 1.15rem text with 10px 18px padding, for the main call on a screen.
- **Danger:** Warning Red border and text.
- **Disabled:** 50% opacity, no pointer.
- **HUD tabs:** on the table and on the title menu over the cover art, the top bar buttons, the title menu buttons, the action rail, the camera buttons and Undo are leather tabs: grained Worn Leather, a Brass Rule border with a lit top edge, a bevel and a short drop shadow. Hover lightens the leather and gilds the border. Pressing sinks the tab 1px. Focus shows a 2px Lamp Glow outline.
- **HUD toggle on:** a top bar button that is switched on, such as an open Journal, is a tab pressed into the bar: lit leather, a Gilt Edge border and an inset shadow.
- **HUD primary:** the one polished brass plate, with Walnut Dark text and glyphs. The suggested-action glow replaces its shadow while it pulses.
- **On parchment:** Parchment Button fill with an Iron Gall label. Hover turns the border Umber Gilt. Primary is the brass plate with a Brass Shadow border; disabled, it is an unfilled stamp with a dashed border. Footer secondaries (Back) are card stock: a pale paper gradient with a lit top edge.
- **Language tabs:** at the top right of every screen, and first in the top bar during a game: a leather strip with one 44px tab per language, labelled EN and RU and named in its own language for screen readers. The chosen tab is pressed in (lit leather, gilt ring). On parchment the strip is Parchment Leaf with a Parchment Rule border, the chosen tab Umber Gilt with Parchment Leaf text, and it scrolls away with the page. In the phone top bar it is a single tab that steps to the next language.
- **Chips on parchment:** a chosen filter chip or tab is an inked stamp: Sepia Heading fill with Parchment Leaf text.

### Chips
- **Phase chip:** a 12px-radius chip in Faded Ink. Done phases dim, skipped ones are struck through, and the current one fills with Gilt Edge, takes a Lamp Glow border and glows softly.
- **Intent badge:** a 10px-radius badge in bold 12px sans-serif. Attack is Attack Red with an ember border, Hunt is dark amber, and Rest is grey.

### Cards / Containers
- **Corner Style:** 14px for modals and the hand-off box, 10–12px for tiles and side panels.
- **Background:** grained leather for HUD plates (the investigator panel and token row), with a 2px dashed gilt stitch 7px inside the edge. Lacquer Black for dialogs, Parchment Leaf in the study.
- **Shadow Strategy:** see Elevation & Depth.
- **Border:** one pixel of Gilt Edge for modals and the hand-off box. Brass Rule with a lit top edge on HUD plates.
- **Internal Padding:** 18px for modals, 24px for the hand-off box.

### Inputs / Fields
- **Select:** a 4px-radius field with a dark fill, Bone Ink text and a Brass Rule border.
- **On parchment:** inputs and selects take the Parchment Leaf fill and a Parchment Rule border.

### Navigation
- **Top bar:** a band of grained leather resting on a 4px brass rail, with 14px text. Finished and skipped phases keep Faded Ink on the leather. The chaos bag in the phone top bar stays a bare icon, not a tab. It holds the round ribbon: the scenario, the round in small caps, the four phases as chips joined by › separators, and each investigator's turn with action pips.
- **Action rail:** a stack of leather tabs at 10px radius. The primary action is a brass plate. The suggested action glows with Lamp Glow and pulses unless reduced motion is on.

### Instruction Bar
The signature component, a brass-framed leather plaque telling the player what to do now. It is a grained leather pill with a 2px Gilt Edge frame, a thin Brass Shadow ring outside it and a dark ring inside, and 22px Alegreya text in Bone Ink. Investigator names are set in Teutonic and key words in Gilt Edge. Its main answer is the brass plate.

### Tip Card
A slip of paper laid on the table: Tip Paper fill, Iron Gall text, a two-pixel Gilt Edge border, 12px corners and a held-object shadow. An arrow points at the thing it explains, and a small Brass Shadow button closes it.

### Hand-off Screen
Hides the table between hot-seat turns. A 93% black scrim carries a centred Lacquer Black box with a Gilt Edge border.

## Do's and Don'ts

### Do:
- **Do** let card scans, tokens and rulebook art carry the color. Interface surfaces stay within Night Table, Smoked Panel, Lacquer Black, the leather and brass of the props, and the parchment tones.
- **Do** set every card, investigator and scenario name in Teutonic with TeutonicRU, and read-at-length text in Alegreya.
- **Do** mark legal targets with the Playable Green ring (3px plus glow) and the current step with Lamp Glow, and nothing else.
- **Do** switch themes by redefining the ink, muted, gold and bad variables, as the parchment and its modals do.
- **Do** give every animation a reduced-motion fallback that places the result instantly.
- **Do** build table chrome as props in CSS: grained leather, a lit brass top edge, a bevel and a shadow that falls downward. Stitch the large plates.
- **Do** keep a single brass plate per screen, for the primary action. Toggles and chosen tabs are pressed in instead.
- **Do** keep every menu screen inside the painted frame: wizard and catalog pad by the frame insets (`clamp(20px, max(6vh, 3.2vw), 64px)` vertical, `clamp(16px, 3.4vw, 56px)` horizontal), and headings stop short of the language tabs.

### Don't:
- **Don't** use flat grey panels, sans-serif UI or blue accents. Generic dark SaaS styling is rejected.
- **Don't** use neon or sci-fi glow, saturated cyan or purple, glassmorphism or holographic effects.
- **Don't** use cartoon or mobile-game styling: bouncy chunky buttons, bright gradients or loot-box sparkle.
- **Don't** decorate with gore, blood drips, splatter or grunge textures.
- **Don't** add glow, colored cast shadows or pulsing to anything that is not the current step or a legal move.
- **Don't** use pure white or pure black as broad surfaces. Pure black is only for shadows and scrims.
