import { $, show } from './dom.js';

/** Mobile menu as a disclosure. Without JavaScript the links stay visible. */
export function initMenu() {
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  if (!toggle || !menu) return;
  show(toggle);

  const setOpen = open => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  const isOpen = () => menu.classList.contains('is-open');

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });
  document.addEventListener('click', event => {
    if (isOpen() && !event.target.closest('[data-header]')) setOpen(false);
  });
}
