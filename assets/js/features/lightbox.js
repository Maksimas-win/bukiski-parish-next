// Full-screen viewer for article photographs, built on the native <dialog>.
// Without it the links simply open the image file.

import { $, $$ } from '../ui/dom.js?v=b48742dbc0';

export function init() {
  const dialog = $('#lightbox');
  const links = $$('[data-lightbox]');
  if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

  const image = $('[data-lightbox-image]', dialog);
  const previous = $('[data-lightbox-previous]', dialog);
  const next = $('[data-lightbox-next]', dialog);
  let index = 0;

  function display(position) {
    index = (position + links.length) % links.length;
    const link = links[index];
    image.src = link.href;
    image.width = Number(link.dataset.width);
    image.height = Number(link.dataset.height);
    image.alt = $('img', link)?.alt || '';
  }

  links.forEach((link, position) => {
    link.addEventListener('click', event => {
      // Leave modified clicks alone so the image can still open in a new tab.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      display(position);
      dialog.showModal();
    });
  });

  previous.hidden = next.hidden = links.length < 2;
  previous.addEventListener('click', () => display(index - 1));
  next.addEventListener('click', () => display(index + 1));
  $('[data-dialog-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (links.length < 2) return;
    if (event.key === 'ArrowLeft') display(index - 1);
    if (event.key === 'ArrowRight') display(index + 1);
  });
  dialog.addEventListener('close', () => image.removeAttribute('src'));
}
