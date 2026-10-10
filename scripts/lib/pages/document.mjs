// Download pages for the recovered PDF/DOC originals.
//
// Two delivery modes, chosen by settings.documentDelivery or DOCUMENT_DELIVERY:
//   envelope - for hosts that cannot send HTTP headers (GitHub Pages). The file
//              travels inside a noindex HTML page and is rebuilt in the browser,
//              so no directly indexable PDF/DOC address exists.
//   direct   - for Apache hosting. The file is served as-is and .htaccess adds
//              `X-Robots-Tag: noindex`; no JavaScript is needed to download it.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { decodeDocument } from '../../../assets/js/document-data.js';
import { html, attrs, raw } from '../html.mjs';
import { icon } from '../icons.mjs';
import { ROOT } from '../site.mjs';
import { pageHead, siteLink } from '../components.mjs';

const MIME_TYPES = { pdf: 'application/pdf', doc: 'application/msword' };

/** Reads an original and refuses to build if it no longer matches the registry. */
export async function loadDocument(document) {
  const filename = document.local.split('/').at(-1);
  const extension = filename.split('.').at(-1);
  const mime = MIME_TYPES[extension];
  const content = await readFile(resolve(ROOT, document.local));
  const base64 = content.toString('base64');
  await decodeDocument({ filename, mime, bytes: document.bytes, sha256: document.sha256, base64 });
  return { ...document, filename, extension, mime, content, base64 };
}

export function documentPage(site, lang, t, file) {
  const type = file.extension.toUpperCase();
  const size = new Intl.NumberFormat(lang, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 2 }).format(file.content.length / 1000000);
  const label = html`${icon('download')}${t.documentDownload} (${type})`;
  const envelope = site.documentDelivery === 'envelope';

  const region = attrs({
    'data-document-region': true,
    'data-document-loading': t.documentLoading,
    'data-document-ready': t.documentReady,
    'data-document-error': t.documentError
  });
  const action = envelope
    ? html`<button type="button" class="button" data-document-download hidden>${label}</button>`
    : html`<a class="button" href="${site.url(`/${file.local}`)}" download="${file.filename}" rel="nofollow">${label}</a>`;
  const payload = envelope && html`<noscript><p class="notice">${t.documentNoJs}</p></noscript><template${attrs({
    'data-document-payload': true,
    'data-filename': file.filename,
    'data-mime': file.mime,
    'data-bytes': file.content.length,
    'data-sha256': file.sha256
  })}>${raw(file.base64)}</template>`;

  return html`${pageHead({ title: t.documentDownload, intro: t.documentIntro })}
  <section class="shell prose prose--narrow"${region}>
    <h2 lang="ru">${file.title}</h2>
    <p class="hint">${type}, ${size}</p>
    <div class="actions">${action}${siteLink(site, site.route(lang, 'library'), t.documentBack, 'button button--quiet')}</div>
    <p class="hint" data-document-status role="status" aria-live="polite"></p>
    ${payload}
  </section>`;
}
