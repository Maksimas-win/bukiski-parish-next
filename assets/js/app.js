// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=865c754a6b';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=865c754a6b';
import { initPreferences } from './ui/preferences.js?v=865c754a6b';
import { initTilt } from './ui/tilt.js?v=865c754a6b';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=865c754a6b')],
  ['[data-library]', () => import('./features/library.js?v=865c754a6b')],
  ['[data-notes]', () => import('./features/notes.js?v=865c754a6b')],
  ['[data-article]', () => import('./features/article.js?v=865c754a6b')],
  ['[data-story]', () => import('./features/story.js?v=865c754a6b')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=865c754a6b')],
  ['[data-gpm]', () => import('./features/gpm.js?v=865c754a6b')],
  ['[data-document-download]', () => import('./document-downloads.js?v=865c754a6b')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
