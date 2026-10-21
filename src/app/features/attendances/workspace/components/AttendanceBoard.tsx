import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
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
  AttendanceSelection,
  AttendanceReasonCommand,
  AttendanceSlotCommand,
  AttendanceBoardMember,
} from '../model/attendance-board';
import {
  ATTENDANCE_SLOTS,
  toAttendanceCellId,
  toAttendanceCellKey,
} from '../model/attendance-board';
import { AttendanceCommandDock } from './AttendanceCommandDock';
import type { AttendancePresenceLoadState } from './AttendanceMemberIdentity';
import { AttendanceMemberDetailsModal } from './AttendanceMemberDetailsModal';
import { AttendancePresenceModal } from './AttendancePresenceModal';
import { AttendanceReasonModal } from './AttendanceReasonModal';
import { AttendanceStartModal } from './AttendanceStartModal';
import { AttendanceTable } from './AttendanceTable';
import { hasMangmiSeatLayout } from '../model/attendance-seat-layout';
import {
  attendanceActivationStatus,
  canSubmitAttendanceStatus,
} from '../model/attendance-slot-actions';

type AttendanceFilter = 'all' | 'leave' | 'unmarked';

type DatedSelection = {
  dateKey: string;
  value: AttendanceSelection;
};

type DatedDialogTarget = {
  cellKey: string;
  dateKey: string;
};

export type AttendanceBoardInteraction = {
  presenceEditable: boolean;
  leaveScope: {
    branchId: number;
    operatorMemberId: number;
    ownerKey: SessionOwnerKey;
  };
  onApplyReason: (
    command: AttendanceReasonCommand,
    onSuccess?: () => void,
  ) => void;
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
  onUpdateSlot: (
    command: AttendanceSlotCommand,
    onSuccess?: () => void,
  ) => void;
  pendingCellKeys: ReadonlySet<string>;
  pendingMemberIds: ReadonlySet<number>;
  pendingPresenceMemberIds: ReadonlySet<number>;
  pendingResetIds: ReadonlySet<number>;
};

export type AttendanceLeaveManagementTarget = {
  dateKey: string;
  memberId: number;
  slot: OperationalAttendanceSlot;
};

type AttendanceBoardProps = {
  activeSlot: OperationalAttendanceSlot | null;
  branchName: string | null;
  dateKey: string;
  errorMessage: string | null;
  interaction?: AttendanceBoardInteraction;
  isToday: boolean;
  loading: boolean;
  members: AttendanceBoardMember[];
  onManageLeave?: (target: AttendanceLeaveManagementTarget) => void;
  onRefresh: () => void;
  onRetry: () => void;
  operationalSlot: OperationalAttendanceSlot | null;
  periodLabel: string;
  presenceErrorMessage: string | null;
  presenceOnRetry: () => void;
  presenceReady: boolean;
  ready: boolean;
  refreshing: boolean;
  vacantSeatNumbers: number[];
};

