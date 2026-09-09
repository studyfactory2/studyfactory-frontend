import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MoveHorizontal, RefreshCw, Search } from 'lucide-react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import type { StudyPresenceManualCheckInInput } from '../../../../features/study-presence/study-presence-api';
import {
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
  Table,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import {
  formatKoreanDate,
  formatTimeOfDayFromEpochMs,
} from '../../../../shared/lib/seoul-date';
import {
  ATTENDANCE_SLOTS,
  type AttendanceSelection,
  type AttendanceSlotCommand,
  type StaffAttendanceCell,
  type StaffAttendanceMember,
  toAttendanceCellKey,
} from '../model/staff-attendance';
import { AttendanceActionBar } from './AttendanceActionBar';
import { AttendanceLeaveOverrideModal } from './AttendanceLeaveOverrideModal';
import { AttendancePresenceModal } from './AttendancePresenceModal';
import { AttendanceReasonModal } from './AttendanceReasonModal';
import { AttendanceStartModal } from './AttendanceStartModal';

type AttendanceFilter = 'all' | 'leave' | 'unmarked';
type PresenceLoadState = 'error' | 'loading' | 'ready';

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
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<AttendanceSelection | null>(null);
  const [leaveOverrideOpen, setLeaveOverrideOpen] = useState(false);
  const [presenceMemberId, setPresenceMemberId] = useState<number | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [startMemberId, setStartMemberId] = useState<number | null>(null);
  const filterSlot: OperationalAttendanceSlot = operationalSlot ?? 7;
  const effectiveFilter =
    activeSlot === null && filter === 'unmarked' ? 'all' : filter;
  const presenceState: PresenceLoadState = presenceReady
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

  const selectedMember = selection
    ? visibleMembers.find(
        (member) =>
          member.memberId === selection.memberId && member.stage === 'active',
      )
    : undefined;
  const activeSelection =
    selection && selectedMember
      ? {
          ...selection,
          cell: selectedMember.slots[selection.slot - 1] ?? selection.cell,
        }
      : null;
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
  const defaultSelectionSlot: OperationalAttendanceSlot =
    activeSlot ?? operationalSlot ?? 1;

  const submitStatus = (
    status: AttendanceSlotCommand['status'],
    reason?: string,
  ) => {
    if (!activeSelection || selectedPending) {
      return;
    }

    const currentSelection = activeSelection;
    onUpdateSlot(
      {
        memberId: currentSelection.memberId,
        reason,
        slot: currentSelection.slot,
        status,
      },
      () => {
        setLeaveOverrideOpen(false);
        setReasonOpen(false);
        setSelection((current) =>
          current?.memberId === currentSelection.memberId &&
          current.slot === currentSelection.slot
            ? nextSeatSelection(currentSelection, visibleMembers)
            : current,
        );
      },
    );
  };
  const actionBar =
    ready && visibleMembers.some((member) => member.stage === 'active') ? (
      <AttendanceActionBar
        onAbsent={() => {
          if (activeSelection?.cell.source === 'MEMBER_LEAVE') {
            setLeaveOverrideOpen(true);
            return;
          }

          submitStatus('ABSENT');
        }}
        onClear={() => {
          setLeaveOverrideOpen(false);
          setReasonOpen(false);
          setSelection(null);
        }}
        onOther={() => setReasonOpen(true)}
        onPresent={() => submitStatus('PRESENT')}
        pending={selectedPending}
        selection={activeSelection}
      />
    ) : null;

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
                    setLeaveOverrideOpen(false);
                    setPresenceMemberId(null);
                    setReasonOpen(false);
                    setSelection(null);
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
                    setLeaveOverrideOpen(false);
                    setPresenceMemberId(null);
                    setReasonOpen(false);
                    setSelection(null);
                  }}
                />
                <FilterButton
                  active={effectiveFilter === 'unmarked'}
                  disabled={activeSlot === null}
                  label={`${filterSlot}교시 미출석`}
                  onClick={() => {
                    setFilter('unmarked');
                    setLeaveOverrideOpen(false);
                    setPresenceMemberId(null);
                    setReasonOpen(false);
                    setSelection(null);
                  }}
                />
                <FilterButton
                  active={effectiveFilter === 'leave'}
                  label={`${filterSlot}교시 휴무`}
                  onClick={() => {
                    setFilter('leave');
                    setLeaveOverrideOpen(false);
                    setPresenceMemberId(null);
                    setReasonOpen(false);
                    setSelection(null);
                  }}
                />
              </div>
            </div>

            <ul
              aria-label="출석 상태 범례"
              className="staff-attendance__legend"
            >
              <li>
                <i className="is-present" />O 처리
              </li>
              <li>
                <i className="is-unmarked" />X 미출석
              </li>
              <li>
                <i className="is-leave" />
                휴무
              </li>
            </ul>

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
                actionBar={actionBar}
                members={visibleMembers}
                onPresenceRequest={(member) => {
                  const cell =
                    member.slots[defaultSelectionSlot - 1] ?? member.slots[0];

                  setLeaveOverrideOpen(false);
                  setReasonOpen(false);
                  if (cell) {
                    setSelection({
                      cell,
                      memberId: member.memberId,
                      name: member.name,
                      seatNumber: member.seatNumber,
                      slot: defaultSelectionSlot,
                    });
                  }
                  setPresenceMemberId(member.memberId);
                }}
                onResetRequest={(member) => setStartMemberId(member.memberId)}
                onSelect={(nextSelection) => {
                  setLeaveOverrideOpen(false);
                  setReasonOpen(false);
                  setSelection(nextSelection);
                }}
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
        onClose={() => setReasonOpen(false)}
        onSubmit={(reason) => submitStatus('OTHER', reason)}
        open={reasonOpen}
        pending={selectedPending}
        selection={activeSelection}
      />
      <AttendanceLeaveOverrideModal
        onClose={() => setLeaveOverrideOpen(false)}
        onConfirm={() => submitStatus('ABSENT')}
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

