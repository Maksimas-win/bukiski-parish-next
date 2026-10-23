// The parish's own narrative is separate from N. Ya. Ivanova's preserved study.
// All chapters are present in the static HTML; navigation does not require JS.
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { externalLink, pageHead, siteLink } from '../components.mjs';

/** Photographs a chapter may show, by the key used in content/history/<lang>.json → photos. */
const PHOTOS = {
  works: ['restoration', 'ruin-05'],
  vault: ['restoration', 'ruin-13'],
  domes: ['gallery', 'domes'],
  after: ['gallery', 'church-autumn']
};

function photograph(site, history, story, kind) {
  const [collection, id] = PHOTOS[kind] || [];
  const photo = collection === 'restoration'
    ? story.restoration.photos.find(item => item.id === id)
    : site.photos.gallery.find(item => item.id === id);
  if (!photo) throw new Error(`Unknown history photograph: ${kind}`);
  if (!history.photos[kind]) throw new Error(`content/history: missing caption for photograph ${kind}`);
  return html`<figure class="history-narrative__photo">
    <a${attrs({ href: site.url(`/${photo.web}`), 'data-lightbox': true, 'data-width': photo.width, 'data-height': photo.height })}>
      <img${attrs({ src: site.url(`/${photo.web}`), srcset: `${site.url(`/${photo.thumb}`)} ${photo.thumbWidth}w, ${site.url(`/${photo.web}`)} ${photo.width}w`, sizes: '(max-width: 50rem) 100vw, 48rem', width: photo.width, height: photo.height, loading: 'lazy', decoding: 'async', alt: history.photos[kind] })}>
    </a>
    <figcaption>${history.photos[kind]}</figcaption>
  </figure>`;
}

function citations(history, section) {
  return html`<p class="history-narrative__citations"><span>${history.sourceLinkLabel}:</span>
    ${section.sources.map(id => {
      const index = history.sources.findIndex(source => source.id === id);
      if (index < 0) throw new Error(`Unknown history source: ${id}`);
      return html`<a href="#history-source-${id}" aria-label="${history.sources[index].label}">[${index + 1}]</a>`;
    })}
  </p>`;
}

function studyCard(site, history, story, entry) {
  if (!entry) return '';
  const photo = story.restoration.photos.find(item => item.id === story.heroPhoto);
  return html`<aside class="history-study" aria-labelledby="history-study-title">
    <img${attrs({ src: site.url(`/${photo.thumb}`), width: photo.thumbWidth, height: photo.thumbHeight, loading: 'lazy', decoding: 'async', alt: '' })}>
    <div class="history-study__text">
      <p class="eyebrow">${history.studyLabel}</p>
      <h2 id="history-study-title" lang="ru">${story.title}</h2>
      <p>${history.studyDescription}</p>
      ${siteLink(site, entry.target, html`${history.studyRead}${icon('arrow-right')}`, 'button button--quiet')}
    </div>
  </aside>`;
}

export function historyPage(site, lang, t, archivePath, articles = []) {
  const history = site.histories[lang];
  const story = [...site.stories.values()][0];
  const study = articles.find(entry => entry.url === story.source);
  const otherArticles = articles.filter(entry => entry !== study);
  return html`${pageHead({ title: history.title, intro: history.intro, site, page: 'history', t })}
  <div class="shell history-layout">
    <nav class="history-contents" aria-labelledby="history-contents-title">
      <h2 id="history-contents-title">${history.contentsTitle}</h2>
      <ol>
        ${history.sections.map((section, index) => html`<li><a href="#${section.id}"><span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${section.title}</a></li>`)}
      </ol>
      <a class="history-contents__study" href="#history-study-title">${icon('book')}${history.studyLabel}</a>
    </nav>
    <div class="history-reading">
      <article class="history-narrative" aria-label="${history.title}">
        ${history.sections.map((section, index) => html`<section class="history-narrative__chapter" id="${section.id}" aria-labelledby="${section.id}-title">
          <p class="history-narrative__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</p>
          <h2 id="${section.id}-title" tabindex="-1">${section.title}</h2>
          ${section.paragraphs.map(text => html`<p>${text}</p>`)}
          ${citations(history, section)}
          ${section.photo && photograph(site, history, story, section.photo)}
        </section>`)}
      </article>
      <section class="history-milestones" aria-labelledby="history-milestones-title">
        <h2 id="history-milestones-title">${history.chronologyTitle}</h2>
        <ol>
          ${history.timeline.map(([year, title, text]) => html`<li><span class="history-milestones__year">${year}</span><h3>${title}</h3><p>${text}</p></li>`)}
        </ol>
      </section>
      ${studyCard(site, history, story, study)}
      <section class="history-sources" aria-labelledby="history-sources-title">
        <h2 id="history-sources-title">${history.sourcesTitle}</h2>
        <p>${history.sourceNote}</p>
        <ol>
          ${history.sources.map(source => html`<li id="history-source-${source.id}">${source.path ? siteLink(site, source.path, source.label) : (source.url ? externalLink(t, source.url, source.label) : source.label)}</li>`)}
        </ol>
        <details class="history-archive">
          <summary>${history.archiveTitle}</summary>
          <ul>
            ${otherArticles.map(entry => html`<li>${siteLink(site, entry.target, html`<span lang="${entry.language}">${entry.title}</span>`)}</li>`)}
            ${archivePath && html`<li>${siteLink(site, archivePath, t.archiveOriginal)}</li>`}
          </ul>
        </details>
      </section>
      <div class="actions history-actions">${siteLink(site, site.route(lang, 'schedule'), t.schedule, 'button')}${siteLink(site, site.route(lang, 'gallery'), t.gallery, 'button button--quiet')}</div>
    </div>
  </div>`;
}
