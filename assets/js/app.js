// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { enableDocumentDownloads } from './document-downloads.js';
import { initCopyButtons } from './ui/copy.js';
import { initMenu } from './ui/menu.js';
import { initPreferences } from './ui/preferences.js';

const siteRoot = new URL(document.body.dataset.root, location.href);
document.documentElement.classList.add('js');

initMenu();
initPreferences();
initCopyButtons();
enableDocumentDownloads(siteRoot);

const features = [
  ['[data-schedule]', () => import('./features/schedule.js')],
  ['[data-library]', () => import('./features/library.js')],
  ['[data-notes]', () => import('./features/notes.js')],
  ['[data-article]', () => import('./features/article.js')],
  ['[data-lightbox]', () => import('./features/lightbox.js')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
