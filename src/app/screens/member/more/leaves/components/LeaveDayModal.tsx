import { useId, useState } from 'react';
import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Badge, Button, Modal } from '../../../../../shared/ui';
import { canRequestLeave } from '../model/leave.month';
import { LEAVE_TYPE_OPTIONS, type LeaveDayCell } from '../model/leave.types';
import '../styles/LeaveDayModal.css';

export type LeaveDayModalProps = {
  cell: LeaveDayCell | null;
  onClose: () => void;
  onCreate: (dateKey: string, leaveType: LeaveType) => void;
  onDelete: (leaveId: number) => void;
  pendingDeleteId: number | null;
  saving: boolean;
};

export function LeaveDayModal({ cell, ...props }: LeaveDayModalProps) {
  return cell ? (
    <LeaveDayContent cell={cell} key={cell.dateKey} {...props} />
  ) : null;
}

function LeaveDayContent({
  cell,
  onClose,
  onCreate,
  onDelete,
  pendingDeleteId,
  saving,
}: Omit<LeaveDayModalProps, 'cell'> & { cell: LeaveDayCell }) {
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  const allowanceNoteId = useId();
  const canCreate = canRequestLeave(cell);
  // A plan refetch can invalidate a choice while the day sheet is still open.
  const selectedLeaveType =
    leaveType !== null && canRequestLeave(cell, leaveType) ? leaveType : null;

  return (
    <Modal
      closeDisabled={saving}
      footer={
        <div className="member-leaves__day-modal-footer">
          {canCreate && (
            <p
              className="member-leaves__day-modal-allowance"
              id={allowanceNoteId}
            >
              월-일 일주일동안 월차1개+반차1개 또는 반차3개 신청가능해요
            </p>
          )}
          <div className="member-leaves__day-modal-actions">
            <Button disabled={saving} onClick={onClose} variant="ghost">
              닫기
            </Button>
            {canCreate && (
              <Button
                aria-describedby={allowanceNoteId}
                disabled={saving || selectedLeaveType === null}
                loading={saving && pendingDeleteId === null}
                onClick={() => {
                  if (!saving && selectedLeaveType !== null) {
                    onCreate(cell.dateKey, selectedLeaveType);
                  }
                }}
              >
                신청하기
              </Button>
            )}
          </div>
        </div>
      }
      onClose={onClose}
      open
      panelClassName="member-leaves__day-panel"
      size="sm"
      title={formatKoreanDate(cell.dateKey)}
    >
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
                    <Badge
                      tone={entry.origin === 'own' ? 'positive' : 'special'}
                    >
                      {entry.sourceLabel}
                    </Badge>
                  </span>
                  {entry.slotsLabel && <small>{entry.slotsLabel}</small>}
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

        {canCreate && (
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
                  onClick={() => setLeaveType(option.value)}
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
    </Modal>
  );
}
