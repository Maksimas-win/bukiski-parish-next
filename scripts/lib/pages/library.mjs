import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { pageHead, siteLink } from '../components.mjs';

export const LANGUAGE_NAMES = { ru: 'Русский', lt: 'Lietuvių', en: 'English', pl: 'Polski', de: 'Deutsch', uk: 'Українська' };

/** Cards visible before «Показать ещё»; every card is in the HTML for readers without JavaScript. */
const PAGE_SIZE = 18;

export function articleCard(site, lang, t, entry, heading = 'h2') {
  const href = site.url(entry.target);
  return html`<li${attrs({ class: entry.cover ? 'article-card' : 'article-card article-card--text', 'data-library-item': true, 'data-language': entry.language, 'data-url': entry.target, 'data-search': `${entry.title} ${entry.description}` })}>
    ${entry.cover && html`<img${attrs({ class: 'article-card__image', src: site.url(`/${entry.cover.thumb}`), width: entry.cover.thumbWidth, height: entry.cover.thumbHeight, loading: 'lazy', decoding: 'async', alt: '' })}>`}
    <div class="article-card__body">
      <p class="article-card__meta">
        <span class="badge">${LANGUAGE_NAMES[entry.language] || entry.language.toUpperCase()}</span>
        ${entry.publishedAt && html`<time datetime="${entry.publishedAt}">${formatDate(lang, entry.publishedAt, { dateStyle: 'long' })}</time>`}
      </p>
      <${heading} class="article-card__title" lang="${entry.language}"><a href="${href}">${entry.title}</a></${heading}>
      ${entry.description && html`<p class="article-card__text" lang="${entry.language}" data-excerpt>${entry.description}</p>`}
      <p class="article-card__foot">${icon('clock')}${t.readingTime.replace('{n}', entry.minutes)}</p>
    </div>
  </li>`;
}

export function libraryPage(site, catalog, lang, t) {
  const articles = catalog.articlesFor(lang);
  const counts = new Map();
  for (const entry of articles) counts.set(entry.language, (counts.get(entry.language) || 0) + 1);
  const languages = Object.keys(LANGUAGE_NAMES).filter(code => counts.has(code));

  const labels = attrs({
    'data-library': true,
    'data-page-size': PAGE_SIZE,
    'data-index': site.url('/assets/data/search-index.json'),
    'data-label-results': t.results,
    'data-label-loading': t.searchLoading,
    'data-label-unavailable': t.searchUnavailable
  });

  return html`${pageHead({ title: t.library, intro: t.libraryTeaser, site, page: 'library', t })}
  <section class="shell library"${labels}>
    <div class="library__tools" data-library-tools hidden>
      <div class="search-field">
        <label for="library-query">${t.search}</label>
        <div class="search-field__box">
          ${icon('search')}
          <input id="library-query" type="search" placeholder="${t.searchPlaceholder}" maxlength="100" autocomplete="off" enterkeyhint="search">
        </div>
        <label class="toggle toggle--inline"><input type="checkbox" data-full-text><span>${t.searchFullText}</span></label>
      </div>
      <div class="chips" role="group" aria-label="${t.languages}">
        <button type="button" class="chip" data-language-filter="all" aria-pressed="true">${t.allLanguages} <span class="chip__count">${articles.length}</span></button>
        ${languages.map(code => html`<button type="button" class="chip" data-language-filter="${code}" aria-pressed="false" lang="${code}">${LANGUAGE_NAMES[code]} <span class="chip__count">${counts.get(code)}</span></button>`)}
      </div>
    </div>
    <p class="library__status" data-library-status role="status" aria-live="polite">${t.results}: ${articles.length}</p>
    <ul class="article-grid" data-library-list>
      ${articles.map(entry => articleCard(site, lang, t, entry))}
    </ul>
    <p class="notice" data-no-results hidden>${t.noResults}</p>
    <p class="library__more"><button type="button" class="button button--quiet" data-show-more hidden>${t.showMore}</button></p>
  </section>`;
}

export function newsPage(site, catalog, lang, t, archivePath) {
  const articles = catalog.news();
  return html`${pageHead({ title: t.news, intro: t.newsIntro, site, page: 'news', t })}
  <section class="shell library">
    <ul class="article-grid">
      ${articles.map(entry => articleCard(site, lang, t, entry))}
    </ul>
    ${archivePath && html`<p class="library__archive">${icon('book')}${siteLink(site, archivePath, t.archiveOriginal)}</p>`}
  </section>`;
}
