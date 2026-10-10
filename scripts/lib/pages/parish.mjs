// Core sections with editorial text: contacts, history, sacraments, support, privacy.

import { html } from '../html.mjs';
import { icon } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { churchImage, copyButton, externalLink, pageHead, phoneLink, siteLink } from '../components.mjs';

/** «Сверено с приходским сайтом: 10 октября 2026 г.» */
const reviewed = (site, lang, t, sourceUrl) => html`<p class="hint meta-row"><span>${t.checked}: <time datetime="${site.settings.reviewedOn}">${formatDate(lang, `${site.settings.reviewedOn}T12:00:00Z`, { dateStyle: 'long' })}</time></span>${externalLink(t, sourceUrl, t.source)}</p>`;

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
    <article class="card">
      <h2>${t.transport}</h2>
      <p>${t.transportIntro}</p>
      <p class="actions">${settings.links.transport.map(link => externalLink(t, link.url, link.label))}</p>
    </article>
    <article class="card">
      <h2>${t.entryAccess}</h2>
      <p>${t.entryAccessText}</p>
      <p class="actions">${phoneLink(site, t, 'link')}</p>
    </article>
  </section>`;
}

export function historyPage(site, lang, t, archivePath) {
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
    <p>${externalLink(t, site.settings.links.historicalSource, t.historicalSource)}</p>
    ${archivePath && html`<p>${siteLink(site, archivePath, t.archiveOriginal)}</p>`}
  </section>`;
}

export function sacramentsPage(site, lang, t) {
  return html`${pageHead({ title: t.sacraments, intro: t.sacramentsIntro })}
  <section class="shell card-grid card-grid--two">
    ${t.sacramentItems.map(([heading, text]) => html`<article class="card"><h2>${heading}</h2><p>${text}</p></article>`)}
  </section>
  <section class="shell callout">
    ${phoneLink(site, t)}
    ${siteLink(site, site.route(lang, 'notes'), t.notes, 'button button--quiet')}
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
