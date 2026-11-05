import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

/** Touch waits this long before a press becomes a drag, so taps open and swipes scroll. */
const HOLD_MS = 350;
/** A mouse drag starts once the pointer has moved this far. */
const MOUSE_SLOP = 6;
/** Moving a held finger this far before the hold ends means it was a scroll. */
const TOUCH_SLOP = 10;

type Gesture = {
  id: string; pointer: number; touch: boolean;
  x0: number; y0: number; slotX: number; slotY: number;
  active: boolean; timer?: number; order: { id: string }[];
};

/**
 * Press-and-drag reordering for a list whose items carry `data-drag-id`.
 * Items swap live as the dragged one passes over them; `onDrop` gets the final
 * order only if it changed. The list is the reference for hit-testing, so it
 * works for the overlapping stack (topmost card under the pointer wins) and the grid alike.
 */
export function useCardDrag<T extends { id: string }>(items: T[], enabled: boolean, onDrop: (next: T[]) => void) {
  const listRef = useRef<HTMLUListElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const justDragged = useRef(false);
  const [draft, setDraft] = useState<T[] | null>(null);
  const [offset, setOffset] = useState<{ id: string; dx: number; dy: number } | null>(null);

  // Once a touch drag is live, stop the page from scrolling under it.
  useEffect(() => {
    const block = (e: TouchEvent) => { if (gesture.current?.active) e.preventDefault(); };
    document.addEventListener('touchmove', block, { passive: false });
    return () => document.removeEventListener('touchmove', block);
  }, []);

  const slot = (id: string) => listRef.current?.querySelector<HTMLElement>(`[data-drag-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();

  function begin(g: Gesture) {
    g.active = true;
    setDraft(items);
    setOffset({ id: g.id, dx: 0, dy: 0 });
    navigator.vibrate?.(8);
  }

  function end(commit: boolean) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.timer);
    if (!g.active) return;
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 0);
    const before = items.map(i => i.id).join();
    const after = (g.order as T[]).map(i => i.id).join();
    setDraft(null);
    setOffset(null);
    if (commit && before !== after) onDrop(g.order as T[]);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLElement>, id: string) {
    if (!enabled || items.length < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const r = slot(id);
    if (!r) return;
    const g: Gesture = { id, pointer: e.pointerId, touch: e.pointerType !== 'mouse', x0: e.clientX, y0: e.clientY, slotX: r.left, slotY: r.top, active: false, order: items };
    gesture.current = g;
    if (g.touch) g.timer = window.setTimeout(() => begin(g), HOLD_MS);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - g.x0, e.clientY - g.y0);
    if (!g.active) {
      if (g.touch) { if (moved > TOUCH_SLOP) end(false); return; }
      if (moved < MOUSE_SLOP) return;
      begin(g);
    }
    // The topmost other item under the pointer is where the dragged one goes.
    const others = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-drag-id]') ?? [])].reverse();
    const over = others.find(el => {
      if (el.dataset.dragId === g.id) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    })?.dataset.dragId;
    if (over) {
      const from = g.order.findIndex(i => i.id === g.id);
      const to = g.order.findIndex(i => i.id === over);
      if (from !== to && to >= 0) {
        const next = [...g.order];
        next.splice(to, 0, next.splice(from, 1)[0]);
        g.order = next;
        setDraft(next as T[]);
      }
    }
    // Follow the pointer from wherever the item's slot sits now.
    const now = slot(g.id);
    setOffset({ id: g.id, dx: e.clientX - g.x0 + g.slotX - (now?.left ?? g.slotX), dy: e.clientY - g.y0 + g.slotY - (now?.top ?? g.slotY) });
  }

  /** Spread onto each draggable control; the matching list item needs `data-drag-id`. */
  const bind = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => onPointerDown(e, id),
    onPointerMove,
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onContextMenu: (e: React.MouseEvent) => { if (gesture.current) e.preventDefault(); },
  });

  const dragStyle = (id: string): CSSProperties | undefined => offset?.id === id
    ? { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.03)`, transition: 'none' } : undefined;

  return {
    order: draft ?? items,
    listRef,
    bind,
    dragStyle,
    draggingId: offset?.id ?? null,
    /** True for the click that ends a drag, so dropping a card doesn't also open it. */
    swallowClick: () => justDragged.current,
  };
}
