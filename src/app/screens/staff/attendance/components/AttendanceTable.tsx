import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import { cx } from '../../../../shared/lib/cx';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import { Table } from '../../../../shared/ui';
import {
  ATTENDANCE_SLOTS,
  type AttendancePaintMode,
  type AttendanceSelection,
  type StaffAttendanceMember,
  toAttendanceCellId,
  toAttendanceCellKey,
  toAttendanceSelectionTiming,
} from '../model/staff-attendance';
import {
  AttendanceMemberIdentity,
  type AttendancePresenceLoadState,
} from './AttendanceMemberIdentity';
import { AttendanceStatusCell } from './AttendanceStatusCell';

type AttendanceTableProps = {
  activeSlot: OperationalAttendanceSlot | null;
  dock: ReactNode;
  members: StaffAttendanceMember[];
  mode: AttendancePaintMode;
  onActivate: (selection: AttendanceSelection) => void;
  onPresenceRequest: (member: StaffAttendanceMember) => void;
  onResetRequest: (member: StaffAttendanceMember) => void;
  onSelect: (selection: AttendanceSelection) => void;
  operationalSlot: OperationalAttendanceSlot | null;
  pendingCellKeys: ReadonlySet<string>;
  pendingMemberIds: ReadonlySet<number>;
  pendingPresenceMemberIds: ReadonlySet<number>;
  pendingResetIds: ReadonlySet<number>;
  presenceState: AttendancePresenceLoadState;
  selection: AttendanceSelection | null;
};

export function AttendanceTable({
  activeSlot,
  dock,
  members,
  mode,
  onActivate,
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
}: AttendanceTableProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const identityHeaderRef = useRef<HTMLTableCellElement>(null);
  const operationalHeaderRef = useRef<HTMLTableCellElement>(null);
  const activeMembers = members.filter((member) => member.stage === 'active');
  const navigableMembers = activeMembers.filter(
    (member) => !pendingMemberIds.has(member.memberId),
  );
  const editableSlots = ATTENDANCE_SLOTS.filter(
    (slot) =>
      toAttendanceSelectionTiming(slot, activeSlot, operationalSlot) !==
      'future',
  );
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

  const navigateCell = (
    event: KeyboardEvent<HTMLButtonElement>,
    member: StaffAttendanceMember,
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
                className={cx(
                  operationalSlot === slot && 'is-operational',
                  mode && activeSlot === slot && 'is-marking-mode',
                )}
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
                <AttendanceMemberIdentity
                  disabled={pendingMemberIds.has(member.memberId)}
                  member={member}
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
                        mode && activeSlot === slot && 'is-marking-mode',
                      )}
                      key={slot}
                    >
                      <AttendanceStatusCell
                        cell={cell}
                        disabled={pendingMemberIds.has(member.memberId)}
                        mode={mode}
                        member={member}
                        onActivate={() => onActivate(target)}
                        onKeyDown={(event) => navigateCell(event, member, slot)}
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
                  member={member}
                  onResetRequest={onResetRequest}
                  pending={pendingResetIds.has(member.memberId)}
                />
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      {dock}
    </div>
  );
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
