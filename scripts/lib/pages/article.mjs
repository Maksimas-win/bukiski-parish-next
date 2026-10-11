// A preserved article from one of the old sites.
// Source markup never reaches the page: only its text, re-wrapped in a small
// set of known elements, and images kept in the local archive.

import { documentPath } from '../../../assets/js/document-data.js';
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { externalLink, siteLink } from '../components.mjs';
import { articleCard, LANGUAGE_NAMES } from './library.mjs';
import { storyPage } from './story.mjs';

/** Articles with at least this many sections get a table of contents. */
const MIN_TOC_HEADINGS = 3;

const HEADING_LEVELS = { h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4' };
const LIST_ITEMS = { li: 'ul', dt: 'dl', dd: 'dl' };

const NUMBERED_TITLE = /^\d{1,2}\.\s+\S/;
const MAX_TITLE_LENGTH = 110;

/**
 * The old site builder often stored section titles as plain paragraphs:
 * «1. Евхаристия — встреча с Христом». A paragraph is treated as a section
 * title only when it is short, numbered, not a sentence, not part of a run of
 * numbered lines (a list), and the article has at least two such paragraphs.
 * The text itself is never changed.
 */
function numberedTitles(blocks) {
  const isNumbered = block => block?.tag === 'p' && NUMBERED_TITLE.test(block.text);
  const found = new Set();
  blocks.forEach((block, index) => {
    const text = block.text.trim();
    if (isNumbered(block) && text.length <= MAX_TITLE_LENGTH && !/[.!?…;,]$/.test(text) && !isNumbered(blocks[index + 1])) found.add(index);
  });
  return found.size >= 2 ? found : new Set();
}

/** Re-wraps extracted text blocks, restoring lists and heading levels. */
export function renderBlocks(blocks, title) {
  const out = [];
  const headings = [];
  const titles = numberedTitles(blocks);
  // Next to real headings the numbered titles are subsections.
  const titleLevel = blocks.some(block => /^h[2-6]$/.test(block.tag)) ? 'h3' : 'h2';
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    const list = LIST_ITEMS[block.tag];
    if (list) {
      // Consecutive items of one kind were a single list in the source.
      const items = [];
      while (index < blocks.length && LIST_ITEMS[blocks[index].tag] === list) {
        const item = blocks[index];
        items.push(html`<${item.tag}>${item.text}</${item.tag}>`);
        index += 1;
      }
      out.push(html`<${list}>${items}</${list}>`);
      continue;
    }
    index += 1;
    const level = titles.has(index - 1) ? titleLevel : HEADING_LEVELS[block.tag];
    if (level) {
      // The page title is already the <h1>.
      if (block.tag === 'h1' && block.text.trim() === title) continue;
      if (level === 'h2') {
        const id = `s-${headings.length + 1}`;
        headings.push({ id, text: block.text });
        out.push(html`<h2 id="${id}" tabindex="-1">${block.text}</h2>`);
      } else {
        out.push(html`<${level}>${block.text}</${level}>`);
      }
    } else if (block.tag === 'blockquote') {
      out.push(html`<blockquote><p>${block.text}</p></blockquote>`);
    } else if (block.tag === 'figcaption') {
      out.push(html`<p class="caption">${block.text}</p>`);
    } else {
      out.push(html`<p>${block.text}</p>`);
    }
  }
  return { body: out, headings };
}

function documentRegion(t) {
  return attrs({
    'data-document-region': true,
    'data-document-loading': t.documentLoading,
    'data-document-ready': t.documentReady,
    'data-document-error': t.documentError
  });
}

/** Documents and other preserved articles that the source page linked to. */
function references(site, catalog, entry, t, uiLocale) {
  const items = new Map();
  for (const ref of site.sourceLinks) {
    if (ref.from !== entry.url || !ref.label || items.has(ref.to)) continue;
    const document = site.documents.find(candidate => candidate.source === ref.to);
    const related = catalog.byUrl.get(ref.to);
    if (document?.local) {
      const type = document.local.split('.').at(-1).toUpperCase();
      // In envelope mode the browser fetches the download page and saves the original file.
      items.set(ref.to, html`<a${attrs({ href: site.url(documentPath(document, uiLocale)), 'data-document-download': site.documentDelivery === 'envelope', rel: 'nofollow' })}>${ref.label} <span class="file-type">${type}</span></a>`);
    } else if (document) {
      const blankForm = /бланк.*записк|записк.*бланк/i.test(ref.label);
      items.set(ref.to, html`${externalLink(t, ref.to, ref.label)} <span class="hint">${t.documentUnavailable}</span>${blankForm && html` ${siteLink(site, site.route(uiLocale, 'notes'), t.notes)}`}`);
    } else if (related && related.ownsTarget && related.url !== entry.url) {
      items.set(ref.to, siteLink(site, related.target, ref.label));
    }
  }
  if (!items.size) return '';
  return html`<aside class="references" lang="${uiLocale}"${documentRegion(t)}>
    <h2>${t.references}</h2>
    <ul>${[...items.values()].map(item => html`<li>${item}</li>`)}</ul>
    <p class="hint" data-document-status role="status" aria-live="polite"></p>
  </aside>`;
}

