// Prayer-request sheet. Names stay in this tab's memory only: they are never
// stored, sent, logged or placed in a URL, and they are erased when the page
// is left.

import { MAX_NAMES, MAX_NAME_LENGTH, validateNames } from '../domain.js';
import { $, $$, show, create, fill, downloadText } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

export function init() {
  const root = $('[data-notes]');
  const form = $('#prayer-form');
  if (!root || !form) return;

  const labels = root.dataset;
  const textarea = $('#prayer-names');
  const types = $$('[name="request-type"]', form);
  const count = $('[data-names-count]', root);
  const errorList = $('[data-names-errors]', root);
  const status = $('[data-notes-status]', root);
  const heading = $('[data-note-heading]', root);
  const nameList = $('[data-note-names]', root);
  const placeholder = $('[data-note-empty]', root);
  const actions = ['print', 'download', 'copy'].map(name => $(`[data-note-${name}]`, root));
  let note = null;

  const typeLabel = () => (types.find(input => input.checked).value === 'departed' ? labels.labelDeparted : labels.labelLiving);
  const noteText = () => `${note.title}\n\n${note.names.join('\n')}\n\n${labels.parishName}`;

  function update() {
    const { names, errors, tooMany } = validateNames(textarea.value);
    const valid = names.length > 0 && errors.length === 0 && !tooMany;
    const wasReady = note !== null;
    note = valid ? { title: typeLabel(), names } : null;

    count.textContent = fill(labels.labelCount, { n: names.length + errors.length, max: MAX_NAMES });
    errorList.replaceChildren(
      ...errors.map(error => create('li', { text: fill(labels.labelLineError, { n: error.line, max: MAX_NAME_LENGTH }) })),
      ...(tooMany ? [create('li', { text: fill(labels.labelTooMany, { max: MAX_NAMES }) })] : [])
    );
    if (errors.length || tooMany) textarea.setAttribute('aria-invalid', 'true');
    else textarea.removeAttribute('aria-invalid');

    heading.textContent = typeLabel();
    nameList.replaceChildren(...names.slice(0, MAX_NAMES).map(name => create('li', { text: name })));
    show(placeholder, names.length === 0);
    for (const button of actions) button.disabled = !valid;
    if (valid && !wasReady) status.textContent = labels.labelReady;
    if (!valid) status.textContent = '';
  }

  const erase = () => {
    form.reset();
    textarea.value = '';
    update();
    document.body.classList.remove('is-printing-note');
  };

  form.addEventListener('submit', event => event.preventDefault());
  textarea.addEventListener('input', update);
  for (const input of types) input.addEventListener('change', update);

  $('[data-note-print]', root).addEventListener('click', () => {
    if (!note) return;
    document.body.classList.add('is-printing-note');
    window.print();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('is-printing-note'));

  $('[data-note-download]', root).addEventListener('click', () => {
    if (note) downloadText('prayer-request.txt', `﻿${noteText()}`, 'text/plain;charset=utf-8');
  });

  const copyButton = $('[data-note-copy]', root);
  show(copyButton, Boolean(navigator.clipboard?.writeText));
  copyButton.addEventListener('click', async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(noteText());
      toast(labels.labelCopied);
    } catch {
      toast(document.body.dataset.labelCopyFailed);
    }
  });

  $('[data-note-clear]', root).addEventListener('click', () => {
    erase();
    toast(labels.labelCleared);
    textarea.focus();
  });

  // Leaving the page, or returning to it from the back/forward cache, clears the names.
  window.addEventListener('pagehide', erase);
  window.addEventListener('pageshow', event => {
    if (event.persisted) erase();
  });

  show($('[data-notes-unavailable]', root), false);
  show($('[data-notes-result]', root));
  update();
}
