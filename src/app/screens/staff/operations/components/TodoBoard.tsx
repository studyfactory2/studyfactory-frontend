import { useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import type { TodoResponse } from '../../../../features/todos/todos-api';
import { cx } from '../../../../shared/lib/cx';
import { formatKoreanDate } from '../../../../shared/lib/seoul-date';
import {
  Button,
  Card,
  Input,
  SectionEmpty,
  SectionError,
  SectionLoading,
} from '../../../../shared/ui';
import type { useStaffTodos } from '../hooks/useStaffTodos';
import { TodoDeleteDialog } from './TodoDeleteDialog';
import { TodoItem } from './TodoItem';

export function TodoBoard({
  todos,
}: {
  todos: ReturnType<typeof useStaffTodos>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<TodoResponse | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const hasCachedRows = todos.ready;

  return (
    <Card
      className="staff-operations__panel staff-operations__todo-board"
      padding="none"
    >
      <header className="staff-operations__panel-header">
        <span className="staff-operations__panel-title">
          <i aria-hidden="true">
            <ListChecks size={18} />
          </i>
          <span>
            <strong>할 일</strong>
            <small>남은 업무 {todos.active.length}건</small>
          </span>
        </span>
        <button
          aria-label="할 일 새로고침"
          className={cx(
            'staff-operations__refresh',
            todos.refreshing && 'is-refreshing',
          )}
          disabled={todos.refreshing}
          onClick={todos.onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={15} />
        </button>
      </header>

      <div className="staff-operations__datebar">
        <button
          aria-label="이전 날짜"
          onClick={() => todos.date.onShift(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <strong aria-live="polite">
          {formatKoreanDate(todos.date.selectedDateKey)}
          {todos.date.isToday && <small>오늘</small>}
        </strong>
        <button
          aria-label="다음 날짜"
          onClick={() => todos.date.onShift(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
        <button
          className="staff-operations__datebar-today"
          disabled={todos.date.isToday}
          onClick={todos.date.onGoToday}
          type="button"
        >
          오늘
        </button>
      </div>

      <form
        className="staff-operations__todo-composer"
        onSubmit={(event) => {
          event.preventDefault();
          todos.composer.onSubmit();
        }}
      >
        <Input
          aria-label="새 할 일"
          disabled={todos.composer.saving}
          onChange={(event) => todos.composer.onChange(event.target.value)}
          placeholder="새 할 일을 입력하세요."
          value={todos.composer.draft}
        />
        <button
          aria-pressed={todos.composer.priority === 'URGENT'}
          className={cx(
            'staff-operations__urgent-toggle',
            todos.composer.priority === 'URGENT' && 'is-active',
          )}
          disabled={todos.composer.saving}
          onClick={todos.composer.onToggleUrgent}
          type="button"
        >
          <AlertTriangle aria-hidden="true" size={15} />
          긴급
        </button>
        <Button
          disabled={!todos.composer.canSubmit}
          loading={todos.composer.saving}
          size="sm"
          type="submit"
        >
          추가
        </Button>
      </form>

      <div className="staff-operations__panel-body">
        {todos.errorMessage && (
          <SectionError message={todos.errorMessage} onRetry={todos.onRetry} />
        )}

        {todos.loading ? (
          <SectionLoading label="할 일을 불러오는 중이에요." />
        ) : !hasCachedRows ? null : todos.active.length === 0 ? (
          <SectionEmpty title="남은 할 일이 없어요">
            <p>필요한 업무가 생기면 위에서 바로 추가할 수 있어요.</p>
          </SectionEmpty>
        ) : (
          <ul className="staff-operations__todo-list">
            {todos.active.map((todo) => (
              <TodoItem
                key={todo.id}
                onAddReply={todos.onAddReply}
                onDelete={setDeleteTarget}
                onToggle={todos.onToggle}
                onUpdate={todos.onUpdate}
                saving={todos.saving}
                todo={todo}
              />
            ))}
          </ul>
        )}

        {hasCachedRows && todos.completed.length > 0 && (
          <section className="staff-operations__completed">
            <button
              aria-expanded={showCompleted}
              onClick={() => setShowCompleted((current) => !current)}
              type="button"
            >
              완료한 일 {todos.completed.length}건
              <ChevronRight
                aria-hidden="true"
                className={showCompleted ? 'is-open' : undefined}
                size={16}
              />
            </button>
            {showCompleted && (
              <ul className="staff-operations__todo-list">
                {todos.completed.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    onAddReply={todos.onAddReply}
                    onDelete={setDeleteTarget}
                    onToggle={todos.onToggle}
                    onUpdate={todos.onUpdate}
                    saving={todos.saving}
                    todo={todo}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <TodoDeleteDialog
        onClose={() => {
          if (!todos.saving) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={(todo) => {
          todos.onDelete(todo, () => setDeleteTarget(null));
        }}
        openTodo={deleteTarget}
        saving={todos.saving}
      />
    </Card>
  );
}
