// Reusable fragments shared by several pages.

import { isStale, safeExternalURL } from '../../assets/js/domain.js';
import { html, attrs, classes } from './html.mjs';
import { icon } from './icons.mjs';
import { formatDate } from './site.mjs';

export function pageHead({ title, intro, kicker }) {
  return html`<header class="page-head shell">
    ${kicker && html`<p class="page-head__kicker">${kicker}</p>`}
    <h1>${title}</h1>
    ${intro && html`<p class="lead">${intro}</p>`}
  </header>`;
}

/** Link to another page of this site. `path` is site-relative. */
export function siteLink(site, path, label, className = 'link') {
  return html`<a${attrs({ class: className, href: site.url(path) })}>${label}</a>`;
}

/** Link that leaves the site. Unsafe or non-HTTPS addresses render nothing. */
export function externalLink(t, href, label, className = 'link') {
  if (!safeExternalURL(href)) return '';
  return html`<a${attrs({ class: className, href, rel: 'noopener noreferrer' })}>${label}${icon('external')}<span class="visually-hidden"> (${t.external})</span></a>`;
}

export function phoneLink(site, t, className = 'button') {
  const { phone, phoneDisplay } = site.settings;
  return html`<a${attrs({ class: `${className} with-icon`, href: `tel:${phone}` })}>${icon('phone')}<span>${t.call} <span class="nowrap">${phoneDisplay}</span></span></a>`;
}

/** Hidden until JavaScript enables it; copies `value` and confirms with a toast. */
export function copyButton(t, value, label) {
  return html`<button${attrs({ type: 'button', class: 'icon-button copy-button', 'data-copy': value, 'aria-label': `${t.copy}: ${label}`, title: t.copy, hidden: true })}>${icon('copy')}</button>`;
}

const CHURCH_PHOTO = [
  { file: 'church-640.webp', width: 640 },
  { file: 'church-1280.webp', width: 1280 },
  { file: 'church-1920.webp', width: 1600 }
];

export function churchImage(site, t, { className, sizes, eager = false }) {
  const src = file => site.url(`/assets/img/${file}`);
  return html`<img${attrs({
    class: className,
    src: src('church-1280.webp'),
    srcset: CHURCH_PHOTO.map(({ file, width }) => `${src(file)} ${width}w`).join(', '),
    sizes,
    width: 1280,
    height: 720,
    loading: eager ? 'eager' : 'lazy',
    fetchpriority: eager ? 'high' : null,
    decoding: 'async',
    alt: t.photo
  })}>`;
}

/**
 * One service. The same markup serves the home page and the schedule; the
 * browser later hides rows whose start has passed and labels today/tomorrow.
 */
export function serviceRow(site, lang, t, event, { heading = 'h3', hidden = false, next = false } = {}) {
  const subtitle = event.subtitle[lang] || '';
  const fullDate = formatDate(lang, event.start, { weekday: 'long', day: 'numeric', month: 'long' });
  return html`<li${attrs({
    class: classes('service', event.feast && 'is-feast', next && 'is-next'),
    'data-service': true,
    'data-id': event.id,
    'data-start': event.start,
    'data-feast': String(event.feast),
    'data-title': event.title[lang],
    'data-subtitle': subtitle,
    hidden
  })}>
    <div class="service__date" aria-hidden="true">
      <span class="service__day">${formatDate(lang, event.start, { day: 'numeric' })}</span>
      <span class="service__month">${formatDate(lang, event.start, { month: 'short' }).replace('.', '')}</span>
    </div>
    <div class="service__body">
      <p class="service__when"><time datetime="${event.start}">${fullDate}</time><span class="badge badge--soon" data-relative hidden></span>${event.feast && html`<span class="badge badge--feast">${t.feast}</span>`}</p>
      <${heading} class="service__title"><span class="service__clock">${event.startTime}</span> ${event.title[lang]}</${heading}>
      ${subtitle && html`<p class="service__subtitle">${subtitle}</p>`}
    </div>
    <button${attrs({ type: 'button', class: 'icon-button service__add', 'data-add-to-calendar': true, 'aria-label': `${t.addToCalendar}: ${event.title[lang]}, ${fullDate}`, title: t.addToCalendar, hidden: true })}>${icon('calendar-plus')}<span class="service__add-label" aria-hidden="true">${t.addToCalendar}</span></button>
  </li>`;
}

/** Attributes the browser needs to judge freshness and build calendar files. */
export function scheduleData(site, lang, t) {
  return attrs({
    'data-schedule': true,
    'data-updated': site.schedule.sourceUpdatedAt,
    'data-max-age-hours': site.settings.scheduleMaxAgeHours,
    'data-location': site.settings.address,
    'data-calendar-name': t.name,
    'data-calendar-note': t.calendarNote,
    'data-label-downloaded': t.documentReady,
    'data-uid-domain': new URL(site.productionOrigin).hostname
  });
}

/** Source line and the warning shown when the snapshot is too old to trust. */
export function scheduleStatus(site, lang, t) {
  const { sourceUpdatedAt } = site.schedule;
  const stale = isStale(site.schedule, site.buildTime, site.settings.scheduleMaxAgeHours);
  return html`<p class="schedule-status">${t.fromCalendar}. ${t.updated} <time datetime="${sourceUpdatedAt}">${formatDate(lang, sourceUpdatedAt, { dateStyle: 'medium', timeStyle: 'short' })}</time> (${t.timeZoneShort}).</p>
    <p${attrs({ class: 'notice notice--warning', 'data-stale': true, hidden: !stale })}>${t.stale}</p>
    <noscript><p class="notice notice--warning">${t.stale}</p></noscript>`;
}
