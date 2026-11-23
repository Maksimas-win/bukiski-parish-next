import { setTimeout as delay } from 'node:timers/promises';

const transientNetworkCodes = new Set([
  'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);

export async function retryScheduleRead(read, wait = delay) {
  try {
    return await read();
  } catch (error) {
    const transient = error?.name === 'TimeoutError'
      || (error instanceof TypeError && transientNetworkCodes.has(error.cause?.code));
    if (!transient) throw error;
    console.warn('Schedule source temporarily unreachable; retrying once.');
    await wait(1000);
    return read();
  }
}
