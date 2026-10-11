// A preserved article given a dedicated, illustrated layout.
//
// The structure lives in content/stories/<slug>.json. Every sentence there is
// copied verbatim from the source page (tests/build.test.mjs checks this);
// only the arrangement, photographs and interface labels are added here.

import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { externalLink, siteLink } from '../components.mjs';

const paragraphs = list => (list || []).map(text => html`<p>${text}</p>`);

function photoLink(site, photo, caption, { className = '', sizes = '(max-width: 40rem) 100vw, 33vw' } = {}) {
  return html`<a${attrs({ class: className, href: site.url(`/${photo.web}`), 'data-lightbox': true, 'data-width': photo.width, 'data-height': photo.height })}>
    <img${attrs({
      src: site.url(`/${photo.thumb}`),
      srcset: `${site.url(`/${photo.thumb}`)} ${photo.thumbWidth}w, ${site.url(`/${photo.web}`)} ${photo.width}w`,
      sizes,
      width: photo.thumbWidth,
      height: photo.thumbHeight,
      loading: 'lazy',
      decoding: 'async',
      alt: caption
    })}>
  </a>`;
}

function hero(site, story, entry, t, uiLocale) {
  const photo = story.restoration.photos.find(candidate => candidate.id === story.heroPhoto);
  return html`<header class="story-hero">
    <img${attrs({
      class: 'story-hero__photo',
      src: site.url(`/${photo.web}`),
      width: photo.width,
      height: photo.height,
      fetchpriority: 'high',
      decoding: 'async',
      alt: photo.caption[uiLocale] || photo.caption.ru
    })}>
    <div class="story-hero__shade" aria-hidden="true"></div>
    <div class="shell story-hero__content">
      <p class="story-hero__crumb" lang="${uiLocale}">${siteLink(site, site.route(uiLocale, 'library'), html`${icon('chevron-left')}${t.library}`, 'story-hero__back')}</p>
      <p class="story-hero__kicker">${story.kicker}</p>
      <h1 class="story-hero__title">${story.title}</h1>
      <p class="story-hero__subtitle">${story.subtitle}</p>
      <p class="story-hero__meta">
        <span>${story.basis}</span>
        <span lang="${uiLocale}">${icon('clock')}${t.readingTime.replace('{n}', entry.minutes)}</span>
      </p>
    </div>
  </header>`;
}

