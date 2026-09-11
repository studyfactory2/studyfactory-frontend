import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import { memberPlanQueryKeys } from '../../../../features/plans/plan-query-keys';
import {
  fetchMemberWeeklyPlan,
  type WeeklyPlanItemResponse,
} from '../../../../features/plans/plans-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  addDays,
  formatDateRange,
  formatKoreanDate,
  formatShortDate,
  getWeekStartKey,
} from '../../../../shared/lib/seoul-date';
import {
  Badge,
  Modal,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { MemberResponse } from '../../../../features/members/members-api';
import '../styles/member-weekly-plan-viewer.css';

type MemberWeeklyPlanViewerProps = {
  member: MemberResponse;
  onClose: () => void;
  operatorMemberId: number;
  ownerKey: SessionOwnerKey;
};

type PlanRow = {
  duration: string;
  isBreak?: boolean;
  label: string;
  periodIndex: number;
  time: string;
};

type PlanDay = {
  dateKey: string;
  dayIndex: number;
  label: string;
  longLabel: string;
};

const PLAN_STALE_TIME_MS = 60 * 1_000;
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const DAY_LONG_LABELS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
] as const;
const PLAN_ROWS: readonly PlanRow[] = [
  { duration: '90분', label: '1교시', periodIndex: 0, time: '09:00–10:30' },
  { duration: '80분', label: '2교시', periodIndex: 1, time: '10:45–12:05' },
  {
    duration: '75분',
    isBreak: true,
    label: '점심시간',
    periodIndex: 100,
    time: '12:05–13:20',
  },
  { duration: '70분', label: '3교시', periodIndex: 2, time: '13:20–14:30' },
  { duration: '90분', label: '4교시', periodIndex: 3, time: '14:45–16:15' },
  { duration: '80분', label: '5교시', periodIndex: 4, time: '16:30–17:50' },
  {
    duration: '75분',
    isBreak: true,
    label: '저녁시간',
    periodIndex: 101,
    time: '17:50–19:05',
  },
  { duration: '80분', label: '6교시', periodIndex: 5, time: '19:05–20:25' },
  { duration: '80분', label: '7교시', periodIndex: 6, time: '20:40–22:00' },
];
const VISIBLE_PERIODS = new Set(PLAN_ROWS.map((row) => row.periodIndex));

