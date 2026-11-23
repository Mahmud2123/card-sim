// src/lib/mask.ts
export function generateMask(cardNumber: string): { index: number; maskedChar: string } {
  if (!cardNumber) return { index: 0, maskedChar: '' };
  
  // Pick a random index once
  const index = Math.floor(Math.random() * cardNumber.length);
  const char = cardNumber[index];
  let maskedChar = char;

  // Digit swaps (6<->9, 1<->0) and Alphabet swaps (q<->p, g<->c)
  const digitMap: Record<string, string> = { '6': '9', '9': '6', '1': '0', '0': '1' };
  const alphaMap: Record<string, string> = { 'q': 'p', 'p': 'q', 'g': 'c', 'c': 'g' };

  if (/[0-9]/.test(char)) {
    if (digitMap[char]) {
      maskedChar = digitMap[char];
    } else {
      // Fallback for other digits
      let newDigit = char;
      while (newDigit === char) newDigit = Math.floor(Math.random() * 10).toString();
      maskedChar = newDigit;
    }
  } else if (/[A-Z]/i.test(char)) {
    const lowerChar = char.toLowerCase();
    if (alphaMap[lowerChar]) {
      maskedChar = alphaMap[lowerChar].toUpperCase();
    } else {
      // Fallback for other letters
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let newChar = char;
      while (newChar === char) newChar = letters[Math.floor(Math.random() * letters.length)];
      maskedChar = newChar;
    }
  }
  return { index, maskedChar };
}

export function applyMask(cardNumber: string, index: number, maskedChar: string): string {
  if (!cardNumber || index >= cardNumber.length || !maskedChar) return cardNumber;
  const arr = cardNumber.split('');
  arr[index] = maskedChar;
  return arr.join('');
}