import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { OperationalAttendanceSlot } from '../../../../features/attendances/attendance-rules';
import {
  Badge,
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
  Table,
} from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import {
  ATTENDANCE_SLOTS,
  type StaffAttendanceCell,
  type StaffAttendanceMember,
} from '../model/staff-attendance';

type AttendanceFilter = 'all' | 'leave' | 'unmarked';

type AttendanceBoardProps = {
  activeSlot: OperationalAttendanceSlot | null;
  errorMessage: string | null;
  loading: boolean;
  members: StaffAttendanceMember[];
  onRetry: () => void;
  operationalSlot: OperationalAttendanceSlot | null;
  ready: boolean;
};

export function AttendanceBoard({
  activeSlot,
  errorMessage,
  loading,
  members,
  onRetry,
  operationalSlot,
  ready,
}: AttendanceBoardProps) {
  const searchId = useId();
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedSlotOverride, setSelectedSlotOverride] =
    useState<OperationalAttendanceSlot | null>(null);
  const selectedSlot = selectedSlotOverride ?? operationalSlot ?? 1;
  const effectiveFilter =
    activeSlot === null && filter === 'unmarked' ? 'all' : filter;

  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko');

    return members.filter((member) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        member.name.toLocaleLowerCase('ko').includes(normalizedQuery) ||
        String(member.seatNumber).includes(normalizedQuery);
      const matchesFilter =
        effectiveFilter === 'all' ||
        (effectiveFilter === 'leave' &&
          member.slots[selectedSlot - 1]?.state === 'leave') ||
        (effectiveFilter === 'unmarked' &&
          activeSlot !== null &&
          member.slots[selectedSlot - 1]?.state === 'unmarked');

      return matchesQuery && matchesFilter;
    });
  }, [activeSlot, effectiveFilter, members, query, selectedSlot]);

  return (
    <Card className="staff-attendance__board" padding="none">
      <header className="staff-attendance__board-head">
        <div>
          <h2>교시 출석부</h2>
          <p>오늘 좌석이 배정된 회원의 교시별 상태입니다.</p>
        </div>
        {ready && <Badge tone="neutral">{members.length}명</Badge>}
      </header>

      {loading && <SectionLoading label="오늘 출석부를 불러오고 있어요." />}
      {errorMessage && (
        <SectionError message={errorMessage} onRetry={onRetry} />
      )}
      {ready && (
        <>
          <div className="staff-attendance__board-toolbar">
            <label className="staff-attendance__search" htmlFor={searchId}>
              <span className="staff-attendance__sr-only">회원 검색</span>
              <Search aria-hidden="true" size={17} />
              <input
                autoComplete="off"
                id={searchId}
                onChange={(event) => setQuery(event.target.value)}
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
                onClick={() => setFilter('all')}
              />
              <FilterButton
                active={effectiveFilter === 'unmarked'}
                disabled={activeSlot === null}
                label={`${selectedSlot}교시 미처리`}
                onClick={() => setFilter('unmarked')}
              />
              <FilterButton
                active={effectiveFilter === 'leave'}
                label={`${selectedSlot}교시 휴무`}
                onClick={() => setFilter('leave')}
              />
            </div>
          </div>

          <ul aria-label="출석 상태 범례" className="staff-attendance__legend">
            <li>
              <i className="is-present" />O 처리
            </li>
            <li>
              <i className="is-unmarked" />
              미처리
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
                    ? '좌석이 배정된 회원이 없어요.'
                    : '조건에 맞는 회원이 없어요.'
                }
              >
                <p>
                  {members.length === 0
                    ? '오늘 출석부에 표시할 좌석 회원이 없습니다.'
                    : '검색어나 필터를 바꾸어 다시 확인해 주세요.'}
                </p>
              </SectionEmpty>
            </div>
          ) : (
            <>
              <DesktopAttendanceTable
                activeSlot={activeSlot}
                members={visibleMembers}
                operationalSlot={operationalSlot}
              />
              <MobileAttendanceList
                activeSlot={activeSlot}
                members={visibleMembers}
                onSelectSlot={setSelectedSlotOverride}
                operationalSlot={operationalSlot}
                selectedSlot={selectedSlot}
              />
            </>
          )}
        </>
      )}
    </Card>
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

