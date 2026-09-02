import { PencilLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../../../shared/ui';
import type {
  EditablePlanItem,
  PlanCell,
  PlanDay,
  PlanRow,
} from '../model/plan.types';
import '../styles/MobilePlanTimeline.css';

export type MobilePlanTimelineProps = {
  days: readonly PlanDay[];
  daySelectionDisabled: boolean;
  editingDisabled: boolean;
  getItemsForCell: (
    periodIndex: number,
    dayIndex: number,
  ) => readonly EditablePlanItem[];
  onOpenEditor: (cell: PlanCell) => void;
  onSelectDay: (dayIndex: number) => void;
  renderItems: (
    items: readonly EditablePlanItem[],
    compact?: boolean,
  ) => ReactNode;
  rows: readonly PlanRow[];
  selectedDateLabel: string;
  selectedDayCompleted: number;
  selectedDayIndex: number;
  selectedDayTotal: number;
};

export function MobilePlanTimeline({
  days,
  daySelectionDisabled,
  editingDisabled,
  getItemsForCell,
  onOpenEditor,
  onSelectDay,
  renderItems,
  rows,
  selectedDateLabel,
  selectedDayCompleted,
  selectedDayIndex,
  selectedDayTotal,
}: MobilePlanTimelineProps) {
  const selectedDay = days.find((day) => day.dayIndex === selectedDayIndex);

  return (
    <div className="member-plans__mobile-board">
      <div className="member-plans__day-tabs" aria-label="요일 선택">
        {days.map((day) => (
          <button
            aria-current={day.isToday ? 'date' : undefined}
            aria-label={`${day.fullDateLabel} ${day.longLabel}`}
            aria-pressed={selectedDayIndex === day.dayIndex}
            className={selectedDayIndex === day.dayIndex ? 'is-active' : ''}
            disabled={daySelectionDisabled}
            key={day.key}
            onClick={() => onSelectDay(day.dayIndex)}
            type="button"
          >
            <span>{day.label}</span>
            <strong>{day.dayOfMonth}</strong>
            {day.isToday && <i aria-label="오늘" />}
          </button>
        ))}
      </div>

      <div
        aria-label={`${selectedDateLabel} 계획`}
        className="member-plans__day-timeline"
      >
        <header>
          <div>
            <p>{selectedDateLabel}</p>
            <h4>{selectedDay?.longLabel ?? '선택한 요일'}의 계획</h4>
          </div>
          <Badge tone={selectedDayTotal ? 'positive' : 'neutral'}>
            {selectedDayCompleted}/{selectedDayTotal} 완료
          </Badge>
        </header>
        {rows.map((row) => (
          <button
            className={row.isBreak ? 'is-break' : ''}
            disabled={editingDisabled}
            key={row.periodIndex}
            onClick={() =>
              onOpenEditor({
                dayIndex: selectedDayIndex,
                periodIndex: row.periodIndex,
              })
            }
            type="button"
          >
            <span className="member-plans__timeline-time">
              <strong>{row.label}</strong>
              <small>{row.time}</small>
            </span>
            <span className="member-plans__timeline-content">
              {renderItems(
                getItemsForCell(row.periodIndex, selectedDayIndex),
                true,
              )}
            </span>
            <PencilLine aria-hidden="true" size={17} />
          </button>
        ))}
      </div>
    </div>
  );
}
