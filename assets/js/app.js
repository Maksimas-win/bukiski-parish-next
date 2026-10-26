// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=a9793508ec';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=a9793508ec';
import { initPreferences } from './ui/preferences.js?v=a9793508ec';
import { initTilt } from './ui/tilt.js?v=a9793508ec';
import { initAnnouncement } from './ui/announcement.js?v=a9793508ec';
import { initThanks } from './ui/thanks.js?v=a9793508ec';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=a9793508ec')],
  ['[data-library]', () => import('./features/library.js?v=a9793508ec')],
  ['[data-notes]', () => import('./features/notes.js?v=a9793508ec')],
  ['[data-article]', () => import('./features/article.js?v=a9793508ec')],
  ['[data-story]', () => import('./features/story.js?v=a9793508ec')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=a9793508ec')],
  ['[data-gpm]', () => import('./features/gpm.js?v=a9793508ec')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=a9793508ec')],
  ['[data-document-download]', () => import('./document-downloads.js?v=a9793508ec')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
