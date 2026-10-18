## Context

`.intro-overlay` is `position: fixed; inset: 0; display: flex; align-items: center` and `.intro-box` a flex column with `gap` and `padding` but no height limit; `.intro-text` has `max-width: 460px` and no height limit; `.intro-card` is `clamp(300px, 34vw, 620px)` wide with the card's aspect ratio. Below 900 px the body stacks the card above the text. The intro text is set with `white-space: pre-line`; the import's `plain()` strips only `<b>`, `<i>`, `<u>`, `<em>`, `<strong>`.

## Goals / Non-Goals

**Goals:** Continue always reachable; long text readable by scrolling; the guide's markup shown as styled text.

**Non-Goals:** redesigning the introduction; the guide's images and maps.

## Decisions

1. **Box bounded by the viewport:** `.intro-box { max-height: 100dvh; }` with the overlay's safe-area padding; `.intro-body { min-height: 0; }` so the flex column can shrink; `.intro-text { overflow-y: auto; max-height: ... }` lets the text take what is left after the title and the buttons (flex `1 1 auto; min-height: 0` in the column layout; in the row layout the text column gets `max-height: calc(100dvh - 180px)`). On short screens (height ≤ 500 px) the card width becomes `min(34vw, 48dvh * 88/63)` so the card never takes the whole height.
2. **Scroll fade:** a `scrolled-to-end` state on the text element (`onScroll` and a ResizeObserver, pure helper `moreBelow(el)` tested) toggles a CSS mask at the bottom edge; no library.
3. **Markup rendered, not stripped:** `src/ui/guideText.ts` exports `guideHtml(text)`: it escapes the text, then turns a whitelist of the guide's tags into elements with classes (`fancy`, `typewriter`, `innsmouth`, `game`, `smallcaps` as spans; `center`, `right`, `blockquote` as blocks; `i`, `b`, `strike`), keeps line breaks, and drops any other tag, keeping its text. Nesting (`<center><fancy>…</fancy></center>`) works because both are converted independently and balanced tags are required (an unbalanced tag is dropped). It also handles the card markup `formatText` handles (`[icon]`, `[[Trait]]`) by delegating to it for the text runs. Tests cover each tag, nesting, unknown tags, escaping (no HTML injection from content) and Russian text. The intro, the resolution screen and the campaign tile's text use it.
4. **Fonts:** Caveat (OFL), TT2020 Style E (OFL) and About Dead are copied from `inspired/ArkhamCards/assets` into `public/fonts` by `extract-assets.sh`, with their licence files; `@font-face` with `font-display: swap`, loaded only when used. Caveat and TT2020 cover Cyrillic; About Dead doesn't, so `.innsmouth` falls back to TeutonicRU in Russian through the font stack. If About Dead's licence turns out not to allow redistribution, `.innsmouth` uses Teutonic instead and the file isn't copied (checked in task 1.1).

## Risks / Trade-offs

- [Scroll inside a fixed overlay on iOS] → `-webkit-overflow-scrolling` is default now; checked in the phone layout.
- [Three more fonts] → loaded on demand by `font-display: swap`; about 300 KB together, fetched only when a styled line appears.

## Migration Plan

Content regenerated; no saved data changes.

## Open Questions

None.
