// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=c7a6e8903d';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=c7a6e8903d';
import { initPreferences } from './ui/preferences.js?v=c7a6e8903d';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=c7a6e8903d')],
  ['[data-library]', () => import('./features/library.js?v=c7a6e8903d')],
  ['[data-notes]', () => import('./features/notes.js?v=c7a6e8903d')],
  ['[data-article]', () => import('./features/article.js?v=c7a6e8903d')],
  ['[data-story]', () => import('./features/story.js?v=c7a6e8903d')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=c7a6e8903d')],
  ['[data-document-download]', () => import('./document-downloads.js?v=c7a6e8903d')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