function figure(site, image, { className, eager = false, zoomLabel }) {
  return html`<figure class="${className}">
    <a${attrs({ href: site.url(`/${image.web}`), 'data-lightbox': true, 'data-width': image.width, 'data-height': image.height, 'aria-label': zoomLabel })}>
      <img${attrs({ src: site.url(`/${image.web}`), width: image.width, height: image.height, loading: eager ? 'eager' : 'lazy', decoding: 'async', alt: image.alt })}>
    </a>
  </figure>`;
}

export function lightboxDialog(t, uiLocale) {
  return html`<dialog class="lightbox" id="lightbox" lang="${uiLocale}" aria-label="${t.gallery}">
    <button type="button" class="icon-button lightbox__close" data-dialog-close aria-label="${t.close}">${icon('close')}</button>
    <button type="button" class="icon-button lightbox__step lightbox__step--previous" data-lightbox-previous aria-label="${t.imagePrevious}">${icon('chevron-left')}</button>
    <img class="lightbox__image" data-lightbox-image alt="">
    <button type="button" class="icon-button lightbox__step lightbox__step--next" data-lightbox-next aria-label="${t.imageNext}">${icon('chevron-right')}</button>
  </dialog>`;
}

/**
 * @param {object} options
 * @param {object[]} [options.related] other articles offered at the end
 * @param {boolean} [options.archiveOnly] true for old wording of a rewritten core page
 */
export function articlePage(site, catalog, entry, t, uiLocale, { related = [], archiveOnly = false } = {}) {
  const story = site.stories.get(entry.url);
  if (story && !archiveOnly) return storyPage(site, story, entry, t, uiLocale);
  const { page } = entry;
  const { body, headings } = renderBlocks(page.blocks, entry.title);
  const showContents = headings.length >= MIN_TOC_HEADINGS;
  const languageName = LANGUAGE_NAMES[entry.language] || entry.language.toUpperCase();

  return html`<article class="article" data-article>
    <header class="article__head shell" lang="${uiLocale}">
      <p class="article__crumb">${siteLink(site, site.route(uiLocale, 'library'), html`${icon('chevron-left')}${t.library}`, 'link link--back')}</p>
      <h1 lang="${entry.language}">${entry.title}</h1>
      <ul class="article__meta">
        <li><span class="badge">${languageName}</span></li>
        ${entry.publishedAt && html`<li>${t.published} <time datetime="${entry.publishedAt}">${formatDate(uiLocale, entry.publishedAt, { dateStyle: 'long' })}</time></li>`}
        <li>${icon('clock')}${t.readingTime.replace('{n}', entry.minutes)}</li>
        <li><button${attrs({ type: 'button', class: 'link link--button', 'data-share': true, 'data-share-title': entry.title, 'data-label-copied': t.linkCopied, hidden: true })}>${icon('share')}${t.share}</button></li>
      </ul>
    </header>
    ${entry.cover && html`<div class="shell">${figure(site, entry.cover, { className: 'article__cover', eager: true, zoomLabel: t.imageOpen })}</div>`}
    <div class="shell article__layout${showContents ? ' has-contents' : ''}">
      ${showContents && html`<nav class="contents" lang="${uiLocale}" aria-labelledby="contents-title" data-contents>
        <h2 id="contents-title">${t.contents}</h2>
        <ol>${headings.map(heading => html`<li><a href="#${heading.id}" lang="${entry.language}">${heading.text}</a></li>`)}</ol>
      </nav>`}
      <div class="prose article__body" lang="${entry.language}">
        <aside class="notice notice--archive" lang="${uiLocale}">
          <p>${t.archiveNotice}</p>
          <p class="meta-row">${externalLink(t, entry.url, `${t.source}: ${entry.host}`)}<span>${t.savedOn}: <time datetime="${page.fetchedOn}">${formatDate(uiLocale, `${page.fetchedOn}T12:00:00Z`, { dateStyle: 'long' })}</time></span></p>
        </aside>
        ${body}
        ${references(site, catalog, entry, t, uiLocale)}
        ${entry.gallery.length > 0 && html`<div class="gallery">${entry.gallery.map(image => figure(site, image, { className: 'gallery__item', zoomLabel: t.imageOpen }))}</div>`}
      </div>
    </div>
    ${!archiveOnly && related.length > 0 && html`<footer class="shell article__more" lang="${uiLocale}">
      <h2>${t.readAlso}</h2>
      <ul class="article-grid">${related.map(other => articleCard(site, uiLocale, t, other, 'h3'))}</ul>
    </footer>`}
  </article>
  <progress class="reading-progress" max="100" value="0" data-reading-progress hidden aria-hidden="true"></progress>
  <button type="button" class="icon-button to-top" data-to-top hidden aria-label="${t.backToTop}" title="${t.backToTop}" lang="${uiLocale}">${icon('arrow-up')}</button>`;
}
