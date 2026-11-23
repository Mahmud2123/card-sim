// src/lib/mask.ts

const CONFUSABLE_MAP: Record<string, string[]> = {
  'O': ['0', 'Q'], '0': ['O', 'Q'], 'Q': ['O', '0'], '1': ['I', 'L'], 'I': ['1', '2'],
  '2': ['I', 'Z'], 'L': ['1', 'I'], '3': ['5', 'B'], '5': ['S', '3'], 'S': ['5', '3'],
  'Z': ['2', 'S'], 'B': ['8', '3'], '8': ['B', '3'], 'G': ['6', 'C'], '6': ['G', 'B'],
  'T': ['7', 'I'], '7': ['T', '1'], 'A': ['4', 'R'], '4': ['A', '9'], '9': ['4', 'G'],
  'C': ['G', 'O'], 'D': ['0', 'O'], 'E': ['F', '3'], 'F': ['E', '7'], 'H': ['N', 'M'],
  'J': ['I', 'L'], 'K': ['X', 'R'], 'M': ['N', 'W'], 'N': ['M', 'H'], 'P': ['R', 'D'],
  'R': ['P', 'A'], 'U': ['V', '0'], 'V': ['U', 'Y'], 'W': ['M', 'V'], 'X': ['K', 'Y'],
  'Y': ['V', 'X'],
};

function stableHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function isDigit(ch: string) { return ch >= '0' && ch <= '9'; }
function isLetter(ch: string) { return /[A-Za-z]/.test(ch); }

function matchCase(original: string, replacement: string) {
  if (!isLetter(original)) return replacement;
  if (original === original.toUpperCase() && isLetter(replacement)) return replacement.toUpperCase();
  if (original === original.toLowerCase() && isLetter(replacement)) return replacement.toLowerCase();
  return replacement;
}

function classOf(ch: string) {
  if (isDigit(ch)) return 'digit';
  if (isLetter(ch)) return 'letter';
  return 'other';
}

export function maskForSecondary(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== 'string') return cardNumber;
  const trimmed = cardNumber.trim();
  // Ensure we have at least 6 characters (1 for start, 1 for masking, 4 for the end)
  if (trimmed.length < 6) return trimmed;

  const chars = [...trimmed];
  const cardClasses = new Set(chars.map(classOf));
  const allDigits = cardClasses.size === 1 && cardClasses.has('digit');
  const allLetters = cardClasses.size === 1 && cardClasses.has('letter');

  function classAllowed(replacementChar: string) {
    const rCls = classOf(replacementChar);
    if (allDigits) return rCls === 'digit';
    if (allLetters) return rCls === 'letter';
    return rCls === 'digit' || rCls === 'letter';
  }

  // Create an array of valid indices to mask. 
  // Starts at 1 (index 0 is never masked, protecting Apple 'X')
  // Ends at length - 5 (the last 4 chars are never masked)
  const validIndices: number[] = [];
  for (let i = 1; i < trimmed.length - 4; i++) {
    validIndices.push(i);
  }

  if (validIndices.length === 0) return trimmed;

  const hash = stableHash(trimmed);
  const startIdx = hash % validIndices.length;

  // Iterate through the valid indices to find a swappable character
  for (let offset = 0; offset < validIndices.length; offset++) {
    const idx = validIndices[(startIdx + offset) % validIndices.length];
    const ch = chars[idx];
    const upper = isLetter(ch) ? ch.toUpperCase() : ch;

    const candidates = CONFUSABLE_MAP[upper] || [];
    const start = hash % Math.max(candidates.length, 1);
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[(start + i) % candidates.length];
      if (candidate === ch) continue;
      if (!classAllowed(candidate)) continue;
      
      const arr = trimmed.split('');
      arr[idx] = matchCase(ch, candidate);
      return arr.join('');
    }

    // Fallback if no confusable map applies
    const cls = classOf(ch);
    if (cls === 'digit') {
      const d = ch.charCodeAt(0) - 48;
      const shift = (hash % 8) + 1;
      const arr = trimmed.split('');
      arr[idx] = String((d + shift) % 10);
      return arr.join('');
    }
    if (cls === 'letter') {
      const up = ch.toUpperCase();
      const shift = (hash % 25) + 1;
      const nu = String.fromCharCode(((up.charCodeAt(0) - 65 + shift) % 26) + 65);
      const arr = trimmed.split('');
      arr[idx] = matchCase(ch, nu);
      return arr.join('');
    }
  }

  return trimmed;
}