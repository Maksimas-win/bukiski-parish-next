// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=d32bc6c124';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=d32bc6c124';
import { initPreferences } from './ui/preferences.js?v=d32bc6c124';
import { initTilt } from './ui/tilt.js?v=d32bc6c124';
import { initAnnouncement } from './ui/announcement.js?v=d32bc6c124';
import { initThanks } from './ui/thanks.js?v=d32bc6c124';
import { initSpotlight } from './ui/spotlight.js?v=d32bc6c124';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();
initSpotlight();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=d32bc6c124')],
  ['[data-library]', () => import('./features/library.js?v=d32bc6c124')],
  ['[data-notes]', () => import('./features/notes.js?v=d32bc6c124')],
  ['[data-article]', () => import('./features/article.js?v=d32bc6c124')],
  ['[data-story]', () => import('./features/story.js?v=d32bc6c124')],
  ['[data-history]', () => import('./features/history.js?v=d32bc6c124')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=d32bc6c124')],
  ['[data-gpm]', () => import('./features/gpm.js?v=d32bc6c124')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=d32bc6c124')],
  ['[data-document-download]', () => import('./document-downloads.js?v=d32bc6c124')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
