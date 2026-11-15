// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=777c1a0b6e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=777c1a0b6e';
import { initPreferences } from './ui/preferences.js?v=777c1a0b6e';
import { initTilt } from './ui/tilt.js?v=777c1a0b6e';
import { initAnnouncement } from './ui/announcement.js?v=777c1a0b6e';
import { initThanks } from './ui/thanks.js?v=777c1a0b6e';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=777c1a0b6e')],
  ['[data-library]', () => import('./features/library.js?v=777c1a0b6e')],
  ['[data-notes]', () => import('./features/notes.js?v=777c1a0b6e')],
  ['[data-article]', () => import('./features/article.js?v=777c1a0b6e')],
  ['[data-story]', () => import('./features/story.js?v=777c1a0b6e')],
  ['[data-history]', () => import('./features/history.js?v=777c1a0b6e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=777c1a0b6e')],
  ['[data-gpm]', () => import('./features/gpm.js?v=777c1a0b6e')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=777c1a0b6e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=777c1a0b6e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
