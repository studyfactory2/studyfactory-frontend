import {
  Card,
  CardHeader,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import {
  formatPrice,
  formatShiftPeriod,
  formatTaskLabel,
  type MealsSummary,
  type ShiftSummary,
} from '../model/staff-home';
import { SEOUL_WEEKDAY_LABELS } from '../../../../shared/lib/seoul-date';
import type { WeekdayName } from '../../../../shared/lib/seoul-date';

type StaffHomeAsideProps = {
  meals: MealsSummary & {
    errorMessage: string | null;
    loading: boolean;
    onRetry: () => void;
  };
  shifts: ShiftSummary & {
    errorMessage: string | null;
    loading: boolean;
  };
  todayWeekday: WeekdayName;
};

/** MONDAY-first, matching the schedule grid rather than the calendar. */
const WEEKDAY_INDEX: Record<WeekdayName, number> = {
  FRIDAY: 5,
  MONDAY: 1,
  SATURDAY: 6,
  SUNDAY: 0,
  THURSDAY: 4,
  TUESDAY: 2,
  WEDNESDAY: 3,
};

export function StaffHomeAside({
  meals,
  shifts,
  todayWeekday,
}: StaffHomeAsideProps) {
  return (
    <div className="staff-home__aside">
      <Card className="staff-home__card">
        <CardHeader title="오늘 반찬" />

        {meals.loading ? (
          <SectionLoading label="반찬 신청을 불러오는 중" />
        ) : meals.errorMessage ? (
          <SectionError message={meals.errorMessage} onRetry={meals.onRetry} />
        ) : (
          <div className="staff-home__meals">
            <MealBox label="점심" meal={meals.lunch} />
            <MealBox label="저녁" meal={meals.dinner} />
          </div>
        )}
      </Card>

      {shifts.week.length > 0 && !shifts.errorMessage && (
        <Card className="staff-home__card">
          <CardHeader title="이번 주 내 근무" />
          <ul className="staff-home__week">
            {shifts.week.map((cell) => (
              <li
                className={
                  cell.dayOfWeek === todayWeekday
                    ? 'staff-home__week-row is-today'
                    : 'staff-home__week-row'
                }
                key={`${cell.dayOfWeek}-${cell.shift}-${cell.taskType}`}
              >
                <span>
                  {SEOUL_WEEKDAY_LABELS[WEEKDAY_INDEX[cell.dayOfWeek]]} ·{' '}
                  {formatShiftPeriod(cell.shift)}
                </span>
                <span className="staff-home__tag is-source">
                  {formatTaskLabel(cell.taskType)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function MealBox({
  label,
  meal,
}: {
  label: string;
  meal: MealsSummary['lunch'];
}) {
  return (
    <div className="staff-home__meal">
      <span className="staff-home__meal-key">{label}</span>
      <strong>
        {meal.memberCount}
        <small>명</small>
      </strong>
      <span className="staff-home__meal-sum">
        {formatPrice(meal.totalPrice)}
      </span>
    </div>
  );
}
