# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 reviewed; ADR-0019 is superseded by ADR-0020, the rest are in force.

- ADR-0006 card data and text from the vendored snapshot: kept; every locale's card text comes from `translations/<source>` through the same import, generated files never edited.
- ADR-0007 scenarios generated from the campaign guides: kept; a locale's campaign text is the guide's, loaded with the campaign; the lazy-loading pattern it set is what ADR-0045 extends to the locale's core text.
- ADR-0008 catalog images from the arkham.build CDN: kept; no locale but `ru` has scans, every other locale shows the English scans.
- ADR-0012 completeness measured and committed: kept; `coverage.json` measures behaviour, translation coverage is printed by `check:content` per locale and not committed.
- ADR-0005 one layout mode, ADR-0016 components own their styles: kept; one `LangSwitch` select in both layouts, styled by its CSS Module; the `:lang()` font stacks are tokens in `styles.css`.
- ADR-0004 viewing is view state: kept; the locale stays a device setting, not game state, as online-play already requires.
- ADR-0001 to 0003, 0009 to 0011, 0013 to 0015, 0017 to 0036: unaffected.

## New Durable ADRs Created

- `adr/0045-a-locales-generated-text-loads-when-the-locale-is-chosen.md`: a locale's hand-written files ship in the first load and make the locale exist; its generated text is fetched for the start locale and on a switch, as packs and campaign texts are.
- `adr/0046-locales-beyond-the-maintained-two-carry-imported-text-only.md`: `en` and `ru` are the maintained locales whose UI strings are hand-written and required complete; every other locale holds imported text and its endonym only, falls back to English per string, and is reported rather than failed by `check:content`.
