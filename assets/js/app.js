// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=cc092d6bb2';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=cc092d6bb2';
import { initPreferences } from './ui/preferences.js?v=cc092d6bb2';
import { initTilt } from './ui/tilt.js?v=cc092d6bb2';
import { initAnnouncement } from './ui/announcement.js?v=cc092d6bb2';
import { initThanks } from './ui/thanks.js?v=cc092d6bb2';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=cc092d6bb2')],
  ['[data-library]', () => import('./features/library.js?v=cc092d6bb2')],
  ['[data-notes]', () => import('./features/notes.js?v=cc092d6bb2')],
  ['[data-article]', () => import('./features/article.js?v=cc092d6bb2')],
  ['[data-story]', () => import('./features/story.js?v=cc092d6bb2')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=cc092d6bb2')],
  ['[data-gpm]', () => import('./features/gpm.js?v=cc092d6bb2')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=cc092d6bb2')],
  ['[data-document-download]', () => import('./document-downloads.js?v=cc092d6bb2')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