function AttendanceTable({
  activeSlot,
  actionBar,
  members,
  onPresenceRequest,
  onResetRequest,
  onSelect,
  operationalSlot,
  pendingCellKeys,
  pendingMemberIds,
  pendingPresenceMemberIds,
  pendingResetIds,
  presenceState,
  selection,
}: {
  activeSlot: OperationalAttendanceSlot | null;
  actionBar: ReactNode;
  members: StaffAttendanceMember[];
  onPresenceRequest: (member: StaffAttendanceMember) => void;
  onResetRequest: (member: StaffAttendanceMember) => void;
  onSelect: (selection: AttendanceSelection) => void;
  operationalSlot: OperationalAttendanceSlot | null;
  pendingCellKeys: ReadonlySet<string>;
  pendingMemberIds: ReadonlySet<number>;
  pendingPresenceMemberIds: ReadonlySet<number>;
  pendingResetIds: ReadonlySet<number>;
  presenceState: PresenceLoadState;
  selection: AttendanceSelection | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const identityHeaderRef = useRef<HTMLTableCellElement>(null);
  const operationalHeaderRef = useRef<HTMLTableCellElement>(null);
  const activeMembers = members.filter((member) => member.stage === 'active');
  const navigableMembers = activeMembers.filter(
    (member) => !pendingMemberIds.has(member.memberId),
  );
  const selectedTabMember = selection
    ? navigableMembers.find((member) => member.memberId === selection.memberId)
    : undefined;
  const tabStopMember = selectedTabMember ?? navigableMembers[0];
  const tabStopSlot = selection?.slot ?? activeSlot ?? operationalSlot ?? 1;
  const selectedCellId = selection
    ? attendanceCellId(selection.memberId, selection.slot)
    : null;

  useEffect(() => {
    if (operationalSlot === null) {
      return;
    }

    const compactViewport = window.matchMedia('(max-width: 1279px)');
    let animationFrame = 0;

    const alignOperationalSlot = () => {
      if (!compactViewport.matches) {
        return;
      }

      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const scrollViewport =
          frameRef.current?.querySelector<HTMLElement>('.table-wrap');
        const identityHeader = identityHeaderRef.current;
        const operationalHeader = operationalHeaderRef.current;

        if (!scrollViewport || !identityHeader || !operationalHeader) {
          return;
        }

        const contentWidth = Math.max(
          0,
          scrollViewport.clientWidth - identityHeader.offsetWidth,
        );
        const centeredOffset =
          operationalHeader.offsetLeft -
          identityHeader.offsetWidth -
          (contentWidth - operationalHeader.offsetWidth) / 2;
        const maximumOffset = Math.max(
          0,
          scrollViewport.scrollWidth - scrollViewport.clientWidth,
        );

        scrollViewport.scrollLeft = Math.min(
          maximumOffset,
          Math.max(0, centeredOffset),
        );
      });
    };

    alignOperationalSlot();
    compactViewport.addEventListener('change', alignOperationalSlot);

    return () => {
      cancelAnimationFrame(animationFrame);
      compactViewport.removeEventListener('change', alignOperationalSlot);
    };
  }, [operationalSlot]);

  useEffect(() => {
    if (!selectedCellId) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      const cell = document.getElementById(selectedCellId);

      if (!(cell instanceof HTMLButtonElement) || cell.disabled) {
        return;
      }

      cell.focus({ preventScroll: true });
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [selectedCellId]);

  const navigateCell = (
    event: KeyboardEvent<HTMLButtonElement>,
    member: StaffAttendanceMember,
    slot: OperationalAttendanceSlot,
  ) => {
    let nextMember = member;
    let nextSlot: OperationalAttendanceSlot = slot;
    const memberIndex = navigableMembers.findIndex(
      (candidate) => candidate.memberId === member.memberId,
    );

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const offset = event.key === 'ArrowUp' ? -1 : 1;
      const candidate = navigableMembers[memberIndex + offset];

      if (!candidate) {
        return;
      }
      nextMember = candidate;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const offset = event.key === 'ArrowLeft' ? -1 : 1;
      const candidate = slot + offset;

      if (candidate < 1 || candidate > ATTENDANCE_SLOTS.length) {
        return;
      }
      nextSlot = candidate as OperationalAttendanceSlot;
    } else {
      return;
    }

    event.preventDefault();
    const nextCell = nextMember.slots[nextSlot - 1];

    if (nextCell) {
      onSelect({
        cell: nextCell,
        memberId: nextMember.memberId,
        name: nextMember.name,
        seatNumber: nextMember.seatNumber,
        slot: nextSlot,
      });
    }
  };

  return (
    <div className="staff-attendance__table-frame" ref={frameRef}>
      <p className="staff-attendance__scroll-hint">
        <MoveHorizontal aria-hidden="true" size={14} />
        옆으로 밀어 1–7교시를 확인하세요.
      </p>
      <Table>
        <caption className="staff-attendance__sr-only">
          좌석 순서 회원과 미배정 회원의 오늘 입퇴실 시각, 1교시부터 7교시까지의
          출석 상태
        </caption>
        <thead>
          <tr>
            <th
              className="staff-attendance__identity-col"
              ref={identityHeaderRef}
              scope="col"
            >
              <span>회원</span>
              <small className="staff-attendance__identity-note">
                오늘 입·퇴실
              </small>
            </th>
            {ATTENDANCE_SLOTS.map((slot) => (
              <th
                className={cx(operationalSlot === slot && 'is-operational')}
                key={slot}
                ref={
                  operationalSlot === slot ? operationalHeaderRef : undefined
                }
                scope="col"
              >
                <span>{slot}교시</span>
                {operationalSlot === slot && (
                  <small>{activeSlot === slot ? '현재' : '예정'}</small>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              className={cx(
                member.seatNumber === null && 'is-unassigned',
                member.stage !== 'active' && 'is-prestart',
              )}
              key={member.memberId}
            >
              <th className="staff-attendance__identity-col" scope="row">
                <MemberIdentity
                  disabled={pendingMemberIds.has(member.memberId)}
                  member={member}
                  onPresenceRequest={onPresenceRequest}
                  presencePending={pendingPresenceMemberIds.has(
                    member.memberId,
                  )}
                  presenceState={presenceState}
                  presenceTabStop={tabStopMember?.memberId === member.memberId}
                />
              </th>
              {member.stage === 'active' ? (
                member.slots.map((cell, index) => {
                  const slot = (index + 1) as OperationalAttendanceSlot;
                  const future =
                    cell.state === 'unmarked' &&
                    operationalSlot !== null &&
                    (activeSlot === null || slot > activeSlot);
                  const pending = pendingCellKeys.has(
                    toAttendanceCellKey(member.memberId, slot),
                  );
                  const memberPending = pendingMemberIds.has(member.memberId);
                  const selected =
                    selection?.memberId === member.memberId &&
                    selection.slot === slot;

                  return (
                    <td
                      className={cx(
                        operationalSlot === slot && 'is-operational',
                      )}
                      key={slot}
                    >
                      <AttendanceStatus
                        cell={cell}
                        disabled={memberPending}
                        future={future}
                        member={member}
                        onKeyDown={(event) => navigateCell(event, member, slot)}
                        onSelect={() =>
                          onSelect({
                            cell,
                            memberId: member.memberId,
                            name: member.name,
                            seatNumber: member.seatNumber,
                            slot,
                          })
                        }
                        pending={pending}
                        selected={selected}
                        slot={slot}
                        tabStop={
                          tabStopMember?.memberId === member.memberId &&
                          tabStopSlot === slot
                        }
                      />
                    </td>
                  );
                })
              ) : (
                <MembershipStageCell
                  member={member}
                  onResetRequest={onResetRequest}
                  pending={pendingResetIds.has(member.memberId)}
                />
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      {actionBar}
    </div>
  );
}

function MemberIdentity({
  disabled,
  member,
  onPresenceRequest,
  presencePending,
  presenceState,
  presenceTabStop,
}: {
  disabled: boolean;
  member: StaffAttendanceMember;
  onPresenceRequest: (member: StaffAttendanceMember) => void;
  presencePending: boolean;
  presenceState: PresenceLoadState;
  presenceTabStop: boolean;
}) {
  const currentlyActive = member.presence?.currentlyActive ?? false;

  return (
    <span className="staff-attendance__member">
      <b
        aria-label={
          member.seatNumber === null
            ? '좌석 미배정'
            : `${member.seatNumber}번 좌석`
        }
        className={member.seatNumber === null ? 'is-unassigned' : undefined}
      >
        {member.seatNumber === null ? '미배정' : member.seatNumber}
      </b>
      <span className="staff-attendance__member-copy">
        <span className="staff-attendance__member-name">
          <strong>{member.name}</strong>
          {presenceState === 'ready' &&
            member.presence !== null &&
            member.presence.sessionCount > 1 && (
              <em
                aria-label={`오늘 ${member.presence.sessionCount}회 입실`}
                className="staff-attendance__session-count"
                title={`오늘 ${member.presence.sessionCount}회 입실`}
              >
                {member.presence.sessionCount}회
              </em>
            )}
          {member.stage === 'active' && presenceState === 'ready' && (
            <button
              aria-busy={presencePending}
              aria-label={`${member.name} ${currentlyActive ? '수동 퇴실 처리' : '수동 입실 등록'}`}
              className={cx(
                'staff-attendance__presence-button',
                currentlyActive && 'is-checkout',
              )}
              disabled={disabled}
              onClick={() => onPresenceRequest(member)}
              tabIndex={presenceTabStop ? 0 : -1}
              type="button"
            >
              {presencePending ? '처리 중' : currentlyActive ? '퇴실' : '입실'}
            </button>
          )}
        </span>
        <MemberPresence member={member} presenceState={presenceState} />
      </span>
    </span>
  );
}

function MemberPresence({
  member,
  presenceState,
}: {
  member: StaffAttendanceMember;
  presenceState: PresenceLoadState;
}) {
  if (presenceState !== 'ready') {
    return (
      <small className="staff-attendance__member-presence is-muted">
        {presenceState === 'error' ? '입퇴실 시간 미확인' : '입퇴실 확인 중'}
      </small>
    );
  }

  const { checkedInAt, checkedOutAt, currentlyActive } = member.presence ?? {
    checkedInAt: null,
    checkedOutAt: null,
    currentlyActive: false,
  };

  return (
    <small className="staff-attendance__member-presence">
      <span>
        <i>입실</i>
        <PresenceTime value={checkedInAt} />
      </span>
      <span aria-hidden="true" className="staff-attendance__time-divider">
        ·
      </span>
      <span>
        <i>퇴실</i>
        {currentlyActive ? (
          <em className="is-active">입실 중</em>
        ) : (
          <PresenceTime value={checkedOutAt} />
        )}
      </span>
    </small>
  );
}

function PresenceTime({ value }: { value: string | null }) {
  if (!value) {
    return <span>—</span>;
  }

  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    return <span>—</span>;
  }

  return <time dateTime={value}>{formatTimeOfDayFromEpochMs(epochMs)}</time>;
}

function MembershipStageCell({
  member,
  onResetRequest,
  pending,
}: {
  member: StaffAttendanceMember;
  onResetRequest: (member: StaffAttendanceMember) => void;
  pending: boolean;
}) {
  const joinDate = member.joinDate;

  return (
    <td className="staff-attendance__membership-stage" colSpan={7}>
      <span>
        <strong>
          {member.stage === 'starts-today' ? '오늘 입소' : '입소 예정'}
        </strong>
        {joinDate && (
          <time dateTime={joinDate}>{formatKoreanDate(joinDate)}</time>
        )}
      </span>
      {member.stage === 'starts-today' ? (
        <button
          aria-busy={pending}
          disabled={pending}
          onClick={() => onResetRequest(member)}
          type="button"
        >
          {pending ? '시작 중' : '오늘 출석부 시작'}
        </button>
      ) : (
        <small>입소일부터 출석 처리할 수 있어요.</small>
      )}
    </td>
  );
}

function AttendanceStatus({
  cell,
  disabled,
  future = false,
  member,
  onKeyDown,
  onSelect,
  pending,
  selected,
  slot,
  tabStop,
}: {
  cell: StaffAttendanceCell | undefined;
  disabled: boolean;
  future?: boolean;
  member: StaffAttendanceMember;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  pending: boolean;
  selected: boolean;
  slot: OperationalAttendanceSlot;
  tabStop: boolean;
}) {
  const safeCell = cell ?? {
    label: '미출석',
    source: 'NONE' as const,
    state: 'unmarked' as const,
  };
  const accessibleLabel = future
    ? '아직 시작 전'
    : safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'unmarked'
        ? '미출석'
        : safeCell.label;

  return (
    <button
      aria-busy={pending}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      aria-label={`${member.seatNumber === null ? '미배정' : `${member.seatNumber}번`} ${member.name}, ${slot}교시 ${pending ? '저장 중' : accessibleLabel}. 상태 변경`}
      aria-pressed={selected}
      className={cx(
        'staff-attendance__status',
        future ? 'is-future' : `is-${safeCell.state}`,
        selected && 'is-selected',
        pending && 'is-pending',
      )}
      disabled={disabled}
      id={attendanceCellId(member.memberId, slot)}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabStop ? 0 : -1}
      title={accessibleLabel}
      type="button"
    >
      {pending ? '···' : future ? '—' : safeCell.label}
    </button>
  );
}

function attendanceCellId(memberId: number, slot: number) {
  return `staff-attendance-cell-${memberId}-${slot}`;
}

function nextSeatSelection(
  current: AttendanceSelection,
  members: StaffAttendanceMember[],
) {
  const activeMembers = members.filter((member) => member.stage === 'active');
  const currentIndex = activeMembers.findIndex(
    (member) => member.memberId === current.memberId,
  );
  const nextMember = activeMembers[currentIndex + 1];

  if (!nextMember) {
    return current;
  }

  return {
    cell: nextMember.slots[current.slot - 1] ?? current.cell,
    memberId: nextMember.memberId,
    name: nextMember.name,
    seatNumber: nextMember.seatNumber,
    slot: current.slot,
  } satisfies AttendanceSelection;
}
