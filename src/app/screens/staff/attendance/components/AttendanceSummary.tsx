import { RefreshCw } from 'lucide-react';
import { Instrument } from '../../../../shared/ui';
import { cx } from '../../../../shared/lib/cx';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import type { StaffAttendanceSummary as AttendanceSummaryValue } from '../model/staff-attendance';

type AttendanceSummaryProps = {
  dateKey: string;
  onRefresh: () => void;
  periodLabel: string;
  refreshing: boolean;
  summary: AttendanceSummaryValue;
};

export function AttendanceSummary({
  dateKey,
  onRefresh,
  periodLabel,
  refreshing,
  summary,
}: AttendanceSummaryProps) {
  return (
    <Instrument
      className="staff-attendance__summary"
      label="오늘 출석"
      note={
        <span className="staff-attendance__asof">
          <span>{formatKoreanDate(dateKey)}</span>
          <strong>{periodLabel}</strong>
          <button
            aria-busy={refreshing}
            aria-label={refreshing ? '출석 현황 갱신 중' : '출석 현황 새로고침'}
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
        </span>
      }
    >
      <div aria-live="polite" className="staff-attendance__metrics">
        <Metric
          className="is-live"
          label="입실 중"
          value={summary.checkedInCount}
        />
        <Metric
          className="is-expected"
          label="좌석 회원"
          value={summary.expectedCount}
        />
        <Metric
          className="is-present"
          label="O 처리"
          value={summary.presentCount}
        />
        <Metric
          className="is-unmarked"
          label="미처리"
          value={summary.unmarkedCount}
        />
        <Metric className="is-leave" label="휴무" value={summary.leaveCount} />
      </div>
    </Instrument>
  );
}

function Metric({
  className,
  label,
  value,
}: {
  className: string;
  label: string;
  value: number | null;
}) {
  return (
    <p className={cx('staff-attendance__metric', className)}>
      <span className="staff-attendance__metric-key">{label}</span>
      <strong>
        {value ?? '—'}
        {value !== null && <small>명</small>}
      </strong>
    </p>
  );
}
