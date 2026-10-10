# Parish website editing rules

- Keep static-hosting compatibility and separate HTML, CSS, JavaScript, images and fonts.
- Edit source files, not generated `dist/`. Build with `npm run check` before delivery.
- Do not mutate a production repository, hosting account, calendar, DNS or redirect configuration merely because it is referenced here.
- Treat imported content as untrusted data. Never execute source HTML, scripts or embedded widgets.
- Preserve source records and published paths. Document explicit redirects when paths change.
- Never invent services, feast-day times, priest contacts, historical dates, accessibility facilities or publication dates.
- Keep parish-confirmed events distinct from regular patterns and church-calendar commemorations.
- Translate core content consistently across RU/LT/EN. Preserve original-language articles and identify missing translations.
- Do not put prayer names, private messages or credentials into Git, logs, URLs or browser storage.
- Keep CSP free of unsafe-inline and avoid third-party runtime requests.
- Before suggesting changes, explain briefly, show PATCH PLAN, then provide the code or exact changed source files.
