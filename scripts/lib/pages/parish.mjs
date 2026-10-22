// Core sections with editorial text: contacts, history, sacraments, gallery, support, privacy.
import { WEB_UI } from '../../../assets/js/assistant/web-i18n.js';

import { html, attrs } from '../html.mjs';
import { icon, emblem } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { churchImage, copyButton, externalLink, pageHead, phoneLink, siteLink, socialCards } from '../components.mjs';
import { sacramentCards } from './sacrament.mjs';

/** «Сверено с приходским сайтом: 10 октября 2026 г.» */
const reviewed = (site, lang, t, sourceUrl) => html`<p class="hint meta-row"><span>${t.checked}: <time datetime="${site.settings.reviewedOn}">${formatDate(lang, `${site.settings.reviewedOn}T12:00:00Z`, { dateStyle: 'long' })}</time></span>${externalLink(t, sourceUrl, t.source)}</p>`;

/** Parish social-media links as they appear on the parish's own site. */
/** Who to contact: the rector, phone and WhatsApp, as published on bukiski-hram.net. */
function rectorCard(site, lang, t) {
  const { rector, phone, phoneDisplay, whatsapp } = site.settings;
  return html`<article class="card card--tinted rector">
    <p class="rector__role">${t.rector}</p>
    <h2 class="rector__name">${rector.name[lang]}</h2>
    <p>${t.rectorContact}</p>
    <div class="actions">
      <a class="button with-icon" href="tel:${phone}">${icon('phone')}<span class="nowrap">${phoneDisplay}</span></a>
      ${externalLink(t, whatsapp, html`${icon('message')}${t.whatsapp}`, 'button button--quiet')}
    </div>
    <p class="hint">${externalLink(t, rector.url, t.rectorSite)}</p>
  </article>`;
}