export function MemberWeeklyPlanViewer({
  member,
  onClose,
  operatorMemberId,
  ownerKey,
}: MemberWeeklyPlanViewerProps) {
  const today = useSeoulToday();
  const currentWeekStartKey = getWeekStartKey(today.dateKey);
  const [weekStartKey, setWeekStartKey] = useState(currentWeekStartKey);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() =>
    getDayIndex(currentWeekStartKey, today.dateKey),
  );
  const days = useMemo(() => buildPlanDays(weekStartKey), [weekStartKey]);
  const planQuery = useQuery({
    queryFn: () =>
      fetchMemberWeeklyPlan(
        member.id,
        member.branchId,
        weekStartKey,
        operatorMemberId,
      ),
    queryKey: memberPlanQueryKeys.managedWeek(
      ownerKey,
      member.branchId,
      member.id,
      weekStartKey,
    ),
    refetchOnWindowFocus: false,
    staleTime: PLAN_STALE_TIME_MS,
  });
  const plan = planQuery.data;
  const itemsByCell = useMemo(
    () => groupItemsByCell(plan?.items ?? []),
    [plan?.items],
  );
  const visibleItems = useMemo(
    () =>
      (plan?.items ?? []).filter(
        (item) =>
          VISIBLE_PERIODS.has(item.periodIndex) &&
          item.dayIndex >= 0 &&
          item.dayIndex < DAY_LABELS.length &&
          item.content.trim() !== '',
      ),
    [plan?.items],
  );
  const completedCount = visibleItems.filter((item) => item.done).length;
  const selectedDay = days[selectedDayIndex] ?? days[0];

  const moveWeek = (amount: -1 | 1) => {
    setWeekStartKey((current) => addDays(current, amount * 7));
    setSelectedDayIndex(0);
  };

  const moveToCurrentWeek = () => {
    setWeekStartKey(currentWeekStartKey);
    setSelectedDayIndex(getDayIndex(currentWeekStartKey, today.dateKey));
  };

  return (
    <Modal
      onClose={onClose}
      open
      panelClassName="admin-member-plan-modal"
      size="lg"
      title="주간 계획 보기"
    >
      <div className="admin-member-plan">
        <header className="admin-member-plan__toolbar">
          <div className="admin-member-plan__identity">
            <span aria-hidden="true">
              <BookOpenCheck size={19} />
            </span>
            <div>
              <strong>{member.name}</strong>
              <small>
                {member.seatNumber === null
                  ? '미배정 회원'
                  : `${member.seatNumber}번 좌석 회원`}
              </small>
            </div>
            <Badge tone="neutral">읽기 전용</Badge>
          </div>

          <nav
            aria-label="주간 계획 기간"
            className="admin-member-plan__week-nav"
          >
            <button
              aria-label="이전 주"
              disabled={planQuery.isFetching}
              onClick={() => moveWeek(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={19} />
            </button>
            <p aria-live="polite">
              <strong>
                {formatDateRange(weekStartKey, addDays(weekStartKey, 6))}
              </strong>
              <small>{weekStartKey}</small>
            </p>
            <button
              className="admin-member-plan__today"
              disabled={
                planQuery.isFetching || weekStartKey === currentWeekStartKey
              }
              onClick={moveToCurrentWeek}
              type="button"
            >
              이번 주
            </button>
            <button
              aria-label="다음 주"
              disabled={planQuery.isFetching}
              onClick={() => moveWeek(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={19} />
            </button>
          </nav>
        </header>

        {planQuery.isPending ? (
          <SectionLoading label="주간 계획을 불러오는 중" />
        ) : planQuery.isError ? (
          <SectionError
            message={planQuery.error.message}
            onRetry={() => void planQuery.refetch()}
          />
        ) : plan === undefined ? null : (
          <>
            <section className="admin-member-plan__goal">
              <div>
                <span>WEEKLY GOAL</span>
                <h4>이번 주 목표</h4>
              </div>
              <p>{plan.goal.trim() || '등록된 이번 주 목표가 없어요.'}</p>
              <dl aria-label="주간 계획 요약">
                <div>
                  <dt>전체 계획</dt>
                  <dd>{visibleItems.length}개</dd>
                </div>
                <div>
                  <dt>완료</dt>
                  <dd>{completedCount}개</dd>
                </div>
              </dl>
            </section>

            {visibleItems.length === 0 ? (
              <SectionEmpty title="이 주에는 등록된 계획이 없어요.">
                <p>회원이 계획을 작성하면 요일과 교시별로 여기에 보여요.</p>
              </SectionEmpty>
            ) : (
              <>
                <DesktopPlanBoard days={days} itemsByCell={itemsByCell} />
                <MobilePlanTimeline
                  days={days}
                  itemsByCell={itemsByCell}
                  onSelectDay={setSelectedDayIndex}
                  selectedDay={selectedDay}
                  selectedDayIndex={selectedDayIndex}
                  todayKey={today.dateKey}
                />
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function DesktopPlanBoard({
  days,
  itemsByCell,
}: {
  days: readonly PlanDay[];
  itemsByCell: ReadonlyMap<string, readonly WeeklyPlanItemResponse[]>;
}) {
  return (
    <div className="admin-member-plan__table-scroll">
      <table className="admin-member-plan__table">
        <caption className="admin-member-plan__sr-only">
          월요일부터 일요일까지 교시별 주간 계획
        </caption>
        <thead>
          <tr>
            <th scope="col">시간</th>
            {days.map((day) => (
              <th key={day.dateKey} scope="col">
                <span>{day.label}</span>
                <strong>{formatShortDate(day.dateKey)}</strong>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((row) => (
            <tr className={row.isBreak ? 'is-break' : ''} key={row.periodIndex}>
              <th scope="row">
                <strong>{row.label}</strong>
                <span>{row.time}</span>
              </th>
              {days.map((day) => (
                <td key={`${row.periodIndex}-${day.dayIndex}`}>
                  <PlanItems
                    items={itemsByCell.get(
                      toCellKey(row.periodIndex, day.dayIndex),
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobilePlanTimeline({
  days,
  itemsByCell,
  onSelectDay,
  selectedDay,
  selectedDayIndex,
  todayKey,
}: {
  days: readonly PlanDay[];
  itemsByCell: ReadonlyMap<string, readonly WeeklyPlanItemResponse[]>;
  onSelectDay: (dayIndex: number) => void;
  selectedDay: PlanDay;
  selectedDayIndex: number;
  todayKey: string;
}) {
  return (
    <div className="admin-member-plan__mobile">
      <div aria-label="요일 선택" className="admin-member-plan__days">
        {days.map((day) => (
          <button
            aria-current={day.dateKey === todayKey ? 'date' : undefined}
            aria-pressed={selectedDayIndex === day.dayIndex}
            className={selectedDayIndex === day.dayIndex ? 'is-active' : ''}
            key={day.dateKey}
            onClick={() => onSelectDay(day.dayIndex)}
            type="button"
          >
            <span>{day.label}</span>
            <strong>{Number(day.dateKey.slice(-2))}</strong>
            {day.dateKey === todayKey && <i aria-label="오늘" />}
          </button>
        ))}
      </div>

      <section
        aria-label={`${formatKoreanDate(selectedDay.dateKey)} 계획`}
        className="admin-member-plan__timeline"
      >
        <header>
          <div>
            <span>{formatKoreanDate(selectedDay.dateKey)}</span>
            <h4>{selectedDay.longLabel} 계획</h4>
          </div>
          <Badge tone="neutral">
            {countDayItems(itemsByCell, selectedDay.dayIndex)}개
          </Badge>
        </header>
        <ol>
          {PLAN_ROWS.map((row) => (
            <li className={row.isBreak ? 'is-break' : ''} key={row.periodIndex}>
              <span className="admin-member-plan__time">
                <strong>{row.time.split('–')[0]}</strong>
                <small>{row.time.split('–')[1]}</small>
              </span>
              <span aria-hidden="true" className="admin-member-plan__rail">
                <i />
              </span>
              <div className="admin-member-plan__period-card">
                <header>
                  <strong>{row.label}</strong>
                  <small>{row.duration}</small>
                </header>
                <PlanItems
                  emptyLabel="계획 없음"
                  items={itemsByCell.get(
                    toCellKey(row.periodIndex, selectedDay.dayIndex),
                  )}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function PlanItems({
  emptyLabel = '—',
  items = [],
}: {
  emptyLabel?: string;
  items?: readonly WeeklyPlanItemResponse[];
}) {
  const populatedItems = items.filter((item) => item.content.trim() !== '');

  if (populatedItems.length === 0) {
    return <span className="admin-member-plan__empty-cell">{emptyLabel}</span>;
  }

  return (
    <ul className="admin-member-plan__items">
      {populatedItems.map((item) => (
        <li className={item.done ? 'is-done' : ''} key={item.id}>
          <i aria-hidden="true">
            {item.done && <Check size={10} strokeWidth={3} />}
          </i>
          <span>{item.content}</span>
        </li>
      ))}
    </ul>
  );
}

function buildPlanDays(weekStartKey: string): PlanDay[] {
  return DAY_LABELS.map((label, dayIndex) => ({
    dateKey: addDays(weekStartKey, dayIndex),
    dayIndex,
    label,
    longLabel: DAY_LONG_LABELS[dayIndex],
  }));
}

function getDayIndex(weekStartKey: string, dateKey: string) {
  const index = buildPlanDays(weekStartKey).findIndex(
    (day) => day.dateKey === dateKey,
  );

  return index < 0 ? 0 : index;
}

function groupItemsByCell(items: readonly WeeklyPlanItemResponse[]) {
  const grouped = new Map<string, WeeklyPlanItemResponse[]>();

  for (const item of items) {
    const key = toCellKey(item.periodIndex, item.dayIndex);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  for (const cellItems of grouped.values()) {
    cellItems.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.id - right.id,
    );
  }

  return grouped;
}

function countDayItems(
  itemsByCell: ReadonlyMap<string, readonly WeeklyPlanItemResponse[]>,
  dayIndex: number,
) {
  return PLAN_ROWS.reduce(
    (count, row) =>
      count +
      (itemsByCell
        .get(toCellKey(row.periodIndex, dayIndex))
        ?.filter((item) => item.content.trim() !== '').length ?? 0),
    0,
  );
}

function toCellKey(periodIndex: number, dayIndex: number) {
  return `${periodIndex}:${dayIndex}`;
}