export function AttendanceBoard({
  activeSlot,
  branchName,
  dateKey,
  errorMessage,
  interaction,
  isToday,
  loading,
  members,
  onManageLeave,
  onRefresh,
  onRetry,
  operationalSlot,
  periodLabel,
  presenceErrorMessage,
  presenceOnRetry,
  presenceReady,
  ready,
  refreshing,
  vacantSeatNumbers,
}: AttendanceBoardProps) {
  const searchId = useId();
  const dateKeyRef = useRef(dateKey);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [query, setQuery] = useState('');
  const [selectionState, setSelectionState] = useState<DatedSelection | null>(
    null,
  );
  const [presenceMemberId, setPresenceMemberId] = useState<number | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<{
    dateKey: string;
    memberId: number;
  } | null>(null);
  const [reasonTarget, setReasonTarget] = useState<DatedDialogTarget | null>(
    null,
  );
  const [startMemberId, setStartMemberId] = useState<number | null>(null);
  const currentSelection =
    selectionState?.dateKey === dateKey ? selectionState.value : null;
  const selectedMemberId = currentSelection?.memberId ?? null;
  const pendingCellKeys = interaction?.pendingCellKeys ?? EMPTY_STRING_SET;
  const pendingMemberIds = interaction?.pendingMemberIds ?? EMPTY_NUMBER_SET;
  const pendingPresenceMemberIds =
    interaction?.pendingPresenceMemberIds ?? EMPTY_NUMBER_SET;
  const pendingResetIds = interaction?.pendingResetIds ?? EMPTY_NUMBER_SET;

  /* A Seoul date rollover invalidates every interaction target. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    dateKeyRef.current = dateKey;
    setSelectionState(null);
    setReasonTarget(null);
    setPresenceMemberId(null);
    setDetailsTarget(null);
    setStartMemberId(null);
  }, [dateKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filterSlot: OperationalAttendanceSlot = operationalSlot ?? 7;
  const readOnlyUnmarkedSlotCount =
    !isToday || operationalSlot === null ? 7 : (activeSlot ?? 0);
  const unmarkedFilterDisabled =
    isToday && interaction !== undefined
      ? activeSlot === null
      : readOnlyUnmarkedSlotCount === 0;
  const effectiveFilter =
    unmarkedFilterDisabled && filter === 'unmarked' ? 'all' : filter;
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
        member.memberId === selectedMemberId ||
        effectiveFilter === 'all' ||
        (effectiveFilter === 'leave' &&
          member.stage === 'active' &&
          (!isToday || interaction === undefined
            ? member.slots.some((cell) => cell.state === 'leave')
            : member.slots[filterSlot - 1]?.state === 'leave')) ||
        (effectiveFilter === 'unmarked' &&
          member.stage === 'active' &&
          (!isToday || interaction === undefined
            ? member.slots
                .slice(0, readOnlyUnmarkedSlotCount)
                .some((cell) => cell.state === 'unmarked')
            : activeSlot !== null &&
              member.slots[filterSlot - 1]?.state === 'unmarked'));

      return matchesQuery && matchesFilter;
    });
  }, [
    activeSlot,
    effectiveFilter,
    filterSlot,
    interaction,
    isToday,
    members,
    query,
    readOnlyUnmarkedSlotCount,
    selectedMemberId,
  ]);

  // Vacancies are layout markers, not members. Do not include them in
  // attendance filters, selection, commands or member counts.
  const visibleVacantSeatNumbers = useMemo(() => {
    if (effectiveFilter !== 'all' || !hasMangmiSeatLayout(branchName)) {
      return [];
    }

    const normalizedQuery = query.trim().toLocaleLowerCase('ko');
    return vacantSeatNumbers.filter(
      (seatNumber) =>
        seatNumber <= 102 &&
        (normalizedQuery.length === 0 ||
          '공석'.includes(normalizedQuery) ||
          String(seatNumber).includes(normalizedQuery)),
    );
  }, [branchName, effectiveFilter, query, vacantSeatNumbers]);

  const selectedMember = currentSelection
    ? visibleMembers.find(
        (member) =>
          member.memberId === currentSelection.memberId &&
          member.stage === 'active',
      )
    : undefined;
  const detailsMember =
    detailsTarget?.dateKey === dateKey
      ? (visibleMembers.find(
          (member) => member.memberId === detailsTarget.memberId,
        ) ?? null)
      : null;
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
    presenceMemberId === null || !interaction?.presenceEditable
      ? null
      : (members.find(
          (member) =>
            member.memberId === presenceMemberId &&
            (member.role === 'MEMBER' ||
              (member.presence?.activeSessionId ?? null) !== null) &&
            member.stage === 'active',
        ) ?? null);
  const selectedPending = activeSelection
    ? pendingMemberIds.has(activeSelection.memberId)
    : false;

  const commandSequence = useMemo(
    () =>
      ATTENDANCE_SLOTS.flatMap((slot) =>
        visibleMembers
          .filter(
            (member) =>
              member.stage === 'active' &&
              !pendingMemberIds.has(member.memberId),
          )
          .map((member) => ({
            cell: member.slots[slot - 1],
            memberId: member.memberId,
            name: member.name,
            seatNumber: member.seatNumber,
            slot,
          })),
      ),
    [pendingMemberIds, visibleMembers],
  );
  const commandIndex = activeSelection
    ? commandSequence.findIndex(
        (selection) =>
          selection.memberId === activeSelection.memberId &&
          selection.slot === activeSelection.slot,
      )
    : -1;
  const nextSelection =
    commandIndex >= 0 ? (commandSequence[commandIndex + 1] ?? null) : null;

  const selectCell = (nextSelection: AttendanceSelection) => {
    setSelectionState({ dateKey, value: nextSelection });
  };

  const submitStatus = (
    status: AttendanceSlotCommand['status'],
    targetSelection: AttendanceSelection | null = activeSelection,
  ) => {
    if (
      interaction === undefined ||
      !targetSelection ||
      pendingMemberIds.has(targetSelection.memberId) ||
      !canSubmitAttendanceStatus(targetSelection.cell, status)
    ) {
      return;
    }

    interaction.onUpdateSlot({
      memberId: targetSelection.memberId,
      slot: targetSelection.slot,
      status,
    });
  };

  const requestStatus = (status: AttendanceSlotCommand['status']) => {
    if (
      interaction === undefined ||
      !activeSelection ||
      pendingMemberIds.has(activeSelection.memberId) ||
      !canSubmitAttendanceStatus(activeSelection.cell, status)
    ) {
      return;
    }

    if (status === 'OTHER') {
      setReasonTarget({
        cellKey: toAttendanceCellKey(
          activeSelection.memberId,
          activeSelection.slot,
        ),
        dateKey,
      });
      return;
    }

    submitStatus(status, activeSelection);
  };

  const submitReason = (command: AttendanceReasonCommand) => {
    if (
      !interaction ||
      !reasonOpen ||
      !activeSelection ||
      command.memberId !== activeSelection.memberId ||
      pendingMemberIds.has(command.memberId)
    ) {
      return;
    }

    const submittedDateKey = dateKey;
    const submittedSlot = activeSelection.slot;
    const submittedCellKey = toAttendanceCellKey(
      command.memberId,
      submittedSlot,
    );
    interaction.onApplyReason(command, () => {
      if (dateKeyRef.current !== submittedDateKey) {
        return;
      }
      setReasonTarget((current) =>
        current?.dateKey === submittedDateKey &&
        current.cellKey === submittedCellKey
          ? null
          : current,
      );
      window.requestAnimationFrame(() => {
        const focusTarget =
          document.getElementById(
            toAttendanceCellId(command.memberId, submittedSlot),
          ) ?? document.getElementById(searchId);
        focusTarget?.focus({ preventScroll: true });
      });
    });
  };

  const advanceSelection = () => {
    if (!nextSelection) {
      return;
    }

    selectCell(nextSelection);
    window.requestAnimationFrame(() => {
      const nextCell = document.getElementById(
        toAttendanceCellId(nextSelection.memberId, nextSelection.slot),
      );

      nextCell?.focus({ preventScroll: true });
      nextCell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  const commandDock =
    interaction !== undefined &&
    ready &&
    visibleMembers.some((member) => member.stage === 'active') ? (
      <AttendanceCommandDock
        canAdvance={nextSelection !== null}
        onAdvance={advanceSelection}
        onManageLeave={
          activeSelection && onManageLeave
            ? () =>
                onManageLeave({
                  dateKey,
                  memberId: activeSelection.memberId,
                  slot: activeSelection.slot,
                })
            : undefined
        }
        onRestore={() => requestStatus('RESTORE')}
        onMarkOther={() => requestStatus('OTHER')}
        onMarkPresent={() => requestStatus('PRESENT')}
        pending={selectedPending}
        selection={activeSelection}
      />
    ) : null;

  const clearTransientSelection = () => {
    setDetailsTarget(null);
    setSelectionState(null);
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

        {loading && (
          <SectionLoading
            label={`${isToday ? '오늘 ' : ''}출석부를 불러오고 있어요.`}
          />
        )}
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
                <span className="staff-attendance__sr-only">사원 검색</span>
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
                  disabled={unmarkedFilterDisabled}
                  label={
                    !isToday || interaction === undefined
                      ? isToday && activeSlot !== null
                        ? `${activeSlot}교시까지 미확인`
                        : '미확인 있음'
                      : `${filterSlot}교시 미확인`
                  }
                  onClick={() => {
                    setFilter('unmarked');
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                />
                <FilterButton
                  active={effectiveFilter === 'leave'}
                  label={
                    !isToday || interaction === undefined
                      ? '휴무 있음'
                      : `${filterSlot}교시 휴무`
                  }
                  onClick={() => {
                    setFilter('leave');
                    setPresenceMemberId(null);
                    clearTransientSelection();
                  }}
                />
              </div>
            </div>

            {visibleMembers.length === 0 &&
            visibleVacantSeatNumbers.length === 0 ? (
              <div className="staff-attendance__board-empty">
                <SectionEmpty
                  title={
                    members.length === 0
                      ? `${isToday ? '오늘' : '선택한 날짜의'} 출석부에 표시할 사원이 없어요.`
                      : '조건에 맞는 사원이 없어요.'
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
                branchName={branchName}
                dateKey={dateKey}
                dock={commandDock}
                interactive={interaction !== undefined}
                members={visibleMembers}
                onActivate={(nextSelection) => {
                  setReasonTarget(null);
                  selectCell(nextSelection);

                  // Activation cancels only a displayed O; keyboard focus and
                  // arrow navigation still select without changing attendance.
                  const status = attendanceActivationStatus(nextSelection.cell);
                  if (status) {
                    submitStatus(status, nextSelection);
                  }
                }}
                onDetailsRequest={(member) =>
                  setDetailsTarget({ dateKey, memberId: member.memberId })
                }
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
                presenceEditable={interaction?.presenceEditable === true}
                presenceState={presenceState}
                selection={activeSelection}
                vacantSeatNumbers={visibleVacantSeatNumbers}
              />
            )}
          </>
        )}
      </Card>
      <AttendanceMemberDetailsModal
        dateKey={dateKey}
        interactive={interaction?.presenceEditable === true}
        member={detailsMember}
        onClose={() => setDetailsTarget(null)}
        onPresenceRequest={(member) => {
          if (
            !interaction?.presenceEditable ||
            presenceState !== 'ready' ||
            member.stage !== 'active' ||
            pendingMemberIds.has(member.memberId) ||
            pendingPresenceMemberIds.has(member.memberId) ||
            (member.role !== 'MEMBER' &&
              member.presence?.activeSessionId == null)
          ) {
            return;
          }
          setDetailsTarget(null);
          setPresenceMemberId(member.memberId);
        }}
        pending={
          detailsMember !== null &&
          (pendingMemberIds.has(detailsMember.memberId) ||
            pendingPresenceMemberIds.has(detailsMember.memberId))
        }
        presenceState={presenceState}
      />
      {interaction !== undefined && (
        <>
          <AttendanceReasonModal
            dateKey={dateKey}
            joinDate={selectedMember?.joinDate ?? null}
            scope={interaction.leaveScope}
            onClose={() => setReasonTarget(null)}
            onSubmit={submitReason}
            open={reasonOpen}
            pending={selectedPending}
            selection={activeSelection}
          />
          <AttendancePresenceModal
            dateKey={dateKey}
            member={presenceTarget}
            onCheckIn={(input) => {
              if (!presenceTarget) {
                return;
              }

              interaction.onManualCheckIn(presenceTarget.memberId, input, () =>
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

              interaction.onManualCheckOut(
                presenceTarget.memberId,
                sessionId,
                () => setPresenceMemberId(null),
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
            dateKey={dateKey}
            member={startTarget}
            onClose={() => setStartMemberId(null)}
            onConfirm={() => {
              if (!startTarget || pendingResetIds.has(startTarget.memberId)) {
                return;
              }

              interaction.onResetMember(startTarget.memberId, () =>
                setStartMemberId(null),
              );
            }}
            pending={
              startTarget ? pendingResetIds.has(startTarget.memberId) : false
            }
          />
        </>
      )}
    </>
  );
}

const EMPTY_NUMBER_SET: ReadonlySet<number> = new Set();
const EMPTY_STRING_SET: ReadonlySet<string> = new Set();

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
