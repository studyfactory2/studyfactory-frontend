import { useEffect, useState } from 'react';
import {
  getMillisecondsUntilNextSeoulDay,
  getSeoulToday,
  type SeoulToday,
} from '../lib/seoul-date';

/**
 * Keeps "today" correct in Asia/Seoul for a PWA that stays open.
 * Re-arms itself at each Seoul midnight and re-syncs when the tab is shown
 * again, so a session left open overnight does not keep reporting yesterday.
 */
export function useSeoulToday(): SeoulToday {
  const [today, setToday] = useState(() => getSeoulToday());

  useEffect(() => {
    let timeoutId = 0;

    const sync = () => {
      const next = getSeoulToday();

      setToday((current) =>
        current.dateKey === next.dateKey ? current : next,
      );
    };

    const scheduleNextMidnight = () => {
      timeoutId = window.setTimeout(() => {
        sync();
        scheduleNextMidnight();
      }, getMillisecondsUntilNextSeoulDay());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    scheduleNextMidnight();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}
