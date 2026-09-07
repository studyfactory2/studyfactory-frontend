import { RefreshCw } from 'lucide-react';
import { useSession } from '../../../core/session';
import type { SessionOwnerKey } from '../../../core/session';
import { EmptyState, Instrument } from '../../../shared/ui';
import { cx } from '../../../shared/lib/cx';
import { formatKoreanDate } from '../../../shared/lib/seoul-date';
import { BeverageAlerts } from './components/BeverageAlerts';
import { BeverageMakingBoard } from './components/BeverageMakingBoard';
import { BeverageMemberEditor } from './components/BeverageMemberEditor';
import { BeverageRoomMap } from './components/BeverageRoomMap';
import { useStaffBeverages } from './hooks/useStaffBeverages';
import './styles/staff-beverages.css';

export function StaffBeveragesScreen() {
  const session = useSession();

  if (
    session.memberId === null ||
    session.branchId === null ||
    session.ownerKey === null
  ) {
    return (
      <EmptyState
        description="잠시 후에도 이 화면이 보이면 다시 로그인해 주세요."
        title="로그인 정보를 확인하는 중이에요."
      />
    );
  }

  return (
    <StaffBeveragesContent
      branchId={session.branchId}
      memberId={session.memberId}
      ownerKey={session.ownerKey}
    />
  );
}

function StaffBeveragesContent({
  branchId,
  memberId,
  ownerKey,
}: {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
}) {
  const { alerts, editor, freshness, making, room, today } = useStaffBeverages({
    branchId,
    memberId,
    ownerKey,
  });

  return (
    <div className="staff-bev">
      <Instrument
        label="오늘 음료"
        note={
          <span className="staff-bev__asof">
            <span>{formatKoreanDate(today.dateKey)}</span>
            {freshness.updatedAtLabel && (
              <span className="staff-bev__asof-time">
                {freshness.updatedAtLabel} 기준
              </span>
            )}
            {/*
              A morning screen that can go stale between the lock screen and
              the counter needs an obvious way to pull fresh numbers, and an
              honest note of how old the current ones are.
            */}
            <button
              aria-label="음료 목록 새로고침"
              className={cx(
                'staff-bev__refresh',
                freshness.refreshing && 'is-refreshing',
              )}
              disabled={freshness.refreshing}
              onClick={freshness.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={14} />
              갱신
            </button>
          </span>
        }
      >
        <div className="staff-bev__metrics">
          <p className="staff-bev__metric is-lead">
            <span className="staff-bev__metric-key">만들 음료</span>
            <strong>
              {making.ready ? making.toMake : '—'}
              <small>잔</small>
            </strong>
            <span className="staff-bev__metric-sub">
              {making.kindCount}가지
            </span>
          </p>
          <p className="staff-bev__metric">
            <span className="staff-bev__metric-key">컵</span>
            <strong>
              {making.ready ? making.cupToMake : '—'}
              <small>잔</small>
            </strong>
          </p>
          <p className="staff-bev__metric">
            <span className="staff-bev__metric-key">텀블러</span>
            <strong>
              {making.ready ? making.tumblerToMake : '—'}
              <small>잔</small>
            </strong>
          </p>
          <p className="staff-bev__metric">
            <span className="staff-bev__metric-key">휴무 제외</span>
            <strong>
              {making.ready ? making.deduction : '—'}
              <small>잔</small>
            </strong>
            <span className="staff-bev__metric-sub">월차 · 오전반차</span>
          </p>
        </div>
      </Instrument>

      <div className="staff-bev__body">
        <div className="staff-bev__col">
          <BeverageMakingBoard
            cup={making.cup}
            cupToMake={making.cupToMake}
            errorMessage={making.errorMessage}
            loading={making.loading}
            onOpenEditor={editor.onOpen}
            onRetry={making.onRetry}
            ready={making.ready}
            tumbler={making.tumbler}
            tumblerToMake={making.tumblerToMake}
          />
        </div>

        <div className="staff-bev__col">
          <BeverageRoomMap
            errorMessage={room.errorMessage}
            loading={room.loading}
            onOpenEditor={editor.onOpen}
            onRetry={room.onRetry}
            onSelect={room.onSelect}
            rooms={room.rooms}
            selected={room.selected}
            unseated={room.unseated}
          />
          <BeverageAlerts
            changes={alerts.changes}
            errorMessage={alerts.errorMessage}
            lateLeaves={alerts.lateLeaves}
            loading={alerts.loading}
          />
        </div>
      </div>

      <BeverageMemberEditor
        onClose={editor.onClose}
        onSave={editor.onSave}
        saving={editor.saving}
        target={editor.target}
      />
    </div>
  );
}
