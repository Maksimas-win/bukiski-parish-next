// Applies saved reading preferences before the first paint, so a visitor who
// chose the dark theme never sees a flash of the light one. Loaded as a small
// blocking script; the full preference logic lives in ui/preferences.js.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var saved = JSON.parse(localStorage.getItem('bukiski-reading-v2') || '{}');
    if (saved.theme === 'light' || saved.theme === 'dark') root.dataset.theme = saved.theme;
    if (saved.large === true) root.classList.add('large-text');
    if (saved.contrast === true) root.classList.add('high-contrast');
  } catch (error) {
    // Storage may be blocked; defaults apply.
  }
})();
