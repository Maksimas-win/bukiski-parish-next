// Core sections with editorial text: contacts, history, sacraments, gallery, support, privacy.

import { html } from '../html.mjs';
import { icon } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { churchImage, copyButton, externalLink, pageHead, phoneLink, siteLink } from '../components.mjs';

/** «Сверено с приходским сайтом: 10 октября 2026 г.» */
const reviewed = (site, lang, t, sourceUrl) => html`<p class="hint meta-row"><span>${t.checked}: <time datetime="${site.settings.reviewedOn}">${formatDate(lang, `${site.settings.reviewedOn}T12:00:00Z`, { dateStyle: 'long' })}</time></span>${externalLink(t, sourceUrl, t.source)}</p>`;

/** Parish social-media links as they appear on the parish's own site. */
export function socialLinks(site, t, className = 'chip chip--link') {
  return site.settings.social.map(item => externalLink(t, item.url, item.label, className));
}

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

  return html`${pageHead({ title: t.contacts, intro: t.contactIntro })}
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
      <p class="hint">${t.mapPrivacy}</p>
      ${reviewed(site, lang, t, settings.links.contactsSource)}
    </div>
    <figure class="contact__photo">
      ${churchImage(site, t, { className: 'photo', sizes: '(max-width: 860px) 100vw, 46vw' })}
      <figcaption>${addressParts.street}, ${addressParts.locality}</figcaption>
    </figure>
  </section>
  <section class="shell card-grid card-grid--two">
    ${rectorCard(site, lang, t)}
    <article class="card">
      <h2>${t.social}</h2>
      <p>${t.socialIntro}</p>
      <p class="chips">${socialLinks(site, t)}</p>
      <p class="hint with-icon-line">${icon('door')}<span>${t.openHours.replace('{time}', settings.openFrom)}</span></p>
    </article>
  </section>
  <section class="shell card-grid card-grid--two" aria-labelledby="transport-title">
    <article class="card">
      <h2 id="transport-title">${t.transport}</h2>
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
    <article class="card">
      <h2>${t.entryAccess}</h2>
      <p>${t.entryAccessText}</p>
      <p class="actions">${phoneLink(site, t, 'link')}</p>
    </article>
  </section>`;
}

/**
 * @param {object[]} articles the parish's own history articles from the old site
 */
export function historyPage(site, lang, t, archivePath, articles = []) {
  return html`${pageHead({ title: t.historyHeading, intro: t.historyIntro })}
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
  ${articles.length > 0 && html`<section class="shell" aria-labelledby="history-more">
    <h2 id="history-more" class="section-title">${t.historyMore}</h2>
    <ul class="link-cards">
      ${articles.map(entry => html`<li class="link-card">
        <h3 lang="${entry.language}"><a href="${site.url(entry.target)}">${entry.title}</a></h3>
        <p lang="${entry.language}">${entry.description}</p>
        ${icon('arrow-right')}
      </li>`)}
      <li class="link-card">
        <h3><a href="${site.url(site.route(lang, 'gallery'))}">${t.gallery}</a></h3>
        <p>${t.galleryTeaser}</p>
        ${icon('arrow-right')}
      </li>
    </ul>
  </section>`}`;
}

export function sacramentsPage(site, lang, t) {
  return html`${pageHead({ title: t.sacraments, intro: t.sacramentsIntro })}
  <section class="shell card-grid card-grid--two">
    ${t.sacramentItems.map(([heading, text]) => html`<article class="card"><h2>${heading}</h2><p>${text}</p></article>`)}
  </section>
  <section class="shell services-grid">
    <article class="card">
      <h2>${t.commemorations}</h2>
      <p>${t.commemorationsIntro}</p>
      <dl class="term-list">
        ${t.commemorationItems.map(([term, text]) => html`<div><dt>${term}</dt><dd>${text}</dd></div>`)}
      </dl>
      <p class="actions">${siteLink(site, site.route(lang, 'notes'), html`${icon('send')}${t.notes}`, 'button')}</p>
    </article>
    <article class="card">
      <h2>${t.byArrangement}</h2>
      <p>${t.byArrangementIntro}</p>
      <ul class="tag-list">${t.byArrangementItems.map(item => html`<li>${item}</li>`)}</ul>
    </article>
    ${rectorCard(site, lang, t)}
  </section>`;
}

