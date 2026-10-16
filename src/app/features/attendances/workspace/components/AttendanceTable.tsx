import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { cx } from '../../../../shared/lib/cx';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import { Table } from '../../../../shared/ui';
import {
  ATTENDANCE_SLOTS,
  type AttendanceSelection,
  type AttendanceBoardMember,
  toAttendanceCellId,
  toAttendanceCellKey,
  toAttendanceSelectionTiming,
} from '../model/attendance-board';
import {
  AttendanceMemberIdentity,
  type AttendancePresenceLoadState,
} from './AttendanceMemberIdentity';
import { AttendanceStatusCell } from './AttendanceStatusCell';
import { getAttendanceSeatLayoutClassName } from '../model/attendance-seat-layout';
import { useAttendanceViewport } from '../hooks/useAttendanceViewport';

type AttendanceDisplayRow =
  | { kind: 'member'; member: AttendanceBoardMember; seatNumber: number | null }
  | { kind: 'vacant'; seatNumber: number };

type AttendanceTableProps = {
  activeSlot: OperationalAttendanceSlot | null;
  branchName: string | null;
  dateKey: string;
  dock: ReactNode;
  interactive: boolean;
  members: AttendanceBoardMember[];
  onActivate: (selection: AttendanceSelection) => void;
  onDetailsRequest: (member: AttendanceBoardMember) => void;
  onPresenceRequest: (member: AttendanceBoardMember) => void;
  onResetRequest: (member: AttendanceBoardMember) => void;
  onSelect: (selection: AttendanceSelection) => void;
  operationalSlot: OperationalAttendanceSlot | null;
  pendingCellKeys: ReadonlySet<string>;
  pendingMemberIds: ReadonlySet<number>;
  pendingPresenceMemberIds: ReadonlySet<number>;
  pendingResetIds: ReadonlySet<number>;
  presenceEditable: boolean;
  presenceState: AttendancePresenceLoadState;
  selection: AttendanceSelection | null;
  vacantSeatNumbers: number[];
};

