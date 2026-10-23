// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=8cebb2077c';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=8cebb2077c';
import { initPreferences } from './ui/preferences.js?v=8cebb2077c';
import { initTilt } from './ui/tilt.js?v=8cebb2077c';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=8cebb2077c')],
  ['[data-library]', () => import('./features/library.js?v=8cebb2077c')],
  ['[data-notes]', () => import('./features/notes.js?v=8cebb2077c')],
  ['[data-article]', () => import('./features/article.js?v=8cebb2077c')],
  ['[data-story]', () => import('./features/story.js?v=8cebb2077c')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=8cebb2077c')],
  ['[data-document-download]', () => import('./document-downloads.js?v=8cebb2077c')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
