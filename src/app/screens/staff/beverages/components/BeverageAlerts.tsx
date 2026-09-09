import type { ReactNode } from 'react';
import { Check, Pencil, RotateCcw } from 'lucide-react';
import { Card, CardHeader, Spinner } from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import {
  formatDrinkList,
  type BeverageAlert,
  type UnseatedDrinker,
} from '../model/staff-beverages';

type BeverageAlertsProps = {
  changes: BeverageAlert[];
  changesErrorMessage: string | null;
  changesLoading: boolean;
  changesOnRetry: () => void;
  changesReady: boolean;
  lateLeaves: BeverageAlert[];
  lateLeavesErrorMessage: string | null;
  lateLeavesLoading: boolean;
  lateLeavesOnRetry: () => void;
  lateLeavesReady: boolean;
  onOpenEditor: (memberId: number) => void;
  unseated: UnseatedDrinker[];
  unseatedErrorMessage: string | null;
  unseatedLoading: boolean;
  unseatedOnRetry: () => void;
  unseatedReady: boolean;
};

export function BeverageAlerts({
  changes,
  changesErrorMessage,
  changesLoading,
  changesOnRetry,
  changesReady,
  lateLeaves,
  lateLeavesErrorMessage,
  lateLeavesLoading,
  lateLeavesOnRetry,
  lateLeavesReady,
  onOpenEditor,
  unseated,
  unseatedErrorMessage,
  unseatedLoading,
  unseatedOnRetry,
  unseatedReady,
}: BeverageAlertsProps) {
  const allClear =
    changesReady &&
    !changesLoading &&
    !changesErrorMessage &&
    changes.length === 0 &&
    lateLeavesReady &&
    !lateLeavesLoading &&
    !lateLeavesErrorMessage &&
    lateLeaves.length === 0 &&
    unseatedReady &&
    !unseatedLoading &&
    !unseatedErrorMessage &&
    unseated.length === 0;

  return (
    <Card
      className={cx(
        'staff-bev__card staff-bev__attention-card',
        allClear && 'is-clear',
      )}
      padding="sm"
    >
      <CardHeader title="확인 필요" />

      {allClear ? (
        <p className="staff-bev__attention-clear">
          <Check aria-hidden="true" size={14} />
          특이사항 없음
        </p>
      ) : (
        <div className="staff-bev__attention-groups">
          <AlertGroup
            errorMessage={changesErrorMessage}
            items={changes}
            loading={changesLoading}
            loadingLabel="오늘 변경된 음료를 확인하는 중"
            onRetry={changesOnRetry}
            title="오늘 신청·변경"
          />
          <AlertGroup
            errorMessage={lateLeavesErrorMessage}
            items={lateLeaves}
            loading={lateLeavesLoading}
            loadingLabel="휴무 신청을 확인하는 중"
            note="이미 만든 음료가 남을 수 있어요."
            onRetry={lateLeavesOnRetry}
            title="8시 이후 휴무 신청"
            tone="warn"
          />
          <UnseatedOrders
            errorMessage={unseatedErrorMessage}
            items={unseated}
            loading={unseatedLoading}
            onOpenEditor={onOpenEditor}
            onRetry={unseatedOnRetry}
          />
        </div>
      )}
    </Card>
  );
}

function AlertGroup({
  errorMessage,
  items,
  loading,
  loadingLabel,
  note,
  onRetry,
  title,
  tone,
}: {
  errorMessage: string | null;
  items: BeverageAlert[];
  loading: boolean;
  loadingLabel: string;
  note?: string;
  onRetry: () => void;
  title: string;
  tone?: 'warn';
}) {
  if (!loading && !errorMessage && items.length === 0) {
    return null;
  }

  return (
    <AttentionGroup
      count={!loading && !errorMessage ? items.length : null}
      title={title}
      tone={tone}
    >
      {loading ? (
        <CompactLoading label={loadingLabel} />
      ) : errorMessage ? (
        <CompactError message={errorMessage} onRetry={onRetry} title={title} />
      ) : (
        <>
          {note && <p className="staff-bev__attention-note">{note}</p>}
          <ul className="staff-bev__attention-list">
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <span className="staff-bev__attention-detail">
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AttentionGroup>
  );
}

function UnseatedOrders({
  errorMessage,
  items,
  loading,
  onOpenEditor,
  onRetry,
}: {
  errorMessage: string | null;
  items: UnseatedDrinker[];
  loading: boolean;
  onOpenEditor: (memberId: number) => void;
  onRetry: () => void;
}) {
  if (!loading && !errorMessage && items.length === 0) {
    return null;
  }

  return (
    <AttentionGroup
      count={!loading && !errorMessage ? items.length : null}
      title="좌석 확인 필요"
    >
      {loading ? (
        <CompactLoading label="좌석 배정을 확인하는 중" />
      ) : errorMessage ? (
        <CompactError
          message={errorMessage}
          onRetry={onRetry}
          title="좌석 확인 필요"
        />
      ) : (
        <ul className="staff-bev__unseated-list">
          {items.map((member) => {
            const drinkLabel = member.away
              ? '오전 휴무 · 제조 제외'
              : formatDrinkList(member.drinks);

            return (
              <li key={member.memberId}>
                <button
                  aria-label={`${formatSeatIssue(member)}, ${
                    member.memberName
                  }${member.staff ? ', 스텝' : ''}, ${drinkLabel}${
                    member.tumbler ? ', 텀블러' : ''
                  }, 음료 편집`}
                  className={cx(
                    'staff-bev__unseated-order',
                    member.away && 'is-away',
                  )}
                  onClick={() => onOpenEditor(member.memberId)}
                  type="button"
                >
                  <span className="staff-bev__unseated-person">
                    <strong>{member.memberName}</strong>
                    {member.staff && (
                      <span className="staff-bev__role">스텝</span>
                    )}
                    {!member.staff && (
                      <span className="staff-bev__role">
                        {member.mapMissing
                          ? `${member.seatNumber}번 · 배치도 누락`
                          : '미배정'}
                      </span>
                    )}
                  </span>
                  <span className="staff-bev__unseated-meta">
                    {member.tumbler && (
                      <span
                        aria-hidden="true"
                        className="staff-bev__tumbler-badge"
                      >
                        텀
                      </span>
                    )}
                    <span>{drinkLabel}</span>
                    <Pencil aria-hidden="true" size={11} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AttentionGroup>
  );
}

function formatSeatIssue(member: UnseatedDrinker) {
  if (member.staff) {
    return '좌석 없음';
  }

  return member.mapMissing
    ? `${member.seatNumber}번 좌석이 배치도에 없음`
    : '좌석 미배정';
}

function AttentionGroup({
  children,
  count,
  title,
  tone,
}: {
  children: ReactNode;
  count: number | null;
  title: string;
  tone?: 'warn';
}) {
  return (
    <section
      className={cx('staff-bev__attention-group', tone === 'warn' && 'is-warn')}
    >
      <header className="staff-bev__attention-head">
        <h4>{title}</h4>
        {count !== null && count > 0 && (
          <span className="staff-bev__badge">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function CompactLoading({ label }: { label: string }) {
  return (
    <div className="staff-bev__compact-state" role="status">
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

function CompactError({
  message,
  onRetry,
  title,
}: {
  message: string;
  onRetry: () => void;
  title: string;
}) {
  return (
    <div className="staff-bev__compact-state is-error" role="alert">
      <span>{message}</span>
      <button aria-label={`${title} 다시 시도`} onClick={onRetry} type="button">
        <RotateCcw aria-hidden="true" size={12} />
        다시
      </button>
    </div>
  );
}
