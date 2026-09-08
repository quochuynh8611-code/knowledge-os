/**
 * Clipboard utility for safe text copying.
 *
 * Primary:  navigator.clipboard.writeText (async, requires secure context)
 * Fallback: document.execCommand('copy') via temporary textarea
 *           (legacy, works in older browsers / non-HTTPS environments)
 *
 * Never throws. Returns true on success, false on any failure.
 * Textarea is always removed via `finally`, even if focus/select/execCommand throws.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // Guard: only accept string; null/undefined returns false
  if (typeof text !== 'string') return false;

  // Primary path: Clipboard API (requires secure context / HTTPS)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard != null &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context — fall through to execCommand
    }
  }

  // Fallback path: execCommand via temporary offscreen textarea.
  // textarea is declared outside try so finally can always remove it.
  if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      // Prevent layout shift, scroll jump, and visual flicker
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.opacity = '0';
      textarea.setAttribute('aria-hidden', 'true');
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      return Boolean(document.execCommand('copy'));
    } catch {
      return false;
    } finally {
      // Always remove textarea — even if focus(), select(), or execCommand() threw
      textarea?.remove();
    }
  }

  return false;
}
