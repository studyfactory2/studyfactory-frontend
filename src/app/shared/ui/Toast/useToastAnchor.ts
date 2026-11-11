import { useLayoutEffect, useRef } from 'react';

/** Follow a visible action bar while keeping notifications outside modal roots. */
export function useToastAnchor(selector?: string) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stack = ref.current;
    if (!stack || !selector) return;

    const viewport = window.visualViewport;
    let anchor: HTMLElement | null = null;
    let animationFrame = 0;
    const clear = () => {
      ['bottom', 'left', 'width'].forEach((property) =>
        stack.style.removeProperty(property),
      );
    };
    const measure = () => {
      animationFrame = 0;
      // A modal's footer follows the background dock in document order.
      const nextAnchor = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      )
        .reverse()
        .find((element) => element.getClientRects().length > 0);
      if (nextAnchor !== anchor) {
        if (anchor) resizeObserver.unobserve(anchor);
        anchor = nextAnchor ?? null;
        if (anchor) resizeObserver.observe(anchor);
      }
      if (!anchor) {
        clear();
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const visibleLeft = viewport?.offsetLeft ?? 0;
      const visibleWidth = viewport?.width ?? window.innerWidth;
      const visibleTop = viewport?.offsetTop ?? 0;
      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      if (rect.bottom <= visibleTop || rect.top >= visibleBottom) {
        clear();
        return;
      }
      const width = Math.min(400, rect.width, visibleWidth - 24);
      const center = Math.max(
        visibleLeft + width / 2 + 12,
        Math.min(
          rect.left + rect.width / 2,
          visibleLeft + visibleWidth - width / 2 - 12,
        ),
      );
      stack.style.bottom = `${Math.max(24, window.innerHeight - Math.min(rect.top, visibleBottom - 16) + 8)}px`;
      stack.style.left = `${center}px`;
      stack.style.width = `${width}px`;
    };
    const schedule = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(schedule);
    const mutationObserver = new MutationObserver(schedule);
    // Saving can switch confirmation footers or close a modal before dismissal.
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      clear();
    };
  }, [selector]);

  return ref;
}
