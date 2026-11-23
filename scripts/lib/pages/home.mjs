import { upcomingEvents } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon, emblem } from '../icons.mjs';
import { copyButton, externalLink, phoneLink, scheduleData, scheduleStatus, serviceRow, siteLink, socialCards } from '../components.mjs';
import { gpmSummary, fill } from './gpm.mjs';
import { CALENDAR_BOOK_PATH } from './calendar-book.mjs';
import { supportCents, formatCents } from '../../../assets/js/features/gpm/math.js';

const UI_LOCALES = { ru: 'ru-RU', lt: 'lt-LT', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', uk: 'uk-UA' };
const HOME_EXAMPLES = [600, 1500, 3000];

/** Rows rendered into the page; the browser shows the first few that are still ahead. */
const RENDERED_SERVICES = 8;
const VISIBLE_SERVICES = 4;

/**
 * The church itself opens the site: a full-width photograph with its name.
 * No slogan; the two links lead to what visitors look for first.
 */
function hero(site, lang, t) {
  const { hero: sizes } = site.photos;
  const largest = sizes.at(-1);
  return html`<section class="hero" aria-labelledby="hero-title">
    <img${attrs({
      class: 'hero__photo',
      src: site.url(`/${sizes[1].file}`),
      srcset: sizes.map(size => `${site.url(`/${size.file}`)} ${size.width}w`).join(', '),
      sizes: '100vw',
      width: largest.width,
      height: largest.height,
      fetchpriority: 'high',
      decoding: 'async',
      alt: t.photo
    })}>
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="shell hero__content">
      <div class="hero__text">
        <p class="hero__kicker">${t.heroKicker}</p>
        <h1 id="hero-title" class="hero__title">${t.name}</h1>
        <p class="hero__place">${t.heroPlace}</p>
      </div>
      ${gpmCard(site, lang, t)}
    </div>
  </section>`;
}

/**
 * The 1,2 % GPM card on the first screen: one invitation, the campaign state
 * from content/gpm/config.json, one link to the section in this language.
 */
function gpmCard(site, lang, t) {
  const gpm = gpmSummary(site, lang);
  return html`<aside class="hero-gpm" aria-labelledby="hero-gpm-title" data-gpm-state data-filing-start="${gpm.filingStart}" data-filing-deadline="${gpm.filingDeadline}">
    <p class="hero-gpm__kicker">${t.homeGpmKicker}</p>
    <p class="hero-gpm__figure" aria-hidden="true"><span class="gpm-relief">${t.homeGpmFigure}</span><span class="hero-gpm__unit">GPM</span></p>
    <div class="hero-gpm__body">
      <h2 id="hero-gpm-title" class="hero-gpm__title"><span class="visually-hidden">${t.homeGpmFigure} GPM. </span>${t.homeGpmTitle}</h2>
      <p class="hero-gpm__text">${t.homeGpmText}</p>
      <a class="button hero-gpm__action" href="${site.url(site.route(lang, 'gpm'))}">${t.homeGpmAction}${icon('arrow-right')}</a>
      ${Object.entries(gpm.phaseLabels).map(([state, label]) => html`<p class="hero-gpm__state" data-phase="${state}"${attrs({ hidden: state !== gpm.phase })}>${label}</p>`)}
    </div>
  </aside>`;
}

/** Icons of the three points under the calendar window, in the order of homeCalendarPoints. */
const CALENDAR_POINT_ICONS = ['book', 'calendar', 'search'];

/**
 * After the services: a window onto the 2027 calendar book. The cover stands
 * in 3D and opens under the pointer or keyboard focus (on touch screens, while
 * it scrolls into view); the whole panel leads to the book. The book is in
 * Russian, so the other languages say so next to the button.
 */
function calendarWindow(site, lang, t) {
  const book = path => site.url(`/assets/calendar-2027/${path}`);
  const image = (className, thumb, file) => html`<img${attrs({
    class: className,
    src: book(file),
    srcset: `${book(thumb)} 240w, ${book(file)} 480w`,
    sizes: '(max-width: 47.99rem) 9rem, 16.5rem',
    width: 480,
    height: 679,
    loading: 'lazy',
    decoding: 'async',
    alt: ''
  })}>`;
  return html`<section class="shell calendar-window" aria-labelledby="calendar-window-title">
    <div class="calendar-window__panel" data-tilt>
      <div class="calendar-window__stage" aria-hidden="true">
        <span class="calendar-window__book">
          <span class="calendar-window__block"></span>
          ${image('calendar-window__inside', 'thumbs/t03.webp', 'home/inside.webp')}
          <span class="calendar-window__cover">${image('calendar-window__face', 'thumbs/t01.webp', 'home/cover.webp')}</span>
        </span>
      </div>
      <div class="calendar-window__copy">
        <p class="eyebrow calendar-window__kicker">${t.homeCalendarKicker}</p>
        <h2 id="calendar-window-title" class="calendar-window__title">${t.calendarBook}</h2>
        <p class="calendar-window__text">${t.homeCalendarText}</p>
        <ul class="calendar-window__points">
          ${t.homeCalendarPoints.map((point, index) => html`<li><span class="calendar-window__point-icon" aria-hidden="true">${icon(CALENDAR_POINT_ICONS[index])}</span>${point}</li>`)}
        </ul>
        <p class="calendar-window__actions">
          <a${attrs({ class: 'button button--on-dark calendar-window__open', href: site.url(CALENDAR_BOOK_PATH), hreflang: lang === 'ru' ? null : 'ru' })}>${t.homeCalendarAction}${icon('arrow-right')}</a>
          ${lang === 'ru' ? '' : html`<span class="calendar-window__language">${icon('globe')}${t.homeCalendarLanguage}</span>`}
        </p>
      </div>
    </div>
  </section>`;
}

/**
 * After the services: what the share means, a three-button example that
 * uses the section's own arithmetic, and the way into the step-by-step helper.
 */
function gpmBand(site, lang, t) {
  const gpm = gpmSummary(site, lang);
  const locale = UI_LOCALES[lang] || lang;
  const money = cents => `${formatCents(cents, locale)} €`;
  const whole = amount => new Intl.NumberFormat(locale).format(amount);
  const examples = HOME_EXAMPLES.map(amount => ({ amount, label: `${whole(amount)} ${t.homeGpmExampleUnit}`, result: money(supportCents(amount * 100)) }));
  const page = site.url(site.route(lang, 'gpm'));
  return html`<section class="gpm-band" aria-labelledby="gpm-band-title">
    <div class="shell gpm-band__inner" data-home-gpm>
      <p class="gpm-band__figure" aria-hidden="true"><span class="gpm-relief gpm-relief--large">${t.homeGpmFigure}</span></p>
      <div class="gpm-band__copy">
        <p class="eyebrow">${t.homeGpmKicker}</p>
        <h2 id="gpm-band-title">${t.homeGpmBandTitle}</h2>
        <p class="gpm-band__text">${fill(t.homeGpmBandText, gpm.values)}</p>
      </div>
      <div class="gpm-example" role="group" aria-labelledby="gpm-example-title">
        <p id="gpm-example-title" class="gpm-example__label">${t.homeGpmExample}</p>
        <div class="gpm-example__chips">
          ${examples.map((example, index) => html`<button type="button" class="gpm-chip" data-gpm-example="${example.amount}" data-result="${example.result}" aria-pressed="${index === 0 ? 'true' : 'false'}">${example.label}</button>`)}
        </div>
        <p class="gpm-example__result"><output class="gpm-example__value" data-gpm-example-result aria-live="polite">${examples[0].result}</output><span class="gpm-example__caption">${t.homeGpmResult}</span></p>
        <ul class="gpm-example__static">
          ${examples.map(example => html`<li>${example.label} → <strong>${example.result}</strong></li>`)}
        </ul>
        <p class="gpm-example__note">${t.homeGpmResultNote}</p>
      </div>
      <div class="gpm-band__actions">
        <a class="button gpm-band__open" href="${page}#steps">${t.homeGpmOpen}${icon('arrow-right')}</a>
        <a class="link link--arrow" href="${page}#calculator">${t.homeGpmCalc}${icon('arrow-right')}</a>
      </div>
    </div>
  </section>`;
}

/** Section title with a short label above it, shared by every home section. */
function sectionTitle(id, eyebrow, title) {
  return html`<div class="section-title">
    <p class="eyebrow">${eyebrow}</p>
    <h2 id="${id}">${title}</h2>
  </div>`;
}

/** The parish emblem as a badge: the drawn logo on the «О храме» card. */
function parishLogo(site) {
  return html`<img class="emblem emblem--logo" src="${site.url('/assets/img/logo-256.webp')}" width="64" height="64" loading="lazy" decoding="async" alt="">`;
}

/** Four tiles over the bottom edge of the photograph: what visitors need first. */
function quickLinks(site, lang, t) {
  const { phone, phoneDisplay, address } = site.settings;
  const tiles = [
    { href: site.url(site.route(lang, 'schedule')), icon: 'calendar', title: t.schedule, note: t.quickScheduleNote },
    { href: site.url(site.route(lang, 'notes')), icon: 'note', title: t.notes, note: t.quickNotesNote },
    { href: site.url(site.route(lang, 'contacts')), icon: 'pin', title: t.directions, note: address.split(',').slice(0, 2).join(',') },
    { href: `tel:${phone}`, icon: 'phone', title: t.call, note: phoneDisplay }
  ];
  return html`<nav class="shell quick" aria-label="${t.quickTitle}">
    <ul class="quick__list">
      ${tiles.map(tile => html`<li><a class="quick__tile" href="${tile.href}" data-tilt>
        <span class="quick__icon">${emblem(tile.icon)}</span>
        <span class="quick__text"><span class="quick__title">${tile.title}</span><span class="quick__note">${tile.note}</span></span>
      </a></li>`)}
    </ul>
  </nav>`;
}

/** A few photographs of parish life, leading to the gallery. */
function photos(site, lang, t) {
  const byId = new Map(site.photos.gallery.map(photo => [photo.id, photo]));
  const chosen = site.photos.homeMosaic.map(id => byId.get(id));
  if (chosen.some(photo => !photo)) throw new Error('photos.json: homeMosaic names a photo that is not in the gallery');
  return html`<section class="shell home-photos" aria-labelledby="photos-title">
    <div class="section-head">
      ${sectionTitle('photos-title', t.eyebrowPhotos, t.gallery)}
      ${siteLink(site, site.route(lang, 'gallery'), html`${t.allPhotos}${icon('arrow-right')}`, 'link link--arrow')}
    </div>
    <ul class="mosaic">
      ${chosen.map((photo, index) => html`<li class="mosaic__item">
        <a href="${site.url(site.route(lang, 'gallery'))}">
          <img${attrs({ src: site.url(`/${photo.thumb}`), srcset: `${site.url(`/${photo.thumb}`)} ${photo.thumbWidth}w, ${site.url(`/${photo.web}`)} ${photo.width}w`, sizes: index === 0 ? '(max-width: 40rem) 100vw, 50vw' : '(max-width: 40rem) 50vw, 25vw', width: photo.thumbWidth, height: photo.thumbHeight, loading: 'lazy', decoding: 'async', alt: photo.caption[lang] })}>
          <span class="mosaic__caption">${photo.caption[lang]}</span>
        </a>
      </li>`)}
    </ul>
  </section>`;
}

function services(site, lang, t) {
  const events = upcomingEvents(site.schedule, site.buildTime).slice(0, RENDERED_SERVICES);
  const scheduleHref = site.url(site.route(lang, 'schedule'));
  return html`<section class="services-band" aria-labelledby="services-title">
    <div class="shell services"${scheduleData(site, lang, t)} data-limit="${VISIBLE_SERVICES}">
      <div class="services__head">
        ${sectionTitle('services-title', t.eyebrowServices, t.next)}
        <a class="button button--on-dark" href="${scheduleHref}" data-schedule-open aria-haspopup="dialog" aria-controls="services-dialog">${t.openSchedule}${icon('arrow-right')}</a>
      </div>
      <ol class="service-list service-list--featured" data-service-list>
        ${events.map((event, index) => serviceRow(site, lang, t, event, { hidden: index >= VISIBLE_SERVICES, next: index === 0, label: t.nextService }))}
      </ol>
      <p${attrs({ 'data-empty': true, hidden: events.length > 0 })}>${t.empty}</p>
      <div class="services__foot">
        <p>${t.regular}</p>
        ${scheduleStatus(site, lang, t)}
      </div>
    </div>
  </section>
  ${servicesDialog(site, lang, t, events, scheduleHref)}`;
}

/** The upcoming services with their church-calendar days, opened from the home page. */
function servicesDialog(site, lang, t, events, scheduleHref) {
  return html`<dialog class="services-dialog" id="services-dialog" aria-labelledby="services-dialog-title">
    <header class="services-dialog__head">
      <div>
        <p class="eyebrow">${t.name} · ${t.heroPlace.split(' · ')[0]}</p>
        <h2 id="services-dialog-title">${t.allServices}</h2>
      </div>
      <button type="button" class="icon-button services-dialog__close" data-dialog-close aria-label="${t.close}">${icon('close')}</button>
    </header>
    <div class="services-dialog__body"${scheduleData(site, lang, t)} data-limit="${RENDERED_SERVICES}">
      <ol class="service-list service-list--dialog" data-service-list>
        ${events.map((event, index) => serviceRow(site, lang, t, event, { next: index === 0, label: t.nextService, following: t.followingServices }))}
      </ol>
      <p${attrs({ 'data-empty': true, hidden: events.length > 0 })}>${t.empty}</p>
      <footer class="services-dialog__foot">
        ${scheduleStatus(site, lang, t)}
        <p class="actions">
          <a class="button" href="${scheduleHref}">${icon('calendar')}${t.allServices}</a>
          ${phoneLink(site, t, 'button button--quiet')}
        </p>
      </footer>
    </div>
  </dialog>`;
}

function visit(site, lang, t) {
  const { settings } = site;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${settings.latitude}%2C${settings.longitude}`;
  const buses = settings.transport.buses.map(bus => bus.number).join(', ');
  return html`<section class="visit-band" aria-labelledby="visit-title">
    <div class="shell first-visit">
      <div class="first-visit__intro">
        ${sectionTitle('visit-title', t.eyebrowVisit, t.welcome)}
        <p class="lead">${t.welcomeIntro}</p>
        <ol class="steps">
          ${t.welcomeSteps.map(step => html`<li class="steps__item">${step}</li>`)}
        </ol>
      </div>
      <aside class="visit-card" aria-labelledby="directions-title">
        <h3 id="directions-title">${icon('route')}${t.directions}</h3>
        <p class="visit-card__address">${icon('pin')}<span>${settings.address}</span>${copyButton(t, settings.address, t.addressLabel)}</p>
        <ul class="visit-card__facts">
          <li>${icon('bus')}<span>${t.buses}: <strong>${buses}</strong> · ${t.busStop} ${settings.transport.stop}</span></li>
          <li>${icon('clock')}<span>${t.openHours.replace('{time}', settings.openFrom)}</span></li>
        </ul>
        <div class="visit-card__actions">
          ${externalLink(t, routeUrl, t.route, 'button')}
          ${phoneLink(site, t, 'button button--quiet')}
        </div>
      </aside>
    </div>
  </section>`;
}

/** The parish's own channels, given room of their own. */
function social(site, lang, t) {
  return html`<section class="shell social-band" aria-labelledby="social-title">
    <div class="social-band__head">
      ${sectionTitle('social-title', t.eyebrowSocial, t.social)}
      <p class="section-head__note">${t.socialIntro}</p>
    </div>
    ${socialCards(site, t)}
  </section>`;
}

function explore(site, lang, t) {
  const cards = [['notes', 'notesTeaser', 'message'], ['history', 'historyTeaser', 'logo'], ['gallery', 'galleryTeaser', 'photo'], ['library', 'libraryTeaser', 'book']];
  return html`<section class="shell explore" aria-labelledby="explore-title">
    <div class="section-head">
      <div>
        ${sectionTitle('explore-title', t.eyebrowExplore, t.discover)}
        <p class="section-head__note">${t.discoverIntro}</p>
      </div>
      ${siteLink(site, site.route(lang, 'news'), html`${t.news}${icon('arrow-right')}`, 'link link--arrow')}
    </div>
    <ul class="link-cards">
      ${cards.map(([id, teaser, symbol]) => html`<li class="link-card" data-tilt>
        <span class="link-card__badge${symbol === 'logo' ? ' link-card__badge--logo' : ''}">${symbol === 'logo' ? parishLogo(site) : emblem(symbol === 'message' ? 'note' : symbol)}</span>
        <h3><a href="${site.url(site.route(lang, id))}">${t[id]}</a></h3>
        <p>${t[teaser]}</p>
        <span class="link-card__arrow">${icon('arrow-right')}</span>
      </li>`)}
    </ul>
  </section>`;
}

function support(site, lang, t) {
  return html`<section class="support-band">
    <div class="shell support-band__inner">
      <h2><span class="support-band__icon">${emblem('church')}</span>${t.support}</h2>
      <p>${t.supportTeaser}</p>
      ${siteLink(site, site.route(lang, 'support'), t.supportAction, 'button button--on-dark')}
    </div>
  </section>`;
}

export function homePage(site, lang, t) {
  return html`${hero(site, lang, t)}${quickLinks(site, lang, t)}${services(site, lang, t)}${calendarWindow(site, lang, t)}${gpmBand(site, lang, t)}${photos(site, lang, t)}${visit(site, lang, t)}${social(site, lang, t)}${explore(site, lang, t)}${support(site, lang, t)}`;
}
