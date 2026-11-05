import type React from 'react';

/** The five store-card presets from Design System v2. Cards keep a single hex
 *  `color`; a preset is matched by that hex, any other hex gets a derived tone. */
export const presets = [
  { name: 'Bordeaux', color: '#762D46', from: '#8A3A55', to: '#4E1D2E', ink: '#FFFFFF', label: 'rgba(255,255,255,.82)' },
  { name: 'Navy', color: '#2B3A67', from: '#3E4F85', to: '#1C2648', ink: '#FFFFFF', label: 'rgba(255,255,255,.82)' },
  // Watsons teal: .84 white measured under 4.5:1 on the light end, so its label is solid.
  { name: 'Teal', color: '#1F5F5B', from: '#2C7A73', to: '#143F3C', ink: '#FFFFFF', label: '#FFFFFF' },
  { name: 'Gold', color: '#E9CD96', from: '#F5E3C0', to: '#DDB878', ink: '#3A2810', label: '#5A3F18' },
  { name: 'Espresso', color: '#3A2A25', from: '#4E3A33', to: '#241A17', ink: '#F6EEE6', label: '#D9C29A' },
] as const;

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const hex = (c: Rgb) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t) as Rgb); };
function luminance(color: string) {
  const [r, g, b] = rgb(color).map(v => { const s = v / 255; return s <= .03928 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
}
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
}

function derive(color: string) {
  const from = mix(color, '#FFFFFF', .08);
  const to = mix(color, '#000000', .3);
  const light = Math.min(contrast('#FFFFFF', from), contrast('#FFFFFF', color)) < 4.5;
  const ink = light ? mix(color, '#000000', .78) : '#FFFFFF';
  const soft = light ? mix(color, '#000000', .62) : mix(from, '#FFFFFF', .82);
  const label = contrast(soft, from) >= 4.5 ? soft : ink;
  return { from, to, ink, label };
}

/** Custom properties for one store card, read by .store-card, .swatch and the sheets. */
export function cardTone(color: string): React.CSSProperties {
  const preset = presets.find(p => p.color.toLowerCase() === color.toLowerCase());
  const t = preset ?? derive(color);
  const light = contrast('#FFFFFF', t.ink) < 4.5;
  return {
    '--card-from': t.from, '--card-mid': preset?.color ?? color, '--card-to': t.to,
    '--card-ink': t.ink, '--card-label': t.label,
    '--card-number': light ? t.ink : '#EAD9B8',
    '--card-edge': light ? 'rgba(176,141,87,.7)' : 'rgba(217,194,154,.62)',
    '--card-sheen': light ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)',
  } as React.CSSProperties;
}
