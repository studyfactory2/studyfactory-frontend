import type { RefObject } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, SectionError, SectionLoading } from '../../../../shared/ui';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import { expandManagerLeaveCalendarPeriods } from '../../../leaves/leave-management-model';
import type { AttendanceMemberLeaveState } from '../../../manager-leaves/hooks/useAttendanceMemberLeave';
import { leaveHistorySourceLabel } from '../model/attendance-reason-calendar';

export type OccurrenceTarget = {
  dateKey: string;
  entryKey: string;
  slot: number;
  label: string;
};

type AttendanceReasonHistoryProps = {
  leaves: AttendanceMemberLeaveState;
  inspectedDate: string;
  pending: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRequestOccurrence: (target: OccurrenceTarget) => void;
  onRequestStopRule: () => void;
};

export function AttendanceReasonHistory({
  leaves,
  inspectedDate,
  pending,
  headingRef,
  onRequestOccurrence,
  onRequestStopRule,
}: AttendanceReasonHistoryProps) {
  const historyLoading = leaves.request.loading || leaves.calendar.loading;
  const historyError =
    leaves.request.errorMessage ?? leaves.calendar.errorMessage;
  const inspectedDay = leaves.calendar.cells.find(
    (day) => day.inMonth && day.dateKey === inspectedDate,
  );
  const historyPeriods = expandManagerLeaveCalendarPeriods(
    inspectedDay?.entries ?? [],
  );

  return (
    <section
      className="attendance-reason__history"
      aria-label="휴무 내역 및 취소"
    >
      <header>
        <h3 ref={headingRef} tabIndex={-1}>
          휴무 내역 및 취소
        </h3>
        <button
          className="attendance-reason__refresh"
          aria-label="휴무 내역 새로고침"
          type="button"
          disabled={pending || leaves.request.refreshing}
          onClick={leaves.request.onRefresh}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>
      <p className="attendance-reason__history-date">
        조회 날짜 · {formatKoreanDate(inspectedDate)}
      </p>
      {historyError ? (
        <SectionError
          message={historyError}
          onRetry={leaves.request.onRefresh}
        />
      ) : historyLoading ? (
        <SectionLoading label="휴무 내역을 확인하고 있어요." />
      ) : leaves.member.unavailable ? (
        <p>현재 지점의 사원을 다시 확인해 주세요.</p>
      ) : !inspectedDay ? (
        <p>현재 달력에서 조회할 날짜를 선택해 주세요.</p>
      ) : historyPeriods.length === 0 ? (
        <p>이 날짜에 등록된 휴무가 없어요.</p>
      ) : (
        <ul className="attendance-reason__history-list">
          {historyPeriods.map((entry) => (
            <li key={entry.key}>
              <div>
                <strong>{entry.label}</strong>
                {leaveHistorySourceLabel(
                  entry.cancellationSource?.sourceType,
                ) && (
                  <small>
                    {leaveHistorySourceLabel(
                      entry.cancellationSource?.sourceType,
                    )}
                  </small>
                )}
              </div>
              <span>{entry.slot}교시</span>
              <button
                type="button"
                disabled={
                  pending ||
                  leaves.deletion.disabled ||
                  !entry.cancellationSource
                }
                aria-label={`${formatKoreanDate(inspectedDate)} ${entry.slot}교시 ${entry.label}${leaveHistorySourceLabel(entry.cancellationSource?.sourceType) ? ` ${leaveHistorySourceLabel(entry.cancellationSource?.sourceType)}` : ''} 삭제`}
                title={
                  !entry.cancellationSource
                    ? '휴무 내역을 새로고침해 주세요.'
                    : undefined
                }
                onClick={() =>
                  onRequestOccurrence({
                    dateKey: inspectedDate,
                    entryKey: entry.entryKey,
                    slot: entry.slot,
                    label: entry.label,
                  })
                }
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <details className="attendance-reason__advanced">
        <summary>반복 일정 관리</summary>
        <div className="attendance-reason__advanced-actions">
          <Button
            disabled={pending}
            onClick={onRequestStopRule}
            type="button"
            variant="ghost"
          >
            반복 일정 중단
          </Button>
        </div>
      </details>
    </section>
  );
}
