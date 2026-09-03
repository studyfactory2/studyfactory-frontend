import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SEOUL_WEEKDAY_LABELS,
  formatKoreanDate,
} from '../../../../../shared/lib/seoul-date';
import { isDaySelectable } from '../model/leave.month';
import type { LeaveDayCell } from '../model/leave.types';
import '../styles/LeaveCalendar.css';

export type LeaveCalendarProps = {
  cells: readonly LeaveDayCell[];
  isCurrentMonth: boolean;
  monthLabel: string;
  onGoToday: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDay: (dateKey: string) => void;
  selectedDateKey: string | null;
};

export function LeaveCalendar({
  cells,
  isCurrentMonth,
  monthLabel,
  onGoToday,
  onNextMonth,
  onPreviousMonth,
  onSelectDay,
  selectedDateKey,
}: LeaveCalendarProps) {
  return (
    <div className="member-leaves__calendar">
      <header className="member-leaves__calendar-header">
        <button
          aria-label="이전 달"
          className="member-leaves__calendar-step"
          onClick={onPreviousMonth}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>

        <strong aria-live="polite" className="member-leaves__calendar-month">
          {monthLabel}
        </strong>

        <button
          aria-label="다음 달"
          className="member-leaves__calendar-step"
          onClick={onNextMonth}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>

        <button
          className="member-leaves__calendar-today"
          disabled={isCurrentMonth}
          onClick={onGoToday}
          type="button"
        >
          이번 달
        </button>
      </header>

      <div aria-hidden="true" className="member-leaves__calendar-weekdays">
        {SEOUL_WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <ul className="member-leaves__calendar-grid">
        {cells.map((cell) => (
          <li key={cell.dateKey}>
            <LeaveCalendarDay
              cell={cell}
              onSelect={onSelectDay}
              selected={cell.dateKey === selectedDateKey}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaveCalendarDay({
  cell,
  onSelect,
  selected,
}: {
  cell: LeaveDayCell;
  onSelect: (dateKey: string) => void;
  selected: boolean;
}) {
  const [firstEntry, ...restEntries] = cell.entries;
  const selectable = isDaySelectable(cell);

  return (
    <button
      aria-label={toDayLabel(cell)}
      aria-pressed={selected}
      className={[
        'member-leaves__day',
        cell.inMonth ? '' : 'is-outside',
        cell.isToday ? 'is-today' : '',
        cell.isPast ? 'is-past' : '',
        selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={!selectable}
      onClick={() => onSelect(cell.dateKey)}
      type="button"
    >
      <span className="member-leaves__day-number">{cell.dayOfMonth}</span>

      {firstEntry && (
        <span
          className={`member-leaves__day-chip is-${firstEntry.origin}`}
          title={firstEntry.label}
        >
          {firstEntry.chipLabel}
        </span>
      )}

      {restEntries.length > 0 && (
        <span className="member-leaves__day-more">+{restEntries.length}</span>
      )}
    </button>
  );
}

function toDayLabel(cell: LeaveDayCell) {
  const date = formatKoreanDate(cell.dateKey);

  if (!cell.inMonth) {
    return date;
  }

  if (cell.entries.length === 0) {
    return cell.isPast ? `${date}, 지난 날짜` : `${date}, 휴무 없음`;
  }

  return `${date}, ${cell.entries.map((entry) => entry.label).join(', ')}`;
}
