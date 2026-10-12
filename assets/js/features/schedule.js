// Keeps the server-rendered list of services honest while the page is open:
// hides services that have started, marks today and tomorrow, warns when the
// snapshot is too old, and offers filters and calendar files.
//
// Every service is already in the HTML. Nothing is fetched.

import { calendarDaysBetween, icsCalendar, isStale, localDate } from '../domain.js?v=7ea56eb825';
import { $, $$, show, downloadText } from '../ui/dom.js?v=7ea56eb825';
import { toast } from '../ui/toast.js?v=7ea56eb825';

const REFRESH_MS = 60000;
/** How far ahead the featured service is labelled with «через N дней». */
const RELATIVE_DAYS_FEATURED = 6;

function relativeLabel(locale, days) {
  const label = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

function setup(container) {
  const locale = document.body.dataset.locale;
  const limit = Number(container.dataset.limit) || Infinity;
  const featured = Number.isFinite(limit);
  const services = $$('[data-service]', container).map(element => ({
    element,
    start: Date.parse(element.dataset.start),
    feast: element.dataset.feast === 'true',
    badge: $('[data-relative]', element)
  }));
  const months = $$('[data-month]', container);
  const moreButton = $('[data-show-more]', container);
  const filters = $$('[data-filter]', container);
  const state = {
    filter: 'all',
    openMonths: Number(container.dataset.initialMonths) || Infinity
  };

  function render() {
    const now = Date.now();
    let shown = 0;
    let next = null;

    for (const service of services) {
      const upcoming = service.start >= now;
      const matches = state.filter === 'all' || service.feast;
      const visible = upcoming && matches && shown < limit;
      if (visible) shown += 1;
      if (visible && !next) next = service;
      show(service.element, visible);

      const days = calendarDaysBetween(now, service.start);
      const labelled = upcoming && (days <= 1 || (featured && service === next && days <= RELATIVE_DAYS_FEATURED));
      if (labelled) service.badge.textContent = relativeLabel(locale, days);
      show(service.badge, labelled);
    }
    if (featured) for (const service of services) service.element.classList.toggle('is-next', service === next);

    // Months unfold a few at a time; a filter shows every month that still has a match.
    let openable = 0;
    let folded = 0;
    for (const month of months) {
      const hasServices = $$('[data-service]', month).some(element => !element.hidden);
      const open = hasServices && (state.filter !== 'all' || openable < state.openMonths);
      if (hasServices) openable += 1;
      if (hasServices && !open) folded += 1;
      show(month, open);
      show($(`[data-month-link="${month.dataset.month}"]`, container), hasServices);
    }
    show(moreButton, folded > 0);
    show($('[data-empty]', container), shown === 0);
    show($('[data-stale]', container), isStale({ sourceUpdatedAt: container.dataset.updated }, now, Number(container.dataset.maxAgeHours) || 48));
  }

  for (const button of filters) {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      for (const other of filters) other.setAttribute('aria-pressed', String(other === button));
      render();
    });
  }
  show($('[data-schedule-tools]', container), filters.length > 0 && services.some(service => service.feast));

  moreButton?.addEventListener('click', () => {
    const firstNew = months.filter(month => month.hidden && $$('[data-service]', month).some(element => !element.hidden))[0];
    state.openMonths += Number(container.dataset.initialMonths) || 3;
    render();
    $('h2', firstNew)?.scrollIntoView({ block: 'start' });
  });

  // A month chip must work even when its month is still folded.
  for (const link of $$('[data-month-link]', container)) {
    link.addEventListener('click', () => {
      const position = months.filter(month => $$('[data-service]', month).some(element => !element.hidden))
        .findIndex(month => month.dataset.month === link.dataset.monthLink);
      if (position >= state.openMonths) {
        state.openMonths = position + 1;
        render();
      }
    });
  }

  for (const service of services) {
    const button = $('[data-add-to-calendar]', service.element);
    show(button);
    button.addEventListener('click', () => {
      const { id, start, title, subtitle } = service.element.dataset;
      const { location, calendarName, calendarNote, uidDomain, updated, labelDownloaded } = container.dataset;
      const calendar = icsCalendar({
        events: [{ id, start, title, subtitle }],
        lang: locale,
        name: calendarName,
        location,
        note: calendarNote,
        stamp: updated,
        uidDomain
      });
      downloadText(`service-${localDate(start)}.ics`, calendar, 'text/calendar;charset=utf-8');
      toast(labelDownloaded);
    });
  }

  render();
  setInterval(() => {
    if (document.visibilityState === 'visible') render();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render();
  });
}

/** «Открыть расписание» opens the services dialog; without it the link leads to the schedule page. */
function setupDialog() {
  const dialog = document.getElementById('services-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  for (const link of $$('[data-schedule-open]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      dialog.showModal();
      $('[data-dialog-close]', dialog)?.focus();
    });
  }
  $('[data-dialog-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
}

export function init() {
  for (const container of $$('[data-schedule]')) setup(container);
  setupDialog();
}
