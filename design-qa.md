# History page — editorial design QA

## Scope and result

**Passed for the observed Chrome desktop and magnified narrow viewport.**
No open P1/P2 findings remain. Reviewed on 2026-11-15.

The selected reference is [Herbier Blanc](https://www.getlayers.ai/layer/herbier-blanc).
Its paper, crimson, serif typography and layered print composition are adapted
to the parish history. Historical copy and captions remain sourced from
`content/history/` and the existing parish photo metadata. All six locales
(RU/LT/EN/PL/DE/UK) are retained.

## Visual evidence and comparison conditions

- Reference: `/workspace/shared/history-review/herbier-blanc-reference.jpg`,
  1363 × 936 pixels, desktop browser, DPR 1, light design inside the GetLayers
  preview shell. The reference is animated; the frame is a design direction,
  not a fixed page specification.
- Implementation:
  [RU preview](https://maksimas-win.github.io/bukiski-parish-next/ru/history.html)
  and [LT preview](https://maksimas-win.github.io/bukiski-parish-next/lt/history.html).
- Desktop CSS viewport: 1363 × 936, DPR 1. Viewport screenshot files are
  1348 × 926 pixels after the capture surface excludes browser/scrollbar edges.
  Reference and implementation were reviewed together with this difference
  accounted for.
- Narrow reflow: normal Chrome zoom at 400%, CSS viewport 340 × 234, DPR 4.
  This is a magnified desktop browser, not a physical phone or device emulator.
  Document scroll width equalled client width; no horizontal overflow.
- Desktop evidence: `history-desktop-cover.jpg`,
  `history-desktop-reading.jpg`, `history-lightbox.jpg`,
  `history-dark-large.jpg`, `history-high-contrast.jpg`,
  `history-study.jpg`, `history-study-page.jpg`, `history-lt-desktop.jpg`.
- Narrow evidence: `history-narrow-fixed.jpg`,
  `history-narrow-navigation-fixed.jpg`, `history-narrow-photos.jpg`.
  These files are in `/workspace/shared/history-review/`.
  The earlier `history-narrow-navigation.jpg` records the pre-fix defect.
  Offscreen full-page capture artefacts were excluded from image-loading claims;
  the narrow photographs were inspected in the visible viewport.

## Required fidelity surfaces

| Surface | Observed result |
| --- | --- |
| Typography | Existing local Source Serif 4 and Source Sans 3 produce a crimson serif title and readable editorial body. Desktop wrapping and enlarged text were inspected; UI text remains at least 0.8125rem in the stylesheet. |
| Layout rhythm | Split cover, layered real photographs, nine numbered chapters, desktop contents, compact disclosure, chronology and separate research card form a coherent reading hierarchy. Narrow reflow and anchor positions pass after the fix below. |
| Colors | Paper and burgundy light theme inspected. Dark mode with enlarged text uses the existing dark background and gold heading tokens. High contrast with enlarged text remains readable and contained. |
| Images | Modern church, restoration and family archive images load. The cover composition was inspected at desktop and narrow width. Archive lightbox preserves the full historical photograph and its caption. |
| Copy | Existing content JSON is unchanged. Independent review found no lost paragraphs, headings, dates, source links or lightbox links in any of the six generated history pages. Nine chapters, chronology, five sources and Ivanova's separate study are retained. |

The reference-to-implementation comparison found no P1/P2 visual mismatch.
The parish adaptation intentionally uses historical photographs and long-form
reading rather than the reference's perfume catalogue content.

## Browser interactions verified

- Read link and chapter links preserve native URL hashes.
- Desktop chapter navigation updates the current chapter and reading progress;
  heading focus moves to the destination.
- Native Back returns to the preceding chapter anchor.
- The compact contents disclosure closes before anchor navigation.
- At 400% zoom, selecting chapter 05 sets `#twentieth`, focuses
  `twentieth-title`, marks chapter 05 current and reports reading progress 47.
- Reloading the direct `#twentieth` URL leaves the disclosure collapsed and the
  destination heading visible.
- Archive lightbox opens, focuses its close button, closes with Escape and
  restores focus to its opening archive link.
- Dark theme, enlarged text and high-contrast enlarged text were inspected.
- The separate Ivanova research link opens the existing study page with its
  title and editorial note intact; its shared editorial styles are preserved.
- Language navigation exposes all six history URLs. Switching from RU to LT
  loads the Lithuanian history with one main title, nine chapters and no
  horizontal overflow.
- Browser error logs contain no site errors. The observed metadata errors came
  from the browser extension and were excluded by their chrome-extension URL.

## Findings and corrective iteration

### Resolved: short-viewport anchor placement

At 400% zoom, global scroll padding (88px) was added to the history anchor
clearance (168px), placing the chapter start at 256px in a 234px-high viewport.
The destination title was below the viewport and the current-chapter indicator
could still show the preceding chapter.

Commit `6ee8e38` scopes root scroll padding to zero on the history page.
At the existing header's short-viewport breakpoint (520px height), anchor
clearance becomes 1rem and the compact contents scrolls with the document.
After publishing this fix, the chapter start is at 16px and chapter 05's title
at 57px. Click navigation and direct-link reload both passed on the published
build, with the correct current chapter.

### Resolved: test publication access

The first preview deployment was rejected because the feature branch was not
in the existing github-pages environment's selected branch list. With the
owner's explicit authorization, the exact branch
`codex/history-editorial-20261115` was added while retaining `main` and the
other environment settings. No workflow or schedule changes were made.

The final test publication,
[Pages run 43764862500](https://github.com/Maksimas-win/bukiski-parish-next/actions/runs/43764862500),
passed build, deploy and verify-publication for `6ee8e38`.
The public preview's asset version is `13f2a57703`; the published CSS matches
the locally built CSS and includes the anchor fix.

## Automated and source verification

- `npm run check` after the CSS fix: 139 passed, 0 failed, 0 skipped.
- `DOCUMENT_DELIVERY=direct npm run check`: 139 passed, 0 failed, 0 skipped
  on the initial executable implementation, before the CSS-only anchor fix.
- Both build modes generated 336 pages from 127 source records.
- Generated-file drift gate for `deploy/` and migration CSV/JSON: passed.
- `git diff --check`: passed.
- Required GitHub Actions
  [verify run 43764622650](https://github.com/Maksimas-win/bukiski-parish-next/actions/runs/43764622650)
  passed for `6ee8e38`.
- All six public preview history URLs returned HTTP 200 with one h1, nine
  chapters, nine contents links and the expected preview path prefix.
- All 18 checked stylesheet, script, font and image resources returned HTTP 200
  with the expected MIME types.

## Scope limits

Reduced-motion behavior was checked in source: motion is enabled only under
`prefers-reduced-motion: no-preference`. Browser emulation of reduced motion
was not performed. Physical Android/iOS devices and Safari were not tested.
The narrow-browser observations above describe the actual tested conditions.

## Final result

final result: passed
