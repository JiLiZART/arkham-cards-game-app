## 1. The strip during a test

- [x] 1.1 `stripDuringTest(testing, ids, byCard)`: `normal` when no test, `compact` when a strip card has an option, `aside` otherwise; tests (no test → normal; commit window with Physical Training offered → compact; commit window with nothing offered → aside; draw and result, no pending choice → aside).
- [x] 1.2 `PlayStrip`: reads `useView().testing`; `compact` sets `--sw` to `STRIP_MIN_W`; `aside` adds the class (slide down, fade, no pointer on the strip and its children, 0.2 s, none under reduced motion); the strip stays mounted; the phone column takes the same class.

## 2. The subject on short windows

- [x] 2.1 `styles.css` desktop rules: `.st-center` height from the window's height (`clamp(200px, calc(100vh - 614px), 336px)`, width 5/7 of it) and `.st-middle` / `.st-placed` top (`clamp(96px, …, 140px)`); 240×336 and 140 px at 1080 and above.

## 3. Verification

- [x] 3.1 Browser at 1600×900 and 1920×1080, and the phone at 852×393: Roland with a .45 Automatic and a Machete in play and an engaged Ghoul Minion investigates; during the draw the strip is aside and every disc is tappable (each disc's centre's `elementFromPoint` is the disc); with Physical Training in play in a willpower test the compact strip shows it bright and the subject card's and line's rects end above the strip's buttons; the strip is back at its size after the result; screenshots; 0 console errors.
- [x] 3.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate test-screen-strip-clear --type change --strict`.
