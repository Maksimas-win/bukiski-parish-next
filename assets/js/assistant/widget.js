import { UI, LANGUAGES } from './i18n.js?v=5ef072de56';
import { answerQuestion, intentOf, localeOf, normalizeSchedule, safeLink, MAX_QUESTION } from './engine.js?v=5ef072de56';
import { WEB_UI } from './web-i18n.js?v=5ef072de56';
import { createWebApi } from './web-api.js?v=5ef072de56';
import { mountRequestForm } from './request-form.js?v=5ef072de56';

/** Static-hosting compatible UI; online actions are opt-in, with no browser persistence. */
export function mountAssistant({ site = 'net', base = '', scheduleURL, locale = 'ru', parent = document.body } = {}) {
  if (document.querySelector('[data-parish-assistant]')) {return;}
  let language = localeOf(locale);
  let t = UI[language];
  let busy = false;
  let session = 0;
  let cachedSchedule = null;
  let fetchedAt = 0;
  let activeRequest;
  const api = createWebApi();
  let aiEnabled = false;
  let disposeRequest;
  const origin = location.origin;
  const feed = new URL(scheduleURL || `${base}/data/services.json`, origin);
  if (feed.origin !== origin || !['http:', 'https:'].includes(feed.protocol)) {throw new Error('Schedule must be same-origin');}

  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {element.className = className;}
    if (text !== undefined) {element.textContent = text;}
    return element;
  };
  const button = (className, text) => { const element = node('button', className, text); element.type = 'button'; return element; };
  const root = node('div', 'parish-assistant');
  root.dataset.parishAssistant = '';
  root.lang = language;
  // A round launcher with an icon; the visible words live in the hint bubble beside it.
  const launcher = button('pa-launcher');
  launcher.setAttribute('aria-label', t.open);
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'parish-assistant-dialog');
  launcher.setAttribute('aria-describedby', 'pa-hint');
  // The icons are drawn in CSS (a speech bubble, a cross): no markup from strings, no SVG namespace.
  const glyph = className => { const span = node('span', `pa-launcher__icon ${className}`); span.setAttribute('aria-hidden', 'true'); return span; };
  launcher.append(glyph('pa-launcher__icon--open'), glyph('pa-launcher__icon--close'));
  const hint = node('div', 'pa-hint');
  hint.id = 'pa-hint'; hint.setAttribute('role', 'tooltip'); hint.hidden = true;
  const hintTitle = node('p', 'pa-hint__title', t.hint);
  const hintLines = node('p', 'pa-hint__lines', t.hintLines);
  hint.append(hintTitle, hintLines);
  const dialog = node('dialog', 'pa-dialog');
  dialog.id = 'parish-assistant-dialog';
  dialog.setAttribute('aria-labelledby', 'pa-title');
  dialog.setAttribute('aria-describedby', 'pa-mode');
  const head = node('header', 'pa-header');
  const heading = node('div', 'pa-heading');
  const eyebrow = node('p', 'pa-eyebrow', t.subtitle);
  const title = node('h2', 'pa-title', t.title);
  title.id = 'pa-title';
  const close = button('pa-close', '×');
  close.setAttribute('aria-label', t.close);
  heading.append(eyebrow, title);
  head.append(heading, close);
  const toolbar = node('div', 'pa-toolbar');
  const languageLabel = node('label', 'pa-language');
  const languageText = node('span', 'pa-sr-only', t.language);
  const select = node('select');
  select.setAttribute('aria-label', t.language);
  for (const [value, name] of Object.entries(LANGUAGES)) {
    const option = node('option', '', name); option.value = value; select.append(option);
  }
  select.value = language;
  languageLabel.append(languageText, select);
  const clear = button('pa-clear', t.clear);
  toolbar.append(languageLabel, clear);
  const mode = node('p', 'pa-mode', t.mode);
  mode.id = 'pa-mode';
  const transcript = node('div', 'pa-transcript');
  transcript.setAttribute('role', 'log');
  transcript.setAttribute('aria-live', 'polite');
  transcript.setAttribute('aria-relevant', 'additions');
  const suggestions = node('div', 'pa-suggestions');
  const status = node('p', 'pa-status');
  status.setAttribute('role', 'status');
  const form = node('form', 'pa-form');
  form.noValidate = true;
  const label = node('label', 'pa-sr-only', t.label);
  label.htmlFor = 'pa-question';
  const input = node('input', 'pa-input');
  input.id = 'pa-question'; input.type = 'text'; input.maxLength = MAX_QUESTION;
  input.autocomplete = 'off'; input.placeholder = t.placeholder;
  input.setAttribute('aria-describedby', 'pa-privacy');
  const send = node('button', 'pa-send', t.send);
  send.type = 'submit';
  form.append(label, input, send);
  const privacy = node('p', 'pa-privacy', WEB_UI[language].privacy);
  privacy.id = 'pa-privacy';
  const foot = node('footer', 'pa-footer');
  foot.append(suggestions, status, form, privacy);
  const online = node('div', 'pa-online-toolbar');
  const content = node('div', 'pa-content');
  content.append(toolbar, online, mode, transcript);
  dialog.append(head, content, foot);
  root.append(hint, launcher, dialog);
  parent.append(root);

  function renderSuggestions() {
    suggestions.replaceChildren();
    for (const text of t.suggestions) {
      const chip = button('pa-chip', text);
      chip.addEventListener('click', () => { input.value = text; form.requestSubmit(); });
      suggestions.append(chip);
    }
  }
  function entry(text, user = false) {
    const article = node('div', `pa-message${user ? ' pa-message--user' : ''}`);
    article.append(node('span', 'pa-author', user ? t.you : t.bot));
    if (text) {article.append(node('p', 'pa-text', text));}
    return article;
  }
  function addMessage(article) {
    transcript.append(article);
    while (transcript.children.length > 30) {transcript.firstElementChild.remove();}
    // Start at the new answer, so a long service card does not hide its first event.
    content.scrollTop = transcript.offsetTop + article.offsetTop;
  }
  function renderAnswer(answer) {
    const message = entry();
    for (const text of answer.paragraphs || []) {message.append(node('p', 'pa-text', text));}
    if (answer.events?.length) {
      const list = node('ul', 'pa-events');
      for (const event of answer.events) {
        const item = node('li', 'pa-event');
        const date = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Vilnius', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${event.date}T12:00:00Z`));
        const time = node('time', 'pa-event-date', date);
        time.dateTime = event.date;
        const eventTitle = node('p', 'pa-event-title', `${event.pending ? t.pending : event.startTime} · ${event.titleText}`);
        // Titles without a translation are labelled and retain their source language.
        if (event.titleLanguage !== language) {
          eventTitle.lang = event.titleLanguage;
          item.append(node('span', 'pa-event-note', `${t.original}: ${LANGUAGES[event.titleLanguage]}`));
        }
        item.append(time, eventTitle);
        if (event.subtitleText) {item.append(node('p', 'pa-event-note', event.subtitleText));}
        if (event.noteText) {item.append(node('p', 'pa-event-note', event.noteText));}
        if (event.past) {item.append(node('p', 'pa-event-note', t.past));}
        list.append(item);
      }
      message.append(list, node('p', 'pa-meta', t.time));
    }
    if (answer.more) {message.append(node('p', 'pa-text', t.more));}
    if (answer.updated && Number.isFinite(Date.parse(answer.updated))) {
      const date = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Vilnius', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(answer.updated));
      message.append(node('p', 'pa-meta', `${t.fresh} ${date} · ${t.time}`));
    }
    const links = node('div', 'pa-links');
    for (const link of answer.links || []) {
      const href = safeLink(link.href, origin);
      if (!href) {continue;}
      const a = node('a', 'pa-link', link.label);
      a.href = href;
      a.dataset.scheduleFull = '';
      a.addEventListener('click', () => dialog.close());
      if (href.startsWith('https:') && new URL(href).origin !== origin) {a.rel = 'noopener noreferrer';}
      links.append(a);
    }
    message.append(links);
    return message;
  }
  function reset() {
    session += 1;
    activeRequest?.abort();
    disposeRequest?.(); disposeRequest = undefined;
    api.forget(); aiEnabled = false;
    form.hidden = false; suggestions.hidden = false; mode.textContent = t.mode;
    busy = false; send.disabled = false; input.disabled = false;
    transcript.replaceChildren(); input.value = ''; status.textContent = '';
    const welcome = entry(t.greeting);
    welcome.append(node('p', 'pa-text', t.intro), node('p', 'pa-text', WEB_UI[language].intro));
    addMessage(welcome);
    content.scrollTop = 0;
  }
  function showPanel() {
    reset(); transcript.replaceChildren(); form.hidden = true; suggestions.hidden = true;
    const panel = node('div', 'pa-online-panel'); transcript.append(panel); return panel;
  }
  function offerAi() {
    const panel = showPanel(); const copy = WEB_UI[language];
    mode.textContent = copy.ai;
    panel.append(node('p', 'pa-text', copy.consent), node('p', 'pa-meta', copy.privacy));
    const details = node('details', 'pa-data'); details.append(node('summary', '', copy.data), node('p', 'pa-meta', copy.policy)); panel.append(details);
    const enable = button('pa-send', copy.enable);
    enable.addEventListener('click', () => {
      aiEnabled = true; panel.remove(); form.hidden = false; suggestions.hidden = false;
      mode.textContent = copy.active; addMessage(entry(copy.active)); input.focus();
    });
    const cancel = button('pa-clear', copy.cancel); cancel.addEventListener('click', () => { reset(); input.focus(); });
    panel.append(enable, cancel); enable.focus();
  }
  function renderOnline() {
    online.replaceChildren();
    const copy = WEB_UI[language];
    const ai = button('pa-chip', copy.ai); ai.addEventListener('click', offerAi);
    const request = button('pa-chip', copy.request);
    request.addEventListener('click', () => {
      const panel = showPanel();
      mode.textContent = copy.request;
      disposeRequest = mountRequestForm({ container: panel, t: copy, node, button, api, done: () => { reset(); input.focus(); } });
    });
    const data = button('pa-clear', copy.data);
    data.addEventListener('click', () => {
      const panel = showPanel(); panel.append(node('p', 'pa-text', copy.policy));
      mode.textContent = copy.data;
      const back = button('pa-clear', copy.cancel); back.addEventListener('click', () => { reset(); input.focus(); }); panel.append(back); back.focus();
    });
    online.append(ai, request, data);
  }
  async function schedule() {
    if (cachedSchedule && Date.now() - fetchedAt < 60000) {return cachedSchedule;}
    activeRequest = new AbortController();
    const timeout = setTimeout(() => activeRequest?.abort(), 8000);
    try {
      const response = await fetch(feed.href, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: activeRequest.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('json')) {throw new Error('Schedule unavailable');}
      const body = await response.text();
      if (body.length > 2500000) {throw new Error('Schedule too large');}
      const result = normalizeSchedule(JSON.parse(body));
      cachedSchedule = result; fetchedAt = Date.now();
      return result;
    } catch { return null; }
    finally { clearTimeout(timeout); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim().slice(0, MAX_QUESTION);
    if (busy) {return;}
    if (!question) { status.textContent = t.empty; input.focus(); return; }
    const turn = session;
    const intent = intentOf(question);
    const scheduleNeeded = intent === 'schedule';
    const useAi = aiEnabled && ['unknown', 'visit', 'sacraments', 'history'].includes(intent);
    addMessage(entry(question, true)); input.value = '';
    busy = true; send.disabled = true; input.disabled = true;
    status.textContent = useAi ? WEB_UI[language].thinking : scheduleNeeded ? t.loading : '';
    if (useAi) {
      try {
        const result = await api.call({ action: 'ai', id: globalThis.crypto.randomUUID(), question, language, consent: true });
        if (turn !== session) {return;}
        const article = entry(result.ai && typeof result.answer === 'string' ? result.answer : WEB_UI[language].error);
        if (result.ai) {article.querySelector('.pa-author').textContent = WEB_UI[language].label;}
        addMessage(article);
      } catch {
        if (turn === session) {addMessage(entry(WEB_UI[language].error));}
      } finally {
        if (turn === session) {busy = false; send.disabled = false; input.disabled = false; status.textContent = ''; if (dialog.open) {input.focus();}}
      }
      return;
    }
    const data = scheduleNeeded ? await schedule() : null;
    if (turn !== session) {return;}
    const answer = answerQuestion(question, { locale: language, schedule: data, site, base });
    addMessage(renderAnswer(answer));
    if (intent === 'unknown' && !aiEnabled) {
      const prompt = entry(WEB_UI[language].intro); const enable = button('pa-chip', WEB_UI[language].ai);
      enable.addEventListener('click', offerAi); prompt.append(enable); addMessage(prompt);
    }
    busy = false; send.disabled = false; input.disabled = false; status.textContent = '';
    if (dialog.open) {input.focus({ preventScroll: true });}
  });
  select.addEventListener('change', () => {
    language = localeOf(select.value); t = UI[language]; root.lang = language;
    launcher.setAttribute('aria-label', t.open); hintTitle.textContent = t.hint; hintLines.textContent = t.hintLines; title.textContent = t.title; eyebrow.textContent = t.subtitle;
    close.setAttribute('aria-label', t.close); select.setAttribute('aria-label', t.language); languageText.textContent = t.language;
    clear.textContent = t.clear; mode.textContent = t.mode; label.textContent = t.label;
    input.placeholder = t.placeholder; send.textContent = t.send; privacy.textContent = WEB_UI[language].privacy;
    renderSuggestions(); renderOnline(); reset();
  });
  clear.addEventListener('click', () => { reset(); status.textContent = t.cleared; input.focus(); });
  // The hint: on hover or keyboard focus, never on touch (a tap opens the assistant at once).
  let lastPointer = ''; let hideTimer;
  const placeHint = () => {
    const rect = launcher.getBoundingClientRect();
    hint.classList.toggle('pa-hint--above', rect.left < 300);
  };
  const showHint = () => { if (dialog.open) {return;} clearTimeout(hideTimer); placeHint(); hint.hidden = false; root.classList.add('pa-hinting'); };
  const hideHint = (delay = 0) => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { hint.hidden = true; root.classList.remove('pa-hinting'); }, delay); };
  launcher.addEventListener('pointerdown', event => { lastPointer = event.pointerType; });
  launcher.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') {showHint();} });
  launcher.addEventListener('pointerleave', () => hideHint(160));
  hint.addEventListener('pointerenter', () => { clearTimeout(hideTimer); });
  hint.addEventListener('pointerleave', () => hideHint(160));
  launcher.addEventListener('focus', () => { if (lastPointer !== 'touch') {showHint();} });
  launcher.addEventListener('blur', () => hideHint());
  launcher.addEventListener('keydown', event => { if (event.key === 'Escape' && !hint.hidden) { event.preventDefault(); hideHint(); } });
  launcher.addEventListener('click', () => {
    // Prevent competing site dialogs from sharing the top layer.
    if (document.querySelector('dialog[open]')) {return;}
    hideHint(); lastPointer = '';
    dialog.showModal(); launcher.setAttribute('aria-expanded', 'true'); root.classList.add('pa-open'); input.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { launcher.setAttribute('aria-expanded', 'false'); root.classList.remove('pa-open'); lastPointer = 'touch'; launcher.focus({ preventScroll: true }); setTimeout(() => { lastPointer = ''; }, 300); });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {dialog.close();}
  } });
  const erase = () => { reset(); };
  globalThis.addEventListener('pagehide', erase);
  globalThis.addEventListener('pageshow', erase);
  renderSuggestions(); renderOnline(); reset();
  return { open: () => launcher.click(), destroy: () => { activeRequest?.abort(); disposeRequest?.(); api.forget(); globalThis.removeEventListener('pagehide', erase); globalThis.removeEventListener('pageshow', erase); root.remove(); } };
}

