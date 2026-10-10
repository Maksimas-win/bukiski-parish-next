// Local preview of dist/ on http://127.0.0.1:4173. Run `npm run build` first.
//   PORT=8080 BASE_PATH=/bukiski-parish-next npm run dev

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 4173);
const base = (process.env.BASE_PATH || '').replace(/\/$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ics': 'text/calendar; charset=utf-8',
  '.vcf': 'text/vcard; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword'
};

const send = (response, status, headers = {}, body = '') => {
  response.writeHead(status, headers);
  response.end(body);
};

async function handle(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return send(response, 404);
  const local = pathname.slice(base.length) || '/';
  // Dot-files such as .htaccess are host configuration, not content.
  if (local.split('/').some(part => part.startsWith('.'))) return send(response, 403);

  let path = resolve(root, `.${local}`);
  if (path !== root && !path.startsWith(root + sep)) return send(response, 403);
  if ((await stat(path)).isDirectory()) {
    if (!pathname.endsWith('/')) return send(response, 301, { Location: `${pathname}/` });
    path = resolve(path, 'index.html');
  }
  const data = await readFile(path);
  return send(response, 200, {
    'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  }, data);
}

createServer(async (request, response) => {
  try {
    await handle(request, response);
  } catch {
    const notFound = await readFile(resolve(root, '404.html')).catch(() => 'Build the site first: npm run build');
    send(response, 404, { 'Content-Type': 'text/html; charset=utf-8' }, notFound);
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${base}/`));
