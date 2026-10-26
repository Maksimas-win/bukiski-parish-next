import { $$, show } from './dom.js?v=a9793508ec';
import { toast } from './toast.js?v=a9793508ec';

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
