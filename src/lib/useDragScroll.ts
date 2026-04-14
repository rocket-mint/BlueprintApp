import { useCallback, useRef } from "react";

// Click-and-drag panning for a scrollable container (overflow: auto).
// Scrolls the element itself in both X and Y directions.
// Uses a callback ref so it works even when the element mounts late
// (e.g. after a route change).
export function useDragScroll<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    // Clean up previous element
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let moved = 0;
    let pointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("button, a, input, select, textarea, label")) return;
      // Skip drag on SVG circles (motivation map data points) to allow point dragging
      if (t instanceof SVGElement && t.closest("circle")) return;
      isDown = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
      startScrollTop = el.scrollTop;
      pointerId = e.pointerId;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > moved) moved = dist;
      el.scrollLeft = startScrollLeft - dx;
      el.scrollTop = startScrollTop - dy;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "grab";
      el.style.userSelect = "";
      if (pointerId !== null) {
        try {
          el.releasePointerCapture(pointerId);
        } catch {
          /* no-op */
        }
        pointerId = null;
      }
      if (moved > 5) {
        const suppress = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          el.removeEventListener("click", suppress, true);
        };
        el.addEventListener("click", suppress, true);
        setTimeout(() => el.removeEventListener("click", suppress, true), 0);
      }
    };

    el.style.cursor = "grab";
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    cleanupRef.current = () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.style.cursor = "";
      el.style.userSelect = "";
    };
  }, []);

  return ref;
}
