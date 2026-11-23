// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=51016eb453';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=51016eb453';
import { initPreferences } from './ui/preferences.js?v=51016eb453';
import { initTilt } from './ui/tilt.js?v=51016eb453';
import { initAnnouncement } from './ui/announcement.js?v=51016eb453';
import { initThanks } from './ui/thanks.js?v=51016eb453';
import { initSpotlight } from './ui/spotlight.js?v=51016eb453';
import { initAnalytics } from './analytics.js?v=51016eb453';

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
  ['[data-schedule]', () => import('./features/schedule.js?v=51016eb453')],
  ['[data-library]', () => import('./features/library.js?v=51016eb453')],
  ['[data-notes]', () => import('./features/notes.js?v=51016eb453')],
  ['[data-article]', () => import('./features/article.js?v=51016eb453')],
  ['[data-story]', () => import('./features/story.js?v=51016eb453')],
  ['[data-history]', () => import('./features/history.js?v=51016eb453')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=51016eb453')],
  ['[data-gpm]', () => import('./features/gpm.js?v=51016eb453')],
  ['[data-flipbook]', () => import('./features/calendar-book.js?v=51016eb453')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=51016eb453')],
  ['[data-document-download]', () => import('./document-downloads.js?v=51016eb453')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
