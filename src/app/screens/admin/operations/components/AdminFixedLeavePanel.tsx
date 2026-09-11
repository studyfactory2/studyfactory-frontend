import { useMemo, useState } from 'react';
import { RefreshCw, Repeat2, Trash2, WandSparkles } from 'lucide-react';
import type {
  FixedLeaveCreateInput,
  FixedLeaveDayOfWeek,
  FixedLeaveManagementResponse,
} from '../../../../features/leaves/leaves-api';
import { useSeoulToday } from '../../../../shared/hooks/useSeoulToday';
import {
  addDays,
  formatDateRange,
  getWeekStartKey,
  getWeekdayName,
} from '../../../../shared/lib/seoul-date';
import { cx } from '../../../../shared/lib/cx';
import {
  Button,
  Field,
  Input,
  Modal,
  SectionEmpty,
  SectionError,
  SectionLoading,
  Select,
} from '../../../../shared/ui';
import type { AdminFixedLeavesState } from '../hooks/useAdminFixedLeaves';
import {
  ADMIN_LEAVE_REASONS,
  ADMIN_LEAVE_SLOTS,
  FIXED_LEAVE_WEEKDAYS,
  formatLeaveSlots,
  toFixedLeaveWeekdayLabel,
  toNextDateForWeekday,
} from '../model/admin-leave-management';

