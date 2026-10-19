// Public, versioned data contract for the parish application.
//
// Keep this output deliberately small and allow-list every field. In
// particular, never spread settings or calendar records into the response:
// they also contain operational endpoints and source metadata that are not
// part of the public application contract.

import { isStale } from '../../assets/js/domain.js';

const SCHEMA_VERSION = 1;
const MAX_SERVICES = 12;

const localized = (languages, value) => Object.fromEntries(
  languages.map(lang => [lang, String(value?.[lang] ?? '')])
);

const localizedRoutes = site => Object.fromEntries(site.languages.map(lang => [lang, {
  home: site.productionOrigin + site.route(lang, 'home'),
  schedule: site.productionOrigin + site.route(lang, 'schedule'),
  notes: site.productionOrigin + site.route(lang, 'notes'),
  contacts: site.productionOrigin + site.route(lang, 'contacts')
}]));

const serviceItem = (site, event) => {
  const item = {
    id: event.id,
    start: event.start,
    type: 'service',
    title: localized(site.languages, event.title),
    detailsUrl: Object.fromEntries(site.languages.map(lang => [
      lang,
      site.productionOrigin + site.route(lang, 'schedule')
    ]))
  };

  if (event.subtitle && Object.values(event.subtitle).some(Boolean)) {
    item.summary = localized(site.languages, event.subtitle);
  }
  if (event.note && Object.values(event.note).some(Boolean)) {
    item.note = localized(site.languages, event.note);
  }
  return item;
};

export function appBootstrap(site) {
  const services = site.schedule.events
    .filter(event => Date.parse(event.start) >= site.buildTime)
    .slice(0, MAX_SERVICES)
    .map(event => serviceItem(site, event));

  return {
    schemaVersion: SCHEMA_VERSION,
    siteUrl: site.productionOrigin,
    timezone: site.settings.timezone,
    supportedLocales: [...site.languages],
    parish: {
      name: Object.fromEntries(site.languages.map(lang => [lang, site.locales[lang].name])),
      address: site.settings.address,
      phone: {
        display: site.settings.phoneDisplay,
        href: `tel:${site.settings.phone}`
      },
      coordinates: {
        latitude: site.settings.latitude,
        longitude: site.settings.longitude
      },
      rector: {
        name: localized(site.languages, site.settings.rector.name)
      }
    },
    routes: localizedRoutes(site),
    schedule: {
      sourceUpdatedAt: site.schedule.sourceUpdatedAt,
      maxAgeHours: site.settings.scheduleMaxAgeHours,
      stale: isStale(site.schedule, site.buildTime, site.settings.scheduleMaxAgeHours),
      items: services
    }
  };
}
