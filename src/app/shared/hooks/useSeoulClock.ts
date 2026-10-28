import { useEffect, useState } from 'react';
import {
  getSeoulDayStartMs,
  getSeoulSecondsOfDay,
  getSeoulToday,
  SEOUL_DAY_MS,
} from '../lib/seoul-date';

const TICK_INTERVAL_MS = 20 * 1_000;

export type SeoulClock = {
  dateKey: string;
  secondsOfDay: number;
};

function read(): SeoulClock {
  const now = new Date();
  return {
    dateKey: getSeoulToday(now).dateKey,
    secondsOfDay: getSeoulSecondsOfDay(now),
  };
}

/**
 * Seoul wall-clock time, refreshed often enough that a deadline flips on its
 * own. A member sitting on the order screen at 10:44 must see it close at
 * 10:45 without reloading, otherwise they submit and get a server error.
 *
 * Re-reads on tab focus too, since timers are throttled in background tabs.
 * Callers may opt into an exact daily boundary and midnight refresh without
 * changing the polling schedule for other screens.
 */
export function useSeoulClock(refreshAtSeconds?: number): SeoulClock {
  const [clock, setClock] = useState(read);

  useEffect(() => {
    let boundaryTimeoutId: number | undefined;
    const sync = () => {
      setClock((current) => {
        const next = read();

        return current.dateKey === next.dateKey &&
          current.secondsOfDay === next.secondsOfDay
          ? current
          : next;
      });
      scheduleBoundary();
    };

    function scheduleBoundary() {
      if (refreshAtSeconds === undefined) return;
      window.clearTimeout(boundaryTimeoutId);

      const now = new Date();
      const dayStart = getSeoulDayStartMs(getSeoulToday(now).dateKey);
      const boundary = dayStart + refreshAtSeconds * 1_000;
      const next =
        now.getTime() < boundary ? boundary : dayStart + SEOUL_DAY_MS;

      boundaryTimeoutId = window.setTimeout(
        sync,
        Math.max(1, next - now.getTime()),
      );
    }

    const intervalId = window.setInterval(sync, TICK_INTERVAL_MS);
    scheduleBoundary();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    if (refreshAtSeconds !== undefined) {
      window.addEventListener('focus', sync);
    }

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(boundaryTimeoutId);
      document.removeEventListener('visibilitychange', onVisible);
      if (refreshAtSeconds !== undefined) {
        window.removeEventListener('focus', sync);
      }
    };
  }, [refreshAtSeconds]);

  return clock;
}
