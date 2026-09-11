import { ListChecks, MessageCircle, X } from 'lucide-react';
import { cx } from '../../../shared/lib/cx';
import type { useManagerOperations } from '../hooks/useManagerOperations';
import { ManagerSuggestionInbox } from './ManagerSuggestionInbox';
import { ManagerTodoBoard } from './ManagerTodoBoard';

export type ManagerOperationsView = 'tasks' | 'member-requests';

export function ManagerOperationsWorkspace({
  activeView,
  onClose,
  onViewChange,
  operations,
}: {
  activeView: ManagerOperationsView;
  onClose: () => void;
  onViewChange: (view: ManagerOperationsView) => void;
  operations: ReturnType<typeof useManagerOperations>;
}) {
  const writePending =
    operations.todos.saving || operations.suggestions.savingIds.size > 0;

  return (
    <section
      aria-label="업무와 회원 요청 전체 관리"
      className="manager-work manager-work__workspace"
    >
      <header className="manager-work__workspace-header">
        <div>
          <strong>운영 전체 관리</strong>
          <small>선택한 지점의 업무와 회원 요청을 한곳에서 처리해요.</small>
        </div>
        <button
          aria-label="전체 관리 닫기"
          autoFocus
          disabled={writePending}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div
        aria-label="운영 관리 항목"
        className="manager-work__workspace-tabs"
        role="group"
      >
        <button
          aria-pressed={activeView === 'tasks'}
          className={cx(activeView === 'tasks' && 'is-active')}
          disabled={writePending}
          onClick={() => onViewChange('tasks')}
          type="button"
        >
          <ListChecks aria-hidden="true" size={16} />할 일
          <span>
            {operations.todos.ready ? operations.todos.active.length : '—'}
          </span>
        </button>
        <button
          aria-pressed={activeView === 'member-requests'}
          className={cx(activeView === 'member-requests' && 'is-active')}
          disabled={writePending}
          onClick={() => onViewChange('member-requests')}
          type="button"
        >
          <MessageCircle aria-hidden="true" size={16} />
          회원 요청
          <span>
            {operations.suggestions.ready
              ? operations.suggestions.open.length
              : '—'}
          </span>
        </button>
      </div>

      <div className="manager-work__workspace-body">
        {activeView === 'tasks' ? (
          <ManagerTodoBoard todos={operations.todos} />
        ) : (
          <ManagerSuggestionInbox suggestions={operations.suggestions} />
        )}
      </div>
    </section>
  );
}
