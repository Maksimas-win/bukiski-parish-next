import assert from 'node:assert/strict';
import test from 'node:test';
import { isPermanentRedirect } from '../scripts/monitor/redirect.mjs';

test('the .org root must redirect permanently to its own Russian home', () => {
  const home = new URL('https://bukiski-hram.org/ru/');
  for (const [status, location, accepted] of [
    [301, '/ru/', true], [301, home.href, true], [302, '/ru/', false],
    [301, '/', false], [301, '/lt/', false], [301, '//example.org/ru/', false],
    [301, null, false], [200, null, false],
  ]) {
    const headers = new Headers(location === null ? {} : { location });
    assert.equal(isPermanentRedirect({ status, headers }, home), accepted);
  }
});
