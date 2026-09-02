import { Badge } from '../../../../shared/ui';
import { formatShortDate } from '../model/study.dates';
import { formatDurationClock } from '../model/study.format';
import { getStudyDayStatusView } from '../model/study.status';
import type { StudyDayRow } from '../model/study.types';
import '../styles/StudyRecords.css';

export type StudyRecordTableProps = {
  onSelectDate: (dateKey: string) => void;
  rows: readonly StudyDayRow[];
  selectedDateKey: string;
};

export function StudyRecordTable({
  onSelectDate,
  rows,
  selectedDateKey,
}: StudyRecordTableProps) {
  return (
    <div className="member-study__table-scroll">
      <table className="member-study__table">
        <caption className="member-study__sr-only">
          날짜별 입실·퇴실 시각과 인정 학습 시간
        </caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">입실</th>
            <th scope="col">퇴실</th>
            <th scope="col">정규 공부</th>
            <th scope="col">휴식 공부</th>
            <th scope="col">총 인정 시간</th>
            <th scope="col">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const view = getStudyDayStatusView(row.status);
            const recorded = row.status === 'active' || row.status === 'done';
            const selected = row.dateKey === selectedDateKey;

            return (
              <tr
                className={[
                  selected ? 'is-selected' : '',
                  row.isToday ? 'is-today' : '',
                  row.status === 'future' ? 'is-future' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={row.dateKey}
                onClick={() => onSelectDate(row.dateKey)}
              >
                <th scope="row">
                  <button
                    aria-pressed={selected}
                    className="member-study__table-date"
                    onClick={() => onSelectDate(row.dateKey)}
                    type="button"
                  >
                    <strong>{row.weekdayLabel}</strong>
                    <span>{formatShortDate(row.dateKey)}</span>
                    {row.isToday && <small>오늘</small>}
                  </button>
                </th>
                <td>
                  {row.presenceStartLabel ?? '—'}
                  {row.sessionCount > 1 && (
                    <em className="member-study__table-sessions">
                      {row.sessionCount}회
                    </em>
                  )}
                </td>
                <td>
                  {row.status === 'active'
                    ? '진행 중'
                    : (row.presenceEndLabel ?? '—')}
                </td>
                <td>
                  {recorded ? formatDurationClock(row.periodSeconds) : '—'}
                </td>
                <td>
                  {recorded ? formatDurationClock(row.breakSeconds) : '—'}
                </td>
                <td className="member-study__table-total">
                  {recorded ? formatDurationClock(row.totalSeconds) : '—'}
                </td>
                <td>
                  {row.status === 'future' ? (
                    <span className="member-study__table-dash">—</span>
                  ) : (
                    <Badge tone={view.tone}>{view.label}</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
