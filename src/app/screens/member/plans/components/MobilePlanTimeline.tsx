import { PencilLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../../../../shared/ui';
import { getPlanPeriodStatusView } from '../model/plan.status';
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
  const selectedDayLabel = selectedDay?.longLabel ?? '선택한 요일';

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

      <section
        aria-label={`${selectedDateLabel} 계획`}
        className="member-plans__day-timeline"
      >
        <header>
          <div>
            <p>{selectedDateLabel}</p>
            <h4>{selectedDayLabel}의 계획</h4>
          </div>
          <Badge tone={selectedDayTotal ? 'positive' : 'neutral'}>
            {selectedDayCompleted}/{selectedDayTotal} 완료
          </Badge>
        </header>

        <ol className="member-plans__timeline">
          {rows.map((row) => {
            const cellItems = getItemsForCell(
              row.periodIndex,
              selectedDayIndex,
            );
            const view = getPlanPeriodStatusView(row, cellItems);
            const [startTime, endTime] = splitPeriodTime(row.time);
            const itemSummary = getPlanItemSummary(cellItems);

            return (
              <li
                className={`member-plans__timeline-row is-${view.status}`}
                key={row.periodIndex}
              >
                <span
                  aria-hidden="true"
                  className="member-plans__timeline-clock"
                >
                  <strong>{startTime}</strong>
                  {endTime && <small>{endTime}</small>}
                </span>

                <span
                  aria-hidden="true"
                  className="member-plans__timeline-rail"
                >
                  <i />
                </span>

                <button
                  aria-label={`${selectedDayLabel} ${row.label} ${row.time}, ${view.label}, ${itemSummary}. 계획 편집`}
                  className="member-plans__timeline-card"
                  disabled={editingDisabled}
                  onClick={() =>
                    onOpenEditor({
                      dayIndex: selectedDayIndex,
                      periodIndex: row.periodIndex,
                    })
                  }
                  type="button"
                >
                  <span className="member-plans__timeline-head">
                    <strong>{row.label}</strong>
                    <small>{row.duration}</small>
                    {view.status !== 'empty' && (
                      <Badge tone={view.tone}>{view.label}</Badge>
                    )}
                  </span>

                  <span className="member-plans__timeline-body">
                    {renderItems(cellItems, true)}
                  </span>

                  <PencilLine
                    aria-hidden="true"
                    className="member-plans__timeline-pencil"
                    size={16}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function splitPeriodTime(time: string) {
  const [start, end] = time.split('–');
  return [start?.trim() ?? time, end?.trim() ?? ''] as const;
}

function getPlanItemSummary(items: readonly EditablePlanItem[]) {
  const populatedItems = items
    .map((item) => item.content.trim())
    .filter(Boolean);

  if (!populatedItems.length) {
    return '등록된 계획 없음';
  }

  const visibleItems = populatedItems.slice(0, 2).join(', ');
  const remainingCount = populatedItems.length - 2;

  return remainingCount > 0
    ? `${visibleItems} 외 ${remainingCount}개`
    : visibleItems;
}
