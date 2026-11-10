// Permanent editorial articles. Their dates and sources come from the parish;
// they are never labelled as imported or removed with a temporary announcement.

import { documentPath } from '../../../assets/js/document-data.js';
import { html, attrs } from '../html.mjs';
import { formatDate } from '../site.mjs';
import { icon } from '../icons.mjs';
import { externalLink, siteLink } from '../components.mjs';
import { LANGUAGE_NAMES } from './library.mjs';

/** Only emphasis is accepted as inline markup; every text fragment is escaped. */
function emphasizedText(text) {
  const pieces = text.split(/(\*\*[^*]+\*\*)/g);
  return pieces.map(piece => piece.startsWith('**') && piece.endsWith('**')
    ? html`<strong>${piece.slice(2, -2)}</strong>` : piece);
}

function articleBlocks(publication) {
  const headings = [];
  const body = [];
  const references = new Map([
    ...publication.documents.map(item => [item.id, { anchor: `document-${item.id}`, label: item.label }]),
    ...publication.sources.map((source, index) => [source.id, { anchor: `source-${source.id}`, label: `${index + 1}. ${source.label}`, number: index + 1 }])
  ]);
  const text = block => html`${emphasizedText(block.text)}${(block.refs || []).map(id => {
    const ref = references.get(id);
    return html` <a class="publication__citation" href="#${ref.anchor}" aria-label="${ref.label}">[${ref.number || 'PDF'}]</a>`;
  })}`;
  let index = 0;
  while (index < publication.blocks.length) {
    const block = publication.blocks[index++];
    if (block.tag === 'h2') {
      const id = `s-${headings.length + 1}`;
      headings.push({ id, text: block.text });
      body.push(html`<h2 id="${id}" tabindex="-1">${block.text}</h2>`);
    } else if (block.tag === 'li') {
      const items = [block];
      while (publication.blocks[index]?.tag === 'li') items.push(publication.blocks[index++]);
      body.push(html`<ul>${items.map(item => html`<li>${text(item)}</li>`)}</ul>`);
    } else if (block.tag === 'blockquote') {
      body.push(html`<blockquote><p>${text(block)}</p></blockquote>`);
    } else {
      body.push(html`<${block.tag}>${text(block)}</${block.tag}>`);
    }
  }
  return { body, headings };
}

export function publicationPage(site, entry, t) {
  const publication = entry.publication;
  const lang = entry.language;
  const { body, headings } = articleBlocks(publication);
  const downloads = publication.documents.map(item => ({ ...item, document: site.documents.find(document => document.local === item.local) }));
  const contents = [
    ...(downloads.length ? [{ id: 'documents', text: publication.documentsTitle || 'Документы' }] : []),
    ...headings,
    ...(publication.sources.length ? [{ id: 'sources', text: publication.sourcesTitle || 'Источники' }] : [])
  ];
  return html`<article class="article publication" data-article>
    <header class="article__head shell">
      <p class="article__crumb">${siteLink(site, site.route(lang, 'news'), html`${icon('chevron-left')}${t.news}`, 'link link--back')}</p>
      <h1>${publication.title}</h1>
      <ul class="article__meta">
        <li><span class="badge">${LANGUAGE_NAMES[lang]}</span></li>
        <li>${t.published} <time datetime="${publication.publishedAt}">${formatDate(lang, publication.publishedAt, { dateStyle: 'long' })}</time></li>
        <li>${icon('clock')}${t.readingTime.replace('{n}', entry.minutes)}</li>
        <li><button${attrs({ type: 'button', class: 'link link--button', 'data-share': true, 'data-share-title': publication.title, 'data-label-copied': t.linkCopied, hidden: true })}>${icon('share')}${t.share}</button></li>
      </ul>
      <p class="lead publication__lead">${publication.lead}</p>
    </header>
    <div class="shell article__layout${contents.length >= 3 ? ' has-contents' : ''}">
      ${contents.length >= 3 && html`<nav class="contents" aria-labelledby="contents-title" data-contents>
        <h2 id="contents-title">${t.contents}</h2>
        <ol>${contents.map(heading => html`<li><a href="#${heading.id}">${heading.text}</a></li>`)}</ol>
      </nav>`}
      <div class="prose article__body">
        ${downloads.length > 0 && html`<section class="publication__documents"${attrs({
          'data-document-region': true,
          'data-document-loading': t.documentLoading,
          'data-document-ready': t.documentReady,
          'data-document-error': t.documentError
        })} aria-labelledby="documents">
          <h2 id="documents" tabindex="-1">${publication.documentsTitle || 'Документы'}</h2>
          ${publication.documentsIntro && html`<p>${publication.documentsIntro}</p>`}
          <ul>${downloads.map(item => html`<li id="document-${item.id}">
            <a${attrs({ href: site.url(documentPath(item.document, lang)), 'data-document-download': site.documentDelivery === 'envelope', rel: 'nofollow' })}>${item.label} <span class="file-type">${item.local.split('.').at(-1).toUpperCase()}</span></a>
            ${item.note && html`<p class="hint">${item.note}</p>`}
          </li>`)}</ul>
          <p class="hint" data-document-status role="status" aria-live="polite"></p>
        </section>`}
        ${body}
        ${publication.sources.length > 0 && html`<section aria-labelledby="sources">
          <h2 id="sources" tabindex="-1">${publication.sourcesTitle || 'Источники'}</h2>
          <ol>${publication.sources.map(source => html`<li id="source-${source.id}">${externalLink(t, source.url, source.label)}${source.note && html`<p class="hint">${source.note}</p>`}</li>`)}</ol>
        </section>`}
        <p class="publication__signature">${publication.author}</p>
      </div>
    </div>
  </article>
  <progress class="reading-progress" max="100" value="0" data-reading-progress hidden aria-hidden="true"></progress>
  <button type="button" class="icon-button to-top" data-to-top hidden aria-label="${t.backToTop}" title="${t.backToTop}">${icon('arrow-up')}</button>`;
}