export function AttendanceTable({
  activeSlot,
  branchName,
  dateKey,
  dock,
  interactive,
  members,
  onActivate,
  onDetailsRequest,
  onPresenceRequest,
  onResetRequest,
  onSelect,
  operationalSlot,
  pendingCellKeys,
  pendingMemberIds,
  pendingPresenceMemberIds,
  pendingResetIds,
  presenceEditable,
  presenceState,
  selection,
  vacantSeatNumbers,
}: AttendanceTableProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hasCommands = interactive && dock !== null;
  useAttendanceViewport(frameRef, hasCommands);
  const identityHeaderRef = useRef<HTMLTableCellElement>(null);
  const operationalHeaderRef = useRef<HTMLTableCellElement>(null);
  const displayRows = useMemo(() => {
    const rows: AttendanceDisplayRow[] = members.map((member) => ({
      kind: 'member',
      member,
      seatNumber: member.seatNumber,
    }));
    rows.push(
      ...vacantSeatNumbers.map((seatNumber) => ({
        kind: 'vacant' as const,
        seatNumber,
      })),
    );
    return rows.sort(
      (left, right) =>
        (left.seatNumber ?? Number.MAX_SAFE_INTEGER) -
        (right.seatNumber ?? Number.MAX_SAFE_INTEGER),
    );
  }, [members, vacantSeatNumbers]);
  const activeMembers = interactive
    ? members.filter((member) => member.stage === 'active')
    : [];
  const navigableMembers = activeMembers.filter(
    (member) => !pendingMemberIds.has(member.memberId),
  );
  // The schedule highlights a period; it does not restrict manual attendance.
  const editableSlots: readonly OperationalAttendanceSlot[] = interactive
    ? ATTENDANCE_SLOTS
    : [];
  const selectedTabMember = selection
    ? navigableMembers.find((member) => member.memberId === selection.memberId)
    : undefined;
  const tabStopMember = selectedTabMember ?? navigableMembers[0];
  const selectedSlotEditable = selection
    ? editableSlots.includes(selection.slot)
    : false;
  const tabStopSlot = selectedSlotEditable
    ? selection?.slot
    : (activeSlot ?? editableSlots[0] ?? null);

  useEffect(() => {
    if (operationalSlot === null) {
      return;
    }

    const compactViewport = window.matchMedia('(max-width: 1279px)');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
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

        // Mobile shows all seven periods; discard any prior tablet offset.
        if (mobileViewport.matches) {
          scrollViewport.scrollLeft = 0;
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
    mobileViewport.addEventListener('change', alignOperationalSlot);

    return () => {
      cancelAnimationFrame(animationFrame);
      compactViewport.removeEventListener('change', alignOperationalSlot);
      mobileViewport.removeEventListener('change', alignOperationalSlot);
    };
  }, [operationalSlot]);

  const navigateCell = (
    event: KeyboardEvent<HTMLButtonElement>,
    member: AttendanceBoardMember,
    slot: OperationalAttendanceSlot,
  ) => {
    let nextMember = member;
    let nextSlot = slot;
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
      const slotIndex = editableSlots.indexOf(slot);
      const offset = event.key === 'ArrowLeft' ? -1 : 1;
      const candidate = editableSlots[slotIndex + offset];

      if (!candidate) {
        return;
      }
      nextSlot = candidate;
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
      const nextButton = document.getElementById(
        toAttendanceCellId(nextMember.memberId, nextSlot),
      );

      nextButton?.focus({ preventScroll: true });
      nextButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  return (
    <div
      className={cx(
        'staff-attendance__table-frame',
        hasCommands && 'has-command-dock',
      )}
      ref={frameRef}
    >
      <p className="staff-attendance__scroll-hint">
        <MoveHorizontal aria-hidden="true" size={14} />
        옆으로 밀어 1–7교시를 확인하세요.
      </p>
      <Table>
        <caption className="staff-attendance__sr-only">
          {formatKoreanDate(dateKey)} 좌석 순서 사원과 미배정 사원의 입퇴실
          시각, 1교시부터 7교시까지의 출석 상태. 공석은 출석 대상이 아닙니다.
        </caption>
        <thead>
          <tr>
            <th
              className="staff-attendance__identity-col"
              ref={identityHeaderRef}
              scope="col"
            >
              <span className="staff-attendance__identity-heading">사원</span>
              <span className="staff-attendance__compact-heading">
                좌석 · 이름
              </span>
              <small className="staff-attendance__identity-note">입·퇴실</small>
            </th>
            {ATTENDANCE_SLOTS.map((slot) => (
              <th
                aria-label={`${slot}교시${operationalSlot === slot ? (activeSlot === slot ? ' 현재' : ' 예정') : ''}`}
                className={cx(operationalSlot === slot && 'is-operational')}
                key={slot}
                ref={
                  operationalSlot === slot ? operationalHeaderRef : undefined
                }
                scope="col"
              >
                <span>
                  {slot}
                  <span className="staff-attendance__period-suffix">교시</span>
                </span>
                {operationalSlot === slot && (
                  <small>{activeSlot === slot ? '현재' : '예정'}</small>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row) => {
            const layoutClassName = getAttendanceSeatLayoutClassName(
              branchName,
              row.seatNumber,
            );
            if (row.kind === 'vacant') {
              return (
                <tr
                  className={cx('is-vacant', layoutClassName)}
                  data-seat-number={row.seatNumber}
                  key={`vacant:${row.seatNumber}`}
                >
                  <th className="staff-attendance__identity-col" scope="row">
                    <span className="staff-attendance__vacant-identity">
                      <b>{row.seatNumber}</b>
                      <strong>공석</strong>
                      <span className="staff-attendance__sr-only">
                        {' '}
                        · 출석 대상 아님
                      </span>
                    </span>
                  </th>
                  {ATTENDANCE_SLOTS.map((slot) => (
                    <td key={slot}>
                      <span
                        aria-hidden="true"
                        className="staff-attendance__vacant-cell"
                      >
                        X
                      </span>
                    </td>
                  ))}
                </tr>
              );
            }
            const { member } = row;
            return (
              <tr
                className={cx(
                  layoutClassName,
                  member.seatNumber === null && 'is-unassigned',
                  member.stage !== 'active' && 'is-prestart',
                )}
                data-seat-number={member.seatNumber ?? undefined}
                key={`member:${member.memberId}`}
              >
                <th className="staff-attendance__identity-col" scope="row">
                  <AttendanceMemberIdentity
                    dateKey={dateKey}
                    disabled={pendingMemberIds.has(member.memberId)}
                    interactive={interactive && presenceEditable}
                    member={member}
                    onDetailsRequest={onDetailsRequest}
                    onPresenceRequest={onPresenceRequest}
                    presencePending={pendingPresenceMemberIds.has(
                      member.memberId,
                    )}
                    presenceState={presenceState}
                  />
                </th>
                {member.stage === 'active' ? (
                  member.slots.map((cell, index) => {
                    const slot = (index + 1) as OperationalAttendanceSlot;
                    const timing = toAttendanceSelectionTiming(
                      slot,
                      activeSlot,
                      operationalSlot,
                    );
                    const pending = pendingCellKeys.has(
                      toAttendanceCellKey(member.memberId, slot),
                    );
                    const selected =
                      selection?.memberId === member.memberId &&
                      selection.slot === slot;
                    const target = {
                      cell,
                      memberId: member.memberId,
                      name: member.name,
                      seatNumber: member.seatNumber,
                      slot,
                    } satisfies AttendanceSelection;

                    return (
                      <td
                        className={cx(
                          operationalSlot === slot && 'is-operational',
                        )}
                        key={slot}
                      >
                        <AttendanceStatusCell
                          cell={cell}
                          disabled={pendingMemberIds.has(member.memberId)}
                          interactive={interactive}
                          member={member}
                          onActivate={() => onActivate(target)}
                          onKeyDown={(event) =>
                            navigateCell(event, member, slot)
                          }
                          onSelect={() => onSelect(target)}
                          pending={pending}
                          selected={selected}
                          slot={slot}
                          tabStop={
                            tabStopMember?.memberId === member.memberId &&
                            tabStopSlot === slot
                          }
                          timing={timing}
                        />
                      </td>
                    );
                  })
                ) : (
                  <MembershipStageCell
                    interactive={interactive}
                    member={member}
                    onResetRequest={onResetRequest}
                    pending={pendingResetIds.has(member.memberId)}
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
      {interactive ? dock : null}
    </div>
  );
}

function MembershipStageCell({
  interactive,
  member,
  onResetRequest,
  pending,
}: {
  interactive: boolean;
  member: AttendanceBoardMember;
  onResetRequest: (member: AttendanceBoardMember) => void;
  pending: boolean;
}) {
  const joinDate = member.joinDate;

  return (
    <td className="staff-attendance__membership-stage" colSpan={7}>
      <span>
        <strong>
          {member.stage === 'starts-today' ? '해당일 입사' : '입사 예정'}
        </strong>
        {joinDate && (
          <time dateTime={joinDate}>{formatKoreanDate(joinDate)}</time>
        )}
      </span>
      {interactive && member.stage === 'starts-today' ? (
        <button
          aria-busy={pending}
          disabled={pending}
          onClick={() => onResetRequest(member)}
          type="button"
        >
          {pending ? '시작 중' : '출석부 시작'}
        </button>
      ) : (
        <small>입사일부터 출석 기록이 표시돼요.</small>
      )}
    </td>
  );
}
