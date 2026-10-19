## 1. Changes

- [x] 1.1 Scenario panel: no hover enlargement for the act, agenda and reference cards; the highlight and the tap kept; test in the panel tests.
- [x] 1.2 Player bar: click only changes the view; hover 500 ms on another investigator opens their sheet, leaving closes it; touch keeps the tap on the shown avatar; `sheetFor` tested; the browser scripts that clicked the avatar for the sheet updated.

## 2. Verification

- [x] 2.1 Browser: hover the agenda (no copy), click Daisy's avatar (view switch, no sheet), rest on Daisy's avatar from Roland's view (sheet after 500 ms, gone on leave), tap on the phone layout opens the own sheet; drive-calm to round 3 with 0 errors; tests, lint, build, content check.
- [x] 2.2 README; `openspec validate bar-hover-sheet --type change --strict`.
