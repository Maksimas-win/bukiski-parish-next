const TOPICS = ['question', 'baptism', 'wedding', 'meeting', 'memorial', 'other'];
export function mountRequestForm({ container, t, node, button, api, done }) {
  let disposed = false;
  let pending = false;
  let submission;
  const form = node('form', 'pa-request-form');
  const field = (text, control) => {
    const label = node('label', 'pa-field'); label.append(node('span', '', text), control); form.append(label);
    return control;
  };
  const topic = field(t.topic, node('select', 'pa-input'));
  TOPICS.forEach((value, i) => { const option = node('option', '', t.topics[i]); option.value = value; topic.append(option); });
  const message = field(t.message, node('textarea', 'pa-input'));
  message.required = true; message.minLength = 5; message.maxLength = 1000; message.rows = 5;
  message.autocomplete = 'off';
  const contact = field(t.contact, node('input', 'pa-input'));
  contact.type = 'text'; contact.required = true; contact.maxLength = 150; contact.autocomplete = 'off';
  const trapLabel = node('label', 'pa-honeypot', 'Website');
  trapLabel.setAttribute('aria-hidden', 'true');
  const trap = node('input'); trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
  trapLabel.append(trap); form.append(trapLabel);
  form.append(node('p', 'pa-text', t.notice), node('p', 'pa-meta', t.privacy));
  const review = node('button', 'pa-send', t.review); review.type = 'submit'; form.append(review);
  const status = node('p', 'pa-status'); status.setAttribute('role', 'status');
  const preview = node('section', 'pa-request-preview'); preview.hidden = true;
  const back = button('pa-clear', t.cancel); back.addEventListener('click', () => { if (!pending) {done();} });
  container.append(form, preview, status, back);
  // Only a random session is opened while the form is being filled. Draft fields stay in the tab.
  api.ready().catch(() => {});
  function editable() {
    preview.hidden = true; form.hidden = false; preview.replaceChildren(); submission = undefined;
    status.textContent = ''; message.focus();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (pending) {return;}
    const text = message.value.trim(); const address = contact.value.trim();
    const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || (/^\+?[0-9 ()-]{7,24}$/.test(address) && address.replace(/\D/g, '').length >= 7);
    if (text.length < 5 || text.length > 1000 || !validContact || trap.value) {status.textContent = t.invalid; return;}
    submission = { action: 'request', id: globalThis.crypto.randomUUID(), topic: topic.value, message: text, contact: address, consent: true, website: trap.value };
    form.hidden = true; preview.hidden = false; status.textContent = '';
    const heading = node('h3', 'pa-text', t.review); heading.tabIndex = -1;
    const consentLabel = node('label', 'pa-consent'); const consent = node('input'); consent.type = 'checkbox';
    consentLabel.append(consent, node('span', '', t.confirm));
    const send = button('pa-send', t.send); send.disabled = true;
    const edit = button('pa-clear', t.edit); edit.addEventListener('click', editable);
    consent.addEventListener('change', () => { send.disabled = !consent.checked; });
    preview.replaceChildren(heading, node('p', 'pa-text', t.topics[TOPICS.indexOf(topic.value)]), node('p', 'pa-text pa-preserve', text), node('p', 'pa-text', address), node('p', 'pa-meta', t.notice), consentLabel, send, edit);
    send.addEventListener('click', async () => {
      if (pending || !consent.checked) {return;}
      pending = true; send.disabled = true; edit.disabled = true; consent.disabled = true; back.disabled = true;
      status.textContent = t.sending;
      try {
        const result = await api.call(submission);
        if (disposed) {return;}
        if (!/^W-[A-F0-9]{12}$/.test(result.ticket) || !['sent','unknown'].includes(result.delivery)) {throw new Error('network');}
        message.value = ''; contact.value = ''; submission = undefined;
        form.remove(); preview.replaceChildren(node('p', 'pa-text', (result.delivery === 'sent' ? t.success : t.unknown) + result.ticket), node('p', 'pa-text', result.delivery === 'sent' ? t.after : '+370 636 93506'));
        status.textContent = '';
      } catch (error) {
        if (!disposed) {status.textContent = ['limited', 'wait', 'session', 'invalid', 'consent', 'changed'].includes(error.message) ? t.error : t.network; send.disabled = false;}
      } finally { pending = false; edit.disabled = false; consent.disabled = false; back.disabled = false; }
    });
    heading.focus();
  });
  topic.focus();
  return () => { disposed = true; message.value = ''; contact.value = ''; submission = undefined; container.replaceChildren(); };
}

