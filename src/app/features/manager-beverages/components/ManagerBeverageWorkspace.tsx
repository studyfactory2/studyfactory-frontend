import { useId, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { SessionOwnerKey } from '../../../core/session';
import { cx } from '../../../shared/lib/cx';
import { formatKoreanDate } from '../../../shared/lib/seoul-date';
import { Instrument } from '../../../shared/ui';
import { useManagerBeverages } from '../hooks/useManagerBeverages';
import '../styles/manager-beverages.css';
import { BeverageAlerts } from './BeverageAlerts';
import { BeverageMakingBoard } from './BeverageMakingBoard';
import { BeverageMemberEditor } from './BeverageMemberEditor';
import { BeverageRoomMap } from './BeverageRoomMap';

type ManagerBeverageWorkspaceProps = {
  branchId: number;
  memberId: number;
  ownerKey: SessionOwnerKey;
};

type CompactView = 'making' | 'map' | 'alerts';

/** The shared operational board used by both Staff and Admin branch scopes. */
export function ManagerBeverageWorkspace({
  branchId,
  memberId,
  ownerKey,
}: ManagerBeverageWorkspaceProps) {
  const { alerts, editor, freshness, making, room, today } =
    useManagerBeverages({ branchId, memberId, ownerKey });
  const [compactView, setCompactView] = useState<CompactView>('making');
  const workspaceId = useId();
  const alertsFailed = Boolean(
    alerts.changesErrorMessage ||
    alerts.lateLeavesErrorMessage ||
    alerts.unseatedErrorMessage,
  );
  const alertsReady =
    alerts.changesReady && alerts.lateLeavesReady && alerts.unseatedReady;
  const alertStatus = alertsFailed
    ? '확인 실패'
    : alertsReady
      ? `${alerts.changes.length + alerts.lateLeaves.length + alerts.unseated.length}건`
      : '확인 중';

  const views: { key: CompactView; label: string; status?: string }[] = [
    { key: 'making', label: '제조 목록' },
    { key: 'map', label: '서빙 좌석표' },
    { key: 'alerts', label: '확인 필요', status: alertStatus },
  ];

  return (
    <div className="staff-bev">
      <Instrument
        className="staff-bev__summary"
        label="오늘 음료"
        note={
          <span className="staff-bev__asof">
            <span>{formatKoreanDate(today.dateKey)}</span>
            {freshness.updatedAtLabel && (
              <span className="staff-bev__asof-time">
                {freshness.updatedAtLabel} 기준
              </span>
            )}
            <button
              aria-busy={freshness.refreshing}
              aria-label={
                freshness.refreshing
                  ? '음료 목록 갱신 중'
                  : '음료 목록 새로고침'
              }
              className={cx(
                'staff-bev__refresh',
                freshness.refreshing && 'is-refreshing',
              )}
              disabled={freshness.refreshing}
              onClick={freshness.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={14} />
              {freshness.refreshing ? '갱신 중' : '갱신'}
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
              {making.ready ? `${making.kindCount}가지` : '—'}
            </span>
          </p>
          <p className="staff-bev__metric is-cup">
            <span className="staff-bev__metric-key">컵</span>
            <strong>
              {making.ready ? making.cupToMake : '—'}
              <small>잔</small>
            </strong>
          </p>
          <p className="staff-bev__metric is-tumbler">
            <span className="staff-bev__metric-key">텀블러</span>
            <strong>
              {making.ready ? making.tumblerToMake : '—'}
              <small>잔</small>
            </strong>
          </p>
          <p className="staff-bev__metric is-deduction">
            <span className="staff-bev__metric-key">휴무 제외</span>
            <strong>
              {making.ready ? making.deduction : '—'}
              <small>잔</small>
            </strong>
            <span className="staff-bev__metric-sub">월차 · 오전반차</span>
          </p>
        </div>
      </Instrument>

      <div
        aria-label="음료 작업 보기"
        className="staff-bev__view-switch"
        role="group"
      >
        {views.map((view) => (
          <button
            aria-controls={`${workspaceId}-${view.key}`}
            aria-pressed={compactView === view.key}
            key={view.key}
            onClick={() => setCompactView(view.key)}
            type="button"
          >
            <span>{view.label}</span>
            {view.status && (
              <small
                aria-live="polite"
                className={cx(alertsFailed && 'is-error')}
              >
                {view.status}
              </small>
            )}
          </button>
        ))}
      </div>

      <div className="staff-bev__body" data-view={compactView}>
        <aside aria-label="음료 작업" className="staff-bev__rail">
          <div className="staff-bev__making-panel" id={`${workspaceId}-making`}>
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
          <div className="staff-bev__alerts-panel" id={`${workspaceId}-alerts`}>
            <BeverageAlerts
              changes={alerts.changes}
              changesErrorMessage={alerts.changesErrorMessage}
              changesLoading={alerts.changesLoading}
              changesOnRetry={alerts.changesOnRetry}
              changesReady={alerts.changesReady}
              lateLeaves={alerts.lateLeaves}
              lateLeavesErrorMessage={alerts.lateLeavesErrorMessage}
              lateLeavesLoading={alerts.lateLeavesLoading}
              lateLeavesOnRetry={alerts.lateLeavesOnRetry}
              lateLeavesReady={alerts.lateLeavesReady}
              onOpenEditor={editor.onOpen}
              unseated={alerts.unseated}
              unseatedErrorMessage={alerts.unseatedErrorMessage}
              unseatedLoading={alerts.unseatedLoading}
              unseatedOnRetry={alerts.unseatedOnRetry}
              unseatedReady={alerts.unseatedReady}
            />
          </div>
        </aside>

        <div className="staff-bev__map-panel" id={`${workspaceId}-map`}>
          <BeverageRoomMap
            errorMessage={room.errorMessage}
            loading={room.loading}
            onOpenEditor={editor.onOpen}
            onRetry={room.onRetry}
            onSelect={room.onSelect}
            rooms={room.rooms}
            selected={room.selected}
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
