// Calendar book: a page-turning viewer for the parish calendar.
//
// The pages are images rendered from the typeset PDF. book.json lists them with
// their links (to days inside the book, to the Bible readings and to the day
// pages on Azbyka), the contents and the position of every day; text.json holds
// the text of each page with line boxes for search and for screen readers.
//
// Turning is computed as a fold of paper: the corner of the leaf follows the
// pointer, the fold line is the perpendicular bisector of the corner and the
// pointer, the lifted part is mirrored over that line and shows the back of
// the leaf.
//
// The module stores nothing, requests only its own JSON and images, and sets
// positions through the CSSOM, so it works under a strict style-src policy.
//
// Optional, switched on by attributes of the [data-flipbook] element:
//   data-days="…/days.json"  a readable card of a day (text, readings, sharing),
//                            opened from the day number or by a tap on a day
//   data-intro="3"           the book arrives and opens by itself (to today in the
//                            year of the calendar, otherwise to this page)
//   data-fit                 the book takes the rest of the window below it
//   data-light               a soft light follows the pointer over the book
//   data-sound               a switch for a quiet page-turn sound (made on the fly)

const STRINGS = {
  label: 'Православный календарь на 2027 год — книга',
  title: 'Православный календарь',
  year: '2027',
  contents: 'Содержание',
  search: 'Поиск',
  date: 'Дата',
  overview: 'Все страницы',
  zoom: 'Увеличить',
  zoomIn: 'Крупнее',
  zoomOut: 'Мельче',
  fullscreen: 'На весь экран',
  exitFullscreen: 'Свернуть',
  share: 'Ссылка на эту страницу',
  copied: 'Ссылка скопирована',
  pdf: 'Скачать PDF',
  close: 'Закрыть',
  prev: 'Назад',
  next: 'Вперёд',
  first: 'К обложке',
  page: 'Страница {n}',
  pagesOf: 'Страницы {a}–{b} из {total}',
  pageOf: 'Страница {a} из {total}',
  short: '{a} / {total}',
  shortPair: '{a}–{b} / {total}',
  book: 'книга',
  searchLabel: 'Искать в календаре',
  searchPlaceholder: 'Святой, праздник, чтение…',
  searchHint: 'Введите не меньше двух букв. Поиск не различает ё и е.',
  searchLoading: 'Загружаю текст календаря…',
  nothing: 'Ничего не найдено',
  found: 'Совпадений: {n}',
  more: 'и ещё {n} на этой странице',
  today: 'Сегодня',
  todayOutside: 'Календарь охватывает 2027 год',
  onSpread: 'на развороте',
  months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  monthsGen: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  prevMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  hint: 'Потяните за угол страницы, нажмите на край или листайте стрелками',
  hintTouch: 'Свайп — перелистнуть, касание в центре — крупно',
  hintDays: 'Потяните за угол страницы. Нажмите на число дня — откроется карточка дня',
  hintDaysTouch: 'Свайп — листать, касание дня — его карточка',
  sound: 'Звук страниц',
  dayCard: 'Карточка дня',
  dayLoading: 'Загружаю текст дня…',
  prevDay: 'Предыдущий день',
  nextDay: 'Следующий день',
  showPage: 'Показать в книге',
  shareDay: 'Поделиться',
  onAzbyka: '«Азбука веры»',
  onAzbykaLabel: 'Этот день в календаре «Азбуки веры»',
  oldStyle: 'по ст. ст.',
  fast: 'пост',
  meatless: 'без мяса',
  great: 'великий праздник',
  readings: 'Чтения открываются на «Азбуке веры»',
  external: 'откроется в новой вкладке',
  scrub: 'Страница',
  blank: 'Форзац'
};

const ICONS = {
  prev: 'M14.5 5.5 8 12l6.5 6.5',
  next: 'M9.5 5.5 16 12l-6.5 6.5',
  first: 'M17 5.5 10.5 12l6.5 6.5M7 6v12',
  toc: 'M5 6.5h14M5 12h14M5 17.5h9',
  search: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm4.3 10.3 4.7 4.7',
  date: 'M5 6.5h14v13H5zM5 10.5h14M9 4v4M15 4v4M8.5 14h2M13.5 14h2M8.5 17h2',
  grid: 'M5 5h5.5v5.5H5zM13.5 5H19v5.5h-5.5zM5 13.5h5.5V19H5zM13.5 13.5H19V19h-5.5z',
  zoom: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm4.3 10.3 4.7 4.7M10.5 7.8v5.4M7.8 10.5h5.4',
  unzoom: 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm4.3 10.3 4.7 4.7M7.8 10.5h5.4',
  full: 'M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15',
  unfull: 'M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5',
  link: 'M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1',
  pdf: 'M12 4.5v10M7.5 10.5 12 15l4.5-4.5M5.5 19.5h13',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  out: 'M14 5h5v5M19 5l-7.5 7.5M17 13.5V19H5V7h5.5',
  sound: 'M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11',
  mute: 'M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM16 9.5l5 5M21 9.5l-5 5',
  book: 'M4 6.5c3-1 5.5-.8 8 1 2.5-1.8 5-2 8-1v11c-3-1-5.5-.8-8 1-2.5-1.8-5-2-8-1zM12 7.5v11',
  share: 'M12 4.5v10M8 8.5l4-4 4 4M6 12.5v6h12v-6'
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) {
      continue;
    }
    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key.startsWith('on')) {
      node.addEventListener(key.slice(2), value);
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) {
      node.append(child);
    }
  }
  return node;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'flipbook__icon');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (all, key) => (key in values ? String(values[key]) : all));
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const fold = text => text.toLowerCase().replace(/ё/g, 'е');

/** Keep the part of a polygon where f(point) >= 0 (one Sutherland–Hodgman pass). */
function clipPolygon(points, f) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) {
      out.push(a);
    }
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      out.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t });
    }
  }
  return out;
}

function polygon(points) {
  if (points.length < 3) {
    return 'polygon(0 0, 0 0, 0 0)';
  }
  return `polygon(${points.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(', ')})`;
}

class FlipBook {
  constructor(root, data, base) {
    this.root = root;
    this.data = data;
    this.base = base;
    this.t = { ...STRINGS };
    try {
      Object.assign(this.t, JSON.parse(root.dataset.strings || '{}'));
    } catch {
      // keep the built-in Russian strings
    }
    this.count = data.count;
    // Pages in book order. An odd page count gets a blank endpaper before the
    // back cover, so that odd pages stay on the right and the back cover closes
    // the book on the left, as in print.
    this.slots = Array.from({ length: this.count }, (_, i) => i + 1);
    if (this.count % 2 === 1 && this.count > 2) {
      this.slots.splice(this.count - 1, 0, 0);
    }
    this.spreads = Math.floor(this.slots.length / 2) + 1;
    this.sections = [...data.toc].sort((a, b) => a.page - b.page);
    this.dayList = Object.entries(data.days).sort(([a], [b]) => a.localeCompare(b));
    this.mode = '';
    this.pos = 0;
    this.cur = 1;
    this.cache = new Map();
    this.attached = new Map();
    this.flip = null;
    this.raf = 0;
    this.press = null;
    this.pending = null;
    this.marks = null;
    this.text = null;
    this.textPromise = null;
    this.calendarMonth = 0;
    this.zoomLevel = 1;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.coarse = window.matchMedia('(pointer: coarse)');
    this.days = null;
    this.daysPromise = null;
    this.dayKey = '';
    this.soundOn = false;
    this.audio = null;
    this.build();
    this.bind();
    this.fit();
    this.layout();
    const fromLink = this.parseHash();
    const start = fromLink || { page: 1 };
    this.pos = this.positionOf(start.page);
    this.renderStatic();
    this.updateShift(false);
    this.afterNavigate(start, false);
    if (root.dataset.intro !== undefined && !fromLink && !this.reduced.matches) {
      this.intro();
    } else {
      this.showHint();
    }
    window.setTimeout(() => this.loadText(), 2500);
    if (this.root.dataset.days) {
      window.setTimeout(() => this.loadDays(), 1500);
    }
  }

  /** The book arrives, then opens by itself: to today in the calendar's year, otherwise to a chosen page. */
  intro() {
    const today = this.todayKey();
    const target = today && this.data.days[today]
      ? { page: this.data.days[today][0], day: today }
      : { page: clamp(Number(this.root.dataset.intro) || 3, 1, this.count) };
    let stopped = false;
    const stop = () => {
      stopped = true;
    };
    this.root.addEventListener('pointerdown', stop, { once: true });
    this.root.addEventListener('keydown', stop, { once: true });
    this.root.classList.add('flipbook--intro');
    window.setTimeout(() => {
      this.root.classList.remove('flipbook--intro');
      if (stopped || this.flip || this.pos !== this.minPos) {
        this.showHint();
        return;
      }
      this.turnTo(this.positionOf(target.page), { ...target, quiet: !target.day });
      if (target.day && this.root.dataset.days && this.mode === 'spread') {
        this.afterTurn = () => this.openDay(target.day, false);
      }
      window.setTimeout(() => this.showHint(), 1300);
    }, 1150);
  }

