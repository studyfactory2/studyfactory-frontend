import { useState } from 'react';
import { Info } from 'lucide-react';
import type { LeaveType } from '../../../../../features/leaves/leaves-api';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Badge, Button, Modal } from '../../../../../shared/ui';
import { canRequestLeave, findOwnEntry } from '../model/leave.month';
import { LEAVE_TYPE_OPTIONS, type LeaveDayCell } from '../model/leave.types';
import '../styles/LeaveDayModal.css';

export type LeaveDayModalProps = {
  cell: LeaveDayCell | null;
  ownLeaveNote?: string;
  onClose: () => void;
  onCreate: (dateKey: string, leaveType: LeaveType) => void;
  onDelete: (leaveId: number) => void;
  saving: boolean;
};

export function LeaveDayModal({
  cell,
  ownLeaveNote = '내가 신청한 휴무예요. 취소하면 이 날의 학습 시간이 다시 계산돼요.',
  onClose,
  onCreate,
  onDelete,
  saving,
}: LeaveDayModalProps) {
  return (
    <Modal
      closeDisabled={saving}
      onClose={onClose}
      open={cell !== null}
      size="sm"
      title={cell ? formatKoreanDate(cell.dateKey) : ''}
    >
      {cell && (
        <LeaveDayBody
          cell={cell}
          key={cell.dateKey}
          ownLeaveNote={ownLeaveNote}
          onClose={onClose}
          onCreate={onCreate}
          onDelete={onDelete}
          saving={saving}
        />
      )}
    </Modal>
  );
}

function LeaveDayBody({
  cell,
  ownLeaveNote,
  onClose,
  onCreate,
  onDelete,
  saving,
}: {
  cell: LeaveDayCell;
  ownLeaveNote: string;
  onClose: () => void;
  onCreate: (dateKey: string, leaveType: LeaveType) => void;
  onDelete: (leaveId: number) => void;
  saving: boolean;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  const ownEntry = findOwnEntry(cell);
  const cancellableLeaveId =
    ownEntry !== null && !cell.isPast ? ownEntry.leaveId : null;
  const canCreate = canRequestLeave(cell);
  // A plan refetch can invalidate a choice while the day sheet is still open.
  const selectedLeaveType =
    leaveType !== null && canRequestLeave(cell, leaveType) ? leaveType : null;

  return (
    <div className="member-leaves__day-modal">
      {cell.entries.length > 0 && (
        <>
          <ul className="member-leaves__day-modal-entries">
            {cell.entries.map((entry, index) => (
              <li key={`${entry.sourceLabel}-${entry.label}-${index}`}>
                <span className="member-leaves__day-modal-entry-head">
                  <strong>{entry.label}</strong>
                  <Badge tone={entry.origin === 'own' ? 'positive' : 'special'}>
                    {entry.sourceLabel}
                  </Badge>
                </span>
                {entry.slotsLabel && <small>{entry.slotsLabel}</small>}
              </li>
            ))}
          </ul>

          <p className="member-leaves__day-modal-note">
            <Info aria-hidden="true" size={14} />
            <span>{toNoteText(cell, ownEntry !== null, ownLeaveNote)}</span>
          </p>
        </>
      )}

      {canCreate && (
        <>
          <p className="member-leaves__day-modal-lead">
            어떤 휴무로 신청할까요?
          </p>

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
                key={option.value}
                disabled={saving || !canRequestLeave(cell, option.value)}
                onClick={() => setLeaveType(option.value)}
                role="radio"
                type="button"
              >
                <strong>{option.label}</strong>
                <small>{option.description}</small>
                {!canRequestLeave(cell, option.value) && (
                  <small>
                    {cell.entries.some((entry) => entry.slots === null)
                      ? '기록 확인 필요'
                      : '교시 중복'}
                  </small>
                )}
              </button>
            ))}
          </div>

          <p className="member-leaves__day-modal-note">
            <Info aria-hidden="true" size={14} />
            <span>
              직접 신청하는 휴무는 하루에 한 건만 가능해요. 신청한 휴무는 이
              화면에서 직접 취소할 수 있습니다.
            </span>
          </p>
        </>
      )}

      {cell.entries.length === 0 && !canCreate && (
        <p className="member-leaves__day-modal-note">
          지난 날짜의 휴무는 신청할 수 없어요.
        </p>
      )}

      <div className="member-leaves__day-modal-actions">
        <Button disabled={saving} onClick={onClose} variant="ghost">
          닫기
        </Button>
        {canCreate && (
          <Button
            disabled={selectedLeaveType === null}
            loading={saving}
            onClick={() => {
              if (!saving && selectedLeaveType !== null) {
                onCreate(cell.dateKey, selectedLeaveType);
              }
            }}
          >
            신청하기
          </Button>
        )}
        {cancellableLeaveId !== null && (
          <Button
            loading={saving}
            onClick={() => onDelete(cancellableLeaveId)}
            variant="danger"
          >
            휴무 취소
          </Button>
        )}
      </div>
    </div>
  );
}

function toNoteText(
  cell: LeaveDayCell,
  hasOwnEntry: boolean,
  ownLeaveNote: string,
) {
  if (cell.isPast) {
    return '지난 날짜의 휴무는 변경할 수 없어요.';
  }

  if (hasOwnEntry) {
    return ownLeaveNote;
  }

  if (canRequestLeave(cell)) {
    return '기존 출석과 지점 등록·반복 휴무는 그대로 유지돼요. 오전·오후반차를 추가로 신청할 수 있어요.';
  }

  return '선택한 날짜에는 휴무를 신청할 수 없어요.';
}
