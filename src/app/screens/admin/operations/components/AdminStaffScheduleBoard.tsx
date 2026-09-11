import {
  STAFF_SCHEDULE_DAYS,
  STAFF_SCHEDULE_DUTIES,
  formatScheduleShift,
  formatScheduleTask,
  toStaffScheduleKey,
} from '../../../../features/staff-schedules/staff-schedule-grid';
import type { AdminStaffScheduleDraft } from '../model/admin-staff-schedule';

export function AdminStaffScheduleBoard({
  draft,
}: {
  draft: AdminStaffScheduleDraft;
}) {
  return (
    <>
      <div className="admin-schedule__table-wrap">
        <table className="admin-schedule__table">
          <ScheduleTableHead />
          <tbody>
            {STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, label }) => (
              <tr key={dayOfWeek}>
                <th scope="row">{label}</th>
                {STAFF_SCHEDULE_DUTIES.map(({ shift, taskType }) => {
                  const workerName =
                    draft[toStaffScheduleKey(dayOfWeek, shift, taskType)];

                  return (
                    <td key={`${shift}-${taskType}`}>
                      {workerName || <span aria-label="미배정">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="admin-schedule__mobile-list">
        {STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, label }) => (
          <li key={dayOfWeek}>
            <strong>{label}요일</strong>
            <div>
              {(['MORNING', 'AFTERNOON'] as const).map((shift) => (
                <section key={shift}>
                  <h4>{formatScheduleShift(shift)}</h4>
                  {STAFF_SCHEDULE_DUTIES.filter(
                    (duty) => duty.shift === shift,
                  ).map(({ taskType }) => (
                    <p key={taskType}>
                      <span>{formatScheduleTask(taskType)}</span>
                      <b>
                        {draft[
                          toStaffScheduleKey(dayOfWeek, shift, taskType)
                        ] || '—'}
                      </b>
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function ScheduleTableHead() {
  return (
    <thead>
      <tr>
        <th scope="col">요일</th>
        {STAFF_SCHEDULE_DUTIES.map(({ shift, taskType }) => (
          <th key={`${shift}-${taskType}`} scope="col">
            <span>{formatScheduleShift(shift)}</span>
            <strong>{formatScheduleTask(taskType)}</strong>
          </th>
        ))}
      </tr>
    </thead>
  );
}
