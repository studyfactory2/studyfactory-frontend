import { useId, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button, Field, Input, Modal } from '../../../../shared/ui';
import {
  formatKoreanDate,
  formatKoreanMonth,
  getDayOfMonth,
  getNextMonth,
  getPreviousMonth,
  listMonthGridCells,
  SEOUL_WEEKDAY_LABELS,
} from '../../../../shared/lib/seoul-date';
import {
  ATTENDANCE_SLOTS,
  type AttendanceReasonCommand,
  type AttendanceSelection,
} from '../model/attendance-board';
import '../styles/attendance-reason.css';

const QUICK_REASONS = [
  '지각',
  '조회',
  '외출',
  '이동',
  '시험',
  '컨디션',
] as const;
const LEAVE_PRESETS = [
  { label: '월차', slots: [1, 2, 3, 4, 5, 6, 7] },
  { label: '오전반차', slots: [1, 2, 3, 4] },
  { label: '오후반차', slots: [4, 5, 6, 7] },
] as const;
const MAX_DATES = 31;

type AttendanceReasonModalProps = {
  dateKey: string;
  onClose: () => void;
  onSubmit: (command: AttendanceReasonCommand) => void;
  open: boolean;
  pending: boolean;
  selection: AttendanceSelection | null;
};

export function AttendanceReasonModal(props: AttendanceReasonModalProps) {
  if (!props.open || !props.selection) {
    return null;
  }

  return (
    <ReasonDialog
      {...props}
      key={`${props.dateKey}:${props.selection.memberId}:${props.selection.slot}`}
      selection={props.selection}
    />
  );
}

