// Reading aids for long articles: progress, contents highlight, share, back to top.

import { $, $$, show, prefersReducedMotion } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

const TO_TOP_AFTER_PX = 1200;

function initProgress(article) {
  const progress = $('[data-reading-progress]');
  const toTop = $('[data-to-top]');
  let scheduled = false;

  const update = () => {
    scheduled = false;
    const distance = article.offsetHeight - innerHeight;
    const read = scrollY - article.offsetTop;
    if (progress) progress.value = distance > 0 ? Math.min(100, Math.max(0, (read / distance) * 100)) : 100;
    show(toTop, scrollY > TO_TOP_AFTER_PX);
  };
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  show(progress);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  toTop?.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    $('#main').focus({ preventScroll: true });
  });
  update();
}

/** Marks the section being read in the table of contents. */
function initContents(article) {
  const links = new Map($$('[data-contents] a', article).map(link => [link.hash.slice(1), link]));
  if (!links.size || !('IntersectionObserver' in window)) return;
  const headings = [...links.keys()].map(id => document.getElementById(id)).filter(Boolean);

  const observer = new IntersectionObserver(() => {
    // The current section is the last heading that has passed the top third of the screen.
    const passed = headings.filter(heading => heading.getBoundingClientRect().top < innerHeight / 3);
    const current = passed.at(-1)?.id;
    for (const [id, link] of links) link.classList.toggle('is-current', id === current);
  }, { rootMargin: '0px 0px -66% 0px', threshold: [0, 1] });
  for (const heading of headings) observer.observe(heading);
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
  initShare();
}
