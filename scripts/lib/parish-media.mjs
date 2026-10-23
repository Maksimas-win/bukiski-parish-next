// Parish-supplied illustrations are separate from the preserved article text.
import { html, attrs } from './html.mjs';
import { icon } from './icons.mjs';

const FAMILY = '/assets/img/parish/bozheryanov-family.jpg';
const CERTIFICATE = '/assets/img/parish/parish-registration-2007.jpg';

const LABELS = {
  ru: ['Семья Божерьяновых. Историческая фотография.', 'Документы и реквизиты прихода', 'Дата выдачи свидетельства', 'Регистрационное свидетельство прихода'],
  lt: ['Božerjanovų šeima. Istorinė nuotrauka.', 'Parapijos dokumentai ir rekvizitai', 'Pažymėjimo išdavimo data', 'Parapijos registravimo pažymėjimas'],
  en: ['The Bozheryanov family. Historical photograph.', 'Parish documents and details', 'Certificate issue date', 'Parish registration certificate'],
  pl: ['Rodzina Bożerianowów. Fotografia historyczna.', 'Dokumenty i dane parafii', 'Data wydania zaświadczenia', 'Zaświadczenie o rejestracji parafii'],
  de: ['Die Familie Boscherjanow. Historische Fotografie.', 'Dokumente und Angaben zur Gemeinde', 'Ausstellungsdatum der Urkunde', 'Registrierungsurkunde der Gemeinde'],
  uk: ["Сім’я Божер’янових. Історична фотографія.", 'Документи та реквізити парафії', 'Дата видачі свідоцтва', 'Свідоцтво про реєстрацію парафії']
};

export function familyPhotograph(site, lang, t) {
  const caption = LABELS[lang][0];
  return html`<figure class="parish-family">
    <a${attrs({ href: site.url(FAMILY), 'data-lightbox': true, 'data-width': 1536, 'data-height': 1047, 'aria-label': `${t.imageOpen}: ${caption}` })}>
      <img${attrs({ src: site.url(FAMILY), width: 1536, height: 1047, loading: 'lazy', decoding: 'async', alt: caption })}>
    </a>
    <figcaption>${caption}</figcaption>
  </figure>`;
}

export function registrationCard(site, lang, t) {
  const [, title, issued, open] = LABELS[lang];
  // This is the date of issue printed on the certificate, not an inferred
  // registration date or the founding date of the church.
  const date = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'Europe/Vilnius' }).format(new Date('2007-08-13T12:00:00Z'));
  return html`<section class="shell parish-registration" aria-labelledby="parish-registration-title">
    <div class="card parish-registration__card">
      <div>
        <h2 id="parish-registration-title">${title}</h2>
        <dl class="facts">
          <div><dt>${t.recipient}</dt><dd lang="lt">${site.settings.legalName}</dd></div>
          <div><dt>${t.orgCode}</dt><dd>${site.settings.organizationCode}</dd></div>
          <div><dt>${issued}</dt><dd><time datetime="2007-08-13">${date}</time></dd></div>
        </dl>
      </div>
      <div class="parish-registration__document">
        <a${attrs({ class: 'parish-registration__preview', href: site.url(CERTIFICATE), 'data-lightbox': true, 'data-width': 1077, 'data-height': 1536, 'aria-label': `${t.imageOpen}: ${open}` })}>
          <img${attrs({ src: site.url(CERTIFICATE), width: 1077, height: 1536, loading: 'lazy', decoding: 'async', alt: open, lang: 'lt' })}>
        </a>
        <a class="with-icon" href="${site.url(CERTIFICATE)}" download="parapijos-registravimo-pazymejimas-2007.jpg">${icon('download')}${open} (JPG)</a>
      </div>
    </div>
  </section>`;
}
