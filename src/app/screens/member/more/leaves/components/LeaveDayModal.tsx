import { useId, useState } from 'react';
import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Button, Modal } from '../../../../../shared/ui';
import { canRequestLeave } from '../model/leave.month';
import type { LeaveDayCell } from '../model/leave.types';
import { LeaveDayFields } from './LeaveDayFields';
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
      <LeaveDayFields
        cell={cell}
        onDelete={onDelete}
        onSelectType={setLeaveType}
        pendingDeleteId={pendingDeleteId}
        saving={saving}
        selectedLeaveType={selectedLeaveType}
      />
    </Modal>
  );
}
