import { ChevronRight } from 'lucide-react';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Badge } from '../../../../../shared/ui';
import type { LeaveDayCell, LeaveDayEntry } from '../model/leave.types';
import '../styles/LeaveUpcomingList.css';

export type LeaveUpcomingRow = {
  cell: LeaveDayCell;
  entry: LeaveDayEntry;
};

export function LeaveUpcomingList({
  onSelectDay,
  rows,
}: {
  onSelectDay: (dateKey: string) => void;
  rows: readonly LeaveUpcomingRow[];
}) {
  return (
    <ol className="member-leaves__upcoming">
      {rows.map(({ cell, entry }, index) => (
        <li key={`${cell.dateKey}-${entry.sourceLabel}-${index}`}>
          <button
            className="member-leaves__upcoming-row"
            onClick={() => onSelectDay(cell.dateKey)}
            type="button"
          >
            <span className="member-leaves__upcoming-date">
              {formatKoreanDate(cell.dateKey)}
              {cell.isToday && <small>오늘</small>}
            </span>

            <span className="member-leaves__upcoming-body">
              <Badge tone={entry.origin === 'own' ? 'positive' : 'special'}>
                {entry.label}
              </Badge>
              {entry.slotsLabel && <em>{entry.slotsLabel}</em>}
            </span>

            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </li>
      ))}
    </ol>
  );
}