  todayKey() {
    const now = new Date();
    if (now.getFullYear() !== this.data.year) {
      return '';
    }
    return `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }

  /** With data-fit, the book fills the window below its top edge (not on narrow screens). */
  fit() {
    if (this.root.dataset.fit === undefined) {
      return;
    }
    const wide = this.root.clientWidth >= 720 && !this.root.classList.contains('flipbook--immersive') && !this.root.classList.contains('flipbook--fullscreen');
    if (!wide) {
      this.root.style.height = '';
      return;
    }
    const top = this.root.getBoundingClientRect().top + window.scrollY;
    const height = clamp(window.innerHeight - top - 12, 520, 1400);
    this.root.style.height = `${Math.round(height)}px`;
  }

  // --- Structure ------------------------------------------------------------

  build() {
    const t = this.t;
    const root = this.root;
    root.replaceChildren();
    root.classList.add('flipbook--ready');
    root.classList.toggle('flipbook--cards', Boolean(root.dataset.days));
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', t.label);

    const tool = (name, iconName, label, handler, cls = '') => {
      const node = h('button', { type: 'button', class: `flipbook__tool ${cls}`.trim(), title: label, onclick: handler },
        icon(iconName), h('span', { class: 'flipbook__tool-label', text: label }));
      this[name] = node;
      return node;
    };

    // The PDF may live on the other parish site; then it opens in a new tab.
    const pdfAway = Boolean(root.dataset.pdf) && new URL(root.dataset.pdf, document.baseURI).origin !== window.location.origin;
    this.pdfLink = root.dataset.pdf
      ? h('a', {
        class: 'flipbook__tool flipbook__tool--minor', href: root.dataset.pdf, title: t.pdf,
        download: pdfAway ? null : root.dataset.pdfName || '', target: pdfAway ? '_blank' : null, rel: pdfAway ? 'noopener noreferrer' : null
      }, icon('pdf'), h('span', { class: 'flipbook__tool-label', text: t.pdf }))
      : null;

    this.top = h('div', { class: 'flipbook__bar flipbook__bar--top' },
      h('p', { class: 'flipbook__brand' }, h('span', { class: 'flipbook__brand-title', text: t.title }), h('span', { class: 'flipbook__brand-year', text: t.year })),
      h('div', { class: 'flipbook__tools' },
        tool('tocButton', 'toc', t.contents, () => this.togglePanel('toc')),
        tool('searchButton', 'search', t.search, () => this.togglePanel('search')),
        tool('dateButton', 'date', t.date, () => this.togglePanel('date')),
        tool('gridButton', 'grid', t.overview, () => this.openOverview()),
        h('span', { class: 'flipbook__sep', 'aria-hidden': 'true' }),
        root.dataset.sound !== undefined ? tool('soundButton', 'mute', t.sound, () => this.toggleSound(), 'flipbook__tool--minor') : null,
        tool('zoomButton', 'zoom', t.zoom, () => this.openZoom(), 'flipbook__tool--minor'),
        tool('fullButton', 'full', t.fullscreen, () => this.toggleFullscreen(), 'flipbook__tool--minor'),
        tool('shareButton', 'link', t.share, () => this.share(), 'flipbook__tool--minor'),
        this.pdfLink));

    this.book = h('div', { class: 'flipbook__book', role: 'group', 'aria-roledescription': t.book, tabindex: '0' });
    this.under = h('div', { class: 'flipbook__under', 'aria-hidden': 'true' }, h('div', { class: 'flipbook__under-shade' }));
    this.backWrap = h('div', { class: 'flipbook__back', 'aria-hidden': 'true' });
    this.shade = h('div', { class: 'flipbook__back-shade', 'aria-hidden': 'true' }, h('div', { class: 'flipbook__back-light' }));
    this.paper = h('div', { class: 'flipbook__page flipbook__page--paper' }, h('img', { class: 'flipbook__img', alt: '', draggable: 'false' }));
    this.ground = h('div', { class: 'flipbook__ground', 'aria-hidden': 'true' });
    this.edgeLeft = h('div', { class: 'flipbook__edge flipbook__edge--left', 'aria-hidden': 'true' });
    this.edgeRight = h('div', { class: 'flipbook__edge flipbook__edge--right', 'aria-hidden': 'true' });
    this.book.append(this.ground, this.edgeLeft, this.edgeRight, this.under, this.backWrap, this.shade);
    this.shifter = h('div', { class: 'flipbook__shifter' }, this.book);
    this.prevButton = h('button', { type: 'button', class: 'flipbook__turn flipbook__turn--prev', title: t.prev, 'aria-label': t.prev, onclick: () => this.prev() }, icon('prev'));
    this.nextButton = h('button', { type: 'button', class: 'flipbook__turn flipbook__turn--next', title: t.next, 'aria-label': t.next, onclick: () => this.next() }, icon('next'));
    this.hint = h('p', { class: 'flipbook__hint', 'aria-hidden': 'true' });
    this.tip = h('div', { class: 'flipbook__tip', role: 'tooltip', hidden: true });
    this.stage = h('div', { class: 'flipbook__stage' }, this.shifter, this.prevButton, this.nextButton, this.hint);

    this.scrub = h('input', { class: 'flipbook__scrub', type: 'range', min: '1', max: String(this.count), step: '1', value: '1', 'aria-label': t.scrub });
    this.scrubTip = h('div', { class: 'flipbook__scrub-tip', 'aria-hidden': 'true' },
      h('img', { class: 'flipbook__scrub-thumb', alt: '' }), h('span', { class: 'flipbook__scrub-text' }));
    this.ticks = h('div', { class: 'flipbook__ticks' });
    for (const section of this.sections.filter(s => s.month)) {
      const index = t.months.indexOf(section.label);
      const tick = h('button', { type: 'button', class: 'flipbook__tick', title: section.label, onclick: () => this.goToPage(section.page) },
        h('span', { class: 'flipbook__tick-long', text: section.label.slice(0, 3) }),
        h('span', { class: 'flipbook__tick-short', text: index >= 0 ? String(index + 1) : section.label.slice(0, 1) }));
      tick.style.left = `${((section.page - 1) / (this.count - 1)) * 100}%`;
      this.ticks.append(tick);
    }
    this.pageLabel = h('output', { class: 'flipbook__count', 'aria-live': 'off' });
    this.bottom = h('div', { class: 'flipbook__bar flipbook__bar--bottom' },
      h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', title: t.first, 'aria-label': t.first, onclick: () => this.goToPage(1) }, icon('first')),
      h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', title: t.prev, 'aria-label': t.prev, onclick: () => this.prev() }, icon('prev')),
      h('div', { class: 'flipbook__track' }, this.scrub, this.ticks, this.scrubTip),
      h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', title: t.next, 'aria-label': t.next, onclick: () => this.next() }, icon('next')),
      this.pageLabel);

    this.panelTitle = h('h2', { class: 'flipbook__panel-title' });
    this.panelBody = h('div', { class: 'flipbook__panel-body' });
    this.panel = h('aside', { class: 'flipbook__panel', hidden: true, 'aria-labelledby': '' },
      h('div', { class: 'flipbook__panel-head' }, this.panelTitle,
        h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', title: t.close, 'aria-label': t.close, onclick: () => this.togglePanel(null) }, icon('close'))),
      this.panelBody);
    const panelId = `flipbook-panel-${Math.random().toString(36).slice(2, 8)}`;
    this.panelTitle.id = panelId;
    this.panel.setAttribute('aria-labelledby', panelId);

    this.live = h('p', { class: 'flipbook__live', 'aria-live': 'polite' });
    this.reader = h('div', { class: 'flipbook__reader' });
    this.toast = h('p', { class: 'flipbook__toast', role: 'status', hidden: true });
    root.append(this.top, this.stage, this.bottom, this.panel, this.tip, this.toast, this.live, this.reader);

    if (this.soundButton) {
      this.soundButton.setAttribute('aria-pressed', 'false');
    }
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
      this.fullButton.dataset.immersive = '1';
    }
  }

  bind() {
    const book = this.book;
    book.addEventListener('pointerdown', event => this.onDown(event));
    book.addEventListener('pointermove', event => this.onMove(event));
    book.addEventListener('pointerup', event => this.onUp(event, false));
    book.addEventListener('pointercancel', event => this.onUp(event, true));
    book.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !this.press) {
        this.unpeel();
      }
    });
    book.addEventListener('click', event => this.onClick(event));
    book.addEventListener('dragstart', event => event.preventDefault());
    book.addEventListener('pointerover', event => this.showTip(event));
    book.addEventListener('pointerout', event => {
      if (event.target.closest && event.target.closest('.flipbook__link')) {
        this.tip.hidden = true;
      }
    });
    book.addEventListener('focusin', event => this.showTip(event));
    book.addEventListener('focusout', () => {
      this.tip.hidden = true;
    });
    this.root.addEventListener('keydown', event => this.onKey(event));

    this.scrub.addEventListener('input', () => this.previewScrub());
    this.scrub.addEventListener('change', () => {
      this.scrubTip.classList.remove('is-visible');
      this.goToPage(Number(this.scrub.value));
    });
    this.scrub.addEventListener('pointerup', () => this.scrubTip.classList.remove('is-visible'));
    this.scrub.addEventListener('blur', () => this.scrubTip.classList.remove('is-visible'));

    this.resizeFrame = 0;
    new window.ResizeObserver(() => {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = window.requestAnimationFrame(() => this.layout());
    }).observe(this.stage);

    if (this.root.dataset.fit !== undefined) {
      let frame = 0;
      window.addEventListener('resize', () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => this.fit());
      });
    }
    if (this.root.dataset.light !== undefined && window.matchMedia('(pointer: fine)').matches && !this.reduced.matches) {
      this.root.classList.add('flipbook--light');
      let frame = 0;
      this.stage.addEventListener('pointermove', event => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          const box = this.stage.getBoundingClientRect();
          this.stage.style.setProperty('--flipbook-light-x', `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
          this.stage.style.setProperty('--flipbook-light-y', `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
        });
      });
    }
    window.addEventListener('hashchange', () => {
      const target = this.parseHash();
      if (target) {
        this.goToPage(target.page, target);
      }
    });
    const onFull = () => {
      const on = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      this.setFullscreenState(on);
    };
    document.addEventListener('fullscreenchange', onFull);
    document.addEventListener('webkitfullscreenchange', onFull);
  }

  // --- Positions ------------------------------------------------------------

  slotAt(index) {
    return index >= 0 && index < this.slots.length ? this.slots[index] : undefined;
  }

  spreadSlots(index) {
    return { left: index === 0 ? undefined : this.slotAt(2 * index - 1), right: this.slotAt(2 * index) };
  }

  positionOf(page) {
    if (this.mode === 'single') {
      return clamp(page, 1, this.count);
    }
    const index = this.slots.indexOf(clamp(page, 1, this.count));
    return Math.floor((index + 1) / 2);
  }

  get minPos() {
    return this.mode === 'single' ? 1 : 0;
  }

  get maxPos() {
    return this.mode === 'single' ? this.count : this.spreads - 1;
  }

  pagesAt(pos) {
    if (this.mode === 'single') {
      return [pos];
    }
    const { left, right } = this.spreadSlots(pos);
    return [left, right].filter(n => n > 0);
  }

  sectionOf(page) {
    let found = this.sections[0];
    for (const section of this.sections) {
      if (section.page <= page) {
        found = section;
      }
    }
    if (page === 1) {
      return { label: '' };
    }
    return found || { label: '' };
  }

  file(kind, page) {
    const pad = String(page).padStart(this.data.files.pad || 1, '0');
    return new URL(this.data.files[kind].replace('{n}', pad), this.base).href;
  }

  // --- Layout ---------------------------------------------------------------

  layout() {
    const style = window.getComputedStyle(this.stage);
    const box = {
      width: this.stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      height: this.stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    };
    if (box.width < 50 || box.height < 50) {
      return;
    }
    const ratio = this.data.ratio;
    const narrow = box.width < 720;
    const padX = narrow ? 8 : 76;
    const padY = narrow ? 10 : 26;
    const width = box.width - 2 * padX;
    const height = box.height - 2 * padY;
    const spreadWidth = Math.floor(Math.min(height / ratio, width / 2));
    const singleWidth = Math.floor(Math.min(height / ratio, width));
    const mode = !narrow && spreadWidth >= 230 && box.width >= box.height * 0.95 ? 'spread' : 'single';
    const pw = mode === 'spread' ? spreadWidth : singleWidth;
    if (this.flip) {
      this.stopTween();
      this.endFlip(Boolean(this.flip.auto));
    }
    const changed = mode !== this.mode;
    this.mode = mode;
    this.pw = pw;
    this.ph = Math.round(pw * ratio);
    this.spine = mode === 'spread' ? pw : 0;
    this.book.style.width = `${mode === 'spread' ? 2 * pw : pw}px`;
    this.book.style.height = `${this.ph}px`;
    this.root.classList.toggle('flipbook--spread', mode === 'spread');
    this.root.classList.toggle('flipbook--single', mode === 'single');
    this.root.style.setProperty('--flipbook-page-width', `${pw}px`);
    if (changed) {
      this.pos = this.positionOf(this.cur);
    }
    this.renderStatic();
    this.updateShift(false);
    this.updateChrome();
  }

  updateShift(animate, onlyShift = false) {
    let shift = 0;
    if (this.mode === 'spread') {
      const { left, right } = this.spreadSlots(this.pos);
      if (left === undefined) {
        shift = -this.pw / 2;
      } else if (right === undefined) {
        shift = this.pw / 2;
      }
    }
    this.shifter.classList.toggle('is-moving', Boolean(animate) && !this.reduced.matches);
    this.shifter.style.transform = `translateX(${shift}px)`;
    if (onlyShift) {
      return;
    }
    // the edges of the closed pages, thinner on the side already read
    const share = this.mode === 'spread' ? this.pos / (this.spreads - 1) : (this.pos - 1) / Math.max(1, this.count - 1);
    const pages = this.pagesAt(this.pos);
    const hasLeft = this.mode === 'spread' && this.spreadSlots(this.pos).left !== undefined;
    const hasRight = this.mode === 'single' || this.spreadSlots(this.pos).right !== undefined;
    const left = hasLeft ? Math.round(1 + 6 * share) : 0;
    const right = hasRight && pages.length ? Math.round(1 + 6 * (1 - share)) : 0;
    this.setGround(hasLeft, hasRight);
    this.edgeLeft.style.width = `${left}px`;
    this.edgeRight.style.width = `${right}px`;
  }

  /** The shadow under the open pages and the edges of the closed ones. */
  setGround(hasLeft, hasRight) {
    const pw = this.pw;
    const x0 = this.mode === 'spread' && !hasLeft ? pw : 0;
    const x1 = this.mode === 'spread' ? (hasRight ? 2 * pw : pw) : pw;
    this.ground.style.left = `${x0}px`;
    this.ground.style.width = `${Math.max(0, x1 - x0)}px`;
    this.edgeLeft.style.left = `${x0}px`;
    this.edgeRight.style.left = `${x1}px`;
  }

  // --- Pages ----------------------------------------------------------------

  pageNode(slot) {
    if (this.cache.has(slot)) {
      const node = this.cache.get(slot);
      this.cache.delete(slot);
      this.cache.set(slot, node);
      return node;
    }
    let node;
    if (slot === 0) {
      node = h('div', { class: 'flipbook__page flipbook__page--blank', 'aria-hidden': 'true' });
    } else {
      const img = h('img', { class: 'flipbook__img', alt: fill(this.t.page, { n: slot }), draggable: 'false', decoding: 'async' });
      node = h('div', { class: 'flipbook__page', 'data-page': slot }, img, h('div', { class: 'flipbook__links' }), h('div', { class: 'flipbook__marks' }));
      img.addEventListener('load', () => node.classList.add('is-loaded'));
      img.src = this.pageSource(slot);
    }
    this.cache.set(slot, node);
    for (const key of this.cache.keys()) {
      if (this.cache.size <= 16) {
        break;
      }
      if (!this.attached.has(key)) {
        this.cache.delete(key);
      }
    }
    return node;
  }

  pageSource(page) {
    const ratio = window.devicePixelRatio || 1;
    return this.file(this.pw * ratio > 1300 ? 'zoom' : 'page', page);
  }

  /** Put a page into the book at a side (-1 left, +1 right) or detach it. */
  attach(slot, side, layer) {
    if (slot === undefined) {
      return null;
    }
    const node = this.pageNode(slot);
    node.style.width = `${this.pw}px`;
    node.style.height = `${this.ph}px`;
    const x = this.mode === 'spread' && side > 0 ? this.pw : 0;
    node.style.transform = `translate(${x}px, 0)`;
    node.style.clipPath = 'none';
    node.style.zIndex = String(layer);
    node.classList.toggle('flipbook__page--left', this.mode === 'spread' && side < 0);
    node.classList.toggle('flipbook__page--right', this.mode === 'spread' && side > 0);
    node.classList.toggle('flipbook__page--single', this.mode === 'single');
    if (slot > 0) {
      const img = node.querySelector('img');
      const source = this.pageSource(slot);
      if (img.src !== source) {
        img.src = source;
      }
    }
    if (node.parentNode !== this.book) {
      this.book.insertBefore(node, this.under);
    }
    this.attached.set(slot, node);
    return node;
  }

  detachAll() {
    for (const node of this.attached.values()) {
      node.remove();
    }
    this.attached.clear();
    this.paper.remove();
  }

  renderStatic() {
    this.detachAll();
    this.under.classList.remove('is-on');
    this.shade.classList.remove('is-on');
    this.root.classList.remove('is-turning');
    if (this.mode === 'single') {
      this.attach(this.pos, 1, 1);
    } else {
      const { left, right } = this.spreadSlots(this.pos);
      this.attach(left, -1, 1);
      this.attach(right, 1, 1);
    }
    for (const [slot, node] of this.attached) {
      if (slot > 0) {
        this.ensureLinks(node, slot);
      }
    }
    this.applyMarks();
    this.updateAria();
  }

  ensureLinks(node, page) {
    const layer = node.querySelector('.flipbook__links');
    if (layer.childElementCount || !this.data.pages[page - 1]) {
      return;
    }
    for (const link of this.data.pages[page - 1].links) {
      const [x, y, w, hgt] = link.r;
      let a;
      if (link.href) {
        const web = /^https?:/.test(link.href);
        const kind = link.href.includes('azbyka.ru/biblia/') ? 'bible' : link.href.includes('azbyka.ru/days/') ? 'day' : 'ext';
        const date = kind === 'day' ? link.href.match(/(\d\d)-(\d\d)$/) : null;
        const card = date && this.root.dataset.days ? date[1] + date[2] : '';
        const label = card ? `${this.t.dayCard}: ${link.t.split(' — ')[0]}` : link.t;
        a = h('a', {
          class: `flipbook__link flipbook__link--${kind}`,
          href: link.href, target: web ? '_blank' : null, rel: web ? 'noopener noreferrer' : null,
          'aria-label': web && !card ? `${label} (${this.t.external})` : label, 'data-tip': label, 'data-day-card': card || null
        });
      } else {
        const day = /^d\d{4}$/.test(link.dest || '') ? link.dest.slice(1) : '';
        a = h('a', {
          class: 'flipbook__link flipbook__link--inner',
          href: day ? `#${this.data.year}-${day.slice(0, 2)}-${day.slice(2)}` : `#p${link.page}`,
          'data-page': link.page, 'data-day': day, 'aria-label': link.t, 'data-tip': link.t
        });
      }
      a.style.left = `${x * 100}%`;
      a.style.top = `${y * 100}%`;
      a.style.width = `${w * 100}%`;
      a.style.height = `${hgt * 100}%`;
      layer.append(a);
    }
  }

  // --- Turning --------------------------------------------------------------

  /** Roles of the pages in a turn from the current position to `to`. */
  startFlip(direction, to, corner, extra = {}) {
    const from = this.pos;
    const f = { direction, from, to, corner, s: 1, paper: false, ...extra };
    let T;
    let K;
    let U;
    let O;
    if (this.mode === 'spread') {
      const a = this.spreadSlots(from);
      const b = this.spreadSlots(to);
      if (direction > 0) {
        f.s = 1;
        T = a.right;
        K = b.left;
        U = b.right;
        O = a.left;
      } else {
        f.s = -1;
        T = a.left;
        K = b.right;
        U = b.left;
        O = a.right;
      }
    } else if (direction > 0) {
      T = from;
      U = to;
      f.paper = true;
    } else {
      // the previous page comes back over the current one
      T = to;
      U = from;
      f.paper = true;
    }
    this.detachAll();
    this.under.classList.add('is-on');
    this.shade.classList.add('is-on');
    this.root.classList.add('is-turning');
    this.tip.hidden = true;
    if (this.mode === 'spread') {
      const a = this.spreadSlots(from);
      const b = this.spreadSlots(to);
      this.setGround(a.left !== undefined || b.left !== undefined, a.right !== undefined || b.right !== undefined);
    }
    this.attach(U, f.s, 1);
    this.attach(O, -f.s, 1);
    f.Tel = this.attach(T, f.s, 2);
    if (f.paper) {
      const img = this.paper.querySelector('img');
      img.src = this.pageSource(T);
      this.paper.style.width = `${this.pw}px`;
      this.paper.style.height = `${this.ph}px`;
      this.backWrap.append(this.paper);
      f.Kel = this.paper;
    } else if (K !== undefined) {
      f.Kel = this.pageNode(K);
      f.Kel.style.width = `${this.pw}px`;
      f.Kel.style.height = `${this.ph}px`;
      f.Kel.style.zIndex = '';
      f.Kel.classList.toggle('flipbook__page--left', f.s > 0);
      f.Kel.classList.toggle('flipbook__page--right', f.s < 0);
      f.Kel.classList.remove('flipbook__page--single');
      this.backWrap.append(f.Kel);
      this.attached.set(K, f.Kel);
    }
    const cy = corner === 'top' ? 0 : this.ph;
    f.C = { u: this.pw, v: cy };
    f.Cend = { u: -this.pw, v: cy };
    const backward = this.mode === 'single' && direction < 0;
    f.start = backward ? f.Cend : f.C;
    f.end = backward ? f.C : f.Cend;
    f.P = { ...f.start };
    this.flip = f;
    this.render();
    return f;
  }

  constrain(P, C) {
    const pw = this.pw;
    let { u, v } = P;
    const A = { u: 0, v: C.v };
    let dx = u - A.u;
    let dy = v - A.v;
    let d = Math.hypot(dx, dy);
    if (d > pw) {
      u = A.u + (dx * pw) / d;
      v = A.v + (dy * pw) / d;
    }
    const B = { u: 0, v: this.ph - C.v };
    const diagonal = Math.hypot(pw, this.ph);
    dx = u - B.u;
    dy = v - B.v;
    d = Math.hypot(dx, dy);
    if (d > diagonal) {
      u = B.u + (dx * diagonal) / d;
      v = B.v + (dy * diagonal) / d;
    }
    return { u, v };
  }

  render() {
    const f = this.flip;
    if (!f) {
      return;
    }
    const { pw, ph, spine } = this;
    const s = f.s;
    const C = f.C;
    const P = this.constrain(f.P, C);
    f.Pc = P;
    const bx = u => spine + s * u;
    const dx = C.u - P.u;
    const dy = C.v - P.v;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) {
      if (f.Tel) {
        f.Tel.style.clipPath = 'none';
      }
      if (f.Kel) {
        f.Kel.style.clipPath = polygon([]);
      }
      this.under.style.clipPath = polygon([]);
      this.shade.style.clipPath = polygon([]);
      return;
    }
    const n = { u: dx / length, v: dy / length };
    const M = { u: (C.u + P.u) / 2, v: (C.v + P.v) / 2 };
    const side = q => (q.u - M.u) * n.u + (q.v - M.v) * n.v;
    const reflect = q => {
      const d = 2 * side(q);
      return { u: q.u - d * n.u, v: q.v - d * n.v };
    };
    const sheet = [{ u: 0, v: 0 }, { u: pw, v: 0 }, { u: pw, v: ph }, { u: 0, v: ph }];
    const lifted = clipPolygon(sheet, side);
    const remain = clipPolygon(sheet, q => -side(q));

    if (f.Tel) {
      f.Tel.style.clipPath = polygon(remain.map(q => [s > 0 ? q.u : pw - q.u, q.v]));
    }
    if (f.Kel) {
      // local x of the back page -> distance from the spine on the leaf
      const toU = f.paper ? a => a : a => (s > 0 ? pw - a : a);
      const map = (a, b) => {
        const r = reflect({ u: toU(a), v: b });
        return [bx(r.u), r.v];
      };
      const p0 = map(0, 0);
      const p1 = map(1, 0);
      const p2 = map(0, 1);
      f.Kel.style.transform = `matrix(${p1[0] - p0[0]}, ${p1[1] - p0[1]}, ${p2[0] - p0[0]}, ${p2[1] - p0[1]}, ${p0[0]}, ${p0[1]})`;
      f.Kel.style.clipPath = polygon(lifted.map(q => [f.paper ? q.u : s > 0 ? pw - q.u : q.u, q.v]));
    }

    const progress = clamp((pw - P.u) / (2 * pw), 0, 1);
    const strength = Math.sin(Math.PI * Math.min(1, progress * 1.15));
    const diagonal = Math.hypot(pw, ph);
    const angle = Math.atan2(n.v, s * n.u);
    const mx = bx(M.u);
    const my = M.v;
    // shadow of the lifted leaf on the page beneath
    this.under.style.clipPath = polygon(lifted.map(q => [bx(q.u), q.v]));
    const underShade = this.under.firstChild;
    underShade.style.left = `${mx}px`;
    underShade.style.top = `${my - diagonal}px`;
    underShade.style.height = `${2 * diagonal}px`;
    underShade.style.width = `${clamp(length * 0.45, 6, pw * 0.42)}px`;
    underShade.style.transform = `rotate(${angle}rad)`;
    underShade.style.opacity = String(0.35 + 0.65 * strength);
    // curl of the back of the leaf along the fold
    this.shade.style.clipPath = polygon(lifted.map(q => {
      const r = reflect(q);
      return [bx(r.u), r.v];
    }));
    const light = this.shade.firstChild;
    light.style.left = `${mx}px`;
    light.style.top = `${my - diagonal}px`;
    light.style.height = `${2 * diagonal}px`;
    light.style.width = `${clamp(length * 0.5, 8, pw * 0.55)}px`;
    light.style.transform = `rotate(${angle + Math.PI}rad)`;
    light.style.opacity = String(0.55 + 0.45 * strength);
  }

  stopTween() {
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  tween(target, duration, ease, done) {
    this.stopTween();
    const f = this.flip;
    const from = { ...(f.Pc || f.P) };
    const lift = 0.22 * this.ph * Math.min(1, Math.abs(target.u - from.u) / (2 * this.pw));
    const sign = f.corner === 'top' ? 1 : -1;
    const started = window.performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / duration);
      const e = ease(t);
      f.P = { u: from.u + (target.u - from.u) * e, v: from.v + (target.v - from.v) * e + sign * lift * Math.sin(Math.PI * e) };
      this.render();
      if (t < 1) {
        this.raf = window.requestAnimationFrame(step);
      } else {
        this.raf = 0;
        done();
      }
    };
    this.raf = window.requestAnimationFrame(step);
  }

  endFlip(completed) {
    const f = this.flip;
    if (!f) {
      return;
    }
    this.flip = null;
    if (f.Kel) {
      f.Kel.style.transform = '';
      f.Kel.style.clipPath = 'none';
    }
    if (completed) {
      this.pos = f.to;
    }
    this.renderStatic();
    this.updateShift(completed);
    if (completed) {
      this.afterNavigate(f.target || {}, true);
      if (this.afterTurn) {
        const then = this.afterTurn;
        this.afterTurn = null;
        then();
      }
    }
    if (this.pending !== null) {
      const next = this.pending;
      this.pending = null;
      this.turnTo(next.pos, next.target);
    }
  }

  /** Turn to a position: one animated turn, however far the jump. */
  turnTo(pos, target = {}) {
    pos = clamp(pos, this.minPos, this.maxPos);
    if (this.flip && !this.flip.peel) {
      this.pending = { pos, target };
      return;
    }
    if (this.flip) {
      this.stopTween();
      if (pos === this.flip.to && this.flip.peel) {
        const f = this.flip;
        f.peel = false;
        f.auto = true;
        f.target = target;
        this.updateShiftFor(pos);
        this.tween(f.end, 520, easeInOut, () => this.endFlip(true));
        return;
      }
      this.endFlip(false);
    }
    if (pos === this.pos) {
      this.marks = target;
      this.applyMarks();
      this.afterNavigate(target, false);
      return;
    }
    if (this.reduced.matches || target.instant) {
      this.pos = pos;
      this.renderStatic();
      this.updateShift(false);
      this.afterNavigate(target, true);
      return;
    }
    const f = this.startFlip(pos > this.pos ? 1 : -1, pos, 'bottom', { auto: true, target });
    f.P = { u: f.start.u - (f.start.u > 0 ? 1 : -1), v: f.start.v - 1 };
    this.updateShiftFor(pos);
    const far = Math.abs(pos - this.pos) > 1;
    this.preloadPages(this.pagesAt(pos)).then(() => {
      if (this.flip === f) {
        this.rustle();
        this.tween(f.end, (this.mode === 'spread' ? 820 : 640) + (far ? 120 : 0), easeInOut, () => this.endFlip(true));
      }
    });
  }

  updateShiftFor(pos) {
    if (this.mode !== 'spread') {
      return;
    }
    const keep = this.pos;
    this.pos = pos;
    this.updateShift(true, true);
    this.pos = keep;
  }

  next() {
    const base = this.pending ? this.pending.pos : this.flip && !this.flip.peel ? this.flip.to : this.pos;
    if (base < this.maxPos) {
      this.turnTo(base + 1);
    }
  }

  prev() {
    const base = this.pending ? this.pending.pos : this.flip && !this.flip.peel ? this.flip.to : this.pos;
    if (base > this.minPos) {
      this.turnTo(base - 1);
    }
  }

  goToPage(page, target = {}) {
    this.togglePanelOnSmall();
    this.turnTo(this.positionOf(page), { page, ...target });
  }

  goToDay(key) {
    const day = this.data.days[key];
    if (day) {
      this.goToPage(day[0], { page: day[0], day: key });
    }
  }

  preloadPages(pages) {
    const waits = pages.map(page => {
      const node = this.pageNode(page);
      const img = node.querySelector('img');
      if (!img || img.complete) {
        return Promise.resolve();
      }
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });
    const timeout = new Promise(resolve => window.setTimeout(resolve, 900));
    return Promise.race([Promise.all(waits), timeout]);
  }

  preloadAround() {
    const near = [];
    for (const pos of [this.pos + 1, this.pos - 1, this.pos + 2]) {
      if (pos >= this.minPos && pos <= this.maxPos) {
        near.push(...this.pagesAt(pos));
      }
    }
    for (const page of near) {
      this.pageNode(page);
    }
  }

  // --- Pointer --------------------------------------------------------------

  local(clientX, clientY) {
    const box = this.book.getBoundingClientRect();
    const scale = box.width ? this.book.offsetWidth / box.width : 1;
    return { x: (clientX - box.left) * scale, y: (clientY - box.top) * scale };
  }

  onDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (this.flip && !this.flip.peel) {
      return;
    }
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY, drag: false, samples: [] };
  }

  onMove(event) {
    const press = this.press;
    if (press && event.pointerId === press.id) {
      if (!press.drag) {
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 8) {
          return;
        }
        if (!this.beginDrag(event)) {
          this.press = null;
          return;
        }
      }
      this.dragTo(event);
      return;
    }
    if (event.pointerType === 'mouse' && !press) {
      this.hover(event);
    }
  }

  beginDrag(event) {
    const press = this.press;
    const p = this.local(press.x, press.y);
    let direction;
    if (this.mode === 'spread') {
      direction = p.x >= this.spine ? 1 : -1;
    } else {
      direction = p.x > this.pw * 0.45 ? 1 : -1;
    }
    // a mostly vertical gesture on a touch screen scrolls the page instead
    if (event.pointerType !== 'mouse' && Math.abs(event.clientY - press.y) > Math.abs(event.clientX - press.x) * 1.2) {
      return false;
    }
    const to = this.pos + direction;
    if (to < this.minPos || to > this.maxPos) {
      return false;
    }
    const corner = p.y < this.ph / 2 ? 'top' : 'bottom';
    this.stopTween();
    if (this.flip && !(this.flip.peel && this.flip.direction === direction && this.flip.corner === corner)) {
      this.endFlip(false);
    }
    if (!this.flip) {
      this.startFlip(direction, to, corner);
    }
    this.flip.peel = false;
    this.flip.auto = false;
    press.drag = true;
    press.x0 = p.x;
    try {
      this.book.setPointerCapture(event.pointerId);
    } catch {
      // the pointer may already be gone
    }
    return true;
  }

  dragTo(event) {
    const f = this.flip;
    if (!f) {
      return;
    }
    const p = this.local(event.clientX, event.clientY);
    let u;
    if (this.mode === 'single' && f.direction < 0) {
      const x0 = this.press.x0;
      u = -this.pw + (p.x - x0) * ((2 * this.pw) / Math.max(this.pw - x0, this.pw * 0.5));
    } else {
      u = f.s * (p.x - this.spine);
    }
    f.P = { u, v: clamp(p.y, -this.ph * 0.1, this.ph * 1.1) };
    this.render();
    const samples = this.press.samples;
    samples.push({ t: event.timeStamp, u: f.Pc.u });
    while (samples.length > 2 && event.timeStamp - samples[0].t > 100) {
      samples.shift();
    }
  }

  onUp(event, cancelled) {
    const press = this.press;
    if (!press || event.pointerId !== press.id) {
      return;
    }
    this.press = null;
    if (!press.drag) {
      return;
    }
    this.suppressClick = true;
    window.setTimeout(() => {
      this.suppressClick = false;
    }, 350);
    const f = this.flip;
    if (!f) {
      return;
    }
    const span = f.end.u - f.start.u;
    const done = (f.Pc.u - f.start.u) / span;
    const first = press.samples[0];
    const last = press.samples[press.samples.length - 1];
    const velocity = first && last && last.t > first.t ? (last.u - first.u) / (last.t - first.t) : 0;
    const toward = velocity * Math.sign(span);
    const complete = !cancelled && (done > 0.5 || (toward > 0.35 && done > 0.03));
    const remaining = complete ? 1 - done : done;
    if (complete) {
      f.auto = true;
      this.updateShiftFor(f.to);
      this.rustle();
    }
    this.tween(complete ? f.end : f.start, 180 + 420 * clamp(remaining, 0, 1), easeOut, () => this.endFlip(complete));
  }

  hover(event) {
    if (this.flip && !this.flip.peel) {
      return;
    }
    const p = this.local(event.clientX, event.clientY);
    const zone = Math.min(84, this.pw * 0.22);
    const { pw, ph } = this;
    let found = null;
    const near = (x, y) => Math.abs(p.x - x) < zone && Math.abs(p.y - y) < zone;
    if (this.mode === 'spread') {
      if (this.pos < this.maxPos && (near(2 * pw, 0) || near(2 * pw, ph))) {
        found = { direction: 1, corner: p.y < ph / 2 ? 'top' : 'bottom' };
      } else if (this.pos > this.minPos && (near(0, 0) || near(0, ph))) {
        found = { direction: -1, corner: p.y < ph / 2 ? 'top' : 'bottom' };
      }
    } else if (this.pos < this.maxPos && (near(pw, 0) || near(pw, ph))) {
      found = { direction: 1, corner: p.y < ph / 2 ? 'top' : 'bottom' };
    }
    if (!found) {
      this.unpeel();
      return;
    }
    const f = this.flip;
    if (f && (f.direction !== found.direction || f.corner !== found.corner)) {
      this.stopTween();
      this.endFlip(false);
    }
    if (!this.flip) {
      this.startFlip(found.direction, this.pos + found.direction, found.corner, { peel: true });
    }
    const flip = this.flip;
    const lift = Math.min(54, pw * 0.13);
    const target = { u: pw - lift, v: flip.corner === 'top' ? lift * 0.85 : ph - lift * 0.85 };
    if (!flip.peeled) {
      flip.peeled = true;
      this.tween(target, 240, easeOut, () => {});
    }
  }

  unpeel() {
    const f = this.flip;
    if (!f || !f.peel || f.unpeeling) {
      return;
    }
    f.unpeeling = true;
    this.tween(f.start, 200, easeOut, () => {
      if (this.flip === f) {
        this.endFlip(false);
      }
    });
  }

  onClick(event) {
    if (this.suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressClick = false;
      return;
    }
    const link = event.target.closest('.flipbook__link');
    if (link) {
      if (link.dataset.page) {
        event.preventDefault();
        const page = Number(link.dataset.page);
        if (link.dataset.day) {
          this.goToDay(link.dataset.day);
        } else {
          this.goToPage(page);
        }
      } else if (link.dataset.dayCard && this.root.dataset.days) {
        event.preventDefault();
        this.openDay(link.dataset.dayCard, false);
      }
      return;
    }
    if (this.flip && this.flip.peel) {
      const f = this.flip;
      f.peel = false;
      f.auto = true;
      this.updateShiftFor(f.to);
      this.rustle();
      this.tween(f.end, 560, easeInOut, () => this.endFlip(true));
      return;
    }
    if (this.flip) {
      return;
    }
    const p = this.local(event.clientX, event.clientY);
    const cards = Boolean(this.root.dataset.days);
    if (this.mode === 'spread') {
      if (p.x >= this.spine) {
        this.next();
      } else {
        this.prev();
      }
    } else if (p.x < this.pw * (cards ? 0.15 : 0.28)) {
      this.prev();
    } else if (p.x > this.pw * (cards ? 0.85 : 0.72)) {
      this.next();
    } else {
      // a single page is small: a tap in the middle opens the day under the
      // finger as a readable card, or the page large
      const day = this.root.dataset.days ? this.dayAt(this.pos, p.y / this.ph) : '';
      if (day) {
        this.openDay(day, false);
      } else {
        this.openZoom();
      }
    }
  }

  /** The day whose row is at height y (0..1) of a page, including a day continued from the page before. */
  dayAt(page, y) {
    let found = '';
    let first = null;
    for (const [key, [p, y0, y1]] of this.dayList) {
      if (p !== page) {
        continue;
      }
      if (!first || y0 < first.y0) {
        first = { key, y0 };
      }
      if (y >= y0 && y < y1) {
        found = key;
      }
    }
    if (!found && first && y < first.y0 && y > 0.07) {
      const previous = this.shiftDay(first.key, -1);
      if (previous && this.data.days[previous][0] === page - 1) {
        found = previous;
      }
    }
    return found;
  }

  shiftDay(key, delta) {
    const date = new Date(Date.UTC(this.data.year, Number(key.slice(0, 2)) - 1, Number(key.slice(2)) + delta));
    if (date.getUTCFullYear() !== this.data.year) {
      return '';
    }
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  showTip(event) {
    const link = event.target.closest && event.target.closest('.flipbook__link');
    if (!link || this.flip || this.coarse.matches) {
      return;
    }
    const box = link.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    this.tip.replaceChildren(h('span', { text: link.dataset.tip || '' }));
    if (link.target === '_blank' && !link.dataset.dayCard) {
      this.tip.append(icon('out'));
    }
    this.tip.hidden = false;
    const width = this.tip.offsetWidth;
    const left = clamp(box.left + box.width / 2 - host.left - width / 2, 8, host.width - width - 8);
    const above = box.top - host.top - this.tip.offsetHeight - 8;
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${above > 4 ? above : box.bottom - host.top + 8}px`;
  }

  onKey(event) {
    if (event.target.closest('dialog')) {
      return;
    }
    if (event.target.closest('input, textarea, select') && event.key !== 'Escape') {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const keys = {
      ArrowLeft: () => this.prev(),
      ArrowRight: () => this.next(),
      PageUp: () => this.prev(),
      PageDown: () => this.next(),
      Home: () => this.goToPage(1),
      End: () => this.goToPage(this.count),
      Escape: () => {
        if (!this.panel.hidden) {
          this.togglePanel(null);
        } else if (this.root.classList.contains('flipbook--immersive')) {
          this.toggleFullscreen();
        }
      }
    };
    if (event.key === 'Escape' && this.panel.hidden && !this.root.classList.contains('flipbook--immersive')) {
      return;
    }
    if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]();
    }
  }

  // --- After a turn ---------------------------------------------------------

  afterNavigate(target, announce) {
    const pages = this.pagesAt(this.pos);
    this.cur = pages[0] || 1;
    this.marks = target && (target.day || target.lines) ? target : null;
    this.applyMarks();
    this.updateChrome();
    this.updateHash(target);
    this.updateReader();
    this.preloadAround();
    if (announce) {
      this.live.textContent = this.describe();
    }
    if (!this.panel.hidden && this.panelMode === 'date') {
      this.renderDate();
    }
    if (!this.panel.hidden && this.panelMode === 'toc') {
      this.markToc();
    }
  }

  describe() {
    const pages = this.pagesAt(this.pos);
    const section = this.sectionOf(pages[0] || 1).label;
    const text = pages.length > 1
      ? fill(this.t.pagesOf, { a: pages[0], b: pages[1], total: this.count })
      : fill(this.t.pageOf, { a: pages[0] || 1, total: this.count });
    return section ? `${text}. ${section}` : text;
  }

  updateAria() {
    this.book.setAttribute('aria-label', this.describe());
  }

  updateChrome() {
    if (!this.mode) {
      return;
    }
    const pages = this.pagesAt(this.pos);
    this.scrub.value = String(pages[0] || 1);
    this.scrub.setAttribute('aria-valuetext', this.describe());
    this.pageLabel.textContent = pages.length > 1
      ? fill(this.t.shortPair, { a: pages[0], b: pages[1], total: this.count })
      : fill(this.t.short, { a: pages[0] || 1, total: this.count });
    const atStart = this.pos <= this.minPos;
    const atEnd = this.pos >= this.maxPos;
    this.prevButton.disabled = atStart;
    this.nextButton.disabled = atEnd;
    this.root.querySelectorAll('.flipbook__bar--bottom .flipbook__tool--icon').forEach((button, index) => {
      button.disabled = index < 2 ? atStart : atEnd;
    });
    const fillShare = ((pages[0] || 1) - 1) / (this.count - 1);
    this.scrub.style.setProperty('--flipbook-fill', `${fillShare * 100}%`);
    for (const tick of this.ticks.children) {
      tick.classList.remove('is-current');
    }
    const section = this.sectionOf(pages[pages.length - 1] || 1);
    const index = this.sections.filter(s => s.month).findIndex(s => s.label === section.label);
    if (index >= 0 && this.ticks.children[index]) {
      this.ticks.children[index].classList.add('is-current');
    }
    this.updateAria();
  }

  updateHash(target) {
    if (target && target.quiet) {
      return;
    }
    let hash = `#p${this.cur}`;
    if (target && target.day) {
      hash = `#${this.data.year}-${target.day.slice(0, 2)}-${target.day.slice(2)}`;
    }
    if (this.pos === this.minPos) {
      hash = '';
    }
    if (window.location.hash !== hash) {
      const url = new URL(window.location.href);
      url.hash = hash;
      window.history.replaceState(window.history.state, '', url.href);
    }
  }

  parseHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    let m = hash.match(/^p(\d{1,3})$/);
    if (m) {
      return { page: clamp(Number(m[1]), 1, this.count) };
    }
    m = hash.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m && Number(m[1]) === this.data.year && this.data.days[m[2] + m[3]]) {
      return { page: this.data.days[m[2] + m[3]][0], day: m[2] + m[3] };
    }
    return null;
  }

  applyMarks() {
    for (const node of this.attached.values()) {
      const layer = node.querySelector('.flipbook__marks');
      if (layer) {
        layer.replaceChildren();
      }
    }
    const target = this.marks;
    if (!target) {
      return;
    }
    if (target.day && this.data.days[target.day]) {
      const [page, y0, y1] = this.data.days[target.day];
      const node = this.attached.get(page);
      if (node) {
        const mark = h('div', { class: 'flipbook__mark flipbook__mark--day' });
        mark.style.top = `${y0 * 100}%`;
        mark.style.height = `${(y1 - y0) * 100}%`;
        node.querySelector('.flipbook__marks').append(mark);
      }
    }
    if (target.lines) {
      const node = this.attached.get(target.page);
      if (node) {
        for (const [x, y, w, hgt] of target.lines) {
          const mark = h('div', { class: 'flipbook__mark flipbook__mark--line' });
          mark.style.left = `${(x - 0.004) * 100}%`;
          mark.style.top = `${(y - 0.002) * 100}%`;
          mark.style.width = `${(w + 0.008) * 100}%`;
          mark.style.height = `${(hgt + 0.004) * 100}%`;
          node.querySelector('.flipbook__marks').append(mark);
        }
      }
    }
  }

  // --- Text: search and screen readers ----------------------------------------

  loadText() {
    if (!this.textPromise) {
      const url = new URL(this.data.files.text, this.base);
      this.textPromise = window.fetch(url.href, { credentials: 'omit', redirect: 'error' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`text ${response.status}`);
          }
          return response.json();
        })
        .then(text => {
          this.text = text.map(page => ({ ...page, folded: fold(page.t) }));
          this.updateReader();
          return this.text;
        })
        .catch(() => {
          this.textPromise = null;
          return null;
        });
    }
    return this.textPromise;
  }

  updateReader() {
    if (!this.text) {
      return;
    }
    this.reader.replaceChildren(...this.pagesAt(this.pos).map(page => h('section', { 'aria-label': fill(this.t.page, { n: page }) },
      h('p', { text: this.text[page - 1] ? this.text[page - 1].t : '' }))));
  }

  // --- Panels -------------------------------------------------------------------

  togglePanel(mode) {
    const buttons = { toc: this.tocButton, search: this.searchButton, date: this.dateButton };
    if (!mode || (this.panelMode === mode && !this.panel.hidden)) {
      this.panel.hidden = true;
      this.root.classList.remove('has-panel');
      const button = buttons[this.panelMode];
      for (const b of Object.values(buttons)) {
        b.setAttribute('aria-pressed', 'false');
      }
      this.panelMode = null;
      if (button) {
        button.focus();
      }
      return;
    }
    this.panelMode = mode;
    for (const [key, b] of Object.entries(buttons)) {
      b.setAttribute('aria-pressed', String(key === mode));
    }
    this.panel.hidden = false;
    this.root.classList.add('has-panel');
    this.panel.dataset.mode = mode;
    if (mode === 'toc') {
      this.renderToc();
    } else if (mode === 'search') {
      this.renderSearch();
    } else if (mode === 'day') {
      this.renderDay();
    } else {
      this.renderDate(true);
    }
  }

  togglePanelOnSmall() {
    if (!this.panel.hidden && this.root.getBoundingClientRect().width < 900) {
      this.togglePanel(null);
    }
  }

  renderToc() {
    const t = this.t;
    this.panelTitle.textContent = t.contents;
    const months = h('div', { class: 'flipbook__months' });
    for (const section of this.sections.filter(s => s.month)) {
      months.append(h('button', { type: 'button', class: 'flipbook__month', 'data-page': section.page, onclick: () => this.goToPage(section.page) },
        h('span', { text: section.label }), h('span', { class: 'flipbook__month-page', text: String(section.page) })));
    }
    const list = h('ol', { class: 'flipbook__toc' });
    for (const section of this.sections.filter(s => !s.month)) {
      list.append(h('li', {}, h('button', { type: 'button', class: 'flipbook__toc-item', 'data-page': section.page, onclick: () => this.goToPage(section.page) },
        h('span', { class: 'flipbook__toc-label', text: section.label }), h('span', { class: 'flipbook__toc-page', text: String(section.page) }))));
    }
    const cover = h('button', { type: 'button', class: 'flipbook__toc-item', onclick: () => this.goToPage(1) },
      h('span', { class: 'flipbook__toc-label', text: this.t.first }), h('span', { class: 'flipbook__toc-page', text: '1' }));
    this.panelBody.replaceChildren(months, list, h('div', { class: 'flipbook__toc-foot' }, cover));
    this.markToc();
    const current = this.panelBody.querySelector('.is-current');
    (current || this.panelBody.querySelector('button')).focus({ preventScroll: false });
  }

  markToc() {
    const pages = this.pagesAt(this.pos);
    const section = this.sectionOf(pages[pages.length - 1] || 1);
    for (const button of this.panelBody.querySelectorAll('[data-page]')) {
      const match = this.sections.find(s => s.page === Number(button.dataset.page));
      button.classList.toggle('is-current', Boolean(match && match.label === section.label));
    }
  }

  renderSearch() {
    const t = this.t;
    this.panelTitle.textContent = t.search;
    if (!this.searchBox) {
      this.searchInput = h('input', { type: 'search', class: 'flipbook__search-input', placeholder: t.searchPlaceholder, 'aria-label': t.searchLabel, autocomplete: 'off', spellcheck: 'false' });
      this.searchStatus = h('p', { class: 'flipbook__search-status', role: 'status', text: t.searchHint });
      this.searchResults = h('ol', { class: 'flipbook__results' });
      this.searchBox = h('form', { class: 'flipbook__search', role: 'search', onsubmit: event => {
        event.preventDefault();
        const first = this.searchResults.querySelector('button');
        if (first) {
          first.click();
        }
      } }, h('label', { class: 'flipbook__search-field' }, icon('search'), this.searchInput));
      let timer = 0;
      this.searchInput.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => this.runSearch(), 160);
      });
    }
    this.panelBody.replaceChildren(this.searchBox, this.searchStatus, this.searchResults);
    this.searchInput.focus();
    if (!this.text) {
      this.searchStatus.textContent = t.searchLoading;
      this.loadText().then(() => this.runSearch());
    }
  }

  runSearch() {
    const t = this.t;
    const query = fold(this.searchInput.value.replace(/\s+/g, ' ').trim());
    this.searchResults.replaceChildren();
    if (!this.text) {
      return;
    }
    if (query.length < 2) {
      this.searchStatus.textContent = t.searchHint;
      return;
    }
    let total = 0;
    for (let index = 0; index < this.text.length; index++) {
      const page = this.text[index];
      const hits = [];
      let at = page.folded.indexOf(query);
      while (at >= 0) {
        hits.push(at);
        at = page.folded.indexOf(query, at + query.length);
      }
      if (!hits.length) {
        continue;
      }
      total += hits.length;
      const number = index + 1;
      const item = h('li', { class: 'flipbook__result' },
        h('p', { class: 'flipbook__result-head' }, h('span', { text: fill(t.page, { n: number }) }), h('span', { text: this.sectionOf(number).label })));
      for (const start of hits.slice(0, 3)) {
        const end = start + query.length;
        const from = Math.max(0, page.t.lastIndexOf(' ', Math.max(0, start - 48)) + 1);
        const to = Math.min(page.t.length, end + 70);
        const lines = page.l.filter(([, , , , a, b]) => a < end && b > start).map(line => line.slice(0, 4));
        item.append(h('button', { type: 'button', class: 'flipbook__snippet', onclick: () => this.goToPage(number, { page: number, lines }) },
          (from > 0 ? '…' : '') + page.t.slice(from, start), h('mark', { text: page.t.slice(start, end) }), page.t.slice(end, to) + (to < page.t.length ? '…' : '')));
      }
      if (hits.length > 3) {
        item.append(h('p', { class: 'flipbook__result-more', text: fill(t.more, { n: hits.length - 3 }) }));
      }
      this.searchResults.append(item);
      if (total > 400) {
        break;
      }
    }
    this.searchStatus.textContent = total ? fill(t.found, { n: total > 400 ? '400+' : total }) : t.nothing;
  }

  renderDate(opening = false) {
    const t = this.t;
    this.panelTitle.textContent = t.date;
    const year = this.data.year;
    const visible = new Set(this.pagesAt(this.pos));
    const onSpread = this.dayList.filter(([, value]) => visible.has(value[0])).map(([key]) => key);
    if (this.panelMode === 'date' && this.calendarFollow !== false && onSpread.length) {
      this.calendarMonth = Number(onSpread[0].slice(0, 2)) - 1;
    }
    const month = this.calendarMonth;
    const now = new Date();
    const todayKey = now.getFullYear() === year ? `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` : '';
    const head = h('div', { class: 'flipbook__cal-head' },
      h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.prevMonth, title: t.prevMonth, disabled: month === 0, onclick: () => {
        this.calendarMonth = Math.max(0, month - 1);
        this.calendarFollow = false;
        this.renderDate();
      } }, icon('prev')),
      h('p', { class: 'flipbook__cal-title', text: `${t.months[month]} ${year}` }),
      h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.nextMonth, title: t.nextMonth, disabled: month === 11, onclick: () => {
        this.calendarMonth = Math.min(11, month + 1);
        this.calendarFollow = false;
        this.renderDate();
      } }, icon('next')));
    const grid = h('div', { class: 'flipbook__cal', role: 'grid', 'aria-label': `${t.months[month]} ${year}` });
    const row = () => h('div', { class: 'flipbook__cal-row', role: 'row' });
    let line = row();
    for (const name of t.weekdays) {
      line.append(h('span', { class: 'flipbook__cal-wd', role: 'columnheader', text: name }));
    }
    grid.append(line);
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    line = row();
    for (let i = 0; i < offset; i++) {
      line.append(h('span', { class: 'flipbook__cal-empty', role: 'gridcell' }));
    }
    for (let day = 1; day <= days; day++) {
      const key = `${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
      const weekday = (offset + day - 1) % 7;
      const button = h('button', {
        type: 'button', class: 'flipbook__cal-day', role: 'gridcell',
        'aria-label': `${day} ${t.monthsGen[month]} ${year}${onSpread.includes(key) ? `, ${t.onSpread}` : ''}`,
        'aria-current': key === todayKey ? 'date' : null,
        onclick: () => {
          this.calendarFollow = true;
          if (this.root.dataset.days) {
            this.openDay(key, true);
          } else {
            this.goToDay(key);
          }
        }
      }, String(day));
      button.classList.toggle('is-sunday', weekday === 6);
      button.classList.toggle('is-visible', onSpread.includes(key));
      line.append(button);
      if (weekday === 6) {
        grid.append(line);
        line = row();
      }
    }
    if (line.childElementCount) {
      grid.append(line);
    }
    const foot = h('div', { class: 'flipbook__cal-foot' });
    if (todayKey) {
      foot.append(h('button', { type: 'button', class: 'flipbook__pill', onclick: () => this.goToDay(todayKey) }, t.today));
    } else {
      foot.append(h('p', { class: 'flipbook__cal-note', text: t.todayOutside }));
    }
    const focusKey = document.activeElement && this.panel.contains(document.activeElement) ? document.activeElement.textContent : null;
    this.panelBody.replaceChildren(head, grid, foot);
    if (this.panelMode === 'date') {
      const days = [...grid.querySelectorAll('.flipbook__cal-day')];
      const target = (focusKey !== null && days.find(button => button.textContent === focusKey)) || grid.querySelector('.is-visible') || days[0];
      if (opening || focusKey !== null) {
        target.focus({ preventScroll: true });
      }
    }
  }

  // --- Day card -------------------------------------------------------------------

  loadDays() {
    if (!this.daysPromise) {
      const url = new URL(this.root.dataset.days, document.baseURI);
      this.daysPromise = window.fetch(url.href, { credentials: 'omit', redirect: 'error' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`days ${response.status}`);
          }
          return response.json();
        })
        .then(days => {
          this.days = days;
          return days;
        })
        .catch(() => {
          this.daysPromise = null;
          return null;
        });
    }
    return this.daysPromise;
  }

  /** Show the card of a day; with `navigate`, also turn the book to its page. */
  openDay(key, navigate) {
    if (!key || !this.data.days[key]) {
      return;
    }
    this.dayKey = key;
    const page = this.data.days[key][0];
    if (navigate) {
      this.turnTo(this.positionOf(page), { page, day: key });
    } else {
      this.marks = { page, day: key };
      this.applyMarks();
      this.updateHash({ day: key });
    }
    this.showPanel('day');
  }

  showPanel(mode) {
    if (!this.panel.hidden && this.panelMode === mode) {
      if (mode === 'day') {
        this.renderDay();
      }
      return;
    }
    this.togglePanel(mode);
  }

  renderDay() {
    const t = this.t;
    const key = this.dayKey;
    const year = this.data.year;
    const month = Number(key.slice(0, 2)) - 1;
    const number = Number(key.slice(2));
    this.panelTitle.textContent = t.dayCard;
    if (!this.days) {
      this.panelBody.replaceChildren(h('p', { class: 'flipbook__search-status', role: 'status', text: t.dayLoading }));
      this.loadDays().then(days => {
        if (days && this.panelMode === 'day' && this.dayKey === key) {
          this.renderDay();
        }
      });
      return;
    }
    const day = this.days[key];
    if (!day) {
      return;
    }
    const diamond = () => h('span', { class: 'flipbook__day-dia', 'aria-hidden': 'true' }, '◆');
    const runs = list => list.map(([text, flags]) => {
      let node = document.createTextNode(text);
      if (flags & 2) {
        node = h('em', {}, node);
      }
      if (flags & 1) {
        node = h('strong', {}, node);
      }
      if (flags & 4) {
        const lead = text.match(/^\s*/)[0];
        const rest = text.slice(lead.length);
        node = h('span', { class: 'flipbook__day-saint' }, lead, diamond(), flags & 1 ? h('strong', {}, rest) : rest);
      }
      return node;
    });
    const body = [];
    for (const entry of day.e) {
      const [kind] = entry;
      if (kind === 'sp') {
        body.push(h('p', { class: 'flipbook__day-special', text: entry[1] }));
      } else if (kind === 'ttl') {
        body.push(h('p', { class: 'flipbook__day-title' }, runs(entry[1])));
      } else if (kind === 'lit') {
        body.push(h('p', { class: 'flipbook__day-title flipbook__day-saint' }, diamond(), runs(entry[1])));
      } else if (kind === 'svc') {
        body.push(h('p', { class: 'flipbook__day-service' }, entry[1].map(run => run[0]).join('')));
      } else if (kind === 'note') {
        body.push(h('p', { class: 'flipbook__day-note' }, runs(entry[1])));
      } else if (kind === 'rd') {
        const [, label, sep, segments] = entry;
        body.push(h('p', { class: 'flipbook__day-reading' },
          label ? h('span', { class: 'flipbook__day-label', text: sep === ':' ? `${label}:` : label }) : null,
          label ? (sep === ':' ? ' ' : h('span', { class: 'flipbook__day-sep', text: ' – ' })) : null,
          segments.map(([text, href]) => (href
            ? h('a', { class: 'flipbook__day-ref', href, target: '_blank', rel: 'noopener noreferrer', title: t.readings }, text, icon('out'))
            : text))));
      }
    }
    const tags = [];
    if (day.great) {
      tags.push(h('span', { class: 'flipbook__tag flipbook__tag--great', text: t.great }));
    }
    if (day.fast === 'fast') {
      tags.push(h('span', { class: 'flipbook__tag flipbook__tag--fast', text: t.fast }));
    } else if (day.fast === 'meatless') {
      tags.push(h('span', { class: 'flipbook__tag flipbook__tag--fast', text: t.meatless }));
    }
    if (day.glas) {
      tags.push(h('span', { class: 'flipbook__tag', text: day.glas }));
    }
    const previous = this.shiftDay(key, -1);
    const next = this.shiftDay(key, 1);
    const dateLabel = k => `${Number(k.slice(2))} ${t.monthsGen[Number(k.slice(0, 2)) - 1]}`;
    const article = h('article', { class: `flipbook__day${day.red ? ' is-red' : ''}${day.special ? ' is-special' : ''}`, tabindex: '-1', 'aria-label': `${number} ${t.monthsGen[month]} ${year}, ${day.wd}` },
      h('header', { class: 'flipbook__day-head' },
        h('p', { class: 'flipbook__day-num', text: String(number) }),
        h('div', { class: 'flipbook__day-when' },
          h('p', { class: 'flipbook__day-date', text: `${t.monthsGen[month]} ${year}` }),
          h('p', { class: 'flipbook__day-wd', text: `${day.wd} · ${day.old} ${t.oldStyle}` }),
          tags.length ? h('p', { class: 'flipbook__day-tags' }, tags) : null)),
      body,
      h('div', { class: 'flipbook__day-actions' },
        h('button', { type: 'button', class: 'flipbook__pill flipbook__pill--quiet', onclick: () => {
          this.openDay(key, true);
          this.togglePanelOnSmall();
        } }, icon('book'), t.showPage),
        h('button', { type: 'button', class: 'flipbook__pill flipbook__pill--quiet', onclick: () => this.share(this.dayURL(key), `${number} ${t.monthsGen[month]} ${year}`) }, icon('share'), t.shareDay),
        day.url ? h('a', { class: 'flipbook__pill flipbook__pill--quiet', href: day.url, target: '_blank', rel: 'noopener noreferrer', title: t.onAzbykaLabel }, icon('out'), t.onAzbyka) : null),
      h('nav', { class: 'flipbook__day-nav', 'aria-label': t.dayCard },
        h('button', { type: 'button', class: 'flipbook__day-step', disabled: !previous, onclick: () => this.openDay(previous, true) },
          icon('prev'), h('span', {}, h('span', { class: 'flipbook__day-step-label', text: t.prevDay }), previous ? dateLabel(previous) : '')),
        h('button', { type: 'button', class: 'flipbook__day-step flipbook__day-step--next', disabled: !next, onclick: () => this.openDay(next, true) },
          h('span', {}, h('span', { class: 'flipbook__day-step-label', text: t.nextDay }), next ? dateLabel(next) : ''), icon('next'))));
    const keepFocus = this.panel.contains(document.activeElement) && document.activeElement.closest('.flipbook__day-nav');
    this.panelBody.replaceChildren(article);
    this.panelBody.scrollTop = 0;
    if (keepFocus) {
      const step = article.querySelector(keepFocus.classList.contains('flipbook__day-step--next') ? '.flipbook__day-step--next' : '.flipbook__day-step');
      step.focus({ preventScroll: true });
    } else if (!this.coarse.matches) {
      article.focus({ preventScroll: true });
    }
  }

  dayURL(key) {
    const url = new URL(window.location.href);
    url.hash = `${this.data.year}-${key.slice(0, 2)}-${key.slice(2)}`;
    return url.href;
  }

  // --- Sound -------------------------------------------------------------------------

  toggleSound() {
    this.soundOn = !this.soundOn;
    this.soundButton.setAttribute('aria-pressed', String(this.soundOn));
    this.soundButton.replaceChildren(icon(this.soundOn ? 'sound' : 'mute'), h('span', { class: 'flipbook__tool-label', text: this.t.sound }));
    this.rustle(0.6);
  }

  /** A short rustle of paper, made from filtered noise; nothing is downloaded. */
  rustle(volume = 1) {
    if (!this.soundOn) {
      return;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      return;
    }
    try {
      if (!this.audio) {
        this.audio = new Context();
      }
      const audio = this.audio;
      if (audio.state === 'suspended') {
        audio.resume();
      }
      const seconds = 0.46;
      const length = Math.floor(audio.sampleRate * seconds);
      const buffer = audio.createBuffer(1, length, audio.sampleRate);
      const samples = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.05 * white) / 1.05;
        const t = i / length;
        const swell = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 1.4);
        const crackle = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.9 : 0;
        samples[i] = (white * 0.32 + brown * 2.6 + crackle) * swell * (0.75 + 0.25 * Math.random());
      }
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const band = audio.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(3400, audio.currentTime);
      band.frequency.exponentialRampToValueAtTime(850, audio.currentTime + seconds);
      const gain = audio.createGain();
      gain.gain.value = 0.2 * volume;
      source.connect(band);
      band.connect(gain);
      gain.connect(audio.destination);
      source.start();
    } catch {
      // the sound is only an ornament
    }
  }

  // --- Overview, zoom, full screen, sharing ----------------------------------------

  openOverview() {
    if (!this.overview) {
      const t = this.t;
      const grid = h('ol', { class: 'flipbook__thumbs' });
      for (let page = 1; page <= this.count; page++) {
        const label = this.sectionOf(page).label;
        grid.append(h('li', {}, h('button', { type: 'button', class: 'flipbook__thumb', 'data-page': page, 'aria-label': `${fill(t.page, { n: page })}${label ? `. ${label}` : ''}`, onclick: () => {
          this.overview.close();
          this.goToPage(page);
        } }, h('img', { src: this.file('thumb', page), alt: '', loading: 'lazy', decoding: 'async' }), h('span', { class: 'flipbook__thumb-n', text: String(page) }))));
      }
      this.overview = h('dialog', { class: 'flipbook__dialog flipbook__dialog--overview', 'aria-label': t.overview },
        h('div', { class: 'flipbook__dialog-head' }, h('h2', { class: 'flipbook__panel-title', text: t.overview }),
          h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.close, title: t.close, onclick: () => this.overview.close() }, icon('close'))),
        grid);
      this.overview.addEventListener('click', event => {
        if (event.target === this.overview) {
          this.overview.close();
        }
      });
      this.root.append(this.overview);
    }
    const visible = new Set(this.pagesAt(this.pos));
    let first = null;
    for (const button of this.overview.querySelectorAll('.flipbook__thumb')) {
      const on = visible.has(Number(button.dataset.page));
      button.classList.toggle('is-current', on);
      if (on && !first) {
        first = button;
      }
    }
    this.overview.showModal();
    if (first) {
      first.focus();
      first.scrollIntoView({ block: 'center' });
    }
  }

  openZoom() {
    const t = this.t;
    if (!this.zoomDialog) {
      this.zoomBody = h('div', { class: 'flipbook__zoom-body' });
      this.zoomLabel = h('p', { class: 'flipbook__zoom-label' });
      const scale = delta => {
        this.zoomLevel = clamp(this.zoomLevel + delta, 1, 3);
        this.sizeZoom();
      };
      this.zoomDialog = h('dialog', { class: 'flipbook__dialog flipbook__dialog--zoom', 'aria-label': t.zoom },
        h('div', { class: 'flipbook__dialog-head' }, this.zoomLabel,
          h('div', { class: 'flipbook__zoom-tools' },
            h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.zoomOut, title: t.zoomOut, onclick: () => scale(-0.5) }, icon('unzoom')),
            h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.zoomIn, title: t.zoomIn, onclick: () => scale(0.5) }, icon('zoom')),
            h('button', { type: 'button', class: 'flipbook__tool flipbook__tool--icon', 'aria-label': t.close, title: t.close, onclick: () => this.zoomDialog.close() }, icon('close')))),
        this.zoomBody);
      this.zoomBody.addEventListener('click', event => {
        const link = event.target.closest('.flipbook__link');
        if (link && link.dataset.dayCard) {
          event.preventDefault();
          this.zoomDialog.close();
          this.openDay(link.dataset.dayCard, false);
          return;
        }
        if (link && link.dataset.page) {
          event.preventDefault();
          this.zoomDialog.close();
          if (link.dataset.day) {
            this.goToDay(link.dataset.day);
          } else {
            this.goToPage(Number(link.dataset.page));
          }
        }
      });
      this.root.append(this.zoomDialog);
    }
    const pages = this.pagesAt(this.pos);
    this.zoomLabel.textContent = this.describe();
    this.zoomBody.replaceChildren(...pages.map(page => {
      const node = h('div', { class: 'flipbook__zoom-page' },
        h('img', { class: 'flipbook__img', src: this.file('zoom', page), alt: fill(t.page, { n: page }), decoding: 'async' }),
        h('div', { class: 'flipbook__links' }), h('div', { class: 'flipbook__marks' }));
      this.ensureLinks(node, page);
      return node;
    }));
    this.zoomDialog.showModal();
    this.sizeZoom();
    this.zoomBody.scrollTop = 0;
  }

  sizeZoom() {
    const width = Math.min(this.zoomBody.clientWidth - 24, 1000) * this.zoomLevel;
    for (const node of this.zoomBody.children) {
      node.style.width = `${Math.round(width)}px`;
      node.style.height = `${Math.round(width * this.data.ratio)}px`;
    }
  }

  toggleFullscreen() {
    const on = Boolean(document.fullscreenElement || document.webkitFullscreenElement) || this.root.classList.contains('flipbook--immersive');
    if (this.fullButton.dataset.immersive) {
      this.setFullscreenState(!on);
      return;
    }
    if (on) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const request = this.root.requestFullscreen || this.root.webkitRequestFullscreen;
      Promise.resolve(request.call(this.root)).catch(() => this.setFullscreenState(true));
    }
  }

  setFullscreenState(on) {
    const immersive = Boolean(this.fullButton.dataset.immersive) || !(document.fullscreenElement || document.webkitFullscreenElement);
    this.root.classList.toggle('flipbook--immersive', on && immersive);
    this.root.classList.toggle('flipbook--fullscreen', on);
    document.documentElement.classList.toggle('flipbook-lock', on && immersive);
    const label = on ? this.t.exitFullscreen : this.t.fullscreen;
    this.fullButton.title = label;
    this.fullButton.replaceChildren(icon(on ? 'unfull' : 'full'), h('span', { class: 'flipbook__tool-label', text: label }));
    this.fullButton.setAttribute('aria-pressed', String(on));
    this.book.focus({ preventScroll: true });
  }

  share(url = window.location.href, text = this.describe()) {
    if (navigator.share && this.coarse.matches) {
      navigator.share({ title: `${this.t.title} ${this.t.year}`, text, url }).catch(() => {});
      return;
    }
    const done = () => this.say(this.t.copied);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => this.say(url));
    } else {
      this.say(url);
    }
  }

  say(text) {
    this.toast.textContent = text;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, 2600);
  }

  previewScrub() {
    const page = Number(this.scrub.value);
    const share = (page - 1) / (this.count - 1);
    this.scrubTip.querySelector('img').src = this.file('thumb', page);
    const label = this.sectionOf(page).label;
    this.scrubTip.querySelector('span').textContent = label ? `${page} · ${label}` : String(page);
    this.scrubTip.style.left = `${share * 100}%`;
    this.scrubTip.classList.add('is-visible');
    this.scrub.style.setProperty('--flipbook-fill', `${share * 100}%`);
  }

  showHint() {
    const days = Boolean(this.root.dataset.days);
    this.hint.textContent = this.coarse.matches ? (days ? this.t.hintDaysTouch : this.t.hintTouch) : (days ? this.t.hintDays : this.t.hint);
    this.hint.classList.add('is-visible');
    const hide = () => this.hint.classList.remove('is-visible');
    window.setTimeout(hide, 6000);
    this.book.addEventListener('pointerdown', hide, { once: true });
  }
}

export function mountFlipbook(root) {
  if (root.dataset.flipbookState) {
    return;
  }
  root.dataset.flipbookState = 'loading';
  const source = new URL(root.dataset.src, document.baseURI);
  window.fetch(source.href, { credentials: 'omit', redirect: 'error' })
    .then(response => {
      if (!response.ok) {
        throw new Error(`book ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      root.dataset.flipbookState = 'ready';
      return new FlipBook(root, data, source);
    })
    .catch(error => {
      root.dataset.flipbookState = 'failed';
      root.classList.add('flipbook--failed');
      window.console.error(error);
    });
}

export function init() {
  for (const root of document.querySelectorAll('[data-flipbook]')) {
    mountFlipbook(root);
  }
}

init();