function ReasonDialog({
  dateKey,
  onClose,
  onSubmit,
  pending,
  selection,
}: AttendanceReasonModalProps & { selection: AttendanceSelection }) {
  const formId = useId();
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const [dates, setDates] = useState<string[]>([dateKey]);
  const [slots, setSlots] = useState<number[]>([selection.slot]);
  const [month, setMonth] = useState(() => ({
    year: Number(dateKey.slice(0, 4)),
    month: Number(dateKey.slice(5, 7)),
  }));
  const [quickReason, setQuickReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const reason = customReason.trim() || quickReason;
  const allSlotsSelected = slots.length === ATTENDANCE_SLOTS.length;
  const monthKey = `${month.year}-${String(month.month).padStart(2, '0')}`;
  const canSubmit = dates.length > 0 && slots.length > 0 && reason.length > 0;

  const toggleDate = (date: string) => {
    setDates((current) =>
      current.includes(date)
        ? current.filter((value) => value !== date)
        : current.length < MAX_DATES
          ? [...current, date].sort()
          : current,
    );
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || pending) {
      return;
    }
    onSubmit({
      memberId: selection.memberId,
      dates: [...dates],
      slots: [...slots],
      reason,
    });
  };

  return (
    <Modal
      closeDisabled={pending}
      initialFocusRef={selectedDateRef}
      onClose={onClose}
      open
      panelClassName="attendance-reason"
      size="md"
      title={`${selection.name} · 기타 신청`}
      footer={
        <>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            닫기
          </Button>
          <Button
            disabled={!canSubmit}
            form={formId}
            loading={pending}
            type="submit"
          >
            선택한 날짜에 신청
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <p className="attendance-reason__intro">
          오늘 이후의 날짜와 교시를 선택하세요. 이미 출석한 O는 그대로
          유지됩니다.
        </p>
        <fieldset disabled={pending}>
          <legend>
            날짜{' '}
            <span>
              {dates.length}일 선택 · 최대 {MAX_DATES}일
            </span>
          </legend>
          <div className="attendance-reason__calendar-head">
            <button
              aria-label="이전 달"
              disabled={monthKey <= dateKey.slice(0, 7)}
              onClick={() =>
                setMonth(getPreviousMonth(month.year, month.month))
              }
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <strong aria-live="polite">
              {formatKoreanMonth(month.year, month.month)}
            </strong>
            <button
              aria-label="다음 달"
              onClick={() => setMonth(getNextMonth(month.year, month.month))}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
          <div aria-hidden="true" className="attendance-reason__weekdays">
            {SEOUL_WEEKDAY_LABELS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="attendance-reason__calendar">
            {listMonthGridCells(month.year, month.month).map((day) =>
              day.inMonth ? (
                <button
                  aria-label={formatKoreanDate(day.dateKey)}
                  aria-pressed={dates.includes(day.dateKey)}
                  disabled={
                    day.dateKey < dateKey ||
                    (!dates.includes(day.dateKey) && dates.length >= MAX_DATES)
                  }
                  key={day.dateKey}
                  onClick={() => toggleDate(day.dateKey)}
                  ref={day.dateKey === dateKey ? selectedDateRef : undefined}
                  type="button"
                >
                  {getDayOfMonth(day.dateKey)}
                </button>
              ) : (
                <span aria-hidden="true" key={day.dateKey} />
              ),
            )}
          </div>
          {dates.length > 0 && (
            <div aria-label="선택한 날짜" className="attendance-reason__dates">
              {dates.map((date) => (
                <button
                  aria-label={`${formatKoreanDate(date)} 선택 해제`}
                  key={date}
                  onClick={() => toggleDate(date)}
                  type="button"
                >
                  {date.slice(5).replace('-', '/')}
                  <X aria-hidden="true" size={12} />
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset disabled={pending}>
          <legend>
            교시 <span>{slots.length}교시 선택</span>
          </legend>
          <div className="attendance-reason__slots">
            {ATTENDANCE_SLOTS.map((slot) => (
              <button
                aria-label={`${slot}교시`}
                aria-pressed={slots.includes(slot)}
                key={slot}
                onClick={() =>
                  setSlots((current) =>
                    current.includes(slot)
                      ? current.filter((value) => value !== slot)
                      : [...current, slot].sort((a, b) => a - b),
                  )
                }
                type="button"
              >
                {slot}
              </button>
            ))}
          </div>
          <button
            className="attendance-reason__all"
            onClick={() =>
              setSlots(allSlotsSelected ? [] : [...ATTENDANCE_SLOTS])
            }
            type="button"
          >
            {allSlotsSelected ? '전체 선택 해제' : '전체 선택'}
          </button>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>사유</legend>
          <div
            aria-label="빠른 사유 선택"
            className="attendance-reason__reasons"
            role="group"
          >
            {QUICK_REASONS.map((option) => (
              <button
                aria-pressed={
                  quickReason === option && customReason.length === 0
                }
                key={option}
                onClick={() => {
                  setQuickReason(option);
                  setCustomReason('');
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          <div
            aria-label="휴무 빠른 선택"
            className="attendance-reason__presets"
            role="group"
          >
            {LEAVE_PRESETS.map((preset) => (
              <button
                aria-pressed={
                  quickReason === preset.label && customReason.length === 0
                }
                key={preset.label}
                onClick={() => {
                  setQuickReason(preset.label);
                  setCustomReason('');
                  setSlots([...preset.slots]);
                }}
                type="button"
              >
                {preset.label}
                <small>
                  {preset.slots[0]}–{preset.slots[preset.slots.length - 1]}교시
                </small>
              </button>
            ))}
          </div>
          <Field label="직접 입력 (최대 40자)">
            {(id) => (
              <Input
                autoComplete="off"
                id={id}
                maxLength={40}
                onChange={(event) => {
                  setCustomReason(event.target.value);
                  setQuickReason('');
                }}
                placeholder="예: 병원, 상담"
                value={customReason}
              />
            )}
          </Field>
        </fieldset>
        <div aria-live="polite" className="attendance-reason__summary">
          <strong>
            {reason || '사유 미선택'} · {dates.length}일 × {slots.length}교시
          </strong>
          <p>
            선택한 교시 중 출석 O를 제외하고 적용해요. 기존 휴무 기록은 삭제하지
            않습니다.
          </p>
        </div>
      </form>
    </Modal>
  );
}
