// Reading aids only. The complete history and its fragment links remain usable
// without this module; no reading position or visitor data is stored.

import { $, $$ } from '../ui/dom.js?v=d32bc6c124';

const initialized = new WeakSet();

function fragmentTarget(root) {
  try {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    return target && root.contains(target) ? target : null;
  } catch {
    return null;
  }
}

export function init() {
  const root = $('[data-history]');
  if (!root || initialized.has(root)) return;

  const chapters = $$('[data-history-chapter]', root);
  if (!chapters.length) return;
  initialized.add(root);

  const links = $$('[data-history-link]', root);
  const byId = new Map(chapters.map(chapter => [chapter.id, chapter]));
  const progress = $('[data-history-progress]', root);
  const currentLabel = $('[data-history-current]', root);
  const contents = $('[data-history-contents]', root);
  const compact = window.matchMedia('(max-width: 60rem)');
  let frame = null;
  let currentIndex = -1;

  const update = () => {
    const viewport = window.innerHeight;
    const marker = viewport / 3;
    const bounds = chapters.map(chapter => chapter.getBoundingClientRect());
    let index = 0;
    for (let i = 0; i < bounds.length; i += 1) {
      if (bounds[i].top <= marker) index = i;
    }

    if (index !== currentIndex) {
      currentIndex = index;
      for (const link of links) {
        const active = link.hash === `#${chapters[index].id}`;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
      if (currentLabel) currentLabel.textContent = String(index + 1).padStart(2, '0');
    }

    if (progress) {
      const start = bounds[0].top;
      const end = bounds.at(-1).bottom;
      const distance = end - start - (viewport - marker);
      const fraction = distance > 0 ? (marker - start) / distance : (end <= viewport ? 1 : 0);
      progress.value = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    }
  };

  const schedule = () => {
    if (frame === null) frame = window.requestAnimationFrame(() => {
      frame = null;
      update();
    });
  };

  if (contents) {
    const setLayout = () => {
      const collapse = compact.matches;
      // Do not leave keyboard focus inside a disclosure that is being closed.
      if (collapse && contents.contains(document.activeElement)) {
        $('summary', contents)?.focus({ preventScroll: true });
      }
      contents.open = !collapse;
      schedule();
    };

    const initialTarget = fragmentTarget(root);
    const wasOpen = contents.open;
    setLayout();
    if (compact.matches && initialTarget) {
      if (contents.contains(initialTarget)) contents.open = true;
      else if (wasOpen) {
        // An asynchronously loaded module may collapse the contents after the
        // browser has followed a deep link. Realign that same target once.
        window.requestAnimationFrame(() => {
          initialTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
          schedule();
        });
      }
    }

    compact.addEventListener('change', setLayout);
    contents.addEventListener('toggle', schedule);

    for (const link of $$('a[href^="#"]', contents)) {
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = byId.get(link.hash.slice(1)) || document.getElementById(link.hash.slice(1));
        if (!target || !root.contains(target)) return;

        // The default fragment navigation happens after this synchronous
        // collapse, so the browser uses the final layout for its scroll target.
        // Keep that default action: it preserves the URL and Back behavior.
        if (compact.matches) contents.open = false;
        window.requestAnimationFrame(() => {
          const heading = target.matches('[tabindex]') ? target : $('h2[tabindex]', target);
          heading?.focus({ preventScroll: true });
          schedule();
        });
      });
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', schedule);
  root.addEventListener('load', schedule, true);
  document.fonts?.ready.then(schedule);
  if (progress) progress.hidden = false;
  update();
  root.setAttribute('data-history-ready', '');
}
