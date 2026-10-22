// Cards marked data-tilt follow the pointer: a few degrees of rotation and a
// glare spot, written as custom properties that the stylesheet turns into a
// transform. Only on hover-capable, fine-pointer devices, and never when the
// visitor prefers reduced motion. Touch devices keep the flat card.
const MAX_DEGREES = 6;

export function initTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const card of document.querySelectorAll('[data-tilt]')) {
    let frame = 0;
    card.addEventListener('pointermove', event => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        card.style.setProperty('--tilt-y', `${((x - 0.5) * 2 * MAX_DEGREES).toFixed(2)}deg`);
        card.style.setProperty('--tilt-x', `${((0.5 - y) * 2 * MAX_DEGREES).toFixed(2)}deg`);
        card.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--glare', '1');
      });
    });
    card.addEventListener('pointerleave', () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--glare', '0');
    });
  }
}
