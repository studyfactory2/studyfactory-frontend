import { useSession, type SessionOwnerKey } from '../../../core/session';
import { formatKoreanMonth } from '../../../shared/lib/seoul-date';
import { ScreenHeader } from '../../../shared/ui';
import { MoreMenu } from './components/MoreMenu';
import { MoreProfileCard } from './components/MoreProfileCard';
import { MoreStatStrip } from './components/MoreStatStrip';
import { useMemberMore } from './hooks/useMemberMore';
import { MORE_MENU_GROUPS } from './model/more.menu';
import './styles/MemberMoreScreen.css';

export function MemberMoreScreen() {
  const { memberId, ownerKey } = useSession();

  if (memberId === null || ownerKey === null) {
    return null;
  }

  return (
    <MemberMore key={ownerKey} memberId={memberId} queryOwnerKey={ownerKey} />
  );
}

function MemberMore({
  memberId,
  queryOwnerKey,
}: {
  memberId: number;
  queryOwnerKey: SessionOwnerKey;
}) {
  const more = useMemberMore(memberId, queryOwnerKey);
  const { profile, stats, today } = more;

  return (
    <section className="member-more">
      <ScreenHeader
        eyebrow="MEMBER · MORE"
        subtitle="내 정보와 생활 기능을 한곳에서 관리해요."
        title="더보기"
      />

      <MoreProfileCard
        branchName={profile.branchName}
        certificationLabel={profile.certificationLabel}
        errorMessage={profile.errorMessage}
        joinDateLabel={profile.joinDateLabel}
        joinedDayCount={profile.joinedDayCount}
        loading={profile.loading}
        name={profile.name}
        onRetry={profile.onRetry}
        seatLabel={profile.seatLabel}
      />

      <MoreStatStrip
        attendedDayCount={stats.attendedDayCount}
        errorMessage={stats.errorMessage}
        requestedLeaveCount={stats.requestedLeaveCount}
        loading={stats.loading}
        monthLabel={formatKoreanMonth(today.year, today.month)}
        onRetry={stats.onRetry}
        studySeconds={stats.studySeconds}
      />

      <MoreMenu groups={MORE_MENU_GROUPS} />
    </section>
  );
}
