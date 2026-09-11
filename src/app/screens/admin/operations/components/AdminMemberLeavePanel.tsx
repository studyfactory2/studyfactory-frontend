import { useState } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  SectionEmpty,
  SectionError,
  SectionLoading,
  Select,
} from '../../../../shared/ui';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import { cx } from '../../../../shared/lib/cx';
import type { AdminMemberLeavesState } from '../hooks/useAdminMemberLeaves';
import {
  ADMIN_LEAVE_REASONS,
  ADMIN_LEAVE_SLOTS,
  formatLeaveSlots,
  type AdminSpecialLeaveSlot,
} from '../model/admin-leave-management';
import { AdminLeaveCalendar } from './AdminLeaveCalendar';

export function AdminMemberLeavePanel({
  leaves,
}: {
  leaves: AdminMemberLeavesState;
}) {
  const [selectedDates, setSelectedDates] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectedSlots, setSelectedSlots] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminSpecialLeaveSlot | null>(null);
  const selectedMember = leaves.member.selected;
  const currentMonth =
    leaves.calendar.month.year === leaves.calendar.today.year &&
    leaves.calendar.month.month === leaves.calendar.today.month;

  const clearSelectedDates = () => setSelectedDates(new Set());
  const changeMember = (memberId: number) => {
    clearSelectedDates();
    setFormError(null);
    leaves.calendar.onCurrentMonth();
    leaves.member.onChange(memberId);
  };
  const toggleDate = (dateKey: string) => {
    setSelectedDates((current) => {
      const next = new Set(current);

      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }

      return next;
    });
    setFormError(null);
  };
  const toggleSlot = (slot: number) => {
    setSelectedSlots((current) => {
      const next = new Set(current);

      if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }

      return next;
    });
    setFormError(null);
  };
  const clearForm = () => {
    setSelectedDates(new Set());
    setSelectedSlots(new Set());
    setReason('');
    setCustomReason('');
    setFormError(null);
  };
  const submit = () => {
    const dates = [...selectedDates].sort();
    const slots = [...selectedSlots].sort((left, right) => left - right);
    const normalizedCustomReason = customReason.trim();

    if (!selectedMember) {
      setFormError('휴무를 등록할 사원을 선택해 주세요.');
      return;
    }
    if (dates.length === 0) {
      setFormError('달력에서 날짜를 하나 이상 선택해 주세요.');
      return;
    }
    if (slots.length === 0) {
      setFormError('적용할 교시를 하나 이상 선택해 주세요.');
      return;
    }
    if (!reason || (reason === '기타' && !normalizedCustomReason)) {
      setFormError('휴무 사유를 선택하거나 입력해 주세요.');
      return;
    }
    if (normalizedCustomReason.length > 100) {
      setFormError('직접 입력 사유는 100자를 넘을 수 없어요.');
      return;
    }

    leaves.create.onSubmit(
      {
        customReason: reason === '기타' ? normalizedCustomReason : null,
        leaveDates: dates,
        reason,
        slots,
      },
      clearForm,
    );
  };

  if (leaves.request.loading) {
    return <SectionLoading label="사원 휴무 관리 화면을 준비하고 있어요." />;
  }

  if (leaves.request.errorMessage !== null) {
    return (
      <SectionError
        message={leaves.request.errorMessage}
        onRetry={leaves.request.onRetry}
      />
    );
  }

  if (leaves.member.items.length === 0 || selectedMember === null) {
    return (
      <SectionEmpty title="휴무를 관리할 사원이 없어요">
        <p>현재 지점에 가입된 사원이 있는지 확인해 주세요.</p>
      </SectionEmpty>
    );
  }

  return (
    <div className="admin-member-leave">
      <div className="admin-member-leave__member-row">
        <Field
          hint="좌석 순서이며 미배정 사원은 뒤에 표시해요."
          label="관리 사원"
        >
          {(id) => (
            <Select
              id={id}
              onChange={(event) => changeMember(Number(event.target.value))}
              value={selectedMember.id}
            >
              {leaves.member.items.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.seatNumber === null
                    ? roleLabel(member.role)
                    : `${member.seatNumber}번`}{' '}
                  · {member.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="admin-member-leave__selection-summary">
          <span>선택</span>
          <strong>{selectedDates.size}일</strong>
          <small>{formatLeaveSlots([...selectedSlots])}</small>
        </div>
      </div>

      <div className="admin-member-leave__workspace">
        <div className="admin-member-leave__calendar-column">
          {leaves.calendar.loading ? (
            <SectionLoading label="월별 휴무를 불러오는 중이에요." />
          ) : leaves.calendar.errorMessage !== null ? (
            <SectionError
              message={leaves.calendar.errorMessage}
              onRetry={leaves.calendar.onRetry}
            />
          ) : (
            <AdminLeaveCalendar
              cells={leaves.calendar.cells}
              currentMonth={currentMonth}
              month={leaves.calendar.month.month}
              onCurrentMonth={() => {
                clearSelectedDates();
                leaves.calendar.onCurrentMonth();
              }}
              onNextMonth={() => {
                clearSelectedDates();
                leaves.calendar.onNextMonth();
              }}
              onPreviousMonth={() => {
                clearSelectedDates();
                leaves.calendar.onPreviousMonth();
              }}
              onToggleDate={toggleDate}
              selectedDates={selectedDates}
              year={leaves.calendar.month.year}
            />
          )}
        </div>

        <section className="admin-member-leave__editor">
          <header>
            <span aria-hidden="true">
              <CalendarPlus size={18} />
            </span>
            <div>
              <h4>특별 휴무 등록</h4>
              <p>달력에서 여러 날짜를 고른 뒤 한 번에 등록하세요.</p>
            </div>
          </header>

          <fieldset className="admin-member-leave__slots">
            <legend>교시</legend>
            <div>
              {ADMIN_LEAVE_SLOTS.map((slot) => (
                <button
                  aria-pressed={selectedSlots.has(slot)}
                  className={cx(selectedSlots.has(slot) && 'is-selected')}
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  type="button"
                >
                  {slot}
                </button>
              ))}
            </div>
            <button
              className="admin-member-leave__all-slots"
              onClick={() => {
                setSelectedSlots(
                  selectedSlots.size === ADMIN_LEAVE_SLOTS.length
                    ? new Set()
                    : new Set(ADMIN_LEAVE_SLOTS),
                );
                setFormError(null);
              }}
              type="button"
            >
              {selectedSlots.size === ADMIN_LEAVE_SLOTS.length
                ? '전체 해제'
                : '전체 선택'}
            </button>
          </fieldset>

          <Field label="사유" required>
            {(id) => (
              <Select
                id={id}
                onChange={(event) => {
                  setReason(event.target.value);
                  setFormError(null);
                }}
                value={reason}
              >
                <option value="">사유 선택</option>
                {ADMIN_LEAVE_REASONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {reason === '기타' && (
            <Field
              hint={`${customReason.length}/100`}
              label="직접 입력"
              required
            >
              {(id) => (
                <Input
                  id={id}
                  maxLength={100}
                  onChange={(event) => {
                    setCustomReason(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="휴무 사유"
                  value={customReason}
                />
              )}
            </Field>
          )}

          {formError && (
            <p className="admin-member-leave__form-error" role="alert">
              {formError}
            </p>
          )}

          <Button
            full
            loading={leaves.create.pending}
            onClick={submit}
            size="sm"
          >
            선택한 날짜에 등록
          </Button>
        </section>
      </div>

      <section className="admin-special-leave-list">
        <header>
          <div>
            <h4>특별 휴무 내역</h4>
            <p>직접 등록한 휴무만 교시별로 삭제할 수 있어요.</p>
          </div>
          <Badge tone="special">{leaves.entries.items.length}건</Badge>
        </header>

        {leaves.entries.loading ? (
          <SectionLoading label="특별 휴무 내역을 불러오는 중이에요." />
        ) : leaves.entries.errorMessage !== null ? (
          <SectionError
            message={leaves.entries.errorMessage}
            onRetry={leaves.entries.onRetry}
          />
        ) : leaves.entries.items.length === 0 ? (
          <SectionEmpty title="등록된 특별 휴무가 없어요" />
        ) : (
          <ul>
            {leaves.entries.items.map((item) => (
              <li key={item.key}>
                <time dateTime={item.dateKey}>
                  {formatKoreanDate(item.dateKey)}
                </time>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.slot}교시</small>
                  {item.recurring && <Badge tone="neutral">반복 기록</Badge>}
                </span>
                {item.recurring ? (
                  <span className="admin-special-leave-list__managed">
                    고정·반복 관리
                  </span>
                ) : (
                  <button
                    aria-label={`${formatKoreanDate(item.dateKey)} ${item.slot}교시 특별 휴무 삭제`}
                    disabled={leaves.entries.pendingKey !== null}
                    onClick={() => setDeleteTarget(item)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        closeDisabled={
          deleteTarget !== null &&
          leaves.entries.pendingKey === deleteTarget.key
        }
        footer={
          <>
            <Button
              disabled={leaves.entries.pendingKey !== null}
              onClick={() => setDeleteTarget(null)}
              variant="ghost"
            >
              취소
            </Button>
            <Button
              loading={
                deleteTarget !== null &&
                leaves.entries.pendingKey === deleteTarget.key
              }
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                leaves.entries.onDelete(
                  {
                    key: deleteTarget.key,
                    slot: deleteTarget.slot,
                    specialLeaveId: deleteTarget.id,
                    targetMemberId: selectedMember.id,
                  },
                  () => setDeleteTarget(null),
                );
              }}
              variant="danger"
            >
              삭제
            </Button>
          </>
        }
        onClose={() => setDeleteTarget(null)}
        open={deleteTarget !== null}
        size="sm"
        title="특별 휴무 삭제"
      >
        <p>
          {deleteTarget
            ? `${formatKoreanDate(deleteTarget.dateKey)} ${deleteTarget.slot}교시 휴무를 삭제할까요?`
            : ''}
        </p>
      </Modal>
    </div>
  );
}

function roleLabel(role: 'ADMIN' | 'MEMBER' | 'STAFF') {
  if (role === 'ADMIN') {
    return '관리자';
  }
  if (role === 'STAFF') {
    return '스탭';
  }
  return '미배정';
}
