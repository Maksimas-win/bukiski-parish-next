// Library filter and search. All cards are in the HTML; this module narrows
// them by language and query. Searching inside article text is opt-in, because
// it downloads the full text of every article.

import { searchText } from '../domain.js?v=95fb8fa485';
import { $, $$, show, create } from '../ui/dom.js?v=95fb8fa485';

const SNIPPET_BEFORE = 70;
const SNIPPET_AFTER = 130;

/** Like searchText, but the result always has the same length as the input,
 *  so a match position in the folded text is a position in the original. */
function foldSameLength(text) {
  const folded = searchText(text);
  if (folded.length === text.length) return folded;
  let out = '';
  for (const char of text) {
    const part = searchText(char);
    out += part.length === char.length ? part : (part + ' '.repeat(char.length)).slice(0, char.length);
  }
  return out;
}

/** Builds «…text with <mark>matches</mark>…» around the first match, as DOM nodes. */
function snippet(text, folded, terms) {
  const first = Math.min(...terms.map(term => folded.indexOf(term)).filter(index => index >= 0));
  if (!Number.isFinite(first)) return null;
  let start = Math.max(0, first - SNIPPET_BEFORE);
  let end = Math.min(text.length, first + SNIPPET_AFTER);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;

  const marks = [];
  for (const term of terms) {
    let index = folded.indexOf(term, start);
    while (index >= 0 && index + term.length <= end) {
      marks.push([index, index + term.length]);
      index = folded.indexOf(term, index + term.length);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);

  const nodes = [start > 0 ? '…' : ''];
  let cursor = start;
  for (const [from, to] of marks) {
    if (from < cursor) continue;
    nodes.push(text.slice(cursor, from), create('mark', { text: text.slice(from, to) }));
    cursor = to;
  }
  nodes.push(text.slice(cursor, end), end < text.length ? '…' : '');
  return nodes;
}

export function init() {
  const root = $('[data-library]');
  if (!root) return;

  const labels = root.dataset;
  const pageSize = Number(labels.pageSize) || 18;
  const query = $('#library-query', root);
  const fullText = $('[data-full-text]', root);
  const status = $('[data-library-status]', root);
  const moreButton = $('[data-show-more]', root);
  const languageButtons = $$('[data-language-filter]', root);
  const items = $$('[data-library-list] > [data-library-item]', root).map(element => {
    const excerpt = $('[data-excerpt]', element);
    return {
      element,
      excerpt,
      description: excerpt?.textContent || '',
      language: element.dataset.language,
      url: element.dataset.url,
      folded: searchText(element.dataset.search),
      text: null,
      foldedText: null
    };
  });

  const available = new Set(items.map(item => item.language));
  const parameters = new URLSearchParams(location.search);
  const requested = parameters.get('lang');
  const pageLanguage = document.body.dataset.locale;
  const state = {
    // Start with the reader's own language when the library has material in it.
    language: requested === 'all' || available.has(requested) ? requested : available.has(pageLanguage) ? pageLanguage : 'all',
    shown: pageSize,
    indexLoaded: false
  };
  query.value = (parameters.get('q') || '').slice(0, 100);

  function matches(item, terms) {
    if (state.language !== 'all' && item.language !== state.language) return false;
    return terms.every(term => item.folded.includes(term) || (fullText.checked && item.foldedText?.includes(term)));
  }

  function render() {
    const terms = searchText(query.value).trim().split(/\s+/).filter(Boolean);
    const matched = items.filter(item => matches(item, terms));
    const visible = new Set(matched.slice(0, state.shown));

    for (const item of items) {
      show(item.element, visible.has(item));
      if (!item.excerpt || !visible.has(item)) continue;
      // Show where the words occur when the match is in the body rather than the title.
      const inBody = fullText.checked && item.text && terms.length > 0 && terms.some(term => !item.folded.includes(term));
      const nodes = inBody ? snippet(item.text, item.foldedText, terms) : null;
      if (nodes) item.excerpt.replaceChildren(...nodes);
      else item.excerpt.textContent = item.description;
    }

    for (const button of languageButtons) button.setAttribute('aria-pressed', String(button.dataset.languageFilter === state.language));
    status.textContent = `${labels.labelResults}: ${matched.length}`;
    show($('[data-no-results]', root), matched.length === 0);
    show(moreButton, matched.length > state.shown);

    // Keep the view shareable and restorable with the back button.
    const next = new URLSearchParams();
    if (query.value.trim()) next.set('q', query.value.trim());
    if (state.language !== (available.has(pageLanguage) ? pageLanguage : 'all')) next.set('lang', state.language);
    const search = next.toString();
    history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}${location.hash}`);
  }

  async function loadIndex() {
    if (state.indexLoaded) return;
    status.textContent = labels.labelLoading;
    const response = await fetch(labels.index, { credentials: 'omit', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Search index unavailable');
    const byUrl = new Map((await response.json()).map(entry => [entry.u, entry.x]));
    for (const item of items) {
      const text = byUrl.get(item.url);
      if (typeof text !== 'string') continue;
      item.text = text;
      item.foldedText = foldSameLength(text);
    }
    state.indexLoaded = true;
  }

  query.addEventListener('input', () => {
    state.shown = pageSize;
    render();
  });
  for (const button of languageButtons) {
    button.addEventListener('click', () => {
      state.language = button.dataset.languageFilter;
      state.shown = pageSize;
      render();
    });
  }
  moreButton.addEventListener('click', () => {
    const firstNew = items.filter(item => item.element.hidden && matches(item, searchText(query.value).trim().split(/\s+/).filter(Boolean)))[0];
    state.shown += pageSize;
    render();
    $('a', firstNew?.element)?.focus();
  });
  fullText.addEventListener('change', async () => {
    if (fullText.checked) {
      try {
        await loadIndex();
      } catch {
        fullText.checked = false;
        show($('[data-no-results]', root), false);
        status.textContent = labels.labelUnavailable;
        return;
      }
    }
    state.shown = pageSize;
    render();
  });
  // «/» jumps to the search field, as on many reference sites.
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    query.focus();
  });

  show($('[data-library-tools]', root));
  render();
}
