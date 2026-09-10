import { Button, Modal } from '../../../../shared/ui';
import type { AttendanceSelection } from '../model/attendance-board';

type AttendanceLeaveOverrideModalProps = {
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  selection: AttendanceSelection | null;
};

export function AttendanceLeaveOverrideModal({
  onClose,
  onConfirm,
  pending,
  selection,
}: AttendanceLeaveOverrideModalProps) {
  return (
    <Modal
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            유지하기
          </Button>
          <Button loading={pending} onClick={onConfirm} variant="danger">
            휴무 취소 후 미출석
          </Button>
        </>
      }
      onClose={pending ? () => undefined : onClose}
      open={selection !== null}
      size="sm"
      title="회원 휴무 신청 변경 확인"
    >
      {selection && (
        <div className="staff-attendance__leave-override-copy">
          <strong>
            {selection.seatNumber === null
              ? '미배정'
              : `${selection.seatNumber}번`}{' '}
            {selection.name} · {selection.slot}교시
          </strong>
          <p>
            현재 <b>{selection.cell.label}</b> 회원 신청은 여러 교시에 연결될 수
            있어요. 계속하면 신청 전체가 취소되고 선택한 교시는 미출석(X)으로
            바뀝니다. 연결된 다른 교시도 미출석으로 돌아갈 수 있습니다.
          </p>
        </div>
      )}
    </Modal>
  );
}
