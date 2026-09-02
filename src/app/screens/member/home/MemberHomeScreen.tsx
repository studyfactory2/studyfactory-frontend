import { useSession, type SessionOwnerKey } from '../../../core/session';
import { HomeBeverage } from './components/HomeBeverage';
import { HomeBreakStudy } from './components/HomeBreakStudy';
import { HomeHero } from './components/HomeHero';
import { HomeQrPresence } from './components/HomeQrPresence';
import { HomeQuickNav } from './components/HomeQuickNav';
import { HomeTodayPlan } from './components/HomeTodayPlan';
import { HomeUpcomingLeave } from './components/HomeUpcomingLeave';
import { HomeWeekSummary } from './components/HomeWeekSummary';
import { useMemberHome } from './hooks/useMemberHome';
import './styles/MemberHomeScreen.css';

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
    <div className="member-home">
      <div className="member-home__primary">
        <HomeHero
          checkedIn={home.presence.checkedIn}
          checkedInAt={home.presence.checkedInAt}
          dateKey={home.today.dateKey}
          memberName={memberName}
          onPresenceRetry={home.presence.onRetry}
          onStudyTimeRetry={home.studyTime.onRetry}
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
          recognizedSeconds={home.studyTime.recognizedSeconds}
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

        <HomeTodayPlan
          errorMessage={home.weeklyPlan.errorMessage}
          loading={home.weeklyPlan.loading}
          onRetry={home.weeklyPlan.onRetry}
          periods={home.weeklyPlan.todayPeriods}
        />
      </div>

      <div className="member-home__aside">
        <HomeWeekSummary
          errorMessage={home.weeklyPlan.errorMessage}
          loading={home.weeklyPlan.loading}
          onRetry={home.weeklyPlan.onRetry}
          summary={home.weeklyPlan.summary}
        />

        <HomeQuickNav />

        <HomeBeverage
          errorMessage={home.beverage.errorMessage}
          items={home.beverage.items}
          loading={home.beverage.loading}
          onRetry={home.beverage.onRetry}
        />

        <HomeUpcomingLeave
          errorMessage={home.leave.errorMessage}
          loading={home.leave.loading}
          onRetry={home.leave.onRetry}
          upcoming={home.leave.upcoming}
        />
      </div>
    </div>
  );
}
