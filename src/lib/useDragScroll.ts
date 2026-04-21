import { useCallback, useRef } from "react";

// Hold-Space + drag panning for a scrollable container (overflow: auto).
// Scrolls the element itself in both X and Y directions.
//
// Space must be held to enter pan mode — this prevents accidental text
// selection on normal click-drag and lets inner elements (e.g. the
// MotivationMap SVG) keep their own pointer interactions when Space is
// not held.
//
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

    let isSpaceHeld = false;
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let moved = 0;
    let pointerId: number | null = null;

    const isTypingTarget = (target: EventTarget | null): boolean => {
      const t = target as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
      return false;
    };

    const enterPanReady = () => {
      if (isSpaceHeld) return;
      isSpaceHeld = true;
      el.style.cursor = "grab";
      document.body.style.userSelect = "none";
    };

    const exitPanReady = () => {
      if (!isSpaceHeld) return;
      isSpaceHeld = false;
      // Don't clobber cursor if we're actively dragging — endDrag handles it
      if (!isDown) el.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.repeat) {
        // Still swallow the default (page scroll) while holding
        if (!isTypingTarget(document.activeElement)) e.preventDefault();
        return;
      }
      if (isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      enterPanReady();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      exitPanReady();
    };

    const onBlur = () => {
      // If the window loses focus while Space is held, release pan-ready state
      exitPanReady();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!isSpaceHeld) return; // Pan only with Space held
      // Space is held — take over: stop inner handlers (e.g. MotivationMap)
      e.stopImmediatePropagation();
      e.preventDefault();
      isDown = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
      startScrollTop = el.scrollTop;
      pointerId = e.pointerId;
      el.style.cursor = "grabbing";
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
      // Keep grab cursor if Space is still held, else clear
      el.style.cursor = isSpaceHeld ? "grab" : "";
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

    // Capture phase so we outrank inner pointerdown handlers (MotivationMap dots)
    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    cleanupRef.current = () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true } as EventListenerOptions);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      el.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return ref;
}
