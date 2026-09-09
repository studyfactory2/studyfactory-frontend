import { useRef, useState, type FormEvent, type RefObject } from 'react';
import type { StudyPresenceManualCheckInInput } from '../../../../features/study-presence/study-presence-api';
import {
  getSeoulSecondsOfDay,
  getSeoulToday,
  formatTimeOfDayFromEpochMs,
} from '../../../../shared/lib/seoul-date';
import { Button, Field, Modal, Textarea } from '../../../../shared/ui';
import type { StaffAttendanceMember } from '../model/staff-attendance';

type AttendancePresenceModalProps = {
  dateKey: string;
  member: StaffAttendanceMember | null;
  onCheckIn: (input: StudyPresenceManualCheckInInput) => void;
  onCheckOut: () => void;
  onClose: () => void;
  pending: boolean;
};

export function AttendancePresenceModal({
  dateKey,
  member,
  onCheckIn,
  onCheckOut,
  onClose,
  pending,
}: AttendancePresenceModalProps) {
  const timeInputRef = useRef<HTMLInputElement>(null);
  const activeSessionId = member?.presence?.activeSessionId ?? null;
  const checkingOut = activeSessionId !== null;

  return (
    <Modal
      footer={
        checkingOut ? (
          <>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              취소
            </Button>
            <Button loading={pending} onClick={onCheckOut}>
              지금 퇴실 처리
            </Button>
          </>
        ) : undefined
      }
      initialFocusRef={checkingOut ? undefined : timeInputRef}
      onClose={pending ? () => undefined : onClose}
      open={member !== null}
      size="sm"
      title={checkingOut ? '수동 퇴실' : '수동 입실'}
    >
      {member &&
        (checkingOut ? (
          <ManualCheckOutCopy member={member} />
        ) : (
          <ManualCheckInForm
            dateKey={dateKey}
            inputRef={timeInputRef}
            key={member.memberId}
            member={member}
            onClose={onClose}
            onSubmit={onCheckIn}
            pending={pending}
          />
        ))}
    </Modal>
  );
}

function ManualCheckInForm({
  dateKey,
  inputRef,
  member,
  onClose,
  onSubmit,
  pending,
}: {
  dateKey: string;
  inputRef: RefObject<HTMLInputElement | null>;
  member: StaffAttendanceMember;
  onClose: () => void;
  onSubmit: (input: StudyPresenceManualCheckInInput) => void;
  pending: boolean;
}) {
  const [checkedInAt, setCheckedInAt] = useState(() =>
    currentSeoulDateTimeValue(),
  );
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const checkedInAtMs = parseSeoulDateTimeValue(checkedInAt);
  const timeError = validateCheckInTime(checkedInAt, checkedInAtMs, dateKey);
  const trimmedReason = reason.trim();
  const reasonError =
    trimmedReason.length === 0
      ? '수동 입실 사유를 입력해 주세요.'
      : trimmedReason.length > 200
        ? '사유는 200자를 넘을 수 없어요.'
        : null;
  const canSubmit = timeError === null && reasonError === null;
  const maximum = currentSeoulDateTimeValue();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit || pending || checkedInAtMs === null) {
      return;
    }

    onSubmit({
      checkedInAt: new Date(checkedInAtMs).toISOString(),
      reason: trimmedReason,
    });
  };

  return (
    <form className="staff-attendance__presence-form" onSubmit={submit}>
      <div className="staff-attendance__presence-member">
        <strong>
          {member.seatNumber === null ? '미배정' : `${member.seatNumber}번`}{' '}
          {member.name}
        </strong>
        <p>QR 입실을 놓친 경우에만 당일 시각을 등록해 주세요.</p>
      </div>

      <Field
        error={submitted ? (timeError ?? undefined) : undefined}
        hint="오늘(서울 기준) 지난 시각만 등록할 수 있어요."
        label="입실 시각"
        required
      >
        {(id) => (
          <input
            className="control"
            disabled={pending}
            id={id}
            max={maximum}
            min={`${dateKey}T00:00`}
            onChange={(event) => setCheckedInAt(event.target.value)}
            ref={inputRef}
            step={60}
            type="datetime-local"
            value={checkedInAt}
          />
        )}
      </Field>

      <Field
        error={submitted ? (reasonError ?? undefined) : undefined}
        hint={`${reason.length}/200 · 예: QR 미인식, 휴대전화 미소지`}
        label="입실 사유"
        required
      >
        {(id) => (
          <Textarea
            autoComplete="off"
            disabled={pending}
            id={id}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder="수동으로 등록하는 이유를 남겨 주세요."
            rows={3}
            value={reason}
          />
        )}
      </Field>

      <div className="staff-attendance__reason-actions">
        <Button disabled={pending} onClick={onClose} variant="ghost">
          취소
        </Button>
        <Button disabled={!canSubmit} loading={pending} type="submit">
          입실 등록
        </Button>
      </div>
    </form>
  );
}

function ManualCheckOutCopy({ member }: { member: StaffAttendanceMember }) {
  const checkedInAt = member.presence?.checkedInAt;
  const checkedInAtMs = checkedInAt ? Date.parse(checkedInAt) : Number.NaN;

  return (
    <div className="staff-attendance__presence-confirm">
      <strong>
        {member.seatNumber === null ? '미배정' : `${member.seatNumber}번`}{' '}
        {member.name}
      </strong>
      <p>
        {Number.isFinite(checkedInAtMs)
          ? `${formatTimeOfDayFromEpochMs(checkedInAtMs)}에 시작한 입실을 `
          : '현재 진행 중인 입실을 '}
        서버의 현재 시각으로 퇴실 처리합니다.
      </p>
      <small>진행 중인 휴식이 있다면 함께 종료됩니다.</small>
    </div>
  );
}

function currentSeoulDateTimeValue(now = new Date()) {
  const dateKey = getSeoulToday(now).dateKey;
  const secondsOfDay = getSeoulSecondsOfDay(now);
  const hour = Math.floor(secondsOfDay / 3_600);
  const minute = Math.floor((secondsOfDay % 3_600) / 60);

  return `${dateKey}T${pad(hour)}:${pad(minute)}`;
}

function parseSeoulDateTimeValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const epochMs = Date.parse(`${value}:00+09:00`);

  return Number.isFinite(epochMs) ? epochMs : null;
}

function validateCheckInTime(
  value: string,
  epochMs: number | null,
  dateKey: string,
) {
  if (!value || epochMs === null) {
    return '입실 시각을 선택해 주세요.';
  }

  if (!value.startsWith(`${dateKey}T`)) {
    return '오늘의 입실 시각만 등록할 수 있어요.';
  }

  if (epochMs > Date.now()) {
    return '현재보다 늦은 시각은 등록할 수 없어요.';
  }

  return null;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
