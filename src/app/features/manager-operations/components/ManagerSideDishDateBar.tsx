import { CalendarDays, ChevronDown } from 'lucide-react';
import type { useAttendanceDate } from '../../attendances/workspace/hooks/useAttendanceDate';
import { cx } from '../../../shared/lib/cx';
import {
  addDays,
  formatFullKoreanDate,
  formatKoreanDate,
} from '../../../shared/lib/seoul-date';

export type SideDishDateSelection = Pick<
  ReturnType<typeof useAttendanceDate>,
  'dateKey' | 'todayKey' | 'onDateChange' | 'onToday'
>;

export function ManagerSideDishDateBar({
  date,
}: {
  date: SideDishDateSelection;
}) {
  const tomorrowKey = addDays(date.todayKey, 1);
  const isToday = date.dateKey === date.todayKey;
  const isTomorrow = date.dateKey === tomorrowKey;

  return (
    <div className="manager-side-dish-date">
      <div
        aria-label="반찬 신청 날짜 선택"
        className="manager-side-dish-date__controls"
        role="group"
      >
        <button aria-pressed={isToday} onClick={date.onToday} type="button">
          오늘
        </button>
        <button
          aria-pressed={isTomorrow}
          onClick={() => date.onDateChange(tomorrowKey)}
          type="button"
        >
          내일
        </button>
        <label
          className={cx(
            'manager-side-dish-date__picker',
            !isToday && !isTomorrow && 'is-selected',
          )}
        >
          <span aria-hidden="true">
            <CalendarDays size={15} />
            날짜 선택
            <ChevronDown size={13} />
          </span>
          <input
            aria-label={`반찬 신청 날짜, ${formatFullKoreanDate(date.dateKey)}`}
            onChange={(event) => date.onDateChange(event.target.value)}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker?.();
              } catch {
                /* Keep the native date input usable without showPicker. */
              }
            }}
            type="date"
            value={date.dateKey}
          />
        </label>
      </div>
      <p aria-live="polite" className="manager-side-dish-date__selected">
        <time dateTime={date.dateKey}>{formatKoreanDate(date.dateKey)}</time>
        <span>반찬 신청</span>
      </p>
    </div>
  );
}
