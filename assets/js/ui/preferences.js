import { $, $$, show } from './dom.js?v=d532be9930';

// The same key is read by theme-init.js before first paint.
// Only reading preferences are stored; prayer names never enter browser storage.
const STORAGE_KEY = 'bukiski-reading-v2';
const THEMES = ['auto', 'light', 'dark'];

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      theme: THEMES.includes(saved.theme) ? saved.theme : 'auto',
      large: saved.large === true,
      contrast: saved.contrast === true
    };
  } catch {
    return { theme: 'auto', large: false, contrast: false };
  }
}

function apply({ theme, large, contrast }) {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  root.classList.toggle('large-text', large);
  root.classList.toggle('high-contrast', contrast);
}

function save(preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Persistence is optional; the choice still applies to this page.
  }
}

export function initPreferences() {
  const dialog = $('#preferences');
  const opener = $('[data-preferences-open]');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') return;

  const themes = $$('input[name="theme"]', dialog);
  const large = $('[data-preference="large"]', dialog);
  const contrast = $('[data-preference="contrast"]', dialog);

  const reflect = preferences => {
    for (const input of themes) input.checked = input.value === preferences.theme;
    large.checked = preferences.large;
    contrast.checked = preferences.contrast;
    apply(preferences);
  };
  const current = () => ({
    theme: themes.find(input => input.checked)?.value || 'auto',
    large: large.checked,
    contrast: contrast.checked
  });

  reflect(read());
  show(opener);
  opener.addEventListener('click', () => dialog.showModal());
  $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
  // A click on the dimmed backdrop lands on the dialog element itself.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('change', () => {
    const preferences = current();
    apply(preferences);
    save(preferences);
  });
  $('[data-preferences-reset]', dialog).addEventListener('click', () => {
    reflect({ theme: 'auto', large: false, contrast: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
  });
}