export function contactsPage(site, lang, t) {
  const { settings } = site;
  const { latitude, longitude, addressParts } = settings;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude}%2C${longitude}`;

  return html`${pageHead({ title: t.contacts, intro: t.contactIntro, site, page: 'contacts', t })}
  <section class="shell contact">
    <div class="contact__details" itemscope itemtype="https://schema.org/Church">
      <h2 itemprop="name">${t.name}</h2>
      <dl class="facts">
        <div>
          <dt>${t.addressLabel}</dt>
          <dd><address itemprop="address" itemscope itemtype="https://schema.org/PostalAddress"><span itemprop="streetAddress">${addressParts.street}</span>, <span itemprop="addressLocality">${addressParts.locality}</span>, <span itemprop="postalCode">${addressParts.postalCode}</span>, <span itemprop="addressCountry">${addressParts.country}</span></address>${copyButton(t, settings.address, t.addressLabel)}</dd>
        </div>
        <div>
          <dt>${t.phoneLabel}</dt>
          <dd><a class="facts__phone" itemprop="telephone" href="tel:${settings.phone}">${settings.phoneDisplay}</a>${copyButton(t, settings.phone, t.phoneLabel)}</dd>
        </div>
      </dl>
      <span itemprop="geo" itemscope itemtype="https://schema.org/GeoCoordinates"><meta itemprop="latitude" content="${latitude}"><meta itemprop="longitude" content="${longitude}"></span>
      <div class="actions">
        ${externalLink(t, routeUrl, html`${icon('route')}${t.route}`, 'button')}
        ${externalLink(t, mapUrl, t.map, 'button button--quiet')}
        ${siteLink(site, '/assets/parish.vcf', html`${icon('contact')}${t.saveContact}`, 'button button--quiet')}
      </div>
      <p class="contact__hours">${icon('clock')}<span>${t.openHours.replace('{time}', settings.openFrom)}</span></p>
      <p class="hint">${t.mapPrivacy}</p>
      ${reviewed(site, lang, t, settings.links.contactsSource)}
    </div>
    <figure class="contact__photo">
      ${churchImage(site, t, { className: 'photo', sizes: '(max-width: 860px) 100vw, 46vw' })}
      <figcaption>${addressParts.street}, ${addressParts.locality}</figcaption>
    </figure>
  </section>
  <section class="shell contact-social" aria-labelledby="contact-social-title">
    <div class="section-title">
      <p class="eyebrow">${t.eyebrowSocial}</p>
      <h2 id="contact-social-title">${t.social}</h2>
    </div>
    <p class="section-head__note">${t.socialIntro}</p>
    ${socialCards(site, t)}
  </section>
  <section class="shell card-grid card-grid--two contact-more" aria-labelledby="transport-title">
    <article class="card">
      <h2 id="transport-title" class="card__title">${icon('bus')}${t.transport}</h2>
      <p>${t.transportIntro}</p>
      <h3 class="with-icon-line">${icon('bus')}<span>${t.buses}</span></h3>
      <ul class="bus-list">
        ${settings.transport.buses.map(bus => html`<li><span class="bus-list__number">${bus.number}</span>${externalLink(t, bus.url, bus.route)}</li>`)}
      </ul>
      <p><strong>${t.busStop}:</strong> ${settings.transport.stop}</p>
      <h3 class="with-icon-line">${icon('car')}<span>${t.byCar}</span></h3>
      <p>${t.byCarText}</p>
      <p class="actions">${settings.links.transport.map(link => externalLink(t, link.url, link.label))}</p>
    </article>
    ${rectorCard(site, lang, t)}
  </section>`;
}

/**
 * @param {object[]} articles the parish's own history articles from the old site
 */
export function historyPage(site, lang, t, archivePath, articles = []) {
  const story = [...site.stories.values()][0];
  const storyEntry = story && articles.find(entry => entry.url === story.source);
  const others = articles.filter(entry => entry !== storyEntry);
  return html`${pageHead({ title: t.historyHeading, intro: t.historyIntro, site, page: 'history', t })}
  <section class="shell history">
    <figure class="history__photo">
      ${churchImage(site, t, { className: 'photo', sizes: '(max-width: 860px) 100vw, 46vw' })}
      <figcaption>${t.name}, ${site.settings.addressParts.locality}</figcaption>
    </figure>
    <ol class="timeline">
      ${t.timeline.map(([year, title, text]) => html`<li>
        <span class="timeline__year">${year}</span>
        <div><h2>${title}</h2><p>${text}</p></div>
      </li>`)}
    </ol>
  </section>
  <section class="shell prose prose--narrow">
    <p class="hint">${t.timelineSource}</p>
    <p>${externalLink(t, site.settings.links.historicalSource, t.historicalSource)}</p>
    ${archivePath && html`<p>${siteLink(site, archivePath, t.archiveOriginal)}</p>`}
  </section>
  ${storyEntry && storyFeature(site, story, storyEntry.target, t)}
  ${others.length > 0 && html`<section class="shell history-more" aria-labelledby="history-more">
    <div class="section-title">
      <p class="eyebrow">${t.pageEyebrows.history}</p>
      <h2 id="history-more">${t.historyMore}</h2>
    </div>
    <ul class="link-cards">
      ${others.map(entry => html`<li class="link-card" data-tilt>
        <span class="link-card__badge">${emblem('book')}</span>
        <h3 lang="${entry.language}"><a href="${site.url(entry.target)}">${displayTitle(site, entry)}</a></h3>
        <p lang="${entry.language}">${entry.description}</p>
        <span class="link-card__arrow">${icon('arrow-right')}</span>
      </li>`)}
      <li class="link-card" data-tilt>
        <span class="link-card__badge">${emblem('photo')}</span>
        <h3><a href="${site.url(site.route(lang, 'gallery'))}">${t.gallery}</a></h3>
        <p>${t.galleryTeaser}</p>
        <span class="link-card__arrow">${icon('arrow-right')}</span>
      </li>
    </ul>
  </section>`}`;
}

/**
 * The old site builder stored SEO strings as page titles; the article's own
 * first heading (verbatim from the source) reads better on a card.
 */
function displayTitle(site, entry) {
  const story = site.stories.get(entry.url);
  if (story) return story.title;
  return entry.page?.blocks?.find(block => block.tag === 'h1')?.text || entry.title;
}

/** A large card leading to the illustrated history, with a photograph of the ruined church. */
function storyFeature(site, story, target, t) {
  const photo = story.restoration.photos.find(candidate => candidate.id === story.restoration.before);
  return html`<section class="shell story-feature" aria-labelledby="story-feature-title">
    <a class="story-feature__card" href="${site.url(target)}">
      <img${attrs({ class: 'story-feature__photo', src: site.url(`/${photo.web}`), width: photo.width, height: photo.height, loading: 'lazy', decoding: 'async', alt: '' })}>
      <span class="story-feature__shade" aria-hidden="true"></span>
      <span class="story-feature__text">
        <span class="eyebrow eyebrow--light">${t.restoration}</span>
        <span id="story-feature-title" class="story-feature__title" lang="ru">${story.title}</span>
        <span class="story-feature__subtitle" lang="ru">${story.subtitle}</span>
        <span class="story-feature__go">${t.historyMore}${icon('arrow-right')}</span>
      </span>
    </a>
  </section>`;
}

/** Icons for t.sacramentItems, in their order: baptism, confession and communion, wedding, commemoration. */
const SACRAMENT_ICONS = ['font', 'chalice', 'rings', 'candle'];

export function sacramentsPage(site, lang, t) {
  return html`${pageHead({ title: t.sacraments, intro: t.sacramentsIntro, site, page: 'sacraments', t })}
  <section class="shell card-grid card-grid--two">
    ${t.sacramentItems.map(([heading, text], index) => html`<article class="card card--icon" data-tilt><span class="card__badge">${emblem(SACRAMENT_ICONS[index] || 'church')}</span><h2>${heading}</h2><p>${text}</p></article>`)}
  </section>
  ${sacramentCards(site, lang, t)}
  <section class="shell services-grid">
    <article class="card">
      <h2 class="card__title">${icon('candle')}${t.commemorations}</h2>
      <p>${t.commemorationsIntro}</p>
      <dl class="term-list">
        ${t.commemorationItems.map(([term, text]) => html`<div><dt>${term}</dt><dd>${text}</dd></div>`)}
      </dl>
      <p class="actions">${siteLink(site, site.route(lang, 'notes'), html`${icon('send')}${t.notes}`, 'button')}</p>
    </article>
    <article class="card">
      <h2 class="card__title">${icon('calendar')}${t.byArrangement}</h2>
      <p>${t.byArrangementIntro}</p>
      <ul class="tag-list">${t.byArrangementItems.map(item => html`<li>${item}</li>`)}</ul>
    </article>
    ${rectorCard(site, lang, t)}
  </section>`;
}

/** Photographs of the church and parish life, from content/photos.json. */
export function galleryPage(site, lang, t) {
  const photos = site.photos.gallery;
  return html`${pageHead({ title: t.gallery, intro: t.galleryIntro, site, page: 'gallery', t })}
  <section class="shell photo-grid">
    ${photos.map(photo => html`<figure class="photo-grid__item${photo.height > photo.width ? ' is-tall' : ''}">
      <a href="${site.url(`/${photo.web}`)}" data-lightbox data-width="${photo.width}" data-height="${photo.height}" aria-label="${t.imageOpen}: ${photo.caption[lang]}">
        <img src="${site.url(`/${photo.thumb}`)}" width="${photo.thumbWidth}" height="${photo.thumbHeight}" loading="lazy" decoding="async" alt="${photo.caption[lang]}">
      </a>
      <figcaption>${photo.caption[lang]}</figcaption>
    </figure>`)}
  </section>`;
}

export function supportPage(site, lang, t) {
  const { settings } = site;
  const fact = (label, value, copyValue = value, symbol) => html`<div class="requisites__row">
    <dt><span class="requisites__icon">${icon(symbol)}</span>${label}</dt>
    <dd><span class="requisites__value">${value}</span>${copyButton(t, copyValue ?? value, label)}</dd>
  </div>`;

  return html`${pageHead({ title: t.support, intro: t.supportIntro, site, page: 'support', t })}
  <section class="shell support-layout">
    <article class="requisites" aria-labelledby="requisites-title">
      <h2 id="requisites-title">${t.supportAction}</h2>
      <dl class="requisites__list">
        ${fact(t.recipient, settings.legalName, undefined, 'user')}
        ${fact(t.bank, settings.iban, settings.iban.replace(/\s/g, ''), 'bank')}
        ${fact(t.orgCode, settings.organizationCode, undefined, 'id')}
      </dl>
      ${reviewed(site, lang, t, settings.links.supportSource)}
    </article>
    <article class="card card--icon">
      <span class="card__badge">${emblem('heart')}</span>
      <h2>${t.gpm}</h2>
      <p>${t.gpmNote}</p>
      <p class="actions">
        ${externalLink(t, settings.links.vmi, 'VMI', 'button button--quiet')}
        ${siteLink(site, `/${lang}/gpm.html`, t.archiveOriginal)}
      </p>
    </article>
  </section>`;
}

export function privacyPage(site, lang, t) {
  const onGitHubPages = new URL(site.origin).hostname.endsWith('.github.io');
  return html`${pageHead({ title: t.privacy, intro: t.privacyIntro, site, page: 'privacy', t })}
  <section class="shell prose prose--narrow">
    ${onGitHubPages && html`<p>${t.githubHosting} ${externalLink(t, site.settings.links.githubPrivacy, t.hostingPolicy)}</p>`}
    ${t.privacyItems.map(([heading, text]) => html`<h2>${heading}</h2><p>${text}</p>`)}
    <h2>${WEB_UI[lang].ai} · ${WEB_UI[lang].request}</h2>
    <p>${WEB_UI[lang].policy}</p>
  </section>`;
}

export function notFoundPage(site, t) {
  return html`${pageHead({ title: t.notFound, intro: t.notFoundText })}
  <div class="shell callout">
    ${siteLink(site, '/ru/', t.home, 'button')}
    ${siteLink(site, '/ru/library.html', t.library, 'button button--quiet')}
  </div>`;
}

