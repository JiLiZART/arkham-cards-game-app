## Context

The title is `src/ui/menu/Title.tsx` with a gear button top right; screens route in `App.tsx`. Campaign tiles (`NewGame.tsx`, `CampaignStep`) show the reference card scan and the first scenario's intro, which for generated campaigns is only available after `loadCampaign`. The rulebook PDF holds 64 large images: the cover (1170×1495, logo printed in) and a logo-free crop of the same painting, three parchment pages, five class parchments, and spot paintings with torn edges and separate masks. ArkhamCards' guides hold a prologue story step for all 21 official campaigns in English and Russian.

## Goals / Non-Goals

**Goals:** a painted title, parchment menus, Settings as an item, tiles that say what each campaign is.

**Non-Goals:** per-class screens (they come with the investigator and catalog changes, which can reuse the class parchments); animation; new fonts.

## Decisions

1. **`scripts/import-art.ts`** runs `pdfimages` on the rulebook, picks images by page and object number (a table in the script: cover crop, parchment, five class pages), applies their soft masks, writes `public/art/<name>.webp` (title painting at 1600 px wide, parchment at 1200) and `content/art/art.json` (name → page, object, size). Reproducible; outputs committed; `inspired/` never read at runtime.
2. **Title:** a full-screen `background-image` with a dark gradient over it (`linear-gradient(#000a, #000c)`), `object-fit: cover` behaviour via `background-size: cover`; on the phone layout the painting crops to its centre. Preloaded with `<link rel="preload">` in `index.html` so it doesn't flash; the first screen still waits only for the sprite.
3. **Parchment:** one CSS class `.screen.parchment` for wizard, settings, how-to and log; text colours switch to dark ink on light parchment, so the menu styles gain a light variant. Buttons keep their current look.
4. **Settings item:** a `big` button after How to play; the gear and its CSS go.
5. **Description:** a campaign's own prologue in the guides is an epigraph (a Lovecraft or Chambers quotation) for 17 of 21 campaigns; the story is in the first scenario. The Russian campaign guide PDFs (`документы/*.pdf`) open the same way: the epigraph, then "X is a campaign for 1-4 players. It consists of the following scenarios", a list. So the tile shows the prologue (the epigraph, or the prose when the campaign has one) and the scenario names as a list, both in the game's language. `import-campaigns` writes `prologue` and `scenarioNames` into each generated `campaign.json` (eager, about 1 KB each); `import-i18n` writes them per locale into the eager campaign text; Night of the Zealot gets both by hand in its `campaign.json` and the text import. `blurb(prologue)` (pure) cleans the markup and splits the first paragraph from the rest; "More" opens the rest and the scenario list. Side scenarios have no prologue and show their intro.
6. **Tile layout:** card art left at 160 px, text right; the grid becomes two columns on wide screens, one on the phone.

## Risks / Trade-offs

- [Fantasy Flight art in the repository] → same personal-use footing as the card scans; the manifest names the source.
- [Contrast of light text on a busy painting] → the gradient overlay; checked in screenshots at desktop and phone sizes.
- [Eager prologue text grows the first load] → about 30 KB per locale; measured and noted.

## Migration Plan

Additive; no saved data changes.

## Open Questions

None.
