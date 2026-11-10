// Progressive enhancement. Every page is complete as server-rendered HTML;
// this entry point wires up controls and loads a feature module only on the
// pages that contain its markup.

import { initCopyButtons } from './ui/copy.js?v=e8fc9cdf22';
import { initLanguageMenu, initMenu } from './ui/menu.js?v=e8fc9cdf22';
import { initPreferences } from './ui/preferences.js?v=e8fc9cdf22';
import { initTilt } from './ui/tilt.js?v=e8fc9cdf22';
import { initAnnouncement } from './ui/announcement.js?v=e8fc9cdf22';
import { initThanks } from './ui/thanks.js?v=e8fc9cdf22';

document.documentElement.classList.add('js');

initMenu();
initLanguageMenu();
initPreferences();
initCopyButtons();
initTilt();
initAnnouncement();
initThanks();

const features = [
  ['[data-schedule]', () => import('./features/schedule.js?v=e8fc9cdf22')],
  ['[data-library]', () => import('./features/library.js?v=e8fc9cdf22')],
  ['[data-notes]', () => import('./features/notes.js?v=e8fc9cdf22')],
  ['[data-article]', () => import('./features/article.js?v=e8fc9cdf22')],
  ['[data-story]', () => import('./features/story.js?v=e8fc9cdf22')],
  ['[data-lightbox]', () => import('./features/lightbox.js?v=e8fc9cdf22')],
  ['[data-gpm]', () => import('./features/gpm.js?v=e8fc9cdf22')],
  ['[data-home-gpm]', () => import('./features/home-gpm.js?v=e8fc9cdf22')],
  ['[data-document-download]', () => import('./document-downloads.js?v=e8fc9cdf22')]
];

for (const [selector, load] of features) {
  if (!document.querySelector(selector)) continue;
  // A feature that fails to load leaves the static page fully usable.
  load().then(feature => feature.init()).catch(error => console.error(error));
}
