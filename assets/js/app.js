// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=e1e0695f8e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=e1e0695f8e';
import { initPreferences } from './ui/preferences.js?v=e1e0695f8e';
import { initTilt } from './ui/tilt.js?v=e1e0695f8e';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=e1e0695f8e')],
  ['[data-library]', () => import('./features/library.js?v=e1e0695f8e')],
  ['[data-notes]', () => import('./features/notes.js?v=e1e0695f8e')],
  ['[data-article]', () => import('./features/article.js?v=e1e0695f8e')],
  ['[data-story]', () => import('./features/story.js?v=e1e0695f8e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=e1e0695f8e')],
  ['[data-gpm]', () => import('./features/gpm.js?v=e1e0695f8e')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=e1e0695f8e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=e1e0695f8e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
