import { InstallPrompt } from '../../../core/pwa/InstallPrompt';
import { useSession, type SessionOwnerKey } from '../../../core/session';
import { formatKoreanMonth } from '../../../shared/lib/seoul-date';
import { ScreenHeader } from '../../../shared/ui';
import { MoreMenu } from './components/MoreMenu';
import { MoreMonthPanel } from './components/MoreMonthPanel';
import { MoreProfileCard } from './components/MoreProfileCard';
import { MoreStatTiles } from './components/MoreStatTiles';
import { useMemberMore } from './hooks/useMemberMore';
import { MORE_MENU_ENTRIES } from './model/more.menu';
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
  const monthLabel = formatKoreanMonth(today.year, today.month);

  return (
    <section className="member-more">
      <ScreenHeader
        eyebrow="MEMBER · MORE"
        subtitle="내 정보와 생활 기능을 한곳에서 관리해요."
        title="더보기"
      />

      {/*
       * Identity reads left, the month reads right. Splitting 7/5 keeps both
       * at a width their content actually fills instead of one band of text
       * stretched the whole way across.
       */}
      <div className="member-more__top">
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

        <MoreMonthPanel
          attendedDayCount={stats.attendedDayCount}
          elapsedDayCount={stats.elapsedDayCount}
          errorMessage={stats.errorMessage}
          loading={stats.loading}
          monthLabel={monthLabel}
          onRetry={stats.onRetry}
          studySeconds={stats.studySeconds}
          weekPoints={stats.weekPoints}
        />
      </div>

      <MoreStatTiles
        attendedDayCount={stats.attendedDayCount}
        averageSeconds={stats.averageSeconds}
        elapsedDayCount={stats.elapsedDayCount}
        hidden={stats.loading || stats.errorMessage !== null}
        requestedLeaveCount={stats.requestedLeaveCount}
        weekPoints={stats.weekPoints}
      />

      <div className="member-more__section-head">
        <h3>바로가기</h3>
      </div>

      <MoreMenu
        entries={MORE_MENU_ENTRIES}
        footer={<InstallPrompt title="앱" />}
        values={more.menuValues}
      />
    </section>
  );
}
