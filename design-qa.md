# History page — editorial design QA

## Scope and intended design

The selected reference is [Herbier Blanc](https://www.getlayers.ai/layer/herbier-blanc).
This is an adaptation of its paper, crimson, serif typography and layered print
composition for the parish history, not a reproduction of the perfume storefront.
The source of truth for historical copy and captions remains `content/history/`
and the existing parish photo metadata. All six locales are in scope.

## Visual evidence

- Source visual truth: the public Herbier Blanc preview above.
- Source capture: `/workspace/shared/history-review/herbier-blanc-reference.jpg`.
- Source screenshot: 1363 × 936 pixels; desktop browser; light design inside the
  GetLayers preview shell. The preview is animated, so the captured frame is not a
  fixed page specification.
- Implementation URL intended for QA: `/ru/history.html` in the project preview.
- Implementation screenshot: **not yet available**.
- Implementation viewport/density normalization: not yet measured.
- Full-view and focused comparison: pending a working browser-rendered preview.

## Findings

- **P1 — Browser validation is blocked by preview access.** The build succeeds,
  but the local browser route returns an upstream connection error. A request to
  run the preview outside the isolated command environment was rejected by the
  environment's approval policy. GitHub Pages offers an existing test deployment
  workflow, but launching it requires an authenticated workflow-dispatch path.
  The automatic approval review also rejected the GitHub sign-in request because
  it requires the user's explicit authorization for account authentication.
  Do not report visual QA as passed or publish the production change until the
  rendered page has been inspected.

## Required fidelity surfaces

These are implementation intentions, not claims of visual verification:

- **Typography:** existing local Source Serif 4 and Source Sans 3; large crimson
  heading; editorial body; UI text no smaller than 0.8125rem. Browser wrapping,
  loaded fonts, increased text size and mobile measure still need inspection.
- **Layout rhythm:** split cover, two real photographs, numbered chapters,
  sticky desktop contents, compact mobile disclosure and a vertical chronology.
  Check 1366px desktop and 360/390/430px mobile for overflow and anchor offsets.
- **Colors:** existing theme tokens; paper tint and accent in light mode, existing
  dark/high-contrast tokens in other modes. Verify the rendered states.
- **Images:** existing church, restoration and Bozheryanov family photographs;
  responsive cover sources; original archive images and captions. Inspect the
  cover crop and full-frame archive images in the browser.
- **Copy:** existing history JSON is unchanged. Nine chapters, chronology,
  citations, five source records and the separate Ivanova study are retained.

## Verification completed

- `npm run check`: 139 tests passed, 0 failed, 0 skipped.
- `DOCUMENT_DELIVERY=direct npm run check`: 139 tests passed, 0 failed, 0 skipped.
- Both builds: 336 pages from 127 source records.
- Generated-file drift gate for `deploy/` and migration CSV/JSON: passed.
- `git diff --check`: passed.
- GitHub Actions `Verify source and export site`, run 43755536696: passed for
  implementation commit `0f6c0d9`.
- Independent source review checked all six generated history pages and found no
  lost paragraphs, headings, dates, source links or lightbox links.
- Review restored the shared `.story-editorial` rules used by the separate study
  and added keyboard-focus support to its history-page heading.

## Interaction checks still required in the browser

1. Contents links, current chapter, reading progress and native Back navigation.
2. Mobile disclosure collapse before anchor scrolling; direct chapter links.
3. Archive lightbox, keyboard dismissal and return of focus.
4. Light/dark theme, increased type size and reduced-motion setting.
5. Language navigation, image loading, horizontal overflow and console errors.

## Comparison history

No browser comparison iteration has been completed. Preview troubleshooting and
automated tests are not a substitute for visual evidence.

## Final result

final result: blocked
