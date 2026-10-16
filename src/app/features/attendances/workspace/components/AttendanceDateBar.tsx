import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDottedDate } from '../../../../shared/lib/seoul-date';
import { AppShellToolbar } from '../../../../shared/layout/AppShell/AppShellToolbar';
import type { useAttendanceDate } from '../hooks/useAttendanceDate';
import '../styles/attendance-date-bar.css';

type AttendanceDateBarProps = {
  date: ReturnType<typeof useAttendanceDate>;
  writePending: boolean;
};

export function AttendanceDateBar({
  date,
  writePending,
}: AttendanceDateBarProps) {
  const label = formatDottedDate(date.dateKey);

  return (
    <>
      <AppShellToolbar>
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
        </section>
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
