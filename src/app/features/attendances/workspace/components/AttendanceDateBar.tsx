import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cx } from '../../../../shared/lib/cx';
import { formatDottedDate } from '../../../../shared/lib/seoul-date';
import { AppShellToolbar } from '../../../../shared/layout/AppShell/AppShellToolbar';
import type { useAttendanceDate } from '../hooks/useAttendanceDate';
import '../styles/attendance-date-bar.css';

type AttendanceDateBarProps = {
  date: ReturnType<typeof useAttendanceDate>;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  query: string;
  refreshing: boolean;
  searchEnabled: boolean;
  searchId: string;
  writePending: boolean;
};

export function AttendanceDateBar({
  date,
  onQueryChange,
  onRefresh,
  query,
  refreshing,
  searchEnabled,
  searchId,
  writePending,
}: AttendanceDateBarProps) {
  const label = formatDottedDate(date.dateKey);

  return (
    <>
      <AppShellToolbar>
        <div
          className="attendance-toolbar"
          role="region"
          aria-label="출석 날짜와 사원 검색"
        >
          <section
            aria-busy={writePending}
            aria-label="출석 날짜 선택"
            className="attendance-date-bar"
          >
            <button
              aria-label="이전 날짜"
              disabled={writePending || date.previousDisabled}
              onClick={date.onPreviousDay}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <label
              className="attendance-date-bar__field"
              aria-disabled={writePending}
            >
              <span aria-hidden="true" className="attendance-date-bar__value">
                <time dateTime={date.dateKey}>{label}</time>
                <ChevronDown size={14} />
              </span>
              <input
                aria-label={`출석 날짜, ${label}`}
                disabled={writePending}
                onChange={(event) => date.onDateChange(event.target.value)}
                onClick={(event) => {
                  try {
                    event.currentTarget.showPicker?.();
                  } catch {
                    /* Native input remains usable when showPicker is unavailable. */
                  }
                }}
                type="date"
                value={date.dateKey}
              />
            </label>
            <button
              aria-label="다음 날짜"
              disabled={writePending || date.nextDisabled}
              onClick={date.onNextDay}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
            <button
              aria-label="오늘 출석부"
              aria-pressed={date.isToday}
              className="attendance-date-bar__today"
              disabled={writePending || date.isToday}
              onClick={date.onToday}
              type="button"
            >
              오늘
            </button>
            <button
              aria-busy={refreshing}
              aria-label={refreshing ? '출석부 갱신 중' : '출석부 새로고침'}
              className={cx(
                'attendance-date-bar__refresh',
                refreshing && 'is-refreshing',
              )}
              disabled={refreshing}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={17} />
            </button>
          </section>
          <label className="attendance-toolbar__search" htmlFor={searchId}>
            <span className="staff-attendance__sr-only">사원 검색</span>
            <Search aria-hidden="true" size={17} />
            <input
              autoComplete="off"
              disabled={!searchEnabled}
              id={searchId}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="이름·좌석 검색"
              type="search"
              value={query}
            />
          </label>
        </div>
      </AppShellToolbar>
      {date.dateKey < date.todayKey && (
        <p className="attendance-date-bar__history-note" role="note">
          현재 사원·좌석 기준이며, 퇴사·지점 이동한 사원은 보이지 않을 수
          있어요.
        </p>
      )}
    </>
  );
}
