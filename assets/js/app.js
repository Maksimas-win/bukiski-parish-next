// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=ea9a3daa2e';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=ea9a3daa2e';
import { initPreferences } from './ui/preferences.js?v=ea9a3daa2e';
import { initTilt } from './ui/tilt.js?v=ea9a3daa2e';
import { initAnnouncement } from './ui/announcement.js?v=ea9a3daa2e';
import { initThanks } from './ui/thanks.js?v=ea9a3daa2e';
import { initSpotlight } from './ui/spotlight.js?v=ea9a3daa2e';
import { initAnalytics } from './analytics.js?v=ea9a3daa2e';

document.documentElement.classList.add('js');
initAnalytics();

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();
initSpotlight();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=ea9a3daa2e')],
  ['[data-library]', () => import('./features/library.js?v=ea9a3daa2e')],
  ['[data-notes]', () => import('./features/notes.js?v=ea9a3daa2e')],
  ['[data-article]', () => import('./features/article.js?v=ea9a3daa2e')],
  ['[data-story]', () => import('./features/story.js?v=ea9a3daa2e')],
  ['[data-history]', () => import('./features/history.js?v=ea9a3daa2e')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=ea9a3daa2e')],
  ['[data-gpm]', () => import('./features/gpm.js?v=ea9a3daa2e')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=ea9a3daa2e')],
  ['[data-document-download]', () => import('./document-downloads.js?v=ea9a3daa2e')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