export function AdminFixedLeavePanel({
  branchName,
  fixed,
}: {
  branchName: string;
  fixed: AdminFixedLeavesState;
}) {
  const today = useSeoulToday();
  const [memberId, setMemberId] = useState<number | null>(null);
  const [weekday, setWeekday] = useState<FixedLeaveDayOfWeek>(() =>
    getWeekdayName(today.dateKey),
  );
  const [selectedSlots, setSelectedSlots] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [query, setQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<FixedLeaveManagementResponse | null>(null);
  const selectedMember =
    fixed.members.find((member) => member.id === memberId) ??
    fixed.members[0] ??
    null;
  const normalizedQuery = query.trim().toLocaleLowerCase('ko');
  const visibleItems = useMemo(
    () =>
      fixed.list.items.filter((item) =>
        `${item.memberName} ${item.reason}`
          .toLocaleLowerCase('ko')
          .includes(normalizedQuery),
      ),
    [fixed.list.items, normalizedQuery],
  );
  const weekStart = getWeekStartKey(today.dateKey);
  const generationEnd = addDays(weekStart, 13);
  const normalizedReason =
    reason === '기타' ? customReason.trim() : reason.trim();
  const createInput: FixedLeaveCreateInput = {
    leaveDate: toNextDateForWeekday(today.dateKey, weekday),
    reason: normalizedReason,
    slots: [...selectedSlots].sort((left, right) => left - right),
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
  const openCreateConfirmation = () => {
    if (!selectedMember) {
      setFormError('고정 휴무를 등록할 사원을 선택해 주세요.');
      return;
    }
    if (createInput.slots.length === 0) {
      setFormError('적용할 교시를 하나 이상 선택해 주세요.');
      return;
    }
    if (!createInput.reason) {
      setFormError('고정 휴무 사유를 선택하거나 입력해 주세요.');
      return;
    }
    if (createInput.reason.length > 100) {
      setFormError('휴무 사유는 100자를 넘을 수 없어요.');
      return;
    }

    setCreateConfirmOpen(true);
  };
  const clearCreateForm = () => {
    setSelectedSlots(new Set());
    setReason('');
    setCustomReason('');
    setFormError(null);
  };

  if (fixed.request.loading) {
    return <SectionLoading label="고정 휴무 관리 화면을 준비하고 있어요." />;
  }

  if (fixed.request.errorMessage !== null) {
    return (
      <SectionError
        message={fixed.request.errorMessage}
        onRetry={fixed.request.onRefresh}
      />
    );
  }

  return (
    <div className="admin-fixed-leave">
      <section className="admin-fixed-leave__editor">
        <header>
          <span aria-hidden="true">
            <Repeat2 size={19} />
          </span>
          <div>
            <h4>고정 규칙 등록</h4>
            <p>{branchName} 사원의 반복 요일과 교시를 정해요.</p>
          </div>
        </header>

        {fixed.members.length === 0 || selectedMember === null ? (
          <SectionEmpty title="고정 휴무를 등록할 사원이 없어요" />
        ) : (
          <>
            <div className="admin-fixed-leave__form-grid">
              <Field label="사원" required>
                {(id) => (
                  <Select
                    id={id}
                    onChange={(event) => {
                      setMemberId(Number(event.target.value));
                      setFormError(null);
                    }}
                    value={selectedMember.id}
                  >
                    {fixed.members.map((member) => (
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

              <Field label="요일" required>
                {(id) => (
                  <Select
                    id={id}
                    onChange={(event) => {
                      setWeekday(event.target.value as FixedLeaveDayOfWeek);
                      setFormError(null);
                    }}
                    value={weekday}
                  >
                    {FIXED_LEAVE_WEEKDAYS.map((option) => (
                      <option key={option.value} value={option.value}>
                        매주 {option.label}요일
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="admin-fixed-leave__slots">
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
                className="admin-fixed-leave__all-slots"
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
                    placeholder="고정 휴무 사유"
                    value={customReason}
                  />
                )}
              </Field>
            )}

            <p className="admin-fixed-leave__contract-note">
              고정 규칙은 시작일 없이 선택한 요일 전체에 적용돼요. 과거 출석과
              공부시간에도 반영될 수 있어요.
            </p>
            {formError && (
              <p className="admin-fixed-leave__form-error" role="alert">
                {formError}
              </p>
            )}
            <Button full onClick={openCreateConfirmation} size="sm">
              고정 규칙 등록
            </Button>
          </>
        )}
      </section>

      <section className="admin-fixed-leave__rules">
        <header>
          <div>
            <h4>현재 고정 규칙</h4>
            <p>변경하려면 기존 규칙을 삭제한 뒤 다시 등록해 주세요.</p>
          </div>
          <div className="admin-fixed-leave__rule-actions">
            <button
              aria-label="고정 휴무 목록 새로고침"
              className={cx(
                'admin-fixed-leave__refresh',
                fixed.request.refreshing && 'is-refreshing',
              )}
              disabled={fixed.request.refreshing}
              onClick={fixed.request.onRefresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
            </button>
            <Button
              onClick={() => setGenerateConfirmOpen(true)}
              size="sm"
              variant="subtle"
            >
              <WandSparkles aria-hidden="true" size={15} />
              전체 지점 2주 반영
            </Button>
          </div>
        </header>

        <label className="admin-fixed-leave__search">
          <span className="admin-leaves__sr-only">고정 휴무 검색</span>
          <Input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 또는 사유 검색"
            type="search"
            value={query}
          />
        </label>

        {fixed.list.loading ? (
          <SectionLoading label="고정 휴무를 불러오는 중이에요." />
        ) : fixed.list.errorMessage !== null ? (
          <SectionError
            message={fixed.list.errorMessage}
            onRetry={fixed.list.onRetry}
          />
        ) : visibleItems.length === 0 ? (
          <SectionEmpty
            title={
              fixed.list.items.length === 0
                ? '등록된 고정 휴무가 없어요'
                : '검색 결과가 없어요'
            }
          />
        ) : (
          <ul className="admin-fixed-leave__list">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <span className="admin-fixed-leave__member">
                  <strong>{item.memberName}</strong>
                  <small>
                    매주 {toFixedLeaveWeekdayLabel(item.dayOfWeek)}요일
                  </small>
                </span>
                <span className="admin-fixed-leave__rule-copy">
                  <strong>{item.reason}</strong>
                  <small>{formatLeaveSlots(item.slots)}</small>
                </span>
                <button
                  aria-label={`${item.memberName} ${item.reason} 고정 휴무 삭제`}
                  disabled={fixed.list.pendingDeleteId !== null}
                  onClick={() => setDeleteTarget(item)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        closeDisabled={fixed.create.pending}
        footer={
          <>
            <Button
              disabled={fixed.create.pending}
              onClick={() => setCreateConfirmOpen(false)}
              variant="ghost"
            >
              취소
            </Button>
            <Button
              loading={fixed.create.pending}
              onClick={() => {
                if (!selectedMember) {
                  return;
                }

                fixed.create.onSubmit(selectedMember.id, createInput, () => {
                  setCreateConfirmOpen(false);
                  clearCreateForm();
                });
              }}
            >
              등록
            </Button>
          </>
        }
        onClose={() => setCreateConfirmOpen(false)}
        open={createConfirmOpen}
        size="sm"
        title="고정 휴무 규칙 확인"
      >
        <div className="admin-fixed-leave__confirm-copy">
          <strong>
            {selectedMember?.name} · 매주 {toFixedLeaveWeekdayLabel(weekday)}
            요일
          </strong>
          <p>
            {formatLeaveSlots(createInput.slots)} · {createInput.reason}
          </p>
          <p className="is-warning">
            시작일이 없는 규칙이라 같은 요일의 과거 기록에도 적용될 수 있어요.
          </p>
        </div>
      </Modal>

      <Modal
        closeDisabled={
          deleteTarget !== null &&
          fixed.list.pendingDeleteId === deleteTarget.id
        }
        footer={
          <>
            <Button
              disabled={fixed.list.pendingDeleteId !== null}
              onClick={() => setDeleteTarget(null)}
              variant="ghost"
            >
              취소
            </Button>
            <Button
              loading={
                deleteTarget !== null &&
                fixed.list.pendingDeleteId === deleteTarget.id
              }
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                fixed.list.onDelete(deleteTarget.id, () =>
                  setDeleteTarget(null),
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
        title="고정 휴무 삭제"
      >
        <p>
          {deleteTarget
            ? `${deleteTarget.memberName} 님의 매주 ${toFixedLeaveWeekdayLabel(deleteTarget.dayOfWeek)}요일 규칙을 삭제할까요?`
            : ''}
        </p>
        <p className="admin-fixed-leave__delete-note">
          오늘 이후 생성된 휴무 기록도 함께 제거되고, 시작일이 없는 규칙이라
          과거 출석·공부시간 계산도 달라질 수 있어요.
        </p>
      </Modal>

      <Modal
        closeDisabled={fixed.generate.pending}
        footer={
          <>
            <Button
              disabled={fixed.generate.pending}
              onClick={() => setGenerateConfirmOpen(false)}
              variant="ghost"
            >
              취소
            </Button>
            <Button
              loading={fixed.generate.pending}
              onClick={() =>
                fixed.generate.onConfirm(() => setGenerateConfirmOpen(false))
              }
            >
              전체 지점 반영
            </Button>
          </>
        }
        onClose={() => setGenerateConfirmOpen(false)}
        open={generateConfirmOpen}
        size="sm"
        title="고정 휴무 2주 반영"
      >
        <div className="admin-fixed-leave__confirm-copy">
          <strong>{formatDateRange(weekStart, generationEnd)}</strong>
          <p>
            현재 주와 다음 주의 반복 휴무 기록을 지우고, 현재 고정 규칙으로 다시
            만들어요.
          </p>
          <p className="is-warning">
            이 작업은 선택한 {branchName}뿐 아니라 모든 지점에 적용되고, 기존
            반복 기록을 교체해요. 실행 전 반드시 전체 지점 규칙을 확인해 주세요.
          </p>
        </div>
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
