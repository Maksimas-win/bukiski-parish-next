// Builds the static site into dist/.
//
//   npm run build
//
// Environment (all optional): SITE_ORIGIN, BASE_PATH, PRODUCTION, BUILD_TIME,
// DOCUMENT_DELIVERY. See .env.example and docs/DEPLOYMENT.md.

import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { documentPath } from '../assets/js/document-data.js';
import { loadSite, ROOT, DIST, CORE_PAGES } from './lib/site.mjs';
import { createCatalog } from './lib/catalog.mjs';
import { renderDocument } from './lib/layout.mjs';
import { homePage } from './lib/pages/home.mjs';
import { schedulePage } from './lib/pages/schedule.mjs';
import { contactsPage, historyPage, sacramentsPage, supportPage, privacyPage, notFoundPage } from './lib/pages/parish.mjs';
import { notesPage } from './lib/pages/notes.mjs';
import { libraryPage, newsPage } from './lib/pages/library.mjs';
import { articlePage, lightboxDialog } from './lib/pages/article.mjs';
import { documentPage, loadDocument } from './lib/pages/document.mjs';
import * as outputs from './lib/outputs.mjs';

const site = await loadSite();
const catalog = createCatalog(site);
const routes = new Map();

function addRoute(page) {
  if (routes.has(page.path)) throw new Error(`Route collision: ${page.path}`);
  routes.set(page.path, renderDocument(site, page));
}

/** A second address for an existing page, with the original as canonical. */
function addAlias(path, target, { noindex = true } = {}) {
  routes.set(path, { ...routes.get(target), noindex, canonicalPath: target });
}

async function writeOutput(path, content) {
  const output = resolve(DIST, path);
  if (!output.startsWith(DIST + sep)) throw new Error(`Output escapes dist: ${path}`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, content);
}

// --- Assets ----------------------------------------------------------------

async function copyAssets() {
  // Originals of documents and archive images stay in the repository. Pages use
  // the web-sized copies; documents are published according to documentDelivery.
  const excluded = new Set([resolve(ROOT, 'assets/img/archive')]);
  if (site.documentDelivery === 'envelope') excluded.add(resolve(ROOT, 'assets/documents'));
  await cp(resolve(ROOT, 'assets'), resolve(DIST, 'assets'), { recursive: true, filter: source => !excluded.has(source) });

  // Image paths that other sites may still reference on the existing .org domain.
  for (const asset of site.assets) {
    const source = new URL(asset.source);
    if (source.hostname !== 'bukiski-hram.org' || !asset.local || !source.pathname.startsWith('/assets/')) continue;
    const destination = resolve(DIST, `.${source.pathname}`);
    if (!destination.startsWith(DIST + sep)) throw new Error('Unsafe legacy asset path');
    await mkdir(dirname(destination), { recursive: true });
    await cp(resolve(ROOT, asset.local), destination);
  }
}

/** Concatenates styles/*.css in file-name order into one stylesheet. */
async function buildStylesheet() {
  const directory = resolve(ROOT, 'styles');
  const files = (await readdir(directory)).filter(name => name.endsWith('.css')).sort();
  const parts = await Promise.all(files.map(async name => `/* ${name} */\n${await readFile(resolve(directory, name), 'utf8')}`));
  return parts.join('\n');
}

/**
 * Adds ?v=<hash> to every relative module import so that browsers and CDNs
 * never mix scripts from two different releases.
 */
