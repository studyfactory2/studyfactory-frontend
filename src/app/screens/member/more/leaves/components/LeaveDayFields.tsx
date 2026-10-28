import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { Badge, Button } from '../../../../../shared/ui';
import { canRequestLeave } from '../model/leave.month';
import { LEAVE_TYPE_OPTIONS, type LeaveDayCell } from '../model/leave.types';
import '../styles/LeaveDayModal.css';

type LeaveDayFieldsProps = {
  cell: LeaveDayCell;
  onDelete: (leaveId: number) => void;
  onSelectType: (leaveType: LeaveType) => void;
  pendingDeleteId: number | null;
  saving: boolean;
  selectedLeaveType: LeaveType | null;
};

export function LeaveDayFields({
  cell,
  onDelete,
  onSelectType,
  pendingDeleteId,
  saving,
  selectedLeaveType,
}: LeaveDayFieldsProps) {
  return (
    <div className="member-leaves__day-modal">
      {cell.entries.length > 0 && (
        <ul className="member-leaves__day-modal-entries">
          {cell.entries.map((entry, index) => (
            <li
              key={
                entry.origin === 'own' && entry.leaveId !== null
                  ? `own-${entry.leaveId}`
                  : `${entry.sourceLabel}-${entry.label}-${index}`
              }
            >
              <div className="member-leaves__day-modal-entry-content">
                <span className="member-leaves__day-modal-entry-head">
                  <strong>{entry.label}</strong>
                  {entry.origin === 'office' && (
                    <Badge tone="special">{entry.sourceLabel}</Badge>
                  )}
                </span>
                {entry.slotsLabel &&
                  !(
                    entry.origin === 'own' &&
                    (entry.leaveType === 'MORNING' ||
                      entry.leaveType === 'AFTERNOON')
                  ) && <small>{entry.slotsLabel}</small>}
              </div>
              {entry.origin === 'own' &&
                entry.leaveId !== null &&
                !cell.isPast && (
                  <Button
                    aria-label={`${entry.label} 신청 취소`}
                    className="member-leaves__day-modal-entry-cancel"
                    disabled={saving}
                    loading={saving && pendingDeleteId === entry.leaveId}
                    onClick={() => {
                      if (!saving && entry.leaveId !== null) {
                        onDelete(entry.leaveId);
                      }
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    취소
                  </Button>
                )}
            </li>
          ))}
        </ul>
      )}

      {canRequestLeave(cell) && (
        <div>
          <p className="member-leaves__day-modal-lead">휴무 선택</p>
          <div
            aria-label="휴무 종류"
            className="member-leaves__day-modal-options"
            role="radiogroup"
          >
            {LEAVE_TYPE_OPTIONS.map((option) => (
              <button
                aria-checked={selectedLeaveType === option.value}
                className={[
                  'member-leaves__day-modal-option',
                  selectedLeaveType === option.value ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={saving || !canRequestLeave(cell, option.value)}
                key={option.value}
                onClick={() => onSelectType(option.value)}
                role="radio"
                type="button"
              >
                {option.requestLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
