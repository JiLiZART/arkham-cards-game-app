---
name: Arkham Table
description: Arkham at night, seen through a 1920s case file. A cold teal dark where the card scans are the only warm things.
colors:
  night: "#0d1317"
  abyss: "#070c0e"
  panel: "rgba(11, 17, 20, 0.9)"
  bone-ink: "#f1efe4"
  fog: "#9fb0b0"
  accent-teal: "#6fa9a0"
  plate-enamel: "#1d4f4b"
  ironwork: "#c9c6b8"
  rule: "#33474b"
  rule-dim: "#22323a"
  edge-lit: "#4d6a6c"
  slate: "#16232a"
  slate-lit: "#1e3038"
  lamp: "#ffd27a"
  playable: "#7fe08a"
  ok: "#6fbf73"
  bad: "#e06060"
  oxblood: "#a32a2a"
  paper-leaf: "#ebe6d8"
  paper-chosen: "#f5f1e6"
  paper-button: "#ddd6c4"
  paper-rule: "#9b9584"
  paper-accent: "#1f5752"
  paper-ink: "#10171b"
  paper-muted: "#4a5257"
  tip-paper: "#ece6d6"
typography:
  display:
    fontFamily: "Prata, EB Garamond, Georgia, serif"
    fontSize: "clamp(44px, 7vw, 76px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Prata, EB Garamond, Georgia, serif"
    fontSize: "clamp(28px, 4vw, 44px)"
    fontWeight: 400
    letterSpacing: "0.03em"
  title:
    fontFamily: "Prata, EB Garamond, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
  body:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.3
  instruction:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "EB Garamond, Georgia, serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.14em"
  name:
    fontFamily: "Teutonic, TeutonicRU, Georgia, serif"
    fontWeight: 400
rounded:
  select: "6px"
  tab: "10px"
  note: "12px"
  cartouche: "22px"
  oval: "999px"
spacing:
  gap: "8px"
  touch: "44px"
  frame-x: "clamp(16px, 3.4vw, 56px)"
  frame-y: "clamp(20px, max(6vh, 3.2vw), 64px)"
components:
  button-primary:
    backgroundColor: "{colors.plate-enamel}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.tab}"
  button-tab:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.tab}"
    padding: "6px 10px"
  button-tab-hover:
    backgroundColor: "{colors.slate-lit}"
  button-title:
    backgroundColor: "{colors.abyss}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.oval}"
  button-title-primary:
    backgroundColor: "{colors.plate-enamel}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.oval}"
  chip:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.bone-ink}"
    rounded: "{rounded.oval}"
    padding: "6px 12px"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.plate-enamel}"
    textColor: "{colors.bone-ink}"
  chip-on-paper:
    backgroundColor: "{colors.paper-ink}"
    textColor: "{colors.paper-leaf}"
  paper-note:
    backgroundColor: "{colors.paper-leaf}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.note}"
  paper-note-chosen:
    backgroundColor: "{colors.paper-chosen}"
    textColor: "{colors.paper-ink}"
  instruction-cartouche:
    backgroundColor: "{colors.night}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.instruction}"
    rounded: "{rounded.cartouche}"
    padding: "6px 14px 6px 8px"
---

# Design System: Arkham Table

## Overview

**Creative North Star: "Arkham at Night, Through a Case File"**

The table and every menu sit in a cold teal night: a dark baize, bone ink, fog-grey secondary text, and thin ironwork hairlines that end in a curl. Card scans are the only warm things on screen; the chrome around them stays cool and quiet so the cards carry the color. The look is inspired by arkhamhorror.com without borrowing its logo, ornament art or imagery. This is a fan project and must never look official.

Between scenarios the player handles the case file. Menus are night ground. What you would write down (tiles, sheets, the campaign log, settings, the rules) sits on warm off-white paper notes with dark ink. A chosen tile gets a paperclip, and a chosen chip on paper is an inked stamp. On the table, the instruction bar is an ironwork cartouche that holds the current answer, and one teal enamel plate per screen marks the way on.

