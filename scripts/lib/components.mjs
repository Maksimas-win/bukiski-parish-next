// Reusable fragments shared by several pages.

import { isStale, safeExternalURL } from '../../assets/js/domain.js';
import { html, attrs, classes } from './html.mjs';
import { icon, socialHandle, socialIcon } from './icons.mjs';
import { formatDate } from './site.mjs';

/**
 * Opening of an inner page. With `site`, `page` and `t` it gets the page's
 * gold label and, when content/photos.json names one, a photograph banner.
 */
export function pageHead({ title, intro, kicker, site, page, t }) {
  const label = kicker || (t && page && t.pageEyebrows?.[page]);
  const photoId = site && page && site.photos.banners?.[page];
  const photo = photoId && site.photos.gallery.find(candidate => candidate.id === photoId);
  if (photoId && !photo) throw new Error(`photos.json: banner for ${page} names a missing photo`);
  if (!photo) {
    return html`<header class="page-head shell">
      ${label && html`<p class="eyebrow">${label}</p>`}
      <h1>${title}</h1>
      ${intro && html`<p class="lead">${intro}</p>`}
    </header>`;
  }
  return html`<header class="page-banner">
    <img${attrs({
      class: 'page-banner__photo',
      src: site.url(`/${photo.web}`),
      srcset: `${site.url(`/${photo.thumb}`)} ${photo.thumbWidth}w, ${site.url(`/${photo.web}`)} ${photo.width}w`,
      sizes: '100vw',
      width: photo.width,
      height: photo.height,
      fetchpriority: 'high',
      decoding: 'async',
      alt: ''
    })}>
    <div class="page-banner__shade" aria-hidden="true"></div>
    <div class="shell page-banner__content">
      ${label && html`<p class="eyebrow eyebrow--light">${label}</p>`}
      <h1>${title}</h1>
      ${intro && html`<p class="page-banner__lead">${intro}</p>`}
    </div>
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
 * The church-calendar day behind a service, folded by default. The feed gives
 * it in Russian, so other languages say so and mark the text as Russian.
 */
function churchDetails(lang, t, event) {
  const day = event.church;
  if (!day || (!day.saints.length && !day.readings.length && !day.oldStyleDate)) return '';
  const oldStyle = day.oldStyleDate && formatDate(lang, `${day.oldStyleDate}T12:00:00Z`, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return html`<details class="church-day">
    <summary>${icon('book')}<span>${t.churchCalendar}</span></summary>
    <div class="church-day__body">
      ${lang !== 'ru' && html`<p class="church-day__note">${t.churchCalendarRu}</p>`}
      ${oldStyle && html`<p class="church-day__old">${t.oldStyle.replace('{date}', oldStyle)}</p>`}
      ${day.title && html`<p class="church-day__title" lang="ru">${day.title}</p>`}
      ${day.saints.length > 0 && html`<h4>${t.saintsOfDay}</h4><ul class="church-day__list" lang="ru">${day.saints.map(item => html`<li>${item}</li>`)}</ul>`}
      ${day.readings.length > 0 && html`<h4>${t.readingsOfDay}</h4><ul class="church-day__list church-day__list--readings" lang="ru">${day.readings.map(item => html`<li>${item}</li>`)}</ul>`}
      ${day.sourceURL && html`<p class="church-day__source">${externalLink(t, day.sourceURL, t.calendarSourceLabel)}</p>`}
    </div>
  </details>`;
}

/**
 * One service. The same markup serves the home page and the schedule; the
 * browser later hides rows whose start has passed and labels today/tomorrow.
 */
export function serviceRow(site, lang, t, event, { heading = 'h3', hidden = false, next = false, label = null, following = null } = {}) {
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
    'data-label': label,
    'data-following': following,
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
      ${event.note?.[lang] && html`<p class="service__note">${icon('candle')}<span>${event.note[lang]}</span></p>`}
      ${lang === 'ru' && event.church?.commemoration && event.church.commemoration !== subtitle && html`<p class="service__commemoration">${event.church.commemoration}</p>`}
      <p class="service__start" aria-hidden="true"><span class="service__start-box"><span class="service__start-label">${t.serviceStart}</span><span class="service__start-time">${event.startTime}</span></span><span class="service__start-name">${event.title[lang]}</span></p>
      ${churchDetails(lang, t, event)}
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

/** The parish's social channels as large cards with each network's mark. */
export function socialCards(site, t) {
  return html`<ul class="social-cards">
    ${site.settings.social.map(item => html`<li class="social-card social-card--${item.id}">
      <a href="${item.url}" rel="noopener noreferrer">
        <span class="social-card__icon">${socialIcon(item.id)}</span>
        <span class="social-card__text">
          <span class="social-card__name">${item.label}</span>
          <span class="social-card__handle">${socialHandle(item.url)}</span>
        </span>
        <span class="social-card__go">${t.socialOpen}${icon('external')}<span class="visually-hidden"> (${t.external})</span></span>
      </a>
    </li>`)}
  </ul>`;
}
