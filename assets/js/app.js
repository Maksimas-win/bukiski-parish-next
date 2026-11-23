// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=ce988d822e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=ce988d822e';
import { initPreferences } from './ui/preferences.js?v=ce988d822e';
import { initTilt } from './ui/tilt.js?v=ce988d822e';
import { initAnnouncement } from './ui/announcement.js?v=ce988d822e';
import { initThanks } from './ui/thanks.js?v=ce988d822e';
import { initSpotlight } from './ui/spotlight.js?v=ce988d822e';
import { initAnalytics } from './analytics.js?v=ce988d822e';

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
  ['[data-schedule]', () => import('./features/schedule.js?v=ce988d822e')],
  ['[data-library]', () => import('./features/library.js?v=ce988d822e')],
  ['[data-notes]', () => import('./features/notes.js?v=ce988d822e')],
  ['[data-article]', () => import('./features/article.js?v=ce988d822e')],
  ['[data-story]', () => import('./features/story.js?v=ce988d822e')],
  ['[data-history]', () => import('./features/history.js?v=ce988d822e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=ce988d822e')],
  ['[data-gpm]', () => import('./features/gpm.js?v=ce988d822e')],
  ['[data-flipbook]', () => import('./features/calendar-book.js?v=ce988d822e')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=ce988d822e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=ce988d822e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
