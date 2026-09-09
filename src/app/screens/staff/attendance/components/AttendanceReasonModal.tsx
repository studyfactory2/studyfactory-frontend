import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { Button, Field, Input, Modal } from '../../../../shared/ui';
import type { AttendanceSelection } from '../model/staff-attendance';

const QUICK_REASONS = ['지각', '외출', '시험', '컨디션'] as const;

type AttendanceReasonModalProps = {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  open: boolean;
  pending: boolean;
  selection: AttendanceSelection | null;
};

export function AttendanceReasonModal({
  onClose,
  onSubmit,
  open,
  pending,
  selection,
}: AttendanceReasonModalProps) {
  const firstReasonRef = useRef<HTMLButtonElement>(null);
  const replacesMemberLeave = selection?.cell.source === 'MEMBER_LEAVE';

  return (
    <Modal
      initialFocusRef={firstReasonRef}
      onClose={pending ? () => undefined : onClose}
      open={open && selection !== null}
      size="sm"
      title={
        selection
          ? `${selection.name} · ${selection.slot}교시 기타 사유`
          : '기타 사유'
      }
    >
      {selection && (
        <ReasonForm
          firstReasonRef={firstReasonRef}
          key={`${selection.memberId}:${selection.slot}`}
          onClose={onClose}
          onSubmit={onSubmit}
          pending={pending}
          replacesMemberLeave={replacesMemberLeave}
          selection={selection}
        />
      )}
    </Modal>
  );
}

function ReasonForm({
  firstReasonRef,
  onClose,
  onSubmit,
  pending,
  replacesMemberLeave,
  selection,
}: {
  firstReasonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
  replacesMemberLeave: boolean;
  selection: AttendanceSelection;
}) {
  const [quickReason, setQuickReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const reason = useMemo(
    () => customReason.trim() || quickReason,
    [customReason, quickReason],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reason || pending) {
      return;
    }

    onSubmit(reason);
  };

  return (
    <form className="staff-attendance__reason-form" onSubmit={submit}>
      <p>이 교시에 표시할 사유를 선택하거나 직접 입력하세요.</p>
      {replacesMemberLeave && (
        <div className="staff-attendance__leave-warning" role="alert">
          <strong>회원 휴무 신청 전체가 취소됩니다.</strong>
          <span>
            현재 {selection.cell.label} 신청은 여러 교시에 연결될 수 있어요.
            저장하면 {selection.slot}교시만 새 사유로 바뀌고, 연결된 다른 교시는
            미출석으로 돌아갈 수 있습니다.
          </span>
        </div>
      )}
      <div
        aria-label="빠른 사유 선택"
        className="staff-attendance__reason-picks"
        role="group"
      >
        {QUICK_REASONS.map((option, index) => (
          <button
            aria-pressed={quickReason === option && customReason.length === 0}
            className={
              quickReason === option && customReason.length === 0
                ? 'is-selected'
                : undefined
            }
            disabled={pending}
            key={option}
            onClick={() => {
              setQuickReason(option);
              setCustomReason('');
            }}
            ref={index === 0 ? firstReasonRef : undefined}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <Field label="직접 입력">
        {(id) => (
          <Input
            autoComplete="off"
            disabled={pending}
            id={id}
            maxLength={40}
            onChange={(event) => setCustomReason(event.target.value)}
            placeholder="예: 병원, 상담"
            value={customReason}
          />
        )}
      </Field>
      <div className="staff-attendance__reason-actions">
        <Button disabled={pending} onClick={onClose} variant="ghost">
          취소
        </Button>
        <Button
          disabled={!reason}
          loading={pending}
          type="submit"
          variant={replacesMemberLeave ? 'danger' : 'primary'}
        >
          {replacesMemberLeave ? '휴무 취소 후 저장' : '사유 저장'}
        </Button>
      </div>
    </form>
  );
}
