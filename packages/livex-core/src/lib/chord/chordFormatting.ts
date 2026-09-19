import { getChordByName, normalizeChordName } from '../../data/chords';

// Clean a chord name to look up in the library
export function cleanChordLookupName(name: string): string {
  return normalizeChordName(name);
}

// Clean a chord name to look up in the library
// Validate that a chord name exists in the Chordex chord database
export function validateChord(chordName: string): boolean {
  const clean = cleanChordLookupName(chordName);
  if (!clean) return false;
  try {
    let found = getChordByName(clean);
    if (found) return true;

    // Fallback for slash chords: validate base chord
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) {
      const basePart = clean.substring(0, slashIdx).trim();
      found = getChordByName(basePart);
      return !!found;
    }
  } catch (_) {}
  return false;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let decoded = str
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(Number(dec)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  // Decode &amp; last to prevent double-escaping of entities
  decoded = decoded.replace(/&amp;/g, '&');
  return decoded;
}

export function stripHtmlTags(str: string): string {
  if (!str) return '';
  let result = '';
  let insideTag = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '<') {
      insideTag = true;
    } else if (char === '>') {
      insideTag = false;
    } else if (!insideTag) {
      result += char;
    }
  }
  return result;
}

export function cleanHtmlToPlainText(html: string): string {
  if (!html) return '';
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n');

  const startIdx = text.toLowerCase().indexOf('<pre>');
  if (startIdx !== -1) {
    const endIdx = text.toLowerCase().indexOf('</pre>', startIdx);
    if (endIdx !== -1) {
      text = text.substring(startIdx + 5, endIdx);
    }
  }

  text = stripHtmlTags(text);
  return decodeHtmlEntities(text);
}
