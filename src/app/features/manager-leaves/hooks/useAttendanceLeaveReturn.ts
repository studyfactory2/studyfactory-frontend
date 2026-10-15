import { useLayoutEffect, useRef } from 'react';
import type { AttendanceLeaveManagementTarget } from '../../attendances/workspace/components/AttendanceBoard';
import { toAttendanceCellId } from '../../attendances/workspace/model/attendance-board';

type ScrollPosition = {
  element: HTMLElement;
  left: number;
  top: number;
};

type ReturnPosition = {
  key: string;
  dateKey: string;
  scopeKey: string;
  url: string;
  cell: HTMLElement;
  ancestors: ScrollPosition[];
  windowLeft: number;
  windowTop: number;
};

/** Keep this hook with the mounted board, not inside the departing popup. */
export function useAttendanceLeaveReturn({
  dateKey,
  scopeKey,
  target,
}: {
  dateKey: string;
  scopeKey: string;
  target: AttendanceLeaveManagementTarget | null;
}) {
  const positionRef = useRef<ReturnPosition | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const targetDate = target?.dateKey;
  const memberId = target?.memberId;
  const slot = target?.slot;

  useLayoutEffect(() => {
    if (
      memberId !== undefined &&
      slot !== undefined &&
      targetDate === dateKey
    ) {
      const key = `${scopeKey}:${dateKey}:${memberId}:${slot}`;
      const cell = document.getElementById(toAttendanceCellId(memberId, slot));
      restoreFocusRef.current = cell;

      // StrictMode replays setup; keep the original pre-popup position.
      if (cell && positionRef.current?.key !== key) {
        const ancestors: ScrollPosition[] = [];
        for (
          let element = cell.parentElement;
          element &&
          element !== document.body &&
          element !== document.documentElement;
          element = element.parentElement
        ) {
          ancestors.push({
            element,
            left: element.scrollLeft,
            top: element.scrollTop,
          });
        }
        positionRef.current = {
          key,
          dateKey,
          scopeKey,
          url: window.location.href,
          cell,
          ancestors,
          windowLeft: window.scrollX,
          windowTop: window.scrollY,
        };
      }
      return;
    }

    const position = positionRef.current;
    positionRef.current = null;
    restoreFocusRef.current = null;
    if (
      !position ||
      position.dateKey !== dateKey ||
      position.scopeKey !== scopeKey ||
      position.url !== window.location.href ||
      !position.cell.isConnected
    ) {
      return;
    }

    // Modal cleanup reads this explicit target instead of a stale touch focus.
    // A missing member never falls back to the first member in the ledger.
    restoreFocusRef.current = position.cell;
    const restoreScroll = () => {
      if (!position.cell.isConnected || position.url !== window.location.href)
        return;
      for (const { element, left, top } of position.ancestors) {
        if (element.isConnected)
          element.scrollTo({ left, top, behavior: 'instant' });
      }
      window.scrollTo({
        left: position.windowLeft,
        top: position.windowTop,
        behavior: 'instant',
      });
    };
    restoreScroll();
    // Finish after modal focus cleanup and browser history scroll restoration.
    const frame = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [dateKey, memberId, scopeKey, slot, targetDate]);

  return restoreFocusRef;
}