/** Real photographs of the church from the parish's own sites, with their true sizes. */
export const GALLERY = [
  'assets/img/archive/7eb2b9b214ea663b.jpg',
  'assets/img/archive/10323076ba321c90.jpg',
  'assets/img/archive/36abc63c17718008.jpg',
  'assets/img/archive/f2ede969c68e242b.jpg',
  'assets/img/archive/a8a1bf916537e3bd.jpg',
  'assets/img/archive/2b50e91560d5deff.jpg'
];

export function galleryPage(site, lang, t) {
  const photos = GALLERY.map((local, index) => ({ ...site.imageManifest[local], caption: t.galleryCaptions[index] }));
  if (photos.some(photo => !photo.web) || t.galleryCaptions.length !== GALLERY.length) throw new Error('Gallery photos and captions are out of step');
  return html`${pageHead({ title: t.gallery, intro: t.galleryIntro })}
  <section class="shell photo-grid">
    ${photos.map(photo => html`<figure class="photo-grid__item${photo.height > photo.width ? ' is-tall' : ''}">
      <a href="${site.url(`/${photo.web}`)}" data-lightbox data-width="${photo.width}" data-height="${photo.height}" aria-label="${t.imageOpen}: ${photo.caption}">
        <img src="${site.url(`/${photo.thumb}`)}" width="${photo.thumbWidth}" height="${photo.thumbHeight}" loading="lazy" decoding="async" alt="${photo.caption}">
      </a>
      <figcaption>${photo.caption}</figcaption>
    </figure>`)}
  </section>`;
}

export function supportPage(site, lang, t) {
  const { settings } = site;
  const fact = (label, value, copyValue = value) => html`<div>
    <dt>${label}</dt>
    <dd><span class="facts__value">${value}</span>${copyButton(t, copyValue, label)}</dd>
  </div>`;

  return html`${pageHead({ title: t.support, intro: t.supportIntro })}
  <section class="shell card-grid card-grid--two">
    <article class="card card--tinted">
      <dl class="facts">
        ${fact(t.recipient, settings.legalName)}
        ${fact(t.bank, settings.iban, settings.iban.replace(/\s/g, ''))}
        ${fact(t.orgCode, settings.organizationCode)}
      </dl>
      ${reviewed(site, lang, t, settings.links.supportSource)}
    </article>
    <article class="card">
      <h2>${t.gpm}</h2>
      <p>${t.gpmNote}</p>
      <p class="actions">
        ${externalLink(t, settings.links.vmi, 'VMI')}
        ${siteLink(site, `/${lang}/gpm.html`, t.archiveOriginal)}
      </p>
    </article>
  </section>`;
}

export function privacyPage(site, lang, t) {
  const onGitHubPages = new URL(site.origin).hostname.endsWith('.github.io');
  return html`${pageHead({ title: t.privacy, intro: t.privacyIntro })}
  <section class="shell prose prose--narrow">
    ${onGitHubPages && html`<p>${t.githubHosting} ${externalLink(t, site.settings.links.githubPrivacy, t.hostingPolicy)}</p>`}
    ${t.privacyItems.map(([heading, text]) => html`<h2>${heading}</h2><p>${text}</p>`)}
  </section>`;
}

export function notFoundPage(site, t) {
  return html`${pageHead({ title: t.notFound, intro: t.notFoundText })}
  <div class="shell callout">
    ${siteLink(site, '/ru/', t.home, 'button')}
    ${siteLink(site, '/ru/library.html', t.library, 'button button--quiet')}
  </div>`;
}
