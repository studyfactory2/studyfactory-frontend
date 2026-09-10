import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';

type AdminAttendanceDateBarProps = {
  branchName: string;
  dateKey: string;
  isToday: boolean;
  maxDateKey: string;
  nextDisabled: boolean;
  onDateChange: (dateKey: string) => void;
  onNextDay: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
  writePending: boolean;
};

export function AdminAttendanceDateBar({
  branchName,
  dateKey,
  isToday,
  maxDateKey,
  nextDisabled,
  onDateChange,
  onNextDay,
  onPreviousDay,
  onToday,
  writePending,
}: AdminAttendanceDateBarProps) {
  return (
    <section
      aria-busy={writePending}
      aria-label="출석 날짜 선택"
      className="admin-attendance__date-bar"
    >
      <div className="admin-attendance__date-summary">
        <span aria-hidden="true" className="admin-attendance__date-icon">
          <CalendarDays size={18} />
        </span>
        <div>
          <p>{isToday ? '오늘 출석' : '과거 출석 조회'}</p>
          <strong>
            {branchName} · {formatKoreanDate(dateKey)}
          </strong>
        </div>
      </div>

      <div className="admin-attendance__date-controls">
        <button
          aria-label="이전 날짜"
          className="admin-attendance__date-step"
          disabled={writePending}
          onClick={onPreviousDay}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <label
          aria-disabled={writePending}
          className="admin-attendance__date-field"
        >
          <span className="admin-attendance__sr-only">조회 날짜</span>
          <input
            disabled={writePending}
            max={maxDateKey}
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={dateKey}
          />
        </label>
        <button
          aria-label="다음 날짜"
          className="admin-attendance__date-step"
          disabled={writePending || nextDisabled}
          onClick={onNextDay}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
        <button
          className="admin-attendance__today"
          disabled={writePending || isToday}
          onClick={onToday}
          type="button"
        >
          오늘
        </button>
      </div>

      {!isToday && (
        <p className="admin-attendance__history-note" role="note">
          과거 화면은 당시 교시·입퇴실 기록에 현재 회원·좌석·고정 휴무 설정을
          연결해 재구성해요. 퇴사하거나 지점을 옮긴 회원은 보이지 않을 수 있어
          원본 역사 명단과 다를 수 있습니다.
        </p>
      )}
    </section>
  );
}
