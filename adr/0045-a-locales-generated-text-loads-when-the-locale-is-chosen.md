# ADR-0045: A locale's generated text loads when the locale is chosen

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

A locale is a folder under `content/i18n/`, and `src/content/index.ts` bundles every locale's `cards.generated.json`, `campaigns.generated.json` and `ui.generated.json` into the first load: about 200 KB raw each. With two locales that is noise; with eleven it is 1.8 MB raw on a main chunk of 1.9 MB, for text nine of ten players never read. The other heavy locale files already load late: a pack's card text with the pack (`loadPack`), a generated campaign's text with the campaign (ADR-0007). When does the rest of a locale's text load, and what must be in the first load for the locale to exist at all?

## Considered Options

- Keep every locale's hand-written files (`ui.json`, `cards.json`, `cards.print.json`) eager and load its generated text on demand: `loadLocale(l)` awaited for the start locale before the first screen and in `setLocale` before the switch.
- Keep everything eager and accept the size.
- One Vite chunk per locale by manual chunking, loaded by the same triggers.
- Put the locale list in a constant and load whole locale folders lazily, hand-written files included.

## Decision Outcome

Chosen option: "hand-written files eager, generated text on demand", because the hand-written files are small and are what makes a locale exist (`locales(db)` is the folders; `lang.name` names the picker's options), while the generated text is large, derivable and only needed once a locale is chosen. It is the pattern packs and campaign texts already use, with their tests and error handling. Manual chunking would load the same bytes with less control; a constant list would be a second place that says which locales there are.

### Consequences

- Good, because the first load does not grow with the locale count: a new locale costs one `ui.json` with one key in the bundle.
- Good, because the loading triggers are two, both already awaited for packs: app start and the language switch.
- Bad, because the first switch to a locale waits for a fetch (~40 KB gzipped), and a failed fetch leaves the locale in English per string, reported like a failed pack.
- Bad, because a test that reads a locale's generated text in the browser build must load it first; Node's `loadContentFromDisk` keeps loading everything.
- Follow-up: `cards.print.json` (Russian, 183 entries) stays eager because it is hand-matched; if print texts appear for a large locale, they move to the same lazy set.
