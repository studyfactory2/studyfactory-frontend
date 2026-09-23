import type { SideDishResponse } from '../../../../../features/side-dishes/side-dishes-api';
import { formatKoreanDate } from '../../../../../shared/lib/seoul-date';
import { Button, Modal } from '../../../../../shared/ui';
import { formatWon, getSideDishMenuName } from '../model/sidedish.format';
import '../styles/SideDishOrderNotices.css';

export function SideDishCancelModal({
  order,
  onClose,
  onConfirm,
  saving,
  cancellationOpen,
  errorMessage,
}: {
  order: SideDishResponse | null;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  cancellationOpen: boolean;
  errorMessage: string | null;
}) {
  return (
    <Modal
      closeDisabled={saving}
      onClose={onClose}
      open={order !== null}
      size="sm"
      title="반찬 신청 취소"
      footer={
        order !== null && (
          <>
            <Button disabled={saving} onClick={onClose} variant="ghost">
              유지하기
            </Button>
            <Button
              disabled={!cancellationOpen}
              loading={saving}
              onClick={onConfirm}
              variant="danger"
            >
              신청 취소
            </Button>
          </>
        )
      }
    >
      {order !== null && (
        <div className="member-sidedishes__cancel-copy">
          <strong>
            {formatKoreanDate(order.mealDate)} ·{' '}
            {order.mealType === 'LUNCH' ? '점심' : '저녁'}
          </strong>
          <p>{getSideDishMenuName(order)}</p>
          <b>{formatWon(order.totalPrice)}</b>
          <p>이 신청에 포함된 반찬을 모두 취소할까요?</p>
          <small>
            신청 취소만 처리되며, 송금액 환불은 운영자에게 문의해 주세요.
          </small>
          {!cancellationOpen && (
            <p role="alert">
              취소 가능한 시간이 지났거나 신청 내역이 변경되었어요. 내역을 다시
              확인해 주세요.
            </p>
          )}
          {errorMessage && <p role="alert">{errorMessage}</p>}
        </div>
      )}
    </Modal>
  );
}
