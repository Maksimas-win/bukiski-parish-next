import { $$, show } from './dom.js?v=b48742dbc0';
import { toast } from './toast.js?v=b48742dbc0';

/** Enables every [data-copy] button when the browser can write to the clipboard. */
export function initCopyButtons() {
  if (!navigator.clipboard?.writeText) return;
  const { labelCopied, labelCopyFailed } = document.body.dataset;
  for (const button of $$('[data-copy]')) {
    show(button);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        toast(labelCopied);
      } catch {
        toast(labelCopyFailed);
      }
    });
  }
}
