// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=d88596e415';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=d88596e415';
import { initPreferences } from './ui/preferences.js?v=d88596e415';
import { initTilt } from './ui/tilt.js?v=d88596e415';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=d88596e415')],
  ['[data-library]', () => import('./features/library.js?v=d88596e415')],
  ['[data-notes]', () => import('./features/notes.js?v=d88596e415')],
  ['[data-article]', () => import('./features/article.js?v=d88596e415')],
  ['[data-story]', () => import('./features/story.js?v=d88596e415')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=d88596e415')],
  ['[data-document-download]', () => import('./document-downloads.js?v=d88596e415')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
