import { upcomingEvents } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { capitalize, formatDate } from '../site.mjs';
import { externalLink, pageHead, phoneLink, scheduleData, scheduleStatus, serviceRow, siteLink } from '../components.mjs';

/** Months open on first view; the rest unfold with «Показать ещё» (all are visible without JavaScript). */
const INITIAL_MONTHS = 3;

function groupByMonth(events) {
  const months = new Map();
  for (const event of events) {
    const key = event.date.slice(0, 7);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(event);
  }
  return [...months];
}

/** Adds the parish's public Google calendar to the visitor's Google account. */
function googleSubscribe(site) {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(site.settings.calendarId)}`;
}

/** The same public calendar as a live subscription for Apple Calendar, Outlook and others. */
function webcalSubscribe(site) {
  const id = site.settings.calendarId;
  if (!/^[a-f0-9]+@group\.calendar\.google\.com$/.test(id)) throw new Error('Invalid calendarId');
  return `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
}

function calendarLink(site, lang) {
  const target = new URL(site.settings.calendarUrl);
  target.searchParams.set('hl', lang);
  return target.href;
}

export function schedulePage(site, lang, t) {
  const events = upcomingEvents(site.schedule, site.buildTime);
  const months = groupByMonth(events);
  const monthName = monthEvents => capitalize(formatDate(lang, monthEvents[0].start, { month: 'long', year: 'numeric' }));

  return html`${pageHead({ title: t.allServices, intro: t.regular })}
  <section class="shell schedule"${scheduleData(site, lang, t)} data-initial-months="${INITIAL_MONTHS}">
    <div class="schedule__main">
    <div class="schedule__tools" data-schedule-tools hidden>
      <div class="chips" role="group" aria-label="${t.filterLabel}">
        <button type="button" class="chip" data-filter="all" aria-pressed="true">${t.filterAll}</button>
        <button type="button" class="chip" data-filter="feast" aria-pressed="false">${t.filterFeasts}</button>
      </div>
    </div>
    ${months.length > 1 && html`<nav class="month-nav" aria-label="${t.months}">
      ${months.map(([key, monthEvents]) => html`<a class="chip chip--link" href="#m-${key}" data-month-link="${key}">${monthName(monthEvents)}</a>`)}
    </nav>`}
    <div class="months" data-months>
      ${months.map(([key, monthEvents]) => html`<section class="month" id="m-${key}" data-month="${key}" aria-labelledby="h-${key}">
        <h2 class="month__title" id="h-${key}">${monthName(monthEvents)}</h2>
        <ol class="service-list" data-service-list>
          ${monthEvents.map(event => serviceRow(site, lang, t, event))}
        </ol>
      </section>`)}
    </div>
    <p${attrs({ class: 'notice', 'data-empty': true, hidden: events.length > 0 })}>${t.empty}</p>
    <p class="schedule__more"><button type="button" class="button button--quiet" data-show-more hidden>${t.showMore}</button></p>
    </div>
    <aside class="schedule__aside card card--tinted">
      ${scheduleStatus(site, lang, t)}
      <div class="actions">
        ${externalLink(t, calendarLink(site, lang), t.calendar, 'button')}
        ${siteLink(site, `/assets/schedule-${lang}.ics`, html`${icon('download')}${t.calendarDownload}`, 'button button--quiet')}
        ${phoneLink(site, t, 'button button--quiet')}
      </div>
      <p class="hint">${t.calendarNote}</p>
      <h2 class="schedule__aside-title">${t.subscribe}</h2>
      <div class="actions">
        ${externalLink(t, googleSubscribe(site), t.subscribeGoogle, 'button button--quiet')}
        <a class="button button--quiet" href="${webcalSubscribe(site)}">${icon('calendar-plus')}${t.subscribeOther}</a>
      </div>
      <p class="hint">${t.subscribeNote}</p>
    </aside>
  </section>`;
}
