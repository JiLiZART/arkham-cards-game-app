# ADR-0085: Story paintings come from a manifest of the guide editions, with the agenda painting as fallback

- Status: proposed
- Date: 2026-11-09

## Context and Problem Statement

The story reader (ADR-0084) shows a painting on every page, for every scenario of 37 campaigns. The fan CYOA editions of the campaign guides (`inspired/AHC_CYOA-main/`, untracked) carry one 300 dpi painting per scenario page, with a fog edge bleeding to the white page, but which page belongs to which scenario is only known by reading them. Every scenario also has agenda cards whose scans the app already ships or proxies (ADR-0008). Rulebook art is already extracted by a script into `public/art/` with a provenance manifest (`scripts/import-art.ts`, `content/art/art.json`). The app must never look official (PRODUCT.md).

## Considered Options

- A hand-written manifest mapping guide-edition pages to scenarios, extracted by the existing art script with the white margin keyed to transparency; the scenario's first agenda's painting, cropped from its scan, where no mapping exists; the campaign's first scenario's painting last.
- Agenda paintings only.
- Guide-edition paintings only, every campaign mapped before the reader ships.
- Campaign cover images.

## Decision Outcome

Chosen option: "a manifest of guide-edition paintings with the agenda painting as fallback", because every scenario has a painting from the first day through its agenda, the guide editions' paintings replace them one campaign at a time as content work, and the extraction reuses the existing script and its provenance manifest.

### Consequences

- Good, because a newly imported campaign is never without art, and mapping one is a content change of a few manifest lines plus a script run.
- Good, because each extracted painting records its source file and page.
- Bad, because agenda crops depend on the card layout of each cycle and must be checked per cycle.
- Bad, because the keyed white margin can bite into light areas of a painting; each mapped painting is looked at when added.
- Bad, because the covers in the guide editions carry the publisher's lettering and are not used until they are cropped.