async function versionScripts(version) {
  const directory = resolve(DIST, 'assets/js');
  const files = (await readdir(directory, { recursive: true })).filter(name => name.endsWith('.js'));
  for (const name of files) {
    const path = resolve(directory, name);
    const source = await readFile(path, 'utf8');
    const versioned = source.replace(/(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+\.js)\2/g, `$1$2$3?v=${version}$2`);
    if (/(?:\bfrom\s+|\bimport\s*\(\s*)['"]\.{1,2}\/[^'"?]+['"]/.test(versioned)) throw new Error(`Unversioned import left in ${name}`);
    await writeFile(path, versioned);
  }
}

async function assetVersion(stylesheet) {
  const directory = resolve(ROOT, 'assets/js');
  const files = (await readdir(directory, { recursive: true })).filter(name => name.endsWith('.js')).sort();
  const digest = createHash('sha256').update(stylesheet);
  for (const name of files) digest.update(name).update(await readFile(resolve(directory, name)));
  return digest.digest('hex').slice(0, 10);
}

// --- Pages -----------------------------------------------------------------

function addCorePages() {
  const archiveOf = url => catalog.byUrl.get(url)?.archive;
  for (const lang of site.languages) {
    const t = site.locales[lang];
    const bodies = {
      home: () => homePage(site, lang, t),
      schedule: () => schedulePage(site, lang, t),
      history: () => historyPage(site, lang, t, archiveOf(`https://bukiski-hram.org/${lang}/history.html`)),
      sacraments: () => sacramentsPage(site, lang, t),
      news: () => newsPage(site, catalog, lang, t, archiveOf(`https://bukiski-hram.org/${lang}/news.html`)),
      contacts: () => contactsPage(site, lang, t),
      library: () => libraryPage(site, catalog, lang, t),
      notes: () => notesPage(site, lang, t),
      support: () => supportPage(site, lang, t),
      privacy: () => privacyPage(site, lang, t)
    };
    for (const pageId of CORE_PAGES) {
      addRoute({
        lang,
        pageId,
        title: pageId === 'home' ? t.name : t[pageId],
        description: pageId === 'home' ? t.heroIntro : (t[`${pageId}Intro`] || t[`${pageId}Teaser`] || t[pageId]),
        body: bodies[pageId](),
        path: site.route(lang, pageId),
        alternates: site.languages.map(code => ({ lang: code, path: site.route(code, pageId) }))
      });
    }
  }
  // The root serves the Russian home page as real HTML, without a script redirect.
  addAlias('/', '/ru/', { noindex: false });
}

async function addDocumentPages() {
  const files = [];
  for (const document of site.documents.filter(candidate => candidate.local)) {
    const file = await loadDocument(document);
    files.push(file);
    for (const lang of site.languages) {
      const t = site.locales[lang];
      addRoute({
        lang,
        pageId: 'document',
        title: `${t.documentDownload} · ${file.title}`,
        description: t.documentIntro,
        body: documentPage(site, lang, t, file),
        path: documentPath(document, lang),
        noindex: true,
        noFollow: true,
        alternates: site.languages.map(code => ({ lang: code, path: documentPath(document, code) }))
      });
    }
  }
  return files;
}

/** Up to three other articles in the same language, following this one in library order. */
function relatedArticles(entry, uiLocale) {
  const sameLanguage = catalog.articlesFor(uiLocale).filter(other => other.language === entry.language);
  const position = sameLanguage.indexOf(entry);
  if (position < 0 || sameLanguage.length < 2) return [];
  const rotated = [...sameLanguage.slice(position + 1), ...sameLanguage.slice(0, position)];
  return rotated.slice(0, 3);
}

function addArticlePages() {
  const orgTranslations = entry => catalog.entries
    .filter(other => entry.host === 'bukiski-hram.org' && other.host === entry.host && other.ownsTarget
      && other.sourcePath.split('/').at(-1) === entry.sourcePath.split('/').at(-1))
    .map(other => ({ lang: other.language, path: other.target }));

  for (const entry of catalog.entries) {
    const uiLocale = site.locales[entry.language] ? entry.language : 'en';
    const t = site.locales[uiLocale];
    const common = {
      lang: entry.language,
      uiLocale,
      title: entry.title,
      description: entry.page.description || entry.description,
      article: true,
      extraDialogs: lightboxDialog(t, uiLocale)
    };
    if (entry.ownsTarget) {
      addRoute({
        ...common,
        body: articlePage(site, catalog, entry, t, uiLocale, { related: relatedArticles(entry, uiLocale) }),
        path: entry.target,
        alternates: orgTranslations(entry)
      });
    } else {
      // The old wording of a section that now has a rewritten page.
      addRoute({
        ...common,
        body: articlePage(site, catalog, entry, t, uiLocale, { archiveOnly: true }),
        path: entry.archive,
        noindex: true
      });
    }
  }

  // Static hosts cannot send HTTP redirects, so old .net paths are also served as
  // copies with the correct canonical. On Apache, .htaccess answers them with 301.
  for (const redirect of catalog.redirects) {
    if (redirect.from === '/' || routes.has(redirect.from)) continue;
    addAlias(redirect.from, redirect.to);
  }
}

function addNotFoundPage() {
  const t = site.locales.ru;
  addRoute({
    lang: 'ru',
    pageId: 'not-found',
    title: `404 · ${t.notFound}`,
    description: t.notFoundText,
    body: notFoundPage(site, t),
    path: '/404.html',
    noindex: true
  });
}

function outputPathOf(routePath) {
  if (routePath.endsWith('/')) return `.${routePath}index.html`;
  return routePath.endsWith('.html') ? `.${routePath}` : `.${routePath}/index.html`;
}

// --- Build -----------------------------------------------------------------

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await copyAssets();

const stylesheet = await buildStylesheet();
site.assetVersion = await assetVersion(stylesheet);
await writeOutput('assets/css/site.css', stylesheet);
await versionScripts(site.assetVersion);

addCorePages();
const documentFiles = await addDocumentPages();
addArticlePages();
addNotFoundPage();
for (const [path, route] of routes) await writeOutput(outputPathOf(path), route.html);

await writeOutput('data/services.json', JSON.stringify(site.rawSchedule));
await writeOutput('assets/data/search-index.json', JSON.stringify(outputs.searchIndex(catalog)));
await writeOutput('sitemap.xml', outputs.sitemap(site, routes));
await writeOutput('robots.txt', outputs.robots(site));
await writeOutput('.nojekyll', '');
await writeOutput('_headers', outputs.headersFile(site));
await writeOutput('_redirects', outputs.redirectsFile(site, catalog.redirects));
await writeOutput('.htaccess', outputs.htaccess(site, catalog.redirects));
await writeOutput('assets/parish.vcf', outputs.contactCard(site));
for (const lang of site.languages) await writeOutput(`assets/schedule-${lang}.ics`, outputs.scheduleCalendar(site, lang));

// Files kept in the repository for review. They depend only on committed
// content, never on the environment of a particular build.
await writeFile(resolve(ROOT, 'deploy/old-domain.htaccess'), outputs.oldDomainHtaccess(site, catalog.redirects));
await writeFile(resolve(ROOT, 'content/migration.csv'), outputs.migrationCSV(catalog.inventory));
await writeFile(resolve(ROOT, 'content/migration.json'), `${JSON.stringify(catalog.inventory, null, 2)}\n`);

await writeOutput('build-info.json', JSON.stringify({
  generatedAt: new Date(site.buildTime).toISOString(),
  production: site.production,
  basePath: site.base,
  documentDelivery: site.documentDelivery,
  assetVersion: site.assetVersion,
  sourcePages: site.pages.length,
  generatedPages: routes.size,
  documents: documentFiles.length,
  confirmedServices: site.schedule.events.length,
  sourceUpdatedAt: site.schedule.sourceUpdatedAt
}, null, 2));

console.log(`Built ${routes.size} pages from ${site.pages.length} source records, ${site.schedule.events.length} calendar services. Production indexing: ${site.production}. Documents: ${site.documentDelivery}.`);
