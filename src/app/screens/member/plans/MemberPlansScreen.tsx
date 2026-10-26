import { useSearchParams } from 'react-router-dom';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import {
  LegacyPlanDraftNotice,
  MemberMonthlyGoal,
} from '../../../features/plans/PlanDraftRecovery';
import { SharedPlanEditor } from '../../../features/plans/SharedPlanEditor';
import { useSeoulToday } from '../../../shared/hooks/useSeoulToday';
import {
  addDays,
  getWeekStartKey,
  isValidDateKey,
} from '../../../shared/lib/seoul-date';
import './styles/MemberPlansScreen.css';

export function MemberPlansScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberPlansWorkspace
      key={ownerKey}
      memberId={memberId}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberPlansWorkspace({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const today = useSeoulToday();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentWeek = getWeekStartKey(today.dateKey);
  const requestedWeek = searchParams.get('week');
  const weekStartDate =
    requestedWeek && isValidDateKey(requestedWeek)
      ? getWeekStartKey(requestedWeek)
      : currentWeek;
  const requestedDay = searchParams.get('day');
  const dayIndex =
    requestedDay !== null && /^[0-6]$/.test(requestedDay)
      ? Number(requestedDay)
      : weekStartDate === currentWeek
        ? Math.round(
            (Date.parse(`${today.dateKey}T00:00:00Z`) -
              Date.parse(`${currentWeek}T00:00:00Z`)) /
              86_400_000,
          )
        : 0;
  const monthKey = addDays(weekStartDate, dayIndex).slice(0, 7);

  const navigatePlanDate = (week: string, day: number, replace = false) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('week', week);
    nextParams.set('day', String(day));
    // Navigation does not discard or submit week-owned editing drafts.
    setSearchParams(nextParams, { replace });
  };

  return (
    <section className="member-plans">
      <LegacyPlanDraftNotice memberId={memberId} />
      <SharedPlanEditor
        dayIndex={dayIndex}
        memberId={memberId}
        onDateChange={(week, day) => navigatePlanDate(week, day)}
        onDayChange={(day) => navigatePlanDate(weekStartDate, day, true)}
        onWeekChange={(week) => navigatePlanDate(week, dayIndex)}
        ownerKey={queryOwnerKey}
        title="교시별 계획"
        weekStartDate={weekStartDate}
      />
      <MemberMonthlyGoal
        memberId={memberId}
        monthKey={monthKey}
        ownerKey={queryOwnerKey}
      />
    </section>
  );
}
