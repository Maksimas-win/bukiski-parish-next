// One page per sacrament or service: content/sacraments/<lang>.json.
// Teaching and general practice are written for every parish; the parish's own
// arrangements stay at «call the priest», because only confirmed facts go online.

import { html } from '../html.mjs';
import { icon, emblem } from '../icons.mjs';
import { pageHead, siteLink } from '../components.mjs';

/** Path of a sacrament page in a language. */
export const sacramentPath = (lang, id) => `/${lang}/sacraments/${id}.html`;

export function sacramentPage(site, lang, t, entry) {
  const { phone, phoneDisplay } = site.settings;
  const others = site.sacraments.byLang[lang].filter(candidate => candidate.id !== entry.id);
  return html`${pageHead({ title: entry.title, intro: entry.lead, kicker: t.sacraments, site, page: 'sacraments', t })}
  <div class="shell sacrament">
    <article class="sacrament__body">
      ${entry.sections.map(section => html`<section class="sacrament__section">
        <h2>${section.heading}</h2>
        ${section.text.map(paragraph => html`<p>${paragraph}</p>`)}
      </section>`)}
      <section class="sacrament__faq" aria-labelledby="faq-title">
        <h2 id="faq-title">${t.faqTitle}</h2>
        ${entry.faq.map(item => html`<details class="faq">
          <summary>${item.q}</summary>
          <p>${item.a}</p>
        </details>`)}
      </section>
    </article>
    <aside class="sacrament__aside">
      <div class="card card--tinted sacrament__contact">
        <span class="card__badge">${emblem(entry.emblem)}</span>
        <h2>${t.sacramentContact}</h2>
        <p>${t.sacramentContactIntro}</p>
        <div class="actions">
          <a class="button with-icon" href="tel:${phone}">${icon('phone')}<span class="nowrap">${phoneDisplay}</span></a>
          ${entry.id === 'commemoration' || entry.id === 'funeral' ? siteLink(site, site.route(lang, 'notes'), html`${icon('send')}${t.notes}`, 'button button--quiet') : ''}
        </div>
        <p class="hint">${t.openHours.replace('{time}', site.settings.openFrom)}</p>
      </div>
      <nav class="sacrament__others" aria-label="${t.sacramentsDetails}">
        <h2>${t.sacramentsDetails}</h2>
        <ul>
          ${others.map(other => html`<li><a href="${site.url(sacramentPath(lang, other.id))}"><span class="sacrament__mini">${emblem(other.emblem)}</span>${other.title}</a></li>`)}
        </ul>
        ${siteLink(site, site.route(lang, 'sacraments'), html`${icon('chevron-left')}${t.sacramentsBack}`, 'link link--back')}
      </nav>
    </aside>
  </div>`;
}

/** Cards linking to every sacrament page, shown on the overview page. */
export function sacramentCards(site, lang, t) {
  return html`<section class="shell sacrament-cards" aria-labelledby="sacrament-cards-title">
    <h2 id="sacrament-cards-title" class="sacrament-cards__title">${t.sacramentsDetails}</h2>
    <ul class="link-cards">
      ${site.sacraments.byLang[lang].map(entry => html`<li class="link-card" data-tilt>
        <span class="link-card__badge">${emblem(entry.emblem)}</span>
        <h3><a href="${site.url(sacramentPath(lang, entry.id))}">${entry.title}</a></h3>
        <p>${entry.lead.split('. ')[0]}.</p>
        <span class="link-card__arrow">${icon('arrow-right')}</span>
      </li>`)}
    </ul>
  </section>`;
}
