// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=a069d6adcf';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=a069d6adcf';
import { initPreferences } from './ui/preferences.js?v=a069d6adcf';
import { initTilt } from './ui/tilt.js?v=a069d6adcf';
import { initAnnouncement } from './ui/announcement.js?v=a069d6adcf';
import { initThanks } from './ui/thanks.js?v=a069d6adcf';
import { initSpotlight } from './ui/spotlight.js?v=a069d6adcf';
import { initAnalytics } from './analytics.js?v=a069d6adcf';

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
  ['[data-schedule]', () => import('./features/schedule.js?v=a069d6adcf')],
  ['[data-library]', () => import('./features/library.js?v=a069d6adcf')],
  ['[data-notes]', () => import('./features/notes.js?v=a069d6adcf')],
  ['[data-article]', () => import('./features/article.js?v=a069d6adcf')],
  ['[data-story]', () => import('./features/story.js?v=a069d6adcf')],
  ['[data-history]', () => import('./features/history.js?v=a069d6adcf')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=a069d6adcf')],
  ['[data-gpm]', () => import('./features/gpm.js?v=a069d6adcf')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=a069d6adcf')],
  ['[data-document-download]', () => import('./document-downloads.js?v=a069d6adcf')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
