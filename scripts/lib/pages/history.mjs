// The parish's own narrative is separate from N. Ya. Ivanova's preserved study.
// All chapters are present in the static HTML; navigation does not require JS.
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { externalLink, siteLink } from '../components.mjs';
import { familyPhotograph } from '../parish-media.mjs';

// Interface copy only. The historical narrative remains in content/history/.
const READING = {
  ru: { begin: 'Читать историю', archive: 'Из приходского архива', progress: 'Ход чтения' },
  lt: { begin: 'Skaityti istoriją', archive: 'Iš parapijos archyvo', progress: 'Skaitymo eiga' },
  en: { begin: 'Read the story', archive: 'From the parish archive', progress: 'Reading progress' },
  pl: { begin: 'Poznaj historię', archive: 'Z archiwum parafii', progress: 'Postęp czytania' },
  de: { begin: 'Geschichte lesen', archive: 'Aus dem Gemeindearchiv', progress: 'Lesefortschritt' },
  uk: { begin: 'Читати історію', archive: 'З парафіяльного архіву', progress: 'Перебіг читання' }
};

function cover(site, lang, t, history, story) {
  const ui = READING[lang];
  const photo = site.photos.gallery.find(item => item.id === 'church-autumn');
  const archive = story.restoration.photos.find(item => item.id === 'ruin-05');
  const words = history.sections.flatMap(section => section.paragraphs).join(' ').split(/\s+/u).length;
  const readingTime = t.readingTime.replace('{n}', Math.max(1, Math.ceil(words / 180)));
  const milestones = ['1866', '2011'].map(year => history.timeline.find(item => item[0] === year)).filter(Boolean);
  return html`<header class="history-cover">
    <div class="shell history-cover__grid">
      <div class="history-cover__text">
        <p class="history-cover__eyebrow">${t.pageEyebrows.history}<span>${t.place}</span></p>
        <h1>${history.title}</h1>
        <p class="history-cover__intro">${history.intro}</p>
        <div class="history-cover__actions">
          <a class="history-read-link" href="#${history.sections[0].id}">${ui.begin}${icon('arrow-right')}</a>
          <span class="history-cover__reading-time">${readingTime}</span>
        </div>
        <dl class="history-cover__dates">
          ${milestones.map(([year, title]) => html`<div><dt>${year}</dt><dd>${title}</dd></div>`)}
        </dl>
      </div>
      <div class="history-cover__images">
        <figure class="history-cover__present">
          <a${attrs({ href: site.url(`/${photo.web}`), 'data-lightbox': true, 'data-width': photo.width, 'data-height': photo.height, 'aria-label': `${t.imageOpen}: ${photo.caption[lang]}` })}>
            <img${attrs({ src: site.url(`/${photo.web}`), srcset: `${site.url(`/${photo.thumb}`)} ${photo.thumbWidth}w, ${site.url(`/${photo.web}`)} ${photo.width}w`, sizes: '(max-width: 45rem) calc(100vw - 2rem), (max-width: 60rem) 48vw, 36rem', width: photo.width, height: photo.height, fetchpriority: 'high', decoding: 'async', alt: photo.caption[lang] })}>
          </a>
          <figcaption>${photo.caption[lang]}</figcaption>
        </figure>
        <figure class="history-cover__archive">
          <a${attrs({ href: site.url(`/${archive.web}`), 'data-lightbox': true, 'data-width': archive.width, 'data-height': archive.height, 'aria-label': `${t.imageOpen}: ${history.photos.works}` })}>
            <img${attrs({ src: site.url(`/${archive.thumb}`), width: archive.thumbWidth, height: archive.thumbHeight, loading: 'lazy', decoding: 'async', alt: history.photos.works })}>
          </a>
          <figcaption>${ui.archive}</figcaption>
        </figure>
      </div>
    </div>
  </header>`;
}

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
  return html`<aside class="history-study" aria-labelledby="history-study-title">
    <div class="history-study__image"><img${attrs({ src: site.url('/assets/img/parish/bozheryanov-family.jpg'), width: 1536, height: 1047, loading: 'lazy', decoding: 'async', alt: '' })}></div>
    <div class="history-study__text">
      <p class="eyebrow">${history.studyLabel}</p>
      <h2 id="history-study-title" lang="ru" tabindex="-1">${story.title}</h2>
      <p>${history.studyDescription}</p>
      ${siteLink(site, entry.target, html`${history.studyRead}${icon('arrow-right')}`, 'history-read-link')}
    </div>
  </aside>`;
}

export function historyPage(site, lang, t, archivePath, articles = []) {
  const history = site.histories[lang];
  const story = [...site.stories.values()][0];
  const study = articles.find(entry => entry.url === story.source);
  const otherArticles = articles.filter(entry => entry !== study);
  return html`<div class="history-experience" data-history id="history-top">
  ${cover(site, lang, t, history, story)}
  <div class="shell history-layout">
    <aside class="history-contents">
      <div class="history-contents__position" aria-hidden="true"><span data-history-current>01</span><span>/ ${String(history.sections.length).padStart(2, '0')}</span></div>
      <progress class="history-progress" data-history-progress max="100" value="0" aria-label="${READING[lang].progress}" hidden></progress>
      <details class="history-contents__disclosure" data-history-contents open>
        <summary><span id="history-contents-title">${history.contentsTitle}</span>${icon('chevron-down')}</summary>
        <nav aria-labelledby="history-contents-title">
          <ol>
            ${history.sections.map((section, index) => html`<li><a href="#${section.id}" data-history-link><span aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${section.title}</a></li>`)}
          </ol>
          <div class="history-contents__extras">
            <a href="#history-milestones-title">${icon('clock')}${history.chronologyTitle}</a>
            <a href="#history-study-title">${icon('book')}${history.studyLabel}</a>
            <a href="#history-sources-title">${icon('external')}${history.sourcesTitle}</a>
          </div>
        </nav>
      </details>
    </aside>
    <div class="history-reading">
      <article class="history-narrative" aria-label="${history.title}">
        ${history.sections.map((section, index) => html`<section class="history-narrative__chapter" data-history-chapter id="${section.id}" aria-labelledby="${section.id}-title">
          <header class="history-narrative__heading"><p class="history-narrative__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</p>
          <h2 id="${section.id}-title" tabindex="-1">${section.title}</h2></header>
          <div class="history-narrative__body">
          ${section.paragraphs.map(text => html`<p>${text}</p>`)}
          </div>
          ${citations(history, section)}
          ${section.id === 'founders' && familyPhotograph(site, lang, t)}
          ${section.photo && photograph(site, history, story, section.photo)}
        </section>`)}
      </article>
      <section class="history-milestones" aria-labelledby="history-milestones-title">
        <h2 id="history-milestones-title" tabindex="-1">${history.chronologyTitle}</h2>
        <ol>
          ${history.timeline.map(([year, title, text]) => html`<li><span class="history-milestones__year">${year}</span><h3>${title}</h3><p>${text}</p></li>`)}
        </ol>
      </section>
      ${studyCard(site, history, story, study)}
      <section class="history-sources" aria-labelledby="history-sources-title">
        <h2 id="history-sources-title" tabindex="-1">${history.sourcesTitle}</h2>
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
      <div class="actions history-actions">${siteLink(site, site.route(lang, 'schedule'), t.schedule, 'button')}${siteLink(site, site.route(lang, 'gallery'), t.gallery, 'button button--quiet')}<a class="history-back" href="#history-top">${t.backToTop}${icon('arrow-up')}</a></div>
    </div>
  </div>
  </div>`;
}
