/**
 * Touch feel for every card button: pressed, it sinks and tilts toward the finger
 * while a soft glare follows it; let go, a champagne glint runs across the foil.
 * Delegated from the document, so the card components need no wiring, and it only
 * writes CSS custom properties and classes; style.css does the drawing.
 */
export function installCardTouch() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let pressed: HTMLElement | null = null;

  const cardAt = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('button.store-card') ?? null;

  function aim(el: HTMLElement, e: PointerEvent) {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    // Wide stack strips tilt less than square tiles so their edges don't swing far.
    const reach = r.width > r.height * 1.6 ? 5 : 9;
    el.style.setProperty('--tilt-x', `${((0.5 - y) * reach).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${((x - 0.5) * reach).toFixed(2)}deg`);
    el.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
  }

  function glint(el: HTMLElement) {
    el.classList.remove('glint');
    void el.offsetWidth; // restart the animation on a quick second tap
    el.classList.add('glint');
  }

  const down = (e: PointerEvent) => {
    const el = cardAt(e);
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pressed = el;
    aim(el, e);
    el.classList.add('pressed');
  };
  const move = (e: PointerEvent) => {
    if (pressed) {
      // Once the card is being dragged it follows the finger flat, not tilted.
      if (pressed.classList.contains('dragging')) release(false);
      else aim(pressed, e);
    } else if (e.pointerType === 'mouse') {
      const el = cardAt(e);
      if (el) aim(el, e);
    }
  };
  function release(tapped: boolean) {
    if (!pressed) return;
    pressed.classList.remove('pressed');
    if (tapped) glint(pressed);
    pressed = null;
  }
  const up = () => release(true);
  const cancel = () => release(false);
  const done = (e: AnimationEvent) => { if (e.animationName === 'card-glint') (e.target as Element).classList.remove('glint'); };

  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', cancel);
  document.addEventListener('animationend', done);
  return () => {
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', cancel);
    document.removeEventListener('animationend', done);
  };
}
