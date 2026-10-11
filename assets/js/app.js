// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=3412e3fd32';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=3412e3fd32';
import { initPreferences } from './ui/preferences.js?v=3412e3fd32';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=3412e3fd32')],
  ['[data-library]', () => import('./features/library.js?v=3412e3fd32')],
  ['[data-notes]', () => import('./features/notes.js?v=3412e3fd32')],
  ['[data-article]', () => import('./features/article.js?v=3412e3fd32')],
  ['[data-story]', () => import('./features/story.js?v=3412e3fd32')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=3412e3fd32')],
  ['[data-document-download]', () => import('./document-downloads.js?v=3412e3fd32')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