Density follows the game. The HUD is compact and reads at a glance, menus read like a ledger, and both work at desktop and phone-landscape sizes in Russian and English. Rejected outright: leather, brass and gold props, parchment page grounds, blue SaaS dark themes, neon, glass, gore and grunge.

**Key Characteristics:**
- Cold teal night ground; card scans are the only warm color.
- Bone ironwork hairlines with curled ends instead of frames and props.
- Paper notes hold what you'd write down; the night holds everything else.
- One teal enamel plate per screen for the primary action.
- Two earned glows: lamp gold for the current step, Playable Green for legal moves.
- Prata capitals for titles over EB Garamond; Teutonic for names.

## Colors

A low-chroma teal night with one muted teal accent, bone ink, and a warm paper set that is only used inside paper notes.

### Primary
- **Teal Enamel Plate** (plate-enamel): the fill of the one primary action per screen (rail primary, desk footer "next", the title's primary oval). Lit as a vertical gradient from #2a6b65 to the base, #32807a to #225c57 on hover, edged in translucent ironwork.
- **Muted Teal** (accent-teal): chrome state on the night: the chosen tab, the current wizard dot, hover borders, focus outlines. It is never a fill for large areas.

### Secondary
- **Lamp Gold** (lamp): only the current step and its hover glow (the rail button that answers the prompt).
- **Playable Green** (playable): only the ring around a legal target (`--ring-playable`, `--ring-playable-sm`).

### Tertiary
- **Paper Teal** (paper-accent): the accent inside a paper note: hover border, chosen border, focus outline.
- **Oxblood** (oxblood): the danger color inside a paper note; on the night it is the softer red (bad).

### Neutral
- **Night** (night): the page and table ground. The baize raster (public/table/table-bg.jpg) is generated procedurally between #081316 and #24464a with two bone hairline frames.
- **Abyss** (abyss): the deepest well behind scrims and the title's oval buttons.
- **Smoked Panel** (panel): dialogs and floating panels over the table.
- **Bone Ink** (bone-ink): all primary text on the night.
- **Fog** (fog): secondary text, finished phases, hints.
- **Ironwork** (ironwork): hairlines, curls and cartouche caps, usually at 40-75% opacity.
- **Rule / Rule Dim / Edge Lit** (rule, rule-dim, edge-lit): control borders, dividers and the lit top edge of a tab.
- **Slate / Slate Lit** (slate, slate-lit): control fills on the night (`--ctl-bg`, `--ctl-bg-on`).
- **Paper set** (paper-leaf, paper-chosen, paper-button, paper-rule, paper-ink, paper-muted): the leaf, the chosen leaf, control fill, dotted ledger rule, ink and secondary ink of a paper note. Tooltips use tip-paper.

### Named Rules
**The Warm Cards Rule.** Card scans are the only warm color on the table. Chrome stays in the teal-bone range; warm paper appears only as paper notes in the menus and as tooltips.

**The Earned Glow Rule.** Lamp gold means "the current step" and Playable Green means "a legal move". Neither is decoration, and the glow outranks the plate when both apply.

**The Paper Note Rule.** Inside a paper note the semantic tokens (`--ink`, `--muted`, `--accent`, `--bad`, `--ctl-bg`, `--ctl-bg-on`, `--ctl-line`) switch to the paper set, so components need no paper variant. The scope is one list in the stylesheet; add new note surfaces to that list.

## Typography

**Display Font:** Prata (with EB Garamond, Georgia)
**Body Font:** EB Garamond (with Georgia)
**Name Font:** Teutonic / TeutonicRU, for card, investigator and scenario names

**Character:** Prata's high-contrast capitals read as an engraved case-file heading; EB Garamond is a calm book face for everything read and every control. Teutonic marks proper names as belonging to the game's world.

### Hierarchy
- **Display** (Prata 400, clamp(44px, 7vw, 76px), 1): the title screen's ARKHAM TABLE in uppercase. Phase cards (76px), skill test results (110px total, 54px board result) use the same face.
- **Headline** (Prata 400, clamp(28px, 4vw, 44px), uppercase, 0.03em): desk screen titles.
- **Title** (Prata 400, 22-30px): settings legends, panel and dialog headings, how-to section heads.
- **Body** (EB Garamond 400, 18px/1.3): ledger rows, notes and HUD text; hints at 15px/1.35. The instruction cartouche is set at 22px/1.3.
- **Label** (EB Garamond 500, 19px, 0.14em, uppercase): the title screen's oval buttons only.
- **Name** (Teutonic 400): names inside running text and on tiles, sized relative to the surrounding text.

### Named Rules
**The Name Face Rule.** Teutonic is for names and nothing else. Alegreya stays inside card faces; Caveat and TT2020 appear only where campaign-guide markup asks for `<fancy>` or `<typewriter>`.

## Layout

Menus share one desk shell with insets that scale with the window (frame-x, frame-y), a heading with an ironwork rule under it, and a footer with an ironwork rule above it. The language tabs sit in the top-right corner, so desk headings stop short of them (`padding-right: min(112px, 30vw)`). Settings is one narrow paper leaf (max 640px) of ledger rows with the control on the right. How to play is one continuous paper page at reading measure (max 760px). The catalog fills the window and only its list scrolls.

On the table, the top bar is a dark band with a double ironwork rule under it. The instruction cartouche sits at the bottom centre, just above the hand fan, and the rail tabs sit at the right. The viewer's cards in play form a row at the bottom left, over the stat dock: full-size cards that overlap rather than wrap or scroll, the hovered one in front, token badges at the top left; the threat area and engaged enemies keep the column at the right. Controls keep a 44px minimum touch height and an 8px gap. Phone landscape (max-height 500px) compresses titles and puts the title buttons in two columns.

**The Bar Top Rule.** Anything that has to sit above the instruction cartouche reads its measured top edge from `--bar-top` (set by the HUD, since the cartouche wraps): the mulligan row, the skill test's calculation strip, and the height of the test's subject card. Nothing sits under the cartouche.

## Elevation & Depth

Depth comes from material, not floating cards. Bands and tabs are lacquered night-slate gradients with a faint cool grain (`--grain`) and a one-pixel bevel: a bone highlight on top and a black line underneath. Things that sit on the night cast short, dark drop shadows. Pressed states sink with an inset shadow and a 1px shift. Paper notes lift on hover (translateY(-2px), deeper shadow). Glows are reserved for the two earned states.

### Shadow Vocabulary
- **Bevel** (`inset 0 1px 0 #c9c6b81f, inset 0 -1px 0 #00000080`): every tab and band.
- **Tab drop** (`0 2px 4px #000a`): rail, top-bar and footer tabs at rest.
- **Pressed** (`inset 0 2px 4px #000a`): active tabs and toggles that are on.
- **Band lift** (`0 8px 22px #000c`): stat bar and token row.
- **Note lift** (`inset 0 1px 0 #fffdf6, 0 2px 0 #00000040, 0 6px 14px #000a`): paper tiles at rest; `0 10px 20px #000c` on hover.
- **Lamp glow** (`0 0 0 1px var(--lamp), 0 0 16px 4px #ffd27a99`, pulsing 1.6s): the current step.
- **Playable ring** (`0 0 0 3px var(--playable), 0 0 18px #7fe08acc`): a legal target.

### Named Rules
**The Ironwork Rule.** Structure is drawn with bone hairlines that end in a curl (`--curl`, `--curl-r`): under the top bar, under desk headings, over desk footers, under the title. `--cap` closes the instruction cartouche and the title's primary oval. No brass, gilt or leather borders stand in for them.

## Shapes

Shapes are soft but not bubbly. Tabs and buttons use a 10px radius, paper notes 12px, the instruction cartouche 22px, and chips and title buttons are full ovals (999px). Borders are one pixel (two on chips): ironwork or rule on the night, paper-rule on paper, dotted for ledger rows. A disabled primary keeps its place as a dashed outline. The paperclip (a 14x38 stroked SVG at the top right of a chosen tile) is the only object prop.

## Components

### Buttons
Lacquered tabs on the night and one enamel plate.
- **Shape:** gently rounded (10px); title-screen buttons are hairline ovals (999px).
- **Primary:** the teal enamel plate with a bone edge (#c9c6b899) and a bone top highlight. One per screen. On the title screen it is a filled oval closed by ironwork caps on both sides.
- **Tab (secondary):** the slate gradient, a rule border with a lit top edge, a bevel and a tab drop. Hover lightens the gradient and turns the border muted teal; active sinks 1px.
- **Toggle on:** a tab pressed into the bar (inset shadow, teal border).
- **Focus:** a 2px muted teal outline, offset 2px (3px on the title).
- **Disabled primary on the desk:** transparent, fog text, dashed edge-lit border.

### Chips
- **Style:** an oval with a 44px minimum height, `--ctl-bg` fill and a 2px `--ctl-line` border, so the night or paper colors follow from where the chip sits.
- **State:** chosen on the night is the teal plate with a muted teal border; chosen on paper is an inked stamp (paper-ink fill, paper-leaf text). Class chips keep a pressed well because their icons are colored.

### Cards / Containers
- **Paper notes:** a paper-leaf gradient, a paper-rule border, 12px corners and the note lift. Hover lifts 2px with a paper-teal border. Chosen notes take the paper-chosen leaf, a 2px teal ring and the paperclip.
- **Night panels:** the smoked panel with a rule border and a dark drop; stat bar and token row add an inner ironwork outline inset 5-6px.

### Inputs / Fields
- **Style:** checkboxes are 22px with an accent-color of the local accent; selects are 6px rounded and inherit the body face; range sliders are flexible up to 220px with tabular numerals.
- **Focus:** a 2px accent outline, offset 2px.

### Navigation
- **Top bar:** a grained night band with a bevel, a double ironwork rule underneath ending in curls, and a soft shadow below. Finished and skipped phases stay fog; the current phase is a teal chip.
- **Wizard dots:** 12px hairline rings; done ones fill with fog, and the current one stretches into a 28px teal pill.

### Instruction Cartouche (signature)
The prompt and its answer share one night pill in a double bone rule (`1px #c9c6b88c` border plus 3px and 4px inset rings), closed at each end by the ironwork `--cap`. The answer sits inside the cartouche, not beside it. It is set in EB Garamond at 22px, with names in Teutonic.

### Icons
The UI uses an authored stroke icon set (`UiIcon`): 24x24 viewBox, `currentColor`, 1.8 stroke, round caps and joins. Game symbols come from the card icon sprite.

## Do's and Don'ts

### Do:
- **Do** keep chrome in the teal-bone range so card scans stay the only warm things (The Warm Cards Rule).
- **Do** give each screen exactly one teal enamel plate for the primary action.
- **Do** use lamp gold only for the current step and Playable Green only for legal moves (The Earned Glow Rule).
- **Do** draw structure with ironwork hairlines that end in a curl, and close cartouches and the title's primary oval with `--cap`.
- **Do** put what a player would write down on a paper note by adding it to the paper-note scope, and keep everything else on the night.
- **Do** set screen titles in uppercase Prata, everything read and every control in EB Garamond, and names in Teutonic.
- **Do** place anything above the instruction cartouche from `--bar-top`.
- **Do** draw icons as `UiIcon` strokes (1.8, round caps, currentColor).

### Don't:
- **Don't** use leather, brass or gold props, or parchment page grounds.
- **Don't** drift into a blue SaaS dark theme, neon, glass, or gore and grunge textures.
- **Don't** copy arkhamhorror.com's logo, ornament art or imagery, or anything that makes the app look official.
- **Don't** use Unicode glyphs or emoji as icons.
- **Don't** use colored side stripes on cards, notes or panels.
- **Don't** use a second filled primary on the same screen; secondary actions are tabs or hairline ovals.
