import { useLayoutEffect, type RefObject } from 'react';

/** Keep mobile commands visible without covering the scrollable roster. */
export function useAttendanceViewport(
  frameRef: RefObject<HTMLDivElement | null>,
  hasCommands: boolean,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !hasCommands) return;

    const mobile = window.matchMedia('(max-width: 768px)');
    const viewport = window.visualViewport;
    const shell = frame.closest('.workspace-shell');
    const navigation = shell?.querySelector<HTMLElement>(
      '.workspace-shell__bottom-navigation',
    );
    const dock = frame.querySelector<HTMLElement>(
      '.staff-attendance__action-bar',
    );
    if (!dock) return;

    const properties = [
      '--attendance-dock-bottom',
      '--attendance-dock-space',
      '--attendance-table-height',
    ];
    let animationFrame = 0;
    const clear = () => {
      properties.forEach((property) => frame.style.removeProperty(property));
    };
    const setPixels = (property: string, value: number) => {
      const next = `${value}px`;
      if (frame.style.getPropertyValue(property) !== next) {
        frame.style.setProperty(property, next);
      }
    };
    const measure = () => {
      animationFrame = 0;
      if (!mobile.matches) {
        clear();
        return;
      }

      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      const navigationRect = navigation?.getBoundingClientRect();
      const bottom = Math.min(
        visibleBottom,
        navigationRect?.height ? navigationRect.top : visibleBottom,
      );
      const bottomOffset =
        Math.max(0, Math.ceil(window.innerHeight - bottom)) + 8;
      // Without the navigation bar, the dock itself must reserve the home indicator.
      const dockBottom = navigationRect?.height
        ? `${bottomOffset}px`
        : `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`;
      if (
        frame.style.getPropertyValue('--attendance-dock-bottom') !== dockBottom
      ) {
        frame.style.setProperty('--attendance-dock-bottom', dockBottom);
      }

      const dockRect = dock.getBoundingClientRect();
      setPixels('--attendance-dock-space', Math.ceil(dockRect.height) + 16);
      setPixels(
        '--attendance-table-height',
        Math.max(
          1,
          Math.floor(dockRect.top - frame.getBoundingClientRect().top - 8),
        ),
      );
    };
    const schedule = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    const board = frame.closest('.staff-attendance__board');
    [
      frame,
      dock,
      navigation,
      frame.closest('.staff-attendance, .admin-attendance'),
      shell?.querySelector('.workspace-shell__topbar'),
      board?.querySelector('.staff-attendance__board-head'),
      board?.querySelector('.staff-attendance__board-toolbar'),
    ].forEach((element) => {
      if (element) observer.observe(element);
    });

    measure();
    window.addEventListener('resize', schedule);
    // Inner roster scrolling does not change the available viewport.
    window.addEventListener('scroll', schedule, { passive: true });
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    mobile.addEventListener('change', schedule);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      mobile.removeEventListener('change', schedule);
      clear();
    };
  }, [frameRef, hasCommands]);
}
