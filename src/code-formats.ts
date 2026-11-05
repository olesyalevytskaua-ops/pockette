import type { Strings } from './i18n';
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

export function validateCode(number: string, format: CodeFormat, t: Strings): string {
  if (!number.trim()) return t.enterCode;
  if (number.length > CODE_LIMIT) return t.codeTooLong(CODE_LIMIT);
  if (format === 'code128' && !/^[\x20-\x7e]+$/.test(number)) {
    return t.code128Chars;
  }
  if (format === 'code39' && !/^[0-9A-Z .$/+%\-]+$/.test(number)) {
    return t.code39Chars;
  }
  const length = format === 'ean13' ? 13 : format === 'ean8' ? 8 : format === 'upca' ? 12 : 0;
  if (length) {
    if (number.length !== length || !/^\d+$/.test(number)) {
      return t.needsDigits(formats[format], length);
    }
    const sum = [...number.slice(0, -1)].reverse().reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 1 : 3), 0);
    if ((10 - sum % 10) % 10 !== Number(number.at(-1))) {
      return t.badCheckDigit(formats[format]);
    }
  }
  return '';
}
