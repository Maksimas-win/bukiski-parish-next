import { upcomingEvents } from '../../../assets/js/domain.js';
import { html, attrs, lines } from '../html.mjs';
import { icon } from '../icons.mjs';
import { churchImage, copyButton, externalLink, phoneLink, scheduleData, scheduleStatus, serviceRow, siteLink } from '../components.mjs';

/** Rows rendered into the page; the browser shows the first few that are still ahead. */
const RENDERED_SERVICES = 8;
const VISIBLE_SERVICES = 4;

function hero(site, lang, t) {
  return html`<section class="hero shell">
    <div class="hero__copy">
      <p class="hero__kicker">${t.denomination}</p>
      <h1>${lines(t.hero)}</h1>
      <p class="lead">${t.heroIntro}</p>
      <div class="actions">
        ${siteLink(site, site.route(lang, 'schedule'), html`${icon('calendar')}${t.allServices}`, 'button')}
        ${siteLink(site, site.route(lang, 'contacts'), html`${icon('pin')}${t.directions}`, 'button button--quiet')}
      </div>
    </div>
    <figure class="hero__figure">
      ${churchImage(site, t, { className: 'hero__photo', sizes: '(max-width: 860px) 100vw, 48vw', eager: true })}
    </figure>
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
  return html`${hero(site, lang, t)}${services(site, lang, t)}${visit(site, lang, t)}${explore(site, lang, t)}${support(site, lang, t)}`;
}
