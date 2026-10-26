// Static rules for the browser code: what it may touch and what it must never do.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const directory = new URL('../assets/js/', import.meta.url);
const files = (await readdir(directory, { recursive: true })).filter(name => name.endsWith('.js'));
const sources = new Map(await Promise.all(files.map(async name => [name.replaceAll('\\', '/'), await readFile(new URL(name, directory), 'utf8')])));

test('No script builds markup from strings, evaluates code or contacts third parties', () => {
  assert.ok(sources.size >= 12);
  for (const [name, source] of sources) {
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\(\s*['"]style/, name);
    assert.doesNotMatch(source, /gtag\(|googletagmanager|google-analytics|facebook\.net/, name);
    // The assistant's two pure data modules contain navigation links, never requests.
    if (['assistant/engine.js', 'assistant/knowledge.js'].includes(name)) {
      assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/, name);
    } else if (name === 'assistant/web-api.js') {
      assert.doesNotMatch(source.replace('https://bukiski-hram.org/integrations/telegram/website.php', ''), /https?:\/\//, name);
      assert.match(source, /redirect: 'error'/);
    } else assert.doesNotMatch(source, /https?:\/\//, name);
  }
});

test('Only reading preferences and the day the thank-you dialog last opened are stored in the browser', () => {
  const writers = [...sources].filter(([, source]) => /localStorage\.setItem|sessionStorage|indexedDB|document\.cookie/.test(source)).map(([name]) => name).sort();
  assert.deepEqual(writers, ['ui/preferences.js', 'ui/thanks.js']);
  assert.equal((sources.get('ui/preferences.js').match(/localStorage\.setItem/g) || []).length, 1);
  // The thank-you dialog stores one timestamp under its own key and nothing else.
  const thanks = sources.get('ui/thanks.js');
  assert.equal((thanks.match(/localStorage\.setItem/g) || []).length, 1);
  assert.match(thanks, /localStorage\.setItem\(STORAGE_KEY, new Date\(\)\.toISOString\(\)\)/);
  const readers = [...sources].filter(([, source]) => source.includes('localStorage')).map(([name]) => name).sort();
  assert.deepEqual(readers, ['theme-init.js', 'ui/preferences.js', 'ui/thanks.js']);
  // Both files must agree on the storage key.
  const key = sources.get('ui/preferences.js').match(/STORAGE_KEY = '([^']+)'/)[1];
  assert.ok(sources.get('theme-init.js').includes(`'${key}'`));
});

test('Prayer names leave the tab only on «Отправить», after consent, and are erased when the page is left', () => {
  const notes = sources.get('features/notes.js');
  assert.match(notes, /event\.preventDefault\(\);\n\s*send\(\);/);
  assert.match(notes, /if \(!consent\.checked\)/);
  assert.equal((notes.match(/\bfetch\(/g) || []).length, 1);
  assert.match(notes, /fetch\(endpoint, \{/);
  assert.match(notes, /const endpoint = labels\.notesEndpoint;/);
  assert.match(notes, /window\.addEventListener\('pagehide', erase\)/);
  assert.match(notes, /if \(event\.persisted\) erase\(\)/);
  assert.doesNotMatch(notes, /XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|history\.|location\.(?:href|search|hash)|console\./);
});

test('Network requests are limited to reviewed modules and send no cookies', () => {
  const fetchers = [...sources].filter(([, source]) => /\bfetch\(/.test(source)).map(([name]) => name).sort();
  assert.deepEqual(fetchers, ['assistant/widget.js', 'document-downloads.js', 'features/library.js', 'features/notes.js']);
  for (const name of fetchers) assert.match(sources.get(name), /credentials: 'omit'/, name);
  const assistant = sources.get('assistant/widget.js');
  assert.match(assistant, /feed\.origin !== origin/);
  assert.match(assistant, /redirect: 'error'/);
  assert.doesNotMatch(assistant, /method: 'POST'|JSON\.stringify\(question\)/);
  const api = sources.get('assistant/web-api.js');
  assert.match(api, /credentials: 'omit'/);
  assert.match(api, /method: 'POST'/);
  assert.doesNotMatch(api, /localStorage|sessionStorage|document\.cookie|console\./);
});

test('Every feature module that app.js loads exists and exports init()', () => {
  const app = sources.get('app.js');
  const features = [...app.matchAll(/import\('\.\/(features\/[a-z-]+\.js)'\)/g)].map(match => match[1]);
  assert.ok(features.length >= 5);
  for (const name of features) assert.match(sources.get(name), /export function init\(\)/, name);
});

