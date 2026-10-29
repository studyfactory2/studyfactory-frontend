import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react';
import type { SessionOwnerKey } from '../../../../core/session';
import {
  Button,
  Field,
  Input,
  Modal,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import {
  formatDottedDate,
  formatKoreanDate,
  formatKoreanMonth,
  getDayOfMonth,
  getWeekdayName,
  SEOUL_WEEKDAY_LABELS,
} from '../../../../shared/lib/seoul-date';
import { leaveQueryKeys } from '../../../leaves/leave-query-keys';
import {
  fetchFixedLeaves,
  type FixedLeaveManagementResponse,
} from '../../../leaves/leaves-api';
import {
  formatLeaveSlots,
  summarizeManagerLeaveCalendarReasons,
  toFixedLeaveWeekdayLabel,
} from '../../../leaves/leave-management-model';
import {
  ATTENDANCE_SLOTS,
  type AttendanceReasonCommand,
  type AttendanceSelection,
} from '../model/attendance-board';
import { useAttendanceMemberLeave } from '../../../manager-leaves/hooks/useAttendanceMemberLeave';
import {
  selectReasonCalendarDate,
  shortLeaveCalendarLabel,
  leaveHistorySourceLabel,
  type ReasonCalendarState,
} from '../model/attendance-reason-calendar';
import { cx } from '../../../../shared/lib/cx';
import {
  AttendanceReasonHistory,
  type OccurrenceTarget,
} from './AttendanceReasonHistory';
import '../styles/attendance-reason.css';

const QUICK_REASONS = ['지각', '쉼', '외출', '모의', '시험', '아픔'] as const;
const LEAVE_PRESETS = [
  { label: '월차', slots: [1, 2, 3, 4, 5, 6, 7] },
  { label: '오전반차', slots: [1, 2, 3, 4] },
  { label: '오후반차', slots: [4, 5, 6, 7] },
] as const;
const MAX_DATES = 31;
type Confirmation = 'cancel' | 'repeat' | 'cancel-repeat' | 'occurrence';
type AttendanceReasonModalProps = {
  dateKey: string;
  joinDate: string | null;
  onClose: () => void;
  onSubmit: (command: AttendanceReasonCommand, onSuccess?: () => void) => void;
  open: boolean;
  pending: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  selection: AttendanceSelection | null;
  scope: {
    branchId: number;
    operatorMemberId: number;
    ownerKey: SessionOwnerKey;
  };
};

export function AttendanceReasonModal(props: AttendanceReasonModalProps) {
  if (!props.open || !props.selection) return null;
  return (
    <ReasonDialog
      {...props}
      key={`${props.scope.ownerKey}:${props.scope.branchId}:${props.dateKey}:${props.selection.memberId}:${props.selection.slot}`}
      selection={props.selection}
    />
  );
}

function ReasonDialog({
  dateKey,
  joinDate,
  onClose,
  onSubmit,
  pending: reasonPending,
  restoreFocusRef,
  scope,
  selection,
}: AttendanceReasonModalProps & { selection: AttendanceSelection }) {
  const formId = useId();
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const calendarModeRef = useRef<HTMLButtonElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const [calendarState, setCalendarState] = useState<ReasonCalendarState>({
    dates: [dateKey],
    inspectedDate: dateKey,
    mode: 'select',
  });
  const { dates, inspectedDate, mode } = calendarState;
  const [slots, setSlots] = useState<number[]>([selection.slot]);
  const leaves = useAttendanceMemberLeave({
    branchId: scope.branchId,
    initialDateKey: dateKey,
    memberId: scope.operatorMemberId,
    ownerKey: scope.ownerKey,
    targetMemberId: selection.memberId,
  });
  const { month } = leaves.calendar;
  const pending = reasonPending || leaves.deletion.pending;
  const historyLoading = leaves.request.loading || leaves.calendar.loading;
  const historyError =
    leaves.request.errorMessage ?? leaves.calendar.errorMessage;
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] =
    useState<OccurrenceTarget | null>(null);
  const currentOccurrence =
    occurrenceTarget &&
    leaves.calendar.cells
      .find((day) => day.dateKey === occurrenceTarget.dateKey)
      ?.entries.find(
        (entry) =>
          entry.key === occurrenceTarget.entryKey &&
          entry.slots.includes(occurrenceTarget.slot),
      );
  const canDeleteOccurrence =
    !!currentOccurrence?.cancellationSource &&
    !leaves.deletion.disabled &&
    !pending;
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const fixedQuery = useQuery({
    queryKey: leaveQueryKeys.fixed(scope.ownerKey, scope.branchId),
    queryFn: () => fetchFixedLeaves(scope.branchId, scope.operatorMemberId),
    enabled: confirmation === 'cancel-repeat',
    staleTime: 0,
  });
  const rules = (fixedQuery.data ?? []).filter(
    (rule) => rule.memberId === selection.memberId,
  );
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId);
  const allSlotsSelected = slots.length === ATTENDANCE_SLOTS.length;
  const monthKey = `${month.year}-${String(month.month).padStart(2, '0')}`;
  const hasSelection = dates.length > 0 && slots.length > 0;
  const canApply =
    mode === 'select' && hasSelection && reason.trim().length > 0;
  const firstWeekdayDates = [
    ...new Map(
      [...dates]
        .sort()
        .reverse()
        .map((date) => [getWeekdayName(date), date]),
    ).values(),
  ].sort();

  const toggleDate = (date: string) =>
    setCalendarState((current) =>
      selectReasonCalendarDate(current, date, joinDate, MAX_DATES),
    );
  const submitAction = (
    action: NonNullable<AttendanceReasonCommand['action']>,
  ) => {
    if (
      pending ||
      (action === 'cancel-repeat'
        ? !selectedRule || fixedQuery.isFetching || fixedQuery.isError
        : action === 'cancel'
          ? mode !== 'select' || !hasSelection
          : !canApply)
    )
      return;
    onSubmit(
      {
        memberId: selection.memberId,
        dates: [...dates],
        slots: [...slots],
        reason: reason.trim(),
        action,
        ...(action === 'cancel-repeat'
          ? { fixedLeaveId: selectedRule!.id }
          : {}),
      },
      () => {
        // Keep this member's dates, month and draft ready for another request.
        // Only a confirmed success returns from an internal confirmation.
        setConfirmation(null);
        setSelectedRuleId(null);
        if (action !== 'apply') {
          window.requestAnimationFrame(() =>
            (selectedDateRef.current ?? calendarModeRef.current)?.focus({
              preventScroll: true,
            }),
          );
        }
      },
    );
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitAction('apply');
  };
  const openConfirmation = (next: Confirmation) => {
    setConfirmation(next);
    setSelectedRuleId(null);
    window.requestAnimationFrame(() => confirmationHeadingRef.current?.focus());
  };
  const closeConfirmation = (event: MouseEvent<HTMLButtonElement>) => {
    // Returning replaces this footer with a form submit button. Cancel the
    // original click's default action before React updates the DOM.
    event.preventDefault();
    setConfirmation(null);
    window.requestAnimationFrame(() =>
      (confirmation === 'occurrence'
        ? historyHeadingRef.current
        : (selectedDateRef.current ?? calendarModeRef.current)
      )?.focus(),
    );
  };
  const confirmOccurrence = () => {
    if (!canDeleteOccurrence || !occurrenceTarget) return;
    leaves.deletion.onDelete(
      occurrenceTarget.dateKey,
      occurrenceTarget.entryKey,
      occurrenceTarget.slot,
      () => {
        setConfirmation(null);
        setOccurrenceTarget(null);
        window.requestAnimationFrame(() => historyHeadingRef.current?.focus());
      },
    );
  };
  const confirmLabel =
    confirmation === 'repeat'
      ? '반복 신청'
      : confirmation === 'cancel-repeat'
        ? '오늘부터 반복 중단'
        : confirmation === 'occurrence'
          ? '이 내역만 삭제'
          : '선택 날짜·교시 취소';

  return (
    <Modal
      closeDisabled={pending}
      initialFocusRef={selectedDateRef}
      restoreFocusRef={restoreFocusRef}
      onClose={onClose}
      open
      panelClassName="attendance-reason"
      size="lg"
      title={`${selection.name} · 기타`}
      footer={
        confirmation ? (
          <div
            className="attendance-reason__confirm-actions"
            key="confirmation-actions"
          >
            <Button
              disabled={pending}
              onClick={closeConfirmation}
              type="button"
              variant="ghost"
            >
              돌아가기
            </Button>
            <Button
              disabled={
                pending ||
                (confirmation === 'occurrence'
                  ? !canDeleteOccurrence
                  : confirmation === 'cancel-repeat' &&
                    (!selectedRule ||
                      fixedQuery.isFetching ||
                      fixedQuery.isError))
              }
              loading={pending}
              onClick={() =>
                confirmation === 'occurrence'
                  ? confirmOccurrence()
                  : submitAction(confirmation)
              }
              type="button"
              variant={confirmation === 'repeat' ? 'primary' : 'danger'}
            >
              {confirmLabel}
            </Button>
          </div>
        ) : (
          <div className="attendance-reason__footer" key="draft-actions">
            <p className="attendance-reason__footer-summary">
              {mode === 'history'
                ? '내역 조회 중 · 신청·취소하려면 날짜 선택으로 전환'
                : `선택 날짜 ${dates.length}일 · ${slots.length ? formatLeaveSlots(slots) : '교시 미선택'}`}
            </p>
            <div className="attendance-reason__actions">
              <Button
                disabled={!canApply || pending}
                form={formId}
                loading={pending}
                type="submit"
              >
                신청
              </Button>
              <Button
                disabled={!canApply || pending}
                onClick={() => openConfirmation('repeat')}
                type="button"
                variant="ghost"
              >
                <Repeat2 aria-hidden="true" size={16} />
                반복 신청
              </Button>
              <Button
                aria-label="선택 날짜·교시 휴무 취소"
                className="attendance-reason__cancel"
                disabled={mode !== 'select' || !hasSelection || pending}
                onClick={() => openConfirmation('cancel')}
                type="button"
                variant="ghost"
              >
                취소
              </Button>
              <Button
                className="attendance-reason__cancel"
                disabled={pending}
                onClick={() => openConfirmation('cancel-repeat')}
                type="button"
                variant="ghost"
              >
                <Repeat2 aria-hidden="true" size={16} />
                반복 취소
              </Button>
            </div>
          </div>
        )
      }
    >
      {confirmation ? (
        <section className="attendance-reason__confirmation">
          <h4 ref={confirmationHeadingRef} tabIndex={-1}>
            {confirmation === 'cancel-repeat'
              ? '취소할 반복 일정'
              : `${selection.name} · ${confirmLabel} 확인`}
          </h4>
          {confirmation === 'occurrence' && occurrenceTarget ? (
            <>
              <dl>
                <dt>대상</dt>
                <dd>{selection.name}</dd>
                <dt>날짜</dt>
                <dd>{formatKoreanDate(occurrenceTarget.dateKey)}</dd>
                <dt>휴무</dt>
                <dd>
                  {currentOccurrence?.label ?? occurrenceTarget.label}
                  {leaveHistorySourceLabel(
                    currentOccurrence?.cancellationSource?.sourceType,
                  ) &&
                    ` · ${leaveHistorySourceLabel(currentOccurrence?.cancellationSource?.sourceType)}`}
                </dd>
                <dt>교시</dt>
                <dd>{occurrenceTarget.slot}교시</dd>
              </dl>
              <p>
                이 내역의 선택한 교시만 삭제합니다. 겹치는 다른 휴무, 반복
                일정과 실제 출석 기록은 유지됩니다.
              </p>
              {!currentOccurrence && !historyLoading && (
                <p role="status">
                  내역이 변경되었어요. 돌아가서 다시 확인해 주세요.
                </p>
              )}
              {historyError && (
                <SectionError
                  message={historyError}
                  onRetry={leaves.request.onRefresh}
                />
              )}
            </>
          ) : confirmation === 'cancel-repeat' ? (
            <>
              {fixedQuery.isPending ? (
                <SectionLoading label="반복 일정을 확인하고 있어요." />
              ) : fixedQuery.isError ? (
                <SectionError
                  message={fixedQuery.error.message}
                  onRetry={() => void fixedQuery.refetch()}
                />
              ) : rules.length === 0 ? (
                <p>등록된 반복 일정이 없어요.</p>
              ) : (
                <div
                  className="attendance-reason__rules"
                  role="radiogroup"
                  aria-label="취소할 반복 일정"
                >
                  {rules.map((rule) => (
                    <label className="attendance-reason__rule" key={rule.id}>
                      <input
                        type="radio"
                        name={`${formId}-rule`}
                        checked={rule.id === selectedRuleId}
                        disabled={pending || fixedQuery.isFetching}
                        onChange={() => setSelectedRuleId(rule.id)}
                      />
                      <RuleDescription rule={rule} />
                    </label>
                  ))}
                </div>
              )}
              {selectedRule && (
                <p>
                  선택한 일정만 오늘부터 취소합니다. 과거 기록과 다른 반복
                  일정은 유지됩니다.
                </p>
              )}
            </>
          ) : (
            <>
              <dl>
                <dt>대상</dt>
                <dd>
                  {selection.name}
                  {selection.seatNumber !== null
                    ? ` · ${selection.seatNumber}번`
                    : ''}
                </dd>
                <dt>{confirmation === 'repeat' ? '반복 시작' : '날짜'}</dt>
                <dd>
                  {(confirmation === 'repeat' ? firstWeekdayDates : dates).map(
                    (date) => (
                      <span key={date}>
                        {formatKoreanDate(date)}
                        {confirmation === 'repeat' ? '부터 매주' : ''}
                      </span>
                    ),
                  )}
                </dd>
                <dt>교시</dt>
                <dd>{formatLeaveSlots(slots)}</dd>
                {confirmation === 'repeat' && (
                  <>
                    <dt>사유</dt>
                    <dd>{reason}</dd>
                  </>
                )}
              </dl>
              <p>
                {confirmation === 'cancel'
                  ? '선택한 날짜·교시에 겹치는 모든 휴무 내역을 취소합니다. 반복 일정 자체와 실제 출석 기록은 유지됩니다.'
                  : '선택한 요일마다 반복됩니다. 같은 요일은 가장 이른 선택 날짜부터 시작합니다.'}
              </p>
            </>
          )}
        </section>
      ) : (
        <>
          <p className="attendance-reason__identity">
            {selection.seatNumber === null
              ? '좌석 미배정'
              : `${selection.seatNumber}번 좌석`}{' '}
            · {formatKoreanDate(dateKey)} · {selection.slot}교시
          </p>
          <form id={formId} onSubmit={submit}>
            <fieldset
              className="attendance-reason__date-field"
              disabled={pending}
            >
              <legend>
                날짜 · 휴무 내역 <span>{dates.length}일 선택</span>
              </legend>
              <div
                className="attendance-reason__calendar-mode"
                role="group"
                aria-label="달력 사용 방식"
              >
                <button
                  type="button"
                  ref={calendarModeRef}
                  aria-pressed={mode === 'select'}
                  onClick={() =>
                    setCalendarState((current) => ({
                      ...current,
                      mode: 'select',
                    }))
                  }
                >
                  날짜 선택
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'history'}
                  onClick={() =>
                    setCalendarState((current) => ({
                      ...current,
                      mode: 'history',
                    }))
                  }
                >
                  내역 조회
                </button>
              </div>
              <div className="attendance-reason__calendar-box">
                <div className="attendance-reason__calendar-head">
                  <button
                    aria-label="이전 달"
                    disabled={
                      mode === 'select' &&
                      joinDate !== null &&
                      monthKey <= joinDate.slice(0, 7)
                    }
                    onClick={leaves.calendar.onPreviousMonth}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" size={18} />
                  </button>
                  <strong aria-live="polite">
                    {formatKoreanMonth(month.year, month.month)}
                  </strong>
                  <button
                    aria-label="다음 달"
                    onClick={leaves.calendar.onNextMonth}
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
                  {leaves.calendar.cells.map((day) => {
                    const labels = summarizeManagerLeaveCalendarReasons(
                      day.entries,
                    ).map((entry) => shortLeaveCalendarLabel(entry.label));
                    const uniqueLabels = [...new Set(labels)];
                    return day.inMonth ? (
                      <button
                        aria-label={`${formatKoreanDate(day.dateKey)}${uniqueLabels.length ? ` · ${uniqueLabels.join(', ')}` : ''} · ${mode === 'select' ? '신청 날짜 선택' : '휴무 내역 조회'}`}
                        aria-pressed={
                          mode === 'select'
                            ? dates.includes(day.dateKey)
                            : day.dateKey === inspectedDate
                        }
                        className={cx(
                          day.dateKey === inspectedDate && 'is-inspected',
                        )}
                        disabled={
                          mode === 'select' &&
                          ((joinDate !== null &&
                            day.dateKey < joinDate &&
                            !dates.includes(day.dateKey)) ||
                            (!dates.includes(day.dateKey) &&
                              dates.length >= MAX_DATES))
                        }
                        key={day.dateKey}
                        onClick={() => toggleDate(day.dateKey)}
                        ref={
                          day.dateKey === dateKey ? selectedDateRef : undefined
                        }
                        type="button"
                      >
                        <span className="attendance-reason__day-number">
                          {getDayOfMonth(day.dateKey)}
                        </span>
                        {uniqueLabels.slice(0, 2).map((label) => (
                          <span
                            className="attendance-reason__day-label"
                            key={label}
                          >
                            {label}
                          </span>
                        ))}
                        {uniqueLabels.length > 2 && (
                          <span className="attendance-reason__day-more">
                            +{uniqueLabels.length - 2}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span aria-hidden="true" key={day.dateKey} />
                    );
                  })}
                </div>
              </div>
              <div className="attendance-reason__calendar-summary">
                <span>
                  {mode === 'history'
                    ? '조회해도 신청 날짜는 바뀌지 않아요.'
                    : `신청 날짜 ${dates.length}일 선택`}
                </span>
                <button
                  type="button"
                  onClick={() => historyHeadingRef.current?.focus()}
                >
                  {formatKoreanDate(inspectedDate)} 내역 ↓
                </button>
              </div>
              {historyError ? (
                <SectionError
                  message={historyError}
                  onRetry={leaves.request.onRefresh}
                />
              ) : historyLoading ? (
                <SectionLoading label="휴무 내역을 확인하고 있어요." />
              ) : leaves.member.unavailable ? (
                <p role="status">현재 지점의 사원을 다시 확인해 주세요.</p>
              ) : null}
            </fieldset>
            <div className="attendance-reason__options">
              <fieldset disabled={pending}>
                <legend>
                  교시 선택{' '}
                  <button
                    className="attendance-reason__all"
                    disabled={pending}
                    onClick={() =>
                      setSlots(allSlotsSelected ? [] : [...ATTENDANCE_SLOTS])
                    }
                    type="button"
                  >
                    {allSlotsSelected ? '선택 해제' : '전체 선택'}
                  </button>
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
                      aria-pressed={reason === option}
                      key={option}
                      onClick={() => setReason(option)}
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
                      id={id}
                      maxLength={40}
                      onChange={(event) => setReason(event.target.value)}
                      value={reason}
                    />
                  )}
                </Field>
                <div
                  aria-label="휴무 빠른 선택"
                  className="attendance-reason__presets"
                  role="group"
                >
                  {LEAVE_PRESETS.map((preset) => (
                    <button
                      aria-pressed={reason === preset.label}
                      key={preset.label}
                      onClick={() => {
                        setReason(preset.label);
                        setSlots([...preset.slots]);
                      }}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </form>
          <AttendanceReasonHistory
            leaves={leaves}
            inspectedDate={inspectedDate}
            pending={pending}
            headingRef={historyHeadingRef}
            onRequestOccurrence={(target) => {
              setOccurrenceTarget(target);
              openConfirmation('occurrence');
            }}
          />
        </>
      )}
    </Modal>
  );
}

function RuleDescription({ rule }: { rule: FixedLeaveManagementResponse }) {
  return (
    <span>
      <strong>
        매주 {toFixedLeaveWeekdayLabel(rule.dayOfWeek)}요일 ·{' '}
        {formatLeaveSlots(rule.slots)}
      </strong>
      <span>{rule.reason}</span>
      <small>
        {rule.startDate
          ? `${formatDottedDate(rule.startDate)}부터`
          : '기존 반복 일정'}
      </small>
    </span>
  );
}
