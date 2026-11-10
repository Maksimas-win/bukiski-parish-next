// New parish publications live separately from the preserved source-site archive.

import { safeExternalURL } from '../../assets/js/domain.js';
import { documentPath } from '../../assets/js/document-data.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAGS = new Set(['p', 'h2', 'h3', 'li', 'blockquote']);
const hasText = value => typeof value === 'string' && value.trim().length > 0;

export const publicationPath = publication => `/${publication.language}/library/${publication.slug}.html`;

/** Refuse incomplete publications, broken document references and unsafe links. */
export function validatePublications(publications, languages, documents) {
  if (!Array.isArray(publications)) throw new Error('publications.json must contain an array');
  const paths = new Set();
  for (const publication of publications) {
    const fail = message => { throw new Error(`publications.json: ${publication.slug || '(missing slug)'}: ${message}`); };
    if (!SLUG.test(publication.slug || '') || !languages.includes(publication.language)) fail('invalid slug or language');
    const path = publicationPath(publication);
    if (paths.has(path)) fail('duplicate path');
    paths.add(path);
    for (const key of ['title', 'description', 'lead', 'author']) if (!hasText(publication[key])) fail(`missing ${key}`);
    const date = publication.publishedAt;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail('invalid publication date');
    if (!Array.isArray(publication.sources) || !Array.isArray(publication.documents)) fail('sources and documents must be arrays');
    const references = new Set();
    for (const source of publication.sources) {
      if (!SLUG.test(source.id || '') || references.has(source.id) || !hasText(source.label) || !safeExternalURL(source.url)) fail('invalid or duplicate source');
      references.add(source.id);
    }
    const documentPaths = new Set();
    for (const item of publication.documents) {
      if (!SLUG.test(item.id || '') || references.has(item.id) || !hasText(item.label)) fail('invalid or duplicate document');
      references.add(item.id);
      const document = documents.find(candidate => candidate.local === item.local);
      if (!document || documentPaths.has(document.local)) fail(`missing or duplicate document ${item.local}`);
      documentPaths.add(document.local);
      documentPath(document, publication.language);
    }
    if (!Array.isArray(publication.blocks) || !publication.blocks.length) fail('missing article text');
    for (const block of publication.blocks) {
      if (!TAGS.has(block.tag) || !hasText(block.text)) fail('invalid text block');
      if (block.refs !== undefined && (!Array.isArray(block.refs) || block.refs.some(id => !references.has(id)))) fail('unknown source reference');
    }
  }
}

/** A catalog record with the same card/search fields as the archived articles. */
export function publicationEntry(site, publication) {
  const target = publicationPath(publication);
  const text = [publication.title, publication.lead, ...publication.blocks.map(block => block.text.replace(/\*\*/g, ''))].join('\n\n');
  return {
    kind: 'publication',
    publication,
    page: { text },
    url: site.productionOrigin + target,
    language: publication.language,
    title: publication.title,
    description: publication.description,
    publishedAt: publication.publishedAt,
    target,
    ownsTarget: true,
    cover: null,
    gallery: [],
    minutes: Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 170))
  };
}
