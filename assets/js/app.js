// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js';
import { initLanguageMenu, initMenu } from './ui/menu.js';
import { initPreferences } from './ui/preferences.js';
import { initTilt } from './ui/tilt.js';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js')],
  ['[data-library]', () => import('./features/library.js')],
  ['[data-notes]', () => import('./features/notes.js')],
  ['[data-article]', () => import('./features/article.js')],
  ['[data-story]', () => import('./features/story.js')],
  ['[data-lightbox]', () => import('./features/lightbox.js')],
  ['[data-document-download]', () => import('./document-downloads.js')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
