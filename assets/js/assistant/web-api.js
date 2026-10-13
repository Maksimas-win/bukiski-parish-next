// One reviewed parish endpoint. No account, cookies, persistent browser storage or secrets.
const ENDPOINT = 'https://bukiski-hram.org/integrations/telegram/website.php';
export function createWebApi(transport = fetch) {
  let token = '';
  let generation = 0;
  let opening;
  async function post(body, sessionToken = token, keepalive = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    try {
      const response = await transport(ENDPOINT, {
        method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', keepalive,
        headers: { 'Content-Type': 'application/json', ...(sessionToken ? { 'X-Parish-Session': sessionToken } : {}) },
        body: JSON.stringify(body), signal: controller.signal
      });
      const text = await response.text();
      if (text.length > 20000 || !response.headers.get('content-type')?.includes('json')) {throw new Error('network');}
      const data = JSON.parse(text);
      if (!response.ok || data.ok !== true) {throw new Error(data.error || 'unavailable');}
      return data;
    } finally { clearTimeout(timer); }
  }
  async function ready() {
    if (token) {return;}
    if (opening) {return opening;}
    const current = generation;
    opening = post({ action: 'session' }, '').then(data => {
      if (current !== generation || !/^[a-f0-9]{64}$/.test(data.token)) {throw new Error('session');}
      token = data.token;
    }).finally(() => { if (current === generation) {opening = undefined;} });
    return opening;
  }
  return {
    ready,
    async call(body) { await ready(); return post(body); },
    forget() {
      const old = token; generation++; token = ''; opening = undefined;
      if (old) {return post({ action: 'forget' }, old, true).catch(() => {});}
      return Promise.resolve();
    }
  };
}

