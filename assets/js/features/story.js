// Enhancements for illustrated stories: the current chapter in the chapter bar,
// numbers that count up once, timeline entries that appear as they are reached,
// and a before/after photo comparison. Without this module everything is
// visible and readable as plain HTML.

import { $, $$, show, prefersReducedMotion } from '../ui/dom.js?v=d532be9930';

function initChapterNav(story) {
  const nav = $('[data-story-nav]', story);
  if (!nav) return;
  const links = new Map($$('a', nav).map(link => [link.hash.slice(1), link]));
  const chapters = $$('[data-story-chapter]', story).filter(chapter => links.has(chapter.id));

  let frame = 0;
  const update = () => {
    frame = 0;
    const current = chapters.filter(chapter => chapter.getBoundingClientRect().top < innerHeight * 0.35).at(-1)?.id;
    for (const [id, link] of links) {
      const active = id === current;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    // Keep the current chapter visible in the horizontally scrolling bar.
    const active = current && links.get(current);
    const list = $('ol', nav);
    if (!active) {
      if (list.scrollLeft) list.scrollTo({ left: 0 });
    } else {
      const left = active.offsetLeft - list.clientWidth / 2 + active.clientWidth / 2;
      if (Math.abs(list.scrollLeft - left) > 24) list.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
}

function countUp(element) {
  const target = Number(element.dataset.count);
  const duration = 1200;
  const start = performance.now();
  const format = new Intl.NumberFormat(document.documentElement.lang || undefined);
  const step = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = format.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Counters and timeline entries animate once, when they scroll into view. */
function initReveal(story) {
  const counters = $$('[data-count]', story);
  const entries = $$('[data-reveal]', story);
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(items => {
    for (const item of items) {
      if (!item.isIntersecting) continue;
      observer.unobserve(item.target);
      if (item.target.dataset.count) countUp(item.target);
      else item.target.classList.add('is-visible');
    }
  }, { rootMargin: '0px 0px -12% 0px' });

  for (const entry of entries) {
    // Only entries still below the fold are hidden, so nothing already on screen blinks.
    if (entry.getBoundingClientRect().top > innerHeight) {
      entry.classList.add('is-pending');
      observer.observe(entry);
    }
  }
  for (const counter of counters) {
    if (counter.getBoundingClientRect().top > innerHeight) observer.observe(counter);
  }
}

function initCompare(story) {
  for (const figure of $$('[data-compare]', story)) {
    const range = $('[data-compare-range]', figure);
    const before = $('[data-compare-before]', figure);
    const handle = $('[data-compare-handle]', figure);
    if (!range || !before) continue;
    const apply = () => {
      const value = `${range.value}%`;
      before.style.setProperty('--compare', value);
      handle?.style.setProperty('--compare', value);
    };
    range.addEventListener('input', apply);
    figure.classList.add('is-interactive');
    show(range);
    show($('[data-compare-hint]', figure));
    apply();
  }
}

export function init() {
  const story = $('[data-story]');
  if (!story) return;
  initChapterNav(story);
  initReveal(story);
  initCompare(story);
}
