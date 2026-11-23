// The parish's Orthodox calendar for 2027 as a book that turns its pages.
// The pages are images and data exported from the typeset PDF edition
// (assets/calendar-2027/); assets/js/features/calendar-book.js turns them.
// The calendar exists in Russian only. Without JavaScript the page shows the
// cover and a link to the PDF, which is published on bukiski-hram.org: this
// site publishes no raw PDF files (see docs/DOCUMENTS.md).

import { html, attrs } from '../html.mjs';
import { pageHead } from '../components.mjs';

export const CALENDAR_BOOK_PATH = '/ru/calendar-2027.html';
export const CALENDAR_BOOK_PDF = 'https://bukiski-hram.org/assets/docs/pravoslavnyj-kalendar-2027.pdf';
export const CALENDAR_BOOK_TEXT = 'https://bukiski-hram.org/ru/calendar-2027.html';

export const CALENDAR_BOOK = {
  title: 'Православный календарь на 2027 год',
  description: 'Православный календарь на 2027 год в виде книги: страницы печатного издания листаются как настоящие, есть поиск, переход к любому дню и ссылки на евангельские и апостольские чтения.'
};

export function calendarBookPage(site, t) {
  const pdf = CALENDAR_BOOK_PDF;
  return html`${pageHead({
    title: CALENDAR_BOOK.title,
    intro: 'Печатное издание целиком: листайте страницы, ищите святых и праздники, переходите к нужному дню. Ссылка на чтение открывает текст Священного Писания на «Азбуке веры», число дня — этот день в её календаре.',
    kicker: t.pageEyebrows.schedule
  })}
  <section class="shell calendar-book">
    <section${attrs({
      class: 'flipbook',
      'data-flipbook': true,
      'data-src': site.url('/assets/calendar-2027/book.json'),
      'data-pdf': pdf,
      'aria-label': `${CALENDAR_BOOK.title} — книга`
    })}>
      <div class="flipbook__fallback">
        <img${attrs({ src: site.url('/assets/calendar-2027/pages/p01.webp'), alt: `Обложка: ${CALENDAR_BOOK.title}`, width: 1600, height: 2263 })}>
        <p>Чтобы листать календарь, нужен JavaScript. Без него календарь можно <a${attrs({ href: pdf, rel: 'noopener noreferrer' })}>открыть в PDF</a> или читать <a${attrs({ href: CALENDAR_BOOK_TEXT, rel: 'noopener noreferrer' })}>по дням на bukiski-hram.org</a>.</p>
      </div>
    </section>
    <p class="calendar-book__actions">
      <a${attrs({ class: 'button button--quiet', href: CALENDAR_BOOK_TEXT, rel: 'noopener noreferrer' })}>Календарь по дням на bukiski-hram.org</a>
      <a${attrs({ class: 'button button--quiet', href: pdf, rel: 'noopener noreferrer' })}>PDF для печати</a>
    </p>
  </section>`;
}
