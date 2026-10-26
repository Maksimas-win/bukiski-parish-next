// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=97d6b3fbe5';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=97d6b3fbe5';
import { initPreferences } from './ui/preferences.js?v=97d6b3fbe5';
import { initTilt } from './ui/tilt.js?v=97d6b3fbe5';
import { initAnnouncement } from './ui/announcement.js?v=97d6b3fbe5';
import { initThanks } from './ui/thanks.js?v=97d6b3fbe5';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=97d6b3fbe5')],
  ['[data-library]', () => import('./features/library.js?v=97d6b3fbe5')],
  ['[data-notes]', () => import('./features/notes.js?v=97d6b3fbe5')],
  ['[data-article]', () => import('./features/article.js?v=97d6b3fbe5')],
  ['[data-story]', () => import('./features/story.js?v=97d6b3fbe5')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=97d6b3fbe5')],
  ['[data-gpm]', () => import('./features/gpm.js?v=97d6b3fbe5')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=97d6b3fbe5')],
  ['[data-document-download]', () => import('./document-downloads.js?v=97d6b3fbe5')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
