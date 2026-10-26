import {
  Check,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useId, useState } from 'react';
import type { SessionOwnerKey } from '../../../../core/session';
import type {
  MemberTaskAction,
  MemberTaskItem,
} from '../../../../features/member-tasks/member-tasks-api';
import type { MemberTaskDraft } from '../../../../features/member-tasks/member-task-drafts';
import { useMemberTasks } from '../../../../features/member-tasks/useMemberTasks';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import '../styles/HomeDailyTasks.css';

type Controller = ReturnType<typeof useMemberTasks>;
type Props = { memberId: number; ownerKey: SessionOwnerKey; today: string };

export function HomeDailyTasks(props: Props) {
  const [recoveryDate, setRecoveryDate] = useState<string | null>(null);
  const date = recoveryDate ?? props.today;

  return (
    <DailyTaskCard
      {...props}
      date={date}
      key={`${props.ownerKey}:${date}`}
      onDateChange={(next) =>
        setRecoveryDate(next === props.today ? null : next)
      }
    />
  );
}

function DailyTaskCard({
  memberId,
  ownerKey,
  today,
  date,
  onDateChange,
}: Props & {
  date: string;
  onDateChange: (date: string) => void;
}) {
  const titleId = useId();
  const controller = useMemberTasks({ memberId, ownerKey, date });
  const { data, drafts } = controller;
  const items = data?.items ?? [];
  const recoveredDates = [
    ...new Set([today, date, ...controller.recoveredDates]),
  ]
    .sort()
    .reverse();
  const orphanedDrafts = Object.values(drafts).filter(
    (draft) =>
      draft.key !== 'add' &&
      draft.action.type !== 'add' &&
      !items.some(
        (item) => draft.action.type !== 'add' && item.id === draft.action.id,
      ),
  );
  const completed = items.filter((item) => item.completed).length;

  return (
    <section aria-labelledby={titleId} className="home-tasks">
      <header className="home-tasks__header">
        <span aria-hidden="true" className="home-tasks__icon">
          <NotebookPen size={20} />
        </span>
        <div className="home-tasks__heading">
          <h2 id={titleId}>
            {date === today ? '오늘의 할일' : '보관한 할 일'}
          </h2>
          <p>{formatKoreanDate(date)}</p>
        </div>
        {data && (
          <span className="home-tasks__count">
            {completed}
            <span> / {items.length} 완료</span>
          </span>
        )}
        <button
          aria-label="할 일 새로고침"
          className="home-tasks__icon-button"
          disabled={controller.busy || controller.isFetching}
          onClick={() => void controller.refetch()}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={controller.isFetching ? 'home-tasks__spin' : undefined}
            size={17}
          />
        </button>
      </header>

      {recoveredDates.length > 1 && (
        <div className="home-tasks__recovery">
          <label>
            보관한 초안
            <select
              disabled={controller.busy}
              onChange={(event) => onDateChange(event.target.value)}
              value={date}
            >
              {recoveredDates.map((day) => (
                <option key={day} value={day}>
                  {day === today ? '오늘' : formatKoreanDate(day)}
                </option>
              ))}
            </select>
          </label>
          {date !== today && (
            <button
              className="home-tasks__text-button"
              onClick={() => onDateChange(today)}
              type="button"
            >
              오늘로 돌아가기
            </button>
          )}
        </div>
      )}

      {controller.storageWarning && (
        <p
          className="home-tasks__notice home-tasks__notice--warning"
          role="alert"
        >
          {controller.storageWarning}
        </p>
      )}
      {controller.error && (
        <div className="home-tasks__notice" role="status">
          <p>저장된 할 일을 불러오지 못했어요. 작성 중인 내용은 유지돼요.</p>
          <button
            className="home-tasks__text-button"
            disabled={controller.isFetching}
            onClick={() => void controller.refetch()}
            type="button"
          >
            다시 불러오기
          </button>
        </div>
      )}

      <TaskDraftForm composer controller={controller} draft={drafts.add} />

      {controller.isLoading && (
        <p className="home-tasks__empty" role="status">
          저장된 할 일을 불러오고 있어요.
        </p>
      )}
      {data && items.length === 0 && (
        <p className="home-tasks__empty">
          아직 저장한 할 일이 없어요. 작은 메모부터 시작해 보세요.
        </p>
      )}
      {items.length > 0 && (
        <ul className="home-tasks__list">
          {items.map((item) => (
            <TaskRow controller={controller} item={item} key={item.id} />
          ))}
        </ul>
      )}
      {orphanedDrafts.length > 0 && (
        <div className="home-tasks__pending">
          <h3>확인이 필요한 작성 내용</h3>
          {orphanedDrafts.map((draft) => (
            <TaskDraftForm
              controller={controller}
              draft={draft}
              key={draft.key}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  controller,
  item,
}: {
  controller: Controller;
  item: MemberTaskItem;
}) {
  const key = `item:${item.id}`;
  const draft = controller.drafts[key];
  const disabled = controller.busy || Boolean(draft);

  function complete() {
    if (
      controller.startDraft(key, {
        type: 'update',
        id: item.id,
        completed: !item.completed,
      })
    ) {
      void controller.submitDraft(key);
    }
  }

  return (
    <li className={`home-tasks__item${item.completed ? ' is-complete' : ''}`}>
      <div className="home-tasks__row">
        <button
          aria-label={`${item.content} ${item.completed ? '완료 해제' : '완료'}`}
          aria-pressed={item.completed}
          className="home-tasks__check"
          disabled={disabled || !controller.storageReady}
          onClick={complete}
          type="button"
        >
          <span>
            {item.completed && (
              <Check aria-hidden="true" size={14} strokeWidth={3} />
            )}
          </span>
        </button>
        <p className="home-tasks__content">{item.content}</p>
        <div className="home-tasks__row-tools">
          <button
            aria-label={`${item.content} 수정`}
            className="home-tasks__icon-button"
            disabled={disabled}
            onClick={() =>
              controller.startDraft(key, {
                type: 'update',
                id: item.id,
                content: item.content,
              })
            }
            type="button"
          >
            <PencilLine aria-hidden="true" size={16} />
          </button>
          <button
            aria-label={`${item.content} 삭제`}
            className="home-tasks__icon-button"
            disabled={disabled || !controller.storageReady}
            onClick={() =>
              controller.startDraft(key, { type: 'delete', id: item.id })
            }
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      {draft && (
        <TaskDraftForm
          controller={controller}
          currentItem={item}
          draft={draft}
        />
      )}
    </li>
  );
}

function TaskDraftForm({
  controller,
  draft,
  currentItem,
  composer = false,
}: {
  controller: Controller;
  draft?: MemberTaskDraft;
  currentItem?: MemberTaskItem;
  composer?: boolean;
}) {
  const inputId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const action = draft?.action;
  const textAction =
    composer || (action?.type === 'update' && action.content !== undefined);
  const content = action && 'content' in action ? (action.content ?? '') : '';
  const locked = Boolean(
    draft &&
    (draft.status !== 'editing' ||
      (draft.action.type === 'add' && draft.requestLocked)),
  );
  const isDelete = action?.type === 'delete';
  const canSave = Boolean(
    draft &&
    controller.data &&
    !controller.busy &&
    controller.storageReady &&
    draft.status !== 'conflict' &&
    (!textAction ||
      (content.trim().length > 0 && content.trim().length <= 2000)),
  );

  function changeContent(value: string) {
    if (draft && action && 'content' in action) {
      controller.changeDraft(draft.key, {
        ...action,
        content: value,
      } as MemberTaskAction);
    } else if (composer) {
      controller.startDraft('add', {
        type: 'add',
        content: value,
        clientRequestId: crypto.randomUUID(),
      });
    }
  }

  function discard() {
    if (!draft) return;
    if (
      !confirmDiscard &&
      (draft.status !== 'editing' || (textAction && content.trim()))
    ) {
      setConfirmDiscard(true);
      return;
    }
    controller.discardDraft(draft.key);
    setConfirmDiscard(false);
  }

  return (
    <form
      className={`home-tasks__draft${composer ? ' home-tasks__composer' : ''}${locked ? ' home-tasks__draft--attention' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && draft) {
          setConfirmDiscard(false);
          void controller.submitDraft(draft.key);
        }
      }}
    >
      {textAction ? (
        <>
          <label
            className={
              composer ? 'home-tasks__sr-only' : 'home-tasks__field-label'
            }
            htmlFor={inputId}
          >
            {composer ? '새 할 일 또는 메모' : '할 일 수정'}
          </label>
          <textarea
            aria-describedby={`${inputId}-hint`}
            autoFocus={!composer && draft?.status === 'editing'}
            id={inputId}
            maxLength={2000}
            onChange={(event) => {
              setConfirmDiscard(false);
              changeContent(event.target.value);
            }}
            placeholder="오늘 할 일이나 메모를 적어보세요"
            readOnly={controller.busy || locked}
            rows={2}
            value={content}
          />
          {(!composer || draft) && (
            <p className="home-tasks__hint" id={`${inputId}-hint`}>
              {content.length >= 1800
                ? `${content.length.toLocaleString()} / 2,000자`
                : draft?.requestLocked
                  ? '작성 내용은 보관 중이에요. 저장 결과를 확인해 주세요.'
                  : '아직 저장 전이에요. 추가·저장을 눌러 마무리해 주세요.'}
            </p>
          )}
        </>
      ) : (
        <p className="home-tasks__field-label">
          {isDelete
            ? '이 할 일을 삭제할까요?'
            : action?.type === 'update' && action.completed
              ? '완료 표시'
              : '완료 해제'}
        </p>
      )}

      {!composer && currentItem && (isDelete || textAction || locked) && (
        <div className="home-tasks__saved-preview">
          <span>
            현재 저장된 내용 · {currentItem.completed ? '완료' : '미완료'}
          </span>
          <p>{currentItem.content}</p>
        </div>
      )}
      {!composer && !currentItem && (
        <p className="home-tasks__notice">
          이 할 일이 현재 저장 목록에 없어요. 보관된 변경을 확인해 주세요.
        </p>
      )}
      {draft?.status === 'uncertain' && (
        <p className="home-tasks__notice" role="status">
          {controller.busy
            ? '저장하고 있어요…'
            : '저장 결과를 확인하지 못했어요. 입력 내용은 유지되며, 결과를 확인하기 전에는 새 요청으로 보내지 않아요.'}
        </p>
      )}
      {draft?.status === 'conflict' && (
        <p className="home-tasks__notice" role="status">
          저장된 내용과 작성 내용을 확인해 주세요. 다른 변경을 덮어쓰지 않도록
          저장을 멈췄어요.
        </p>
      )}
      {draft?.message && (
        <p className="home-tasks__notice" role="status">
          {draft.message}
        </p>
      )}
      {draft && confirmDiscard && (
        <p className="home-tasks__notice" role="alert">
          {draft?.status === 'uncertain'
            ? '서버에는 이미 저장됐을 수 있어요. 초안을 지워도 저장된 할 일은 취소되지 않아요.'
            : '작성 중인 변경을 버릴까요? 저장된 할 일은 그대로 남아요.'}
        </p>
      )}

      <div className="home-tasks__actions">
        {draft ? (
          <button
            className="home-tasks__text-button"
            disabled={controller.busy}
            onClick={discard}
            type="button"
          >
            {confirmDiscard
              ? '초안 버리기 확인'
              : isDelete
                ? '돌아가기'
                : '작성 취소'}
          </button>
        ) : (
          <p className="home-tasks__hint" id={`${inputId}-hint`}>
            가볍게 적고, 하나씩 완료해요.
          </p>
        )}
        {draft?.status === 'conflict' ? (
          <button
            className="home-tasks__save"
            disabled={
              controller.busy ||
              controller.isFetching ||
              !controller.storageReady
            }
            onClick={() => void controller.reviewDraft(draft.key)}
            type="button"
          >
            최신 내용 확인
          </button>
        ) : (
          <button
            className={`home-tasks__save${isDelete ? ' home-tasks__save--danger' : ''}`}
            disabled={!canSave}
            type="submit"
          >
            {controller.busy && draft?.status === 'uncertain' ? (
              <LoaderCircle
                aria-hidden="true"
                className="home-tasks__spin"
                size={16}
              />
            ) : (
              composer && <Plus aria-hidden="true" size={16} />
            )}
            {controller.busy && draft?.status === 'uncertain'
              ? '저장 중'
              : draft?.status === 'uncertain'
                ? '저장 결과 확인'
                : isDelete
                  ? '삭제 확인'
                  : composer
                    ? '추가'
                    : '저장'}
          </button>
        )}
      </div>
    </form>
  );
}
