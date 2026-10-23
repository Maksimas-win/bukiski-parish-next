// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=c3e363155e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=c3e363155e';
import { initPreferences } from './ui/preferences.js?v=c3e363155e';
import { initTilt } from './ui/tilt.js?v=c3e363155e';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=c3e363155e')],
  ['[data-library]', () => import('./features/library.js?v=c3e363155e')],
  ['[data-notes]', () => import('./features/notes.js?v=c3e363155e')],
  ['[data-article]', () => import('./features/article.js?v=c3e363155e')],
  ['[data-story]', () => import('./features/story.js?v=c3e363155e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=c3e363155e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=c3e363155e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
