// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=efafe5cc0a';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=efafe5cc0a';
import { initPreferences } from './ui/preferences.js?v=efafe5cc0a';
import { initTilt } from './ui/tilt.js?v=efafe5cc0a';
import { initAnnouncement } from './ui/announcement.js?v=efafe5cc0a';
import { initThanks } from './ui/thanks.js?v=efafe5cc0a';
import { initSpotlight } from './ui/spotlight.js?v=efafe5cc0a';
import { initAnalytics } from './analytics.js?v=efafe5cc0a';

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
  ['[data-schedule]', () => import('./features/schedule.js?v=efafe5cc0a')],
  ['[data-library]', () => import('./features/library.js?v=efafe5cc0a')],
  ['[data-notes]', () => import('./features/notes.js?v=efafe5cc0a')],
  ['[data-article]', () => import('./features/article.js?v=efafe5cc0a')],
  ['[data-story]', () => import('./features/story.js?v=efafe5cc0a')],
  ['[data-history]', () => import('./features/history.js?v=efafe5cc0a')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=efafe5cc0a')],
  ['[data-gpm]', () => import('./features/gpm.js?v=efafe5cc0a')],
  ['[data-flipbook]', () => import('./features/calendar-book.js?v=efafe5cc0a')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=efafe5cc0a')],
  ['[data-document-download]', () => import('./document-downloads.js?v=efafe5cc0a')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
