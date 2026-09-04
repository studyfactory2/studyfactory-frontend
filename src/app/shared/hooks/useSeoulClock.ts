import { useEffect, useState } from 'react';
import { getSeoulSecondsOfDay, getSeoulToday } from '../lib/seoul-date';

const TICK_INTERVAL_MS = 20 * 1_000;

export type SeoulClock = {
  dateKey: string;
  secondsOfDay: number;
};

function read(): SeoulClock {
  return {
    dateKey: getSeoulToday().dateKey,
    secondsOfDay: getSeoulSecondsOfDay(),
  };
}

/**
 * Seoul wall-clock time, refreshed often enough that a deadline flips on its
 * own. A member sitting on the order screen at 10:44 must see it close at
 * 10:45 without reloading, otherwise they submit and get a server error.
 *
 * Re-reads on tab focus too, since timers are throttled in background tabs.
 */
export function useSeoulClock(): SeoulClock {
  const [clock, setClock] = useState(read);

  useEffect(() => {
    const sync = () =>
      setClock((current) => {
        const next = read();

        return current.dateKey === next.dateKey &&
          current.secondsOfDay === next.secondsOfDay
          ? current
          : next;
      });

    const intervalId = window.setInterval(sync, TICK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return clock;
}
