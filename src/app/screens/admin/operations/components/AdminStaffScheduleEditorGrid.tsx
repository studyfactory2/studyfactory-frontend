import {
  STAFF_SCHEDULE_DAYS,
  STAFF_SCHEDULE_DUTIES,
  formatScheduleShift,
  formatScheduleTask,
  toStaffScheduleKey,
} from '../../../../features/staff-schedules/staff-schedule-grid';
import { Input } from '../../../../shared/ui';
import type { AdminStaffScheduleState } from '../hooks/useAdminStaffSchedule';

type AdminStaffScheduleEditorGridProps = {
  disabled: boolean;
  draft: AdminStaffScheduleState['editor']['draft'];
  onChange: (key: string, value: string) => void;
  suggestionsId: string;
};

export function AdminStaffScheduleEditorGrid(
  props: AdminStaffScheduleEditorGridProps,
) {
  return (
    <>
      <ScheduleEditorTable {...props} />
      <ScheduleEditorMobileList {...props} />
    </>
  );
}

function ScheduleEditorTable({
  disabled,
  draft,
  onChange,
  suggestionsId,
}: AdminStaffScheduleEditorGridProps) {
  return (
    <div className="admin-schedule-editor__table-wrap">
      <table className="admin-schedule-editor__table">
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
        <tbody>
          {STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, label }) => (
            <tr key={dayOfWeek}>
              <th scope="row">{label}</th>
              {STAFF_SCHEDULE_DUTIES.map(({ shift, taskType }) => {
                const key = toStaffScheduleKey(dayOfWeek, shift, taskType);

                return (
                  <td key={`${shift}-${taskType}`}>
                    <ScheduleWorkerInput
                      dayLabel={label}
                      disabled={disabled}
                      onChange={(value) => onChange(key, value)}
                      shift={shift}
                      suggestionsId={suggestionsId}
                      taskType={taskType}
                      value={draft[key]}
                    />
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

function ScheduleEditorMobileList({
  disabled,
  draft,
  onChange,
  suggestionsId,
}: AdminStaffScheduleEditorGridProps) {
  return (
    <ol className="admin-schedule-editor__mobile-list">
      {STAFF_SCHEDULE_DAYS.map(({ dayOfWeek, label }) => (
        <li key={dayOfWeek}>
          <strong>{label}요일</strong>
          <div>
            {(['MORNING', 'AFTERNOON'] as const).map((shift) => (
              <section key={shift}>
                <h4>{formatScheduleShift(shift)}</h4>
                {STAFF_SCHEDULE_DUTIES.filter(
                  (duty) => duty.shift === shift,
                ).map(({ taskType }) => {
                  const key = toStaffScheduleKey(dayOfWeek, shift, taskType);

                  return (
                    <label key={taskType}>
                      <span>{formatScheduleTask(taskType)}</span>
                      <ScheduleWorkerInput
                        dayLabel={label}
                        disabled={disabled}
                        onChange={(value) => onChange(key, value)}
                        shift={shift}
                        suggestionsId={suggestionsId}
                        taskType={taskType}
                        value={draft[key]}
                      />
                    </label>
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

function ScheduleWorkerInput({
  dayLabel,
  disabled,
  onChange,
  shift,
  suggestionsId,
  taskType,
  value,
}: {
  dayLabel: string;
  disabled: boolean;
  onChange: (value: string) => void;
  shift: (typeof STAFF_SCHEDULE_DUTIES)[number]['shift'];
  suggestionsId: string;
  taskType: (typeof STAFF_SCHEDULE_DUTIES)[number]['taskType'];
  value: string;
}) {
  return (
    <Input
      aria-label={`${dayLabel}요일 ${formatScheduleShift(shift)} ${formatScheduleTask(taskType)} 담당자`}
      disabled={disabled}
      list={suggestionsId}
      maxLength={50}
      onChange={(event) => onChange(event.target.value)}
      placeholder="미배정"
      value={value}
    />
  );
}
