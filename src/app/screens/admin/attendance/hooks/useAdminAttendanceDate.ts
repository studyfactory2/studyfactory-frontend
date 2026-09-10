import { useCallback, useState } from 'react';
import { addDays } from '../../../../shared/lib/seoul-date';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';

type DateSelection = { mode: 'today' } | { dateKey: string; mode: 'fixed' };

const TODAY_SELECTION = { mode: 'today' } as const;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A fixed past date stays fixed across Seoul midnight. Only the explicit
 * "today" mode follows the operating day when a tablet is left open.
 */
export function useAdminAttendanceDate() {
  const today = useSeoulToday();
  const [selection, setSelection] = useState<DateSelection>(TODAY_SELECTION);
  const dateKey =
    selection.mode === 'today' ? today.dateKey : selection.dateKey;
  const isToday = selection.mode === 'today';

  const selectDate = useCallback(
    (nextDateKey: string) => {
      if (!isValidDateKey(nextDateKey)) {
        return;
      }

      setSelection(
        nextDateKey >= today.dateKey
          ? TODAY_SELECTION
          : { dateKey: nextDateKey, mode: 'fixed' },
      );
    },
    [today.dateKey],
  );

  const selectPreviousDay = useCallback(() => {
    setSelection({ dateKey: addDays(dateKey, -1), mode: 'fixed' });
  }, [dateKey]);

  const selectNextDay = useCallback(() => {
    selectDate(addDays(dateKey, 1));
  }, [dateKey, selectDate]);

  const selectToday = useCallback(() => {
    setSelection(TODAY_SELECTION);
  }, []);

  return {
    dateKey,
    isToday,
    maxDateKey: today.dateKey,
    nextDisabled: isToday,
    onDateChange: selectDate,
    onNextDay: selectNextDay,
    onPreviousDay: selectPreviousDay,
    onToday: selectToday,
  };
}

function isValidDateKey(value: string) {
  return DATE_KEY_PATTERN.test(value) && addDays(value, 0) === value;
}
