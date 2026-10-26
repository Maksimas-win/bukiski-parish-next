// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=b39ccbf01f';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=b39ccbf01f';
import { initPreferences } from './ui/preferences.js?v=b39ccbf01f';
import { initTilt } from './ui/tilt.js?v=b39ccbf01f';
import { initAnnouncement } from './ui/announcement.js?v=b39ccbf01f';
import { initThanks } from './ui/thanks.js?v=b39ccbf01f';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=b39ccbf01f')],
  ['[data-library]', () => import('./features/library.js?v=b39ccbf01f')],
  ['[data-notes]', () => import('./features/notes.js?v=b39ccbf01f')],
  ['[data-article]', () => import('./features/article.js?v=b39ccbf01f')],
  ['[data-story]', () => import('./features/story.js?v=b39ccbf01f')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=b39ccbf01f')],
  ['[data-gpm]', () => import('./features/gpm.js?v=b39ccbf01f')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=b39ccbf01f')],
  ['[data-document-download]', () => import('./document-downloads.js?v=b39ccbf01f')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
