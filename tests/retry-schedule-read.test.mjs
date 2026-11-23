import assert from 'node:assert/strict';
import test from 'node:test';
import { retryScheduleRead } from '../scripts/retry-schedule-read.mjs';

const noDelay = async () => {};

test('recovers after a timeout or connection reset with one fresh read', async () => {
  for (const error of [
    new DOMException('Timed out', 'TimeoutError'),
    new TypeError('fetch failed', { cause: Object.assign(new Error(), { code: 'ECONNRESET' }) }),
  ]) {
    let calls = 0;
    const result = await retryScheduleRead(async () => {
      if (++calls === 1) throw error;
      return 'verified feed';
    }, noDelay);
    assert.equal(result, 'verified feed');
    assert.equal(calls, 2);
  }
});

test('propagates a second timeout and never retries an invalid schedule', async () => {
  for (const [error, expectedCalls] of [
    [new DOMException('Timed out', 'TimeoutError'), 2],
    [new SyntaxError('Invalid JSON'), 1],
    [new Error('Refusing an older schedule'), 1],
  ]) {
    let calls = 0;
    await assert.rejects(retryScheduleRead(async () => { calls++; throw error; }, noDelay),
      reason => reason === error);
    assert.equal(calls, expectedCalls);
  }
});
