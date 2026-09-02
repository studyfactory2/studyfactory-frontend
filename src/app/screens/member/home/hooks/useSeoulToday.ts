import { useEffect, useState } from 'react';
import {
  getMillisecondsUntilNextSeoulDay,
  getSeoulToday,
  type SeoulToday,
} from '../model/home.dates';

/**
 * Keeps the screen's notion of "today" aligned with the Asia/Seoul calendar.
 * An installed PWA can stay open across midnight, so the date is re-checked on
 * the day boundary and whenever the tab becomes visible again after sleeping.
 */
export function useSeoulToday(): SeoulToday {
  const [today, setToday] = useState<SeoulToday>(getSeoulToday);

  useEffect(() => {
    let timeoutId = 0;

    const scheduleNextCheck = () => {
      timeoutId = window.setTimeout(
        syncToday,
        getMillisecondsUntilNextSeoulDay(),
      );
    };

    const syncToday = () => {
      const next = getSeoulToday();
      setToday((current) =>
        current.dateKey === next.dateKey ? current : next,
      );
      scheduleNextCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      window.clearTimeout(timeoutId);
      syncToday();
    };

    scheduleNextCheck();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}
