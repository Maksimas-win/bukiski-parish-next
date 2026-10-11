import { upcomingEvents } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
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
      <p class="hero__links">
        ${siteLink(site, site.route(lang, 'schedule'), html`${icon('calendar')}${t.allServices}`, 'hero__link')}
        ${siteLink(site, site.route(lang, 'contacts'), html`${icon('pin')}${t.directions}`, 'hero__link')}
      </p>
    </div>
  </section>`;
}

/** A few photographs of parish life, leading to the gallery. */
function photos(site, lang, t) {
  const byId = new Map(site.photos.gallery.map(photo => [photo.id, photo]));
  const chosen = site.photos.homeMosaic.map(id => byId.get(id));
  if (chosen.some(photo => !photo)) throw new Error('photos.json: homeMosaic names a photo that is not in the gallery');
  return html`<section class="shell home-photos" aria-labelledby="photos-title">
    <div class="section-head">
      <h2 id="photos-title">${t.gallery}</h2>
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
        <h2 id="services-title">${t.next}</h2>
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
  return html`<section class="shell first-visit">
    <div class="first-visit__intro">
      <h2>${t.welcome}</h2>
      <p class="lead">${t.welcomeIntro}</p>
      <ul class="check-list">
        ${t.welcomeSteps.map(step => html`<li>${step}</li>`)}
      </ul>
    </div>
    <aside class="visit-card" aria-labelledby="visit-title">
      <h3 id="visit-title">${t.directions}</h3>
      <p class="visit-card__address">${icon('pin')}<span>${settings.address}</span>${copyButton(t, settings.address, t.addressLabel)}</p>
      <div class="actions">
        ${externalLink(t, routeUrl, t.route, 'button')}
        ${phoneLink(site, t, 'button button--quiet')}
      </div>
      <p class="hint">${t.openHours.replace('{time}', settings.openFrom)}</p>
      <h3 class="visit-card__social">${t.social}</h3>
      <p class="chips">${settings.social.map(item => externalLink(t, item.url, item.label, 'chip chip--link'))}</p>
    </aside>
  </section>`;
}

function explore(site, lang, t) {
  const cards = [['notes', 'notesTeaser'], ['history', 'historyTeaser'], ['gallery', 'galleryTeaser'], ['library', 'libraryTeaser']];
  return html`<section class="shell explore" aria-labelledby="explore-title">
    <div class="section-head">
      <div>
        <h2 id="explore-title">${t.discover}</h2>
        <p class="section-head__note">${t.discoverIntro}</p>
      </div>
      ${siteLink(site, site.route(lang, 'news'), html`${t.news}${icon('arrow-right')}`, 'link link--arrow')}
    </div>
    <ul class="link-cards">
      ${cards.map(([id, teaser]) => html`<li class="link-card">
        <h3><a href="${site.url(site.route(lang, id))}">${t[id]}</a></h3>
        <p>${t[teaser]}</p>
        ${icon('arrow-right')}
      </li>`)}
    </ul>
  </section>`;
}

function support(site, lang, t) {
  return html`<section class="support-band">
    <div class="shell support-band__inner">
      <h2>${t.support}</h2>
      <p>${t.supportTeaser}</p>
      ${siteLink(site, site.route(lang, 'support'), t.supportAction, 'button button--on-dark')}
    </div>
  </section>`;
}

export function homePage(site, lang, t) {
  return html`${hero(site, lang, t)}${services(site, lang, t)}${photos(site, lang, t)}${visit(site, lang, t)}${explore(site, lang, t)}${support(site, lang, t)}`;
}
