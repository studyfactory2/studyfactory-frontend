import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SEOUL_WEEKDAY_LABELS,
  formatKoreanDate,
  formatKoreanMonth,
} from '../../../shared/lib/seoul-date';
import { cx } from '../../../shared/lib/cx';
import {
  summarizeManagerLeaveCalendarReasons,
  type ManagerLeaveCalendarCell,
  type ManagerLeaveCalendarReason,
} from '../../leaves/leave-management-model';
import '../styles/manager-leave-calendar.css';

type ManagerLeaveCalendarProps = {
  cells: ManagerLeaveCalendarCell[];
  currentMonth: boolean;
  mode?: 'register' | 'view';
  month: number;
  onCurrentMonth: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onToggleDate: (dateKey: string) => void;
  selectedDates: ReadonlySet<string>;
  year: number;
};

export function ManagerLeaveCalendar({
  cells,
  currentMonth,
  mode = 'register',
  month,
  onCurrentMonth,
  onNextMonth,
  onPreviousMonth,
  onToggleDate,
  selectedDates,
  year,
}: ManagerLeaveCalendarProps) {
  return (
    <section className="manager-leave-calendar">
      <header className="manager-leave-calendar__header">
        <button aria-label="이전 달" onClick={onPreviousMonth} type="button">
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <strong aria-live="polite">{formatKoreanMonth(year, month)}</strong>
        <button aria-label="다음 달" onClick={onNextMonth} type="button">
          <ChevronRight aria-hidden="true" size={18} />
        </button>
        <button
          className="manager-leave-calendar__current"
          disabled={currentMonth}
          onClick={onCurrentMonth}
          type="button"
        >
          이번 달
        </button>
      </header>

      <div aria-hidden="true" className="manager-leave-calendar__weekdays">
        {SEOUL_WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <ul className="manager-leave-calendar__grid">
        {cells.map((cell) => {
          const selected = selectedDates.has(cell.dateKey);
          const reasons = summarizeManagerLeaveCalendarReasons(cell.entries);
          const visibleReasons = reasons.slice(0, 2);
          const remainingCount = Math.max(0, reasons.length - 2);

          return (
            <li key={cell.dateKey}>
              <button
                aria-label={toCalendarDayLabel(cell, mode, reasons)}
                aria-pressed={selected}
                className={cx(
                  'manager-leave-calendar__day',
                  !cell.inMonth && 'is-outside',
                  cell.isToday && 'is-today',
                  selected && 'is-selected',
                )}
                disabled={!cell.inMonth}
                onClick={() => onToggleDate(cell.dateKey)}
                type="button"
              >
                <span className="manager-leave-calendar__number">
                  {cell.dayOfMonth}
                </span>
                {visibleReasons.map((reason) => (
                  <span
                    className={cx(
                      'manager-leave-calendar__entry',
                      `is-${reason.source}`,
                    )}
                    key={reason.label}
                    title={`${reason.label} · ${reason.slotsLabel}`}
                  >
                    {reason.label}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="manager-leave-calendar__more">
                    +{remainingCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function toCalendarDayLabel(
  cell: ManagerLeaveCalendarCell,
  mode: 'register' | 'view',
  reasons: readonly ManagerLeaveCalendarReason[],
) {
  const dateLabel = formatKoreanDate(cell.dateKey);
  const actionLabel = mode === 'view' ? '휴무 상세 보기' : '등록 날짜로 선택';

  if (!cell.inMonth) {
    return `${dateLabel}, 다른 달`;
  }

  if (reasons.length === 0) {
    return `${dateLabel}, 휴무 없음, ${actionLabel}`;
  }

  return `${dateLabel}, ${reasons
    .map((reason) => `${reason.label} ${reason.slotsLabel}`)
    .join(', ')}, ${actionLabel}`;
}
