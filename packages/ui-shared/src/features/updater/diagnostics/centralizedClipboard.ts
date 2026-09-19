import { isNative, AppInstaller } from '@workspace/livex-core';

export async function copyToClipboard(text: string, label: string = 'Content'): Promise<string> {
  const maxLen = 400000;
  let textToCopy = text;
  let wasTruncated = false;

  if (text.length > maxLen) {
    textToCopy =
      `[WARNING: Report truncated to the last 400,000 characters due to Android clipboard size limits]\n\n...[TRUNCATED]...\n\n` +
      text.substring(text.length - maxLen);
    wasTruncated = true;
  }

  // 1. Try Android Native Custom Plugin if on native platform
  if (isNative() && typeof AppInstaller?.copyToClipboard === 'function') {
    try {
      await AppInstaller.copyToClipboard({ text: textToCopy });
      return wasTruncated
        ? `${label} copied (truncated to 400k characters)`
        : `${label} copied to clipboard!`;
    } catch (err) {
    }
  }

  // 3. Try standard Web Clipboard API
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(textToCopy);
      return wasTruncated
        ? `${label} copied (truncated to 400k characters)`
        : `${label} copied to clipboard!`;
    } catch (err) {
    }
  }

  // 4. Try document.execCommand fallback
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return wasTruncated
          ? `${label} copied (truncated to 400k characters)`
          : `${label} copied to clipboard!`;
      }
    } catch (err) {
      console.error('[Clipboard] document.execCommand fallback failed:', err);
    }
  }

  throw new Error('Clipboard copy operations are not supported on this platform/browser.');
}
