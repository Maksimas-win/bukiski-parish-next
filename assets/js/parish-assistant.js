import { mountAssistant } from './assistant/widget.js?v=865c754a6b';

const script = document.querySelector('script[data-parish-assistant-entry]');
if (script && typeof HTMLDialogElement !== 'undefined') {
  // Resolve the site root from this installed script, including GitHub Pages subpaths.
  const root = new URL('../../', script.src);
  const base = root.pathname.replace(/\/$/, '');
  const schedule = new URL(script.dataset.assistantSchedule || 'data/services.json', root);
  mountAssistant({
    site: script.dataset.assistantSite === 'org' ? 'org' : 'net',
    locale: document.documentElement.lang.split('-')[0],
    base, scheduleURL: schedule.href
  });
}
