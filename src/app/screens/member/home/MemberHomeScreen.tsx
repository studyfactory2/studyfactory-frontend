import { useState } from 'react';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import {
  LegacyPlanDraftNotice,
  MemberMonthlyGoal,
} from '../../../features/plans/PlanDraftRecovery';
import { SharedPlanEditor } from '../../../features/plans/SharedPlanEditor';
import { addDays, getWeekStartKey } from '../../../shared/lib/seoul-date';
import { HomeBreakStudy } from './components/HomeBreakStudy';
import { HomeDailyTasks } from './components/HomeDailyTasks';
import { HomeHero } from './components/HomeHero';
import { HomePresence } from './components/HomePresence';
import { HomeQrPresence } from './components/HomeQrPresence';
import { HomeQuickNav } from './components/HomeQuickNav';
import { MemberHomeLayout } from './components/MemberHomeLayout';
import { useMemberHome } from './hooks/useMemberHome';

export function MemberHomeScreen() {
  const { branchId, memberId, memberName, ownerKey } = useSession();

  if (memberId === null || branchId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberHomeDashboard
      branchId={branchId}
      key={ownerKey}
      memberId={memberId}
      memberName={memberName ?? '회원'}
      queryOwnerKey={ownerKey}
    />
  );
}

function MemberHomeDashboard({
  branchId,
  memberId,
  memberName,
  queryOwnerKey,
}: {
  branchId: number;
  memberId: number;
  memberName: string;
  queryOwnerKey: SessionOwnerKey;
}) {
  const home = useMemberHome(memberId, branchId, queryOwnerKey);
  // Until the member browses another date, the editor follows Seoul's today.
  // Drafts belong to their week in the shared editor, not to this navigation.
  const [selectedPlanDate, setSelectedPlanDate] = useState<string | null>(null);
  const planDate = selectedPlanDate ?? home.today.dateKey;
  const planWeek = getWeekStartKey(planDate);
  const planDay = Math.round(
    (Date.parse(`${planDate}T00:00:00Z`) -
      Date.parse(`${planWeek}T00:00:00Z`)) /
      86_400_000,
  );

  return (
    <MemberHomeLayout
      presence={
        <HomePresence
          checkedIn={home.presence.checkedIn}
          checkedInAt={home.presence.checkedInAt}
          dateKey={home.today.dateKey}
          onPresenceRetry={home.presence.onRetry}
          presenceAction={
            <HomeQrPresence
              action={home.attendance.action}
              errorMessage={home.attendance.errorMessage}
              loading={home.attendance.loading}
              onReset={home.attendance.onReset}
              onSubmit={home.attendance.onSubmit}
            />
          }
          presenceError={home.presence.errorMessage}
          presenceLoading={home.presence.loading}
        />
      }
      shortcuts={<HomeQuickNav beverage={home.beverage} leave={home.leave} />}
      study={
        <>
          <HomeHero
            asOf={home.studyTime.asOf}
            dayBlocks={home.studyTime.dayBlocks}
            memberName={memberName}
            onStudyTimeRetry={home.studyTime.onRetry}
            recognizedSeconds={home.studyTime.recognizedSeconds}
            recognizedPeriodSeconds={home.studyTime.recognizedPeriodSeconds}
            recognizedBreakSeconds={home.studyTime.recognizedBreakSeconds}
            studyTimeError={home.studyTime.errorMessage}
            studyTimeLoading={home.studyTime.loading}
          />

          <HomeBreakStudy
            actionError={home.breakStudy.actionError}
            actionLoading={home.breakStudy.actionLoading}
            checkedIn={home.presence.checkedIn}
            errorMessage={home.breakStudy.errorMessage}
            loading={home.breakStudy.loading}
            onRetry={home.breakStudy.onRetry}
            onStart={home.breakStudy.onStart}
            onStop={home.breakStudy.onStop}
            status={home.breakStudy.status}
          />
        </>
      }
    >
      <HomeDailyTasks
        memberId={memberId}
        ownerKey={queryOwnerKey}
        today={home.today.dateKey}
      />
      <LegacyPlanDraftNotice memberId={memberId} />
      <SharedPlanEditor
        compactNavigation
        dayIndex={planDay}
        footer={
          <MemberMonthlyGoal
            memberId={memberId}
            monthKey={planDate.slice(0, 7)}
            ownerKey={queryOwnerKey}
          />
        }
        memberId={memberId}
        onDateChange={(week, day) => setSelectedPlanDate(addDays(week, day))}
        onDayChange={(day) => setSelectedPlanDate(addDays(planWeek, day))}
        onWeekChange={(week) => setSelectedPlanDate(addDays(week, planDay))}
        ownerKey={queryOwnerKey}
        showMealPlans={false}
        title="교시별 계획"
        weekStartDate={planWeek}
      />
    </MemberHomeLayout>
  );
}
