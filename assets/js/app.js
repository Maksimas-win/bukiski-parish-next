// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=f083d1dd15';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=f083d1dd15';
import { initPreferences } from './ui/preferences.js?v=f083d1dd15';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=f083d1dd15')],
  ['[data-library]', () => import('./features/library.js?v=f083d1dd15')],
  ['[data-notes]', () => import('./features/notes.js?v=f083d1dd15')],
  ['[data-article]', () => import('./features/article.js?v=f083d1dd15')],
  ['[data-story]', () => import('./features/story.js?v=f083d1dd15')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=f083d1dd15')],
  ['[data-document-download]', () => import('./document-downloads.js?v=f083d1dd15')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
