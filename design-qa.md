# Design QA — parish appeal article

## Result

**Passed — no unresolved visible P0, P1 or P2 issues.** Verified on the published HTTPS article on 2026-11-10 after PRs #98 and #99.

- Article: https://bukiski-hram.net/ru/library/obrashchenie-prihoda-v-seim-2026.html
- Release: `281bb80be495120a81f8174e24c6707d3e38e664`
- Main design: https://github.com/Maksimas-win/bukiski-parish-next/pull/98
- Final typography and polish: https://github.com/Maksimas-win/bukiski-parish-next/pull/99
- Saved typography evidence: https://chatgpt.com/library?file_id=libfile_fde3_f-f86d3d90c4ec8191af8f0d45c8c0bae2_e9780dc42a9c81918f54e8cb64b0ae98&account_id=personal

## Target and explicit decisions

Maksim selected the second displayed design: a full-width photographic opening, white serif title, light reading area, a contents rail, and stacked document previews. The selected generated reference was `exec-2476447a-d37b-4cf2-8f73-fe7ffb4cae16.png` (946 × 1663). It was viewed alongside the actual page during both primary and independent visual review.

Maksim subsequently requested printed-publication paragraph composition: justified text and a first-line indent. The implementation uses 1.5em indents, a naturally aligned final line, language-aware hyphenation, and 0.65em between consecutive main paragraphs. This later explicit request supersedes the ragged-right body shown in the original mockup.

The generated reference is a compositional guide, not an exact browser viewport. Comparison accounted for its scale; actual screenshots were judged at their recorded CSS widths. No pixel-perfect equivalence is claimed.

## Preserved content and intentional differences

- The complete approved title and article wording remain verbatim.
- The real parish photograph and actual first pages of the public PDFs replace generated mock imagery.
- The existing masthead, information strip, navigation, reader preferences and assistant remain.
- All article sections remain, so the contents list is longer than the mockup.
- Document actions say “Скачать документ PDF” because they download the original PDF bytes.
- Signature sheets remain excluded from public assets.
- No new npm dependencies, third-party runtime endpoints or deployment route were added.

## Live visual and interaction checks

| Check | Observed result |
| --- | --- |
| Desktop, 1348 CSS px | Full title readable; photograph, reading column, contents and document rows aligned |
| Narrow, 449 CSS px | Justified paragraphs, indents and Cyrillic hyphenation readable; no horizontal overflow |
| Narrow, 337 CSS px | No paragraph, heading or identifier outside the viewport; document identifiers remain whole |
| Contents | Desktop links navigate to headings; narrow disclosure opens and closes, and closes after selecting a section |
| Document previews | Both images load at their expected intrinsic 480 × 679 size at desktop |
| Document downloads | Both live card links triggered successful downloads; downloaded hashes match originals |
| Themes | Light and dark article/document views inspected; original system theme restored |
| Final state | Browser restored to 100% zoom and the published article left open |

Narrow checks used ordinary browser zoom to exercise the responsive CSS widths. They are not physical-phone or touch-device tests. Full-page capture at non-default zoom had clipping/compositing limitations; geometry, normal native screenshots and text-region captures were used together. No screenshot-only missing image was treated as a site defect.

The first visual pass found two P2 issues: excessive darkening over the church facade and awkward breaks in document identifiers. Both were corrected and reviewed again. Final independent review of desktop hero, documents, body typography, and both narrow text captures found no remaining visible P0–P2 issues.

## Build, delivery and content integrity

The exact production envelope build passed **132/132 checks**. Required GitHub `verify`, production export and site monitor completed successfully for the final release. The established main → production export → Hostinger path was used.

SHA-256 values remained unchanged:

- Approved publication JSON: `8596ce43dbf22fdf5cd127347706977db88dd111e7ab379a65fbdaea84118dbe`
- Public appeal PDF: `770a0ee655c13c4ec1c09b6e07b22108e9bc732f83af3da64135edcd0807705b`
- Seimas reply PDF: `5cf7284d2c4c2267bab5355a0dfb6d7c617b21872e7aea6cbf193428a4dd0818`

Local preview was unavailable in this environment. Expanded local execution and file-URL browser preview were rejected; those restrictions were not bypassed. Visual verification therefore used the authorized published HTTPS page. Browser DevTools were blocked by organization policy; this report does not claim a clean console inspection. Functional UI checks, source review and the required automated checks passed.

