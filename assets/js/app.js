// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=b66f0eb5dd';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=b66f0eb5dd';
import { initPreferences } from './ui/preferences.js?v=b66f0eb5dd';
import { initTilt } from './ui/tilt.js?v=b66f0eb5dd';
import { initAnnouncement } from './ui/announcement.js?v=b66f0eb5dd';
import { initThanks } from './ui/thanks.js?v=b66f0eb5dd';
import { initSpotlight } from './ui/spotlight.js?v=b66f0eb5dd';
import { initAnalytics } from './analytics.js?v=b66f0eb5dd';

document.documentElement.classList.add('js');
initAnalytics();

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();
initSpotlight();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=b66f0eb5dd')],
  ['[data-library]', () => import('./features/library.js?v=b66f0eb5dd')],
  ['[data-notes]', () => import('./features/notes.js?v=b66f0eb5dd')],
  ['[data-article]', () => import('./features/article.js?v=b66f0eb5dd')],
  ['[data-story]', () => import('./features/story.js?v=b66f0eb5dd')],
  ['[data-history]', () => import('./features/history.js?v=b66f0eb5dd')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=b66f0eb5dd')],
  ['[data-gpm]', () => import('./features/gpm.js?v=b66f0eb5dd')],
  ['[data-flipbook]', () => import('./features/calendar-book.js?v=b66f0eb5dd')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=b66f0eb5dd')],
  ['[data-document-download]', () => import('./document-downloads.js?v=b66f0eb5dd')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
