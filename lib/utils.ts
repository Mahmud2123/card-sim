// src/lib/utils.ts

export function filterAmount(v: string): string {
  let s = v.replace(/[^\d.]/g, "");
  const p = s.split(".");
  if (p.length > 2) s = p[0] + "." + p.slice(1).join("");
  const q = s.split(".");
  if (q[1] && q[1].length > 2) s = q[0] + "." + q[1].slice(0, 2);
  return s;
}

export function generateMask(cardNumber: string) {
  if (!cardNumber) return { index: 0, maskedChar: '' };
  const index = Math.floor(Math.random() * cardNumber.length);
  const char = cardNumber[index];
  let maskedChar = char;

  const digitMap: Record<string, string> = { '6': '9', '9': '6', '1': '0', '0': '1' };
  const alphaMap: Record<string, string> = { 'q': 'p', 'p': 'q', 'g': 'c', 'c': 'g' };

  if (/[0-9]/.test(char)) {
    if (digitMap[char]) {
      maskedChar = digitMap[char];
    } else {
      let newDigit = char;
      while (newDigit === char) newDigit = Math.floor(Math.random() * 10).toString();
      maskedChar = newDigit;
    }
  } else if (/[A-Z]/i.test(char)) {
    const lowerChar = char.toLowerCase();
    if (alphaMap[lowerChar]) {
      maskedChar = alphaMap[lowerChar].toUpperCase();
    } else {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let newChar = char;
      while (newChar === char) newChar = letters[Math.floor(Math.random() * letters.length)];
      maskedChar = newChar;
    }
  }
  return { index, maskedChar };
}