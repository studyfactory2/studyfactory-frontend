import { Button, Modal } from '../../../../shared/ui';
import type { AttendanceBoardMember } from '../model/attendance-board';

type AttendanceStartModalProps = {
  member: AttendanceBoardMember | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
};

export function AttendanceStartModal({
  member,
  onClose,
  onConfirm,
  pending,
}: AttendanceStartModalProps) {
  return (
    <Modal
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            취소
          </Button>
          <Button loading={pending} onClick={onConfirm}>
            오늘 출석부 시작
          </Button>
        </>
      }
      onClose={pending ? () => undefined : onClose}
      open={member !== null}
      size="sm"
      title="신규 회원 출석 시작"
    >
      {member && (
        <div className="staff-attendance__start-copy">
          <strong>
            {member.seatNumber === null ? '미배정' : `${member.seatNumber}번`}{' '}
            {member.name}
          </strong>
          <p>
            오늘의 기존 출석과 일일 휴무 기록을 비우고 이 회원의 출석부를
            시작합니다. 고정 휴무는 유지되며, 이 작업은 오늘 입소 회원에게만
            사용할 수 있어요.
          </p>
        </div>
      )}
    </Modal>
  );
}
