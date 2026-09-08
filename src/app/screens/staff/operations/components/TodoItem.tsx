import { useState } from 'react';
import {
  Check,
  ChevronDown,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import { cx } from '../../../../shared/lib/cx';
import { Badge, Button, Input } from '../../../../shared/ui';
import { getTodoMeta, TODO_SOURCE_LABELS } from '../model/staff-operations';

export function TodoItem({
  onAddReply,
  onDelete,
  onToggle,
  onUpdate,
  saving,
  todo,
}: {
  onAddReply: (
    todo: TodoResponse,
    content: string,
    onSuccess?: () => void,
  ) => void;
  onDelete: (todo: TodoResponse) => void;
  onToggle: (todo: TodoResponse) => void;
  onUpdate: (
    todo: TodoResponse,
    content: string,
    onSuccess?: () => void,
  ) => void;
  saving: boolean;
  todo: TodoResponse;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(todo.content);
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const lockedSource = todo.sourceType === 'JOIN_MEMBER';

  const submitEdit = () => {
    const content = editDraft.trim();

    if (content.length === 0 || content === todo.content) {
      setEditing(false);
      setEditDraft(todo.content);
      return;
    }

    onUpdate(todo, content, () => {
      setEditDraft(content);
      setEditing(false);
    });
  };

  const submitReply = () => {
    const content = replyDraft.trim();

    if (content.length === 0) {
      return;
    }

    onAddReply(todo, content, () => {
      setReplyDraft('');
      setReplying(false);
      setExpanded(true);
    });
  };

  return (
    <li
      className={cx(
        'staff-operations__todo',
        todo.priority === 'URGENT' && 'is-urgent',
        todo.completed && 'is-completed',
      )}
    >
      <div className="staff-operations__todo-main">
        <button
          aria-label={todo.completed ? '할 일 다시 열기' : '할 일 완료'}
          aria-pressed={todo.completed}
          className="staff-operations__todo-check"
          disabled={saving}
          onClick={() => onToggle(todo)}
          type="button"
        >
          <Check aria-hidden="true" size={15} strokeWidth={3} />
        </button>

        <div className="staff-operations__todo-copy">
          <span className="staff-operations__todo-badges">
            <Badge tone={todo.priority === 'URGENT' ? 'danger' : 'neutral'}>
              {todo.priority === 'URGENT' ? '긴급' : '일반'}
            </Badge>
            <Badge tone={lockedSource ? 'special' : 'positive'}>
              {TODO_SOURCE_LABELS[todo.sourceType]}
            </Badge>
          </span>

          {editing ? (
            <form
              className="staff-operations__todo-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitEdit();
              }}
            >
              <Input
                aria-label="할 일 내용 수정"
                autoFocus
                disabled={saving}
                onChange={(event) => setEditDraft(event.target.value)}
                value={editDraft}
              />
              <Button
                disabled={editDraft.trim().length === 0}
                size="sm"
                type="submit"
              >
                저장
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setEditDraft(todo.content);
                }}
                size="sm"
                variant="ghost"
              >
                취소
              </Button>
            </form>
          ) : (
            <p>{todo.content}</p>
          )}

          <span className="staff-operations__todo-meta">
            {getTodoMeta(todo)}
            {todo.replies.length > 0 && ` · 답글 ${todo.replies.length}개`}
          </span>
        </div>

        <button
          aria-expanded={expanded}
          aria-label="할 일 상세 보기"
          className={cx('staff-operations__todo-expand', expanded && 'is-open')}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <ChevronDown aria-hidden="true" size={18} />
        </button>
      </div>

      {expanded && (
        <div className="staff-operations__todo-detail">
          {todo.replies.length > 0 && (
            <ul className="staff-operations__todo-replies">
              {todo.replies.map((reply) => (
                <li key={reply.id}>
                  <strong>{reply.memberName ?? '스텝'}</strong>
                  <p>{reply.content}</p>
                </li>
              ))}
            </ul>
          )}

          {lockedSource ? (
            <p className="staff-operations__todo-locked-note">
              신규 회원 정보에서 자동 갱신되는 항목이에요.
            </p>
          ) : (
            <div className="staff-operations__todo-actions">
              <button
                disabled={saving}
                onClick={() => {
                  setEditDraft(todo.content);
                  setEditing(true);
                  setReplying(false);
                }}
                type="button"
              >
                <Pencil aria-hidden="true" size={14} />
                수정
              </button>
              <button
                disabled={saving}
                onClick={() => {
                  setReplying((current) => !current);
                  setEditing(false);
                }}
                type="button"
              >
                <MessageSquare aria-hidden="true" size={14} />
                답글
              </button>
              <button
                className="is-danger"
                disabled={saving}
                onClick={() => onDelete(todo)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} />
                삭제
              </button>
            </div>
          )}

          {replying && !lockedSource && (
            <form
              className="staff-operations__todo-inline-form is-reply"
              onSubmit={(event) => {
                event.preventDefault();
                submitReply();
              }}
            >
              <Input
                aria-label="할 일 답글"
                autoFocus
                disabled={saving}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder="처리 내용이나 전달 사항을 남겨 주세요."
                value={replyDraft}
              />
              <Button
                disabled={replyDraft.trim().length === 0}
                size="sm"
                type="submit"
              >
                등록
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
