// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=e8326ac698';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=e8326ac698';
import { initPreferences } from './ui/preferences.js?v=e8326ac698';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=e8326ac698')],
  ['[data-library]', () => import('./features/library.js?v=e8326ac698')],
  ['[data-notes]', () => import('./features/notes.js?v=e8326ac698')],
  ['[data-article]', () => import('./features/article.js?v=e8326ac698')],
  ['[data-story]', () => import('./features/story.js?v=e8326ac698')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=e8326ac698')],
  ['[data-document-download]', () => import('./document-downloads.js?v=e8326ac698')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
