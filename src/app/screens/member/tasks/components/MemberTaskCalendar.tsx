import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { MemberTaskCalendarDay } from '../../../../features/member-tasks/member-tasks-api';
import { SEOUL_WEEKDAY_LABELS } from '../../../../shared/lib/seoul-date';
import '../styles/MemberTaskCalendar.css';

export type MemberTaskCalendarProps = {
  month: string;
  selectedDate: string;
  today: string;
  days?: MemberTaskCalendarDay[];
  draftDates: string[];
  loading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  onMonthChange: (month: string) => void;
  onDateChange: (date: string) => void;
  onToday: () => void;
  onRefresh: () => void;
};

export function MemberTaskCalendar({
  month,
  selectedDate,
  today,
  days,
  draftDates,
  loading,
  refreshing,
  errorMessage,
  onMonthChange,
  onDateChange,
  onToday,
  onRefresh,
}: MemberTaskCalendarProps) {
  const { year, monthNumber } = parseMonth(month);
  const cells = buildMonthCells(year, monthNumber);
  // A retained response from the previous query must never look like this
  // month's counts. Absent entries are unknown, not an empty task list.
  const countsByDate = new Map(
    (days ?? [])
      .filter((day) => day.date.startsWith(`${month}-`))
      .map((day) => [day.date, day]),
  );
  const drafts = new Set(draftDates);
  const hasCounts = countsByDate.size > 0;
  const previousMonth = shiftMonth(year, monthNumber, -1);
  const nextMonth = shiftMonth(year, monthNumber, 1);
  const status = loading
    ? '할 일 개수를 불러오는 중이에요.'
    : refreshing
      ? '최신 할 일을 확인하고 있어요.'
      : errorMessage
        ? hasCounts
          ? '이전에 확인한 개수예요. 새로고침해 주세요.'
          : '개수를 확인하지 못했어요. 날짜는 선택할 수 있어요.'
        : '날짜를 눌러 할 일을 확인하세요.';

  return (
    <section className="member-task-calendar" aria-label="할 일 달력">
      <header className="member-task-calendar__header">
        <div className="member-task-calendar__month-navigation">
          <button
            aria-label="이전 달 보기"
            className="member-task-calendar__icon-button"
            disabled={previousMonth === null}
            onClick={() => previousMonth && onMonthChange(previousMonth)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <h2 className="member-task-calendar__month" aria-live="polite">
            {year}년 {monthNumber}월
          </h2>
          <button
            aria-label="다음 달 보기"
            className="member-task-calendar__icon-button"
            disabled={nextMonth === null}
            onClick={() => nextMonth && onMonthChange(nextMonth)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="member-task-calendar__actions">
          <button
            className="member-task-calendar__today"
            onClick={onToday}
            type="button"
          >
            오늘
          </button>
          <button
            aria-label="달력 할 일 개수 새로고침"
            className="member-task-calendar__icon-button"
            disabled={loading || refreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={refreshing ? 'is-refreshing' : undefined}
              size={16}
            />
          </button>
        </div>
      </header>

      <p className="member-task-calendar__status" role="status">
        {status}
      </p>
      {errorMessage && (
        <p className="member-task-calendar__error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="member-task-calendar__weekdays" aria-hidden="true">
        {SEOUL_WEEKDAY_LABELS.map((label, index) => (
          <span key={label} className={index === 0 ? 'is-sunday' : undefined}>
            {label}
          </span>
        ))}
      </div>
      <ol
        className="member-task-calendar__grid"
        aria-label={`${year}년 ${monthNumber}월 날짜`}
      >
        {cells.map((cell, index) => {
          if (!cell) return <li key={`padding-${index}`} aria-hidden="true" />;
          const count = countsByDate.get(cell.date);
          const selected = cell.date === selectedDate;
          const isToday = cell.date === today;
          const hasDraft = drafts.has(cell.date);
          const completed = Boolean(
            count &&
            count.totalCount > 0 &&
            count.completedCount === count.totalCount,
          );
          const countLabel = count
            ? count.totalCount === 0
              ? '저장된 할 일 없음'
              : `할 일 ${count.totalCount}개 중 ${count.completedCount}개 완료`
            : '할 일 개수 확인 전';

          return (
            <li key={cell.date}>
              <button
                aria-current={isToday ? 'date' : undefined}
                aria-label={[
                  `${year}년 ${monthNumber}월 ${cell.day}일 ${SEOUL_WEEKDAY_LABELS[cell.weekday]}요일`,
                  isToday ? '오늘' : '',
                  countLabel,
                  hasDraft ? '저장하지 않은 입력 있음' : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                aria-pressed={selected}
                className={[
                  'member-task-calendar__day',
                  cell.weekday === 0 ? 'is-sunday' : '',
                  isToday ? 'is-today' : '',
                  selected ? 'is-selected' : '',
                  completed ? 'is-complete' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onDateChange(cell.date)}
                type="button"
              >
                <span className="member-task-calendar__day-number">
                  {cell.day}
                </span>
                <span
                  className="member-task-calendar__count"
                  aria-hidden="true"
                >
                  {count ? (
                    count.totalCount > 0 ? (
                      <>
                        <strong>{count.completedCount}</strong>
                        <span>/{count.totalCount}</span>
                      </>
                    ) : (
                      <span className="member-task-calendar__empty-count">
                        —
                      </span>
                    )
                  ) : (
                    <span className="member-task-calendar__unknown-count">
                      ···
                    </span>
                  )}
                </span>
                {hasDraft && (
                  <span
                    className="member-task-calendar__draft-dot"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="member-task-calendar__legend">
        <span>
          <strong>완료</strong> / 전체 할 일
        </span>
        {draftDates.some((date) => date.startsWith(`${month}-`)) && (
          <span>
            <i className="member-task-calendar__draft-dot" aria-hidden="true" />
            저장 전 입력
          </span>
        )}
      </footer>
    </section>
  );
}

function parseMonth(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match || Number(match[1]) < 1) {
    throw new Error('할 일 달력의 월을 확인해 주세요.');
  }
  return { year: Number(match[1]), monthNumber: Number(match[2]) };
}

function shiftMonth(year: number, month: number, offset: -1 | 1) {
  const index = (year - 1) * 12 + month - 1 + offset;
  if (index < 0 || index >= 9999 * 12) return null;
  return `${String(Math.floor(index / 12) + 1).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

function buildMonthCells(year: number, month: number) {
  // Date.UTC treats years 0–99 as 1900–1999. Setting the full UTC year avoids
  // that coercion and keeps calendar arithmetic independent of browser zone.
  const first = new Date(0);
  first.setUTCFullYear(year, month - 1, 1);
  first.setUTCHours(0, 0, 0, 0);
  const leading = first.getUTCDay();
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const count = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
  const cellCount = Math.ceil((leading + count) / 7) * 7;
  const monthKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - leading + 1;
    return day < 1 || day > count
      ? null
      : {
          date: `${monthKey}-${String(day).padStart(2, '0')}`,
          day,
          weekday: index % 7,
        };
  });
}
