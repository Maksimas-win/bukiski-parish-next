// Prayer request. Names stay in this tab's memory until the visitor presses
// «Отправить» and has ticked consent; only then are they posted to the parish's
// form service (data-notes-endpoint). They are never stored in the browser,
// logged or placed in a URL, and they are erased when the page is left.

import { MAX_NAMES, MAX_NAME_LENGTH, validateNames } from '../domain.js?v=f5b7f19f07';
import { $, $$, show, create, fill, downloadText } from '../ui/dom.js?v=f5b7f19f07';
import { toast } from '../ui/toast.js?v=f5b7f19f07';

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
  const sendButton = $('[data-note-send]', root);
  const consent = $('[data-note-consent]', root);
  const message = $('[data-note-message]', root);
  const endpoint = labels.notesEndpoint;
  let note = null;
  let sending = false;

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
    if (sendButton) sendButton.disabled = !valid || sending;
    if (valid && !wasReady) status.textContent = labels.labelReady;
    if (!valid) status.textContent = '';
  }

  const erase = () => {
    form.reset();
    textarea.value = '';
    update();
    document.body.classList.remove('is-printing-note');
  };

  const say = (text, kind) => {
    message.textContent = text;
    message.classList.toggle('notice--warning', kind === 'error');
    message.classList.toggle('notice--success', kind === 'success');
    show(message, Boolean(text));
  };

  /** Field names match the form of the old bukiski-hram.net, so mail to the parish looks the same. */
  function payload() {
    const field = name => form.elements[name].value.trim();
    const data = {
      _subject: labels.notesSubject,
      Тип: note.title,
      Страница: `${location.origin}${location.pathname}`,
      Отправитель: field('sender'),
      'E-mail': field('email'),
      'Имена (построчно)': note.names.join('\n'),
      Пояснение: field('comment'),
      _gotcha: field('_gotcha')
    };
    if (data['E-mail']) data._replyto = data['E-mail'];
    return data;
  }

  async function send() {
    if (!note || sending) return;
    if (!consent.checked) {
      say(labels.labelConsentRequired, 'error');
      consent.focus();
      return;
    }
    if (!form.elements.email.checkValidity()) {
      form.elements.email.reportValidity();
      return;
    }
    sending = true;
    sendButton.disabled = true;
    sendButton.setAttribute('aria-busy', 'true');
    say(labels.labelSending);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`Form service answered ${response.status}`);
      sending = false;
      erase();
      say(labels.labelSent, 'success');
      toast(labels.labelSent);
    } catch {
      sending = false;
      say(labels.labelSendError, 'error');
    } finally {
      sendButton.removeAttribute('aria-busy');
      update();
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    send();
  });
  consent?.addEventListener('change', () => {
    if (consent.checked && message.classList.contains('notice--warning')) say('');
  });
  textarea.addEventListener('input', () => {
    if (message.classList.contains('notice--success')) say('');
    update();
  });
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
    say('');
    toast(labels.labelCleared);
    textarea.focus();
  });

  // Leaving the page, or returning to it from the back/forward cache, clears the names.
  window.addEventListener('pagehide', erase);
  window.addEventListener('pageshow', event => {
    if (event.persisted) erase();
  });

  show($('[data-notes-unavailable]', root), false);
  show($('[data-notes-online]', root), /^https:\/\//.test(endpoint || ''));
  show($('[data-notes-result]', root));
  update();
}
