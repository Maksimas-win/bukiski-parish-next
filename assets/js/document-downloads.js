// Downloads a preserved document from its noindex HTML envelope and hands the
// verified original bytes to the browser. Used on hosts that cannot send an
// X-Robots-Tag header; see scripts/lib/pages/document.mjs.

import { decodeDocument } from './document-data.js?v=b39ccbf01f';

const MAX_PAGE_LENGTH = 8 * 1024 * 1024;
const DOCUMENT_PAGE = /^(ru|lt|en|pl|de|uk)\/documents\/[a-z0-9-]+\.html$/;

function readEnvelope(page) {
  const robots = page.querySelector('meta[name="robots"]')?.content.split(',').map(value => value.trim()) || [];
  if (!robots.includes('noindex')) throw new Error('Missing document noindex');
  const templates = page.querySelectorAll('template[data-document-payload]');
  if (templates.length !== 1) throw new Error('Invalid document page');
  const template = templates[0];
  return { ...template.dataset, base64: template.content.textContent.trim() };
}

/** Fetches the download page behind an article link and returns it as a parsed document. */
async function fetchDocumentPage(link, siteRoot) {
  const target = new URL(link.href);
  const relative = target.pathname.slice(siteRoot.pathname.length);
  if (target.origin !== siteRoot.origin || !target.pathname.startsWith(siteRoot.pathname) || !DOCUMENT_PAGE.test(relative) || target.search || target.hash) {
    throw new Error('Invalid download destination');
  }
  const response = await fetch(target, { credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) throw new Error('Document page unavailable');
  const html = await response.text();
  if (html.length > MAX_PAGE_LENGTH) throw new Error('Oversized document page');
  return new DOMParser().parseFromString(html, 'text/html');
}

export function init() {
  enableDocumentDownloads(new URL(document.body.dataset.root, location.href));
}

export function enableDocumentDownloads(siteRoot) {
  const controls = [...document.querySelectorAll('[data-document-download]')];
  if (!controls.length) return;

  const urls = new Set();
  const active = new WeakSet();
  const revoke = url => {
    URL.revokeObjectURL(url);
    urls.delete(url);
  };
  window.addEventListener('pagehide', () => {
    for (const url of urls) revoke(url);
  });

  for (const control of controls) {
    const region = control.closest('[data-document-region]');
    const status = region.querySelector('[data-document-status]');
    control.hidden = false;

    control.addEventListener('click', async event => {
      // Preserve opening a link in another tab; that page has its own download button.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (active.has(control)) return;
      active.add(control);
      control.setAttribute('aria-busy', 'true');
      status.textContent = region.dataset.documentLoading;

      try {
        const page = control.tagName === 'A' ? await fetchDocumentPage(control, siteRoot) : document;
        const file = await decodeDocument(readEnvelope(page));
        const href = URL.createObjectURL(new Blob([file.content], { type: file.mime }));
        urls.add(href);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = file.filename;
        anchor.hidden = true;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        // Give browsers, including mobile download managers, time to consume the blob.
        setTimeout(() => revoke(href), 60000);
        status.textContent = region.dataset.documentReady;
      } catch {
        status.textContent = region.dataset.documentError;
      } finally {
        active.delete(control);
        control.removeAttribute('aria-busy');
      }
    });
  }
}
