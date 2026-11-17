/**
 * Copies text to the clipboard. The Clipboard API only exists on secure origins and can refuse
 * an unfocused document, so the old selection command is the fallback. Resolves false when neither worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection command.
  }
  const hadFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  field.remove();
  hadFocus?.focus({ preventScroll: true });
  return copied;
}