function chapterNav(story, t, uiLocale) {
  return html`<nav class="story-nav" aria-label="${t.storyChapters}" lang="${uiLocale}" data-story-nav>
    <ol class="shell story-nav__list">
      ${story.chapters.map((chapter, index) => html`<li><a href="#${chapter.id}"><span class="story-nav__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${chapter.title}</a></li>`)}
      <li><a href="#restoration"><span class="story-nav__number" aria-hidden="true">${String(story.chapters.length + 1).padStart(2, '0')}</span>${t.restoration}</a></li>
    </ol>
  </nav>`;
}

function chapterHead(chapter, index) {
  return html`<header class="story-chapter__head">
    <span class="story-chapter__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <h2 id="${chapter.id}-title" tabindex="-1">${chapter.title}</h2>
  </header>`;
}

function person(chapter) {
  return html`<div class="story-person">
    <p class="story-person__name">${chapter.person.name}</p>
    <p class="story-person__years">${chapter.person.years}</p>
    <ul class="story-person__facts">${chapter.facts.map(fact => html`<li>${fact}</li>`)}</ul>
  </div>`;
}

function buildings(chapter, t, uiLocale) {
  return html`<section class="story-block" aria-labelledby="buildings-title">
    <h3 id="buildings-title" class="story-block__title" lang="${uiLocale}">${t.storyBuildings}</h3>
    <ul class="story-buildings">
      ${chapter.buildings.map(building => html`<li class="story-building">
        <span class="story-building__icon">${icon(building.icon)}</span>
        <span class="story-building__name">${building.name}</span>
        <span class="story-building__note">${building.note}</span>
      </li>`)}
    </ul>
  </section>`;
}

function stats(chapter, t, uiLocale) {
  return html`<section class="story-block" aria-labelledby="stats-title">
    <h3 id="stats-title" class="story-block__title" lang="${uiLocale}">${t.storyStats}</h3>
    <ul class="story-stats">
      ${chapter.stats.map(stat => html`<li class="story-stat"><span class="story-stat__value" data-count="${stat.value}">${stat.value}</span><span class="story-stat__label">${stat.label}</span></li>`)}
    </ul>
  </section>`;
}

function duties(chapter, t, uiLocale) {
  return html`<details class="story-duties">
    <summary><span lang="${uiLocale}">${t.storyDuties}</span> <span class="story-duties__count">${chapter.duties.length}</span></summary>
    <ol>${chapter.duties.map(duty => html`<li>${duty}</li>`)}</ol>
  </details>`;
}

function people(chapter) {
  return html`<div class="story-people">
    ${chapter.people.map(member => html`<article class="story-card">
      <h3 class="story-card__name">${member.name}</h3>
      <p class="story-card__meta">${member.meta}</p>
      ${paragraphs(member.text)}
    </article>`)}
  </div>`;
}

function timeline(chapter) {
  return html`<ol class="story-timeline">
    ${chapter.timeline.map(item => html`<li class="story-timeline__item" data-reveal>
      <p class="story-timeline__when">${item.when}</p>
      <p class="story-timeline__text">${item.text}</p>
    </li>`)}
  </ol>`;
}

function chapter(site, story, item, index, t, uiLocale) {
  return html`<section class="story-chapter story-chapter--${item.id}" id="${item.id}" aria-labelledby="${item.id}-title" data-story-chapter>
    <div class="shell story-chapter__inner">
      ${chapterHead(item, index)}
      <div class="story-prose">
        ${item.person && person(item)}
        ${paragraphs(item.text)}
        ${item.aside && html`<aside class="story-aside"><h3>${item.aside.title}</h3><p>${item.aside.text}</p></aside>`}
        ${item.buildings && buildings(item, t, uiLocale)}
        ${item.duties && duties(item, t, uiLocale)}
        ${paragraphs(item.after)}
        ${item.highlight && html`<p class="story-highlight">${item.highlight}</p>`}
        ${item.stats && stats(item, t, uiLocale)}
        ${paragraphs(item.closing)}
        ${item.people && people(item)}
        ${item.timeline && timeline(item)}
      </div>
    </div>
  </section>`;
}

function compare(site, story, t, uiLocale) {
  const before = story.restoration.photos.find(photo => photo.id === story.restoration.before);
  const today = site.photos.gallery.find(photo => photo.id === 'church-autumn');
  return html`<figure class="compare" data-compare>
    <div class="compare__frame">
      <img${attrs({ class: 'compare__image', src: site.url(`/${today.web}`), width: today.width, height: today.height, loading: 'lazy', decoding: 'async', alt: `${t.compareAfter}: ${today.caption[uiLocale]}` })}>
      <div class="compare__before" data-compare-before>
        <img${attrs({ class: 'compare__image', src: site.url(`/${before.web}`), width: before.width, height: before.height, loading: 'lazy', decoding: 'async', alt: `${t.compareBefore}: ${before.caption[uiLocale]}` })}>
      </div>
      <span class="compare__label compare__label--before" aria-hidden="true">${t.compareBefore}</span>
      <span class="compare__label compare__label--after" aria-hidden="true">${t.compareAfter}</span>
      <span class="compare__handle" aria-hidden="true" data-compare-handle></span>
      <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="${t.compareRange}" data-compare-range hidden>
    </div>
    <figcaption class="compare__hint" data-compare-hint hidden>${t.compareHint}</figcaption>
  </figure>`;
}

function restoration(site, story, t, uiLocale) {
  const number = String(story.chapters.length + 1).padStart(2, '0');
  return html`<section class="story-chapter story-restoration" id="restoration" aria-labelledby="restoration-title" lang="${uiLocale}" data-story-chapter>
    <div class="shell">
      <header class="story-chapter__head">
        <span class="story-chapter__number" aria-hidden="true">${number}</span>
        <h2 id="restoration-title" tabindex="-1">${t.restoration}</h2>
      </header>
      <p class="story-restoration__intro">${t.restorationIntro}</p>
      <h3 class="story-block__title">${t.beforeAfter}</h3>
      ${compare(site, story, t, uiLocale)}
      <ul class="story-ruins">
        ${story.restoration.photos.map((photo, index) => html`<li class="story-ruins__item${index % 5 === 0 ? ' is-wide' : ''}">
          <figure>
            ${photoLink(site, photo, photo.caption[uiLocale] || photo.caption.ru, { sizes: index % 5 === 0 ? '(max-width: 40rem) 100vw, 66vw' : '(max-width: 40rem) 100vw, 33vw' })}
            <figcaption>${photo.caption[uiLocale] || photo.caption.ru}</figcaption>
          </figure>
        </li>`)}
      </ul>
    </div>
  </section>`;
}

function closing(story, entry, t, uiLocale) {
  return html`<footer class="shell story-end">
    <div class="story-author">
      <p class="story-author__label" lang="${uiLocale}">${t.storyAuthor}</p>
      <p class="story-author__name">${story.author.name}</p>
      <p class="story-author__role">${story.author.role}</p>
    </div>
    <details class="story-sources">
      <summary>${story.sources.title}</summary>
      <ul>${story.sources.items.map(item => html`<li>${item}</li>`)}</ul>
    </details>
    <aside class="notice notice--archive" lang="${uiLocale}">
      <p>${t.archiveNotice}</p>
      <p class="meta-row">${externalLink(t, entry.url, `${t.source}: ${entry.host}`)}<span>${t.savedOn}: <time datetime="${entry.page.fetchedOn}">${formatDate(uiLocale, `${entry.page.fetchedOn}T12:00:00Z`, { dateStyle: 'long' })}</time></span></p>
    </aside>
  </footer>`;
}

export function storyPage(site, story, entry, t, uiLocale) {
  return html`<article class="story" lang="${entry.language}" data-article data-story>
    ${hero(site, story, entry, t, uiLocale)}
    ${chapterNav(story, t, uiLocale)}
    <div class="shell story-intro"><p class="story-lead">${story.lead}</p></div>
    ${story.chapters.map((item, index) => chapter(site, story, item, index, t, uiLocale))}
    ${restoration(site, story, t, uiLocale)}
    ${closing(story, entry, t, uiLocale)}
  </article>
  <progress class="reading-progress" max="100" value="0" data-reading-progress hidden aria-hidden="true"></progress>
  <button type="button" class="icon-button to-top" data-to-top hidden aria-label="${t.backToTop}" title="${t.backToTop}" lang="${uiLocale}">${icon('arrow-up')}</button>`;
}
