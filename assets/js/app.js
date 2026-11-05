// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=631b07643e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=631b07643e';
import { initPreferences } from './ui/preferences.js?v=631b07643e';
import { initTilt } from './ui/tilt.js?v=631b07643e';
import { initAnnouncement } from './ui/announcement.js?v=631b07643e';
import { initThanks } from './ui/thanks.js?v=631b07643e';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=631b07643e')],
  ['[data-library]', () => import('./features/library.js?v=631b07643e')],
  ['[data-notes]', () => import('./features/notes.js?v=631b07643e')],
  ['[data-article]', () => import('./features/article.js?v=631b07643e')],
  ['[data-story]', () => import('./features/story.js?v=631b07643e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=631b07643e')],
  ['[data-gpm]', () => import('./features/gpm.js?v=631b07643e')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=631b07643e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=631b07643e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
