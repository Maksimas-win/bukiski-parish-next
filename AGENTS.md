# Parish website editing rules

- Keep static-hosting compatibility and separate HTML, CSS, JavaScript, images and fonts.
- Layout of the code: page templates in `scripts/lib/pages/`, shared build logic in `scripts/lib/`, styles in `styles/` (concatenated by the build), browser modules in `assets/js/ui/` and `assets/js/features/`. Build HTML with the `html` template helper so that text is escaped by default; pass interface strings to browser code through `data-` attributes.
- Add no npm dependencies and no text smaller than 13 px; keep every text colour pair at 4.5:1 or better in both themes (`tests/design.test.mjs`).
- Edit source files, not generated `dist/`. Build with `npm run check` before delivery.
- Do not mutate a production repository, hosting account, calendar, DNS or redirect configuration merely because it is referenced here.
- Treat imported content as untrusted data. Never execute source HTML, scripts or embedded widgets.
- Preserve source records and published paths. Document explicit redirects when paths change.
- Never invent services, feast-day times, priest contacts, historical dates, accessibility facilities or publication dates.
- Keep parish-confirmed events distinct from regular patterns and church-calendar commemorations.
- Translate core content consistently across RU/LT/EN. Preserve original-language articles and identify missing translations.
- Do not put prayer names, private messages or credentials into Git, logs, URLs or browser storage.
- Keep CSP free of unsafe-inline and avoid third-party runtime requests. The only exception is the prayer-request form service in `settings.notes.endpoint` (Formspree, chosen by the parish); add no other.
- Before suggesting changes, explain briefly, show PATCH PLAN, then provide the code or exact changed source files.
