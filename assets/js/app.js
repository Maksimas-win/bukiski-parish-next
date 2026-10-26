// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=4bf6e21e5f';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=4bf6e21e5f';
import { initPreferences } from './ui/preferences.js?v=4bf6e21e5f';
import { initTilt } from './ui/tilt.js?v=4bf6e21e5f';
import { initAnnouncement } from './ui/announcement.js?v=4bf6e21e5f';
import { initThanks } from './ui/thanks.js?v=4bf6e21e5f';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=4bf6e21e5f')],
  ['[data-library]', () => import('./features/library.js?v=4bf6e21e5f')],
  ['[data-notes]', () => import('./features/notes.js?v=4bf6e21e5f')],
  ['[data-article]', () => import('./features/article.js?v=4bf6e21e5f')],
  ['[data-story]', () => import('./features/story.js?v=4bf6e21e5f')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=4bf6e21e5f')],
  ['[data-gpm]', () => import('./features/gpm.js?v=4bf6e21e5f')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=4bf6e21e5f')],
  ['[data-document-download]', () => import('./document-downloads.js?v=4bf6e21e5f')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
