// Validation shared by the build, the publication check and the browser for
// documents delivered inside an HTML page. No browser storage is used.

import { SITE_LANGUAGES } from './domain.js?v=95fb8fa485';

const TYPES = { pdf: 'application/pdf', doc: 'application/msword' };
const SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],                         // %PDF-
  doc: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]        // OLE compound file
};
const MAX_BYTES = 5 * 1024 * 1024;

/** Path of the download page for a document in a site language. */
export function documentPath(document, lang) {
  if (!SITE_LANGUAGES.includes(lang)) throw new Error('Unsupported document language');
  const match = /^assets\/documents\/([a-z0-9-]+)\.(pdf|doc)$/.exec(document.local || '');
  if (!match) throw new Error('Invalid document path');
  return `/${lang}/documents/${match[1]}.html`;
}

/**
 * Rebuilds a file from its base64 envelope and proves it is the registered
 * original: declared type, exact size, file signature and SHA-256 must all match.
 */
export async function decodeDocument({ filename, mime, bytes, sha256, base64 }) {
  const match = /^[a-z0-9-]+\.(pdf|doc)$/.exec(filename || '');
  const size = Number(bytes);
  if (!match || TYPES[match[1]] !== mime || !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES || !/^[a-f0-9]{64}$/.test(sha256 || '')) {
    throw new Error('Invalid document metadata');
  }
  if (typeof base64 !== 'string' || base64.length !== 4 * Math.ceil(size / 3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('Invalid document encoding');
  }
  const content = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  if (content.length !== size) throw new Error('Incomplete document');
  if (!SIGNATURES[match[1]].every((value, index) => content[index] === value)) throw new Error('Wrong document format');

  const digest = await crypto.subtle.digest('SHA-256', content);
  const actual = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== sha256) throw new Error('Document checksum mismatch');
  return { content, filename, mime };
}
