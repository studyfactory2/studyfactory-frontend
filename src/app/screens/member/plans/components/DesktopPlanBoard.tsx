import { CirclePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { getPlanPeriodStatus } from '../model/plan.status';
import type {
  EditablePlanItem,
  PlanCell,
  PlanDay,
  PlanRow,
} from '../model/plan.types';
import '../styles/DesktopPlanBoard.css';

export type DesktopPlanBoardProps = {
  days: readonly PlanDay[];
  editingDisabled: boolean;
  getItemsForCell: (
    periodIndex: number,
    dayIndex: number,
  ) => readonly EditablePlanItem[];
  onOpenEditor: (cell: PlanCell) => void;
  renderItems: (
    items: readonly EditablePlanItem[],
    compact?: boolean,
  ) => ReactNode;
  rows: readonly PlanRow[];
};

export function DesktopPlanBoard({
  days,
  editingDisabled,
  getItemsForCell,
  onOpenEditor,
  renderItems,
  rows,
}: DesktopPlanBoardProps) {
  return (
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
                {days.map((day) => {
                  const cellItems = getItemsForCell(
                    row.periodIndex,
                    day.dayIndex,
                  );
                  const status = getPlanPeriodStatus(row, cellItems);

                  return (
                    <td
                      className={day.isToday ? 'is-today' : ''}
                      key={`${row.periodIndex}-${day.dayIndex}`}
                    >
                      <button
                        aria-label={`${day.longLabel} ${row.label} 계획 편집`}
                        className={`member-plans__cell is-${status}`}
                        disabled={editingDisabled}
                        onClick={() =>
                          onOpenEditor({
                            dayIndex: day.dayIndex,
                            periodIndex: row.periodIndex,
                          })
                        }
                        type="button"
                      >
                        {renderItems(cellItems)}
                        <span className="member-plans__cell-edit">
                          <CirclePlus aria-hidden="true" size={15} />
                          {cellItems.length ? '편집' : '계획 추가'}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
