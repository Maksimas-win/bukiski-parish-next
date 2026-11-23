// The parish's Orthodox calendar for 2027 as a book that turns its pages.
// The page opens straight on the book; what it can do is explained below it.
// The pages are images and data exported from the typeset PDF edition
// (assets/calendar-2027/); assets/js/features/calendar-book.js turns them,
// and days.json gives the text of every day for the readable day card.
// The calendar exists in Russian only. Without JavaScript the page shows the
// cover and a link to the PDF, which is published on bukiski-hram.org: this
// site publishes no raw PDF files (see docs/DOCUMENTS.md).

import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';

export const CALENDAR_BOOK_PATH = '/ru/calendar-2027.html';
export const CALENDAR_BOOK_PDF = 'https://bukiski-hram.org/assets/docs/pravoslavnyj-kalendar-2027.pdf';
export const CALENDAR_BOOK_TEXT = 'https://bukiski-hram.org/ru/calendar-2027.html';

export const CALENDAR_BOOK = {
  title: 'Православный календарь на 2027 год',
  description: 'Православный календарь на 2027 год в виде книги: страницы листаются как настоящие, у каждого дня есть карточка с памятями святых и чтениями, есть поиск, переход к любой дате и ссылки на тексты Священного Писания.'
};

/** Page shown first when the calendar opens before 2027: «Год на одной странице». */
const INTRO_PAGE = 3;

const FEATURES = [
  ['book', 'Страницы как бумага', 'Потяните за угол — лист загнётся и перевернётся. Можно листать щелчком по краю, стрелками на клавиатуре, а на телефоне — свайпом.'],
  ['calendar', 'Карточка дня', 'Нажмите на число дня: памяти святых, богослужение и чтения откроются крупным шрифтом, с переходом к соседним дням.'],
  ['external', 'Тексты Писания', 'Каждая ссылка на Апостол, Евангелие и паремии открывает текст Священного Писания на «Азбуке веры» в новой вкладке.'],
  ['search', 'Поиск и даты', 'Найдите святого или праздник, перейдите к любой дате 2027 года; найденные строки подсвечиваются прямо на странице.'],
  ['share', 'Ссылка на день', 'Поделитесь днём или страницей: ссылка откроет книгу сразу на нужном месте.'],
  ['church', 'Святые земли Литовской', 'Их памяти отмечены красным. Дни Виленских мучеников (27 апреля) и Собора святых земли Литовской (26 июля) выделены особо.']
];

export function calendarBookPage(site, t) {
  const pdf = CALENDAR_BOOK_PDF;
  return html`<h1 class="visually-hidden">${CALENDAR_BOOK.title}</h1>
  <section class="calendar-book" aria-label="${CALENDAR_BOOK.title}">
    <section${attrs({
      class: 'flipbook',
      'data-flipbook': true,
      'data-src': site.url('/assets/calendar-2027/book.json'),
      'data-days': site.url('/assets/calendar-2027/days.json'),
      'data-pdf': pdf,
      'data-intro': INTRO_PAGE,
      'data-fit': true,
      'data-light': true,
      'data-sound': true,
      'aria-label': `${CALENDAR_BOOK.title} — книга`
    })}>
      <div class="flipbook__fallback">
        <img${attrs({ src: site.url('/assets/calendar-2027/pages/p01.webp'), alt: `Обложка: ${CALENDAR_BOOK.title}`, width: 1600, height: 2263 })}>
        <p>Чтобы листать календарь, нужен JavaScript. Без него календарь можно <a${attrs({ href: pdf, rel: 'noopener noreferrer' })}>открыть в PDF</a> или читать <a${attrs({ href: CALENDAR_BOOK_TEXT, rel: 'noopener noreferrer' })}>по дням на bukiski-hram.org</a>.</p>
      </div>
    </section>
  </section>
  <section class="shell calendar-book-about" aria-labelledby="calendar-book-about">
    <div class="calendar-book-about__intro">
      <p class="eyebrow">${t.pageEyebrows.schedule}</p>
      <h2 id="calendar-book-about">Календарь, который можно листать</h2>
      <p class="lead">Перед вами печатное издание приходского календаря целиком — 79 страниц с памятями святых, чтениями и пометками о богослужении на каждый день 2027 года. Гражданские даты — по новому стилю, рядом указан старый.</p>
      <p class="calendar-book-about__actions">
        <a${attrs({ class: 'button button--quiet', href: CALENDAR_BOOK_TEXT, rel: 'noopener noreferrer' })}>Календарь по дням на bukiski-hram.org</a>
        <a${attrs({ class: 'button button--quiet', href: pdf, rel: 'noopener noreferrer' })}>${icon('download')}PDF для печати</a>
      </p>
    </div>
    <ul class="calendar-book-about__features">
      ${FEATURES.map(([name, title, text]) => html`<li class="calendar-book-about__feature">
        <span class="calendar-book-about__icon" aria-hidden="true">${icon(name)}</span>
        <h3>${title}</h3>
        <p>${text}</p>
      </li>`)}
    </ul>
    <p class="calendar-book-about__note">Рабочая редакция от 22 ноября 2026 года; она не является официальными Богослужебными указаниями. Источники и пределы проверки перечислены в самой книге.</p>
  </section>`;
}