function DesktopAttendanceTable({
  activeSlot,
  members,
  operationalSlot,
}: {
  activeSlot: OperationalAttendanceSlot | null;
  members: StaffAttendanceMember[];
  operationalSlot: OperationalAttendanceSlot | null;
}) {
  return (
    <div className="staff-attendance__desktop-table">
      <Table>
        <caption className="staff-attendance__sr-only">
          좌석 회원별 오늘 1교시부터 7교시까지의 출석 상태
        </caption>
        <thead>
          <tr>
            <th className="staff-attendance__identity-col" scope="col">
              회원
            </th>
            {ATTENDANCE_SLOTS.map((slot) => (
              <th
                className={cx(operationalSlot === slot && 'is-operational')}
                key={slot}
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
            <tr key={member.memberId}>
              <th className="staff-attendance__identity-col" scope="row">
                <MemberIdentity member={member} />
              </th>
              {member.slots.map((cell, index) => (
                <td
                  className={cx(
                    operationalSlot === index + 1 && 'is-operational',
                  )}
                  key={index}
                >
                  <AttendanceStatus cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function MobileAttendanceList({
  activeSlot,
  members,
  onSelectSlot,
  operationalSlot,
  selectedSlot,
}: {
  activeSlot: OperationalAttendanceSlot | null;
  members: StaffAttendanceMember[];
  onSelectSlot: (slot: OperationalAttendanceSlot) => void;
  operationalSlot: OperationalAttendanceSlot | null;
  selectedSlot: OperationalAttendanceSlot;
}) {
  const selectedPeriodRef = useRef<HTMLButtonElement>(null);
  const periodTabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedPeriod = selectedPeriodRef.current;
    const periodTabs = periodTabsRef.current;

    if (!selectedPeriod || !periodTabs) {
      return;
    }

    periodTabs.scrollLeft = Math.max(
      0,
      selectedPeriod.offsetLeft -
        (periodTabs.clientWidth - selectedPeriod.offsetWidth) / 2,
    );
  }, [selectedSlot]);

  return (
    <div className="staff-attendance__mobile-board">
      <p className="staff-attendance__period-hint">
        교시를 옆으로 밀어 1–7교시를 확인하세요.
      </p>
      <div
        aria-label="표시할 교시"
        className="staff-attendance__period-tabs"
        ref={periodTabsRef}
        role="group"
      >
        {ATTENDANCE_SLOTS.map((slot) => (
          <button
            aria-label={`${slot}교시${
              operationalSlot === slot
                ? activeSlot === slot
                  ? ' 현재'
                  : ' 예정'
                : ''
            }`}
            aria-pressed={selectedSlot === slot}
            className={cx(
              selectedSlot === slot && 'is-active',
              operationalSlot === slot && 'is-operational',
            )}
            key={slot}
            onClick={() => onSelectSlot(slot)}
            ref={selectedSlot === slot ? selectedPeriodRef : undefined}
            type="button"
          >
            {slot}
            <span>
              {operationalSlot === slot
                ? activeSlot === slot
                  ? '현재'
                  : '예정'
                : '교시'}
            </span>
          </button>
        ))}
      </div>

      <ul className="staff-attendance__mobile-list">
        {members.map((member) => (
          <li key={member.memberId}>
            <MemberIdentity member={member} />
            <AttendanceStatus cell={member.slots[selectedSlot - 1]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemberIdentity({ member }: { member: StaffAttendanceMember }) {
  return (
    <span className="staff-attendance__member">
      <b aria-label={`${member.seatNumber}번 좌석`}>{member.seatNumber}</b>
      <span>{member.name}</span>
    </span>
  );
}

function AttendanceStatus({ cell }: { cell: StaffAttendanceCell | undefined }) {
  const safeCell = cell ?? {
    label: '미처리',
    source: 'NONE' as const,
    state: 'unmarked' as const,
  };
  const accessibleLabel =
    safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'unmarked'
        ? '미처리'
        : safeCell.label;

  return (
    <span
      aria-label={accessibleLabel}
      className={cx('staff-attendance__status', `is-${safeCell.state}`)}
      title={accessibleLabel}
    >
      {safeCell.label}
    </span>
  );
}
