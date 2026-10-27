// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=5ef072de56';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=5ef072de56';
import { initPreferences } from './ui/preferences.js?v=5ef072de56';
import { initTilt } from './ui/tilt.js?v=5ef072de56';
import { initAnnouncement } from './ui/announcement.js?v=5ef072de56';
import { initThanks } from './ui/thanks.js?v=5ef072de56';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=5ef072de56')],
  ['[data-library]', () => import('./features/library.js?v=5ef072de56')],
  ['[data-notes]', () => import('./features/notes.js?v=5ef072de56')],
  ['[data-article]', () => import('./features/article.js?v=5ef072de56')],
  ['[data-story]', () => import('./features/story.js?v=5ef072de56')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=5ef072de56')],
  ['[data-gpm]', () => import('./features/gpm.js?v=5ef072de56')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=5ef072de56')],
  ['[data-document-download]', () => import('./document-downloads.js?v=5ef072de56')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
