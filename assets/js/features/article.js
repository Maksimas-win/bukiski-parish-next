// Reading aids for long articles: progress, contents highlight, share, back to top.

import { $, $$, show, prefersReducedMotion } from '../ui/dom.js?v=e8fc9cdf22';
import { toast } from '../ui/toast.js?v=e8fc9cdf22';

const TO_TOP_AFTER_PX = 1200;

/** Runs `update` at most once per frame while the page scrolls or resizes. */
function onViewportChange(update) {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  update();
}

function initProgress(article) {
  const progress = $('[data-reading-progress]');
  const toTop = $('[data-to-top]');
  show(progress);

  onViewportChange(() => {
    const distance = article.offsetHeight - innerHeight;
    const read = scrollY - article.offsetTop;
    if (progress) progress.value = distance > 0 ? Math.min(100, Math.max(0, (read / distance) * 100)) : 100;
    show(toTop, scrollY > TO_TOP_AFTER_PX);
  });

  toTop?.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    $('#main').focus({ preventScroll: true });
  });
}

/** Marks the section being read in the table of contents. */
function initContents(article) {
  const links = new Map($$('[data-contents] a', article).map(link => [link.hash.slice(1), link]));
  const headings = [...links.keys()].map(id => document.getElementById(id)).filter(Boolean);
  if (!headings.length) return;

  onViewportChange(() => {
    // The current section is the last heading that has passed the top third of the screen.
    const current = headings.filter(heading => heading.getBoundingClientRect().top < innerHeight / 3).at(-1)?.id;
    for (const [id, link] of links) link.classList.toggle('is-current', id === current);
  });
}

/** A short contents disclosure keeps the publication opening readable on phones.
 * Without JavaScript the complete navigation remains available. */
function initPublicationContents(article) {
  const toggle = $('[data-publication-contents-toggle]', article);
  if (!toggle) return;
  const contents = toggle.closest('[data-contents]');
  const heading = $('h2', contents);
  const list = document.getElementById(toggle.getAttribute('aria-controls'));
  const wide = matchMedia('(min-width: 62rem)');
  const setExpanded = expanded => {
    toggle.setAttribute('aria-expanded', String(expanded));
    show(list, expanded);
  };
  const updateLayout = () => {
    show(toggle, !wide.matches);
    show(heading, wide.matches);
    setExpanded(wide.matches);
  };
  toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', event => {
    if (!wide.matches && event.target.closest('a')) setExpanded(false);
  });
  wide.addEventListener('change', updateLayout);
  updateLayout();
}

function initShare() {
  const button = $('[data-share]');
  if (!button) return;
  const url = $('link[rel="canonical"]')?.href || location.href;
  const title = button.dataset.shareTitle;

  if (navigator.share) {
    button.addEventListener('click', () => navigator.share({ title, url }).catch(() => {}));
  } else if (navigator.clipboard?.writeText) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast(button.dataset.labelCopied);
      } catch {
        toast(document.body.dataset.labelCopyFailed);
      }
    });
  } else {
    return;
  }
  show(button);
}

export function init() {
  const article = $('[data-article]');
  if (!article) return;
  initProgress(article);
  initContents(article);
  initPublicationContents(article);
  initShare();
}
