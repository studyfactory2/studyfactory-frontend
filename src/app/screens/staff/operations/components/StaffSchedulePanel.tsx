import { CalendarClock, RefreshCw } from 'lucide-react';
import type { WeekdayName } from '../../../../shared/lib/seoul-date';
import { cx } from '../../../../shared/lib/cx';
import {
  Card,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { useStaffSchedule } from '../hooks/useStaffSchedule';
import {
  STAFF_SCHEDULE_DUTIES,
  formatScheduleShift,
  formatScheduleTask,
  isOwnScheduleWorker,
  type StaffScheduleDay,
} from '../model/staff-schedule';

export function StaffSchedulePanel({
  schedule,
  todayWeekday,
}: {
  schedule: ReturnType<typeof useStaffSchedule>;
  todayWeekday: WeekdayName;
}) {
  return (
    <Card
      className="staff-operations__panel staff-operations__schedule"
      padding="none"
    >
      <header className="staff-operations__panel-header">
        <span className="staff-operations__panel-title">
          <i aria-hidden="true">
            <CalendarClock size={18} />
          </i>
          <span>
            <strong>주간 근무표</strong>
            <small>
              {schedule.ready
                ? `배정 ${schedule.assignedCount}건 · 내 근무 ${schedule.ownCount}건`
                : '이번 주 근무 배치를 확인해요.'}
            </small>
          </span>
        </span>
        <button
          aria-label="근무표 새로고침"
          className={cx(
            'staff-operations__refresh',
            schedule.refreshing && 'is-refreshing',
          )}
          disabled={schedule.refreshing}
          onClick={schedule.onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} />
        </button>
      </header>

      <div className="staff-operations__panel-body">
        {schedule.errorMessage && (
          <SectionError
            message={schedule.errorMessage}
            onRetry={schedule.onRetry}
          />
        )}

        {schedule.loading ? (
          <SectionLoading label="근무표를 불러오는 중이에요." />
        ) : !schedule.ready ? null : schedule.assignedCount === 0 ? (
          <SectionEmpty title="등록된 근무가 없어요">
            <p>관리자가 근무를 배정하면 이곳에 표시돼요.</p>
          </SectionEmpty>
        ) : (
          <>
            <div className="staff-operations__schedule-note">
              <span>
                <i aria-hidden="true" /> 내 이름과 일치하는 근무
              </span>
              <small>근무 배정은 관리자가 수정할 수 있어요.</small>
            </div>

            <ScheduleTable
              days={schedule.days}
              memberName={schedule.memberName}
              todayWeekday={todayWeekday}
            />
            <ScheduleMobileList
              days={schedule.days}
              memberName={schedule.memberName}
              todayWeekday={todayWeekday}
            />
          </>
        )}
      </div>
    </Card>
  );
}

function ScheduleTable({
  days,
  memberName,
  todayWeekday,
}: {
  days: readonly StaffScheduleDay[];
  memberName: string | null;
  todayWeekday: WeekdayName;
}) {
  return (
    <div className="staff-operations__schedule-table-wrap">
      <table className="staff-operations__schedule-table">
        <thead>
          <tr>
            <th scope="col">요일</th>
            {STAFF_SCHEDULE_DUTIES.map((duty) => (
              <th key={`${duty.shift}-${duty.taskType}`} scope="col">
                <span>{formatScheduleShift(duty.shift)}</span>
                <strong>{formatScheduleTask(duty.taskType)}</strong>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr
              className={
                day.dayOfWeek === todayWeekday ? 'is-today' : undefined
              }
              key={day.dayOfWeek}
            >
              <th scope="row">
                {day.label}
                {day.dayOfWeek === todayWeekday && <small>오늘</small>}
              </th>
              {day.duties.map((duty) => {
                const isMine = isOwnScheduleWorker(duty.workerName, memberName);

                return (
                  <td
                    className={cx(isMine && 'is-mine')}
                    key={`${duty.shift}-${duty.taskType}`}
                  >
                    {duty.workerName || <span aria-label="미배정">—</span>}
                    {isMine && <small>내 근무</small>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleMobileList({
  days,
  memberName,
  todayWeekday,
}: {
  days: readonly StaffScheduleDay[];
  memberName: string | null;
  todayWeekday: WeekdayName;
}) {
  return (
    <ol className="staff-operations__schedule-mobile">
      {days.map((day) => (
        <li
          className={day.dayOfWeek === todayWeekday ? 'is-today' : undefined}
          key={day.dayOfWeek}
        >
          <header>
            <strong>{day.label}요일</strong>
            {day.dayOfWeek === todayWeekday && <span>오늘</span>}
          </header>
          <div>
            {(['MORNING', 'AFTERNOON'] as const).map((shift) => (
              <section key={shift}>
                <h4>{formatScheduleShift(shift)}</h4>
                {day.duties
                  .filter((duty) => duty.shift === shift)
                  .map((duty) => {
                    const isMine = isOwnScheduleWorker(
                      duty.workerName,
                      memberName,
                    );

                    return (
                      <p
                        className={cx(isMine && 'is-mine')}
                        key={duty.taskType}
                      >
                        <span>{formatScheduleTask(duty.taskType)}</span>
                        <strong>{duty.workerName || '—'}</strong>
                      </p>
                    );
                  })}
              </section>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
