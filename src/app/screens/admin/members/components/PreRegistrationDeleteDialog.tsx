import type { PreRegistrationResponse } from '../../../../features/members/members-api';
import { Button, Modal } from '../../../../shared/ui';
import { hasSeat, ROLE_LABELS } from '../model/admin-members';
import { describeRegistrationSeat } from '../model/member-seat-options';

type PreRegistrationDeleteDialogProps = {
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  registration: PreRegistrationResponse | null;
};

/**
 * Names exactly what goes: this person's pending registration, including the
 * seat it held and the drink preference stored with it. Nothing about a
 * signed-up member can reach this dialog — it opens only for pending rows and
 * the delete is refused server-side for anyone who has signed up.
 */
export function PreRegistrationDeleteDialog({
  errorMessage,
  onClose,
  onConfirm,
  pending,
  registration,
}: PreRegistrationDeleteDialogProps) {
  return (
    <Modal
      closeDisabled={pending}
      footer={
        registration !== null ? (
          <>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              취소
            </Button>
            <Button loading={pending} onClick={onConfirm} variant="danger">
              삭제
            </Button>
          </>
        ) : undefined
      }
      onClose={onClose}
      open={registration !== null}
      size="sm"
      title="사전등록 삭제"
    >
      {registration !== null && (
        <div className="pre-registration-delete">
          <p className="pre-registration-delete__target">
            <strong>{registration.name}</strong>
            <span>{ROLE_LABELS[registration.role]}</span>
            <span>{describeRegistrationSeat(registration.seatNumber)}</span>
          </p>
          <p className="pre-registration-delete__copy">
            이 사전등록을 삭제할까요? 등록 대기 목록에서 지워지고
            {hasSeat(registration.seatNumber) && ' 좌석이 비워지며,'} 저장된
            음료 설정도 함께 삭제돼요. 되돌릴 수 없어요.
          </p>
          {errorMessage !== null && (
            <p className="pre-registration-delete__error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
