import { MAX_NAMES, MAX_NAME_LENGTH } from '../../../assets/js/domain.js';
import { html, attrs } from '../html.mjs';
import { icon } from '../icons.mjs';
import { pageHead } from '../components.mjs';

/**
 * Prayer-request sheet prepared entirely in the visitor's browser tab.
 * There is deliberately no submit target: names never leave the device.
 */
export function notesPage(site, lang, t) {
  const labels = attrs({
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

  return html`${pageHead({ title: t.notes, intro: t.noteIntro })}
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
      <p class="notice" data-notes-unavailable>${t.noteNoJs}</p>
      <p class="visually-hidden" role="status" aria-live="polite" data-notes-status></p>
    </form>
    <div class="notes__result" data-notes-result hidden>
      <h2 class="notes__preview-title">${t.notePreview}</h2>
      <div class="note-sheet" data-note-sheet>
        <span class="note-sheet__cross" aria-hidden="true">☦</span>
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
