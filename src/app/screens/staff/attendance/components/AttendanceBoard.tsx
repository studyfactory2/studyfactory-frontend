import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import type { StudyPresenceManualCheckInInput } from '../../../../features/study-presence/study-presence-api';
import { cx } from '../../../../shared/lib/cx';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import {
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type {
  AttendancePaintMode,
  AttendanceSelection,
  AttendanceSlotCommand,
  StaffAttendanceCell,
  StaffAttendanceMember,
} from '../model/staff-attendance';
import {
  toAttendanceCellId,
  toAttendanceCellKey,
  toAttendanceSelectionTiming,
} from '../model/staff-attendance';
import { AttendanceLeaveOverrideModal } from './AttendanceLeaveOverrideModal';
import type { AttendancePresenceLoadState } from './AttendanceMemberIdentity';
import { AttendancePaintDock } from './AttendancePaintDock';
import { AttendancePresenceModal } from './AttendancePresenceModal';
import { AttendanceReasonModal } from './AttendanceReasonModal';
import { AttendanceStartModal } from './AttendanceStartModal';
import { AttendanceTable } from './AttendanceTable';

type AttendanceFilter = 'all' | 'leave' | 'unmarked';
type ActivePaintMode = Exclude<AttendancePaintMode, null>;

type DatedSelection = {
  dateKey: string;
  value: AttendanceSelection;
};

type DatedPaintMode = {
  dateKey: string;
  value: ActivePaintMode;
};

type DatedDialogTarget = {
  cellKey: string;
  dateKey: string;
};

type AttendanceBoardProps = {
  activeSlot: OperationalAttendanceSlot | null;
  dateKey: string;
  errorMessage: string | null;
  loading: boolean;
  members: StaffAttendanceMember[];
  onManualCheckIn: (
    memberId: number,
    input: StudyPresenceManualCheckInInput,
    onSuccess?: () => void,
  ) => void;
  onManualCheckOut: (
    memberId: number,
    sessionId: number,
    onSuccess?: () => void,
  ) => void;
  onResetMember: (memberId: number, onSuccess?: () => void) => void;
  onRefresh: () => void;
  onRetry: () => void;
  onUpdateSlot: (
    command: AttendanceSlotCommand,
    onSuccess?: () => void,
  ) => void;
  operationalSlot: OperationalAttendanceSlot | null;
  pendingCellKeys: ReadonlySet<string>;
  pendingMemberIds: ReadonlySet<number>;
  pendingPresenceMemberIds: ReadonlySet<number>;
  pendingResetIds: ReadonlySet<number>;
  periodLabel: string;
  presenceErrorMessage: string | null;
  presenceOnRetry: () => void;
  presenceReady: boolean;
  ready: boolean;
  refreshing: boolean;
};

export function AttendanceBoard({
  activeSlot,
  dateKey,
  errorMessage,
  loading,
  members,
  onManualCheckIn,
  onManualCheckOut,
  onResetMember,
  onRefresh,
  onRetry,
  onUpdateSlot,
  operationalSlot,
  pendingCellKeys,
  pendingMemberIds,
  pendingPresenceMemberIds,
  pendingResetIds,
  periodLabel,
  presenceErrorMessage,
  presenceOnRetry,
  presenceReady,
  ready,
  refreshing,
}: AttendanceBoardProps) {
  const searchId = useId();
  const dateKeyRef = useRef(dateKey);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [query, setQuery] = useState('');
  const [selectionState, setSelectionState] = useState<DatedSelection | null>(
    null,
  );
  const [paintModeState, setPaintModeState] = useState<DatedPaintMode | null>(
    null,
  );
  const [leaveOverrideTarget, setLeaveOverrideTarget] =
    useState<DatedDialogTarget | null>(null);
  const [presenceMemberId, setPresenceMemberId] = useState<number | null>(null);
  const [reasonTarget, setReasonTarget] = useState<DatedDialogTarget | null>(
    null,
  );
  const [startMemberId, setStartMemberId] = useState<number | null>(null);
  const currentSelection =
    selectionState?.dateKey === dateKey ? selectionState.value : null;
  const paintMode =
    paintModeState?.dateKey === dateKey ? paintModeState.value : null;

  /* A Seoul date rollover invalidates every interaction target. Period
     changes intentionally do not: one selected paint mode lasts all day. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    dateKeyRef.current = dateKey;
    setSelectionState(null);
    setPaintModeState(null);
    setLeaveOverrideTarget(null);
    setReasonTarget(null);
    setPresenceMemberId(null);
    setStartMemberId(null);
  }, [dateKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filterSlot: OperationalAttendanceSlot = operationalSlot ?? 7;
  const effectiveFilter =
    activeSlot === null && filter === 'unmarked' ? 'all' : filter;
  const presenceState: AttendancePresenceLoadState = presenceReady
    ? 'ready'
    : presenceErrorMessage
      ? 'error'
      : 'loading';

  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko');

    return members.filter((member) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        member.name.toLocaleLowerCase('ko').includes(normalizedQuery) ||
        (member.seatNumber === null
          ? '미배정'.includes(normalizedQuery)
          : String(member.seatNumber).includes(normalizedQuery));
      const matchesFilter =
        effectiveFilter === 'all' ||
        (effectiveFilter === 'leave' &&
          member.stage === 'active' &&
          member.slots[filterSlot - 1]?.state === 'leave') ||
        (effectiveFilter === 'unmarked' &&
          activeSlot !== null &&
          member.stage === 'active' &&
          member.slots[filterSlot - 1]?.state === 'unmarked');

      return matchesQuery && matchesFilter;
    });
  }, [activeSlot, effectiveFilter, filterSlot, members, query]);

  const selectedMember = currentSelection
    ? visibleMembers.find(
        (member) =>
          member.memberId === currentSelection.memberId &&
          member.stage === 'active',
      )
    : undefined;
  const activeSelection =
    currentSelection && selectedMember
      ? {
          ...currentSelection,
          cell:
            selectedMember.slots[currentSelection.slot - 1] ??
            currentSelection.cell,
        }
      : null;
  const activeSelectionKey = activeSelection
    ? toAttendanceCellKey(activeSelection.memberId, activeSelection.slot)
    : null;
  const leaveOverrideOpen =
    leaveOverrideTarget?.dateKey === dateKey &&
    leaveOverrideTarget.cellKey === activeSelectionKey;
  const reasonOpen =
    reasonTarget?.dateKey === dateKey &&
    reasonTarget.cellKey === activeSelectionKey;
  const startTarget =
    startMemberId === null
      ? null
      : (members.find(
          (member) =>
            member.memberId === startMemberId &&
            member.stage === 'starts-today',
        ) ?? null);
  const presenceTarget =
    presenceMemberId === null
      ? null
      : (members.find(
          (member) =>
            member.memberId === presenceMemberId && member.stage === 'active',
        ) ?? null);
  const selectedPending = activeSelection
    ? pendingMemberIds.has(activeSelection.memberId)
    : false;

  useEffect(() => {
    if (paintMode === null) {
      return;
    }

    const exitPaintMode = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !leaveOverrideOpen &&
        !reasonOpen &&
        presenceMemberId === null &&
        startMemberId === null
      ) {
        setPaintModeState(null);
      }
    };

    window.addEventListener('keydown', exitPaintMode);

    return () => window.removeEventListener('keydown', exitPaintMode);
  }, [
    leaveOverrideOpen,
    paintMode,
    presenceMemberId,
    reasonOpen,
    startMemberId,
  ]);

  const selectCell = (nextSelection: AttendanceSelection) => {
    setSelectionState({ dateKey, value: nextSelection });
  };

  const submitStatus = (
    status: AttendanceSlotCommand['status'],
    reason?: string,
    targetSelection: AttendanceSelection | null = activeSelection,
    closeDialog?: 'leave' | 'reason',
  ) => {
    if (
      !targetSelection ||
      pendingMemberIds.has(targetSelection.memberId) ||
      toAttendanceSelectionTiming(
        targetSelection.slot,
        activeSlot,
        operationalSlot,
      ) === 'future' ||
      attendanceCellAlreadyHasStatus(targetSelection.cell, status)
    ) {
      return;
    }

    const submittedDateKey = dateKey;
    const submittedCellKey = toAttendanceCellKey(
      targetSelection.memberId,
      targetSelection.slot,
    );
    const closeSubmittedDialog = closeDialog
      ? () => {
          if (dateKeyRef.current !== submittedDateKey) {
            return;
          }

          const closeIfStillSubmittedTarget = (
            current: DatedDialogTarget | null,
          ) =>
            current?.dateKey === submittedDateKey &&
            current.cellKey === submittedCellKey
              ? null
              : current;

          if (closeDialog === 'leave') {
            setLeaveOverrideTarget(closeIfStillSubmittedTarget);
          } else {
            setReasonTarget(closeIfStillSubmittedTarget);
          }

          window.requestAnimationFrame(() => {
            const focusTarget =
              document.getElementById(
                toAttendanceCellId(
                  targetSelection.memberId,
                  targetSelection.slot,
                ),
              ) ?? document.getElementById(searchId);

            focusTarget?.focus({ preventScroll: true });
          });
        }
      : undefined;

    onUpdateSlot(
      {
        memberId: targetSelection.memberId,
        reason,
        slot: targetSelection.slot,
        status,
      },
      closeSubmittedDialog,
    );
  };

  const requestPaint = (
    targetSelection: AttendanceSelection,
    mode: ActivePaintMode,
  ) => {
    if (
      pendingMemberIds.has(targetSelection.memberId) ||
      toAttendanceSelectionTiming(
        targetSelection.slot,
        activeSlot,
        operationalSlot,
      ) === 'future' ||
      attendanceCellAlreadyHasStatus(targetSelection.cell, mode)
    ) {
      return;
    }

    if (mode === 'OTHER') {
      setReasonTarget({
        cellKey: toAttendanceCellKey(
          targetSelection.memberId,
          targetSelection.slot,
        ),
        dateKey,
      });
      return;
    }

    if (mode === 'ABSENT' && targetSelection.cell.source === 'MEMBER_LEAVE') {
      setLeaveOverrideTarget({
        cellKey: toAttendanceCellKey(
          targetSelection.memberId,
          targetSelection.slot,
        ),
        dateKey,
      });
      return;
    }

    submitStatus(mode, undefined, targetSelection);
  };

  const paintDock =
    ready && visibleMembers.some((member) => member.stage === 'active') ? (
      <AttendancePaintDock
        mode={paintMode}
        onExit={() => setPaintModeState(null)}
        onModeChange={(nextMode) =>
          setPaintModeState((current) =>
            current?.dateKey === dateKey && current.value === nextMode
              ? current
              : { dateKey, value: nextMode },
          )
        }
      />
    ) : null;

  const clearTransientSelection = () => {
    setSelectionState(null);
    setLeaveOverrideTarget(null);
    setReasonTarget(null);
  };

  return (
    <>
      <Card className="staff-attendance__board" padding="none">
        <header className="staff-attendance__board-head">
          <div className="staff-attendance__board-title">
            <h2>교시 출석부</h2>
            <p>좌석 순서대로 입퇴실 시각과 교시별 상태를 확인하세요.</p>
          </div>
          <div className="staff-attendance__board-context">
            <p>
              <time dateTime={dateKey}>{formatKoreanDate(dateKey)}</time>
              <strong>{periodLabel}</strong>
            </p>
            <button
              aria-busy={refreshing}
              aria-label={refreshing ? '출석부 갱신 중' : '출석부 새로고침'}
              className={cx(
                'staff-attendance__refresh',
                refreshing && 'is-refreshing',
              )}
              disabled={refreshing}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={14} />
              {refreshing ? '갱신 중' : '갱신'}
            </button>
          </div>
        </header>

        {loading && <SectionLoading label="오늘 출석부를 불러오고 있어요." />}
        {errorMessage && (
          <SectionError message={errorMessage} onRetry={onRetry} />
        )}
        {ready && (
          <>
            {presenceErrorMessage && (
              <SectionError
                message={`입퇴실 시간을 불러오지 못했어요. ${presenceErrorMessage}`}
                onRetry={presenceOnRetry}
              />
            )}
            <div className="staff-attendance__board-toolbar">
              <label className="staff-attendance__search" htmlFor={searchId}>
                <span className="staff-attendance__sr-only">회원 검색</span>
                <Search aria-hidden="true" size={17} />
                <input
                  autoComplete="off"
                  id={searchId}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                  placeholder="이름 또는 좌석 검색"
                  type="search"
                  value={query}
                />
              </label>
              <div
                aria-label="출석부 필터"
                className="staff-attendance__filters"
                role="group"
              >
                <FilterButton
                  active={effectiveFilter === 'all'}
                  label="전체"
                  onClick={() => {
                    setFilter('all');
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                />
                <FilterButton
                  active={effectiveFilter === 'unmarked'}
                  disabled={activeSlot === null}
                  label={`${filterSlot}교시 미확인`}
                  onClick={() => {
                    setFilter('unmarked');
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                />
                <FilterButton
                  active={effectiveFilter === 'leave'}
                  label={`${filterSlot}교시 휴무`}
                  onClick={() => {
                    setFilter('leave');
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                />
              </div>
            </div>

            {visibleMembers.length === 0 ? (
              <div className="staff-attendance__board-empty">
                <SectionEmpty
                  title={
                    members.length === 0
                      ? '오늘 출석부에 표시할 회원이 없어요.'
                      : '조건에 맞는 회원이 없어요.'
                  }
                >
                  <p>
                    {members.length === 0
                      ? '현재 지점에 등록된 출석 대상이 없습니다.'
                      : '검색어나 필터를 바꾸어 다시 확인해 주세요.'}
                  </p>
                </SectionEmpty>
              </div>
            ) : (
              <AttendanceTable
                activeSlot={activeSlot}
                dock={paintDock}
                members={visibleMembers}
                mode={paintMode}
                onActivate={(nextSelection) => {
                  setLeaveOverrideTarget(null);
                  setReasonTarget(null);
                  selectCell(nextSelection);

                  if (paintMode) {
                    requestPaint(nextSelection, paintMode);
                  }
                }}
                onPresenceRequest={(member) =>
                  setPresenceMemberId(member.memberId)
                }
                onResetRequest={(member) => setStartMemberId(member.memberId)}
                onSelect={selectCell}
                operationalSlot={operationalSlot}
                pendingCellKeys={pendingCellKeys}
                pendingMemberIds={pendingMemberIds}
                pendingPresenceMemberIds={pendingPresenceMemberIds}
                pendingResetIds={pendingResetIds}
                presenceState={presenceState}
                selection={activeSelection}
              />
            )}
          </>
        )}
      </Card>
      <AttendanceReasonModal
        onClose={() => setReasonTarget(null)}
        onSubmit={(reason) =>
          submitStatus('OTHER', reason, activeSelection, 'reason')
        }
        open={reasonOpen}
        pending={selectedPending}
        selection={activeSelection}
      />
      <AttendanceLeaveOverrideModal
        onClose={() => setLeaveOverrideTarget(null)}
        onConfirm={() =>
          submitStatus('ABSENT', undefined, activeSelection, 'leave')
        }
        pending={selectedPending}
        selection={leaveOverrideOpen ? activeSelection : null}
      />
      <AttendancePresenceModal
        dateKey={dateKey}
        member={presenceTarget}
        onCheckIn={(input) => {
          if (!presenceTarget) {
            return;
          }

          onManualCheckIn(presenceTarget.memberId, input, () =>
            setPresenceMemberId(null),
          );
        }}
        onCheckOut={() => {
          const sessionId = presenceTarget?.presence?.activeSessionId;

          if (
            !presenceTarget ||
            sessionId === null ||
            sessionId === undefined
          ) {
            return;
          }

          onManualCheckOut(presenceTarget.memberId, sessionId, () =>
            setPresenceMemberId(null),
          );
        }}
        onClose={() => setPresenceMemberId(null)}
        pending={
          presenceTarget
            ? pendingPresenceMemberIds.has(presenceTarget.memberId)
            : false
        }
      />
      <AttendanceStartModal
        member={startTarget}
        onClose={() => setStartMemberId(null)}
        onConfirm={() => {
          if (!startTarget || pendingResetIds.has(startTarget.memberId)) {
            return;
          }

          onResetMember(startTarget.memberId, () => setStartMemberId(null));
        }}
        pending={
          startTarget ? pendingResetIds.has(startTarget.memberId) : false
        }
      />
    </>
  );
}

function FilterButton({
  active,
  disabled = false,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cx(active && 'is-active')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function attendanceCellAlreadyHasStatus(
  cell: StaffAttendanceCell,
  status: AttendanceSlotCommand['status'],
) {
  return (
    (status === 'PRESENT' && cell.state === 'present') ||
    (status === 'ABSENT' && cell.state === 'absent')
  );
}
