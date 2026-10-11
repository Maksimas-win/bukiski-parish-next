import { upcomingEvents } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon, socialHandle, socialIcon } from '../icons.mjs';
import { copyButton, externalLink, phoneLink, scheduleData, scheduleStatus, serviceRow, siteLink } from '../components.mjs';

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
      <p class="hero__kicker">${t.heroKicker}</p>
      <h1 id="hero-title" class="hero__title">${t.name}</h1>
      <p class="hero__place">${t.heroPlace}</p>
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

/** Four tiles over the bottom edge of the photograph: what visitors need first. */
function quickLinks(site, lang, t) {
  const { phone, phoneDisplay, address } = site.settings;
  const tiles = [
    { href: site.url(site.route(lang, 'schedule')), icon: 'calendar', title: t.schedule, note: t.quickScheduleNote },
    { href: site.url(site.route(lang, 'notes')), icon: 'message', title: t.notes, note: t.quickNotesNote },
    { href: site.url(site.route(lang, 'contacts')), icon: 'pin', title: t.directions, note: address.split(',').slice(0, 2).join(',') },
    { href: `tel:${phone}`, icon: 'phone', title: t.call, note: phoneDisplay }
  ];
  return html`<nav class="shell quick" aria-label="${t.quickTitle}">
    <ul class="quick__list">
      ${tiles.map(tile => html`<li><a class="quick__tile" href="${tile.href}">
        <span class="quick__icon">${icon(tile.icon)}</span>
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
  return html`<section class="services-band" aria-labelledby="services-title">
    <div class="shell services"${scheduleData(site, lang, t)} data-limit="${VISIBLE_SERVICES}">
      <div class="services__head">
        ${sectionTitle('services-title', t.eyebrowServices, t.next)}
        ${siteLink(site, site.route(lang, 'schedule'), html`${t.allServices}${icon('arrow-right')}`, 'link link--arrow')}
      </div>
      <ol class="service-list service-list--featured" data-service-list>
        ${events.map((event, index) => serviceRow(site, lang, t, event, { hidden: index >= VISIBLE_SERVICES, next: index === 0 }))}
      </ol>
      <p${attrs({ 'data-empty': true, hidden: events.length > 0 })}>${t.empty}</p>
      <div class="services__foot">
        <p>${t.regular}</p>
        ${scheduleStatus(site, lang, t)}
      </div>
    </div>
  </section>`;
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
    <ul class="social-cards">
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
    </ul>
  </section>`;
}

function explore(site, lang, t) {
  const cards = [['notes', 'notesTeaser', 'message'], ['history', 'historyTeaser', 'church'], ['gallery', 'galleryTeaser', 'photo'], ['library', 'libraryTeaser', 'book']];
  return html`<section class="shell explore" aria-labelledby="explore-title">
    <div class="section-head">
      <div>
        ${sectionTitle('explore-title', t.eyebrowExplore, t.discover)}
        <p class="section-head__note">${t.discoverIntro}</p>
      </div>
      ${siteLink(site, site.route(lang, 'news'), html`${t.news}${icon('arrow-right')}`, 'link link--arrow')}
    </div>
    <ul class="link-cards">
      ${cards.map(([id, teaser, symbol]) => html`<li class="link-card">
        <span class="link-card__badge">${icon(symbol)}</span>
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
      <h2><span class="support-band__icon">${icon('church')}</span>${t.support}</h2>
      <p>${t.supportTeaser}</p>
      ${siteLink(site, site.route(lang, 'support'), t.supportAction, 'button button--on-dark')}
    </div>
  </section>`;
}

export function homePage(site, lang, t) {
  return html`${hero(site, lang, t)}${quickLinks(site, lang, t)}${services(site, lang, t)}${photos(site, lang, t)}${visit(site, lang, t)}${social(site, lang, t)}${explore(site, lang, t)}${support(site, lang, t)}`;
}
