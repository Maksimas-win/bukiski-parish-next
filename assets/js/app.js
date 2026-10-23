// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=7a8fca1eb3';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=7a8fca1eb3';
import { initPreferences } from './ui/preferences.js?v=7a8fca1eb3';
import { initTilt } from './ui/tilt.js?v=7a8fca1eb3';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=7a8fca1eb3')],
  ['[data-library]', () => import('./features/library.js?v=7a8fca1eb3')],
  ['[data-notes]', () => import('./features/notes.js?v=7a8fca1eb3')],
  ['[data-article]', () => import('./features/article.js?v=7a8fca1eb3')],
  ['[data-story]', () => import('./features/story.js?v=7a8fca1eb3')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=7a8fca1eb3')],
  ['[data-gpm]', () => import('./features/gpm.js?v=7a8fca1eb3')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=7a8fca1eb3')],
  ['[data-document-download]', () => import('./document-downloads.js?v=7a8fca1eb3')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
