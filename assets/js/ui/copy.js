import { $$, show } from './dom.js?v=70f5a1cba2';
import { toast } from './toast.js?v=70f5a1cba2';

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
