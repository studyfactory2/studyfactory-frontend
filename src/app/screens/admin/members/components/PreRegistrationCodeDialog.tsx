import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button, Modal } from '../../../../shared/ui';
import { ROLE_LABELS } from '../model/admin-members';
import {
  formatRegistrationCodeExpiry,
  type RegistrationCodeDialogState,
} from '../model/registration-code';

type PreRegistrationCodeDialogProps = {
  branchName: string;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  state: RegistrationCodeDialogState;
};

export function PreRegistrationCodeDialog({
  branchName,
  errorMessage,
  onClose,
  onConfirm,
  pending,
  state,
}: PreRegistrationCodeDialogProps) {
  return (
    <Modal
      closeDisabled={pending}
      key={state.kind}
      footer={
        state.kind === 'confirm' ? (
          <>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              취소
            </Button>
            <Button loading={pending} onClick={onConfirm}>
              등록 코드 재발급
            </Button>
          </>
        ) : (
          <Button disabled={pending} onClick={onClose}>
            확인
          </Button>
        )
      }
      onClose={onClose}
      open={state.kind !== 'closed'}
      size="sm"
      title={
        state.kind === 'confirm' ? '등록 코드 재발급' : '등록 코드 발급 완료'
      }
    >
      {state.kind !== 'closed' && (
        <div className="pre-registration-code">
          <p className="pre-registration-code__target">
            <strong>
              {state.kind === 'confirm' ? state.registration.name : state.name}
            </strong>
            <span>
              {
                ROLE_LABELS[
                  state.kind === 'confirm'
                    ? state.registration.role
                    : state.role
                ]
              }
            </span>
            <span>{branchName}</span>
          </p>

          {state.kind === 'confirm' ? (
            <>
              <p className="pre-registration-code__copy">
                새 등록 코드를 발급할까요? 기존 코드는 즉시 사용할 수 없게 돼요.
                새 코드를 본인에게 전달해 주세요.
              </p>
              <p className="pre-registration-code__copy">
                코드는 한 번만 사용할 수 있으며 유효 기간은 발급 후 표시돼요.
                본인이 등록할 때 비밀번호를 설정하며, 코드를 발급하는 것만으로
                계정이 활성화되지는 않아요.
              </p>
            </>
          ) : (
            <IssuedCode code={state.code} expiresAt={state.expiresAt} />
          )}

          {errorMessage !== null && (
            <p className="pre-registration-code__error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function IssuedCode({
  code,
  expiresAt,
}: {
  code: string | null;
  expiresAt: string | null;
}) {
  const mounted = useRef(false);
  const copying = useRef(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const expiryLabel = formatRegistrationCodeExpiry(expiresAt);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const copyCode = async () => {
    if (code === null || copying.current) {
      return;
    }

    copying.current = true;

    try {
      await navigator.clipboard.writeText(code);

      if (mounted.current) {
        setCopyStatus(
          '등록 코드를 복사했어요. 본인에게 안전하게 전달해 주세요.',
        );
      }
    } catch {
      if (mounted.current) {
        setCopyStatus(
          '복사하지 못했어요. 표시된 코드를 직접 선택해 복사해 주세요.',
        );
      }
    } finally {
      copying.current = false;
    }
  };

  if (code === null || !/^\d{8}$/.test(code) || expiryLabel === null) {
    return (
      <p className="pre-registration-code__error" role="alert">
        사전등록은 저장됐지만 등록 코드 또는 유효 기간을 확인하지 못했어요. 이
        창을 닫고 등록 대기 목록에서 코드를 재발급해 주세요.
      </p>
    );
  }

  return (
    <>
      <p className="pre-registration-code__copy">
        지점과 이름을 확인한 뒤 이 코드를 본인에게만 전달해 주세요. 본인이
        로그인 화면의 ‘스태프·관리자 등록’에서 등록 코드를 입력하고 숫자 4자리
        비밀번호를 설정해요.
      </p>
      <div className="pre-registration-code__value">
        <span>일회용 등록 코드</span>
        <strong>{code}</strong>
        <Button onClick={() => void copyCode()} variant="subtle">
          <Copy aria-hidden="true" size={15} />
          코드 복사
        </Button>
      </div>
      <p className="pre-registration-code__expiry">
        유효 기간: {expiryLabel}까지
      </p>
      <p className="pre-registration-code__copy">
        이 창을 닫으면 코드를 다시 볼 수 없어요. 코드를 잃어버렸거나 만료된 경우
        등록 대기 목록에서 재발급해 주세요. 잘못된 코드를 5회 입력하면 재발급이
        필요해요.
      </p>
      {copyStatus !== null && (
        <p className="pre-registration-code__copy" role="status">
          {copyStatus}
        </p>
      )}
    </>
  );
}
