// Schema.org JSON-LD built only from facts the parish has confirmed in
// content/settings.json and the page itself. Nothing is inferred: no opening
// hours, ratings, events or authors appear unless the data says so.

const escapeJSON = value => JSON.stringify(value, null, 0).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** The parish church as an organisation, shared by every page that mentions it. */
export function churchNode(site, t, uiLocale) {
  const { settings } = site;
  const { addressParts } = settings;
  return {
    '@type': 'Church',
    '@id': `${site.productionOrigin}/#church`,
    name: t.name,
    legalName: settings.legalName,
    url: site.canonical(site.route(uiLocale, 'home')),
    telephone: settings.phone,
    image: site.canonical('/assets/img/og-image.jpg'),
    logo: site.canonical('/assets/img/logo-256.webp'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: addressParts.street,
      addressLocality: addressParts.locality,
      addressRegion: addressParts.district,
      postalCode: addressParts.postalCode,
      addressCountry: 'LT'
    },
    geo: { '@type': 'GeoCoordinates', latitude: settings.latitude, longitude: settings.longitude },
    sameAs: settings.social.map(item => item.url)
  };
}

function breadcrumbs(site, t, uiLocale, trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: t.home, path: site.route(uiLocale, 'home') }, ...trail].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: site.canonical(item.path)
    }))
  };
}

/**
 * JSON-LD for a page. `page.trail` lists the breadcrumb entries after Home;
 * articles pass their publication date when the source recorded one.
 */
export function structuredData(site, t, uiLocale, page) {
  const church = churchNode(site, t, uiLocale);
  const graph = [];
  if (page.pageId === 'home') {
    graph.push(church, {
      '@type': 'WebSite',
      url: site.canonical(site.route(uiLocale, 'home')),
      name: t.name,
      inLanguage: uiLocale,
      publisher: { '@id': church['@id'] }
    });
  } else if (page.pageId === 'contacts') {
    graph.push(church, breadcrumbs(site, t, uiLocale, page.trail || []));
  } else if (page.trail) {
    graph.push({ '@id': church['@id'], '@type': 'Church', name: t.name, url: church.url }, breadcrumbs(site, t, uiLocale, page.trail));
    if (page.article) {
      graph.push({
        '@type': 'Article',
        headline: page.title,
        inLanguage: page.lang,
        url: site.canonical(page.canonicalPath || page.path),
        ...(page.publishedAt ? { datePublished: page.publishedAt } : {}),
        publisher: { '@id': church['@id'] },
        mainEntityOfPage: site.canonical(page.canonicalPath || page.path)
      });
    }
  } else {
    return '';
  }
  return `<script type="application/ld+json">${escapeJSON({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}
