/**
 * Optional tactile feedback for supported mobile browsers.
 * Safari/iOS PWAs do not currently expose the standard Vibration API.
 * Silent fallback keeps every action functional when haptics are unavailable.
 */
export type HapticCue = 'selection' | 'success' | 'warning';
const patterns: Record<HapticCue, number | number[]> = {
  selection: 8,
  success: [12, 35, 12],
  warning: [18, 45, 18],
};
export function haptic(cue: HapticCue = 'selection'): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      navigator.vibrate(patterns[cue]);
    }
  } catch {
    // Unsupported or blocked haptics should never interrupt interaction.
  }
}
