import { MAX_NAMES, MAX_NAME_LENGTH } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { pageHead, siteLink } from '../components.mjs';

/**
 * Prayer request. Names stay in the visitor's tab until they press «Отправить»;
 * only then are they sent to the parish through the form service configured in
 * settings.notes (the same Formspree form the old bukiski-hram.net used).
 * Printing, downloading and copying work without sending anything.
 */
export function notesPage(site, lang, t) {
  const { notes } = site.settings;
  const labels = attrs({
    'data-notes-endpoint': notes.endpoint,
    'data-notes-subject': notes.subject,
    'data-label-sending': t.noteSending,
    'data-label-sent': t.noteSent,
    'data-label-send-error': t.noteSendError,
    'data-label-consent-required': t.noteConsentRequired,
    'data-notes': true,
    'data-label-living': t.living,
    'data-label-departed': t.departed,
    'data-label-count': t.noteCount,
    'data-label-line-error': t.noteLineError,
    'data-label-too-many': t.noteTooMany,
    'data-label-ready': t.noteReady,
    'data-label-cleared': t.noteCleared,
    'data-label-copied': t.copied,
    'data-parish-name': t.name
  });
  // Room for the longest allowed names plus line breaks.
  const maxLength = MAX_NAMES * (MAX_NAME_LENGTH + 1);

  return html`${pageHead({ title: t.notes, intro: t.noteIntro, site, page: 'notes', t })}
  <section class="shell notes"${labels}>
    <form class="notes__form" id="prayer-form" autocomplete="off">
      <p class="notes__local">${t.noteLocal}</p>
      <fieldset class="segmented">
        <legend>${t.noteType}</legend>
        <div class="segmented__options">
          <label><input type="radio" name="request-type" value="living" checked><span>${t.living}</span></label>
          <label><input type="radio" name="request-type" value="departed"><span>${t.departed}</span></label>
        </div>
      </fieldset>
      <div class="field">
        <label for="prayer-names">${t.names}</label>
        <p class="hint" id="names-hint">${t.namesHint}</p>
        <textarea id="prayer-names" rows="8" maxlength="${maxLength}" aria-describedby="names-hint names-count names-errors" spellcheck="false" autocomplete="off" autocapitalize="words"></textarea>
        <p class="field__meta"><span id="names-count" data-names-count></span></p>
        <ul class="field__errors" id="names-errors" data-names-errors aria-live="polite"></ul>
      </div>
      <div class="field">
        <label for="note-sender">${t.noteSender}</label>
        <input id="note-sender" name="sender" type="text" maxlength="80" autocomplete="name" placeholder="${t.noteSenderPlaceholder}">
      </div>
      <div class="field">
        <label for="note-email">${t.noteEmail}</label>
        <input id="note-email" name="email" type="email" maxlength="120" autocomplete="email" inputmode="email" placeholder="name@example.com">
      </div>
      <div class="field">
        <label for="note-comment">${t.noteComment}</label>
        <textarea id="note-comment" name="comment" rows="3" maxlength="500" placeholder="${t.noteCommentPlaceholder}"></textarea>
      </div>
      <div class="visually-hidden" aria-hidden="true"><label for="note-website">Website</label><input id="note-website" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>
      <label class="toggle consent"><input type="checkbox" name="consent" data-note-consent><span>${t.noteConsent}</span></label>
      <div class="notes__send" data-notes-online hidden>
        <button type="submit" class="button button--large" data-note-send disabled>${icon('send')}${t.noteSend}</button>
        <p class="hint">${t.noteDonation} ${siteLink(site, site.route(lang, 'support'), t.supportAction)}</p>
      </div>
      <p class="notice" data-notes-unavailable>${t.noteNoJs}</p>
      <p class="notice notes__result-message" data-note-message role="status" aria-live="polite" hidden></p>
      <p class="visually-hidden" role="status" aria-live="polite" data-notes-status></p>
    </form>
    <div class="notes__result" data-notes-result hidden>
      <h2 class="notes__preview-title">${t.notePreview}</h2>
      <div class="note-sheet" data-note-sheet>
        <img class="note-sheet__cross" src="${site.url('/assets/img/cross.svg')}?v=${site.assetVersion}" width="24" height="36" alt="" aria-hidden="true">
        <p class="note-sheet__type" data-note-heading></p>
        <ol class="note-sheet__names" data-note-names></ol>
        <p class="note-sheet__empty" data-note-empty>${t.notePreviewEmpty}</p>
        <p class="note-sheet__parish">${t.name}</p>
      </div>
      <div class="actions">
        <button type="button" class="button" data-note-print disabled>${icon('print')}${t.notePrint}</button>
        <button type="button" class="button button--quiet" data-note-download disabled>${icon('download')}${t.noteDownload}</button>
        <button type="button" class="button button--quiet" data-note-copy disabled>${icon('copy')}${t.noteCopy}</button>
        <button type="button" class="button button--quiet" data-note-clear>${t.noteClear}</button>
      </div>
      <p class="hint">${t.noteNotSent}</p>
    </div>
  </section>`;
}
