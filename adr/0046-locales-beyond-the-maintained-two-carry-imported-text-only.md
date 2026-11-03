# ADR-0046: Locales beyond the maintained two carry imported text only

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

English and Russian have every UI string written by hand (1,011 keys; `check:content` requires the 120 prompt, instruction, tip and How-to-play keys in every locale). The vendored sources hold card text, campaign text and about 160 matching UI labels for nine more languages, and nothing for the other 850 UI keys. The user's rule is that a locale exists only where real translations exist and that nothing is translated by machine. So a locale with every source it can have still fails `check:content`, and a contributor adding a UI string would face eleven files. Which locales must be complete, who writes what in the others, and what does the check require?

## Considered Options

- Two maintained locales, `en` and `ru`, whose UI strings are hand-written and required complete; every other locale holds only what the import writes plus its endonym (`lang.name`), falls back to English per string, and is checked for its endonym and reported, not failed, for the rest.
- Require the needed keys in every locale and fill the gaps by machine translation.
- Require nothing anywhere; report only.
- Mark completeness per locale in its `ui.json` and let the check read the mark.

## Decision Outcome

Chosen option: "two maintained locales, the rest import-only", because it is the only one that keeps the user's rule (no invented text) and the existing guarantee (a prompt in the maintained locales always has its instruction). A mark inside `ui.json` says the same thing in eleven files instead of one constant beside the rule it governs. Reporting only would let a Russian prompt lose its instruction unnoticed.

### Consequences

- Good, because a new UI string is still written in `en` and `ru` only (AGENTS.md's rule stands); the other locales pick up a translation when a source gains one and `import:i18n --all` is rerun.
- Good, because a locale's state is visible: `check:content` prints its UI keys from a source and its per-cycle card coverage.
- Bad, because players of the nine locales read cards and story in their language and the bar, feed and prompts in English; the proposal says so and the picker promises no more.
- Bad, because promoting a locale to maintained is a decision (add it to the constant and write ~850 keys), not a gradual drift.
- Follow-up: a locale whose community `.po` grows to cover the needed keys can be promoted by adding it to the maintained list; nothing else changes.
