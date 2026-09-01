import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PencilLine,
} from 'lucide-react';
import type { Ref } from 'react';
import { Badge } from '../../../../components/ui';
import { getCellItems } from '../plan-item-utils';
import {
  CellItems,
  PlanCellButton,
  PlanSummary,
  type PlanCell,
  type PlanDay,
  type PlanItem,
  type PlanRow,
} from './PlanPrimitives';

export type WeeklyPlannerProps = {
  completedCount: number;
  days: readonly PlanDay[];
  daySelectionDisabled: boolean;
  editingDisabled: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  items: PlanItem[];
  navigationDisabled: boolean;
  onMoveToToday: () => void;
  onMoveWeek: (amount: -1 | 1) => void;
  onOpenEditor: (cell: PlanCell) => void;
  onSelectDay: (dayIndex: number) => void;
  rows: readonly PlanRow[];
  selectedDateLabel: string;
  selectedDayCompleted: number;
  selectedDayIndex: number;
  selectedDayTotal: number;
  totalCount: number;
  weekRangeLabel: string;
};

export function WeeklyPlanner({
  completedCount,
  days,
  daySelectionDisabled,
  editingDisabled,
  headingRef,
  items,
  navigationDisabled,
  onMoveToToday,
  onMoveWeek,
  onOpenEditor,
  onSelectDay,
  rows,
  selectedDateLabel,
  selectedDayCompleted,
  selectedDayIndex,
  selectedDayTotal,
  totalCount,
  weekRangeLabel,
}: WeeklyPlannerProps) {
  const selectedDay = days.find((day) => day.dayIndex === selectedDayIndex);

  return (
    <section
      className="member-plans__planner"
      aria-labelledby="weekly-plan-title"
    >
      <header className="member-plans__planner-header">
        <div>
          <p className="member-plans__section-label">WEEKLY RHYTHM</p>
          <h3
            aria-label={`주간 계획표, ${weekRangeLabel}`}
            id="weekly-plan-title"
            ref={headingRef}
            tabIndex={-1}
          >
            주간 계획표
          </h3>
          <span>{weekRangeLabel}</span>
        </div>
        <div className="member-plans__week-controls">
          <button
            aria-label="이전 주"
            className="member-plans__icon-button"
            disabled={navigationDisabled}
            onClick={() => onMoveWeek(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <button
            className="member-plans__today-button"
            disabled={navigationDisabled}
            onClick={onMoveToToday}
            type="button"
          >
            오늘
          </button>
          <button
            aria-label="다음 주"
            className="member-plans__icon-button"
            disabled={navigationDisabled}
            onClick={() => onMoveWeek(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        </div>
      </header>

      <div className="member-plans__summary" aria-label="주간 계획 요약">
        <PlanSummary
          icon={<ClipboardList size={19} />}
          label="전체 계획"
          value={`${totalCount}개`}
        />
        <PlanSummary
          icon={<Check size={19} />}
          label="완료"
          tone="positive"
          value={`${completedCount}개`}
        />
        <PlanSummary
          icon={<CalendarDays size={19} />}
          label={`${selectedDay?.longLabel ?? '선택한 요일'} 계획`}
          value={`${selectedDayCompleted}/${selectedDayTotal}`}
        />
      </div>

      <div className="member-plans__desktop-board">
        <div className="member-plans__board-scroll">
          <table className="member-plans__board">
            <caption className="member-plans__sr-only">
              월요일부터 일요일까지 교시별 주간 계획
            </caption>
            <thead>
              <tr>
                <th scope="col">시간</th>
                {days.map((day) => (
                  <th
                    className={day.isToday ? 'is-today' : ''}
                    key={day.key}
                    scope="col"
                  >
                    <span>{day.label}</span>
                    <strong>{day.shortDateLabel}</strong>
                    {day.isToday && <small>오늘</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className={row.isBreak ? 'is-break' : ''}
                  key={row.periodIndex}
                >
                  <th scope="row">
                    <strong>{row.label}</strong>
                    <span>{row.time}</span>
                  </th>
                  {days.map((day) => (
                    <td key={`${row.periodIndex}-${day.dayIndex}`}>
                      <PlanCellButton
                        ariaLabel={`${day.longLabel} ${row.label} 계획 편집`}
                        disabled={editingDisabled}
                        items={getCellItems(
                          items,
                          row.periodIndex,
                          day.dayIndex,
                        )}
                        onClick={() =>
                          onOpenEditor({
                            dayIndex: day.dayIndex,
                            periodIndex: row.periodIndex,
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                <CellItems
                  compact
                  items={getCellItems(items, row.periodIndex, selectedDayIndex)}
                />
              </span>
              <PencilLine aria-hidden="true" size={17} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
