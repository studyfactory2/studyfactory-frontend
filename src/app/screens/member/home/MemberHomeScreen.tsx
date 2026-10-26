import { useSession, type SessionOwnerKey } from '../../../core/session';
import { HomeBreakStudy } from './components/HomeBreakStudy';
import { HomeHero } from './components/HomeHero';
import { HomePresence } from './components/HomePresence';
import { HomeQrPresence } from './components/HomeQrPresence';
import { HomeQuickNav } from './components/HomeQuickNav';
import { HomeTodayPlan } from './components/HomeTodayPlan';
import { HomeWeekSummary } from './components/HomeWeekSummary';
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
      <HomeTodayPlan
        errorMessage={home.weeklyPlan.errorMessage}
        loading={home.weeklyPlan.loading}
        onRetry={home.weeklyPlan.onRetry}
        periods={home.weeklyPlan.todayPeriods}
      />
      <HomeWeekSummary
        errorMessage={home.weeklyPlan.errorMessage}
        loading={home.weeklyPlan.loading}
        onRetry={home.weeklyPlan.onRetry}
        summary={home.weeklyPlan.summary}
      />
    </MemberHomeLayout>
  );
}
