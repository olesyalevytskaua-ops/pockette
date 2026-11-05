export const formats = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  code39: 'Code 39',
  qrcode: 'QR code',
} as const;

export type CodeFormat = keyof typeof formats;
export type ScannedCode = { number: string; format: CodeFormat };
export const CODE_LIMIT = 150;

export function isCodeFormat(value: unknown): value is CodeFormat {
  return typeof value === 'string' && Object.hasOwn(formats, value);
}

export function validateCode(number: string, format: CodeFormat): string {
  if (!number.trim()) return 'Enter the card number or code.';
  if (number.length > CODE_LIMIT) return `Use a code of ${CODE_LIMIT} characters or fewer.`;
  if (format === 'code128' && !/^[\x20-\x7e]+$/.test(number)) {
    return 'Code 128 supports basic letters, numbers and punctuation.';
  }
  if (format === 'code39' && !/^[0-9A-Z .$/+%\-]+$/.test(number)) {
    return 'Code 39 supports uppercase letters, numbers, spaces and . $ / + % -';
  }
  const length = format === 'ean13' ? 13 : format === 'ean8' ? 8 : format === 'upca' ? 12 : 0;
  if (length) {
    if (number.length !== length || !/^\d+$/.test(number)) {
      return `${formats[format]} needs exactly ${length} digits, including the check digit.`;
    }
    const sum = [...number.slice(0, -1)].reverse().reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 1 : 3), 0);
    if ((10 - sum % 10) % 10 !== Number(number.at(-1))) {
      return `The ${formats[format]} check digit is incorrect. Check the number on your card.`;
    }
  }
  return '';
}
