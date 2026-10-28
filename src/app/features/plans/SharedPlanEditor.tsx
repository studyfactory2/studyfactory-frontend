import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coffee,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import type { SessionOwnerKey } from '../../core/session';
import {
  addDays,
  getDayOfMonth,
  getSeoulToday,
  getWeekdayLabel,
  getWeekStartKey,
} from '../../shared/lib/seoul-date';
import type { PlanGroup, SharedPlanItem } from './shared-plans-api';
import {
  useSharedPlanWeek,
  type SharedPlanAction,
  type SharedPlanDraft,
} from './useSharedPlanWeek';
import './shared-plan-editor.css';

export type SharedPlanEditorProps = {
  memberId: number;
  ownerKey: SessionOwnerKey;
  weekStartDate: string;
  dayIndex: number;
  onDayChange?: (day: number) => void;
  onWeekChange?: (week: string) => void;
  onDateChange?: (week: string, day: number) => void;
  readOnly?: boolean;
  showMealPlans?: boolean;
  targetBranchId?: number;
  operatorMemberId?: number;
  title?: string;
  headerAction?: ReactNode;
};

type PlanController = ReturnType<typeof useSharedPlanWeek>;

const GROUPS: { group: PlanGroup; label: string; time: string }[] = [
  { group: 'PERIODS_1_2', label: '1–2교시', time: '09:00 – 12:05' },
  { group: 'PERIODS_3_5', label: '3–5교시', time: '13:20 – 17:50' },
  { group: 'PERIODS_6_7', label: '6–7교시', time: '19:05 – 22:00' },
];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function isValidDay(day: number) {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

function itemKey(item: SharedPlanItem) {
  return `item:${item.source}:${item.id}`;
}

function sortItems(items: SharedPlanItem[]) {
  return [...items].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      (left.periodIndex ?? -1) - (right.periodIndex ?? -1) ||
      left.id - right.id,
  );
}

function savedText(content: string) {
  return content.trim() ? content : '(내용이 비어 있는 기존 계획)';
}

function draftText(action: SharedPlanAction) {
  if (action.type === 'goal') return action.goal;
  if ('content' in action && typeof action.content === 'string') {
    return action.content;
  }
  return '';
}

function describeAction(action: SharedPlanAction) {
  if (action.type === 'delete') return '계획 삭제';
  if (action.type === 'goal') return '주간 목표 수정';
  if (action.type === 'update') {
    if (typeof action.content === 'string') return '계획 수정';
    return action.done ? '완료 표시' : '완료 해제';
  }
  return '계획 추가';
}

