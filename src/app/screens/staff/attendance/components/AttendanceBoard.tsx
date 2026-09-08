import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MoveHorizontal, Search } from 'lucide-react';
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
  const filterSlot: OperationalAttendanceSlot = operationalSlot ?? 7;
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
          member.slots[filterSlot - 1]?.state === 'leave') ||
        (effectiveFilter === 'unmarked' &&
          activeSlot !== null &&
          member.slots[filterSlot - 1]?.state === 'unmarked');

      return matchesQuery && matchesFilter;
    });
  }, [activeSlot, effectiveFilter, filterSlot, members, query]);

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
                label={`${filterSlot}교시 미처리`}
                onClick={() => setFilter('unmarked')}
              />
              <FilterButton
                active={effectiveFilter === 'leave'}
                label={`${filterSlot}교시 휴무`}
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
            <AttendanceTable
              activeSlot={activeSlot}
              members={visibleMembers}
              operationalSlot={operationalSlot}
            />
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

function AttendanceTable({
  activeSlot,
  members,
  operationalSlot,
}: {
  activeSlot: OperationalAttendanceSlot | null;
  members: StaffAttendanceMember[];
  operationalSlot: OperationalAttendanceSlot | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const identityHeaderRef = useRef<HTMLTableCellElement>(null);
  const operationalHeaderRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (operationalSlot === null) {
      return;
    }

    const compactViewport = window.matchMedia('(max-width: 1023px)');
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

  return (
    <div className="staff-attendance__table-frame" ref={frameRef}>
      <p className="staff-attendance__scroll-hint">
        <MoveHorizontal aria-hidden="true" size={14} />
        옆으로 밀어 1–7교시를 확인하세요.
      </p>
      <Table>
        <caption className="staff-attendance__sr-only">
          좌석 회원별 오늘 1교시부터 7교시까지의 출석 상태
        </caption>
        <thead>
          <tr>
            <th
              className="staff-attendance__identity-col"
              ref={identityHeaderRef}
              scope="col"
            >
              회원
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
            <tr key={member.memberId}>
              <th className="staff-attendance__identity-col" scope="row">
                <MemberIdentity member={member} />
              </th>
              {member.slots.map((cell, index) => {
                const slot = (index + 1) as OperationalAttendanceSlot;
                const future =
                  cell.state === 'unmarked' &&
                  operationalSlot !== null &&
                  (activeSlot === null || slot > activeSlot);

                return (
                  <td
                    className={cx(operationalSlot === slot && 'is-operational')}
                    key={index}
                  >
                    <AttendanceStatus cell={cell} future={future} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
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

function AttendanceStatus({
  cell,
  future = false,
}: {
  cell: StaffAttendanceCell | undefined;
  future?: boolean;
}) {
  const safeCell = cell ?? {
    label: '미처리',
    source: 'NONE' as const,
    state: 'unmarked' as const,
  };
  const accessibleLabel = future
    ? '아직 시작 전'
    : safeCell.state === 'present'
      ? '출석 처리'
      : safeCell.state === 'unmarked'
        ? '미처리'
        : safeCell.label;

  return (
    <span
      aria-label={accessibleLabel}
      className={cx(
        'staff-attendance__status',
        future ? 'is-future' : `is-${safeCell.state}`,
      )}
      title={accessibleLabel}
    >
      {future ? '—' : safeCell.label}
    </span>
  );
}
