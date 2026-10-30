import { useId, useState } from 'react';
import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { Button } from '../../../../../shared/ui';
import { canRequestLeave } from '../model/leave.month';
import type { LeaveDayCell } from '../model/leave.types';
import { LeaveDayFields } from './LeaveDayFields';

type LeaveDayFormProps = {
  cell: LeaveDayCell;
  onCreate: (
    dateKey: string,
    leaveType: LeaveType,
    onSuccess?: () => void,
  ) => void;
  onDelete: (leaveId: number) => void;
  pendingDeleteId: number | null;
  saving: boolean;
};

export function LeaveDayForm({
  cell,
  onCreate,
  onDelete,
  pendingDeleteId,
  saving,
}: LeaveDayFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  const allowanceNoteId = useId();
  const canCreate = canRequestLeave(cell, undefined, true);
  const selectedLeaveType =
    leaveType !== null && canRequestLeave(cell, leaveType, true)
      ? leaveType
      : null;

  return (
    <div aria-busy={saving} className="member-leaves__inline-form">
      {cell.entries.length > 0 && (
        <p className="member-leaves__saved-heading">
          등록된 휴무 <span>{cell.entries.length}건</span>
        </p>
      )}
      <LeaveDayFields
        allowOverlappingFullDay
        cell={cell}
        onDelete={onDelete}
        onSelectType={setLeaveType}
        pendingDeleteId={pendingDeleteId}
        saving={saving}
        selectedLeaveType={selectedLeaveType}
      />
      {canCreate ? (
        <>
          <p
            className="member-leaves__day-modal-allowance"
            id={allowanceNoteId}
          >
            주간 기준은 월차 1회+반차 1회 또는 반차 3회이며, 초과 신청도
            가능합니다.
          </p>
          <Button
            aria-describedby={allowanceNoteId}
            className="member-leaves__request-button"
            disabled={saving || selectedLeaveType === null}
            loading={saving && pendingDeleteId === null}
            onClick={() => {
              if (!saving && selectedLeaveType !== null) {
                onCreate(cell.dateKey, selectedLeaveType, () =>
                  setLeaveType(null),
                );
              }
            }}
          >
            신청하기
          </Button>
        </>
      ) : (
        <p className="member-leaves__request-hint">
          {cell.isPast
            ? '지난 날짜에는 휴무를 신청하거나 취소할 수 없어요.'
            : '선택한 날짜에는 휴무를 신청할 수 없어요.'}
        </p>
      )}
    </div>
  );
}