function DraftForm({
  controller,
  draft,
  currentContent,
  label,
}: {
  controller: PlanController;
  draft: SharedPlanDraft;
  currentContent?: string;
  label: string;
}) {
  const inputId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const action = draft.action;
  const isText =
    action.type === 'add' ||
    action.type === 'break' ||
    action.type === 'goal' ||
    (action.type === 'update' && typeof action.content === 'string');
  const isDelete = action.type === 'delete';
  const locked = draft.status !== 'editing';
  const value = draftText(action);
  const empty = isText && action.type !== 'goal' && !value.trim();
  const canSave = !controller.busy && !empty && draft.status !== 'conflict';

  function changeText(text: string) {
    if (action.type === 'goal') {
      controller.changeDraft(draft.key, { ...action, goal: text });
    } else if (isText) {
      controller.changeDraft(draft.key, {
        ...action,
        content: text,
      } as SharedPlanAction);
    }
  }

  function discard() {
    if (draft.status === 'uncertain' && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    controller.discardDraft(draft.key);
  }

  return (
    <form
      className={`shared-plan__draft${locked ? ' shared-plan__draft--attention' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) void controller.submitDraft(draft.key);
      }}
    >
      {isText ? (
        <>
          <label className="shared-plan__field-label" htmlFor={inputId}>
            {label}
          </label>
          <textarea
            autoFocus={draft.status === 'editing'}
            disabled={controller.busy || locked}
            id={inputId}
            onChange={(event) => changeText(event.target.value)}
            placeholder={
              action.type === 'goal'
                ? '이번 주에 이루고 싶은 목표'
                : '할 일을 적어주세요'
            }
            rows={2}
            value={value}
          />
        </>
      ) : (
        <p className="shared-plan__draft-title">
          {isDelete ? '이 계획을 삭제할까요?' : describeAction(action)}
        </p>
      )}
      {isDelete && currentContent !== undefined && (
        <p className="shared-plan__draft-preview">
          {savedText(currentContent)}
        </p>
      )}
      {draft.status === 'conflict' && (
        <div className="shared-plan__conflict" role="status">
          <strong>저장된 내용이 변경되었어요.</strong>
          <span>
            작성 중인 내용은 그대로 보관했어요. 최신 내용을 확인해주세요.
          </span>
          <span className="shared-plan__current-label">현재 저장된 내용</span>
          <p>
            {currentContent !== undefined
              ? savedText(currentContent)
              : '해당 계획이 현재 목록에 없어요.'}
          </p>
          <button
            className="shared-plan__text-button"
            disabled={controller.busy || controller.isFetching}
            onClick={() => controller.reviewDraft(draft.key)}
            type="button"
          >
            최신 내용 확인 후 다시 시도
          </button>
        </div>
      )}
      {draft.status === 'uncertain' && (
        <p className="shared-plan__notice" role="status">
          {controller.busy
            ? '변경 내용을 저장하고 있어요. 잠시만 기다려주세요.'
            : '저장 결과를 확인하지 못했어요. 작성 내용은 보관 중이며, 다시 확인할 때 같은 요청을 사용해요.'}
        </p>
      )}
      {draft.message && (
        <p className="shared-plan__notice" role="status">
          {draft.message}
        </p>
      )}
      {confirmDiscard && (
        <p className="shared-plan__notice" role="alert">
          서버에는 이미 저장되었을 수 있어요. 작성 내용을 지워도 저장된 계획은
          취소되지 않아요.
        </p>
      )}
      <div className="shared-plan__draft-actions">
        <button
          className="shared-plan__text-button"
          disabled={controller.busy}
          onClick={discard}
          type="button"
        >
          {confirmDiscard
            ? '확인했어요 · 작성 내용 지우기'
            : isDelete
              ? '돌아가기'
              : '작성 취소'}
        </button>
        {draft.status !== 'conflict' && (
          <button
            className={`shared-plan__save${isDelete ? ' shared-plan__save--danger' : ''}`}
            disabled={!canSave}
            type="submit"
          >
            {controller.busy && (
              <LoaderCircle
                aria-hidden="true"
                className="shared-plan__spin"
                size={15}
              />
            )}
            {controller.busy
              ? '저장 중'
              : draft.status === 'uncertain'
                ? '저장 결과 다시 확인'
                : isDelete
                  ? '삭제 확인'
                  : '저장'}
          </button>
        )}
      </div>
    </form>
  );
}

function PlanRow({
  item,
  controller,
  readOnly,
  showDay = false,
}: {
  item: SharedPlanItem;
  controller: PlanController;
  readOnly: boolean;
  showDay?: boolean;
}) {
  const key = itemKey(item);
  const draft = controller.drafts[key];
  const accessibleContent = item.content.trim() || '내용이 비어 있는 기존 계획';
  const periodLabel =
    item.periodIndex === 100
      ? '점심'
      : item.periodIndex === 101
        ? '저녁'
        : item.periodIndex !== null &&
            item.periodIndex >= 0 &&
            item.periodIndex <= 6
          ? `${item.periodIndex + 1}교시`
          : `기존 구분 ${item.periodIndex ?? '없음'}`;

  function toggle() {
    controller.startDraft(key, {
      type: 'update',
      source: item.source,
      id: item.id,
      done: !item.done,
    });
    queueMicrotask(() => void controller.submitDraft(key));
  }

  return (
    <li className={`shared-plan__item${item.done ? ' is-complete' : ''}`}>
      <div className="shared-plan__item-row">
        {readOnly ? (
          <span
            className={`shared-plan__check shared-plan__check--readonly${item.done ? ' is-checked' : ''}`}
          >
            {item.done && <Check aria-hidden="true" size={16} />}
            <span className="shared-plan__sr-only">
              {item.done ? '완료' : '미완료'}
            </span>
          </span>
        ) : (
          <button
            aria-label={`${accessibleContent} ${item.done ? '완료 해제' : '완료'}`}
            aria-pressed={item.done}
            className={`shared-plan__check${item.done ? ' is-checked' : ''}`}
            disabled={controller.busy || !!draft}
            onClick={toggle}
            type="button"
          >
            {item.done && <Check aria-hidden="true" size={16} />}
          </button>
        )}
        <div className="shared-plan__item-body">
          <p className="shared-plan__item-content">{savedText(item.content)}</p>
          {(item.source === 'LEGACY' || showDay) && (
            <div className="shared-plan__item-meta">
              {showDay && (
                <span>
                  {isValidDay(item.dayIndex)
                    ? `${DAY_LABELS[item.dayIndex]}요일`
                    : `기존 날짜 구분 ${item.dayIndex}`}
                </span>
              )}
              {item.source === 'LEGACY' && (
                <span>{periodLabel} · 기존 계획</span>
              )}
            </div>
          )}
        </div>
        {!readOnly && !draft && (
          <div className="shared-plan__item-actions">
            <button
              aria-label={`${accessibleContent} 수정`}
              className="shared-plan__icon-button"
              disabled={controller.busy}
              onClick={() =>
                controller.startDraft(key, {
                  type: 'update',
                  source: item.source,
                  id: item.id,
                  content: item.content,
                })
              }
              type="button"
            >
              <PencilLine aria-hidden="true" size={16} />
            </button>
            <button
              aria-label={`${accessibleContent} 삭제`}
              className="shared-plan__icon-button shared-plan__icon-button--delete"
              disabled={controller.busy}
              onClick={() =>
                controller.startDraft(key, {
                  type: 'delete',
                  source: item.source,
                  id: item.id,
                })
              }
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        )}
      </div>
      {!readOnly && draft && (
        <DraftForm
          controller={controller}
          currentContent={item.content}
          draft={draft}
          label="계획 내용"
        />
      )}
    </li>
  );
}

function AddPlan({
  controller,
  draftKey,
  action,
  label,
}: {
  controller: PlanController;
  draftKey: string;
  action:
    | Omit<Extract<SharedPlanAction, { type: 'add' }>, 'clientRequestId'>
    | Omit<Extract<SharedPlanAction, { type: 'break' }>, 'clientRequestId'>;
  label: string;
}) {
  const draft = controller.drafts[draftKey];
  return draft ? (
    <DraftForm controller={controller} draft={draft} label={`${label} 할 일`} />
  ) : (
    <button
      className="shared-plan__add"
      disabled={controller.busy}
      onClick={() =>
        controller.startDraft(draftKey, {
          ...action,
          clientRequestId: crypto.randomUUID(),
        })
      }
      type="button"
    >
      <Plus aria-hidden="true" size={16} /> 할 일 추가
    </button>
  );
}

export function SharedPlanEditor({
  memberId,
  ownerKey,
  weekStartDate,
  dayIndex,
  onDayChange,
  onWeekChange,
  onDateChange,
  readOnly = false,
  showMealPlans = true,
  targetBranchId,
  operatorMemberId,
  title = '교시별 계획',
  headerAction,
}: SharedPlanEditorProps) {
  const headingId = useId();
  const controller = useSharedPlanWeek({
    memberId,
    ownerKey,
    weekStartDate,
    readOnly,
    targetBranchId,
    operatorMemberId,
  });
  const { data } = controller;
  const allItems = data
    ? [...data.groups.flatMap((group) => group.items), ...data.ungroupedItems]
    : [];
  const groups = GROUPS.map((definition) => ({
    ...definition,
    items: sortItems(
      data?.groups
        .find((group) => group.group === definition.group)
        ?.items.filter((item) => item.dayIndex === dayIndex) ?? [],
    ),
  }));
  const dayItems = groups.flatMap((group) => group.items);
  const completedCount = dayItems.filter((item) => item.done).length;
  const extras = sortItems(
    allItems.filter(
      (item) =>
        !isValidDay(item.dayIndex) ||
        (item.group === null &&
          item.periodIndex !== 100 &&
          item.periodIndex !== 101),
    ),
  );
  // Hidden meal-plan drafts belong in recovery, so their editors remain reachable.
  const visibleKeys = new Set(
    data
      ? [
          'goal',
          ...dayItems.map(itemKey),
          ...extras.map(itemKey),
          ...(showMealPlans
            ? allItems
                .filter(
                  (item) =>
                    item.dayIndex === dayIndex &&
                    (item.periodIndex === 100 || item.periodIndex === 101),
                )
                .map(itemKey)
            : []),
          ...GROUPS.map((group) => `new:${group.group}:${dayIndex}`),
          ...(showMealPlans
            ? [`new:break100:${dayIndex}`, `new:break101:${dayIndex}`]
            : []),
        ]
      : [],
  );
  const otherDrafts = readOnly
    ? []
    : Object.values(controller.drafts).filter(
        (draft) => !visibleKeys.has(draft.key),
      );
  const goalDraft = controller.drafts.goal;
  const today = getSeoulToday().dateKey;
  const rangeEnd = addDays(weekStartDate, 6);
  const currentDate = addDays(weekStartDate, dayIndex);

  function goToday() {
    const week = getWeekStartKey(today);
    const selectedDay = Array.from({ length: 7 }, (_, index) =>
      addDays(week, index),
    ).indexOf(today);
    if (onDateChange) {
      onDateChange(week, selectedDay);
    } else if (week !== weekStartDate) {
      onWeekChange?.(week);
    } else {
      onDayChange?.(selectedDay);
    }
  }

  return (
    <section aria-labelledby={headingId} className="shared-plan">
      <header
        className={`shared-plan__heading${headerAction ? ' shared-plan__heading--with-action' : ''}`}
      >
        <div className="shared-plan__heading-main">
          <span aria-hidden="true" className="shared-plan__heading-icon">
            <ClipboardList size={20} />
          </span>
          <div className="shared-plan__heading-copy">
            <h2 id={headingId}>{title}</h2>
            <p>
              {Number(weekStartDate.slice(5, 7))}월{' '}
              {getDayOfMonth(weekStartDate)}일({getWeekdayLabel(weekStartDate)})
              {' – '}
              {Number(rangeEnd.slice(5, 7))}월 {getDayOfMonth(rangeEnd)}일(
              {getWeekdayLabel(rangeEnd)})
            </p>
          </div>
        </div>
        <div className="shared-plan__heading-tools">
          {headerAction}
          {readOnly && (
            <span className="shared-plan__read-only">읽기 전용</span>
          )}
          <button
            aria-label="계획 새로고침"
            className="shared-plan__icon-button"
            disabled={controller.isFetching || controller.busy}
            onClick={() => void controller.refetch()}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={controller.isFetching ? 'shared-plan__spin' : ''}
              size={17}
            />
          </button>
        </div>
      </header>

      {onWeekChange && (
        <div className="shared-plan__week-navigation">
          <button
            aria-label="이전 주"
            className="shared-plan__icon-button"
            onClick={() => onWeekChange(addDays(weekStartDate, -7))}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <button
            className="shared-plan__today"
            onClick={goToday}
            type="button"
          >
            오늘
          </button>
          <button
            aria-label="다음 주"
            className="shared-plan__icon-button"
            onClick={() => onWeekChange(addDays(weekStartDate, 7))}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      )}
      {onDayChange && (
        <div aria-label="계획 날짜 선택" className="shared-plan__days">
          {DAY_LABELS.map((label, index) => {
            const date = addDays(weekStartDate, index);
            const hasDraft = Object.values(controller.drafts).some((draft) => {
              const action = draft.action;
              return 'dayIndex' in action
                ? action.dayIndex === index
                : 'id' in action &&
                    allItems.some(
                      (item) =>
                        item.id === action.id &&
                        item.source === action.source &&
                        item.dayIndex === index,
                    );
            });
            return (
              <button
                aria-label={`${Number(date.slice(5, 7))}월 ${getDayOfMonth(date)}일 ${label}요일${date === today ? ', 오늘' : ''}${hasDraft && !readOnly ? ', 작성 중인 내용 있음' : ''}`}
                aria-pressed={dayIndex === index}
                className={`shared-plan__day${dayIndex === index ? ' is-selected' : ''}${date === today ? ' is-today' : ''}`}
                key={label}
                onClick={() => onDayChange(index)}
                type="button"
              >
                <span>{label}</span>
                <strong>{getDayOfMonth(date)}</strong>
                {hasDraft && !readOnly && (
                  <span aria-hidden="true" className="shared-plan__draft-dot" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {controller.storageWarning && !readOnly && (
        <p className="shared-plan__notice" role="alert">
          {controller.storageWarning}
        </p>
      )}
      {!!controller.error && (
        <div className="shared-plan__load-error" role="alert">
          <p>계획을 불러오지 못했어요. 작성 중인 내용은 지우지 않았어요.</p>
          <button
            className="shared-plan__text-button"
            disabled={controller.isFetching}
            onClick={() => void controller.refetch()}
            type="button"
          >
            다시 불러오기
          </button>
        </div>
      )}
      {controller.isLoading && !data && (
        <p className="shared-plan__loading" role="status">
          <LoaderCircle
            aria-hidden="true"
            className="shared-plan__spin"
            size={18}
          />{' '}
          계획을 불러오고 있어요.
        </p>
      )}

      {data && (
        <>
          <div className="shared-plan__goal">
            <div className="shared-plan__goal-heading">
              <span>이번 주 목표</span>
              {!readOnly && !goalDraft && (
                <button
                  className="shared-plan__text-button"
                  disabled={controller.busy}
                  onClick={() =>
                    controller.startDraft('goal', {
                      type: 'goal',
                      goal: data.goal,
                    })
                  }
                  type="button"
                >
                  <PencilLine aria-hidden="true" size={14} />{' '}
                  {data.goal.trim() ? '수정' : '작성'}
                </button>
              )}
            </div>
            {!readOnly && goalDraft ? (
              <DraftForm
                controller={controller}
                currentContent={data.goal}
                draft={goalDraft}
                label="이번 주 목표"
              />
            ) : data.goal.trim() || readOnly ? (
              <p>
                {data.goal.trim() ? data.goal : '등록된 주간 목표가 없어요.'}
              </p>
            ) : null}
          </div>

          <div className="shared-plan__day-summary">
            <span>
              {Number(currentDate.slice(5, 7))}월 {getDayOfMonth(currentDate)}일
              ({DAY_LABELS[dayIndex]})
            </span>
            <span>
              <strong>{completedCount}</strong> / {dayItems.length} 완료
            </span>
          </div>
          <div className="shared-plan__groups">
            {groups.map(({ group, label, time, items }) => (
              <article className="shared-plan__box" key={group}>
                <header className="shared-plan__box-heading">
                  <div>
                    <h3>{label}</h3>
                    <span>{time}</span>
                  </div>
                  <span className="shared-plan__count">
                    {items.filter((item) => item.done).length} / {items.length}
                  </span>
                </header>
                {items.length > 0 ? (
                  <ul className="shared-plan__items">
                    {items.map((item) => (
                      <PlanRow
                        controller={controller}
                        item={item}
                        key={itemKey(item)}
                        readOnly={readOnly}
                      />
                    ))}
                  </ul>
                ) : readOnly ? (
                  <p className="shared-plan__empty">등록된 계획이 없어요.</p>
                ) : null}
                {!readOnly && (
                  <AddPlan
                    action={{ type: 'add', dayIndex, group, content: '' }}
                    controller={controller}
                    draftKey={`new:${group}:${dayIndex}`}
                    label={label}
                  />
                )}
              </article>
            ))}
          </div>

          {showMealPlans && (
            <div className="shared-plan__breaks">
              {([100, 101] as const).map((periodIndex) => {
                const items = sortItems(
                  data.ungroupedItems.filter(
                    (item) =>
                      item.dayIndex === dayIndex &&
                      item.periodIndex === periodIndex,
                  ),
                );
                const label = periodIndex === 100 ? '점심 계획' : '저녁 계획';
                return (
                  <article className="shared-plan__break" key={periodIndex}>
                    <header>
                      <Coffee aria-hidden="true" size={17} />
                      <h3>{label}</h3>
                      <span>
                        {items.filter((item) => item.done).length} /{' '}
                        {items.length}
                      </span>
                    </header>
                    {items.length > 0 ? (
                      <ul className="shared-plan__items">
                        {items.map((item) => (
                          <PlanRow
                            controller={controller}
                            item={item}
                            key={itemKey(item)}
                            readOnly={readOnly}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="shared-plan__empty">
                        등록된 계획이 없어요.
                      </p>
                    )}
                    {!readOnly && (
                      <AddPlan
                        action={{
                          type: 'break',
                          dayIndex,
                          periodIndex,
                          content: '',
                        }}
                        controller={controller}
                        draftKey={`new:break${periodIndex}:${dayIndex}`}
                        label={label}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {extras.length > 0 && (
            <section className="shared-plan__extras">
              <h3>
                기존 기타 계획 <span>{extras.length}</span>
              </h3>
              <p>기존 날짜·교시 정보를 그대로 보존한 계획이에요.</p>
              <ul className="shared-plan__items">
                {extras.map((item) => (
                  <PlanRow
                    controller={controller}
                    item={item}
                    key={itemKey(item)}
                    readOnly={readOnly}
                    showDay
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {otherDrafts.length > 0 && (
        <details className="shared-plan__pending">
          <summary>
            다른 날짜·항목에 작성 중인 내용 {otherDrafts.length}건
          </summary>
          <p>날짜를 바꾸어도 작성 내용은 유지돼요.</p>
          {otherDrafts.map((draft) => {
            const action = draft.action;
            const item =
              'id' in action
                ? allItems.find(
                    (candidate) =>
                      candidate.id === action.id &&
                      candidate.source === action.source,
                  )
                : undefined;
            const draftDay =
              'dayIndex' in action ? action.dayIndex : item?.dayIndex;
            const mealPeriod =
              action.type === 'break' ? action.periodIndex : item?.periodIndex;
            return (
              <div className="shared-plan__pending-item" key={draft.key}>
                <div className="shared-plan__pending-heading">
                  <strong>
                    {draftDay !== undefined && isValidDay(draftDay)
                      ? `${DAY_LABELS[draftDay]}요일 · `
                      : ''}
                    {mealPeriod === 100
                      ? '점심 · '
                      : mealPeriod === 101
                        ? '저녁 · '
                        : ''}
                    {describeAction(action)}
                  </strong>
                  {draftDay !== undefined &&
                    isValidDay(draftDay) &&
                    onDayChange && (
                      <button
                        className="shared-plan__text-button"
                        onClick={() => onDayChange(draftDay)}
                        type="button"
                      >
                        날짜로 이동
                      </button>
                    )}
                </div>
                <DraftForm
                  controller={controller}
                  currentContent={item?.content}
                  draft={draft}
                  label="보관 중인 내용"
                />
              </div>
            );
          })}
        </details>
      )}
      {!readOnly && Object.keys(controller.drafts).length > 0 && (
        <p aria-live="polite" className="shared-plan__draft-status">
          {controller.busy
            ? '변경 내용을 저장하고 있어요.'
            : `작성 중인 내용 ${Object.keys(controller.drafts).length}건 · 저장 버튼으로 반영해주세요.`}
        </p>
      )}
    </section>
  );
}
