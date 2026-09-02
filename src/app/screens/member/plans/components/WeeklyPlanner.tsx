import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import type {
  EditablePlanItem,
  PlanCell,
  PlanDay,
  PlanRow,
} from '../model/plan.types';
import '../styles/WeeklyPlanner.css';
import { DesktopPlanBoard } from './DesktopPlanBoard';
import { MobilePlanTimeline } from './MobilePlanTimeline';

export type WeeklyPlannerProps = {
  completedCount: number;
  days: readonly PlanDay[];
  daySelectionDisabled: boolean;
  editingDisabled: boolean;
  getItemsForCell: (
    periodIndex: number,
    dayIndex: number,
  ) => readonly EditablePlanItem[];
  headingRef: Ref<HTMLHeadingElement>;
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
  getItemsForCell,
  headingRef,
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

      <DesktopPlanBoard
        days={days}
        editingDisabled={editingDisabled}
        getItemsForCell={getItemsForCell}
        onOpenEditor={onOpenEditor}
        renderItems={renderPlanItems}
        rows={rows}
      />

      <MobilePlanTimeline
        days={days}
        daySelectionDisabled={daySelectionDisabled}
        editingDisabled={editingDisabled}
        getItemsForCell={getItemsForCell}
        onOpenEditor={onOpenEditor}
        onSelectDay={onSelectDay}
        renderItems={renderPlanItems}
        rows={rows}
        selectedDateLabel={selectedDateLabel}
        selectedDayCompleted={selectedDayCompleted}
        selectedDayIndex={selectedDayIndex}
        selectedDayTotal={selectedDayTotal}
      />
    </section>
  );
}

type PlanSummaryProps = {
  icon: ReactNode;
  label: string;
  tone?: 'positive';
  value: string;
};

function PlanSummary({ icon, label, tone, value }: PlanSummaryProps) {
  return (
    <div
      className={
        tone
          ? `member-plans__summary-item is-${tone}`
          : 'member-plans__summary-item'
      }
    >
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function renderPlanItems(items: readonly EditablePlanItem[], compact = false) {
  const populatedItems = items.filter((item) => item.content.trim());
  const visibleCount = compact ? 2 : 3;

  if (!populatedItems.length) {
    return <span className="member-plans__cell-empty">비어 있음</span>;
  }

  return (
    <ul
      className={
        compact
          ? 'member-plans__cell-items is-compact'
          : 'member-plans__cell-items'
      }
    >
      {populatedItems.slice(0, visibleCount).map((item) => (
        <li className={item.done ? 'is-done' : ''} key={item.draftId}>
          <i aria-hidden="true">
            {item.done && <Check size={10} strokeWidth={3} />}
          </i>
          <span>{item.content}</span>
        </li>
      ))}
      {populatedItems.length > visibleCount && (
        <li className="is-more">+{populatedItems.length - visibleCount}개</li>
      )}
    </ul>
  );
}
